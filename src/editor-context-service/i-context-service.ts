'use strict'

import { commands, ExtensionContext, Position, TextDocument } from 'vscode';
import type IDisposable from "../IDisposable";

interface IContextService extends IDisposable {
    onActivate(context: ExtensionContext);

    /**
     * handler of onDidChangeActiveTextEditor
     * implement this method to handle that event to update context state
     */
    onDidChangeActiveTextEditor(document: TextDocument, cursorPos: Position);
    /**
     * handler of onDidChangeTextEditorSelection
     * implement this method to handle that event to update context state
     */
    onDidChangeTextEditorSelection(document: TextDocument, cursorPos: Position);
}

export abstract class AbsContextService implements IContextService {
    constructor(contextName: string) {
        this.contextName = contextName;
    }

    protected readonly contextName: string;

    /**
     * activate context service
     * @param context ExtensionContext
     */
    public abstract onActivate(context: ExtensionContext);
    public abstract dispose(): void;

    /**
     * default handler of onDidChangeActiveTextEditor, do nothing.
     * override this method to handle that event to update context state.
     */
     public onDidChangeActiveTextEditor(document: TextDocument, cursorPos: Position) { }

     /**
     * default handler of onDidChangeTextEditorSelection, do nothing.
     * override this method to handle that event to update context state.
     */
     public onDidChangeTextEditorSelection(document: TextDocument, cursorPos: Position) { }

    /**
     * set state of context
     */
    protected setState(state: any) {
        commands.executeCommand('setContext', this.contextName, state);
    } 
}
