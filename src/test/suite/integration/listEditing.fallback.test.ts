import { Selection } from "vscode";
import { resetConfiguration } from "../util/configuration";
import { testCommand } from "../util/generic";

suite("No list editing.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Backspace key: '-  |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '-  item1'
            ],
            new Selection(0, 3, 0, 3),
            [
                '- item1'
            ],
            new Selection(0, 2, 0, 2));
    });

    test("Backspace key: '  -  |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '  -  item1'
            ],
            new Selection(0, 5, 0, 5),
            [
                '  - item1'
            ],
            new Selection(0, 4, 0, 4));
    });

    test("Backspace key: '- [ ]  |'", () => {
        return testCommand('markdown.extension.onBackspaceKey',
            [
                '- [ ]  item1'
            ],
            new Selection(0, 7, 0, 7),
            [
                '- [ ] item1'
            ],
            new Selection(0, 6, 0, 6));
    });

    test("Shift tab key: '    text'", () => {
        return testCommand('markdown.extension.onShiftTabKey',
            [
                '    text'
            ],
            new Selection(0, 5, 0, 5),
            [
                'text'
            ],
            new Selection(0, 1, 0, 1));
    });
});
