'use strict';

import { languages, window, workspace, ExtensionContext, IndentAction } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';
import * as print from './print';
import * as listEditing from './listEditing'
import * as tableFormatter from './tableFormatter'

export function activate(context: ExtensionContext) {
    activateMdExt(context);

    return {
        extendMarkdownIt(md) {
            return md.use(require('markdown-it-task-lists'))
                .use(require('@iktakahiro/markdown-it-katex'));
        }
    }
}

function activateMdExt(context: ExtensionContext) {
    // Override `Enter`, `Tab` and `Backspace` keys
    listEditing.activate(context);
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Auto show preview to side
    preview.activate(context);
    // Print to PDF
    print.activate(context);
    // Table formatter
    if (workspace.getConfiguration('markdown.extension.tableFormatter').get<boolean>('enabled')) {
        tableFormatter.activate(context);
    }

    // Allow `*` in word pattern for quick styling
    languages.setLanguageConfiguration('markdown', {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s\，\。\《\》\？\；\：\‘\“\’\”\（\）\【\】\、]+)/g
    });
}

export function deactivate() { }
