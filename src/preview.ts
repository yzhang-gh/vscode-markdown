'use strict'

/**
 * Modified from https://github.com/hnw/vscode-auto-open-markdown-preview
 */
import { commands, window, workspace, ExtensionContext, TextDocument, TextEditor } from 'vscode';
import { log } from './util';

let currentDoc: TextDocument;

export function activate(context: ExtensionContext) {
    window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'markdown') {
            preview(editor);
        }
    });

    // The first time
    preview(window.activeTextEditor);
}

function preview(editor: TextEditor) {
    if (!workspace.getConfiguration('markdown.extension.preview').get<boolean>('autoShowPreviewToSide'))
        return;

    let doc = editor.document;
    if (doc != currentDoc) {
        commands.executeCommand('markdown.showPreviewToSide').then(() => {
            commands.executeCommand('workbench.action.navigateBack');
        });
        currentDoc = doc;
    }
}

// How to reuse preview editor (i.e. do not open new tab for each md file)
