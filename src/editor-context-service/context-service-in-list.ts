'use strict'

import { ExtensionContext, Position, TextDocument, window } from 'vscode';
import { AbsContextService } from "./i-context-service";

export class ContextServiceEditorInList extends AbsContextService {
    public contextName: string = "markdown.extension.editor.cursor.inList";

    public onActivate(_context: ExtensionContext) {
        // set initial state of context
        this.setState(false);
    }

    public dispose(): void { }

    public onDidChangeActiveTextEditor(document: TextDocument, cursorPos: Position) {
        this.updateContextState(document, cursorPos);
    }

    public onDidChangeTextEditorSelection(document: TextDocument, cursorPos: Position) {
        this.updateContextState(document, cursorPos);
    }

    private updateContextState(document: TextDocument, cursorPos: Position) {
        let lineText = document.lineAt(cursorPos.line).text;

        let inList = /^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.test(lineText);
        if (inList) {
            this.setState(true);
        }
        else {
            this.setState(false);
        }
        return;
    }
}
