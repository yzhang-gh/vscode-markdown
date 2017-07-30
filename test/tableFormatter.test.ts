import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("Table formatter.", () => {
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

    test("Normal", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a   | b   |',
                '| --- | --- |',
                '| c   | d   |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Contains `|`", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c `a|b|c` | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a         | b   |',
                '| --------- | --- |',
                '| c `a|b|c` | d   |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });
});