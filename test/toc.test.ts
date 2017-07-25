import { workspace, Selection } from 'vscode';
import { testMdFile, defaultConfigs, testCommand } from './testUtils';

suite("TOC.", () => {
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
                '    - [Section 1.1](#section-1-1)',
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
                '    - [Section 1.1](#section-1-1)',
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
                '    - [Section 1.1](#section-1-1)',
                '- [Section 2](#section-2)',
                '    - [Section 2.1](#section-2-1)'
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
                '- [Section 1.1](#section-1-1)',
                '    - [Section 1.1.1](#section-1-1-1)',
                '- [Section 2.1](#section-2-1)',
                '    - [Section 2.1.1](#section-2-1-1)',
            ],
            new Selection(19, 37, 19, 37)).then(done, done);
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
                '- [Section 1.1](#section-1-1)',
                '    - [Section 1.1.1](#section-1-1-1)',
                '- [Section 2.1](#section-2-1)',
                '    - [Section 2.1.1](#section-2-1-1)',
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
                '- [Section 1.1](#section-1-1)',
                '    - [Section 1.1.1](#section-1-1-1)',
                '- [Section 2.1](#section-2-1)'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });
});