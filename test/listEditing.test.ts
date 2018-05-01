import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("List editing.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test timeout
        await workspace.openTextDocument(testMdFile);

        for (let key in defaultConfigs) {
            if (defaultConfigs.hasOwnProperty(key)) {
                defaultConfigs[key] = workspace.getConfiguration('', null).get(key);
            }
        }
    });

    suiteTeardown(async () => {
        for (let key in defaultConfigs) {
            if (defaultConfigs.hasOwnProperty(key)) {
                await workspace.getConfiguration('', null).update(key, defaultConfigs[key], true);
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

    test("Enter key. Continue GFM checkbox item. '- [ ] item1|'", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['- [ ] item1'], new Selection(0, 11, 0, 11), ['- [ ] item1', '- [ ] '], new Selection(1, 6, 1, 6)).then(done, done);
    });

    test("Enter key. '- [test]|'. #122", done => {
        testCommand('markdown.extension.onEnterKey', {}, ['- [test]'], new Selection(0, 8, 0, 8), ['- [test]', '- '], new Selection(1, 2, 1, 2)).then(done, done);
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

    test("Backspace key. Fix ordered marker. 1", done => {
        testCommand('markdown.extension.onBackspaceKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['    1. item1'], new Selection(0, 7, 0, 7), ['1. item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 2", done => {
        testCommand('markdown.extension.onBackspaceKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['1. item1', '    5. item2'], new Selection(1, 7, 1, 7), ['1. item1', '2. item2'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 3", done => {
        testCommand('markdown.extension.onBackspaceKey', { "editor.insertSpaces": true, "editor.tabSize": 4 },
            [
                '1. item1',
                '    1. item1-1',
                '    2. item1-2',
                '    3. item1-3'],
            new Selection(3, 7, 3, 7),
            [
                '1. item1',
                '    1. item1-1',
                '    2. item1-2',
                '2. item1-3'
            ],
            new Selection(3, 3, 3, 3)).then(done, done);
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

    test("Tab key. Fix ordered marker. 1", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['2. item1'], new Selection(0, 3, 0, 3), ['    1. item1'], new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 2", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 }, ['2. [ ] item1'], new Selection(0, 7, 0, 7), ['    1. [ ] item1'], new Selection(0, 11, 0, 11)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 3", done => {
        testCommand('markdown.extension.onTabKey', { "editor.insertSpaces": true, "editor.tabSize": 4 },
            [
                '1. test',
                '    1. test',
                '    2. test',
                '2. test'
            ],
            new Selection(3, 3, 3, 3),
            [
                '1. test',
                '    1. test',
                '    2. test',
                '    3. test'
            ],
            new Selection(3, 7, 3, 7)).then(done, done);
    });

    test("Move Line Up. 1: '2. |'", done => {
        testCommand('markdown.extension.onMoveLineUp', {}, ['1. item1', '2. item2'], new Selection(1, 3, 1, 3), ['1. item2', '2. item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Move Line Up. 2: '2.  |'", done => {
        testCommand('markdown.extension.onMoveLineUp', {}, ['1.  item1', '2.  item2'], new Selection(1, 3, 1, 3), ['1.  item2', '2.  item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Move Line Up. 3: '2. [ ] |'", done => {
        testCommand('markdown.extension.onMoveLineUp', {}, ['1. [ ] item1', '2. [ ] item2'], new Selection(1, 0, 1, 0), ['1. [ ] item2', '2. [ ] item1'], new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Move Line Down. 1: '1. |'", done => {
        testCommand('markdown.extension.onMoveLineDown', {}, ['1. item1', '2. item2'], new Selection(0, 3, 0, 3), ['1. item2', '2. item1'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Move Line Down. 2: '1.  |'", done => {
        testCommand('markdown.extension.onMoveLineDown', {}, ['1.  item1', '2.  item2'], new Selection(0, 3, 0, 3), ['1.  item2', '2.  item1'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Move Line Down. 3: '1. [ ] |'", done => {
        testCommand('markdown.extension.onMoveLineDown', {}, ['1. [ ] item1', '2. [ ] item2'], new Selection(0, 0, 0, 0), ['1. [ ] item2', '2. [ ] item1'], new Selection(1, 0, 1, 0)).then(done, done);
    });
});