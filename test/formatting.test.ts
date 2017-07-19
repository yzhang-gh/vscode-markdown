import * as assert from 'assert';

import * as vscode from 'vscode';
import { Position, Selection, Uri } from 'vscode';
import * as myExtension from '../src/extension';

// function testFormatting(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection) {
//     let textEditor: vscode.TextEditor;
//     let textDocument: vscode.TextDocument;
//     return vscode.workspace.openTextDocument(Uri.parse('untitled:d:/test.md')).then(document => {
//         textDocument = document;
//         return vscode.window.showTextDocument(textDocument);
//     }).then(editor => {
//         assert(vscode.window.activeTextEditor, 'No active editor');
//         vscode.window.activeTextEditor.edit(editBuilder => {
//             editBuilder.insert(new Position(0, 0), lines.join());
//         });
//         return editor;
//     }).then(editor => {
//         vscode.window.activeTextEditor.document.save();
//         console.log('--------------------------------------------');
//         assert.equal(-1, 1);
//     });
// }

suite("Formatting (italic, bold ...)", () => {

    test("Toggle bold", () => {
        let textEditor: vscode.TextEditor;
        let textDocument: vscode.TextDocument;
        return vscode.workspace.openTextDocument(Uri.parse('untitled:d:/test.md')).then(document => {
            textDocument = document;
            return vscode.window.showTextDocument(textDocument);
        }).then(editor => {
            assert(vscode.window.activeTextEditor, 'No active editor');
            vscode.window.activeTextEditor.edit(editBuilder => {
                editBuilder.insert(new Position(0, 0), ["line1","line2"].join('\n'));
            });
            return editor;
        }).then(editor => {
            vscode.window.activeTextEditor.document.save();
            console.log('--------------------------------------------');
            assert.equal(-1, 1);
        });
    });
});