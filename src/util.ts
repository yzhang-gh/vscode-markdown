'use strict'

import { Position, Range, TextDocument } from 'vscode';

export function log(msg: string, obj?) {
    if (obj) {
        let toStr;
        if (obj instanceof Range) {
            toStr = `Range (${obj.start.line + 1}, ${obj.start.character + 1}), (${obj.end.line + 1}, ${obj.end.character + 1})`;
        } else if (obj instanceof Position) {
            toStr = `Position (${obj.line + 1}, ${obj.character + 1})`;
        } else if (obj.fileName !== undefined && obj.languageId !== undefined) { // TextDocument
            toStr = `TextDocument {fileName: ${obj.fileName}, languageId: ${obj.languageId}}`;
        } else if (obj.document !== undefined) { // TextEditor
            toStr = `TextEditor {doc: {fileName: ${obj.document.fileName}, languageId: ${obj.document.languageId}}}`;
        } else {
            toStr = obj;
        }
        console.log(`${msg}: ${toStr}`);
    } else {
        console.log(msg);
    }
}
