'use strict';

import { ExtensionContext, languages, Uri, window, workspace } from 'vscode';
import { configManager } from "./configuration/manager";
import { contextServiceManager } from "./editor-context-service/manager"
import { decorationManager } from "./theming/decorationManager";
import * as completion from './completion';
import * as formatting from './formatting';
import * as listEditing from './listEditing';
import { commonMarkEngine, MarkdownIt, mdEngine } from "./markdownEngine";
import { extendMarkdownIt } from "./markdown-it-plugin-provider";
import { config as configNls, localize } from './nls';
import resolveResource from "./nls/resolveResource";
import * as preview from './preview';
import * as print from './print';
import * as tableFormatter from './tableFormatter';
import * as toc from './toc';
import { importZolaSlug } from './util/slugify';

export function activate(context: ExtensionContext) {
    configNls({ extensionContext: context });

    context.subscriptions.push(
        configManager, contextServiceManager, decorationManager, commonMarkEngine, mdEngine
    );

    // wasm modules need to be imported asynchronously (or any modules relying on them synchronously need to be imported asynchronously)
    importZolaSlug().then(() => {
        // we need to wait for the wasm module to be loaded before we can use it, it should only take a few milliseconds
        // if we move the activateMdExt function outside of this promise, slugify might be called before the wasm module has loaded which will cause it to fail
        activateMdExt(context);
    });

    return { extendMarkdownIt };
}

function activateMdExt(context: ExtensionContext) {
    // Context services
    contextServiceManager.activate(context);
    // Override `Enter`, `Tab` and `Backspace` keys
    listEditing.activate(context);
    // Shortcuts
    formatting.activate(context);
    // Toc
    toc.activate(context);
    // Images paths and math commands completions
    completion.activate(context);
    // Print to PDF
    print.activate(context);
    // Table formatter
    tableFormatter.activate(context);
    // Auto show preview to side
    preview.activate(context);

    // Allow `*` in word pattern for quick styling (toggle bold/italic without selection)
    // original https://github.com/microsoft/vscode/blob/3e5c7e2c570a729e664253baceaf443b69e82da6/extensions/markdown-basics/language-configuration.json#L55
    languages.setLanguageConfiguration('markdown', {
        wordPattern: /([*_]{1,2}|~~|`+)?[\p{Alphabetic}\p{Number}\p{Nonspacing_Mark}]+(_+[\p{Alphabetic}\p{Number}\p{Nonspacing_Mark}]+)*\1/gu
    });

    showWelcome(context);
}

/**
 * Shows a welcome message on first time startup.
 */
async function showWelcome(context: ExtensionContext): Promise<void> {
    const welcomeDirUri = Uri.joinPath(context.extensionUri, "welcome");

    // The directory for an extension is recreated every time VS Code installs it.
    // Thus, we only need to read and write an empty flag file there.
    // If the file exists, then it's not the first time, and we don't need to do anything.
    const flagFileUri = Uri.joinPath(welcomeDirUri, "WELCOMED");
    try {
        await workspace.fs.stat(flagFileUri);
        return;
    } catch {
        workspace.fs.writeFile(flagFileUri, new Uint8Array()).then(() => { }, () => { });
    }

    // The existence of welcome materials depends on build options we set during pre-publish.
    // If any condition is not met, then we don't need to do anything.
    try {
        // Confirm the message is valid.
        // `locale` should be a string. But here we keep it `any` to suppress type checking.
        const locale: any = JSON.parse(process.env.VSCODE_NLS_CONFIG as string).locale;
        const welcomeMessageFileUri = Uri.file(resolveResource(welcomeDirUri.fsPath, "", ".txt", [locale, "en"], "")![0]);
        const msgWelcome = Buffer.from(await workspace.fs.readFile(welcomeMessageFileUri)).toString("utf8");
        if (/^\s*$/.test(msgWelcome) || /\p{C}/u.test(msgWelcome)) {
            return;
        }

        // Confirm the file exists.
        const changelogFileUri = Uri.joinPath(context.extensionUri, "changes.md");
        await workspace.fs.stat(changelogFileUri);

        const btnDismiss = localize("ui.welcome.buttonDismiss");
        const btnOpenLocal = localize("ui.welcome.buttonOpenLocal");

        window.showInformationMessage(msgWelcome, btnOpenLocal, btnDismiss).then(selection => {
            switch (selection) {
                case btnOpenLocal:
                    workspace.openTextDocument(changelogFileUri).then(window.showTextDocument);
                    return;
            }
        });
    } catch { }
}

export function deactivate() { }
