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
                '- [Section 1](#section-1)',
                '  - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)'
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
                '- [Section 1](#section-1)',
                '  - [Section 1.1](#section-11)',
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
                '  - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)',
                '  - [Section 2.1](#section-21)'
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
                '- [Section 1.1](#section-11)',
                '  - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)',
                '  - [Section 2.1.1](#section-211)',
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
                '- [Section 1.1](#section-11)',
                '  - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)',
                '  - [Section 2.1.1](#section-211)',
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
                '  - [Section 1.1.1](#section-111)',
                '- [Section 2.1](#section-21)'
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
                '- [Section 中文](#section-%e4%b8%ad%e6%96%87)',
                '  - [Section 1.1](#section-11)',
                '- [Section 2](#section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
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
                '- [Section 1](#section-1)',
                '  - [Section 1.1](#section-11)'
            ],
            new Selection(7, 30, 7, 30)).then(done, done);
    });

    test("Non-Latin symbols (Option `toc.githubCompatibility`)", done => {
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
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '# Head 3',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Head 1',
                '# Head 2',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '- [Head 4](#head-4)',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '- [Head 4](#head-4)',
                '',
                '# Head 3',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0)).then(done, done);
    });

    test("Exclude omitted headings (`toc.omittedFromToc`)", (done) => {
        testCommand(
            'markdown.extension.toc.create',
            {
                'markdown.extension.toc.omittedFromToc': {
                    [testMdFile]: [
                        // With more than one space between sharps and text.
                        '#  Introduction',
                        // With spaces before sharps ans special chars.
                        '  ## Ignored - with "special" ~ chars',
                        '## Underlined heading'
                    ],
                    'not-ignored.md': ['# Head 1']
                }
            },
            [
                '',
                '',
                '# Introduction',
                '## Sub heading (should be ignored, too)',
                '# Head 1',
                '',
                // Underlined heading should be ignored, too.
                'Underlined heading',
                '------------------',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '# Head 3',
                '## Ignored - with "special" ~ chars',
                // Second "Introduction" heading is visible (should have a number suffix in ToC).
                '## Introduction',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0),
            [
                '- [Head 1](#head-1)',
                '- [Head 3](#head-3)',
                '  - [Introduction](#introduction-1)',
                '- [Head 4](#head-4)',
                '',
                '# Introduction',
                '## Sub heading (should be ignored, too)',
                '# Head 1',
                '',
                'Underlined heading',
                '------------------',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '',
                '# Head 3',
                '## Ignored - with "special" ~ chars',
                '## Introduction',
                '# Head 4'
            ],
            new Selection(3, 19, 3, 19)
        ).then(done, done);
    })

    test("Option `toc.downcaseLink`", done => {
        testCommand('markdown.extension.toc.create',
            {
                "markdown.extension.toc.downcaseLink": false
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
                '- [Section 1](#Section-1)',
                '  - [Section 1.1](#Section-11)',
                '- [Section 2](#Section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Inline <!-- omit in toc -->", done => {
        testCommand('markdown.extension.toc.create', {},
            [
                '# Section 1',
                '',
                '## Section 1.1 <!-- omit in toc -->',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1 <!-- omit in toc -->',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)'
            ],
            new Selection(7, 25, 7, 25)).then(done, done);
    });

    test("<!-- omit in toc --> in previous line", done => {
        testCommand('markdown.extension.toc.create', {},
            [
                '# Section 1',
                '',
                '<!-- omit in toc -->',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(7, 0, 7, 0),
            [
                '# Section 1',
                '',
                '<!-- omit in toc -->',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)'
            ],
            new Selection(8, 25, 8, 25)).then(done, done);
    });

    test("Ignore code blocks", done => {
        testCommand('markdown.extension.toc.create', {},
            [
                '# Section 1',
                '',
                '```',
                '## Section 1.1',
                '```',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(8, 0, 8, 0),
            [
                '# Section 1',
                '',
                '```',
                '## Section 1.1',
                '```',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)'
            ],
            new Selection(9, 25, 9, 25)).then(done, done);
    });

    test("Strip markdown styles in headings", done => {
        testCommand('markdown.extension.toc.create', {},
            [
                '# [text](link)',
                '# **bold**',
                '# *it1* _it2_',
                '',
                ''
            ],
            new Selection(4, 0, 4, 0),
            [
                '# [text](link)',
                '# **bold**',
                '# *it1* _it2_',
                '',
                '- [text](#text)',
                '- [bold](#bold)',
                '- [it1 it2](#it1-it2)'
            ],
            new Selection(6, 21, 6, 21)).then(done, done);
    });
});