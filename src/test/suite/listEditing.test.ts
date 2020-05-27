import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("List editing.", () => {
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

    test("Enter key. Continue list item", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '- item1'
            ],
            new Selection(0, 7, 0, 7),
            [
                '- item1',
                '- '
            ],
            new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Don't continue empty list item", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '- item1',
                '- '
            ],
            new Selection(1, 2, 1, 2),
            [
                '- item1',
                '',
                ''
            ],
            new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. List marker `*`", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '* item1'],
            new Selection(0, 7, 0, 7),
            [
                '* item1',
                '* '
            ],
            new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Continue GFM checkbox item. '- [ ] item1|'", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '- [ ] item1'
            ],
            new Selection(0, 11, 0, 11),
            [
                '- [ ] item1',
                '- [ ] '
            ],
            new Selection(1, 6, 1, 6)).then(done, done);
    });

    test("Enter key. Keep list item text indentation. '1.  item1|'", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '1.  item1'
            ],
            new Selection(0, 9, 0, 9),
            [
                '1.  item1',
                '2.  '
            ],
            new Selection(1, 4, 1, 4)).then(done, done);
    });

    test("Enter key. Keep list item text indentation. '9.  item9|'", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '9.  item9'
            ],
            new Selection(0, 9, 0, 9),
            [
                '9.  item9',
                '10. '
            ],
            new Selection(1, 4, 1, 4)).then(done, done);
    });

    test("Enter key. '- [test]|'. #122", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '- [test]'
            ],
            new Selection(0, 8, 0, 8),
            [
                '- [test]',
                '- '
            ],
            new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. '> |'", done => {
        testCommand('markdown.extension.onEnterKey', {},
            [
                '> test'
            ],
            new Selection(0, 6, 0, 6),
            [
                '> test',
                '> '
            ],
            new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Backspace key: '- |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2),
            [
                '  item1'
            ],
            new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key: '- [ ] |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key: '  - [ ] |'", done => {
        testCommand('markdown.extension.onBackspaceKey', {},
            [
                '  - [ ] item1'
            ],
            new Selection(0, 8, 0, 8),
            [
                '  - item1'
            ],
            new Selection(0, 4, 0, 4)).then(done, done);
    });

    test("Tab key. 1: '- |'", done => {
        testCommand('markdown.extension.onTabKey', {},
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2),
            [
                '    - item1'
            ],
            new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Tab key. 2: '-  |'", done => {
        testCommand('markdown.extension.onTabKey', {},
            [
                '-  item1'
            ],
            new Selection(0, 3, 0, 3),
            [
                '    -  item1'
            ],
            new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Tab key. 3: '- [ ] |'", done => {
        testCommand('markdown.extension.onTabKey', {},
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '    - [ ] item1'
            ],
            new Selection(0, 10, 0, 10)).then(done, done);
    });

    test("List toggle. 1: Check single line", done => {
        testCommand('markdown.extension.checkTaskList', {},
            [
                '- [ ] test'
            ],
            new Selection(0, 0, 0, 0),
            [
                '- [x] test'
            ],
            new Selection(0, 0, 0, 0),
        ).then(done, done)
    });

    test("List toggle. 2: Check multiple lines", done => {
        testCommand('markdown.extension.checkTaskList', {},
            [
                '- [ ] test',
                '- [ ] test',
                '- [ ] test',
            ],
            new Selection(0, 0, 1, 1),
            [
                '- [x] test',
                '- [x] test',
                '- [ ] test',
            ],
            new Selection(0, 0, 1, 1),
        ).then(done, done)
    });

    test("List toggle. 3: Ignore already unchecked lines when unchecking", done => {
        testCommand('markdown.extension.checkTaskList', {},
            [
                '- [x] test',
                '- [ ] test',
                '- [x] test',
            ],
            new Selection(0, 0, 2, 1),
            [
                '- [ ] test',
                '- [ ] test',
                '- [ ] test',
            ],
            new Selection(0, 0, 2, 1),
        ).then(done, done)
    });

    test("List toggle. 4: Only touch lines that has selections", done => {
        testCommand('markdown.extension.checkTaskList', {},
            [
                '- [ ] test',
                '- [ ] test',
                '- [ ] test',
                '- [ ] test',
            ],
            new Selection(0, 10, 3, 0),
            [
                '- [ ] test',
                '- [x] test',
                '- [x] test',
                '- [ ] test',
            ],
            new Selection(0, 10, 3, 0),
        ).then(done, done)
    });
});
