'use strict';

/**
 * Modified from <https://github.com/mdickin/vscode-markdown-shortcuts>
 */

import { commands, window, ExtensionContext, Position, Range, Selection } from 'vscode';

const prefix = 'markdown.extension.editing.';

export function activate(context: ExtensionContext) {
    const cmds: Command[] = [
        { command: 'toggleBold', callback: toggleBold },
        { command: 'toggleItalic', callback: toggleItalic },
        // { command: 'toggleCodeSpan', callback: toggleCodeSpan },
        { command: 'toggleHeadingUp', callback: toggleHeadingUp },
        { command: 'toggleHeadingDown', callback: toggleHeadingDown }
    ].map(cmd => {
        cmd.command = prefix + cmd.command;
        return cmd;
    });

    cmds.forEach(cmd => {
        context.subscriptions.push(commands.registerCommand(cmd.command, cmd.callback));
    });
}

function toggleBold() {
    wrapSelection('**');
}

function toggleItalic() {
    wrapSelection('*');
}

// function toggleCodeSpan() {
//     wrapSelection('`');
// }

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

function wrapSelection(startPattern, endPattern?) {
    if (endPattern == undefined || endPattern == null) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;

    if (selection.isEmpty) { // No selected text
        if (!atEndOfWrappedWord(startPattern, endPattern)) {
            let position = selection.active;
            let newPosition = position.with(position.line, position.character + startPattern.length);
            editor.edit((editBuilder) => {
                editBuilder.insert(selection.start, startPattern + endPattern);
            }).then(() => {
                editor.selection = new Selection(newPosition, newPosition);
            });
        }
        else {
            let newPosition = new Position(editor.selection.active.line, editor.selection.active.character + endPattern.length)
            editor.selection = new Selection(newPosition, newPosition);
        }
    }
    else { // Text selected
        let text = editor.document.getText(selection);
        if (isWrapped(text, startPattern, endPattern)) {
            replaceWith(selection, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));
        }
        else {
            replaceWith(selection, startPattern + text + endPattern);
        }
    }
}

function isWrapped(text, startPattern, endPattern?): boolean {
    // if (startPattern.constructor === RegExp) {
    //     return startPattern.test(text);
    // }
    return text.startsWith(startPattern) && text.endsWith(endPattern);
}

function replaceWith(selection, newText) {
    let editor = window.activeTextEditor;
    editor.edit((edit) => {
        edit.replace(selection, newText);
    });
}

function atEndOfWrappedWord(startPattern, endPattern): boolean {
    let editor = window.activeTextEditor;
    let selection = editor.selection;
    if (selection.isEmpty) {
        let position = selection.active;
        
        let startPositionCharacter = position.character - startPattern.length;
        let endPositionCharacter = position.character + endPattern.length;
        
        // If cursor on empty line:
        if (startPositionCharacter < 0) {
            startPositionCharacter = 0;
        }
        
        selection = new Selection(new Position(position.line, startPositionCharacter), position);
        let leftText = editor.document.getText(selection);
        
        selection = new Selection(new Position(position.line, endPositionCharacter), position);
        let rightText = editor.document.getText(selection);
        
        if (leftText != startPattern && rightText == endPattern) {
            return true;
        }
    }
    return false;
}
