'use strict';

import { languages, ExtensionContext, IndentAction } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';
import * as print from './print';
import * as listEditing from './listEditing'
import * as tableFormatter from './tableFormatter'

export function activate(context: ExtensionContext) {
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

    languages.setLanguageConfiguration('markdown', {
        comments: { blockComment: ["<!-- ", " -->"] }
    });
}

export function deactivate() { }
