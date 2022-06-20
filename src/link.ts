import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider({ language: "markdown" }, {
        provideDocumentLinks(document, token) {
            if (!vscode.workspace.getConfiguration().get<boolean>("markdown.extension.theming.decoration.hideMarkdownSyntax")) { return }
            const result: vscode.DocumentLink[] = []
            for (const m of document.getText().matchAll(/(?<!!)\[(?:[^\[\]]*?)\]\(([^\n\r]*?)\)/g)) {
                // https://github.com/microsoft/vscode/blob/5dd9d5d49196285536422e18205fe5dea59833e1/extensions/markdown-language-features/src/languageFeatures/documentLinkProvider.ts#L497
                let target: vscode.Uri
                if (/^\w+:\/\//.test(m[1])) { // external
                    target = vscode.Uri.parse(m[1])
                } else if (m[1].startsWith("^")) { // reference
                    continue // TODO
                } else {  // internal
                    const fragmentPos = m[1].indexOf("#")
                    target = vscode.Uri.parse(`command:_markdown.openDocumentLink?${encodeURIComponent(JSON.stringify({
                        // TODO: https://github.com/microsoft/vscode/blob/5dd9d5d49196285536422e18205fe5dea59833e1/extensions/markdown-language-features/src/languageFeatures/documentLinkProvider.ts#L65
                        parts: vscode.Uri.joinPath(document.uri, m[1].slice(0, fragmentPos)),
                        fragment: fragmentPos === -1 ? "" : m[1].slice(fragmentPos + 1),
                        fromResource: document.uri,
                    }))}`)
                }

                result.push(new vscode.DocumentLink(new vscode.Range(document.positionAt(m.index!), document.positionAt(m.index! + m[0].length)), target))
            }
            return result
        },
    }))
}
