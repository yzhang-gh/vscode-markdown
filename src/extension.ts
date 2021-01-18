'use strict';

import { commands, ExtensionContext, extensions, languages, Uri, window, workspace } from 'vscode';
import * as completion from './completion';
import * as formatting from './formatting';
import * as listEditing from './listEditing';
import localize from './localize';
import * as preview from './preview';
import * as print from './print';
import * as decorations from './syntaxDecorations';
import * as tableFormatter from './tableFormatter';
import * as toc from './toc';

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

    showWelcome(context);
}

/**
 * Shows a welcome message on first time startup.
 */
async function showWelcome(context: ExtensionContext): Promise<void> {
    // The directory for an extension is recreated every time VS Code installs it.
    // Thus, we only need to read and write an empty file there.
    // If the file exists, then it's not the first time, and we don't need to do anything.
    const checkFileUri = Uri.joinPath(context.extensionUri, "VERSION");
    try {
        await workspace.fs.stat(checkFileUri);
        return;
    } catch (e) {
        workspace.fs.writeFile(checkFileUri, new Uint8Array()).then(() => { }, () => { });
    }

    const ourProduct = extensions.getExtension("yzhang.markdown-all-in-one");
    const productVersion: string = ourProduct.packageJSON["version"];
    const changelogFileUri = Uri.joinPath(context.extensionUri, "CHANGELOG.md");
    const changelogRemoteUri = Uri.parse("https://github.com/yzhang-gh/vscode-markdown/blob/master/CHANGELOG.md");
    const msgWelcome = localize("ui.welcome.message", productVersion);
    const btnOpenLocal = localize("ui.welcome.buttonOpenLocal");
    const btnReadOnline = localize("ui.welcome.buttonReadOnline");

    window.showInformationMessage(msgWelcome, btnOpenLocal, btnReadOnline).then(selection => {
        switch (selection) {
            case btnOpenLocal:
                workspace.openTextDocument(changelogFileUri).then(window.showTextDocument);
                break;

            case btnReadOnline:
                commands.executeCommand("vscode.open", changelogRemoteUri);
                break;
        }
    });
}

export function deactivate() { }
