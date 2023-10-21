import * as vscode from "vscode";

// These are dedicated objects for the auto preview.
let debounceHandle: ReturnType<typeof setTimeout> | undefined;
let lastDoc: vscode.TextDocument | undefined;
const d0 = Object.freeze<vscode.Disposable & { _disposables: vscode.Disposable[] }>({
    _disposables: [],
    dispose: function () {
        for (const item of this._disposables) {
            item.dispose();
        }
        this._disposables.length = 0;

        if (debounceHandle) {
            clearTimeout(debounceHandle);
            debounceHandle = undefined;
        }

        lastDoc = undefined;
    },
});

export function activate(context: vscode.ExtensionContext) {
    // Register auto preview. And try showing preview on activation.
    const d1 = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("markdown.extension.preview")) {
            if (vscode.workspace.getConfiguration("markdown.extension.preview").get<boolean>("autoShowPreviewToSide")) {
                registerAutoPreview();
            } else {
                d0.dispose();
            }
        }
    });

    if (vscode.workspace.getConfiguration("markdown.extension.preview").get<boolean>("autoShowPreviewToSide")) {
        registerAutoPreview();
        triggerAutoPreview(vscode.window.activeTextEditor);
    }

    // `markdown.extension.closePreview` is just a wrapper for the `workbench.action.closeActiveEditor` command.
    // We introduce it to avoid confusing users in UI.
    // "Toggle preview" is achieved by contributing key bindings that very carefully match VS Code's default values.
    // https://github.com/yzhang-gh/vscode-markdown/pull/780
    const d2 = vscode.commands.registerCommand("markdown.extension.closePreview", () => {
        return vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    });

    // Keep code tidy.
    context.subscriptions.push(d1, d2, d0);
}

function registerAutoPreview() {
    d0._disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => triggerAutoPreview(editor)));
}

// VS Code dispatches a series of DidChangeActiveTextEditor events when moving tabs between groups, we don't want most of them.
function triggerAutoPreview(editor: vscode.TextEditor | undefined): void {
    // GitHub issues #1282, #1342
    const markdownRe = /(\.md|\.markdown)$/i
    if (!(editor && editor.document.uri.scheme === 'file' && markdownRe.test(editor.document.fileName))) {
        return;
    }

    if (debounceHandle) {
        clearTimeout(debounceHandle);
        debounceHandle = undefined;
    }

    // Usually, a user only wants to trigger preview when the currently and last viewed documents are not the same.
    const doc = editor.document;
    if (doc !== lastDoc) {
        lastDoc = doc;
        debounceHandle = setTimeout(() => autoPreviewToSide(editor), 100);
    }
}

/**
 * Shows preview for the editor.
 */
async function autoPreviewToSide(editor: vscode.TextEditor) {
    if (editor.document.isClosed) {
        return;
    }

    // Call `vscode.markdown-language-features`.
    await vscode.commands.executeCommand("markdown.showPreviewToSide");

    // Wait, as VS Code won't respond when it just opened a preview.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // VS Code 1.62 appears to make progress in https://github.com/microsoft/vscode/issues/9526
    // Thus, we must request the text editor directly with known view column (if available).
    await vscode.window.showTextDocument(editor.document, editor.viewColumn);
}
