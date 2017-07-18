'use strict';

/**
 * Modified from <https://github.com/mdickin/vscode-markdown-shortcuts>
 */

import { commands, window, workspace, ExtensionContext, Position, Range, Selection } from 'vscode';

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

    if (selection.isEmpty) { // No selected text
        let position = selection.active;
        let newPosition = position;
        switch (getContext(startPattern)) {
            case `${startPattern}|${endPattern}`:
                newPosition = position.with(position.line, position.character - startPattern.length);
                editor.edit((editBuilder) => {
                    editBuilder.delete(new Range(newPosition, position.with({ character: position.character + endPattern.length })));
                });
                break;
            case `${startPattern}some text|${endPattern}`:
                newPosition = position.with({ character: position.character + endPattern.length });
                break;
            case '|':
                editor.edit((editBuilder) => {
                    editBuilder.insert(selection.start, startPattern + endPattern);
                });
                newPosition = position.with({ character: position.character + startPattern.length });
                break;
        }
        editor.selection = new Selection(newPosition, newPosition);
    }
    else { // Text selected
        wrapSelection(startPattern);
    }
}

function wrapSelection(startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;
    let text = editor.document.getText(selection);
    if (isWrapped(text, startPattern)) {
        replaceWith(selection, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));
    }
    else {
        replaceWith(selection, startPattern + text + endPattern);
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
            return `${startPattern}|${endPattern}`
        } else {
            return `${startPattern}some text|${endPattern}`
        }
    }
    return '|';
}
