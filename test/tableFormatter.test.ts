import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("Table formatter.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test to be treated timeout
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

    test("Normal 2", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '',
                'a |b',
                '---| ---',
                'c|de'
            ],
            new Selection(0, 0, 0, 0),
            [
                '',
                '| a   | b   |',
                '| --- | --- |',
                '| c   | de  |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Contains `|`", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c `a|b|c` | d `|` |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a         | b     |',
                '| --------- | ----- |',
                '| c `a|b|c` | d `|` |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Contains ` |`", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c `a |b | c` | d `| ` |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a            | b      |',
                '| ------------ | ------ |',
                '| c `a |b | c` | d `| ` |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Contains \\|", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c \\| b | d \\| |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a      | b    |',
                '| ------ | ---- |',
                '| c \\| b | d \\| |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("中文", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b |',
                '| --- | --- |',
                '| c 中文 | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a      | b   |',
                '| ------ | --- |',
                '| c 中文 | d   |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("No table", done => {
        testCommand('editor.action.formatDocument', {},
            [
                'a | b',
                '---'
            ],
            new Selection(0, 0, 0, 0),
            [
                'a | b',
                '---'
            ],
            new Selection(0, 0, 0, 0)).then(done, done)
    });

    test("Indented table", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '    | a | b |',
                '    | --- | --- |',
                '    | c | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '    | a   | b   |',
                '    | --- | --- |',
                '    | c   | d   |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done)
    });

    test("Mixed-indented table", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '   | a | b |',
                '  | --- | --- |',
                '    | c | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '    | a   | b   |',
                '    | --- | --- |',
                '    | c   | d   |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done)
    });

    test("Mixed ugly table", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '| a | b | c ',
                ' --- | --- | :---:',
                ' c | d | e |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a   | b   | c     |',
                '| --- | --- | :---: |',
                '| c   | d   | e     |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done)
    });

    test("Contains \\| in last open cell", done => {
        testCommand('editor.action.formatDocument', {},
            [
                '', // Changing the first expected char somehow crashes the selection logic and the test fails
                'a|b', 
                '---|---',
                'c|d\\|e'
            ],
            new Selection(0, 0, 0, 0),
            [
                '',
                '| a   | b    |',
                '| --- | ---- |',
                '| c   | d\\|e |'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });
});