'use strict';

import { languages, ExtensionContext, IndentAction } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';
import * as print from './print';

export function activate(context: ExtensionContext) {
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Auto show preview to side
    preview.activate(context);
    // Print to PDF
    print.activate(context);

    languages.setLanguageConfiguration('markdown', {
        onEnterRules: [
            {
                beforeText: /^[\s]*\* .*/,
                action: {indentAction: IndentAction.None, appendText: '* '}
            },
            {
                beforeText: /^[\s]*\+ .*/,
                action: {indentAction: IndentAction.None, appendText: '+ '}
            },
            {
                beforeText: /^[\s]*- .*/,
                action: {indentAction: IndentAction.None, appendText: '- '}
            }
        ]
    });
}

export function deactivate() {
    print.deactivate();
}
