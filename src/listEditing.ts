import { commands, ExtensionContext, Position, Range, Selection, TextEditor, window, workspace, WorkspaceEdit } from 'vscode';
import { isInFencedCodeBlock, mathEnvCheck } from "./util/contextCheck";

type IModifier = "ctrl" | "shift";

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

function onEnterKey(modifiers?: IModifier) {
    const editor = window.activeTextEditor!;
    let cursorPos: Position = editor.selection.active;
    let line = editor.document.lineAt(cursorPos.line);
    let textBeforeCursor = line.text.substring(0, cursorPos.character);
    let textAfterCursor = line.text.substring(cursorPos.character);

    let lineBreakPos = cursorPos;
    if (modifiers == 'ctrl') {
        lineBreakPos = line.range.end;
    }

    if (modifiers == 'shift') {
        return asNormal(editor, 'enter', modifiers);
    }

    //// This is a possibility that the current line is a thematic break `<hr>` (GitHub #785)
    const lineTextNoSpace = line.text.replace(/\s/g, '');
    if (lineTextNoSpace.length > 2
        && (
            lineTextNoSpace.replace(/\-/g, '').length === 0
            || lineTextNoSpace.replace(/\*/g, '').length === 0
        )
    ) {
        return asNormal(editor, 'enter', modifiers);
    }

    //// If it's an empty list item, remove it
    if (
        /^([-+*]|[0-9]+[.)])( +\[[ x]\])?$/.test(textBeforeCursor.trim())  // It is a (task) list item
        && textAfterCursor.trim().length == 0                              // It is empty
    ) {
        if (/^\s+([-+*]|[0-9]+[.)]) +(\[[ x]\] )?$/.test(textBeforeCursor)) {
            // It is not a top-level list item, outdent it
            return outdent(editor).then(() => fixMarker(editor));
        } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
            // It is a general list item, delete the list marker
            return deleteRange(editor, new Range(cursorPos.with({ character: 0 }), cursorPos)).then(() => fixMarker(editor));
        } else if (/^([-+*]|[0-9]+[.)]) +(\[[ x]\] )$/.test(textBeforeCursor)) {
            // It is a task list item, delete the checkbox
            return deleteRange(editor, new Range(cursorPos.with({ character: textBeforeCursor.length - 4 }), cursorPos)).then(() => fixMarker(editor));
        } else {
            return asNormal(editor, 'enter', modifiers);
        }
    }

    let matches: RegExpExecArray | null;
    if (/^> /.test(textBeforeCursor)) {
        // Block quotes

        // Case 1: ending a blockquote if:
        const isEmptyArrowLine = line.text.replace(/[ \t]+$/, '') === '>';
        if (isEmptyArrowLine) {
            if (cursorPos.line === 0) {
                // it is an empty '>' line and also the first line of the document
                return editor.edit(editorBuilder => {
                    editorBuilder.replace(new Range(new Position(0, 0), new Position(cursorPos.line, cursorPos.character)), '');
                }).then(() => { editor.revealRange(editor.selection) });
            } else {
                // there have been 2 consecutive empty `>` lines
                const prevLineText = editor.document.lineAt(cursorPos.line - 1).text;
                if (prevLineText.replace(/[ \t]+$/, '') === '>') {
                    return editor.edit(editorBuilder => {
                        editorBuilder.replace(new Range(new Position(cursorPos.line - 1, 0), new Position(cursorPos.line, cursorPos.character)), '\n');
                    }).then(() => { editor.revealRange(editor.selection) });
                }
            }
        }

        // Case 2: `>` continuation
        return editor.edit(editBuilder => {
            if (isEmptyArrowLine) {
                const startPos = new Position(cursorPos.line, line.text.trim().length);
                editBuilder.delete(new Range(startPos, line.range.end));
                lineBreakPos = startPos;
            }
            editBuilder.insert(lineBreakPos, `\n> `);
        }).then(() => {
            // Fix cursor position
            if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
                let newCursorPos = cursorPos.with(line.lineNumber + 1, 2);
                editor.selection = new Selection(newCursorPos, newCursorPos);
            }
        }).then(() => { editor.revealRange(editor.selection) });
    } else if ((matches = /^((\s*[-+*] +)(\[[ x]\] +)?)/.exec(textBeforeCursor)) !== null) {
        // satisfy compiler's null check
        const match0 = matches[0];
        const match1 = matches[1];
        const match2 = matches[2];
        const match3 = matches[3];

        // Unordered list
        return editor.edit(editBuilder => {
            if (
                match3 &&                       // If it is a task list item and
                match0 === textBeforeCursor &&  // the cursor is right after the checkbox "- [x] |item1"
                modifiers !== 'ctrl'
            ) {
                // Move the task list item to the next line
                // - [x] |item1
                // ↓
                // - [ ] 
                // - [x] |item1
                editBuilder.replace(new Range(cursorPos.line, match2.length + 1, cursorPos.line, match2.length + 2), " ");
                editBuilder.insert(lineBreakPos, `\n${match1}`);
            } else {
                // Insert "- [ ]"
                // - [ ] item1|
                // ↓
                // - [ ] item1
                // - [ ] |
                editBuilder.insert(lineBreakPos, `\n${match1.replace('[x]', '[ ]')}`);
            }
        }).then(() => {
            // Fix cursor position
            if (modifiers == 'ctrl' && !cursorPos.isEqual(lineBreakPos)) {
                let newCursorPos = cursorPos.with(line.lineNumber + 1, matches![1].length);
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
        }).then(() => fixMarker(editor)).then(() => { editor.revealRange(editor.selection); });
    } else {
        return asNormal(editor, 'enter', modifiers);
    }
}

function onTabKey(modifiers?: IModifier) {
    const editor = window.activeTextEditor!;
    let cursorPos = editor.selection.start;
    let lineText = editor.document.lineAt(cursorPos.line).text;

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
            return outdent(editor).then(() => fixMarker(editor));
        } else {
            return indent(editor).then(() => fixMarker(editor));
        }
    } else {
        return asNormal(editor, 'tab', modifiers);
    }
}

function onBackspaceKey() {
    const editor = window.activeTextEditor!;
    let cursor = editor.selection.active;
    let document = editor.document;
    let textBeforeCursor = document.lineAt(cursor.line).text.substr(0, cursor.character);

    if (!editor.selection.isEmpty) {
        return asNormal(editor, 'backspace').then(() => fixMarker(editor));
    } else if (/^\s+([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `  - `, `   1. `
        return outdent(editor).then(() => fixMarker(editor));
    } else if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `- `, `1. `
        return editor.edit(editBuilder => {
            editBuilder.replace(new Range(cursor.with({ character: 0 }), cursor), ' '.repeat(textBeforeCursor.length))
        }).then(() => fixMarker(editor));
    } else if (/^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] )$/.test(textBeforeCursor)) {
        // e.g. textBeforeCursor === `- [ ]`, `1. [x]`, `  - [x]`
        return deleteRange(editor, new Range(cursor.with({ character: textBeforeCursor.length - 4 }), cursor)).then(() => fixMarker(editor));
    } else {
        return asNormal(editor, 'backspace');
    }
}

function asNormal(editor: TextEditor, key: "backspace" | "enter" | "tab", modifiers?: IModifier) {
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
                editor.selection.isEmpty
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
function indent(editor: TextEditor) {
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
function outdent(editor: TextEditor) {
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
 * Returns the line index of the next ordered list item starting from the specified line.
 *
 * @param line
 * Defaults to the beginning of the current primary selection (`editor.selection.start.line`)
 * in order to find the first marker following either the cursor or the entire selected range.
 */
function findNextMarkerLineNumber(editor: TextEditor, line = editor.selection.start.line): number {
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
    return -1;
}

/**
 * Looks for the previous ordered list marker at the same indentation level
 * and returns the marker number that should follow it.
 * 
 * @param currentIndentation treat tabs as if they were replaced by spaces with a tab stop of 4 characters
 *
 * @returns the fixed marker number
 */
function lookUpwardForMarker(editor: TextEditor, line: number, currentIndentation: number): number {
    let prevLine = line;
    while (--prevLine >= 0) {
        const prevLineText = editor.document.lineAt(prevLine).text.replace(/\t/g, '    ');
        let matches;
        if ((matches = /^(\s*)(([0-9]+)[.)] +)/.exec(prevLineText)) !== null) {
            // The previous line has an ordered list marker
            const prevLeadingSpace: string = matches[1];
            const prevMarker = matches[3];
            if (currentIndentation < prevLeadingSpace.length) {
                // yet to find a sibling item
                continue;
            } else if (
                currentIndentation >= prevLeadingSpace.length
                && currentIndentation <= (prevLeadingSpace + prevMarker).length
            ) {
                // found a sibling item
                return Number(prevMarker) + 1;
            } else if (currentIndentation > (prevLeadingSpace + prevMarker).length) {
                // found a parent item
                return 1;
            } else {
                // not possible
            }
        } else if ((matches = /^(\s*)([-+*] +)/.exec(prevLineText)) !== null) {
            // The previous line has an unordered list marker
            const prevLeadingSpace: string = matches[1];
            if (currentIndentation >= prevLeadingSpace.length) {
                // stop finding
                break;
            }
        } else if ((matches = /^(\s*)\S/.exec(prevLineText)) !== null) {
            // The previous line doesn't have a list marker
            if (matches[1].length < 3) {
                // no enough indentation for a list item
                break;
            }
        }
    }
    return 1;
}

/**
 * Fix ordered list marker *iteratively* starting from current line
 */
export function fixMarker(editor: TextEditor, line?: number): Thenable<unknown> | void {
    if (!workspace.getConfiguration('markdown.extension.orderedList').get<boolean>('autoRenumber')) return;
    if (workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'one') return;

    if (line === undefined) {
        line = findNextMarkerLineNumber(editor);
    }
    if (line < 0 || line >= editor.document.lineCount) {
        return;
    }

    let currentLineText = editor.document.lineAt(line).text;
    let matches;
    if ((matches = /^(\s*)([0-9]+)([.)])( +)/.exec(currentLineText)) !== null) { // ordered list
        let leadingSpace = matches[1];
        let marker = matches[2];
        let delimiter = matches[3];
        let trailingSpace = matches[4];
        let fixedMarker = lookUpwardForMarker(editor, line, leadingSpace.replace(/\t/g, '    ').length);
        let listIndent = marker.length + delimiter.length + trailingSpace.length;
        let fixedMarkerString = String(fixedMarker);

        return editor.edit(
            // fix the marker (current line)
            editBuilder => {
                if (marker === fixedMarkerString) {
                    return;
                }
                // Add enough trailing spaces so that the text is still aligned at the same indentation level as it was previously, but always keep at least one space
                fixedMarkerString += delimiter + " ".repeat(Math.max(1, listIndent - (fixedMarkerString + delimiter).length));

                editBuilder.replace(new Range(line!, leadingSpace.length, line!, leadingSpace.length + listIndent), fixedMarkerString);
            },
            { undoStopBefore: false, undoStopAfter: false }
        ).then(() => {
            let nextLine = line! + 1;
            while (editor.document.lineCount > nextLine) {
                const nextLineText = editor.document.lineAt(nextLine).text;
                if (/^\s*[0-9]+[.)] +/.test(nextLineText)) {
                    return fixMarker(editor, nextLine);
                } else if (
                    editor.document.lineAt(nextLine - 1).isEmptyOrWhitespace  // This line is a block
                    && !nextLineText.startsWith(" ".repeat(3))                // and doesn't have enough indentation
                    && !nextLineText.startsWith("\t")                         // so terminates the current list.
                ) {
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

function checkTaskList(): Thenable<unknown> | void {
    // - Look into selections for lines that could be checked/unchecked.
    // - The first matching line dictates the new state for all further lines.
    //   - I.e. if the first line is unchecked, only other unchecked lines will
    //     be considered, and vice versa.
    const editor = window.activeTextEditor!;
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

            let matches: RegExpExecArray | null;
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
    const editor = window.activeTextEditor!;
    return commands.executeCommand('editor.action.moveLinesUpAction')
        .then(() => fixMarker(editor));
}

function onMoveLineDown() {
    const editor = window.activeTextEditor!;
    return commands.executeCommand('editor.action.moveLinesDownAction')
        .then(() => fixMarker(editor, findNextMarkerLineNumber(editor, editor.selection.start.line - 1)));
}

function onCopyLineUp() {
    const editor = window.activeTextEditor!;
    return commands.executeCommand('editor.action.copyLinesUpAction')
        .then(() => fixMarker(editor));
}

function onCopyLineDown() {
    const editor = window.activeTextEditor!;
    return commands.executeCommand('editor.action.copyLinesDownAction')
        .then(() => fixMarker(editor));
}

function onIndentLines() {
    const editor = window.activeTextEditor!;
    return indent(editor).then(() => fixMarker(editor));
}

function onOutdentLines() {
    const editor = window.activeTextEditor!;
    return outdent(editor).then(() => fixMarker(editor));
}

export function deactivate() { }
