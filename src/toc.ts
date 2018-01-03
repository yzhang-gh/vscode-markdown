'use strict';

import * as vscode from 'vscode';
import { log } from './util';
import * as path from 'path';

const officialExt = vscode.extensions.getExtension("Microsoft.vscode-markdown");
const TocProvider = require(path.join(officialExt.extensionPath, 'out', 'tableOfContentsProvider')).TableOfContentsProvider;
const MdEngine = require(path.join(officialExt.extensionPath, 'out', 'markdownEngine')).MarkdownEngine;

const engine = new MdEngine();

const prefix = 'markdown.extension.toc.';

/**
 * Workspace config
 */
let wsConfig = { tab: '    ', eol: '\r\n' };
let tocConfig = { startDepth: 1, endDepth: 6, listMarker: '-', orderedList: false, updateOnSave: false, plaintext: false };

export function activate(context: vscode.ExtensionContext) {
    const cmds: Command[] = [
        { command: 'create', callback: createToc },
        { command: 'update', callback: updateToc }
        // , { command: 'delete', callback: deleteToc }
    ].map(cmd => {
        cmd.command = prefix + cmd.command;
        return cmd;
    });

    cmds.forEach(cmd => {
        context.subscriptions.push(vscode.commands.registerCommand(cmd.command, cmd.callback));
    });

    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(onWillSave));
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' }, new TocCodeLensProvider()));

    // Load workspace config
    wsConfig.eol = <string>vscode.workspace.getConfiguration("files", null).get("eol");
    let tabSize = <number>vscode.workspace.getConfiguration("editor", null).get("tabSize");
    let insertSpaces = <boolean>vscode.workspace.getConfiguration("editor", null).get("insertSpaces");

    wsConfig.tab = '\t';
    if (insertSpaces && tabSize > 0) {
        wsConfig.tab = " ".repeat(tabSize);
    }

    vscode.window.registerTreeDataProvider('mdOutline', new MdOutlineProvider());
}

async function createToc() {
    let editor = vscode.window.activeTextEditor;
    let toc = await generateTocText(editor.document);
    await editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, toc);
    });
}

async function updateToc() {
    let editor = vscode.window.activeTextEditor;
    let tocRange = await detectTocRange(editor.document);
    if (tocRange != null) {
        let oldToc = getText(tocRange).replace(/\r?\n|\r/g, wsConfig.eol);
        let newToc = await generateTocText(editor.document);
        if (oldToc != newToc) {
            // Keep the unchanged lines. (to prevent codeLens from re-emergence in UI)
            let oldTocArr = oldToc.split(wsConfig.eol);
            let newTocArr = newToc.split(wsConfig.eol);
            let firstChangedLine = 0;
            for (let i = 0; i < newTocArr.length; i++) {
                if (newTocArr[i] != oldTocArr[i]) {
                    firstChangedLine = i;
                    break;
                }
            }

            let text = newTocArr.slice(firstChangedLine).join(wsConfig.eol);
            let justAppending = false;
            let rangeToBeDel;
            let location;
            if (firstChangedLine + 1 > oldTocArr.length) { // Append to old TOC, no deletion
                justAppending = true;
                location = tocRange.end;
                text = wsConfig.eol + text;
            } else { // Delete and then append
                let delPosition = new vscode.Position(tocRange.start.line + firstChangedLine, tocRange.start.character);
                rangeToBeDel = new vscode.Range(delPosition, tocRange.end);
                location = rangeToBeDel.start;
            }

            await vscode.window.activeTextEditor.edit(editBuilder => {
                if (!justAppending) {
                    editBuilder.delete(rangeToBeDel);
                }
                editBuilder.insert(location, text);
            });
        }
    }
}

function deleteToc() {
    // Pass
}

async function generateTocText(document: vscode.TextDocument): Promise<string> {
    loadTocConfig();

    const tocProvider = new TocProvider(engine, document);

    let toc = [];
    let tocEntry = await tocProvider.getToc();
    let startDepth = tocConfig.startDepth;
    let order = new Array(tocConfig.endDepth - startDepth + 1).fill(0); // Used for ordered list

    tocEntry.forEach(entry => {
        if (entry.level <= tocConfig.endDepth && entry.level >= startDepth) {
            let indentation = entry.level - startDepth;
            let row = [
                wsConfig.tab.repeat(indentation),
                (tocConfig.orderedList ? ++order[indentation] + '.' : tocConfig.listMarker) + ' ',
                tocConfig.plaintext ? entry.text : `[${entry.text}](#${TocProvider.slugify(entry.text)})`
            ];
            toc.push(row.join(''));
            if (tocConfig.orderedList) order.fill(0, indentation + 1);
        }
    });
    return toc.join(wsConfig.eol);
}

async function detectTocRange(doc: vscode.TextDocument): Promise<vscode.Range> {
    loadTocConfig();

    const tocProvider = new TocProvider(engine, doc);

    let start, end: vscode.Position;
    let headings = await tocProvider.getToc();

    if (headings.length == 0) {
        // No headings
        return null;
    } else if (headings[0].text.length == 0) {
        // The first heading is empty
        return null;
    } else {
        for (let index = 0; index < doc.lineCount; index++) {
            let lineText = doc.lineAt(index).text;
            if (start == null) { // No line matched with start yet
                let regResult = lineText.match(/^[\-\*\+1]\.? (.+)$/); // Match list block and get list item
                if (regResult != null) {
                    let header = regResult[1];
                    let res = header.match(/^\[(.+?)\]\(#.+?\)$/); // Get `header` from `[header](anchor)`
                    if (res != null) {
                        header = res[1];
                    }
                    let expectedFirstHeader = headings.find(h => {
                        return h.level == tocConfig.startDepth;
                    }).text;
                    if (header.startsWith(expectedFirstHeader)) {
                        start = new vscode.Position(index, 0);
                    }
                }
            } else { // Start line already found
                lineText = lineText.trim();
                if (lineText.match(/^[\-\*\+\d]\.? /) == null) { // End of a list block
                    end = new vscode.Position(index - 1, doc.lineAt(index - 1).text.length);
                    // log('End', end);
                    break;
                } else if (index == doc.lineCount - 1) { // End of file
                    end = new vscode.Position(index, doc.lineAt(index).text.length);
                    // log('End', end);
                }
            }
        }
        if ((start != null) && (end != null)) {
            return new vscode.Range(start, end);
        }
        // log('No TOC detected.');
        return null;
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
        tocConfig.startDepth = matches[1];
        tocConfig.endDepth = matches[2];
    }
    tocConfig.orderedList = tocSectionCfg.get<boolean>('orderedList');
    tocConfig.listMarker = tocSectionCfg.get<string>('unorderedList.marker');
    tocConfig.plaintext = tocSectionCfg.get<boolean>('plaintext');
    tocConfig.updateOnSave = tocSectionCfg.get<boolean>('updateOnSave');
}

function getText(range: vscode.Range): string {
    return vscode.window.activeTextEditor.document.getText(range);
}

class TocCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
        vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        let lenses: vscode.CodeLens[] = [];
        return detectTocRange(document).then(tocRange => {
            if (tocRange == null) return lenses; // No TOC
            return generateTocText(document).then(text => {
                let status = getText(tocRange).replace(/\r?\n|\r/g, wsConfig.eol) === text ? 'up to date' : 'out of date';
                lenses.push(new vscode.CodeLens(tocRange, {
                    arguments: [],
                    title: `Table of Contents (${status})`,
                    command: ''
                }));
                return lenses;
            });
        });
    }

    // public resolveCodeLens?(codeLens: CodeLens, token: CancellationToken):
    //     CodeLens | Thenable<CodeLens> {

    // }
}

class MdOutlineProvider implements vscode.TreeDataProvider<number> {

    private _onDidChangeTreeData: vscode.EventEmitter<number | null> = new vscode.EventEmitter<number | null>();
    readonly onDidChangeTreeData: vscode.Event<number | null> = this._onDidChangeTreeData.event;

    private toc;
    private editor: vscode.TextEditor;

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
            return this.toc.filter(h => {
                return h.level === 1;
            }).map((h) => {
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
            this.update();
        });

        vscode.workspace.onDidSaveTextDocument(doc => {
            this.update();
        });

        this.update();
    }

    public async update() {
        await this.buildToc();
        this._onDidChangeTreeData.fire();
    }

    private async buildToc() {
        this.editor = vscode.window.activeTextEditor;
        if (this.editor && this.editor.document && this.editor.document.languageId === 'markdown') {
            const tocProvider = new TocProvider(engine, this.editor.document);
            this.toc = await tocProvider.getToc();
        } else {
            this.toc = null;
        }
    }

    private getTreeItemByIdx(idx: number): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(this.toc[idx].text);
        if (idx === this.toc.length - 1) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else if (this.toc[idx + 1].level > this.toc[idx].level) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        }
        treeItem.command = {
            command: 'revealLine',
            title: '',
            arguments: [{ lineNumber: this.toc[idx].line, at: 'top' }]
        };
        return treeItem;
    }
}