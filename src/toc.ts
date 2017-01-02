'use strict';

/**
 * Modified from <https://github.com/AlanWalk/Markdown-TOC>
 */

import { commands, window, workspace, ExtensionContext } from 'vscode';

const prefix = 'extension.markdown.toc.';

const REGEXP_HEADING = /^\#{1,6}/;
const REGEXP_CODE_BLOCK = /^```/;

let options = { depth: 6 };

export function activate(context: ExtensionContext) {
    const cmds: Command[] = [
        { command: 'create', callback: createToc },
        { command: 'update', callback: updateToc },
        { command: 'delete', callback: deleteToc }
    ].map(cmd => {
        cmd.command = prefix + cmd.command;
        return cmd;
    });

    cmds.forEach(cmd => {
        context.subscriptions.push(commands.registerCommand(cmd.command, cmd.callback));
    });
}

function createToc() {
    updateToc();
}

function updateToc() {
    let editor = window.activeTextEditor;
    let selection = editor.selection;
    
    let lineEnding = <string>workspace.getConfiguration("files").get("eol");
    let tabSize = <number>workspace.getConfiguration("editor").get("tabSize");
    let insertSpaces = <boolean>workspace.getConfiguration("editor").get("insertSpaces");

    let tab = '\t';
    if (insertSpaces && tabSize > 0) {
        tab = " ".repeat(tabSize);
    }

    let toc = [];
    let headingList = getHeadingList();
    let startDepth = 6;
    headingList.forEach(heading => {
        if (heading.level < startDepth) startDepth = heading.level;
    });
    headingList.forEach(heading => {
        if (heading.level <= options.depth) {
            let length = heading.level - startDepth;
            let row = [
                tab.repeat(length),
                '- ',
                heading.title
            ];
            toc.push(row.join(''));
        }
    });

    editor.edit(function (editBuilder) {
        editBuilder.insert(selection.active, toc.join(lineEnding));
    });
}

function deleteToc() {

}

function getHeadingList() {
    let doc = window.activeTextEditor.document;

    let headingList: Heading[] = [];
    let isInCode = false;
    for (let i = 0; i < doc.lineCount; i++) {
        let line = doc.lineAt(i).text;

        let codeResult = line.match(REGEXP_CODE_BLOCK); // Code block
        if (codeResult != null) isInCode = !isInCode;
        if (isInCode) continue;

        let headingResult = line.match(REGEXP_HEADING); // Heading pattern
        if (headingResult == null) continue;

        let level = headingResult[0].length;
        if (level > options.depth) continue;

        let title = line.substr(level).trim().replace(/\#*$/, "").trim();

        headingList.push({
            level: level,
            title: title
        });
    }
    return headingList;
}
