import * as assert from 'assert';

import * as vscode from 'vscode';
import { commands, window, workspace, Position, Range, Selection, Uri } from 'vscode';
import * as path from 'path'

let testMdFile = path.join(__dirname, '..', '..', 'test', 'test.md');
let defaultConfigs = {
    'markdown.extension.italic.indicator': '*'
}

// 💩 Promise, then, async/await ... <https://github.com/Microsoft/vscode/issues/31210>

async function testCommand(command: string, configs, lines: string[], selection: Selection, expLines: string[], expSelection: Selection) {
    let oldConfig = {};
    for (var key in configs) {
        if (configs.hasOwnProperty(key)) {
            oldConfig[key] = workspace.getConfiguration().get(key);
            await workspace.getConfiguration().update(key, configs[key], true);
        }
    }
    await vscode.workspace.openTextDocument(testMdFile).then(document => {
        return vscode.window.showTextDocument(document).then(editor => {
            return editor.edit(editBuilder => {
                let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
                editBuilder.delete(fullRange);
                editBuilder.insert(new Position(0, 0), lines.join('\n'));
            }).then(b => {
                window.activeTextEditor.selection = selection;
                return vscode.commands.executeCommand(command).then(num => {
                    assert.deepEqual(window.activeTextEditor.document.getText(), expLines.join('\n'));
                    assert.deepEqual(window.activeTextEditor.selection, expSelection);
                });
            });
        });
    });
    for (var key in oldConfig) {
        if (oldConfig.hasOwnProperty(key)) {
            await workspace.getConfiguration().update(key, oldConfig[key], true);
        }
    }
}

function toString(s: Selection): string {
    return `(${s.start.line}, ${s.start.character}, ${s.end.line}, ${s.end.character})`;
}

suite("Formatting.", () => {
    test("Toggle bold. No selection. Toggle on", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 4, 0, 4), ['text****'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Toggle bold. No selection. Toggle off", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text****'], new Selection(0, 6, 0, 6), ['text'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle on", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 0, 0, 4), ['**text**'], new Selection(0, 0, 0, 8)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle off", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 0, 0, 8), ['text'], new Selection(0, 0, 0, 4)).then(done, done);
    });

    test("Toggle bold. Quick styling. Toggle on (1)", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 4, 0, 4), ['**text**'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle bold. Quick styling. Toggle on (2)", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 2, 0, 2), ['**text**'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. Quick styling. Toggle off (1)", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 8, 0, 8), ['text'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. Quick styling. Toggle off (2)", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 4, 0, 4), ['text'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Toggle italic. `*` or `_`", done => {
        testCommand('markdown.extension.editing.toggleItalic', { 'markdown.extension.italic.indicator': '*' }, ['text'], new Selection(0, 0, 0, 4), ['*text*'], new Selection(0, 0, 0, 6)).then(done, done);
    });

});