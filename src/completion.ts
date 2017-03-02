'use strict'

import * as vscode from 'vscode';
import * as fs from 'fs';

let indexedItems = {};

export function activate(context: vscode.ExtensionContext) {
    fs.readFile(context.asAbsolutePath('data/words'), (err, data) => {
        if (err) throw err;
        const indexes = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
        indexes.forEach(i => {
            indexedItems[i] = [];
        });
        let words = data.toString().split('\n');
        words.forEach(word => {
            let firstLetter = word.charAt(0).toLowerCase();
            indexedItems[firstLetter].push(new vscode.CompletionItem(word, vscode.CompletionItemKind.Text));
        });
    });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('markdown', new MarkdownCompletionItemProvider()));
}

/**
 * Provide completion according to the first letter
 */
class MarkdownCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        if (vscode.workspace.getConfiguration('markdown.extension.completion').get<boolean>('enabled')) {
            let textBefore = document.lineAt(position.line).text.substring(0, position.character);
            let firstLetter = textBefore.split(' ').pop().charAt(0).toLowerCase();
            return new Promise((resolve, reject) => { resolve(indexedItems[firstLetter]); });
        } else {
            return new Promise((resolve, reject) => { reject(); });
        }
    }
}
