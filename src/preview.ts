'use strict'

/**
 * Modified from https://github.com/hnw/vscode-auto-open-markdown-preview
 */
import { commands, ExtensionContext, TextDocument, TextEditor, window, workspace } from 'vscode';

let currentDoc: TextDocument;

export function activate(context: ExtensionContext) {
    window.onDidChangeActiveTextEditor(editor => {
        autoPreviewToSide(editor);
    });

    // Try preview when this extension is activated the first time
    autoPreviewToSide(window.activeTextEditor);

    // `markdown.extension.closePreview` is just a wrapper for the `workbench.action.closeActiveEditor` command.
    // We introduce it to avoid confusing users in UI.
    // "Toggle preview" is achieved by contributing key bindings that very carefully match VS Code's default values.
    // https://github.com/yzhang-gh/vscode-markdown/pull/780
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.closePreview', () => {
            commands.executeCommand('workbench.action.closeActiveEditor');
        })
    );
}

function autoPreviewToSide(editor: TextEditor) {
    if (!workspace.getConfiguration('markdown.extension.preview').get<boolean>('autoShowPreviewToSide'))
        return;
    if (!editor || editor.document.languageId !== 'markdown')
        return;

    let doc = editor.document;
    if (doc != currentDoc) {
        commands.executeCommand('markdown.showPreviewToSide')
            .then(() => { commands.executeCommand('workbench.action.navigateBack'); });
        currentDoc = doc;
    }
}

// How to reuse preview editor (i.e. do not open new tab for each md file)
