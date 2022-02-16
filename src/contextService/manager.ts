'use strict'

import type IDisposable from "../IDisposable";
import { ExtensionContext } from 'vscode';
import { ContextServiceEditorInMarkdownList } from "./contextServiceInMarkdownList";

export class ContextServiceManager implements IDisposable {
    private editorInMarkdownList: ContextServiceEditorInMarkdownList;

    public constructor() {
        this.editorInMarkdownList = new ContextServiceEditorInMarkdownList("markdown.extension.editor.cursor.inMarkdownList");
    }

    public activate(context: ExtensionContext) {
        this.editorInMarkdownList.activate(context);
    }

    public dispose(): void {
        this.editorInMarkdownList.dispose();
    }
}

export const contextServiceManager = new ContextServiceManager();
