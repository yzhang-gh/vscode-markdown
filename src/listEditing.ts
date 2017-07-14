'use strict'

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument } from 'vscode';
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('markdown.extension.onEnterKey', onEnterKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { onEnterKey('ctrl'); }));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onTabKey', onTabKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onBackspaceKey', onBackspaceKey));
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

function onEnterKey(modifiers?: string) {
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
            commands.executeCommand('editor.action.insertLineAfter');
        } else {
            editor.edit(editBuilder => {
                editBuilder.insert(lineBreakPos, '\n');
            });
        }
        return;
    }

    // If it's an empty list item, remove it
    if (/^([-+*]|[0-9]+[.)])$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length == 0) {
        editor.edit(editBuilder => {
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        });
        return;
    }

    let matches;
    if ((matches = /^(\s*[-+*] +).+$/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1]}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else if ((matches = /^(\s*)([0-9]+)([.)])( +).+$/.exec(textBeforeCursor)) !== null) {
        // Ordered list
        let config = workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker');
        let marker = '1';
        let leadingSpace = matches[1];
        let previousMarker = matches[2];
        let delimiter = matches[3];
        let trailingSpace = matches[4];
        let textIndent = (previousMarker + delimiter + trailingSpace).length;
        if (config == 'ordered') {
            marker = String(Number(previousMarker) + 1);
        }
        // Add enough trailing spaces so that the text is aligned with the previous list item, but always keep at least one space
        trailingSpace = " ".repeat(Math.max(1, textIndent - (marker + delimiter).length));

        editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${leadingSpace + marker + delimiter + trailingSpace}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, (leadingSpace + marker + trailingSpace).length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else {
        // Normal behavior
        if (modifiers == 'ctrl') {
            commands.executeCommand('editor.action.insertLineAfter');
        } else {
            editor.edit(editBuilder => {
                editBuilder.insert(lineBreakPos, '\n');
            });
        }
    }
}

function onTabKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let textBeforeCursor = editor.document.lineAt(cursorPos.line).text.substr(0, cursorPos.character);

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        // Normal behavior
        commands.executeCommand('tab');
        return;
    }

    if (/^\s*([-+*]|[0-9]+[.)]) +$/.test(textBeforeCursor)) {
        commands.executeCommand('editor.action.indentLines');
    } else {
        // Normal behavior
        commands.executeCommand('tab');
    }
}

function onBackspaceKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let textBeforeCursor = editor.document.lineAt(cursorPos.line).text.substr(0, cursorPos.character);

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        // Normal behavior
        commands.executeCommand('deleteLeft');
        return;
    }

    if (/^\s+([-+*]|[0-9]+[.)]) +$/.test(textBeforeCursor)) {
        commands.executeCommand('editor.action.outdentLines');
    } else if (/^([-+*]|[0-9]+[.)]) +$/.test(textBeforeCursor)) {
        editor.edit(editBuilder => {
            editBuilder.delete(new Range(cursorPos.with({ character: 0 }), cursorPos));
        });
    } else {
        // Normal behavior
        commands.executeCommand('deleteLeft');
    }
}

export function deactivate() { }
