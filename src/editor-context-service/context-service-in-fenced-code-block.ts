'use strict'

import { ExtensionContext, Position, TextDocument, window } from 'vscode';
import { AbsContextService } from "./i-context-service";
import { isInFencedCodeBlock } from "../util/contextCheck";

export class ContextServiceEditorInFencedCodeBlock extends AbsContextService {
    public contextName: string = "markdown.extension.editor.cursor.inFencedCodeBlock";

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
        if (isInFencedCodeBlock(document, cursorPos.line)) {
            this.setState(true);
        }
        else {
            this.setState(false);
        }
        return;
    }
}
