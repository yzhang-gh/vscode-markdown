import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("List editing.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test timeout
        await workspace.openTextDocument(testMdFile);

        const workspaceConfig = workspace.getConfiguration('', null);
        for (let key in previousConfigs) {
            previousConfigs[key] = workspaceConfig.get(key);
        }
    });

    suiteTeardown(() => {
        const workspaceConfig = workspace.getConfiguration('', null);
        for (let key in previousConfigs) {
            workspaceConfig.update(key, previousConfigs[key], true);
        }
    });

    test("Enter key. Continue list item", done => {
        testCommand('markdown.extension.onEnterKey', ['- item1'], new Selection(0, 7, 0, 7), ['- item1', '- '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Don't continue empty list item", done => {
        testCommand('markdown.extension.onEnterKey', ['- item1', '- '], new Selection(1, 2, 1, 2), ['- item1', '', ''], new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. List marker `*`", done => {
        testCommand('markdown.extension.onEnterKey', ['* item1'], new Selection(0, 7, 0, 7), ['* item1', '* '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Disable in fenced code block", done => {
        testCommand('markdown.extension.onEnterKey', ['```', '- item1'], new Selection(1, 7, 1, 7), ['```', '- item1', ''], new Selection(2, 0, 2, 0)).then(done, done);
    });

    test("Enter key. Respect indentation rules", done => {
        testCommand('markdown.extension.onEnterKey', ['```', '{}'], new Selection(1, 1, 1, 1), ['```', '{', '    ', '}'], new Selection(2, 4, 2, 4)).then(done, done);
    });

    test("Enter key. Continue GFM checkbox item. '- [ ] item1|'", done => {
        testCommand('markdown.extension.onEnterKey', ['- [ ] item1'], new Selection(0, 11, 0, 11), ['- [ ] item1', '- [ ] '], new Selection(1, 6, 1, 6)).then(done, done);
    });

    test("Enter key. Keep list item text indentation. '1.  item1|'", done => {
        testCommand('markdown.extension.onEnterKey', ['1.  item1'], new Selection(0, 9, 0, 9), ['1.  item1', '2.  '], new Selection(1, 4, 1, 4)).then(done, done);
    });

    test("Enter key. Keep list item text indentation. '9.  item9|'", done => {
        testCommand('markdown.extension.onEnterKey', ['9.  item9'], new Selection(0, 9, 0, 9), ['9.  item9', '10. '], new Selection(1, 4, 1, 4)).then(done, done);
    });

    test("Enter key. '- [test]|'. #122", done => {
        testCommand('markdown.extension.onEnterKey', ['- [test]'], new Selection(0, 8, 0, 8), ['- [test]', '- '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. '> |'", done => {
        testCommand('markdown.extension.onEnterKey', ['> test'], new Selection(0, 6, 0, 6), ['> test', '> '], new Selection(1, 2, 1, 2)).then(done, done);
    });

    test("Enter key. Fix ordered marker", done => {
        testCommand('markdown.extension.onEnterKey', ['1. one', '2. two'], new Selection(0, 6, 0, 6), ['1. one', '2. ', '3. two'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Backspace key. 1: '- |'", done => {
        testCommand('markdown.extension.onBackspaceKey', ['- item1'], new Selection(0, 2, 0, 2), ['  item1'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key. 2: '-  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', ['-  item1'], new Selection(0, 3, 0, 3), ['- item1'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key. 3: '- [ ] |'", done => {
        testCommand('markdown.extension.onBackspaceKey', ['- [ ] item1'], new Selection(0, 6, 0, 6), ['- item1'], new Selection(0, 2, 0, 2)).then(done, done);
    });

    test("Backspace key. 4: '- [ ]  |'", done => {
        testCommand('markdown.extension.onBackspaceKey', ['- [ ]  item1'], new Selection(0, 7, 0, 7), ['- [ ] item1'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 1", done => {
        testCommand('markdown.extension.onBackspaceKey', ['    1. item1'], new Selection(0, 7, 0, 7), ['1. item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 2", done => {
        testCommand('markdown.extension.onBackspaceKey',
            [
                '1. item1',
                '    5. item2'
            ],
            new Selection(1, 7, 1, 7),
            [
                '1. item1',
                '2. item2'
            ],
            new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 3", done => {
        testCommand('markdown.extension.onBackspaceKey',
            [
                '1. item1',
                '    1. item1-1',
                '    2. item1-2',
                '    3. item1-3',
                '    4. item1-4'
            ],
            new Selection(3, 7, 3, 7),
            [
                '1. item1',
                '    1. item1-1',
                '    2. item1-2',
                '2. item1-3',
                '    1. item1-4'
            ],
            new Selection(3, 3, 3, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 4: Multi-line list item", done => {
        testCommand('markdown.extension.onBackspaceKey',
            [
                '1. item1',
                '    1. item1-1',
                '       item1-2',
                '    2. item1-3',
                '    3. item1-4'
            ],
            new Selection(3, 7, 3, 7),
            [
                '1. item1',
                '    1. item1-1',
                '       item1-2',
                '2. item1-3',
                '    1. item1-4'
            ],
            new Selection(3, 3, 3, 3)).then(done, done);
    });

    test("Backspace key. Fix ordered marker. 5: Selection range", done => {
        testCommand('markdown.extension.onBackspaceKey',
            [
                '1. item1',
                '2. item2',
                '    1. item1-1',
                '    2. item1-2',
                '    3. item1-3',
                '3. item3'
            ],
            new Selection(1, 0, 3, 0),
            [
                '1. item1',
                '    1. item1-2',
                '    2. item1-3',
                '2. item3'
            ],
            new Selection(1, 0, 1, 0)).then(done, done);
    });

    test("Tab key. 1: '- |'", done => {
        testCommand('markdown.extension.onTabKey', ['- item1'], new Selection(0, 2, 0, 2), ['    - item1'], new Selection(0, 6, 0, 6)).then(done, done);
    });

    test("Tab key. 2: '-  |'", done => {
        testCommand('markdown.extension.onTabKey', ['-  item1'], new Selection(0, 3, 0, 3), ['    -  item1'], new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Tab key. 3: '- [ ] |'", done => {
        testCommand('markdown.extension.onTabKey', ['- [ ] item1'], new Selection(0, 6, 0, 6), ['    - [ ] item1'], new Selection(0, 10, 0, 10)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 1", done => {
        testCommand('markdown.extension.onTabKey', ['2. item1'], new Selection(0, 3, 0, 3), ['    1. item1'], new Selection(0, 7, 0, 7)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 2", done => {
        testCommand('markdown.extension.onTabKey', ['2. [ ] item1'], new Selection(0, 7, 0, 7), ['    1. [ ] item1'], new Selection(0, 11, 0, 11)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 3", done => {
        testCommand('markdown.extension.onTabKey',
            [
                '1. test',
                '    1. test',
                '    2. test',
                '2. test',
                '    1. test'
            ],
            new Selection(3, 3, 3, 3),
            [
                '1. test',
                '    1. test',
                '    2. test',
                '    3. test',
                '    4. test'
            ],
            new Selection(3, 7, 3, 7)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 4: Multi-line list item", done => {
        testCommand('markdown.extension.onTabKey',
            [
                '1. test',
                '    1. test',
                '       test',
                '2. test',
                '    1. test'
            ],
            new Selection(3, 3, 3, 3),
            [
                '1. test',
                '    1. test',
                '       test',
                '    2. test',
                '    3. test'
            ],
            new Selection(3, 7, 3, 7)).then(done, done);
    });

    test("Tab key. Fix ordered marker. 5: Selection range", done => {
        testCommand('markdown.extension.onTabKey',
            [
                '1. test',
                '2. test',
                '    1. test',
                '    2. test',
                '3. test'
            ],
            new Selection(1, 0, 3, 0),
            [
                '1. test',
                '    1. test',
                '        1. test',
                '    2. test',
                '2. test'
            ],
            new Selection(1, 0, 3, 0)).then(done, done);
    });

    test("Move Line Up. 1: '2. |'", done => {
        testCommand('markdown.extension.onMoveLineUp', ['1. item1', '2. item2'], new Selection(1, 3, 1, 3), ['1. item2', '2. item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Move Line Up. 2: '2.  |'", done => {
        testCommand('markdown.extension.onMoveLineUp', ['1.  item1', '2.  item2'], new Selection(1, 3, 1, 3), ['1.  item2', '2.  item1'], new Selection(0, 3, 0, 3)).then(done, done);
    });

    test("Move Line Up. 3: '2. [ ] |'", done => {
        testCommand('markdown.extension.onMoveLineUp', ['1. [ ] item1', '2. [ ] item2'], new Selection(1, 0, 1, 0), ['1. [ ] item2', '2. [ ] item1'], new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Move Line Down. 1: '1. |'", done => {
        testCommand('markdown.extension.onMoveLineDown', ['1. item1', '2. item2'], new Selection(0, 3, 0, 3), ['1. item2', '2. item1'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Move Line Down. 2: '1.  |'", done => {
        testCommand('markdown.extension.onMoveLineDown', ['1.  item1', '2.  item2'], new Selection(0, 3, 0, 3), ['1.  item2', '2.  item1'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Move Line Down. 3: '1. [ ] |'", done => {
        testCommand('markdown.extension.onMoveLineDown', ['1. [ ] item1', '2. [ ] item2'], new Selection(0, 0, 0, 0), ['1. [ ] item2', '2. [ ] item1'], new Selection(1, 0, 1, 0)).then(done, done);
    });

    test("Copy Line Up. 1: '2. |'", done => {
        testCommand('markdown.extension.onCopyLineUp', ['1. item1', '2. item2'], new Selection(1, 3, 1, 3), ['1. item1', '2. item2', '3. item2'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Copy Line Up. 2: '2.  |'", done => {
        testCommand('markdown.extension.onCopyLineUp', ['1.  item1', '2.  item2'], new Selection(1, 3, 1, 3), ['1.  item1', '2.  item2', '3.  item2'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Copy Line Up. 3: '2. [ ] |'", done => {
        testCommand('markdown.extension.onCopyLineUp', ['1. [ ] item1', '2. [x] item2'], new Selection(1, 0, 1, 0), ['1. [ ] item1', '2. [x] item2', '3. [x] item2'], new Selection(1, 0, 1, 0)).then(done, done);
    });

    test("Copy Line Down. 1: '1. |'", done => {
        testCommand('markdown.extension.onCopyLineDown', ['1. item1', '2. item2'], new Selection(0, 3, 0, 3), ['1. item1', '2. item1', '3. item2'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Copy Line Down. 2: '1.  |'", done => {
        testCommand('markdown.extension.onCopyLineDown', ['1.  item1', '2.  item2'], new Selection(0, 3, 0, 3), ['1.  item1', '2.  item1', '3.  item2'], new Selection(1, 3, 1, 3)).then(done, done);
    });

    test("Copy Line Down. 3: '1. [ ] |'", done => {
        testCommand('markdown.extension.onCopyLineDown', ['1. [x] item1', '2. [ ] item2'], new Selection(0, 0, 0, 0), ['1. [x] item1', '2. [x] item1', '3. [ ] item2'], new Selection(1, 0, 1, 0)).then(done, done);
    });

    test("Indent Lines. 1: No selection range", done => {
        testCommand('markdown.extension.onIndentLines',
            [
                '1. test',
                '2. test',
                '    1. test',
                '3. test'
            ],
            new Selection(1, 5, 1, 5),
            [
                '1. test',
                '    1. test',
                '    2. test',
                '2. test'
            ],
            new Selection(1, 9, 1, 9)).then(done, done);
    });

    test("Indent Lines. 2: Selection range", done => {
        testCommand('markdown.extension.onIndentLines',
            [
                '1. test',
                '2. test',
                '3. test',
                '    1. test',
                '4. test'
            ],
            new Selection(1, 0, 3, 0),
            [
                '1. test',
                '    1. test',
                '    2. test',
                '    3. test',
                '2. test'
            ],
            new Selection(1, 0, 3, 0)).then(done, done);
    });

    test("Outdent Lines. 1: No selection range", done => {
        testCommand('markdown.extension.onOutdentLines',
            [
                '1. test',
                '    1. test',
                '    2. test',
                '2. test'
            ],
            new Selection(1, 0, 1, 0),
            [
                '1. test',
                '2. test',
                '    1. test',
                '3. test'
            ],
            new Selection(1, 0, 1, 0)).then(done, done);
    });

    test("Outdent Lines. 2: Selection range", done => {
        testCommand('markdown.extension.onOutdentLines',
            [
                '1. test',
                '    1. test',
                '    2. test',
                '    3. test',
                '2. test'
            ],
            new Selection(1, 0, 3, 0),
            [
                '1. test',
                '2. test',
                '3. test',
                '    1. test',
                '4. test'
            ],
            new Selection(1, 0, 3, 0)).then(done, done);
    });

});
