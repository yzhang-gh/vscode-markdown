import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("List editing.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test to be treated timeout
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

    test("Enter key. Continue list item", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['- item1'], new Selection(0, 7, 0, 7), ['- item1', '- '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Don't continue empty list item", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['- item1', '- '], new Selection(1, 2, 1, 2), ['- item1', '', ''], new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. List marker `*`", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['* item1'], new Selection(0, 7, 0, 7), ['* item1', '* '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Disable in fenced code block", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['```', '- item1'], new Selection(1, 7, 1, 7), ['```', '- item1', ''], new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. Respect indentation rules", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['```', '{}'], new Selection(1, 1, 1, 1), ['```', '{', '    ', '}'], new Selection(2, 4, 2, 4)).then(done, done);
    });

    test("Enter key. Continue GFM checkbox item", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['- [ ] item1'], new Selection(0, 11, 0, 11), ['- [ ] item1', '- [ ] '], new Selection(1, 6, 1, 6)).then(done, done);
    });

    test("Backspace key. 1: '- |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {}, ['- item1'], new Selection(0, 2, 0, 2), ['item1'], new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Backspace key. 2: '-  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {}, ['-  item1'], new Selection(0, 3, 0, 3), ['- item1'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key. 3: '- [ ] |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {}, ['- [ ] item1'], new Selection(0, 6, 0, 6), ['- item1'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key. 4: '- [ ]  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {}, ['- [ ]  item1'], new Selection(0, 7, 0, 7), ['- [ ] item1'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Tab key. 1: '- |'", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['- item1'], new Selection(0, 2, 0, 2), ['    - item1'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Tab key. 2: '-  |'", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['-  item1'], new Selection(0, 3, 0, 3), ['    -  item1'], new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Tab key. 3: '- [ ] |'", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['- [ ] item1'], new Selection(0, 6, 0, 6), ['    - [ ] item1'], new Selection(0, 10, 0, 10)).then(done, done);
    });
});