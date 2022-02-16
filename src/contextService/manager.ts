'use strict'

import type IDisposable from "../IDisposable";
import { ExtensionContext } from 'vscode';

export class ContextServiceManager implements IDisposable {

    public constructor() {
    }

    public activate(context: ExtensionContext) {
    }

    public dispose(): void {
    }
}

export const contextServiceManager = new ContextServiceManager();
