'use strict'

import * as vscode from 'vscode';
import * as fs from 'fs';

let items: vscode.CompletionItem[] = [];

export function activate(context: vscode.ExtensionContext) {
    fs.readFile(context.asAbsolutePath('data/words'), (err, data) => {
        if (err) throw err;
        let words = data.toString().split('\n');
        items = words.map(word => new vscode.CompletionItem(word, vscode.CompletionItemKind.Text));
    });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('markdown', new MarkdownCompletionItemProvider()));
}

class MarkdownCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => { resolve(items); });
    }
}
