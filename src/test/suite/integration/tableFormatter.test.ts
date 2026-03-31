import { Selection } from "vscode";
import { resetConfiguration, updateConfiguration } from "../util/configuration";
import { testCommand } from "../util/generic";

suite("Table formatter.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Normal", () => {
        return testCommand('editor.action.formatDocument',
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
            new Selection(0, 0, 0, 0));
    });

    test("Normal, without leading and trailing pipes", () => {
        return testCommand('editor.action.formatDocument',
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
            new Selection(0, 0, 0, 0));
    });

    test("Plain pipes should always be cell separators", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| a | b |',
                '| --- | --- |',
                '| c `a|b` | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a    | b   |',
                '| ---- | --- |',
                '| c `a | b`  | d |'
            ],
            new Selection(0, 0, 0, 0));
    });

    // https://github.github.com/gfm/#example-200
    test(String.raw`Contains escaped pipes '\|'`, () => {
        return testCommand('editor.action.formatDocument',
            [
                '| a | b |',
                '| --- | --- |',
                '| c `a\\|b`   | d |',
                '| c **a\\|b** | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a          | b   |',
                '| ---------- | --- |',
                '| c `a\\|b`   | d   |',
                '| c **a\\|b** | d   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("CJK characters", () => {
        return testCommand('editor.action.formatDocument',
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
            new Selection(0, 0, 0, 0));
    });

    test("Not table", () => {
        return testCommand('editor.action.formatDocument',
            [
                'a | b',
                '---'
            ],
            new Selection(0, 0, 0, 0),
            [
                'a | b',
                '---'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Indented table, belongs to a list item", () => {
        return testCommand('editor.action.formatDocument',
            [
                '1. A list',
                '    | a | b |',
                '    | --- | --- |',
                '    | c | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '1. A list',
                '    | a   | b   |',
                '    | --- | --- |',
                '    | c   | d   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Mixed-indented table (no normalization)", () => {
        return testCommand('editor.action.formatDocument',
            [
                '   | a | b |',
                '  | --- | --- |',
                '    | c | d |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '   | a   | b   |',
                '   | --- | --- |',
                '   | c   | d   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    // This is definitely WRONG. It may produce an indented code block！
    // test("Mixed-indented table (normalization)", async () => {
    //     await updateConfiguration({ config: [["markdown.extension.tableFormatter.normalizeIndentation", true]] });
    //     await testCommand('editor.action.formatDocument',
    //         [
    //             '   | a | b |',
    //             '  | --- | --- |',
    //             '    | c | d |'
    //         ],
    //         new Selection(0, 0, 0, 0),
    //         [
    //             '    | a   | b   |',
    //             '    | --- | --- |',
    //             '    | c   | d   |'
    //         ],
    //         new Selection(0, 0, 0, 0)
    //     );
    //     await resetConfiguration();
    // });

    test("Mixed ugly table", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| a | b | c ',
                ' --- | --- | :---:',
                ' c | d | e |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a   | b   |   c   |',
                '| --- | --- | :---: |',
                '| c   | d   |   e   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Alignment and padding within cells", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Column L | Column C | Column R |',
                '| ---- | :----: | ----: |',
                '| c | d | e |',
                '| fg | hi | jk |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Column L | Column C | Column R |',
                '| -------- | :------: | -------: |',
                '| c        |    d     |        e |',
                '| fg       |    hi    |       jk |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Contains escaped pipes '\\|' in last data cell", () => {
        return testCommand('editor.action.formatDocument',
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
            new Selection(0, 0, 0, 0));
    });

    test("Reduced width table", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| a       | b    |',
                '| ------- | ---- |',
                '| c | d   |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a   | b   |',
                '| --- | --- |',
                '| c   | d   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Empty cell with nothing between pipes (#381)", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| a | b | c |',
                '| --- | --- | --- |',
                '| a || c |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a   | b   | c   |',
                '| --- | --- | --- |',
                '| a   |     | c   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("CTL: Thai", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| คุณครู | รั้วริม | ไอ้หนูน้อย |',
                '| --- | --- | --- |',
                '| Teacher | The border | kids |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| คุณครู    | รั้วริม       | ไอ้หนูน้อย |',
                '| ------- | ---------- | ------- |',
                '| Teacher | The border | kids    |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Left-aligned single column table (#431)", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| h |',
                '| --- |',
                '| a |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| h   |',
                '| --- |',
                '| a   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Centre-aligned single column table (#431)", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| h |',
                '| :---: |',
                '| a |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '|   h   |',
                '| :---: |',
                '|   a   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Right-aligned single column table (#431)", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| h |',
                '| ---: |',
                '| a |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '|    h |',
                '| ---: |',
                '|    a |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Delimiter row without padding", async () => {
        await updateConfiguration({ config: [["markdown.extension.tableFormatter.delimiterRowNoPadding", true]] });
        await testCommand('editor.action.formatDocument',
            [
                '| a | b | c | d |',
                '| --- | :--- | ---: | :---: |',
                '| w | x | y | z |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a | b  |  c |  d  |',
                '|---|:---|---:|:---:|',
                '| w | x  |  y |  z  |'
            ],
            new Selection(0, 0, 0, 0));
        await resetConfiguration();
    });

    test("Delimiter row without padding, longer data", async () => {
        await updateConfiguration({ config: [["markdown.extension.tableFormatter.delimiterRowNoPadding", true]] });
        await testCommand('editor.action.formatDocument',
            [
                '| a | b-long | c | d-longest |',
                '| --- | :--- | ---: | :---: |',
                '| w | x | y-longer | z |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| a | b-long |        c | d-longest |',
                '|---|:-------|---------:|:---------:|',
                '| w | x      | y-longer |     z     |'
            ],
            new Selection(0, 0, 0, 0));
        await resetConfiguration();
    });

    test("Emoji in table cells", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Value |',
                '| ----- |',
                '| ✅✅✅ |',
                '| ⚠️⚠️ |',
                '| ❌ |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Value  |',
                '| ------ |',
                '| ✅✅✅ |',
                '| ⚠️⚠️   |',
                '| ❌     |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Emoji with text in table cells", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Status | Description |',
                '| ------ | ----------- |',
                '| ✅ OK | Everything is fine |',
                '| ⚠️ Warn | Be careful |',
                '| ❌ Error | Something went wrong |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Status   | Description          |',
                '| -------- | -------------------- |',
                '| ✅ OK    | Everything is fine   |',
                '| ⚠️ Warn  | Be careful           |',
                '| ❌ Error | Something went wrong |',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Mixed emoji and other symbols", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Value |',
                '| ----- |',
                '| + |',
                '| ✅ |',
                '| ! |',
                '| ⚠️ |',
                '| x |',
                '| ❌ |'
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Value |',
                '| ----- |',
                '| +     |',
                '| ✅    |',
                '| !     |',
                '| ⚠️    |',
                '| x     |',
                '| ❌    |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Extended_Pictographic emoji", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Status | Icon',
                '| ------ | ----',
                '| Done   | ✨   ',
                '| Fire   | 🔥   ',
                '| Target | 🎯   ',
                '| Spark  | 🌟   '
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Status | Icon |',
                '| ------ | ---- |',
                '| Done   | ✨   |',
                '| Fire   | 🔥   |',
                '| Target | 🎯   |',
                '| Spark  | 🌟   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Mixed CJK and emoji", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| 中文 | 日本語 | 状态',
                '| ---- | ------ | ----',
                '| 测试 | テスト | ⏳   ',
                '| 完成 | 完了   | ✅   '
            ],
            new Selection(0, 0, 0, 0),
            [
                '| 中文 | 日本語 | 状态 |',
                '| ---- | ------ | ---- |',
                '| 测试 | テスト | ⏳   |',
                '| 完成 | 完了   | ✅   |'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("CheckMarks: normal text vs emoji", () => {
        return testCommand('editor.action.formatDocument',
            [
                '| Normal | Emoji | Mixed',
                '| ------ | ----- | -----',
                '| ✓      | ✅    | ✅✓   ',
                '| ✗      | ❌    | ❌✗   '
            ],
            new Selection(0, 0, 0, 0),
            [
                '| Normal | Emoji | Mixed |',
                '| ------ | ----- | ----- |',
                '| ✓      | ✅    | ✅✓   |',
                '| ✗      | ❌    | ❌✗   |'
            ],
            new Selection(0, 0, 0, 0));
    });
});
