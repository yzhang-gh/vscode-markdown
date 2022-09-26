import { Selection, env } from "vscode";
import { resetConfiguration, updateConfiguration } from "../util/configuration";
import { testCommand } from "../util/generic";

suite("Formatting.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Toggle bold. `text |` -> `text **|**`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text '], new Selection(0, 5, 0, 5),
            ['text ****'], new Selection(0, 7, 0, 7)
        );
    });

    test("Toggle bold. `text **|**` -> `text |`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text ****'], new Selection(0, 7, 0, 7),
            ['text '], new Selection(0, 5, 0, 5)
        );
    });

    test("Toggle bold. `text**|**` -> `text|`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text****'], new Selection(0, 6, 0, 6),
            ['text'], new Selection(0, 4, 0, 4)
        );
    });

    test("Toggle bold. `**text|**` -> `**text**|`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['**text**'], new Selection(0, 6, 0, 6),
            ['**text**'], new Selection(0, 8, 0, 8)
        );
    });

    test("Toggle bold. `text|` -> `**text**|`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text'], new Selection(0, 4, 0, 4),
            ['**text**'], new Selection(0, 8, 0, 8)
        );
    });

    test("Toggle bold. `te|xt` -> `**te|xt**`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text'], new Selection(0, 2, 0, 2),
            ['**text**'], new Selection(0, 4, 0, 4)
        );
    });

    test("Toggle bold. `**text**|` -> `text|`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['**text**'], new Selection(0, 8, 0, 8),
            ['text'], new Selection(0, 4, 0, 4)
        );
    });

    test("Toggle bold. `**te|xt**` -> `te|xt`", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['**text**'], new Selection(0, 4, 0, 4),
            ['text'], new Selection(0, 2, 0, 2)
        );
    });

    test("Toggle bold. With selection. Toggle on", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['text'], new Selection(0, 0, 0, 4),
            ['**text**'], new Selection(0, 0, 0, 8)
        );
    });

    test("Toggle bold. With selection. Toggle off", () => {
        return testCommand('markdown.extension.editing.toggleBold',
            ['**text**'], new Selection(0, 0, 0, 8),
            ['text'], new Selection(0, 0, 0, 4)
        );
    });

    test("Toggle bold. Use `__`", async () => {
        await updateConfiguration({ config: [["markdown.extension.bold.indicator", "__"]] });
        await testCommand('markdown.extension.editing.toggleBold',
            ['text'], new Selection(0, 0, 0, 4),
            ['__text__'], new Selection(0, 0, 0, 8)
        );
        await resetConfiguration();
    });

    test("Toggle italic. Use `*`", () => {
        return testCommand('markdown.extension.editing.toggleItalic',
            ['text'], new Selection(0, 0, 0, 4),
            ['*text*'], new Selection(0, 0, 0, 6)
        );
    });

    test("Toggle italic. Use `_`", async () => {
        await updateConfiguration({ config: [["markdown.extension.italic.indicator", "_"]] });
        await testCommand('markdown.extension.editing.toggleItalic',
            ['text'], new Selection(0, 0, 0, 4),
            ['_text_'], new Selection(0, 0, 0, 6)
        );
        await resetConfiguration();
    });
    
    test("Toggle strikethrough. `text|` -> `~~text~~|`", () => {
        return testCommand('markdown.extension.editing.toggleStrikethrough',
            ['text'], new Selection(0, 4, 0, 4),
            ['~~text~~'], new Selection(0, 8, 0, 8)
        );
    });

    test("Toggle strikethrough. List item", () => {
        return testCommand('markdown.extension.editing.toggleStrikethrough',
            ['- text text'], new Selection(0, 11, 0, 11),
            ['- ~~text text~~'], new Selection(0, 15, 0, 15)
        );
    });

    test("Toggle strikethrough. Task list item", () => {
        return testCommand('markdown.extension.editing.toggleStrikethrough',
            ['- [ ] text text'], new Selection(0, 15, 0, 15),
            ['- [ ] ~~text text~~'], new Selection(0, 19, 0, 19)
        );
    });

    // disclaimer: I am not sure about this code. Looks like it works fine, but I am not fully understand how it works underneath.
    test("Paste link on selected text. `|text|` -> `[text|](link)`", async () => {
        const link = 'http://just.a.link';
        await env.clipboard.writeText(link);

        return testCommand('markdown.extension.editing.paste',
            ['text'], new Selection(0, 0, 0, 4),
            ['[text](' + link + ')'], new Selection(0, 5, 0, 5)
        );
    });
});
