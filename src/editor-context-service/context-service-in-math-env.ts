'use strict'

import { ExtensionContext, Position, TextDocument, window } from 'vscode';
import { AbsContextService } from "./i-context-service";
import { mathEnvCheck } from "../util/contextCheck";

export class ContextServiceEditorInMathEn extends AbsContextService {
    public contextName: string = "markdown.extension.editor.cursor.inMathEnv";

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
        if (mathEnvCheck(document, cursorPos)) {
            this.setState(true);
        }
        else {
            this.setState(false);
        }
        return;
    }
}
