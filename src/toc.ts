'use strict';

/**
 * Modified from <https://github.com/AlanWalk/Markdown-TOC>
 */

import { commands, languages, window, workspace, CancellationToken, CodeLens, CodeLensProvider, ExtensionContext, Position, Range, TextDocument } from 'vscode';
import { log } from './util';

const prefix = 'markdown.extension.toc.';

const REGEXP_HEADING = /^\#{1,6}/;
const REGEXP_CODE_BLOCK = /^```/;

/**
 * Workspace config
 */
let wsConfig = { tab: '    ', eol: '\r\n' };
let tocConfig = { depth: 6, orderedList: false, updateOnSave: false };

let alreadyUpdated = false; // Prevent updating TOC again after manually calling `doc.save()`

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

    context.subscriptions.push(workspace.onDidSaveTextDocument(onSave));
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

function createToc() {
    let editor = window.activeTextEditor;
    editor.edit(function (editBuilder) {
        editBuilder.delete(editor.selection);
        editBuilder.insert(editor.selection.active, generateTocText());
    });
}

function updateToc() {
    let tocRange = detectTocRange();
    if (tocRange != null) {
        let oldToc = getText(tocRange);
        let newToc = generateTocText();
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

            window.activeTextEditor.edit(editBuilder => {
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

function generateTocText(): string {
    loadTocConfig();

    let toc = [];
    let headingList = getHeadingList();
    let startDepth = 6; // In case that there is no heading in level 1.
    headingList.forEach(heading => {
        if (heading.level < startDepth) startDepth = heading.level;
    });
    let order = new Array(tocConfig.depth - startDepth + 1).fill(0); // Used for ordered list

    headingList.forEach(heading => {
        if (heading.level <= tocConfig.depth) {
            let indentation = heading.level - startDepth;
            let row = [
                wsConfig.tab.repeat(indentation),
                tocConfig.orderedList ? ++order[indentation] + '. ' : '- ',
                `[${heading.title}](#${slugify(heading.title)})`
            ];
            toc.push(row.join(''));
            if (tocConfig.orderedList) order.fill(0, indentation + 1);
        }
    });
    return toc.join(wsConfig.eol);
}

function detectTocRange(): Range {
    log('Detecting TOC ...');

    let doc = window.activeTextEditor.document;
    let start, end: Position;
    let headings = getHeadingList();

    if (headings.length == 0) return null;
    if (headings[0].title.length == 0) return null;

    for (let index = 0; index < doc.lineCount; index++) {
        let lineText = doc.lineAt(index).text;
        if (start == null) { // No line matched with start yet
            let regResult = lineText.match(/^[\-1]\.? \[?([^\]]+)/); // Match list block and get list item
            if (regResult != null) {
                let listItem = regResult[1];
                if (listItem.startsWith(headings[0].title)) {
                    start = new Position(index, 0);
                    log('Start', start);
                }
            }
        } else { // Start line already found
            lineText = lineText.trim();
            if (lineText.match(/^[\-\d]\.? /) == null) { // End of a list block
                end = new Position(index - 1, doc.lineAt(index - 1).text.length);
                log('End', end);
                break;
            } else if (index == doc.lineCount - 1) { // End of file
                end = new Position(index, doc.lineAt(index).text.length);
                log('End', end);
            }
        }
    }
    if ((start != null) && (end != null)) {
        return new Range(start, end);
    }
    log('No TOC detected.')
    return null;
}

function getHeadingList(): Heading[] {
    let doc = window.activeTextEditor.document;

    let headingList: Heading[] = [];
    let isInCode = false;
    for (let i = 0; i < doc.lineCount; i++) {
        let lineText = doc.lineAt(i).text;

        let codeResult = lineText.match(REGEXP_CODE_BLOCK); // Code block
        if (codeResult != null) isInCode = !isInCode;
        if (isInCode) continue;

        let headingResult = lineText.match(REGEXP_HEADING); // Heading pattern
        if (headingResult == null) continue;

        let level = headingResult[0].length; // Get heading level
        if (level > tocConfig.depth) continue;

        let title = lineText.substr(level).trim().replace(/\#*$/, "").trim(); // Get heading title

        headingList.push({
            level: level,
            title: title
        });
    }
    return headingList;
}

function onSave(doc: TextDocument) {
    if (!tocConfig.updateOnSave) return;
    if (alreadyUpdated) {
        alreadyUpdated = false;
        return;
    } else if (doc.languageId == 'markdown') {
        updateToc();
        alreadyUpdated = true;
        doc.save();
    }
}

function loadTocConfig() {
    tocConfig.depth = <number>workspace.getConfiguration('markdown.extension.toc').get('depth');
    tocConfig.orderedList = <boolean>workspace.getConfiguration('markdown.extension.toc').get('orderedList');
    tocConfig.updateOnSave = <boolean>workspace.getConfiguration('markdown.extension.toc').get('updateOnSave');
}

function getText(range: Range): string {
    return window.activeTextEditor.document.getText(range);
}

function slugify(text: string): string {
    return text.toLocaleLowerCase().replace(/[\s\W\-]+/g, '-').replace(/^\-/, '').replace(/\-$/, '');
}

class TocCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, token: CancellationToken):
        CodeLens[] | Thenable<CodeLens[]> {
        let lenses: CodeLens[] = [];
        let tocRange = detectTocRange();
        if (tocRange == null) return lenses; // No TOC
        let status = getText(tocRange) == generateTocText() ? 'up to date' : 'out of date';
        lenses.push(new CodeLens(tocRange, {
            arguments: [],
            title: `Table of Contents (${status})`,
            command: ''
        }));
        return Promise.resolve(lenses);
    }

    // public resolveCodeLens?(codeLens: CodeLens, token: CancellationToken):
    //     CodeLens | Thenable<CodeLens> {

    // }
}
