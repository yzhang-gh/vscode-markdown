'use strict'

import { ExtensionContext, window } from 'vscode';
import { AbsContextService } from "./IContextService";
import { isInFencedCodeBlock, mathEnvCheck } from "../util/contextCheck";

export class ContextServiceEditorInMarkdownList extends AbsContextService {
    public activate(context: ExtensionContext) {
        // set initial state of context
        this.setState(false);

        // subscribe update handler for context
        context.subscriptions.push(
            window.onDidChangeActiveTextEditor(() => this.updateContextState()),
            window.onDidChangeTextEditorSelection(() => this.updateContextState())
        );
    }

    public dispose(): void { }

    protected updateContextState() {
        let editor = window.activeTextEditor;
        let cursorPos = editor.selection.start;
    
        if (isInFencedCodeBlock(editor.document, cursorPos.line) || mathEnvCheck(editor.document, cursorPos)) {
            this.setState(false);
        }
        else {
            let lineText = editor.document.lineAt(cursorPos.line).text;
            let inList = /^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.test(lineText);
            if(inList) {
                this.setState(true);
            }
            else {
                this.setState(false);
            }
        }
        return;
    }
}
