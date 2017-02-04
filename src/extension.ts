'use strict';

import { commands, workspace, ExtensionContext, TextDocument } from 'vscode';
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
    print.activate(context);
}

export function deactivate() {
}
