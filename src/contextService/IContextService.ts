'use strict'

import { commands, ExtensionContext } from 'vscode';
import type IDisposable from "../IDisposable";

interface IContextService extends IDisposable {
    activate(context: ExtensionContext);
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
    public abstract activate(context: ExtensionContext);
    public abstract dispose(): void;

    /**
     * handler to update context state
     */
    protected abstract updateContextState();

    /**
     * set state of context
     */
    protected setState(state: any) {
        commands.executeCommand('setContext', this.contextName, state);
    } 
}
