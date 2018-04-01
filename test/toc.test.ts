import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("TOC.", () => {
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

    test("Create", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '    - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Update", done => {
        testCommand('markdown.extension.toc.update',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '- [Section 1](#section-1)',
                '    - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)'
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '- [Section 1](#section-1)',
                '    - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)',
                '    - [Section 2.1](#section-21)'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Create (levels 2..3)", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "2..3",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '### Section 1.1.1',
                '',
                '#### Section 1.1.1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '### Section 2.1.1',
                '',
                '#### Section 2.1.1.1',
                '',
                ''
            ],
            new Selection(16, 0, 16, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '### Section 1.1.1',
                '',
                '#### Section 1.1.1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '### Section 2.1.1',
                '',
                '#### Section 2.1.1.1',
                '',
                '- [Section 1.1](#section-11)',
                '    - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)',
                '    - [Section 2.1.1](#section-211)',
            ],
            new Selection(19, 35, 19, 35)).then(done, done);
    });

    test("Update (levels 2..3)", done => {
        testCommand('markdown.extension.toc.update',
            {
                "markdown.extension.toc.levels": "2..3",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '### Section 1.1.1',
                '',
                '#### Section 1.1.1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '- [Section 1.1](#section-11)',
                '    - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)',
                '    - [Section 2.1.1](#section-211)',
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '### Section 1.1.1',
                '',
                '#### Section 1.1.1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '- [Section 1.1](#section-11)',
                '    - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Create 中文", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# Section 中文',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                '# Section 中文',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '- [Section 中文](#section-%E4%B8%AD%E6%96%87)',
                '    - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Slugify. `a.b` c => ab-c", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                '# `a.b` c',
                '',
                ''
            ],
            new Selection(2, 0, 2, 0),
            [
                '# `a.b` c',
                '',
                '- [`a.b` c](#ab-c)'
            ],
            new Selection(2, 18, 2, 18)).then(done, done);
    });

    test("Setext heading syntax", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false
            },
            [
                'Section 1',
                '===',
                '',
                'Section 1.1',
                '---',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                'Section 1',
                '===',
                '',
                'Section 1.1',
                '---',
                '',
                '- [Section 1](#section-1)',
                '    - [Section 1.1](#section-11)'
            ],
            new Selection(7, 32, 7, 32)).then(done, done);
    });
    
    test("Non-Latin symbols", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "1..6",
                "markdown.extension.toc.orderedList": false,
                "markdown.extension.toc.plaintext": false,
                "markdown.extension.toc.encodeUri": false,
                "markdown.extension.toc.toLowerCase": false
            },
            [
                'Секция 1',
                '===',
                '',
                'Секция 1.1',
                '---',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                'Секция 1',
                '===',
                '',
                'Секция 1.1',
                '---',
                '',
                '- [Секция 1](#Секция-1)',
                '    - [Секция 1.1](#Секция-11)'
            ],
            new Selection(7, 32, 7, 32)).then(done, done);
    });
});
