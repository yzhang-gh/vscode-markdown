import { Selection } from 'vscode';
import { resetConfiguration } from "../util/configuration";
import { testCommand } from "../util/generic";

suite("Block quote editing.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Enter key. Continue a block quote", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '> item1'
            ],
            new Selection(0, 7, 0, 7),
            [
                '> item1',
                '> '
            ],
            new Selection(1, 2, 1, 2));
    });

    test("Enter key. Still continue a block quote", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '> item1',
                '> '
            ],
            new Selection(1, 2, 1, 2),
            [
                '> item1',
                '>',
                '> '
            ],
            new Selection(2, 2, 2, 2));
    });

    test("Enter key. Finish a block quote", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '> item1',
                '> ',
                '> '
            ],
            new Selection(2, 2, 2, 2),
            [
                '> item1',
                '',
                ''
            ],
            new Selection(2, 0, 2, 0));
    });

    test("Enter key. Finish a block quote (corner case)", () => {
        return testCommand('markdown.extension.onEnterKey',
            [
                '> '
            ],
            new Selection(0, 2, 0, 2),
            [
                ''
            ],
            new Selection(0, 0, 0, 0));
    });
});
