import { workspace, Selection, env } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("Formatting.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test to be treated timeout
        await workspace.openTextDocument(testMdFile);

        for (let key of Object.keys(previousConfigs)) {
            previousConfigs[key] = workspace.getConfiguration('', null).get(key);
        }
    });

    suiteTeardown(async () => {
        for (let key of Object.keys(previousConfigs)) {
            await workspace.getConfiguration('', null).update(key, previousConfigs[key], true);
        }
    });

    test("Toggle bold. `text |` -> `text **|**`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text '], new Selection(0, 5, 0, 5), ['text ****'], new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Toggle bold. `text **|**` -> `text |`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text ****'], new Selection(0, 7, 0, 7), ['text '], new Selection(0, 5, 0, 5)).then(done, done);
    });

    test("Toggle bold. `text**|**` -> `text|`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text****'], new Selection(0, 6, 0, 6), ['text'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. `**text|**` -> `**text**|`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 6, 0, 6), ['**text**'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle bold. `text|` -> `**text**|`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 4, 0, 4), ['**text**'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle bold. `te|xt` -> `**te|xt**`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 2, 0, 2), ['**text**'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. `**text**|` -> `text|`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 8, 0, 8), ['text'], new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Toggle bold. `**te|xt**` -> `te|xt`", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 4, 0, 4), ['text'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle on", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['text'], new Selection(0, 0, 0, 4), ['**text**'], new Selection(0, 0, 0, 8)).then(done, done);
    });

    test("Toggle bold. With selection. Toggle off", done => {
        testCommand('markdown.extension.editing.toggleBold', {}, ['**text**'], new Selection(0, 0, 0, 8), ['text'], new Selection(0, 0, 0, 4)).then(done, done);
    });

    test("Toggle italic. Use `*`", done => {
        testCommand('markdown.extension.editing.toggleItalic', {}, ['text'], new Selection(0, 0, 0, 4), ['*text*'], new Selection(0, 0, 0, 6)).then(done, done);
    });

    test("Toggle italic. Use `_`", done => {
        testCommand('markdown.extension.editing.toggleItalic', { 'markdown.extension.italic.indicator': '_' }, ['text'], new Selection(0, 0, 0, 4), ['_text_'], new Selection(0, 0, 0, 6)).then(done, done);
    });

    test("Toggle strikethrough. `text|` -> `~~text~~|`", done => {
        testCommand('markdown.extension.editing.toggleStrikethrough', {}, ['text'], new Selection(0, 4, 0, 4), ['~~text~~'], new Selection(0, 8, 0, 8)).then(done, done);
    });

    test("Toggle strikethrough. List item", done => {
        testCommand('markdown.extension.editing.toggleStrikethrough', {}, ['- text text'], new Selection(0, 11, 0, 11), ['- ~~text text~~'], new Selection(0, 15, 0, 15)).then(done, done);
    });

    test("Toggle strikethrough. Task list item", done => {
        testCommand('markdown.extension.editing.toggleStrikethrough', {}, ['- [ ] text text'], new Selection(0, 15, 0, 15), ['- [ ] ~~text text~~'], new Selection(0, 19, 0, 19)).then(done, done);
    });

    // disclaimer: I am not sure about this code. Looks like it works fine, but I am not fully undestand how it works underneath.
    test("Paste link on selected text. `|text|` -> `[text|](link)`", async () => {
        const link = 'http://just.a.link';
        await env.clipboard.writeText(link);

        return testCommand('markdown.extension.editing.paste', {}, ['text'], new Selection(0, 0, 0, 4), ['[text](' + link + ')'], new Selection(0, 5, 0, 5));
    });
});
