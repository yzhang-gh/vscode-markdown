'use strict';

import { commands, languages, window, workspace, ExtensionContext, Position, Range, Selection } from 'vscode';

const prefix = 'markdown.extension.editing.';

export function activate(context: ExtensionContext) {
    const cmds: Command[] = [
        { command: 'toggleBold', callback: toggleBold },
        { command: 'toggleItalic', callback: toggleItalic },
        { command: 'toggleCodeSpan', callback: toggleCodeSpan },
        { command: 'toggleHeadingUp', callback: toggleHeadingUp },
        { command: 'toggleHeadingDown', callback: toggleHeadingDown }
    ].map(cmd => {
        cmd.command = prefix + cmd.command;
        return cmd;
    });

    cmds.forEach(cmd => {
        context.subscriptions.push(commands.registerCommand(cmd.command, cmd.callback));
    });

    // Allow `*` in word pattern for quick styling
    languages.setLanguageConfiguration('markdown', {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
    });
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

async function styleByWrapping(startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;
    let cursorPos = selection.active;

    if (selection.isEmpty) { // No selected text
        // Quick styling
        if (workspace.getConfiguration('markdown.extension').get<boolean>('quickStyling')) {
            let wordRange = editor.document.getWordRangeAtPosition(cursorPos);
            if (wordRange == undefined) {
                wordRange = new Range(cursorPos, cursorPos);
            }
            await wrapRange(cursorPos, wordRange, false, startPattern);
        } else {
            switch (getContext(startPattern)) {
                case `${startPattern}text|${endPattern}`:
                    let newCursorPos = cursorPos.with({ character: cursorPos.character + endPattern.length });
                    editor.selection = new Selection(newCursorPos, newCursorPos);
                    break;
                case `${startPattern}|${endPattern}`:
                    let start = cursorPos.with({ character: cursorPos.character - startPattern.length });
                    let end = cursorPos.with({ character: cursorPos.character + endPattern.length });
                    await wrapRange(cursorPos, new Range(start, end), false, startPattern);
                    break;
                default:
                    await wrapRange(cursorPos, new Range(cursorPos, cursorPos), false, startPattern);
                    break;
            }
        }
    }
    else { // Text selected
        await wrapRange(cursorPos, selection, true, startPattern);
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
async function wrapRange(cursor: Position, range: Range, isSelected: boolean, startPattern: string, endPattern?: string) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let text = editor.document.getText(range);
    let newCursorPos: Position;
    if (isWrapped(text, startPattern)) {
        // remove start/end patterns from range
        await replaceWith(range, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));

        // Fix cursor position
        if (!isSelected) {
            newCursorPos = cursor.with({ character: cursor.character - startPattern.length });
            if (!range.isEmpty) {
                if (cursor.character == range.start.character) {
                    newCursorPos = cursor
                } else if (cursor.character == range.end.character) {
                    newCursorPos = cursor.with({ character: cursor.character - startPattern.length - endPattern.length });
                }
            }
        }
    }
    else {
        // add start/end patterns arround range
        await replaceWith(range, startPattern + text + endPattern);

        // Fix cursor position
        if (!isSelected) {
            newCursorPos = cursor.with({ character: cursor.character + startPattern.length });
            if (!range.isEmpty) {
                if (cursor.character == range.start.character) {
                    newCursorPos = cursor
                } else if (cursor.character == range.end.character) {
                    newCursorPos = cursor.with({ character: cursor.character + startPattern.length + endPattern.length });
                }
            }
        }
    }

    if (!isSelected) {
        editor.selection = new Selection(newCursorPos, newCursorPos);
    }
}

function isWrapped(text, startPattern, endPattern?): boolean {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }
    return text.startsWith(startPattern) && text.endsWith(endPattern);
}

async function replaceWith(selection, newText) {
    let editor = window.activeTextEditor;
    await editor.edit((edit) => {
        edit.replace(selection, newText);
    });
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
