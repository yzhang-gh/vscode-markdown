'use strict';

import * as vscode from 'vscode';
import { extractText, isMdEditor, mdDocSelector, slugify } from './util';

/**
 * Workspace config
 */
let docConfig = { tab: '    ', eol: '\r\n' };
let tocConfig = { startDepth: 1, endDepth: 6, listMarker: '-', orderedList: false, updateOnSave: false, plaintext: false };

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
    let tocRange = await detectTocRange(doc);
    if (tocRange != null) {
        let oldToc = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol);
        let newToc = await generateTocText();
        if (oldToc !== newToc) {
            let unchangedLength = commonPrefixLength(oldToc, newToc);
            let newStart = doc.positionAt(doc.offsetAt(tocRange.start) + unchangedLength);
            let replaceRange = tocRange.with(newStart);
            await editor.edit(editBuilder => {
                if (replaceRange.isEmpty) {
                    editBuilder.insert(replaceRange.start, newToc.substring(unchangedLength));
                } else {
                    editBuilder.replace(replaceRange, newToc.substring(unchangedLength));
                }
            });
        }
    }
}

async function generateTocText(): Promise<string> {
    loadTocConfig();
    const orderedListMarkerIsOne: boolean = vscode.workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') === 'one';

    let toc = [];
    let tocEntries = buildToc();
    if (tocEntries === null || tocEntries === undefined || tocEntries.length < 1) return '';

    let startDepth = Math.max(tocConfig.startDepth, Math.min.apply(null, tocEntries.map(h => h.level)));
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    let anchorOccurances = {};

    tocEntries.forEach(entry => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let relativeLvl = entry.level - startDepth;
            let entryText = extractText(entry.text);
            let anchorText = entryText;

            if (anchorOccurances.hasOwnProperty(anchorText)) {
                anchorOccurances[anchorText] += 1;
                anchorText += ' ' + String(anchorOccurances[anchorText]);
            } else {
                anchorOccurances[anchorText] = 0;
            }

            let row = [
                docConfig.tab.repeat(relativeLvl),
                (tocConfig.orderedList ? (orderedListMarkerIsOne ? '1' : ++order[relativeLvl]) + '.' : tocConfig.listMarker) + ' ',
                tocConfig.plaintext ? entryText : `[${entryText}](#${slugify(anchorText)})`
            ];
            toc.push(row.join(''));
            if (tocConfig.orderedList) order.fill(0, relativeLvl + 1);
        }
    });
    while (/^[ \t]/.test(toc[0])) {
        toc = toc.slice(1);
    }
    return toc.join(docConfig.eol);
}

async function detectTocRange(doc: vscode.TextDocument): Promise<vscode.Range> | null {
    let newTocText = await generateTocText();
    let fullText = doc.getText();
    let listRegex = /(?:^|\r?\n)((?:[-+*]|[0-9]+[.)]) .*(?:\r?\n[ \t]*(?:[-+*]|[0-9]+[.)]) .*)*)/g;
    let match;
    while ((match = listRegex.exec(fullText)) !== null) {
        let listText = match[1];

        let firstLine: string = listText.split(/\r?\n/)[0];
        if (vscode.workspace.getConfiguration('markdown.extension.toc').get<boolean>('plaintext')) {
            // A lazy way to check whether it is a link
            if (firstLine.includes('](')) {
                continue;
            }
        } else {
            if (!firstLine.includes('](#')) {
                continue;
            }
        }

        if (radioOfCommonPrefix(newTocText, listText) + similarity(newTocText, listText) > 0.5) {
            return new vscode.Range(doc.positionAt(fullText.indexOf(listText)), doc.positionAt(fullText.indexOf(listText) + listText.length));
        }
    }
    return null;
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

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) {
            costs[s2.length] = lastValue;
        }
    }
    return costs[s2.length];
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

    // Load workspace config
    let activeEditor = vscode.window.activeTextEditor;
    docConfig.eol = activeEditor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    let tabSize = Number(activeEditor.options.tabSize);
    let insertSpaces = activeEditor.options.insertSpaces;

    docConfig.tab = '\t';
    if (insertSpaces && tabSize > 0) {
        docConfig.tab = " ".repeat(tabSize);
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
        return detectTocRange(document).then(tocRange => {
            if (tocRange == null) return lenses; // No TOC
            return generateTocText().then(text => {
                let status = getText(tocRange).replace(/\r?\n|\r/g, docConfig.eol) === text ? 'up to date' : 'out of date';
                lenses.push(new vscode.CodeLens(tocRange, {
                    arguments: [],
                    title: `Table of Contents (${status})`,
                    command: ''
                }));
                return lenses;
            });
        });
    }
}
