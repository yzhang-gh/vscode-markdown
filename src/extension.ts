'use strict';

import { commands, workspace, ExtensionContext, TextDocument } from 'vscode';
import * as formatting from './formatting';
import * as toc from './toc';
import * as preview from './preview';

export function activate(context: ExtensionContext) {
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Auto show preview to side
    preview.activate(context);
}

export function deactivate() {
}
