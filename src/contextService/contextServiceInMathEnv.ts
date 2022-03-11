'use strict'

import { ExtensionContext, Position, TextDocument, window } from 'vscode';
import { AbsContextService } from "./IContextService";
import { mathEnvCheck } from "../util/contextCheck";

export class ContextServiceEditorInMathEn extends AbsContextService {
    public onActivate(context: ExtensionContext) {
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
