'use strict';

/**
 * Modified from <https://github.com/mdickin/vscode-markdown-shortcuts>
 */

import { commands, window, ExtensionContext, Selection } from 'vscode';

const prefix = 'extension.markdown.editing.';

export function activate(context: ExtensionContext) {
    const cmds: Command[] = [
        { command: 'toggleBold', callback: toggleBold },
        { command: 'toggleItalic', callback: toggleItalic },
        { command: 'toggleCodeSpan', callback: toggleCodeSpan }
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

function toggleCodeSpan() {
    wrapSelection('`');
}

function wrapSelection(startPattern, endPattern?) {
    if (endPattern == undefined || endPattern == null) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;
    let selection = editor.selection;

    if (selection.isEmpty) { // No selected text
        let position = selection.active;
        let newPosition = position.with(position.line, position.character + startPattern.length);
        editor.edit((edit) => {
            edit.insert(selection.start, startPattern + endPattern);
        }).then(() => {
            editor.selection = new Selection(newPosition, newPosition);
        });
    }
    else { // Text selected
        let text = editor.document.getText(selection);
        if (isMatch(text, startPattern, endPattern)) {
            replaceWith(selection, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length));
        }
        else {
            replaceWith(selection, startPattern + text + endPattern);
        }
    }
}

function isMatch(text, startPattern, endPattern?) {
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
