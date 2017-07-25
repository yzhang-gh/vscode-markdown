'use strict';

import { window, workspace, ExtensionContext, IndentAction } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';
import * as print from './print';
import * as listEditing from './listEditing'
import * as tableFormatter from './tableFormatter'

// let activated = false;

export function activate(context: ExtensionContext) {
    // // If a folder is opened and contains Markdown file, activate this extension, that's all
    // workspace.findFiles('**/*.md', '**/node_modules/**', 1).then((files) => {
    //     if (files !== undefined && files.length !== 0) {
    //         activateMdExt(context);
    //         return;
    //     }
    // });

    // // Otherwise, use these events to make sure extension will be activated
    // window.onDidChangeActiveTextEditor(() => {
    //     if (window.activeTextEditor !== undefined && window.activeTextEditor.document.languageId === 'markdown') {
    //         activateMdExt(context);
    //     }
    // });

    // // The first time
    // if (window.activeTextEditor !== undefined && window.activeTextEditor.document.languageId === 'markdown') {
    //     activateMdExt(context);
    // }

    activateMdExt(context);
}

function activateMdExt(context: ExtensionContext) {
    // if (activated)
    //     return;

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

    // console.log('activated');

    // activated = true;
}

export function deactivate() { }
