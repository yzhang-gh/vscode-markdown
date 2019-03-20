'use strict';

import * as vscode from 'vscode';
import { extractText, isMdEditor, mdDocSelector, slugify } from './util';
import * as stringSimilarity from 'string-similarity';

/**
 * Workspace config
 */
const docConfig = { tab: '  ', eol: '\r\n' };
const tocConfig = {
  startDepth: 1,
  endDepth: 6,
  listMarker: '-',
  orderedList: false,
  updateOnSave: false,
  plaintext: false,
   tabSize: 2,
  marker: "-",
  template: "",
  markerSkipLast: false,
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.extension.toc.create', createToc),
        vscode.commands.registerCommand('markdown.extension.toc.update', updateToc),
        vscode.workspace.onWillSaveTextDocument(onWillSave),
        vscode.languages.registerCodeLensProvider(mdDocSelector, new TocCodeLensProvider())
    );
}

async function createToc() {
    let editor = vscode.window.activeTextEditor;
    let toc = await generateTocText();
    await editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, toc);
    });
}

async function updateToc() {
    let editor = vscode.window.activeTextEditor;
    let doc = editor.document;
    let tocRanges = await detectTocRanges(doc);
    let newToc = await generateTocText();
    await editor.edit(editBuilder => {
        for (let tocRange of tocRanges) {
            if (tocRange !== null) {
                let oldToc = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol);
                if (oldToc !== newToc) {
                    let unchangedLength = commonPrefixLength(oldToc, newToc);
                    let newStart = doc.positionAt(doc.offsetAt(tocRange.start) + unchangedLength);
                    let replaceRange = tocRange.with(newStart);
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

async function generateTocText(): Promise<string> {
    loadTocConfig();
    const orderedListMarkerIsOne: boolean = vscode.workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') === 'one';

    let toc = [];
    let tocEntries = buildToc();
    if (tocEntries === null || tocEntries === undefined || tocEntries.length < 1) return '';

    let startDepth = Math.max(tocConfig.startDepth, Math.min.apply(null, tocEntries.map(h => h.level)));
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    let anchorOccurrences = {};

    tocEntries.forEach((entry: any, index: number) => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let relativeLvl = entry.level - startDepth;
            let entryText = extractText(entry.text);
            let anchorText = entryText;

            if (anchorOccurrences.hasOwnProperty(anchorText)) {
                anchorOccurrences[anchorText] += 1;
                anchorText += ' ' + String(anchorOccurrences[anchorText]);
            } else {
                anchorOccurrences[anchorText] = 0;
            }

            let template = ""

            if (tocConfig.orderedList) {
              template = tocConfig.template
                .replace("{marker}", (orderedListMarkerIsOne ? "1" : ++order[relativeLvl]) + ".")
                .replace("{name}", entryText)
                .replace("{link}", slugify(anchorText))
            } else {
              template = tocConfig.template
                .replace("{marker}", tocConfig.marker)
                .replace("{name}", entryText)
                .replace("{link}", "#" + slugify(anchorText))
                .replace("{eol}", docConfig.eol)
            }

            template = docConfig.tab.repeat(relativeLvl) + template // add tab

            if (!tocConfig.orderedList && tocConfig.markerSkipLast && index === tocEntries.length - 1) {
              template = template.replace(tocConfig.marker, "") // remove the last marker
            }

            toc.push(template);
            if (tocConfig.orderedList) order.fill(0, relativeLvl + 1);
        }
    });
    return toc.join(tocConfig.orderedList ? docConfig.eol : '');
}

/**
 * Returns an array of TOC ranges.
 * If no TOC is found, returns an empty array.
 * @param doc a TextDocument
 */
async function detectTocRanges(doc: vscode.TextDocument): Promise<Array<vscode.Range>> {
    let tocRanges = [];
    let newTocText = await generateTocText();
    let fullText = doc.getText();

    let regexListItem = tocConfig.template
      .replace(/\s|\[|\]|\(|\)|#/g, "") // remove everything we don't need here
      .replace("{marker}", `(\\s*${tocConfig.orderedList ? "[0-9]+\\." : "\\" + tocConfig.marker}\\s*)${tocConfig.markerSkipLast ? '?' : ''}`)
      .replace("{name}", "(\\[[a-zA-Z0-9]+\\])")
      .replace("{link}", `(\\(${tocConfig.plaintext ? "" : "#"}[a-zA-Z0-9]+\\))`)
      .replace("{eol}", docConfig.eol)
    let regexList = new RegExp(`(?!\\n)(${regexListItem})+`, "g")
    console.log(`(?!\\n)(${regexListItem})+`);

    let match;
    while ((match = regexList.exec(fullText)) !== null) {
        let listText = match[0];

        if (radioOfCommonPrefix(newTocText, listText) + stringSimilarity.compareTwoStrings(newTocText, listText) > 0.5) {
            tocRanges.push(
                new vscode.Range(doc.positionAt(match.index), doc.positionAt(regexList.lastIndex))
            );
        }
    }
    return tocRanges;
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

function onWillSave(e: vscode.TextDocumentWillSaveEvent) {
    if (!tocConfig.updateOnSave) return;
    if (e.document.languageId == 'markdown') {
        e.waitUntil(updateToc());
    }
}

function loadTocConfig() {
    let tocSectionCfg = vscode.workspace.getConfiguration('markdown.extension.toc');
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
    tocConfig.marker = tocSectionCfg.get<string>("marker")
    tocConfig.markerSkipLast = tocSectionCfg.get<boolean>("markerSkipLast")
    tocConfig.template = tocSectionCfg.get<string>("template")

    // Load workspace config
    let activeEditor = vscode.window.activeTextEditor;
    docConfig.eol = activeEditor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

    let tabSize = Number(activeEditor.options.tabSize);
    if (vscode.workspace.getConfiguration('markdown.extension.list', activeEditor.document.uri).get<string>('indentationSize') === 'adaptive') {
        tabSize = tocConfig.orderedList ? 3 : 2;
    }

    let insertSpaces = activeEditor.options.insertSpaces;
    if (insertSpaces) {
        docConfig.tab = ' '.repeat(tabSize);
    } else {
        docConfig.tab = '\t';
    }
}

function getText(range: vscode.Range): string {
    return vscode.window.activeTextEditor.document.getText(range);
}

function buildToc() {
    let toc;
    let editor = vscode.window.activeTextEditor;
    if (isMdEditor(editor)) {
        let lines = editor.document.getText()
            .replace(/(^|\r?\n)```[\W\w]+?(```|$)/g, '') // Remove code blocks
            .replace(/^---[\W\w]+?(\r?\n)---/, '') // Remove YAML front matter
            .split(/\r?\n/g);
        // Transform setext headings to ATX headings
        lines.forEach((lineText, i, arr) => {
            if (
                i < arr.length - 1
                && lineText.match(/^ {0,3}\S.*$/)
                && arr[i + 1].match(/^ {0,3}(=+|-{2,}) *$/)
            ) {
                arr[i] = (arr[i + 1].includes('=') ? '# ' : '## ') + lineText;
            }
        });
        toc = lines.filter(lineText => {
            return lineText.startsWith('#')
                && lineText.includes('# ')
                && !lineText.toLowerCase().includes('<!-- omit in toc -->')
        }).map(lineText => {
            let entry = {};
            let matches = /^(#+) (.*)/.exec(lineText);
            entry['level'] = matches[1].length;
            entry['text'] = matches[2].replace(/#+$/, '').trim();
            return entry;
        });
    } else {
        toc = null;
    }
    return toc;
}

class TocCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
        vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        let lenses: vscode.CodeLens[] = [];
        return detectTocRanges(document).then(tocRanges => {
            for (let tocRange of tocRanges) {
                generateTocText().then(text => {
                    let status = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol) === text ? 'up to date' : 'out of date';
                    lenses.push(new vscode.CodeLens(tocRange, {
                        arguments: [],
                        title: `Table of Contents (${status})`,
                        command: ''
                    }));
                });
            }
            return lenses;
        });
    }
}
