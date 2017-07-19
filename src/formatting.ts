'use strict';

import { commands, languages, window, workspace, ExtensionContext, Position, Range, Selection } from 'vscode';

const prefix = 'markdown.extension.editing.';
let quickStyling;

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

    quickStyling = workspace.getConfiguration('markdown.extension').get<boolean>('quickStyling');
    if (quickStyling) {
        languages.setLanguageConfiguration('markdown', {
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
        });
    }
}

function toggleBold() {
    styleByWrapping('**');
}

function toggleItalic() {
    let indicator = workspace.getConfiguration('markdown.extension.italic').get<string>('indicator');
    styleByWrapping(indicator);
}

function toggleCodeSpan() {
    styleByWrapping('`');
}

function toggleHeadingUp() {
    let editor = window.activeTextEditor;
    let lineIndex = editor.selection.active.line;
    let lineText = editor.document.lineAt(lineIndex).text;

    editor.edit((editBuilder) => {
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

function styleByWrapping(startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;
    let cursorPos = selection.active;

    if (selection.isEmpty) { // No selected text
        if (quickStyling) {
            let wordRange = editor.document.getWordRangeAtPosition(cursorPos);
            if (wordRange == undefined) {
                wordRange = new Range(cursorPos, cursorPos);
            }
            wrapRange(cursorPos, wordRange, false, startPattern);
        } else {
            switch (getContext(startPattern)) {
                case `${startPattern}text|${endPattern}`:
                    let newCursorPos = cursorPos.with({ character: cursorPos.character + endPattern.length });
                    editor.selection = new Selection(newCursorPos, newCursorPos);
                    break;
                case `${startPattern}|${endPattern}`:
                    let start = cursorPos.with({ character: cursorPos.character - startPattern.length });
                    let end = cursorPos.with({ character: cursorPos.character + endPattern.length });
                    wrapRange(cursorPos, new Range(start, end), false, startPattern);
                    break;
                default:
                    wrapRange(cursorPos, new Range(cursorPos, cursorPos), false, startPattern);
                    break;
            }
        }
    }
    else { // Text selected
        wrapRange(cursorPos, selection, true, startPattern);
    }
}

/**
 * Add or remove `startPattern`/`endPattern` according to the context
 */
function wrapRange(cursor: Position, range: Range, isSelected: boolean, startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let text = editor.document.getText(range);
    let newCursorPos;
    if (isWrapped(text, startPattern)) {
        replaceWith(range, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));
        newCursorPos = cursor.with({ character: cursor.character - startPattern.length });
    }
    else {
        replaceWith(range, startPattern + text + endPattern);
        newCursorPos = cursor.with({ character: cursor.character + startPattern.length });
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

function replaceWith(selection, newText) {
    let editor = window.activeTextEditor;
    editor.edit((edit) => {
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
