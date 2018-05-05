'use strict';

import { commands, window, workspace, ExtensionContext, Position, Range, Selection, TextEditor, TextEdit } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.editing.toggleBold', toggleBold),
        commands.registerCommand('markdown.extension.editing.toggleItalic', toggleItalic),
        commands.registerCommand('markdown.extension.editing.toggleCodeSpan', toggleCodeSpan),
        commands.registerCommand('markdown.extension.editing.toggleStrikethrough', toggleStrikethrough),
        commands.registerCommand('markdown.extension.editing.toggleMath', toggleMath),
        commands.registerCommand('markdown.extension.editing.toggleHeadingUp', toggleHeadingUp),
        commands.registerCommand('markdown.extension.editing.toggleHeadingDown', toggleHeadingDown)
    );
}

// Return Promise because need to chain operations in unit tests

function toggleBold() {
    return styleByWrapping('**');
}

function toggleItalic() {
    let indicator = workspace.getConfiguration('markdown.extension.italic').get<string>('indicator');
    return styleByWrapping(indicator);
}

function toggleCodeSpan() {
    return styleByWrapping('`');
}

function toggleStrikethrough() {
    return styleByWrapping('~~');
}

async function toggleHeadingUp() {
    let editor = window.activeTextEditor;
    let lineIndex = editor.selection.active.line;
    let lineText = editor.document.lineAt(lineIndex).text;

    return await editor.edit((editBuilder) => {
        if (!lineText.startsWith('#')) { // Not a heading
            editBuilder.insert(new Position(lineIndex, 0), '# ');
        }
        else if (!lineText.startsWith('######')) { // Already a heading (but not level 6)
            editBuilder.insert(new Position(lineIndex, 0), '#');
        }
    });
}

function toggleHeadingDown() {
    let editor = window.activeTextEditor;
    let lineIndex = editor.selection.active.line;
    let lineText = editor.document.lineAt(lineIndex).text;

    editor.edit((editBuilder) => {
        if (lineText.startsWith('# ')) { // Heading level 1
            editBuilder.delete(new Range(new Position(lineIndex, 0), new Position(lineIndex, 2)));
        }
        else if (lineText.startsWith('#')) { // Heading (but not level 1)
            editBuilder.delete(new Range(new Position(lineIndex, 0), new Position(lineIndex, 1)));
        }
    });
}

function toggleMath() {
    let editor = window.activeTextEditor;
    if (!editor.selection.isEmpty) return;
    let cursor = editor.selection.active;

    if (getContext('$') === '$|$') {
        return editor.edit(editBuilder => {
            editBuilder.replace(new Range(cursor.line, cursor.character - 1, cursor.line, cursor.character + 1), '$$  $$');
        }).then(() => {
            let pos = cursor.with({ character: cursor.character + 2 });
            editor.selection = new Selection(pos, pos);
        });
    } else if (getContext('$$ ', ' $$') === '$$ | $$') {
        return editor.edit(editBuilder => {
            editBuilder.delete(new Range(cursor.line, cursor.character - 3, cursor.line, cursor.character + 3));
        });
    } else {
        return commands.executeCommand('editor.action.insertSnippet', { snippet: '$$0$' });
    }
}

async function styleByWrapping(startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;

    let selections = editor.selections;

    for (let i = 0; i < selections.length; i++) {
        var selection = editor.selections[i]; // 💩 get the latest selection range
        let cursorPos = selection.active;

        let options = {
            undoStopBefore: false,
            undoStopAfter: false
        }

        if (i === 0) {
            options.undoStopBefore = true
        } else if (i === selections.length - 1) {
            options.undoStopAfter = true
        }

        if (selection.isEmpty) { // No selected text
            // Quick styling
            if (workspace.getConfiguration('markdown.extension').get<boolean>('quickStyling')) {
                let wordRange = editor.document.getWordRangeAtPosition(cursorPos);
                if (wordRange == undefined) {
                    wordRange = new Range(cursorPos, cursorPos);
                }
                // One special case: toggle strikethrough in task list
                const currentTextLine = editor.document.lineAt(selection.start.line);
                if (startPattern === '~~' && /^\s*[\*\+\-] \[[ x]\]\s+/g.test(currentTextLine.text.trim())) {
                    wordRange = currentTextLine.range.with(new Position(selection.start.line, currentTextLine.text.match(/^\s*[\*\+\-] \[[ x]\]\s+/g)[0].length));
                }
                await wrapRange(editor, options, cursorPos, wordRange, false, startPattern);
            } else {
                switch (getContext(startPattern)) {
                    case `${startPattern}text|${endPattern}`:
                        let newCursorPos = cursorPos.with({ character: cursorPos.character + endPattern.length });
                        editor.selection = new Selection(newCursorPos, newCursorPos);
                        break;
                    case `${startPattern}|${endPattern}`:
                        let start = cursorPos.with({ character: cursorPos.character - startPattern.length });
                        let end = cursorPos.with({ character: cursorPos.character + endPattern.length });
                        await wrapRange(editor, options, cursorPos, new Range(start, end), false, startPattern);
                        break;
                    default:
                        await wrapRange(editor, options, cursorPos, new Range(cursorPos, cursorPos), false, startPattern);
                        break;
                }
            }
        }
        else { // Text selected
            await wrapRange(editor, options, cursorPos, selection, true, startPattern);
        }
    }
}

/**
 * Add or remove `startPattern`/`endPattern` according to the context
 * @param cursor cursor position
 * @param range range to be replaced
 * @param isSelected is this range selected
 * @param startPattern 
 * @param endPattern 
 */
function wrapRange(editor: TextEditor, options, cursor: Position, range: Range, isSelected: boolean, startPattern: string, endPattern?: string) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    /**
     * 💩 IMHO, it makes more sense to use `await` to chain these two operations
     *     1. replace text
     *     2. fix cursor position
     * But using `await` will cause noticeable cursor moving from `|` to `****|` to `**|**`.
     * Since using promise here can also pass the unit tests, I choose this "bad codes"(?)
     */
    let promise: Thenable<boolean>;

    let text = editor.document.getText(range);
    let newCursorPos: Position;
    if (isWrapped(text, startPattern)) {
        // remove start/end patterns from range
        promise = replaceWith(range, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length), options);

        // Fix cursor position
        if (!isSelected) {
            if (!range.isEmpty) { // means quick styling
                if (cursor.character == range.start.character) {
                    newCursorPos = cursor
                } else if (cursor.character == range.end.character) {
                    newCursorPos = cursor.with({ character: cursor.character - startPattern.length - endPattern.length });
                } else {
                    newCursorPos = cursor.with({ character: cursor.character - startPattern.length });
                }
            } else { // means `**|**` -> `|`
                newCursorPos = cursor.with({ character: cursor.character + startPattern.length });
            }
        }
    }
    else {
        // add start/end patterns around range
        promise = replaceWith(range, startPattern + text + endPattern, options);

        // Fix cursor position
        if (!isSelected) {
            if (!range.isEmpty) { // means quick styling
                if (cursor.character == range.start.character) {
                    newCursorPos = cursor
                } else if (cursor.character == range.end.character) {
                    newCursorPos = cursor.with({ character: cursor.character + startPattern.length + endPattern.length });
                } else {
                    newCursorPos = cursor.with({ character: cursor.character + startPattern.length });
                }
            } else { // means `|` -> `**|**`
                newCursorPos = cursor.with({ character: cursor.character + startPattern.length });
            }
        }
    }

    if (!isSelected) {
        editor.selection = new Selection(newCursorPos, newCursorPos);
    }

    return promise;
}

function isWrapped(text, startPattern, endPattern?): boolean {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }
    return text.startsWith(startPattern) && text.endsWith(endPattern);
}

function replaceWith(range: Range, newText: string, options) {
    let editor = window.activeTextEditor;
    return editor.edit(edit => {
        edit.replace(range, newText);
    }, options);
}

function getContext(startPattern, endPattern?): string {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;
    let position = selection.active;

    let startPositionCharacter = position.character - startPattern.length;
    let endPositionCharacter = position.character + endPattern.length;

    if (startPositionCharacter < 0) {
        startPositionCharacter = 0;
    }

    let leftText = editor.document.getText(selection.with({ start: position.with({ character: startPositionCharacter }) }));
    let rightText = editor.document.getText(selection.with({ end: position.with({ character: endPositionCharacter }) }));

    if (rightText == endPattern) {
        if (leftText == startPattern) {
            return `${startPattern}|${endPattern}`;
        } else {
            return `${startPattern}text|${endPattern}`;
        }
    }
    return '|';
}
