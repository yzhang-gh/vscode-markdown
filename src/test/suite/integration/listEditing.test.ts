import { Selection } from "vscode";
import { resetConfiguration } from "../util/configuration";
import { testCommand } from "../util/generic";

suite("List editing.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Enter key. Continue list item. '- item1|'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- item1'
            ],
            new Selection(0, 7, 0, 7),
            [
                '- item1',
                '- '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. Continue list item. '- |item1'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2),
            [
                '- ',
                '- item1'
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. Don't continue empty list item", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- item1',
                '- '
            ],
            new Selection(1, 2, 1, 2),
            [
                '- item1',
                '',
            ],
            new Selection(1, 0, 1, 0));
    });

    test("Enter key. Outdent empty list item until it is top-level", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- item1',
                '  - '
            ],
            new Selection(1, 6, 1, 6),
            [
                '- item1',
                '- '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. List marker `*`", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '* item1'],
            new Selection(0, 7, 0, 7),
            [
                '* item1',
                '* '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. Continue GFM checkbox item. '- [ ] item1|'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- [ ] item1'
            ],
            new Selection(0, 11, 0, 11),
            [
                '- [ ] item1',
                '- [ ] '
            ],
            new Selection(1, 6, 1, 6));
    });

    test("Enter key. Continue GFM checkbox item. '- [x] |item1'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- [x] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '- [ ] ',
                '- [x] item1'
            ],
            new Selection(1, 6, 1, 6));
    });

    test("Ctrl+Enter key. Continue GFM checkbox item. '- [x] |item1'", () => {
        return testCommand('markdown.extension.onCtrlEnterKey',
            [
                '- [x] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '- [x] item1',
                '- [ ] '
            ],
            new Selection(1, 6, 1, 6));
    })

    test("Enter key. Keep list item text indentation. '1.  item1|'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '1.  item1'
            ],
            new Selection(0, 9, 0, 9),
            [
                '1.  item1',
                '2.  '
            ],
            new Selection(1, 4, 1, 4));
    });

    test("Enter key. Keep list item text indentation. '9.  item9|'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '9.  item9'
            ],
            new Selection(0, 9, 0, 9),
            [
                '9.  item9',
                '10. '
            ],
            new Selection(1, 4, 1, 4));
    });

    test("Enter key. '- [test]|'. #122", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '- [test]'
            ],
            new Selection(0, 8, 0, 8),
            [
                '- [test]',
                '- '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. '> |'", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '> test'
            ],
            new Selection(0, 6, 0, 6),
            [
                '> test',
                '> '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Backspace key: '- |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2),
            [
                '  item1'
            ],
            new Selection(0, 2, 0, 2));
    });

    test("Backspace key: '- [ ] |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2));
    });

    test("Backspace key: '  - [ ] |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '  - [ ] item1'
            ],
            new Selection(0, 8, 0, 8),
            [
                '  - item1'
            ],
            new Selection(0, 4, 0, 4));
    });

    test("Tab key. 1: '- |'", () => {
        return testCommand('markdown.extension.onTabKey',
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2),
            [
                '    - item1'
            ],
            new Selection(0, 6, 0, 6));
    });

    test("Tab key. 2: '-  |'", () => {
        return testCommand('markdown.extension.onTabKey',
            [
                '-  item1'
            ],
            new Selection(0, 3, 0, 3),
            [
                '    -  item1'
            ],
            new Selection(0, 7, 0, 7));
    });

    test("Tab key. 3: '- [ ] |'", () => {
        return testCommand('markdown.extension.onTabKey',
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6),
            [
                '    - [ ] item1'
            ],
            new Selection(0, 10, 0, 10));
    });

    test("List toggle. 1: Check single line", () => {
        return testCommand('markdown.extension.checkTaskList',
            [
                '- [ ] test'
            ],
            new Selection(0, 0, 0, 0),
            [
                '- [x] test'
            ],
            new Selection(0, 0, 0, 0),
        );
    });

    test("List toggle. 2: Check multiple lines", () => {
        return testCommand('markdown.extension.checkTaskList',
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
        );
    });

    test("List toggle. 3: Ignore already unchecked lines when unchecking", () => {
        return testCommand('markdown.extension.checkTaskList',
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
        );
    });

    test("List toggle. 4: Only touch lines that has selections", () => {
        return testCommand('markdown.extension.checkTaskList',
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
        );
    });
});
