'use strict'

import { commands, ExtensionContext, Position, Range, Selection, TextEditor, window, workspace, WorkspaceEdit } from 'vscode';
import { isInFencedCodeBlock, mathEnvCheck } from './util';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.onEnterKey', onEnterKey),
        commands.registerCommand('markdown.extension.onCtrlEnterKey', () => { return onEnterKey('ctrl'); }),
        commands.registerCommand('markdown.extension.onShiftEnterKey', () => { return onEnterKey('shift'); }),
        commands.registerCommand('markdown.extension.onTabKey', onTabKey),
        commands.registerCommand('markdown.extension.onShiftTabKey', () => { return onTabKey('shift'); }),
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

// The commands here are only bound to keys with `when` clause containing `editorTextFocus && !editorReadonly`. (package.json)
// So we don't need to check whether `activeTextEditor` returns `undefined` in most cases.

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

    if (modifiers == 'shift' || isInFencedCodeBlock(editor.document, cursorPos.line) || mathEnvCheck(editor.document, cursorPos)) {
        return asNormal('enter', modifiers);
    }

    //// This is a possibility that the current line is a thematic break `<hr>` (GitHub #785)
    const lineTextNoSpace = line.text.replace(/\s/g, '');
    if (lineTextNoSpace.length > 2
        && (
            lineTextNoSpace.replace(/\-/g, '').length === 0
            || lineTextNoSpace.replace(/\*/g, '').length === 0
        )
    ) {
        return asNormal('enter', modifiers);
    }

    //// If it's an empty list item, remove it
    if (/^(>|([-+*]|[0-9]+[.)])( +\[[ x]\])?)$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length == 0) {
        return editor.edit(editBuilder => {
            editBuilder.delete(line.range);
            editBuilder.insert(line.range.end, '\n');
        }).then(() => {
            editor.revealRange(editor.selection);
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
    } else if ((matches = /^(\s*[-+*] +(\[[ x]\] +)?)/.exec(textBeforeCursor)) !== null) {
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
    } else if ((matches = /^(\s*)([0-9]+)([.)])( +)((\[[ x]\] +)?)/.exec(textBeforeCursor)) !== null) {
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
    let cursorPos = editor.selection.start;
    let lineText = editor.document.lineAt(cursorPos.line).text;

    if (isInFencedCodeBlock(editor.document, cursorPos.line) || mathEnvCheck(editor.document, cursorPos)) {
        return asNormal('tab', modifiers);
    }

    let match = /^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.exec(lineText);
    if (
        match
        && (
            modifiers === 'shift'
            || !editor.selection.isEmpty
            || editor.selection.isEmpty && cursorPos.character <= match[0].length
        )
    ) {
        if (modifiers === 'shift') {
            return outdent(editor).then(() => fixMarker());
        } else {
            return indent(editor).then(() => fixMarker());
        }
    } else {
        return asNormal('tab', modifiers);
    }
}

function onBackspaceKey() {
    let editor = window.activeTextEditor
    let cursor = editor.selection.active;
    let document = editor.document;
    let textBeforeCursor = document.lineAt(cursor.line).text.substr(0, cursor.character);

    if (isInFencedCodeBlock(document, cursor.line) || mathEnvCheck(editor.document, cursor)) {
        return asNormal('backspace');
    }

    if (!editor.selection.isEmpty) {
        return asNormal('backspace').then(() => fixMarker(findNextMarkerLineNumber()));
    } else if (/^\s+([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `  - `, `   1. `
        return outdent(editor).then(() => fixMarker());
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `- `, `1. `
        return editor.edit(editBuilder => {
            editBuilder.replace(new Range(cursor.with({ character: 0 }), cursor), ' '.repeat(textBeforeCursor.length))
        }).then(() => fixMarker(findNextMarkerLineNumber()));
    } else if (/^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] )$/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `- [ ]`, `1. [x]`, `  - [x]`
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
            if (modifiers === 'shift') {
                return commands.executeCommand('editor.action.outdentLines');
            } else if (
                window.activeTextEditor.selection.isEmpty
                && workspace.getConfiguration('emmet').get<boolean>('triggerExpansionOnTab')
            ) {
                return commands.executeCommand('editor.emmet.action.expandAbbreviation');
            } else {
                return commands.executeCommand('tab');
            }
        case 'backspace':
            return commands.executeCommand('deleteLeft');
    }
}

/**
 * If
 *
 * 1. it is not the first line
 * 2. there is a Markdown list item before this line
 *
 * then indent the current line to align with the previous list item.
 */
function indent(editor?: TextEditor) {
    if (!editor) {
        editor = window.activeTextEditor;
    }

    if (workspace.getConfiguration("markdown.extension.list", editor.document.uri).get<string>("indentationSize") === "adaptive") {
        try {
            const selection = editor.selection;
            const indentationSize = tryDetermineIndentationSize(editor, selection.start.line, editor.document.lineAt(selection.start.line).firstNonWhitespaceCharacterIndex);
            let edit = new WorkspaceEdit()
            for (let i = selection.start.line; i <= selection.end.line; i++) {
                if (i === selection.end.line && !selection.isEmpty && selection.end.character === 0) {
                    break;
                }
                if (editor.document.lineAt(i).text.length !== 0) {
                    edit.insert(editor.document.uri, new Position(i, 0), ' '.repeat(indentationSize));
                }
            }
            return workspace.applyEdit(edit);
        } catch (error) { }
    }

    return commands.executeCommand('editor.action.indentLines');
}

/**
 * Similar to `indent`-function
 */
function outdent(editor?: TextEditor) {
    if (!editor) {
        editor = window.activeTextEditor;
    }

    if (workspace.getConfiguration("markdown.extension.list", editor.document.uri).get<string>("indentationSize") === "adaptive") {
        try {
            const selection = editor.selection;
            const indentationSize = tryDetermineIndentationSize(editor, selection.start.line, editor.document.lineAt(selection.start.line).firstNonWhitespaceCharacterIndex);
            let edit = new WorkspaceEdit()
            for (let i = selection.start.line; i <= selection.end.line; i++) {
                if (i === selection.end.line && !selection.isEmpty && selection.end.character === 0) {
                    break;
                }
                const lineText = editor.document.lineAt(i).text;
                let maxOutdentSize: number;
                if (lineText.trim().length === 0) {
                    maxOutdentSize = lineText.length;
                } else {
                    maxOutdentSize = editor.document.lineAt(i).firstNonWhitespaceCharacterIndex;
                }
                if (maxOutdentSize > 0) {
                    edit.delete(editor.document.uri, new Range(i, 0, i, Math.min(indentationSize, maxOutdentSize)));
                }
            }
            return workspace.applyEdit(edit);
        } catch (error) { }
    }

    return commands.executeCommand('editor.action.outdentLines');
}

function tryDetermineIndentationSize(editor: TextEditor, line: number, currentIndentation: number) {
    while (--line >= 0) {
        const lineText = editor.document.lineAt(line).text;
        let matches;
        if ((matches = /^(\s*)(([-+*]|[0-9]+[.)]) +)(\[[ x]\] +)?/.exec(lineText)) !== null) {
            if (matches[1].length <= currentIndentation) {
                return matches[2].length;
            }
        }
    }
    throw "No previous Markdown list item";
}

/**
 * Returns the line number of the next ordered list item starting either from
 * the specified line or the beginning of the current selection.
 */
function findNextMarkerLineNumber(line?: number): number {
    let editor = window.activeTextEditor;
    if (line === undefined) {
        // Use start.line instead of active.line so that we can find the first
        // marker following either the cursor or the entire selected range
        line = editor.selection.start.line;
    }
    while (line < editor.document.lineCount) {
        const lineText = editor.document.lineAt(line).text;

        if (lineText.startsWith('#')) {
            // Don't go searching past any headings
            return -1;
        }

        if (/^\s*[0-9]+[.)] +/.exec(lineText) !== null) {
            return line;
        }
        line++;
    }
    return undefined;
}

/**
 * Looks for the previous ordered list marker at the same indentation level
 * and returns the marker number that should follow it.
 *
 * @returns the fixed marker number
 */
function lookUpwardForMarker(editor: TextEditor, line: number, currentIndentation: number): number {
    while (--line >= 0) {
        const lineText = editor.document.lineAt(line).text;
        let matches;
        if ((matches = /^(\s*)(([0-9]+)[.)] +)/.exec(lineText)) !== null) {
            let leadingSpace: string = matches[1];
            let marker = matches[3];
            if (leadingSpace.length === currentIndentation) {
                return Number(marker) + 1;
            } else if (
                (!leadingSpace.includes('\t') && leadingSpace.length + matches[2].length <= currentIndentation)
                || leadingSpace.includes('\t') && leadingSpace.length + 1 <= currentIndentation
            ) {
                return 1;
            }
        } else if ((matches = /^(\s*)\S/.exec(lineText)) !== null) {
            if (matches[1].length <= currentIndentation) {
                break;
            }
        }
    }
    return 1;
}

/**
 * Fix ordered list marker *iteratively* starting from current line
 */
export function fixMarker(line?: number) {
    if (!workspace.getConfiguration('markdown.extension.orderedList').get<boolean>('autoRenumber')) return;
    if (workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'one') return;

    let editor = window.activeTextEditor;
    if (line === undefined) {
        // Use either the first line containing an ordered list marker within the selection or the active line
        line = findNextMarkerLineNumber();
        if (line === undefined || line > editor.selection.end.line) {
            line = editor.selection.active.line;
        }
    }
    if (line < 0 || editor.document.lineCount <= line) {
        return;
    }

    let currentLineText = editor.document.lineAt(line).text;
    let matches;
    if ((matches = /^(\s*)([0-9]+)([.)])( +)/.exec(currentLineText)) !== null) { // ordered list
        let leadingSpace = matches[1];
        let marker = matches[2];
        let delimiter = matches[3];
        let trailingSpace = matches[4];
        let fixedMarker = lookUpwardForMarker(editor, line, leadingSpace.length);
        let listIndent = marker.length + delimiter.length + trailingSpace.length;
        let fixedMarkerString = String(fixedMarker);

        return editor.edit(
            editBuilder => {
                if (marker === fixedMarkerString) {
                    return;
                }
                // Add enough trailing spaces so that the text is still aligned at the same indentation level as it was previously, but always keep at least one space
                fixedMarkerString += delimiter + " ".repeat(Math.max(1, listIndent - (fixedMarkerString + delimiter).length));

                editBuilder.replace(new Range(line, leadingSpace.length, line, leadingSpace.length + listIndent), fixedMarkerString);
            },
            { undoStopBefore: false, undoStopAfter: false }
        ).then(() => {
            let nextLine = line + 1;
            let indentString = " ".repeat(listIndent);
            while (editor.document.lineCount > nextLine) {
                const nextLineText = editor.document.lineAt(nextLine).text;
                if (/^\s*[0-9]+[.)] +/.test(nextLineText)) {
                    return fixMarker(nextLine);
                } else if (/^\s*$/.test(nextLineText)) {
                    nextLine++;
                } else if (listIndent <= 4 && !nextLineText.startsWith(indentString)) {
                    return;
                } else {
                    nextLine++;
                }
            }
        });
    }
}

function deleteRange(editor: TextEditor, range: Range): Thenable<boolean> {
    return editor.edit(
        editBuilder => {
            editBuilder.delete(range);
        },
        // We will enable undoStop after fixing markers
        { undoStopBefore: true, undoStopAfter: false }
    );
}

function checkTaskList() {
    // - Look into selections for lines that could be checked/unchecked.
    // - The first matching line dictates the new state for all further lines.
    //   - I.e. if the first line is unchecked, only other unchecked lines will
    //     be considered, and vice versa.
    let editor = window.activeTextEditor;
    const uncheckedRegex = /^(\s*([-+*]|[0-9]+[.)]) +\[) \]/
    const checkedRegex = /^(\s*([-+*]|[0-9]+[.)]) +\[)x\]/
    let toBeToggled: Position[] = [] // all spots that have an "[x]" resp. "[ ]" which should be toggled
    let newState: boolean | undefined = undefined // true = "x", false = " ", undefined = no matching lines

    // go through all touched lines of all selections.
    for (const selection of editor.selections) {
        for (let i = selection.start.line; i <= selection.end.line; i++) {
            const line = editor.document.lineAt(i);
            const lineStart = line.range.start;

            if (!selection.isSingleLine && (selection.start.isEqual(line.range.end) || selection.end.isEqual(line.range.start))) {
                continue;
            }

            let matches: RegExpExecArray;
            if (
                (matches = uncheckedRegex.exec(line.text))
                && newState !== false
            ) {
                toBeToggled.push(lineStart.with({ character: matches[1].length }));
                newState = true;
            } else if (
                (matches = checkedRegex.exec(line.text))
                && newState !== true
            ) {
                toBeToggled.push(lineStart.with({ character: matches[1].length }));
                newState = false;
            }
        }
    }

    if (newState !== undefined) {
        const newChar = newState ? 'x' : ' ';
        return editor.edit(editBuilder => {
            for (const pos of toBeToggled) {
                let range = new Range(pos, pos.with({ character: pos.character + 1 }));
                editBuilder.replace(range, newChar);
            }
        });
    }
}

function onMoveLineUp() {
    return commands.executeCommand('editor.action.moveLinesUpAction')
        .then(() => fixMarker());
}

function onMoveLineDown() {
    return commands.executeCommand('editor.action.moveLinesDownAction')
        .then(() => fixMarker(findNextMarkerLineNumber(window.activeTextEditor.selection.start.line - 1)));
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
    return indent().then(() => fixMarker());
}

function onOutdentLines() {
    return outdent().then(() => fixMarker());
}

export function deactivate() { }
