'use strict';

import { ExtensionContext, languages, Uri, window, workspace } from 'vscode';
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
    // Thus, we only need to read and write an empty flag file there.
    // If the file exists, then it's not the first time, and we don't need to do anything.
    const flagFileUri = Uri.joinPath(context.extensionUri, "WELCOMED");
    try {
        await workspace.fs.stat(flagFileUri);
        return;
    } catch {
        workspace.fs.writeFile(flagFileUri, new Uint8Array()).then(() => { }, () => { });
    }

    // The existence of welcome materials depends on build options we set during pre-publish.
    // If any condition is not met, then we don't need to do anything.
    try {
        const welcomeMessageFileUri = Uri.joinPath(context.extensionUri, "welcome.txt");
        const msgWelcome = Buffer.from(await workspace.fs.readFile(welcomeMessageFileUri)).toString("utf8");
        if (/^\s*$/.test(msgWelcome) || /\p{C}/u.test(msgWelcome)) {
            return;
        }

        const changelogFileUri = Uri.joinPath(context.extensionUri, "changes.md");
        await workspace.fs.stat(changelogFileUri);

        const btnOpenLocal = localize("ui.welcome.buttonOpenLocal");

        window.showInformationMessage(msgWelcome, btnOpenLocal).then(selection => {
            switch (selection) {
                case btnOpenLocal:
                    workspace.openTextDocument(changelogFileUri).then(window.showTextDocument);
                    return;
            }
        });
    } catch { }
}

export function deactivate() { }
