import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

let previousConfigs = Object.assign({}, defaultConfigs);

suite("TOC.", () => {
    suiteSetup(async () => {
        // 💩 Preload file to prevent the first test to be treated timeout
        await workspace.openTextDocument(testMdFile);

        for (let key in previousConfigs) {
            if (previousConfigs.hasOwnProperty(key)) {
                previousConfigs[key] = workspace.getConfiguration('', null).get(key);
            }
        }
    });

    suiteTeardown(async () => {
        for (let key in previousConfigs) {
            if (previousConfigs.hasOwnProperty(key)) {
                await workspace.getConfiguration('', null).update(key, previousConfigs[key], true);
            }
        }
    });

    test("Create", done => {
        testCommand('markdown.extension.toc.create', {},
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
                '- [Section 1](#Section-1)',
                '  - [Section 1.1](#Section-11)',
                '- [Section 2](#Section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Update", done => {
        testCommand('markdown.extension.toc.update', {},
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '- [Section 1](#Section-1)',
                '  - [Section 1.1](#Section-11)',
                '- [Section 2](#Section-2)'
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
                '- [Section 1](#Section-1)',
                '  - [Section 1.1](#Section-11)',
                '- [Section 2](#Section-2)',
                '  - [Section 2.1](#Section-21)'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Create (levels 2..3)", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.levels": "2..3"
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
                '- [Section 1.1](#Section-11)',
                '  - [Section 1.1.1](#Section-111)',
                '- [Section 2.1](#Section-21)',
                '  - [Section 2.1.1](#Section-211)',
            ],
            new Selection(19, 33, 19, 33)).then(done, done);
    });

    test("Update (levels 2..3)", done => {
        testCommand('markdown.extension.toc.update',
            {
                "markdown.extension.toc.levels": "2..3"
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
                '- [Section 1.1](#Section-11)',
                '  - [Section 1.1.1](#Section-111)',
                '- [Section 2.1](#Section-21)',
                '  - [Section 2.1.1](#Section-211)',
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
                '- [Section 1.1](#Section-11)',
                '  - [Section 1.1.1](#Section-111)',
                '- [Section 2.1](#Section-21)'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Create 中文", done => {
        testCommand('markdown.extension.toc.create', {},
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
                '- [Section 中文](#Section-%E4%B8%AD%E6%96%87)',
                '  - [Section 1.1](#Section-11)',
                '- [Section 2](#Section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Slugify. `a.b` c => ab-c", done => {
        testCommand('markdown.extension.toc.create', {},
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

    test("Setext headings", done => {
        testCommand('markdown.extension.toc.create', {},
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
                '- [Section 1](#Section-1)',
                '  - [Section 1.1](#Section-11)'
            ],
            new Selection(7, 30, 7, 30)).then(done, done);
    });

    test("Non-Latin symbols", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.githubCompatibility": true
            },
            [
                '# Секция 1',
                '',
                '## Секция 1.1',
                '',
                ''
            ],
            new Selection(4, 0, 4, 0),
            [
                '# Секция 1',
                '',
                '## Секция 1.1',
                '',
                '- [Секция 1](#Секция-1)',
                '  - [Секция 1.1](#Секция-11)'
            ],
            new Selection(5, 28, 5, 28)).then(done, done);
    });

    test("Update multiple TOCs", done => {
        testCommand('markdown.extension.toc.update',
            {
                "markdown.extension.toc.githubCompatibility": true
            },
            [
                '# Head 1',
                '# Head 2',
                '',
                '- [Head 1](#Head-1)',
                '- [Head 2](#Head-2)',
                '- [Head 3](#Head-3)',
                '',
                '- [Head 1](#Head-1)',
                '- [Head 2](#Head-2)',
                '- [Head 3](#Head-3)',
                '',
                '# Head 3',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Head 1',
                '# Head 2',
                '',
                '- [Head 1](#Head-1)',
                '- [Head 2](#Head-2)',
                '- [Head 3](#Head-3)',
                '- [Head 4](#Head-4)',
                '',
                '- [Head 1](#Head-1)',
                '- [Head 2](#Head-2)',
                '- [Head 3](#Head-3)',
                '- [Head 4](#Head-4)',
                '',
                '# Head 3',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });
});