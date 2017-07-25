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

    if (selection.isEmpty) { // No selected text
        let position = selection.active;
        let newPosition = position;
        switch (getContext(startPattern)) {
            // Empty bold or italic block
            case `${startPattern}|${endPattern}`:
                newPosition = position.with(position.line, position.character - startPattern.length);
                await editor.edit((editBuilder) => {
                    editBuilder.delete(new Range(newPosition, position.with({ character: position.character + endPattern.length })));
                });
                break;
            // At the end of bold or italic block
            case `${startPattern}some text|${endPattern}`:
                newPosition = position.with({ character: position.character + endPattern.length });
                break;
            // Plain text
            case '|':
                // TODO: quick styling
                let wordRange = editor.document.getWordRangeAtPosition(position);
                // console.log(wordRange);
                if (wordRange == undefined) {
                    await editor.edit((editBuilder) => {
                        editBuilder.insert(position, startPattern + endPattern);
                    });
                } else {
                    // console.log(editor.document.getText(wordRange));
                    await editor.edit((editBuilder) => {
                        editBuilder.insert(wordRange.start, startPattern);
                        editBuilder.insert(wordRange.end, endPattern);
                    });
                }
                newPosition = position.with({ character: position.character + startPattern.length });
                break;
        }
        editor.selection = new Selection(newPosition, newPosition);
    }
    else { // Text selected
        await wrapSelection(startPattern);
    }
}

async function wrapSelection(startPattern, endPattern?) {
    if (endPattern == undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;
    let text = editor.document.getText(selection);
    if (isWrapped(text, startPattern)) {
        await replaceWith(selection, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));
    }
    else {
        await replaceWith(selection, startPattern + text + endPattern);
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
            return `${startPattern}|${endPattern}`
        } else {
            return `${startPattern}some text|${endPattern}`
        }
    }
    return '|';
}
