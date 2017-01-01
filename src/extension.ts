'use strict';

import { commands, workspace, ExtensionContext, TextDocument } from 'vscode';
import * as mdCommands from './formatting';
import * as toc from './toc';

export function activate(context: ExtensionContext) {
    mdCommands.activate(context);
    toc.activate(context);
}

export function deactivate() {
}
