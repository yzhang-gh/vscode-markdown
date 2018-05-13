'use strict'

import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, Position, ProviderResult, TextDocument, languages, workspace } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider({ scheme: 'file', language: 'markdown' }, new MdCompletionItemProvider(), '(', '\\', '/'));
}

class MdCompletionItemProvider implements CompletionItemProvider {
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
        if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

        let textBefore = document.lineAt(position.line).text.substring(0, position.character);

        if (!/!\[[^\]]*?\]\([^\)]*$/.test(textBefore)) return [];

        let matches = textBefore.match(/!\[[^\]]*?\]\(([^\)]*?)[\\\/]?[^\\\/]*$/);
        let dir = matches[1].replace(/\\/g, '/');

        return workspace.findFiles((dir.length == 0 ? '' : dir + '/') + '**/*.{png,jpg,jpeg,svg,gif}', '**/node_modules/**').then(uris =>
            uris.map(uri => {
                let relPath = path.relative(path.join(workspace.getWorkspaceFolder(uri).uri.fsPath, dir), uri.fsPath);
                relPath.replace(/\\/g, '/');
                return new CompletionItem(relPath, CompletionItemKind.File);
            })
        );
    }
}
