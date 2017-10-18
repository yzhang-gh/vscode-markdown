'use strict'

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument } from 'vscode';
import * as vscode from 'vscode';

let actionLock = false;

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('markdown.extension.onEnterKey', onEnterKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { onEnterKey('ctrl'); }));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onTabKey', onTabKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onBackspaceKey', onBackspaceKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.checkTaskList', checkTaskList));
}

function isInFencedCodeBlock(doc: TextDocument, lineNum: number): boolean {
    let textBefore = doc.getText(new Range(new Position(0, 0), new Position(lineNum, 0)));
    let matches = textBefore.match(/```.*\r?\n/g);
    if (matches == null) {
        return false;
    } else {
        return matches.length % 2 != 0;
    }
}

async function getLengthChange(doc: TextDocument, lineNum: number) {
    let beforeLen = doc.lineAt(lineNum).text.length;
    await commands.executeCommand('cursorMove', {to: 'left', value: 1});
    await commands.executeCommand('cursorMove', {to: 'right', value: 1});
    return (doc.lineAt(lineNum).text.length - beforeLen);
}

async function handleUnikey(editor: vscode.TextEditor, range: Range) {
    return await editor.edit(editBuilder => {
        editBuilder.delete(range);
    });
}

async function onEnterKey(modifiers?: string) {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line);
    let textBeforeCursor = line.text.substr(0, cursorPos.character);
    let textAfterCursor = line.text.substr(cursorPos.character);

    let lineBreakPos = cursorPos;
    if (modifiers == 'ctrl') {
        lineBreakPos = line.range.end;
    }

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        // Normal behavior
        if (modifiers == 'ctrl') {
            return commands.executeCommand('editor.action.insertLineAfter');
        } else {
            return commands.executeCommand('type', { source: 'keyboard', text: '\n' });
        }
    }

    // If it's an empty list item, remove it
    if (/^([-+*]|[0-9]+[.)])(| \[[ x]\])$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length == 0) {
        return editor.edit(editBuilder => {
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        });
    }

    let matches;
    if ((matches = /^(\s*[-+*] +(|\[[ x]\] +))[^\[\]]+$/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        await editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1].replace('[x]', '[ ]')}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else if ((matches = /^(\s*)([0-9]+)([.)])( +)(|\[[ x]\] +)[^\[\]]+$/.exec(textBeforeCursor)) !== null) {
        // Ordered list
        let config = workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker');
        let marker = '1';
        let leadingSpace = matches[1];
        let previousMarker = matches[2];
        let delimiter = matches[3];
        let trailingSpace = matches[4];
        let gfmCheckbox = matches[5].replace('[x]', '[ ]');
        let textIndent = (previousMarker + delimiter + trailingSpace).length;
        if (config == 'ordered') {
            marker = String(Number(previousMarker) + 1);
        }
        // Add enough trailing spaces so that the text is aligned with the previous list item, but always keep at least one space
        trailingSpace = " ".repeat(Math.max(1, textIndent - (marker + delimiter).length));

        await editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${leadingSpace + marker + delimiter + trailingSpace + gfmCheckbox}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, (leadingSpace + marker + trailingSpace + gfmCheckbox).length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else {
        // Normal behavior
        if (modifiers == 'ctrl') {
            return commands.executeCommand('editor.action.insertLineAfter');
        } else {
            return commands.executeCommand('type', { source: 'keyboard', text: '\n' });
        }
    }
}

async function onTabKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let textBeforeCursor = editor.document.lineAt(cursorPos.line).text.substr(0, cursorPos.character);
    
    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        // Normal behavior
        return commands.executeCommand('tab');
    }

    if (/^\s*([-+*]|[0-9]+[.)]) +$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.indentLines');
    } else {
        // Normal behavior
        return commands.executeCommand('tab');
    }
}

async function onBackspaceKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let editDocument = editor.document;
    let textBeforeCursor = editDocument.lineAt(cursorPos.line).text.substr(0, cursorPos.character);
 
    if (isInFencedCodeBlock(editDocument, cursorPos.line)) {
        // Normal behavior
        return commands.executeCommand('deleteLeft');
    }

    if (/^\s+([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.outdentLines');
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        await editor.edit(editBuilder => {
            editBuilder.delete(new Range(cursorPos.with({ character: 0 }), cursorPos));
        });
    } else {
        if(actionLock) {
            return;
        } else {
            actionLock = true;
            if(textBeforeCursor.endsWith(" ")){
                actionLock = false;
                return commands.executeCommand('deleteLeft');
            } else {
                await getLengthChange(editDocument, cursorPos.line).then(len => {
                    let startIndex = len > 0? cursorPos.character - len : -1;
                    if(startIndex == -1) {
                        commands.executeCommand('deleteLeft').then(result => {
                            actionLock = false;
                            return;
                        });
                    } else {
                        let range = new Range(cursorPos.with({ character: startIndex }), cursorPos);//range to delete
                        handleUnikey(editor, range).then(success => {
                            actionLock = false;
                            return;
                        });
                    }
                });
            }
            return;
        }
    }    
}

function checkTaskList() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line).text;

    let matches;
    if (matches = /^(\s*([-+*]|[0-9]+[.)]) \[) \]/.exec(line)) {
        return editor.edit(editBuilder => {
            editBuilder.replace(new Range(cursorPos.with({ character: matches[1].length }), cursorPos.with({ character: matches[1].length + 1 })), 'x');
        });
    } else if (matches = /^(\s*([-+*]|[0-9]+[.)]) \[)x\]/.exec(line)) {
        return editor.edit(editBuilder => {
            editBuilder.replace(new Range(cursorPos.with({ character: matches[1].length }), cursorPos.with({ character: matches[1].length + 1 })), ' ');
        });
    }
}

export function deactivate() { }