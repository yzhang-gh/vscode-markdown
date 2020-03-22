'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, languages, window, workspace } from 'vscode';
import * as completion from './completion';
import * as formatting from './formatting';
import * as listEditing from './listEditing';
import localize from './localize';
import * as preview from './preview';
import * as print from './print';
import * as decorations from './syntaxDecorations';
import * as tableFormatter from './tableFormatter';
import * as toc from './toc';
import { getNewFeatureMsg, showChangelog } from './util';

export function activate(context: ExtensionContext) {
    activateMdExt(context);

    if (workspace.getConfiguration('markdown.extension.math').get<boolean>('enabled')) {
        // Make a deep copy as `macros` will be modified by KaTeX during initialization
        let userMacros = JSON.parse(JSON.stringify(workspace.getConfiguration('markdown.extension.katex').get<object>('macros')));
        let katexOptions = { throwOnError: false };
        if (Object.keys(userMacros).length !== 0) {
            katexOptions['macros'] = userMacros;
        }

        return {
            extendMarkdownIt(md) {
                require('katex/contrib/mhchem/mhchem');
                return md.use(require('markdown-it-task-lists'))
                    .use(require('@neilsustc/markdown-it-katex'), katexOptions);
            }
        }
    } else {
        return {
            extendMarkdownIt(md) {
                return md.use(require('markdown-it-task-lists'));
            }
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
    // Syntax decorations
    decorations.activate(context);
    // Images paths and math commands completions
    completion.activate(context);
    // Print to PDF
    print.activate(context);
    // Table formatter
    tableFormatter.activate(context);
    // Auto show preview to side
    preview.activate(context);

    // Allow `*` in word pattern for quick styling
    languages.setLanguageConfiguration('markdown', {
        wordPattern: /(-?\d*\.\d\w*)|([^\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s\，\。\《\》\？\；\：\‘\“\’\”\（\）\【\】\、]+)/g
    });

    newVersionMessage(context.extensionPath);
}

function newVersionMessage(extensionPath: string) {
    let data: string, currentVersion: string;
    try {
        data = fs.readFileSync(`${extensionPath}${path.sep}package.json`).toString();
        currentVersion = JSON.parse(data).version;
        if (
            fs.existsSync(`${extensionPath}${path.sep}VERSION`)
            && fs.readFileSync(`${extensionPath}${path.sep}VERSION`).toString() === currentVersion
        ) {
            return;
        }
        fs.writeFileSync(`${extensionPath}${path.sep}VERSION`, currentVersion);
    } catch (error) {
        console.log(error);
        return;
    }
    const featureMsg = getNewFeatureMsg(currentVersion);
    if (featureMsg === undefined) return;
    const message1 = localize("showMe");
    const message2 = localize("dismiss");
    window.showInformationMessage(featureMsg, message1, message2).then(option => {
        switch (option) {
            case message1:
                showChangelog();
            case message2:
                break;
        }
    });
}

export function deactivate() { }
