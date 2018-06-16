'use strict'

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextDocument, TextLine } from 'vscode';
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.onEnterKey', onEnterKey),
        commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { onEnterKey('ctrl'); }),
        commands.registerCommand('markdown.extension.onShiftEnterKey', () => { onEnterKey('shift'); }),
        commands.registerCommand('markdown.extension.onTabKey', onTabKey),
        commands.registerCommand('markdown.extension.onShiftTabKey', () => { onTabKey('shift'); }),
        commands.registerCommand('markdown.extension.onBackspaceKey', onBackspaceKey),
        commands.registerCommand('markdown.extension.checkTaskList', checkTaskList),
        commands.registerCommand('markdown.extension.onMoveLineDown', onMoveLineDown),
        commands.registerCommand('markdown.extension.onMoveLineUp', onMoveLineUp),
        commands.registerCommand('markdown.extension.onCopyLineDown', onCopyLineDown),
        commands.registerCommand('markdown.extension.onCopyLineUp', onCopyLineUp),
        commands.registerCommand('markdown.extension.onIndentLines', onIndentLines),
        commands.registerCommand('markdown.extension.onOutdentLines', onOutdentLines)
    );
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
    let cursorPos: Position = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line);
    let textBeforeCursor = line.text.substr(0, cursorPos.character);
    let textAfterCursor = line.text.substr(cursorPos.character);

    let lineBreakPos = cursorPos;
    if (modifiers == 'ctrl') {
        lineBreakPos = line.range.end;
    }

    if (modifiers == 'shift' || isInFencedCodeBlock(editor.document, cursorPos.line)) {
        return asNormal('enter', modifiers);
    }

    // If it's an empty list item, remove it
    if (/^(>|([-+*]|[0-9]+[.)])(| \[[ x]\]))$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length == 0) {
        return editor.edit(editBuilder => {
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        }).then(() => fixMarker(findNextMarkerLineNumber()));
    }

    let matches;
    if (/^> /.test(textBeforeCursor)) {
        // Quote block
        return editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n> `);
        }).then(() => {
            // Fix cursor position
            if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
                let newCursorPos = cursorPos.with(line.lineNumber + 1, 2);
                editor.selection = new Selection(newCursorPos, newCursorPos);
            }
        }).then(() => { editor.revealRange(editor.selection) });
    } else if ((matches = /^(\s*[-+*] +(|\[[ x]\] +))(?!\[[ x]\]).*$/.exec(textBeforeCursor)) !== null) {
        // Unordered list
        return editor.edit(editBuilder => {
            editBuilder.insert(lineBreakPos, `\n${matches[1].replace('[x]', '[ ]')}`);
        }).then(() => {
            // Fix cursor position
            if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
                let newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
                editor.selection = new Selection(newCursorPos, newCursorPos);
            }
        }).then(() => { editor.revealRange(editor.selection) });
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
        return editor.edit(
            editBuilder => {
                editBuilder.insert(lineBreakPos, `\n${toBeAdded}`);
            },
            { undoStopBefore: true, undoStopAfter: false }
        ).then(() => {
            // Fix cursor position
            if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
                let newCursorPos = cursorPos.with(line.lineNumber + 1, toBeAdded.length);
                editor.selection = new Selection(newCursorPos, newCursorPos);
            }
        }).then(() => fixMarker()).then(() => { editor.revealRange(editor.selection) });
    } else {
        return asNormal('enter', modifiers);
    }
}

function onTabKey(modifiers?: string) {
    let editor = window.activeTextEditor;
    let cursorPos = editor.selection.active;
    let lineText = editor.document.lineAt(cursorPos.line).text;

    if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
        return asNormal('tab');
    }

    // Cases where indent/outdent should occur, followed by fixing the ordered list markers:
    // 1.  When there is a range of text selected
    // 2.  When the shift key is held (it should always outdent)
    // 3.  When the cursor is placed anywhere before the text that follows an ordered list marker
    let match;
    if (!editor.selection.isEmpty || modifiers === 'shift' || ( match = /^\s*([-+*]|[0-9]+[.)]) +(|\[[ x]\] +)/.exec(lineText)) != null && cursorPos.character <= match[0].length) {
        let command = 'editor.action.indentLines';
        if (modifiers === 'shift') {
            command = 'editor.action.outdentLines';
        }
        return commands.executeCommand(command).then(() => fixMarker());
    } else {
        return asNormal('tab', modifiers);
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

    if (!editor.selection.isEmpty) {
        return asNormal('backspace').then(() => fixMarker(findNextMarkerLineNumber()));
    } else if (/^\s+([-+*]|[0-9]+[.)]) (|\[[ x]\] )$/.test(textBeforeCursor)) {
        return commands.executeCommand('editor.action.outdentLines').then(() => fixMarker());
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- ', '1. '
        return deleteRange(editor, new Range(cursor.with({ character: 0 }), cursor)).then(() => fixMarker(findNextMarkerLineNumber()));
    } else if (/^([-+*]|[0-9]+[.)]) (\[[ x]\] )$/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor == '- [ ]', '1. [x]'
        return deleteRange(editor, new Range(cursor.with({ character: textBeforeCursor.length - 4 }), cursor)).then(() => fixMarker(findNextMarkerLineNumber()));
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
            } else if (modifiers === 'shift') {
                return commands.executeCommand('editor.action.outdentLines');
            } else {
                return commands.executeCommand('tab');
            }
        case 'backspace':
            return commands.executeCommand('deleteLeft');
    }
}

const orderedListRegex = /^(\s*)([0-9]+)([.)])( +).*/;
const listContinuationRegex = /^(\s*)\S/;

/**
 * Returns the line number of the next ordered list item starting either from
 * the specified line or the beginning of the current selection.
 */
function findNextMarkerLineNumber(line?: number): number {
    let editor = vscode.window.activeTextEditor;
    if (line === undefined) {
        // Use start.line instead of active.line so that we can find the first
        // marker following either the cursor or the entire selected range
        line = editor.selection.start.line;
    }
    while (line < editor.document.lineCount) {
        const lineText = editor.document.lineAt(line).text;
        if (orderedListRegex.exec(lineText) !== null) {
            return line;
        }
        line++
    }
    return undefined;
}

/**
 * Looks for the previous ordered list marker at the same indentation level
 * and returns the marker number that should follow it.
 */
function lookUpwardForMarker(editor: vscode.TextEditor, line: number, numOfSpaces: number): number {
    while (--line >= 0) {
        let matches;
        const lineText = editor.document.lineAt(line).text;
        if ((matches = orderedListRegex.exec(lineText)) !== null) {
            let leadingSpace = matches[1];
            let marker = matches[2];
            if (leadingSpace.length === numOfSpaces) {
                return Number(marker) + 1;
            } else if ((editor.options.insertSpaces && leadingSpace.length + editor.options.tabSize <= numOfSpaces)
                || !editor.options.insertSpaces && leadingSpace.length + 1 <= numOfSpaces) {
                return 1;
            }
        } else if ((matches = listContinuationRegex.exec(lineText)) !== null) {
            if (matches[1].length <= numOfSpaces) {
                break;
            }
        }
    }
    return 1;
}

/**
 * Fix ordered list marker *iteratively* starting from current line
 */
function fixMarker(line?: number) {
    if (!workspace.getConfiguration('markdown.extension.orderedList').get<boolean>('autoRenumber')) return;

    let editor = vscode.window.activeTextEditor;
    if (line === undefined) {
        // Use either the first line containing an ordered list marker within the selection or the active line
        line = findNextMarkerLineNumber();
        if (line === undefined || line > editor.selection.end.line) {
            line = editor.selection.active.line;
        }
    }
    if (line < 0 || editor.document.lineCount <= line) {
        return editor.edit(() => { }, { undoStopBefore: false, undoStopAfter: true });
    }

    let currentLineText = editor.document.lineAt(line).text;
    if (/^(\s*[-+*] +(|\[[ x]\] +))(?!\[[ x]\]).*$/.test(currentLineText) // unordered list
        || workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'one') {
        return editor.edit(() => { }, { undoStopBefore: false, undoStopAfter: true });
    } else {
        let matches;
        if ((matches = /^(\s*)([0-9]+)([.)])( +)(?:|\[[x]\] +)(?!\[[x]\]).*$/.exec(currentLineText)) !== null) {
            let leadingSpace = matches[1];
            let marker = matches[2];
            let delimiter = matches[3];
            let trailingSpace = matches[4];
            let fixedMarker = lookUpwardForMarker(editor, line, leadingSpace.length);
            let textIndent = marker.length + delimiter.length + trailingSpace.length;

            return editor.edit(
                editBuilder => {
                    let fixedMarkerString = String(fixedMarker);
                    if (marker === fixedMarkerString) return;
                    // Add enough trailing spaces so that the text is still aligned at the same indentation level as it was previously, but always keep at least one space
                    fixedMarkerString += delimiter + " ".repeat(Math.max(1, textIndent - (fixedMarkerString + delimiter).length));
                    editBuilder.replace(new Range(line, leadingSpace.length, line, leadingSpace.length + textIndent), fixedMarkerString);
                },
                { undoStopBefore: false, undoStopAfter: false }
            ).then(() => {
                let nextLine = line + 1;
                while (editor.document.lineCount > nextLine) {
                    const nextLineText = editor.document.lineAt(nextLine).text;
                    if (/^\s*$/.test(nextLineText) || nextLineText.startsWith(leadingSpace) && /[ \t]/.test(nextLineText.charAt(leadingSpace.length))) {
                        nextLine++;
                    } else if (/^(\s*)([0-9]+)[.)] +(?:|\[[x]\] +)(?!\[[x]\]).*$/.test(nextLineText)) {
                        return fixMarker(nextLine);
                    } else {
                        return editor.edit(() => { }, { undoStopBefore: false, undoStopAfter: true });
                    }
                }
            });
        } else {
            return editor.edit(() => { }, { undoStopBefore: false, undoStopAfter: true });
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

function onMoveLineUp() {
    return commands.executeCommand('editor.action.moveLinesUpAction')
        .then(() => fixMarker());
}

function onMoveLineDown() {
    return commands.executeCommand('editor.action.moveLinesDownAction')
        .then(() => fixMarker(findNextMarkerLineNumber(vscode.window.activeTextEditor.selection.start.line - 1)));
}

function onCopyLineUp() {
    return commands.executeCommand('editor.action.copyLinesUpAction')
        .then(() => fixMarker());
}

function onCopyLineDown() {
    return commands.executeCommand('editor.action.copyLinesDownAction')
        .then(() => fixMarker());
}

function onIndentLines() {
    return commands.executeCommand('editor.action.indentLines')
        .then(() => fixMarker());
}

function onOutdentLines() {
    return commands.executeCommand('editor.action.outdentLines')
        .then(() => fixMarker());
}

export function deactivate() { }
