'use strict'

/**
 * Modified from https://github.com/hnw/vscode-auto-open-markdown-preview
 */
import { commands, window, workspace, ExtensionContext, TextDocument, TextEditor } from 'vscode';
import { log } from './util';

let currentDoc;

export function activate(context: ExtensionContext) {
    window.onDidChangeActiveTextEditor(editor => {
        log('EditorChanged', editor);
        if (editor && editor.document.languageId === 'markdown') {
            if (editor.document != currentDoc) {
                // commands.executeCommand('workbench.action.closeEditorsInOtherGroups').then(() => {
                commands.executeCommand('markdown.showPreviewToSide');
                currentDoc = editor.document;
                // });
            }
        }
    });
}

// 1. Active status transfered by closing other editor will not fire 'onDidChangeActiveTextEditor'
// 2. How to reuse preview editor (i.e. do not open new tab for each md file)
