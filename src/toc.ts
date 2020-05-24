'use strict';

import * as path from 'path';
import * as stringSimilarity from 'string-similarity';
import { CancellationToken, CodeLens, CodeLensProvider, commands, EndOfLine, ExtensionContext, languages, Range, TextDocument, TextDocumentWillSaveEvent, window, workspace, WorkspaceEdit } from 'vscode';
import { isMdEditor, mdDocSelector, mdHeadingToPlaintext, slugify } from './util';

/**
 * Workspace config
 */
const docConfig = { tab: '  ', eol: '\r\n' };
const tocConfig = { startDepth: 1, endDepth: 6, listMarker: '-', orderedList: false, updateOnSave: false, plaintext: false, tabSize: 2 };

const REGEX_SECNUMBER = /^(\s{0,3}#+ +)((?:\d\.)* )?(.*)/;

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.toc.create', createToc),
        commands.registerCommand('markdown.extension.toc.update', updateToc),
        commands.registerCommand('markdown.extension.toc.addSecNumbers', addSectionNumbers),
        commands.registerCommand('markdown.extension.toc.removeSecNumbers', removeSectionNumbers),
        workspace.onWillSaveTextDocument(onWillSave),
        languages.registerCodeLensProvider(mdDocSelector, new TocCodeLensProvider())
    );
}

async function createToc() {
    let editor = window.activeTextEditor;

    if (!isMdEditor(editor)) {
        return;
    }

    let toc = await generateTocText(editor.document);
    await editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, toc);
    });
}

async function updateToc() {
    const editor = window.activeTextEditor;

    if (!isMdEditor(editor)) {
        return;
    }

    const doc = editor.document;
    const tocRangesAndText = await detectTocRanges(doc);
    const tocRanges = tocRangesAndText[0];
    const newToc = tocRangesAndText[1];

    await editor.edit(editBuilder => {
        for (const tocRange of tocRanges) {
            if (tocRange !== null) {
                const oldToc = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol);
                if (oldToc !== newToc) {
                    const unchangedLength = commonPrefixLength(oldToc, newToc);
                    const newStart = doc.positionAt(doc.offsetAt(tocRange.start) + unchangedLength);
                    const replaceRange = tocRange.with(newStart);
                    if (replaceRange.isEmpty) {
                        editBuilder.insert(replaceRange.start, newToc.substring(unchangedLength));
                    } else {
                        editBuilder.replace(replaceRange, newToc.substring(unchangedLength));
                    }
                }
            }
        }
    });
}

function addSectionNumbers() {
    const editor = window.activeTextEditor;
    if (!isMdEditor(editor)) {
        return;
    }
    const activeDoc = editor.document;

    let isInCodeBlocks = false;
    let secNumbers = [0, 0, 0, 0, 0, 0];
    let edit = new WorkspaceEdit();
    for (let i = 0; i < activeDoc.lineCount; i++) {
        const lineText = activeDoc.lineAt(i).text;
        if (!isInCodeBlocks) {
            if (/^ {0,3}```[\w \+]*$/.test(lineText)) {
                isInCodeBlocks = true;
            } else {
                if (REGEX_SECNUMBER.test(lineText)) {
                    const newText = lineText.replace(REGEX_SECNUMBER, (_, g1, _g2, g3) => {
                        const level = g1.trim().length;
                        secNumbers[level - 1] += 1;
                        secNumbers.fill(0, level);
                        const secNumStr = [...Array(level).keys()].map(num => `${secNumbers[num]}.`).join('');
                        return `${g1}${secNumStr} ${g3}`;
                    });
                    edit.replace(activeDoc.uri, activeDoc.lineAt(i).range, newText);
                }
            }
        } else {
            if (/^\s{0,3}```\s*$/.test(lineText)) {
                isInCodeBlocks = false;
            }
        }
    }

    return workspace.applyEdit(edit);
}

function removeSectionNumbers() {
    const editor = window.activeTextEditor;
    if (!isMdEditor(editor)) {
        return;
    }
    const activeDoc = editor.document;

    let isInCodeBlocks = false;
    let edit = new WorkspaceEdit();
    for (let i = 0; i < activeDoc.lineCount; i++) {
        const lineText = activeDoc.lineAt(i).text;
        if (!isInCodeBlocks) {
            if (/^ {0,3}```[\w \+]*$/.test(lineText)) {
                isInCodeBlocks = true;
            } else {
                if (REGEX_SECNUMBER.test(lineText)) {
                    const newText = lineText.replace(REGEX_SECNUMBER, (_, g1, _g2, g3) => `${g1}${g3}`);
                    edit.replace(activeDoc.uri, activeDoc.lineAt(i).range, newText);
                }
            }
        } else {
            if (/^\s{0,3}```\s*$/.test(lineText)) {
                isInCodeBlocks = false;
            }
        }
    }

    return workspace.applyEdit(edit);
}

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
}

//// Returns a list of user defined excluded headings for the given document.
function getExcludedHeadings(doc: TextDocument): { level: number, text: string }[] {
    const configObj = workspace.getConfiguration('markdown.extension.toc').get<object>('omittedFromToc');

    if (typeof configObj !== 'object' || configObj === null) {
        window.showErrorMessage(`\`omittedFromToc\` must be an object (e.g. \`{"README.md": ["# Introduction"]}\`)`);
        return [];
    }

    const docWorkspace = workspace.getWorkspaceFolder(doc.uri);

    let omittedTocPerFile = {};
    for (const filePath of Object.keys(configObj)) {
        let normedPath: string;
        //// Converts paths to absolute paths if a workspace is opened
        if (docWorkspace !== undefined && !path.isAbsolute(filePath)) {
            normedPath = normalizePath(path.join(docWorkspace.uri.fsPath, filePath));
        } else {
            normedPath = normalizePath(filePath);
        }
        omittedTocPerFile[normedPath] = [...(omittedTocPerFile[normedPath] || []), ...configObj[filePath]];
    }

    const currentFile = normalizePath(doc.fileName);
    const omittedList = omittedTocPerFile[currentFile] || [];

    if (!Array.isArray(omittedList)) {
        window.showErrorMessage(`\`omittedFromToc\` attributes must be arrays (e.g. \`{"README.md": ["# Introduction"]}\`)`);
        return [];
    }

    return omittedList.map(heading => {
        const matches = heading.match(/^ *(#+) +(.*)$/);
        if (matches === null) {
            window.showErrorMessage(`Invalid entry "${heading}" in \`omittedFromToc\``);
            return { level: -1, text: '' };
        }
        const [, sharps, name] = matches;
        return {
            level: sharps.length,
            text: name
        };
    });
}

async function generateTocText(doc: TextDocument): Promise<string> {
    loadTocConfig();
    const orderedListMarkerIsOne: boolean = workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') === 'one';

    let toc = [];
    let tocEntries = buildToc(doc);
    if (tocEntries === null || tocEntries === undefined || tocEntries.length < 1) return '';

    let startDepth = Math.max(tocConfig.startDepth, Math.min.apply(null, tocEntries.map(h => h.level)));
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    let anchorOccurances = {};
    let ignoredDepthBound = null;
    const excludedHeadings = getExcludedHeadings(doc);

    tocEntries.forEach(entry => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let relativeLvl = entry.level - startDepth;

            //// Remove certain Markdown syntaxes
            //// `[text](link)` → `text`
            let headingText = entry.text.replace(/\[([^\]]*)\]\([^\)]*\)/, (_, g1) => g1);
            //// `[text][label]` → `text`
            headingText = headingText.replace(/\[([^\]]*)\]\[[^\)]*\]/, (_, g1) => g1);

            let slug = slugify(mdHeadingToPlaintext(entry.text));

            if (anchorOccurances.hasOwnProperty(slug)) {
                anchorOccurances[slug] += 1;
                slug += '-' + String(anchorOccurances[slug]);
            } else {
                anchorOccurances[slug] = 0;
            }

            // Filter out used excluded headings.
            const isExcluded = excludedHeadings.some(({ level, text }) => level === entry.level && text === entry.text);
            const isOmittedSubHeading = ignoredDepthBound !== null && entry.level > ignoredDepthBound;
            if (isExcluded) {
                // Keep track of the latest omitted heading's depth to also omit its subheadings.
                ignoredDepthBound = entry.level;
            } else if (!isOmittedSubHeading) {
                // Reset ignore bound (not ignored sub heading anymore).
                ignoredDepthBound = null;
                let row = [
                    docConfig.tab.repeat(relativeLvl),
                    (tocConfig.orderedList ? (orderedListMarkerIsOne ? '1' : ++order[relativeLvl]) + '.' : tocConfig.listMarker) + ' ',
                    tocConfig.plaintext ? headingText : `[${headingText}](#${slug})`
                ];
                toc.push(row.join(''));
                if (tocConfig.orderedList) order.fill(0, relativeLvl + 1);
            }
        }
    });
    while (/^[ \t]/.test(toc[0])) {
        toc = toc.slice(1);
    }
    return toc.join(docConfig.eol);
}

/**
 * Returns an array of TOC ranges.
 * If no TOC is found, returns an empty array.
 * @param doc a TextDocument
 */
async function detectTocRanges(doc: TextDocument): Promise<[Array<Range>, string]> {
    let tocRanges = [];
    const newTocText = await generateTocText(doc);
    const fullText = doc.getText();
    let listRegex = /(^|\r?\n)((?:[-+*]|[0-9]+[.)]) .*(?:\r?\n[ \t]*(?:[-+*]|[0-9]+[.)]) .*)*)/g;
    let match;
    while ((match = listRegex.exec(fullText)) !== null) {
        //// #525 <!-- no toc --> comment
        const listStartPos = doc.positionAt(match.index + match[1].length);
        if (listStartPos.line > 0 && doc.lineAt(listStartPos.line - 1).text.includes("no toc")) {
            continue;
        }

        const listText = match[2];

        //// Sanity checks
        const firstLine: string = listText.split(/\r?\n/)[0];
        if (workspace.getConfiguration('markdown.extension.toc').get<boolean>('plaintext')) {
            //// A lazy way to check whether it is a link
            if (firstLine.includes('](')) {
                continue;
            }
        } else {
            //// GitHub issue #304 (must contain `#`), #549 and #683 (shouldn't contain text other than links)
            if (!/^[-\*+] +\[[^\]]+\]\(\#[^\)]+\)$/.test(firstLine)) {
                continue;
            }
        }

        if (radioOfCommonPrefix(newTocText, listText) + stringSimilarity.compareTwoStrings(newTocText, listText) > 0.5) {
            tocRanges.push(
                new Range(listStartPos, doc.positionAt(listRegex.lastIndex))
            );
        }
    }

    return [tocRanges, newTocText];
}

function commonPrefixLength(s1, s2) {
    let minLength = Math.min(s1.length, s2.length);
    for (let i = 0; i < minLength; i++) {
        if (s1[i] !== s2[i]) {
            return i;
        }
    }
    return minLength;
}

function radioOfCommonPrefix(s1, s2) {
    let minLength = Math.min(s1.length, s2.length);
    let maxLength = Math.max(s1.length, s2.length);

    let prefixLength = commonPrefixLength(s1, s2);
    if (prefixLength < minLength) {
        return prefixLength / minLength;
    } else {
        return minLength / maxLength;
    }
}

function onWillSave(e: TextDocumentWillSaveEvent) {
    if (!tocConfig.updateOnSave) return;
    if (e.document.languageId == 'markdown') {
        e.waitUntil(updateToc());
    }
}

function loadTocConfig() {
    let tocSectionCfg = workspace.getConfiguration('markdown.extension.toc');
    let tocLevels = tocSectionCfg.get<string>('levels');
    let matches;
    if (matches = tocLevels.match(/^([1-6])\.\.([1-6])$/)) {
        tocConfig.startDepth = Number(matches[1]);
        tocConfig.endDepth = Number(matches[2]);
    }
    tocConfig.orderedList = tocSectionCfg.get<boolean>('orderedList');
    tocConfig.listMarker = tocSectionCfg.get<string>('unorderedList.marker');
    tocConfig.plaintext = tocSectionCfg.get<boolean>('plaintext');
    tocConfig.updateOnSave = tocSectionCfg.get<boolean>('updateOnSave');

    // Load workspace config
    let activeEditor = window.activeTextEditor;
    docConfig.eol = activeEditor.document.eol === EndOfLine.CRLF ? '\r\n' : '\n';

    let tabSize = Number(activeEditor.options.tabSize);
    if (workspace.getConfiguration('markdown.extension.list', activeEditor.document.uri).get<string>('indentationSize') === 'adaptive') {
        tabSize = tocConfig.orderedList ? 3 : 2;
    }

    let insertSpaces = activeEditor.options.insertSpaces;
    if (insertSpaces) {
        docConfig.tab = ' '.repeat(tabSize);
    } else {
        docConfig.tab = '\t';
    }
}

function getText(range: Range): string {
    return window.activeTextEditor.document.getText(range);
}

export function buildToc(doc: TextDocument) {
    let lines = doc.getText()
        .replace(/^( {0,3}|\t)```[\w \+]*$[\w\W]+?^( {0,3}|\t)``` *$/gm, '')  //// Remove fenced code blocks (and #603, #675)
        .replace(/<!-- omit in (toc|TOC) -->/g, '&lt; omit in toc &gt;')      //// Escape magic comment
        .replace(/<!--[\W\w]+?-->/, '')                           //// Remove comments
        .replace(/^---[\W\w]+?(\r?\n)---/, '')                    //// Remove YAML front matter
        .split(/\r?\n/g);

    lines.forEach((lineText, i, arr) => {
        //// Transform setext headings to ATX headings
        if (
            i < arr.length - 1
            && lineText.match(/^ {0,3}\S.*$/)
            && lineText.replace(/[ -]/g, '').length > 0  //// #629
            && arr[i + 1].match(/^ {0,3}(=+|-{2,}) *$/)
        ) {
            arr[i] = (arr[i + 1].includes('=') ? '# ' : '## ') + lineText;
        }
        //// Ignore headings following `<!-- omit in toc -->`
        if (
            i > 0
            && arr[i - 1] === '&lt; omit in toc &gt;'
        ) {
            arr[i] = '';
        }
    });

    const toc = lines.filter(lineText => {
        return lineText.trim().startsWith('#')
            && !lineText.startsWith('    ')  //// The opening `#` character may be indented 0-3 spaces
            && lineText.includes('# ')
            && !lineText.includes('&lt; omit in toc &gt;');
    }).map(lineText => {
        lineText = lineText.replace(/^ +/, '');
        const matches = /^(#+) (.*)/.exec(lineText);
        const entry = {
            level: matches[1].length,
            text: matches[2].replace(/#+$/, '').trim()
        };
        return entry;
    });

    return toc;
}

class TocCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, _: CancellationToken):
        CodeLens[] | Thenable<CodeLens[]> {
        let lenses: CodeLens[] = [];
        return detectTocRanges(document).then(tocRangesAndText => {
            const tocRanges = tocRangesAndText[0];
            const newToc = tocRangesAndText[1];
            for (let tocRange of tocRanges) {
                let status = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol) === newToc ? 'up to date' : 'out of date';
                lenses.push(new CodeLens(tocRange, {
                    arguments: [],
                    title: `Table of Contents (${status})`,
                    command: ''
                }));
            }
            return lenses;
        });
    }
}
