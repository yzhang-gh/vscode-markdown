import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("No list editing.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test timeout
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

    test("Enter key. Disable in fenced code block", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '```',
                '- item1'
            ],
            new Selection(1, 7, 1, 7),
            [
                '```',
                '- item1',
                ''
            ],
            new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. Respect indentation rules", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '```',
                '{}'
            ],
            new Selection(1, 1, 1, 1),
            [
                '```',
                '{',
                '    ',
                '}'
            ],
            new Selection(2, 4, 2, 4)).then(done, done);
    });

    test("Backspace key: '-  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '-  item1'
            ],
            new Selection(0, 3, 0, 3),
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key: '  -  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '  -  item1'
            ],
            new Selection(0, 5, 0, 5),
            [
                '  - item1'
            ],
            new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Backspace key: '- [ ]  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '- [ ]  item1'
            ],
            new Selection(0, 7, 0, 7),
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Shift tab key: '    text'", done => {
        testCommand('markdown.extension.onShiftTabKey', {},
            [
                '    text'
            ],
            new Selection(0, 5, 0, 5),
            [
                'text'
            ],
            new Selection(0, 1, 0, 1)).then(done, done);
    });
});
