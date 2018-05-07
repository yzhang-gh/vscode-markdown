'use strict';

import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext, languages, workspace, window, commands, Uri } from 'vscode';
import * as formatting from './formatting';
import * as listEditing from './listEditing';
import * as preview from './preview';
import * as print from './print';
import * as tableFormatter from './tableFormatter';
import * as toc from './toc';
import { getNewFeatureMsg, showChangelog } from './util';

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

    newVersionMessage(context.extensionPath);
}

function newVersionMessage(extensionPath: string) {
    let data, currentVersion;
    try {
        data = fs.readFileSync(`${extensionPath}${path.sep}package.json`).toString();
        currentVersion = JSON.parse(data).version;
        if (fs.existsSync(`${extensionPath}${path.sep}VERSION`) &&
            fs.readFileSync(`${extensionPath}${path.sep}VERSION`).toString() === currentVersion) {
            return;
        }
        fs.writeFileSync(`${extensionPath}${path.sep}VERSION`, currentVersion);
    } catch (error) {
        console.log(error);
        return;
    }
    const featureMsg = getNewFeatureMsg(currentVersion);
    if (featureMsg === undefined) return;
    window.showInformationMessage(featureMsg, 'See a GIF', 'Dismiss').then(option => {
        switch (option) {
            case 'See a GIF':
                showChangelog();
            case 'Dismiss':
                break;
        }
    });
}

export function deactivate() { }
