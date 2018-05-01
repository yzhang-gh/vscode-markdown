'use strict'

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument, TextLine } from 'vscode';
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('markdown.extension.onEnterKey', onEnterKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { onEnterKey('ctrl'); }));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onTabKey', onTabKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onBackspaceKey', onBackspaceKey));
    context.subscriptions.push(commands.registerCommand('markdown.extension.checkTaskList', checkTaskList));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onMoveLineDown', onMoveLineDown));
    context.subscriptions.push(commands.registerCommand('markdown.extension.onMoveLineUp', onMoveLineUp));
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
    let cursorPos: Position = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line);
    let textBeforeCursor = line.text.substr(0, cursorPos.character);
    let textAfterCursor = line.text.substr(cursorPos.character);

    let lineBreakPos = cursorPos;
    if (modifiers == 'ctrl') {
        lineBreakPos = line.range.end;
    }

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        return asNormal('enter', modifiers);
    }

    // If it's an empty list item, remove it
    if (/^([-+*]|[0-9]+[.)])(| \[[ x]\])$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length == 0) {
        return editor.edit(editBuilder => {
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        });
    }

    let matches;
    if ((matches = /^(\s*[-+*] +(|\[[ x]\] +))(?!\[[ x]\]).*$/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        await editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1].replace('[x]', '[ ]')}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else if ((matches = /^(\s*)([0-9]+)([.)])( +)(|\[[ x]\] +)(?!\[[ x]\]).*$/.exec(textBeforeCursor)) !== null) {
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

        const toBeAdded = leadingSpace + marker + delimiter + trailingSpace + gfmCheckbox;
        await editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${toBeAdded}`);
        });
        // Fix cursor position
        if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
            let newCursorPos = cursorPos.with(line.lineNumber + 1, toBeAdded.length);
            editor.selection = new Selection(newCursorPos, newCursorPos);
        }
    } else {
        return asNormal('enter', modifiers);
    }
    editor.revealRange(editor.selection);
}

function onTabKey() {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let textBeforeCursor = editor.document.lineAt(cursorPos.line).text.substr(0, cursorPos.character);

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        return asNormal('tab');
    }

    if (/^\s*([-+*]|[0-9]+[.)]) +(|\[[ x]\] +)$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.indentLines').then(() => fixMarker(editor, cursorPos.line));
    } else {
        return asNormal('tab');
    }
}

function onBackspaceKey() {
    let editor = window.activeTextEditor
    let cursor = editor.selection.active;
    let document = editor.document;
    let textBeforeCursor = document.lineAt(cursor.line).text.substr(0, cursor.character);

    if (isInFencedCodeBlock(document, cursor.line)) {
        return asNormal('backspace');
    }

    if (/^\s+([-+*]|[0-9]+[.)]) (|\[[ x]\] )$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.outdentLines').then(() => fixMarker(editor, cursor.line));
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- ', '1. '
        return deleteRange(editor, new Range(cursor.with({ character: 0 }), cursor));
    } else if (/^([-+*]|[0-9]+[.)]) (\[[ x]\] )$/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- [ ]', '1. [x]'
        return deleteRange(editor, new Range(cursor.with({ character: textBeforeCursor.length - 4 }), cursor));
    } else {
        return asNormal('backspace');
    }
}

function asNormal(key: string, modifiers?: string) {
    switch (key) {
        case 'enter':
            if (modifiers === 'ctrl') {
                return commands.executeCommand('editor.action.insertLineAfter');
            } else {
                return commands.executeCommand('type', { source: 'keyboard', text: '\n' });
            }
        case 'tab':
            if (workspace.getConfiguration('emmet').get<boolean>('triggerExpansionOnTab')) {
                return commands.executeCommand('editor.emmet.action.expandAbbreviation');
            } else {
                return commands.executeCommand('tab');
            }
        case 'backspace':
            return commands.executeCommand('deleteLeft');
    }
}

function lookUpwardForMarker(document: TextDocument, line: number, leadingSpace: string): number {
    let orderedListRegex = /^(\s*)([0-9]+)[.)] +(?:|\[[x]\] +)(?!\[[x]\]).*$/;
    let matches;
    while (--line >= 0 && (matches = orderedListRegex.exec(document.lineAt(line).text)) !== null) {
        if (matches[1] === leadingSpace) {
            return Number(matches[2]) + 1;
        }
    }
    return 1;
}

/**
 * Fix ordered list marker at current line (after indenting or outdenting)
 */
function fixMarker(editor: vscode.TextEditor, line: number) {
    let currentLineText = editor.document.lineAt(line).text;
    if (/^(\s*[-+*] +(|\[[ x]\] +))(?!\[[ x]\]).*$/.test(currentLineText) // unordered list
        || workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'one') {
        return;
    } else {
        let matches;
        if ((matches = /^(\s*)([0-9]+)[.)] +(?:|\[[x]\] +)(?!\[[x]\]).*$/.exec(currentLineText)) !== null) {
            let leadingSpace = matches[1];
            let marker = matches[2];
            let fixedMarker = lookUpwardForMarker(editor.document, line, leadingSpace);

            return editor.edit(editBuilder => {
                editBuilder.replace(new Range(line, leadingSpace.length, line, leadingSpace.length + marker.length), String(fixedMarker));
            });
        }
    }
}

function deleteRange(editor: vscode.TextEditor, range: Range): Thenable<boolean> {
    return editor.edit(editBuilder => {
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

async function sortOrderedList(direction) {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let activeLine = cursorPos.line;
    let swapLine = direction === 'up' ? activeLine + 1 : activeLine - 1;
    let topLine = Math.max(activeLine, swapLine);
    let bottomLine = Math.min(activeLine, swapLine);
    let topLineText = editor.document.lineAt(topLine).text;
    let bottomLineText = editor.document.lineAt(bottomLine).text;
    let orderedListRegex = /^(\s*)([0-9]+)[.)] +(?:|\[[x]\] +)(?!\[[x]\]).*$/;
    let topLineMatches, bottomLineMatches;

    // both lines in the swap must be ordered list
    if ((topLineMatches = orderedListRegex.exec(topLineText)) !== null
        && (bottomLineMatches = orderedListRegex.exec(bottomLineText)) !== null
        && editor.selection.isSingleLine
        && workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'ordered') {
        const topLineMarker = Number(topLineMatches[2]);
        const bottomLineMarker = Number(bottomLineMatches[2]);

        // only swap if out of order and same indentation level
        if (topLineMarker < bottomLineMarker && topLineMatches[1] === bottomLineMatches[1]) {
            return editor.edit(editBuilder => {
                editBuilder.replace(
                    editor.document.lineAt(topLine).range,
                    topLineText.replace(/^(\s*)([0-9]+)/, `$1${bottomLineMarker}`)
                );
                editBuilder.replace(
                    editor.document.lineAt(bottomLine).range,
                    bottomLineText.replace(/^(\s*)([0-9]+)/, `$1${topLineMarker}`)
                );
            });
        }
    }
}

async function onMoveLineUp() {
    return commands.executeCommand('editor.action.moveLinesUpAction')
        .then(() => sortOrderedList('up'));
}

async function onMoveLineDown() {
    return commands.executeCommand('editor.action.moveLinesDownAction')
        .then(() => sortOrderedList('down'));
}

export function deactivate() { }
