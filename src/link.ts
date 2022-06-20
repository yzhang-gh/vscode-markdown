import * as vscode from "vscode";
import { preprocess } from "micromark/lib/preprocess"
import { parse } from "micromark/lib/parse"
import { postprocess } from "micromark/lib/postprocess"


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider({ language: "markdown" }, {
        provideDocumentLinks(document, token) {
            if (["emphasis", "link", "strong", "strikethrough", "escape"].every((k) => !vscode.workspace.getConfiguration().get<boolean>(`markdown.extension.theming.autoHide.${k}`))) { return }
            const result: vscode.DocumentLink[] = []

            const text = document.getText()
            let labelRange: vscode.Range | undefined
            for (const [eventType, token, _tokenizeContext] of postprocess(parse({}).document().write(preprocess()(text, undefined, true)))) {
                if (eventType === "exit" && token.type === "label") {
                    labelRange = new vscode.Range(token.start.line - 1, token.start.column - 1, token.end.line - 1, token.end.column - 1)
                } else if (eventType === "enter" && token.type === "resourceDestinationString") {
                    const resource = text.slice(token.start.offset, token.end.offset)
                    let target: vscode.Uri
                    if (/^\w+:\/\//.test(text.slice(token.start.offset, token.end.offset))) { // external
                        target = vscode.Uri.parse(resource)
                    } else if (resource.startsWith("^")) { // reference
                        continue
                    } else {  // internal
                        const fragmentPos = resource.indexOf("#")
                        target = vscode.Uri.parse(`command:_markdown.openDocumentLink?${encodeURIComponent(JSON.stringify({
                            // TODO: https://github.com/microsoft/vscode/blob/5dd9d5d49196285536422e18205fe5dea59833e1/extensions/markdown-language-features/src/languageFeatures/documentLinkProvider.ts#L65
                            parts: vscode.Uri.joinPath(document.uri, resource.slice(0, fragmentPos)),
                            fragment: fragmentPos === -1 ? "" : resource.slice(fragmentPos + 1),
                            fromResource: document.uri,
                        }))}`)
                    }
                    result.push(new vscode.DocumentLink(labelRange, target))
                    labelRange = undefined
                }
            }

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
