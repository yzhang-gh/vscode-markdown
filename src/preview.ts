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

    // Override default preview keybindings (from 'open preview' to 'toggle preview' i.e. 'open/close preview')
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.togglePreview', () => {
            let editor = window.activeTextEditor;
            if (!editor) {
                commands.executeCommand('workbench.action.closeActiveEditor');
            } else if (editor.document.languageId === 'markdown') {
                commands.executeCommand('markdown.showPreview');
            }
        }),
        commands.registerCommand('markdown.extension.closePreviewToSide', () => {
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
