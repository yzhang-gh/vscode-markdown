import * as assert from 'assert';

import { commands, window, workspace, Position, Range, Selection, Uri } from 'vscode';
import * as path from 'path'

let testMdFile = path.join(__dirname, '..', '..', 'test', 'test.md');
let defaultConfigs = {
    "markdown.extension.toc.depth": 6,
    "markdown.extension.toc.orderedList": false,
    "markdown.extension.toc.plaintext": false,
    "markdown.extension.toc.updateOnSave": true,
    "markdown.extension.preview.autoShowPreviewToSide": false,
    "markdown.extension.orderedList.marker": "one",
    "markdown.extension.italic.indicator": "*",
    "markdown.extension.quickStyling": false
}

// 💩 Promise, then, async/await ... <https://github.com/Microsoft/vscode/issues/31210>

async function testCommand(command: string, configs, lines: string[], selection: Selection, expLines: string[], expSelection: Selection) {
    let tempConfigs = defaultConfigs;
    for (let key in configs) {
        if (configs.hasOwnProperty(key)) {
            tempConfigs[key] = configs[key];
        }
    }
    for (let key in tempConfigs) {
        if (tempConfigs.hasOwnProperty(key)) {
            await workspace.getConfiguration().update(key, tempConfigs[key], true);
        }
    }
    return workspace.openTextDocument(testMdFile).then(document => {
        return window.showTextDocument(document).then(editor => {
            return editor.edit(editBuilder => {
                let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
                editBuilder.delete(fullRange);
                editBuilder.insert(new Position(0, 0), lines.join('\n'));
            }).then(b => {
                window.activeTextEditor.selection = selection;
                return commands.executeCommand(command).then(num => {
                    assert.deepEqual(window.activeTextEditor.document.getText(), expLines.join('\n'));
                    assert.deepEqual(window.activeTextEditor.selection, expSelection);
                });
            });
        });
    });
}

function toString(s: Selection): string {
    return `(${s.start.line}, ${s.start.character}, ${s.end.line}, ${s.end.character})`;
}

suite("Formatting.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test timeout
        await workspace.openTextDocument(testMdFile);

        for (let key in defaultConfigs) {
            if (defaultConfigs.hasOwnProperty(key)) {
                defaultConfigs[key] = workspace.getConfiguration().get(key);
            }
        }
    });
    suiteTeardown(async () => {
        for (let key in defaultConfigs) {
            if (defaultConfigs.hasOwnProperty(key)) {
                await workspace.getConfiguration().update(key, defaultConfigs[key], true);
            }
        }
    });
    test("Toggle bold. No selection (no quick styling). Toggle on", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": false }, ['text'], new Selection(0, 4, 0, 4), ['text****'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Toggle bold. No selection (no quick styling). Toggle off", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": false }, ['text****'], new Selection(0, 6, 0, 6), ['text'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. No selection (no quick styling). `**text|**` -> `**text**|`", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": false }, ['**text**'], new Selection(0, 6, 0, 6), ['**text**'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle bold. No selection (quick styling). Toggle on (1)", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": true }, ['text'], new Selection(0, 4, 0, 4), ['**text**'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle bold. No selection (quick styling). Toggle on (2)", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": true }, ['text'], new Selection(0, 2, 0, 2), ['**text**'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. No selection (quick styling). Toggle off (1)", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": true }, ['**text**'], new Selection(0, 8, 0, 8), ['text'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. No selection (quick styling). Toggle off (2)", done => {
        testCommand('markdown.extension.editing.toggleBold', { "markdown.extension.quickStyling": true }, ['**text**'], new Selection(0, 4, 0, 4), ['text'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle on", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 0, 0, 4), ['**text**'], new Selection(0, 0, 0, 8)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle off", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 0, 0, 8), ['text'], new Selection(0, 0, 0, 4)).then(done, done);
    });

    test("Toggle italic. Use `*`", done => {
        testCommand('markdown.extension.editing.toggleItalic', { 'markdown.extension.italic.indicator': '*' }, ['text'], new Selection(0, 0, 0, 4), ['*text*'], new Selection(0, 0, 0, 6)).then(done, done);
    });

    test("Toggle italic. Use `_`", done => {
        testCommand('markdown.extension.editing.toggleItalic', { 'markdown.extension.italic.indicator': '_' }, ['text'], new Selection(0, 0, 0, 4), ['_text_'], new Selection(0, 0, 0, 6)).then(done, done);
    });

});