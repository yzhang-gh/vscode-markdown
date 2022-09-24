'use strict'

import { commands, ExtensionContext, Position, TextDocument } from 'vscode';
import type IDisposable from "../IDisposable";

interface IContextService extends IDisposable {
    onActivate(context: ExtensionContext): void;

    /**
     * handler of onDidChangeActiveTextEditor
     * implement this method to handle that event to update context state
     */
    onDidChangeActiveTextEditor(document: TextDocument, cursorPos: Position): void;
    /**
     * handler of onDidChangeTextEditorSelection
     * implement this method to handle that event to update context state
     */
    onDidChangeTextEditorSelection(document: TextDocument, cursorPos: Position): void;
}

export abstract class AbsContextService implements IContextService {
    public abstract readonly contextName: string;

    /**
     * activate context service
     * @param context ExtensionContext
     */
    public abstract onActivate(context: ExtensionContext): void;
    public abstract dispose(): void;

    /**
     * default handler of onDidChangeActiveTextEditor, do nothing.
     * override this method to handle that event to update context state.
     */
    public abstract onDidChangeActiveTextEditor(document: TextDocument, cursorPos: Position): void;

    /**
    * default handler of onDidChangeTextEditorSelection, do nothing.
    * override this method to handle that event to update context state.
    */
    public abstract onDidChangeTextEditorSelection(document: TextDocument, cursorPos: Position): void;

    /**
     * set state of context
     */
    protected setState(state: any) {
        commands.executeCommand('setContext', this.contextName, state);
    }
}
