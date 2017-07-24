import * as assert from 'assert';

import * as vscode from 'vscode';
import { commands, window, Position, Range, Selection, Uri } from 'vscode';
import * as path from 'path'

let testMdFile = path.join(__dirname, '..', '..', 'test', 'test.md');

function testCommand(command: string, lines: string[], selection: Selection, expLines: string[], expSelection: Selection) {
    console.log('selection before', toString(selection));
    // return vscode.workspace.openTextDocument(testMdFile).then(document => {
    //     // open a document
    //     return vscode.window.showTextDocument(document);
    // }).then(editor => {
    //     // add initial text
    //     return editor.edit(editBuilder => {
    //         let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
    //         editBuilder.delete(fullRange);
    //         editBuilder.insert(new Position(0, 0), lines.join('\n'));
    //     });
    // }).then(b => {
    //     // set cursor and execute command
    //     window.activeTextEditor.selection = selection;
    //     return commands.executeCommand(command);
    // }).then(() => {
    //     // assert
    //     console.log('selection after', toString(window.activeTextEditor.selection));
    //     console.log('selection expected', toString(expSelection));
    //     assert.deepEqual(window.activeTextEditor.selection, expSelection);

    //     assert.deepEqual(window.activeTextEditor.document.getText(), expLines.join('\n'));
    // });

    return vscode.workspace.openTextDocument(testMdFile).then(document => {
        return vscode.window.showTextDocument(document).then(editor => {
            return editor.edit(editBuilder => {
                let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
                editBuilder.delete(fullRange);
                editBuilder.insert(new Position(0, 0), lines.join('\n'));
            }).then(b => {
                window.activeTextEditor.selection = selection;
                return vscode.commands.executeCommand(command).then(() => {
                    console.log('selection after', toString(window.activeTextEditor.selection));
                    console.log('selection expected', toString(expSelection));
                    assert.deepEqual(window.activeTextEditor.selection, expSelection);

                    assert.deepEqual(window.activeTextEditor.document.getText(), expLines.join('\n'));
                });
            });
        });
    });
}

function toString(s: Selection): string {
    return `(${s.start.line}, ${s.start.character}, ${s.end.line}, ${s.end.character})`;
}

suite("Formatting (italic, bold ...).", () => {
    test("Toggle bold", done => {
        testCommand('markdown.extension.editing.toggleBold', ['text'], new Selection(0, 2, 0, 2), ['**text**'], new Selection(0, 4, 0, 4)).then(done, done);
    });
});