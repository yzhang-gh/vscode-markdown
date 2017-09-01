'use strict';

/**
 * Modified from <https://github.com/AlanWalk/Markdown-TOC>
 */

import { commands, extensions, languages, window, workspace, CancellationToken, CodeLens, CodeLensProvider, ExtensionContext, Position, Range, TextDocument, TextDocumentWillSaveEvent } from 'vscode';
import { log } from './util';
import * as path from 'path';

const officialExt = extensions.getExtension("Microsoft.vscode-markdown");
const TocProvider = require(path.join(officialExt.extensionPath, 'out', 'tableOfContentsProvider')).TableOfContentsProvider;
const MdEngine = require(path.join(officialExt.extensionPath, 'out', 'markdownEngine')).MarkdownEngine;

const engine = new MdEngine();

const prefix = 'markdown.extension.toc.';

/**
 * Workspace config
 */
let wsConfig = { tab: '    ', eol: '\r\n' };
let tocConfig = { startDepth: 1, endDepth: 6, orderedList: false, updateOnSave: false, plaintext: false };

export function activate(context: ExtensionContext) {
    const cmds: Command[] = [
        { command: 'create', callback: createToc },
        { command: 'update', callback: updateToc }
        // , { command: 'delete', callback: deleteToc }
    ].map(cmd => {
        cmd.command = prefix + cmd.command;
        return cmd;
    });

    cmds.forEach(cmd => {
        context.subscriptions.push(commands.registerCommand(cmd.command, cmd.callback));
    });

    context.subscriptions.push(workspace.onWillSaveTextDocument(onWillSave));
    context.subscriptions.push(languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' }, new TocCodeLensProvider()));

    // Load workspace config
    wsConfig.eol = <string>workspace.getConfiguration("files").get("eol");
    let tabSize = <number>workspace.getConfiguration("editor").get("tabSize");
    let insertSpaces = <boolean>workspace.getConfiguration("editor").get("insertSpaces");

    wsConfig.tab = '\t';
    if (insertSpaces && tabSize > 0) {
        wsConfig.tab = " ".repeat(tabSize);
    }
}

async function createToc() {
    let editor = window.activeTextEditor;
    let toc = await generateTocText(editor.document);
    await editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, toc);
    });
}

async function updateToc() {
    let editor = window.activeTextEditor;
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
                let delPosition = new Position(tocRange.start.line + firstChangedLine, tocRange.start.character);
                rangeToBeDel = new Range(delPosition, tocRange.end);
                location = rangeToBeDel.start;
            }

            await window.activeTextEditor.edit(editBuilder => {
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

async function generateTocText(document: TextDocument): Promise<string> {
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
                tocConfig.orderedList ? ++order[indentation] + '. ' : '- ',
                tocConfig.plaintext ? entry.text : `[${entry.text}](#${TocProvider.slugify(entry.text)})`
            ];
            toc.push(row.join(''));
            if (tocConfig.orderedList) order.fill(0, indentation + 1);
        }
    });
    return toc.join(wsConfig.eol);
}

async function detectTocRange(document: TextDocument): Promise<Range> {
    loadTocConfig();

    const tocProvider = new TocProvider(engine, document);

    let doc = window.activeTextEditor.document;
    let start, end: Position;
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
                let regResult = lineText.match(/^[\-1]\.? (.+)$/); // Match list block and get list item
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
                        start = new Position(index, 0);
                    }
                }
            } else { // Start line already found
                lineText = lineText.trim();
                if (lineText.match(/^[\-\d]\.? /) == null) { // End of a list block
                    end = new Position(index - 1, doc.lineAt(index - 1).text.length);
                    // log('End', end);
                    break;
                } else if (index == doc.lineCount - 1) { // End of file
                    end = new Position(index, doc.lineAt(index).text.length);
                    // log('End', end);
                }
            }
        }
        if ((start != null) && (end != null)) {
            return new Range(start, end);
        }
        // log('No TOC detected.');
        return null;
    }
}

function onWillSave(e: TextDocumentWillSaveEvent) {
    if (!tocConfig.updateOnSave) return;
    if (e.document.languageId == 'markdown') {
        updateToc();
    }
}

function loadTocConfig() {
    let tocSectionCfg = workspace.getConfiguration('markdown.extension.toc');
    let tocLevels = tocSectionCfg.get<string>('levels');
    let matches;
    if (matches = tocLevels.match(/^([1-6])\.\.([1-6])$/)) {
        tocConfig.startDepth = matches[1];
        tocConfig.endDepth = matches[2];
    }
    tocConfig.orderedList = tocSectionCfg.get<boolean>('orderedList');
    tocConfig.plaintext = tocSectionCfg.get<boolean>('plaintext');
    tocConfig.updateOnSave = tocSectionCfg.get<boolean>('updateOnSave');
}

function getText(range: Range): string {
    return window.activeTextEditor.document.getText(range);
}

class TocCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, token: CancellationToken):
        CodeLens[] | Thenable<CodeLens[]> {
        let lenses: CodeLens[] = [];
        return detectTocRange(document).then(tocRange => {
            if (tocRange == null) return lenses; // No TOC
            return generateTocText(document).then(text => {
                let status = getText(tocRange).replace(/\r?\n|\r/g, wsConfig.eol) === text ? 'up to date' : 'out of date';
                lenses.push(new CodeLens(tocRange, {
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
