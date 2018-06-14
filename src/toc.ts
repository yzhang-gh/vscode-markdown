'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { officialExtPath, slugify, TocProvider, mdDocSelector, extractText, isMdEditor } from './util';

const MdEngine = require(path.join(officialExtPath, 'out', 'markdownEngine')).MarkdownEngine;

const engine = new MdEngine();

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

    const mdOutlineProvider = new MdOutlineProvider();
    vscode.window.registerTreeDataProvider('mdOutline', mdOutlineProvider);
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
    let tocEntries = await buildToc();
    if (tocEntries === null || tocEntries === undefined || tocEntries.length < 1) return '';

    let startDepth = Math.max(tocConfig.startDepth, Math.min.apply(null, tocEntries.map(h => h.level)));
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    tocEntries.forEach(entry => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let relativeLvl = entry.level - startDepth;
            let entryText = extractText(entry.text);
            let row = [
                docConfig.tab.repeat(relativeLvl),
                (tocConfig.orderedList ? (orderedListMarkerIsOne ? '1' : ++order[relativeLvl]) + '.' : tocConfig.listMarker) + ' ',
                tocConfig.plaintext ? entryText : `[${entryText}](#${slugify(entry.text)})`
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
            if (!firstLine.includes('](')) {
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

async function buildToc() {
    let toc;
    let editor = vscode.window.activeTextEditor;
    if (isMdEditor(editor)) {
        const tocProvider = new TocProvider(engine, editor.document);
        toc = await tocProvider.getToc();
        if (toc !== undefined && toc.length > 0) {
            // Omit heading using comments
            toc = toc.filter(entry => !entry.text.toLowerCase().includes('<!-- omit in toc -->'));
        }
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

class MdOutlineProvider implements vscode.TreeDataProvider<number> {

    private _onDidChangeTreeData: vscode.EventEmitter<number | null> = new vscode.EventEmitter<number | null>();
    readonly onDidChangeTreeData: vscode.Event<number | null> = this._onDidChangeTreeData.event;

    private toc;
    private editor: vscode.TextEditor;
    private maxExpandedLvl = 6;

    /**
     * @param realIndex starts from 1
     */
    getTreeItem(realIndex: number): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return this.getTreeItemByIdx(realIndex - 1);
    }

    getChildren(realIndex?: number): number[] | Thenable<number[]> {
        if (this.toc == null) {
            return [];
        } else if (realIndex == undefined) { // Get root nodes
            let minHeadingLevel = Math.min.apply(null, this.toc.map(h => h.level));
            return this.toc.filter(h => {
                return h.level === minHeadingLevel;
            }).map(h => {
                return this.toc.indexOf(h) + 1;
            });
        } else if (realIndex < this.toc.length) {
            let childLevel = this.toc[realIndex - 1].level + 1;
            let children = [];
            for (var i = realIndex; i < this.toc.length; i++) {
                if (this.toc[i].level === childLevel) {
                    children.push(i + 1);
                } else if (this.toc[i].level < childLevel) {
                    break;
                }
            }
            return children;
        } else {
            return [];
        }
    }

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (isMdEditor(editor)) {
                vscode.commands.executeCommand('setContext', 'mdContext', true);
            } else {
                vscode.commands.executeCommand('setContext', 'mdContext', false);
            }
            this.update();
        });

        vscode.workspace.onDidSaveTextDocument(doc => {
            this.update();
        });

        // First time
        if (isMdEditor(vscode.window.activeTextEditor)) {
            vscode.commands.executeCommand('setContext', 'mdContext', true);
        } else {
            vscode.commands.executeCommand('setContext', 'mdContext', false);
        }
        this.update();
    }

    public async update() {
        this.toc = await buildToc();

        if (this.toc !== null) {
            // Better to have <= 10 expanded items in the outline view
            let maxInitItems = 10;
            this.maxExpandedLvl = 6;
            for (let i = 1; i <= 6; i++) {
                maxInitItems -= this.toc.filter(h => h.level === i).length;
                if (maxInitItems < 0) {
                    this.maxExpandedLvl = i - 1;
                    break;
                }
            }
        }

        this._onDidChangeTreeData.fire();
    }

    /**
     * @param idx Array index, starts from 0
     */
    private getTreeItemByIdx(idx: number): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(extractText(this.toc[idx].text));
        if (idx === this.toc.length - 1) { // The last item
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else if (this.toc[idx].level < this.toc[idx + 1].level) {
            if (this.toc[idx].level < this.maxExpandedLvl) {
                treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            } else {
                treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            }
        } // else -> vscode.TreeItemCollapsibleState.None

        treeItem.command = {
            command: 'revealLine',
            title: '',
            arguments: [{ lineNumber: this.toc[idx].line, at: 'top' }]
        };
        return treeItem;
    }
}