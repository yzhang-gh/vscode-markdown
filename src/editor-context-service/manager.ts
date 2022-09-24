'use strict'

import type IDisposable from "../IDisposable";
import { ExtensionContext, window } from 'vscode';
import { AbsContextService } from "./i-context-service";
import { ContextServiceEditorInList } from "./context-service-in-list";
import { ContextServiceEditorInFencedCodeBlock } from "./context-service-in-fenced-code-block";
import { ContextServiceEditorInMathEn } from "./context-service-in-math-env";

export class ContextServiceManager implements IDisposable {
    private readonly contextServices: Array<AbsContextService> = [];

    public constructor() {
        // push context services
        this.contextServices.push(new ContextServiceEditorInList());
        this.contextServices.push(new ContextServiceEditorInFencedCodeBlock());
        this.contextServices.push(new ContextServiceEditorInMathEn());
    }

    public activate(context: ExtensionContext) {
        for (const service of this.contextServices) {
            service.onActivate(context);
        }
        // subscribe update handler for context
        context.subscriptions.push(
            window.onDidChangeActiveTextEditor(() => this.onDidChangeActiveTextEditor()),
            window.onDidChangeTextEditorSelection(() => this.onDidChangeTextEditorSelection())
        );
        // initialize context state
        this.onDidChangeActiveTextEditor();
    }

    public dispose(): void {
        while (this.contextServices.length > 0) {
            const service = this.contextServices.pop();
            service!.dispose();
        }
    }

    private onDidChangeActiveTextEditor() {
        const editor = window.activeTextEditor;
        if (editor === undefined) {
            return;
        }

        const cursorPos = editor.selection.start;
        const document = editor.document;

        for (const service of this.contextServices) {
            service.onDidChangeActiveTextEditor(document, cursorPos);
        }
    }

    private onDidChangeTextEditorSelection() {
        const editor = window.activeTextEditor;
        if (editor === undefined) {
            return;
        }

        const cursorPos = editor.selection.start;
        const document = editor.document;

        for (const service of this.contextServices) {
            service.onDidChangeTextEditorSelection(document, cursorPos);
        }
    }
}

export const contextServiceManager = new ContextServiceManager();
