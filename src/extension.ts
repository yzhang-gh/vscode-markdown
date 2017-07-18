'use strict';

import { languages, window, workspace, ExtensionContext, IndentAction } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';
import * as print from './print';
import * as listEditing from './listEditing'
import * as tableFormatter from './tableFormatter'

export function activate(context: ExtensionContext) {
    if (workspace.rootPath === undefined) { // No folder is opened
        /* Greedy activation */
        // if (window.activeTextEditor !== undefined && window.activeTextEditor.document.languageId === 'markdown') {
        activateMdExt(context);
        // }
    } else {
        workspace.findFiles('**/*.md', '**/node_modules/**', 1).then((files) => {
            if (files !== undefined && files.length !== 0) {
                activateMdExt(context);
            }
        });
    }
}

function activateMdExt(context: ExtensionContext) {
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Auto show preview to side
    preview.activate(context);
    // Print to PDF
    // print.activate(context);
    // Override `Enter`, `Tab` and `Backspace` keys
    listEditing.activate(context);
    // Table formatter
    tableFormatter.activate(context);
}

export function deactivate() { }
