import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("Formatting.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test to be treated timeout
        await workspace.openTextDocument(testMdFile);

        for (let key in previousConfigs) {
            if (previousConfigs.hasOwnProperty(key)) {
                previousConfigs[key] = workspace.getConfiguration('', null).get(key);
            }
        }
    });

    suiteTeardown(async () => {
        for (let key in previousConfigs) {
            if (previousConfigs.hasOwnProperty(key)) {
                await workspace.getConfiguration('', null).update(key, previousConfigs[key], true);
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