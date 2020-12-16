'use strict';

import * as path from 'path';
import * as stringSimilarity from 'string-similarity';
import { CancellationToken, CodeLens, CodeLensProvider, commands, EndOfLine, ExtensionContext, languages, Range, TextDocument, TextDocumentWillSaveEvent, TextEditor, window, workspace, WorkspaceEdit } from 'vscode';
import { isInFencedCodeBlock, isMdEditor, mdDocSelector, REGEX_FENCED_CODE_BLOCK, slugify } from './util';

/**
 * The heading level allowed by the CommonMark Spec.
 */
type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Represents a heading.
 */
interface IHeading {
    /**
     * The heading level.
     */
    level: MarkdownHeadingLevel;

    /**
     * The raw content of the heading according to the CommonMark Spec.
     */
    rawContent: string;

    /**
     * The **zero-based** index of the beginning line of the heading in original document.
     */
    lineIndex: number;

    /**
     * `true` to show in TOC. `false` to omit in TOC.
     */
    isInToc: boolean;
}

/**
 * Represents a basic unit of a TOC.
 */
export interface ITocItem extends IHeading {
    /**
     * The **rich text** representation of the rendering result (in strict CommonMark mode) of the heading.
     * This must be able to be safely put into a `[]` bracket pair without breaking Markdown syntax.
     */
    visibleText: string;

    /**
     * The anchor ID of the heading.
     */
    slug: string;
}

/**
 * Workspace config
 */
const docConfig = { tab: '  ', eol: '\r\n' };
const tocConfig = { startDepth: 1, endDepth: 6, listMarker: '-', orderedList: false, updateOnSave: false, plaintext: false, tabSize: 2 };

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
    const editor = window.activeTextEditor;

    if (!(editor && isMdEditor(editor))) {
        return;
    }

    loadTocConfig(editor);

    let toc = await generateTocText(editor.document);
    await editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, toc);
    });
}

async function updateToc() {
    const editor = window.activeTextEditor;

    if (!(editor && isMdEditor(editor))) {
        return;
    }

    loadTocConfig(editor);

    const doc = editor.document;
    const tocRangesAndText = await detectTocRanges(doc);
    const tocRanges = tocRangesAndText[0];
    const newToc = tocRangesAndText[1];

    await editor.edit(editBuilder => {
        for (const tocRange of tocRanges) {
            if (tocRange !== null) {
                const oldToc = doc.getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol);
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

    if (!(editor && isMdEditor(editor))) {
        return;
    }

    loadTocConfig(editor);

    const doc = editor.document;
    const toc = getAllRootHeading(doc);
    if (toc === null || toc === undefined || toc.length < 1) return;
    const startDepth = Math.max(tocConfig.startDepth, Math.min(...toc.map(h => h.level)));

    let secNumbers = [0, 0, 0, 0, 0, 0];
    let edit = new WorkspaceEdit();
    toc.forEach(entry => {
        const level = entry.level;
        const lineNum = entry.lineIndex;

        if (level < startDepth) return;

        secNumbers[level - 1] += 1;
        secNumbers.fill(0, level);
        const secNumStr = [...Array(level - startDepth + 1).keys()].map(num => `${secNumbers[num + startDepth - 1]}.`).join('');

        const lineText = doc.lineAt(lineNum).text;
        const newText = lineText.includes('#')
            ? lineText.replace(/^(\s{0,3}#+ +)((?:\d{1,9}\.)* )?(.*)/, (_, g1, _g2, g3) => `${g1}${secNumStr} ${g3}`)
            : lineText.replace(/^(\s{0,3})((?:\d{1,9}\.)* )?(.*)/, (_, g1, _g2, g3) => `${g1}${secNumStr} ${g3}`);
        edit.replace(doc.uri, doc.lineAt(lineNum).range, newText);
    });

    return workspace.applyEdit(edit);
}

function removeSectionNumbers() {
    const editor = window.activeTextEditor;
    if (!(editor && isMdEditor(editor))) {
        return;
    }
    const doc = editor.document;
    const toc = getAllRootHeading(editor.document);
    let edit = new WorkspaceEdit();
    toc.forEach(entry => {
        const lineNum = entry.lineIndex;
        const lineText = doc.lineAt(lineNum).text;
        const newText = lineText.includes('#')
            ? lineText.replace(/^(\s{0,3}#+ +)((?:\d{1,9}\.)* )?(.*)/, (_, g1, _g2, g3) => `${g1}${g3}`)
            : lineText.replace(/^(\s{0,3})((?:\d{1,9}\.)* )?(.*)/, (_, g1, _g2, g3) => `${g1}${g3}`);
        edit.replace(doc.uri, doc.lineAt(lineNum).range, newText);
    });

    return workspace.applyEdit(edit);
}

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
}

//// Returns a list of user defined excluded headings for the given document.
function getExcludedHeadings(doc: TextDocument): { level: number, text: string; }[] {
    const configObj = workspace.getConfiguration('markdown.extension.toc').get<{ [path: string]: string[]; }>('omittedFromToc');

    if (typeof configObj !== 'object' || configObj === null) {
        window.showErrorMessage(`\`omittedFromToc\` must be an object (e.g. \`{"README.md": ["# Introduction"]}\`)`);
        return [];
    }

    const docWorkspace = workspace.getWorkspaceFolder(doc.uri);

    let omittedTocPerFile: { [path: string]: string[]; } = {};
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
    const orderedListMarkerIsOne: boolean = workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') === 'one';

    let toc: string[] = [];
    let tocEntries = getAllRootHeading(doc);
    if (tocEntries === null || tocEntries === undefined || tocEntries.length < 1) return '';

    const startDepth = Math.max(tocConfig.startDepth, Math.min(...tocEntries.map(h => h.level)));
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    const anchorOccurrences: { [slug: string]: number; } = {};
    let ignoredDepthBound: number | undefined = undefined;
    const excludedHeadings = getExcludedHeadings(doc);

    tocEntries.forEach(entry => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let relativeLvl = entry.level - startDepth;

            //// Remove certain Markdown syntaxes
            //// `[text](link)` → `text`
            let headingText = entry.rawContent.replace(/\[([^\]]*)\]\([^\)]*\)/, (_, g1) => g1);
            //// `[text][label]` → `text`
            headingText = headingText.replace(/\[([^\]]*)\]\[[^\)]*\]/, (_, g1) => g1);

            let slug = slugify(entry.rawContent);

            if (anchorOccurrences.hasOwnProperty(slug)) {
                anchorOccurrences[slug] += 1;
                slug += '-' + String(anchorOccurrences[slug]);
            } else {
                anchorOccurrences[slug] = 0;
            }

            // Filter out used excluded headings.
            const isExcluded = excludedHeadings.some(({ level, text }) => level === entry.level && text === entry.rawContent);
            const isOmittedSubHeading = ignoredDepthBound !== undefined && entry.level > ignoredDepthBound;
            if (isExcluded) {
                // Keep track of the latest omitted heading's depth to also omit its subheadings.
                ignoredDepthBound = entry.level;
            } else if (!isOmittedSubHeading) {
                // Reset ignore bound (not ignored sub heading anymore).
                ignoredDepthBound = undefined;
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
        if (
            (listStartPos.line > 0 && doc.lineAt(listStartPos.line - 1).text.includes("no toc"))
            || isInFencedCodeBlock(doc, listStartPos.line)
        ) {
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
            if (!/^([-\*+]|[0-9]+[.)]) +\[[^\]]+\]\(\#[^\)]+\)$/.test(firstLine)) {
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

function commonPrefixLength(s1: string, s2: string): number {
    let minLength = Math.min(s1.length, s2.length);
    for (let i = 0; i < minLength; i++) {
        if (s1[i] !== s2[i]) {
            return i;
        }
    }
    return minLength;
}

function radioOfCommonPrefix(s1: string, s2: string): number {
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

/**
 * Updates `tocConfig` and `docConfig`.
 * @param editor The editor, from which we detect `docConfig`.
 */
function loadTocConfig(editor: TextEditor): void {
    const tocSectionCfg = workspace.getConfiguration('markdown.extension.toc');
    const tocLevels = tocSectionCfg.get<string>('levels')!;
    let matches;
    if (matches = tocLevels.match(/^([1-6])\.\.([1-6])$/)) {
        tocConfig.startDepth = Number(matches[1]);
        tocConfig.endDepth = Number(matches[2]);
    }
    tocConfig.orderedList = tocSectionCfg.get<boolean>('orderedList')!;
    tocConfig.listMarker = tocSectionCfg.get<string>('unorderedList.marker')!;
    tocConfig.plaintext = tocSectionCfg.get<boolean>('plaintext')!;
    tocConfig.updateOnSave = tocSectionCfg.get<boolean>('updateOnSave')!;

    // Load workspace config
    docConfig.eol = editor.document.eol === EndOfLine.CRLF ? '\r\n' : '\n';

    let tabSize = Number(editor.options.tabSize);
    // Seems not robust.
    if (workspace.getConfiguration('markdown.extension.list', editor.document.uri).get<string>('indentationSize') === 'adaptive') {
        tabSize = tocConfig.orderedList ? 3 : 2;
    }

    const insertSpaces = editor.options.insertSpaces;
    if (insertSpaces) {
        docConfig.tab = ' '.repeat(tabSize);
    } else {
        docConfig.tab = '\t';
    }
}

/**
 * Gets all headings in the root of the text document.
 * @returns In ascending order of `lineIndex`.
 */
export function getAllRootHeading(doc: TextDocument): IHeading[] {
    /**
     * Replaces line content with empty.
     * @param foundStr The multiline string.
     */
    const replacer = (foundStr: string) => foundStr.replace(/[^\r\n]/g, '');

    /* Get lines. And easy transformations. */

    const lines: string[] = doc.getText()
        .replace(/^---[\W\w]+?(?:\r?\n)---/, replacer)              //// Remove YAML front matter
        .replace(REGEX_FENCED_CODE_BLOCK, replacer)                 //// Remove fenced code blocks (and #603, #675)
        .replace(/^\t+/gm, (match: string) => '    '.repeat(match.length)) // CommonMark Spec - 2.2 Tabs
        .split(/\r?\n/g);

    // .replace(/<!--[\W\w]+?-->/g, replacer)                      //// Remove comments

    /* Complex transformations. */

    // When trimming, comply with the CommonMark Spec. Do not use `trim()`. <https://tc39.es/ecma262/#sec-trimstring>
    // Be careful about special cases that we need to look at multiple lines to decide.
    // Still cannot perfectly handle some weird cases, for example:
    // * Multiline heading.
    // * A setext heading next to a list.

    // Do transformations as many as possible in one loop, to save time.
    lines.forEach((lineText, i, arr) => {
        //// Transform setext headings to ATX headings
        if (
            i < arr.length - 1 // The current line is not the last.
            && /^ {0,3}[^ \t\f\v]/.test(lineText) // The indentation of the line is 0~3.
            && !/^ {0,3}#{1,6}(?: |\t|$)/.test(lineText) // The line is not an ATX heading.
            && !/^ {0,3}(?:[*+-]|\d{1,9}(?:\.|\)))(?: |\t|$)/.test(lineText) // The line is not a list item.
            && !/^ {0,3}>/.test(lineText) // The line is not a block quote.
            && !/^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/.test(lineText) // #629: Consecutive thematic breaks false positive. <https://github.com/commonmark/commonmark.js/blob/75474b071da06535c23adc17ac4132213ab31934/lib/blocks.js#L36>
            && /^ {0,3}(?:=+|-+)[ \t]*$/.test(arr[i + 1]) // The next line is a setext heading underline.
        ) {
            arr[i] = (arr[i + 1].includes('=') ? '# ' : '## ') + lineText;
            arr[i + 1] = '';
        }

        // Remove trailing space or tab characters.
        // <https://github.com/commonmark/commonmark.js/blob/75474b071da06535c23adc17ac4132213ab31934/lib/blocks.js#L503-L507>
        arr[i] = arr[i].replace(/[ \t]+$/, '');
    });

    /* Generate the final list. */

    const toc: IHeading[] = [];

    for (let i: number = 0; i < lines.length; i++) {
        const crtLineText = lines[i];

        // Skip non-ATX heading lines.
        if (
            // <https://spec.commonmark.org/0.29/#atx-headings>
            // Leading tab-space conversion has been done above.
            !/^ {0,3}#{1,6}(?: |\t|$)/.test(crtLineText)
        ) {
            continue;
        }

        let isInToc: boolean = true;

        // Identify ignored headings.
        // We have trimmed trailing space or tab characters above.
        if (
            // The magic comment is above the heading.
            (
                i > 0
                && /^<!-- omit in (toc|TOC) -->$/.test(lines[i - 1])
            )

            // The magic comment is at the end of the heading.
            || crtLineText.endsWith('<!-- omit in toc -->')
            || crtLineText.endsWith('<!-- omit in TOC -->')
        ) {
            isInToc = false;
        }

        // Extract heading info.
        const matches = /^ {0,3}(#{1,6})(.*)$/.exec(crtLineText)!;
        const entry = {
            level: matches[1].length as MarkdownHeadingLevel,
            rawContent: matches[2].replace(/^[ \t]+/, '').replace(/[ \t]+#+[ \t]*$/, ''),
            lineIndex: i,
            isInToc,
        };

        toc.push(entry);
    }

    return toc;
}

class TocCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, _: CancellationToken):
        CodeLens[] | Thenable<CodeLens[]> {
        // VS Code asks for code lens as soon as a text editor is visible (atop the group that holds it), no matter whether it has focus.
        // Duplicate editor views refer to the same TextEditor, and the same TextDocument.
        const editor = window.visibleTextEditors.find(e => e.document === document)!;

        loadTocConfig(editor);

        const lenses: CodeLens[] = [];
        return detectTocRanges(document).then(tocRangesAndText => {
            const tocRanges = tocRangesAndText[0];
            const newToc = tocRangesAndText[1];
            for (let tocRange of tocRanges) {
                let status = document.getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol) === newToc ? 'up to date' : 'out of date';
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
