'use strict';

/**
 * Modified from <https://github.com/AlanWalk/Markdown-TOC>
 */

import { commands, window, workspace, ExtensionContext } from 'vscode';

const prefix = 'markdown.extension.toc.';

const REGEXP_HEADING = /^\#{1,6}/;
const REGEXP_CODE_BLOCK = /^```/;

/**
 * Workspace config
 */
let wsConfig = { tab: '    ', eol: '\r\n' };
let tocConfig = { depth: 6, orderedList: false };

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

    loadConfig();

    // Generate TOC
    let toc = [];
    let headingList = getHeadingList();
    let startDepth = 6; // In case that there is no heading in level 1.
    headingList.forEach(heading => {
        if (heading.level < startDepth) startDepth = heading.level;
    });
    let order = new Array(tocConfig.depth - startDepth + 1).fill(0); // Ordered list
    headingList.forEach(heading => {
        if (heading.level <= tocConfig.depth) {
            let indentation = heading.level - startDepth;
            let row = [
                wsConfig.tab.repeat(indentation),
                tocConfig.orderedList ? ++order[indentation] + '. ' : '- ',
                heading.title
            ];
            toc.push(row.join(''));
            if (tocConfig.orderedList) order.fill(0, indentation + 1);
        }
    });

    editor.edit(function (editBuilder) {
        editBuilder.insert(editor.selection.active, toc.join(wsConfig.eol));
    });
}

function deleteToc() {

}

function getHeadingList() {
    let doc = window.activeTextEditor.document;

    let headingList: Heading[] = [];
    let isInCode = false;
    for (let i = 0; i < doc.lineCount; i++) {
        let lineText = doc.lineAt(i).text;

        let codeResult = lineText.match(REGEXP_CODE_BLOCK); // Code block
        if (codeResult != null) isInCode = !isInCode;
        if (isInCode) continue;

        let headingResult = lineText.match(REGEXP_HEADING); // Heading pattern
        if (headingResult == null) continue;

        let level = headingResult[0].length; // Get heading level
        if (level > tocConfig.depth) continue;

        let title = lineText.substr(level).trim().replace(/\#*$/, "").trim(); // Get heading title

        headingList.push({
            level: level,
            title: title
        });
    }
    return headingList;
}

function loadConfig() {
    // Workspace config
    wsConfig.eol = <string>workspace.getConfiguration("files").get("eol");
    let tabSize = <number>workspace.getConfiguration("editor").get("tabSize");
    let insertSpaces = <boolean>workspace.getConfiguration("editor").get("insertSpaces");

    wsConfig.tab = '\t';
    if (insertSpaces && tabSize > 0) {
        wsConfig.tab = " ".repeat(tabSize);
    }

    // TOC config
    tocConfig.depth = <number>workspace.getConfiguration('markdown.extension.toc').get('depth');
    tocConfig.orderedList = <boolean>workspace.getConfiguration('markdown.extension.toc').get('orderedList');
}
