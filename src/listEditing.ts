'use strict'

import { commands, window, workspace, ExtensionContext, Range, Selection } from 'vscode';
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('markdown.extension.onEnterKey', onEnterKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { onEnterKey('ctrl'); }));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onTabKey', onTabKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onBackspaceKey', onBackspaceKey));
}

function onEnterKey(modifiers?: string) {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line);
    let textBeforeCursor = line.text.substr(0, cursorPos.character);

    // Empty list item
    if (/^[-\+\*0-9]\.?$/.test(textBeforeCursor.trim())) {
        editor.edit(editBuilder => {
            console.log(line.range.end.character);
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        });
    }

    let lineBreakPos = cursorPos;
    if (modifiers == 'ctrl') {
        lineBreakPos = line.range.end;
    }

    let matches;
    if ((matches = /(\s*[-\+\*] ).+/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1]}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else if ((matches = /(\s*)([0-8])([\.\)] ).+/.exec(textBeforeCursor)) !== null) {
        // Ordered list
        let config = workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker');
        let marker = '1';
        if (config == 'ordered') {
            marker = String(Number(matches[2]) + 1);
        }
        editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1] + marker + matches[3]}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, (matches[1] + marker + matches[3]).length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else {
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

    if (/^\s*[-\+\*] $/.test(textBeforeCursor) || /^\s*[0-8][\.\)] $/.test(textBeforeCursor)) {
        commands.executeCommand('editor.action.indentLines');
    } else {
        commands.executeCommand('tab');
    }
}

function onBackspaceKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let textBeforeCursor = editor.document.lineAt(cursorPos.line).text.substr(0, cursorPos.character);

    if (/^\s+[-\+\*] $/.test(textBeforeCursor) || /^\s+[0-9][\.\)] $/.test(textBeforeCursor)) {
        commands.executeCommand('editor.action.outdentLines');
    } else if (/^[-\+\*] $/.test(textBeforeCursor) || /^[0-9][\.\)] $/.test(textBeforeCursor)) {
        editor.edit(editBuilder => {
            editBuilder.delete(new Range(cursorPos.with({ character: 0 }), cursorPos));
        });
    } else {
        commands.executeCommand('deleteLeft');
    }
}

export function deactivate() { }
