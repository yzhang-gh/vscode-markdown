import * as assert from 'assert';

import * as vscode from 'vscode';
import { commands, window, Position, Range, Selection, Uri } from 'vscode';
import * as path from 'path'

let testMdFile = path.join(__dirname, '..', '..', 'test', 'test.md');

function testCommand(command: string, lines: string[], selection: Selection, expLines: string[], expSelection: Selection) {
    return vscode.workspace.openTextDocument(testMdFile).then(doc => {
        return vscode.window.showTextDocument(doc);
    }).then(editor => {
        assert(vscode.window.activeTextEditor, 'No active editor');
        return editor.edit(editBuilder => {
            let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
            editBuilder.delete(fullRange);
            editBuilder.insert(new Position(0, 0), lines.join('\n'));
        });
    }).then(() => {
        window.activeTextEditor.selection = selection;
        return commands.executeCommand(command);
    }).then(() => {
        assert.deepEqual(window.activeTextEditor.document.getText(), expLines.join('\n'));
        assert.deepEqual(window.activeTextEditor.selection, expSelection);
    });
}

suite("Formatting (italic, bold ...).", () => {

    test("Toggle bold", done => {
        testCommand('markdown.extension.editing.toggleItalic', ['text'], new Selection(0, 2, 0, 2), ['****text'], new Selection(0, 2, 0, 2)).then(done, done);
    });
});