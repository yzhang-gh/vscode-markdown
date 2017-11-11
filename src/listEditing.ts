'use strict'

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument } from 'vscode';
import * as vscode from 'vscode';
import * as handler from "./unikeyHandler";

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
    if ((matches = /^(\s*[-+*] +(|\[[ x]\] +))[^\[].*$/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        await editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1].replace('[x]', '[ ]')}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else if ((matches = /^(\s*)([0-9]+)([.)])( +)(|\[[ x]\] +)[^\[].*$/.exec(textBeforeCursor)) !== null) {
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

    if (/^\s*([-+*]|[0-9]+[.)]) +(|\[[ x]\] +)$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.indentLines');
    } else {
        // Normal behavior
        return commands.executeCommand('tab');
    }
}

async function onBackspaceKey() {
    let editor = window.activeTextEditor
    let oldPosition = editor.selection.active; // Old cursor position
    // FIXME: Handle Vietnamese //
    // let isTypingVn = await handler.vnTest();
    let newPosition = editor.selection.active; // Current cursor position
    // if (isTypingVn == false && oldPosition.character == newPosition.character) { // Not typing Vietnamese
    let document = editor.document;
    let textBeforeCursor = document.lineAt(newPosition.line).text.substr(0, newPosition.character);

    if (isInFencedCodeBlock(document, newPosition.line)) {
        // Normal behavior 
        return commands.executeCommand('deleteLeft');
    }

    if (/^\s+([-+*]|[0-9]+[.)]) (|\[[ x]\] )$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.outdentLines');
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- ', '1. '
        return deleteRange(editor, new Range(newPosition.with({ character: 0 }), newPosition));
    } else if (/^([-+*]|[0-9]+[.)]) (\[[ x]\] )$/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- [ ]', '1. [x]'
        return deleteRange(editor, new Range(newPosition.with({ character: textBeforeCursor.length - 4 }), newPosition));
    } else {
        // Normal behavior
        return commands.executeCommand('deleteLeft');
    }
    // } else {
    //     if (oldPosition.character == newPosition.character) {
    //         // Normal behavior
    //         return commands.executeCommand('deleteLeft');
    //     } else {
    //         let characterCount = newPosition.character - oldPosition.character;
    //         if (characterCount < 0) {
    //             return false;
    //         }
    //         return handler.handleUnikey(characterCount).then(result => {
    //             if (result == true) {
    //                 deleteRange(editor, new Range(newPosition.line, oldPosition.character - characterCount,
    //                     newPosition.line, oldPosition.character));
    //                 return true;
    //             } else {
    //                 return false;
    //             }
    //         });
    //     }
    // }
}

async function deleteRange(editor: vscode.TextEditor, range: Range): Promise<boolean> {
    return await editor.edit(editBuilder => {
        editBuilder.delete(range);
    });
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
