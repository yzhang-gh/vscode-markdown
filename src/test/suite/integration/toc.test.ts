import { Selection } from "vscode";
import { resetConfiguration, updateConfiguration } from "../util/configuration";
import { testCommand, Test_Md_File_Path } from "../util/generic";

suite("TOC.", () => {
    suiteSetup(async () => {
        await resetConfiguration();
    });

    suiteTeardown(async () => {
        await resetConfiguration();
    });

    test("Create", () => {
        return testCommand('markdown.extension.toc.create',
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
                '- [Section 2](#section-2)',
                '',
            ],
            new Selection(9, 0, 9, 0));
    });

    test("Update", () => {
        return testCommand('markdown.extension.toc.update',
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
                '  - [Section 2.1](#section-21)',
                '',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Update (ordered list)", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.orderedList", true]] });
        await testCommand('markdown.extension.toc.update',
            [
                '# Section 1',
                '',
                '## Section 1.1',
                '',
                '# Section 2',
                '',
                '## Section 2.1',
                '',
                '1. [Section 1](#section-1)',
                '   1. [Section 1.1](#section-11)',
                '2. [Section 2](#section-2)'
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
                '1. [Section 1](#section-1)',
                '   1. [Section 1.1](#section-11)',
                '2. [Section 2](#section-2)',
                '   1. [Section 2.1](#section-21)',
                '',
            ],
            new Selection(0, 0, 0, 0)
        );
        await resetConfiguration();
    });

    test("Create (levels 2..3)", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.levels", "2..3"]] });
        await testCommand("markdown.extension.toc.create",
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
                '',
            ],
            new Selection(20, 0, 20, 0)
        );
        await resetConfiguration();
    });

    test("Update (levels 2..3)", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.levels", "2..3"]] });
        await testCommand("markdown.extension.toc.update",
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
                '- [Section 2.1](#section-21)',
                '',
            ],
            new Selection(0, 0, 0, 0)
        );
        await resetConfiguration();

    });

    test("Ordered list (list markers larger than 9)", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.orderedList", true]] });
        await testCommand('markdown.extension.toc.create',
            [
                '# H1',
                '# H2',
                '# H3',
                '# H4',
                '# H5',
                '# H6',
                '# H7',
                '# H8',
                '# H9',
                '# H10',
                '## H11',
                '### H12',
                '',
                ''
            ],
            new Selection(13, 0, 13, 0),
            [
                '# H1',
                '# H2',
                '# H3',
                '# H4',
                '# H5',
                '# H6',
                '# H7',
                '# H8',
                '# H9',
                '# H10',
                '## H11',
                '### H12',
                '',
                '1. [H1](#h1)',
                '2. [H2](#h2)',
                '3. [H3](#h3)',
                '4. [H4](#h4)',
                '5. [H5](#h5)',
                '6. [H6](#h6)',
                '7. [H7](#h7)',
                '8. [H8](#h8)',
                '9. [H9](#h9)',
                '10. [H10](#h10)',
                '    1. [H11](#h11)',
                '       1. [H12](#h12)',
                ''
            ],
            new Selection(25, 0, 25, 0)
        );
        await resetConfiguration();
    });

    test("Setext headings", () => {
        return testCommand('markdown.extension.toc.create',
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
                '  - [Section 1.1](#section-11)',
                '',
            ],
            new Selection(8, 0, 8, 0));
    });

    test("ATX Heading closing sequence", () => {
        return testCommand('markdown.extension.toc.create',
            [
                '# H1 #',
                '## H1.1 ###',
                '## H1.2 ##  ',
                '# H2 ## foo',
                '# H3#',
                '# H4 \\###',
                '# H5 #\\##',
                '# H6 \\#',
                '',
                ''
            ],
            new Selection(9, 0, 9, 0),
            [
                '# H1 #',
                '## H1.1 ###',
                '## H1.2 ##  ',
                '# H2 ## foo',
                '# H3#',
                '# H4 \\###',
                '# H5 #\\##',
                '# H6 \\#',
                '',
                '- [H1](#h1)',
                '  - [H1.1](#h11)',
                '  - [H1.2](#h12)',
                '- [H2 ## foo](#h2--foo)',
                '- [H3#](#h3)',
                '- [H4 ###](#h4-)',
                '- [H5 ###](#h5-)',
                '- [H6 #](#h6-)',
                '',
            ],
            new Selection(17, 0, 17, 0));
    });

    test("Update multiple TOCs", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.slugifyMode", "github"]] });
        await testCommand('markdown.extension.toc.update',
            [
                '# Head 1',
                '# Head 2',
                '',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '<!-- -->',
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
                '<!-- -->',
                '- [Head 1](#head-1)',
                '- [Head 2](#head-2)',
                '- [Head 3](#head-3)',
                '- [Head 4](#head-4)',
                '',
                '# Head 3',
                '# Head 4'
            ],
            new Selection(0, 0, 0, 0)
        );
        await resetConfiguration();
    });

    test("Exclude omitted headings (`toc.omittedFromToc`)", async () => {
        await updateConfiguration({
            config: [["markdown.extension.toc.omittedFromToc", {
                [Test_Md_File_Path.fsPath]: [
                    // With more than one space between sharps and text.
                    '#  Introduction',
                    // With spaces before sharps ans special chars.
                    '  ## Ignored - with "special" ~ chars',
                    '## Underlined heading'
                ],
                'not-ignored.md': ['# Head 1']
            }]]
        });
        await testCommand(
            'markdown.extension.toc.create',
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
            new Selection(4, 0, 4, 0)
        );
        await resetConfiguration();
    });

    test("Inline <!-- omit from toc -->", () => {
        return testCommand('markdown.extension.toc.create',
            [
                '# Section 1',
                '',
                '## Section 1.1 <!-- omit from toc -->',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(6, 0, 6, 0),
            [
                '# Section 1',
                '',
                '## Section 1.1 <!-- omit from toc -->',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)',
                '',
            ],
            new Selection(8, 0, 8, 0));
    });

    test("<!-- omit from toc --> in previous line", () => {
        return testCommand('markdown.extension.toc.create',
            [
                '# Section 1',
                '',
                '<!-- omit from toc -->',
                '## Section 1.1',
                '',
                '<!-- omit in toc -->',
                '## Section 1.2',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(10, 0, 10, 0),
            [
                '# Section 1',
                '',
                '<!-- omit from toc -->',
                '## Section 1.1',
                '',
                '<!-- omit in toc -->',
                '## Section 1.2',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)',
                '',
            ],
            new Selection(12, 0, 12, 0));
    });

    test("Ignore fenced code blocks", () => {
        return testCommand('markdown.extension.toc.create',
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
                '- [Section 2](#section-2)',
                '',
            ],
            new Selection(10, 0, 10, 0));
    });

    test("Ignore indented code blocks created by TAB (U+0009)", () => {
        return testCommand('markdown.extension.toc.create',
            [
                '# Section 1',
                '',
                '\t```',
                '\t## Section 1.1',
                '\t```',
                '',
                '# Section 2',
                '',
                ''
            ],
            new Selection(8, 0, 8, 0),
            [
                '# Section 1',
                '',
                '\t```',
                '\t## Section 1.1',
                '\t```',
                '',
                '# Section 2',
                '',
                '- [Section 1](#section-1)',
                '- [Section 2](#section-2)',
                '',
            ],
            new Selection(10, 0, 10, 0));
    });

    test("Ignore code blocks. TOC update", () => {
        return testCommand('markdown.extension.toc.update',
            [
                '# H1',
                '# H2',
                '# H3',
                '',
                '```',
                '- [H1](#h1)',
                '- [H2](#h2)',
                '',
                '```'
            ],
            new Selection(0, 0, 0, 0),
            [
                '# H1',
                '# H2',
                '# H3',
                '',
                '```',
                '- [H1](#h1)',
                '- [H2](#h2)',
                '',
                '```'
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Markdown syntax in headings", () => {
        return testCommand('markdown.extension.toc.create',
            [
                '# [text](link)',
                '# [text2][label]',
                '# [collapsed][ref]',
                '# **bold**',
                '# *it1* _it2_',
                '# `code`',
                '# 1. Heading',
                '# 1) Heading',
                '[ref]: uri',
                '',
                ''
            ],
            new Selection(10, 0, 10, 0),
            [
                '# [text](link)',
                '# [text2][label]',
                '# [collapsed][ref]',
                '# **bold**',
                '# *it1* _it2_',
                '# `code`',
                '# 1. Heading',
                '# 1) Heading',
                '[ref]: uri',
                '',
                '- [text](#text)',
                '- [\\[text2\\]\\[label\\]](#text2label)',
                '- [collapsed](#collapsed)',
                '- [**bold**](#bold)',
                '- [*it1* _it2_](#it1-it2)',
                '- [`code`](#code)',
                '- [1. Heading](#1-heading)',
                '- [1) Heading](#1-heading-1)',
                '',
            ],
            new Selection(18, 0, 18, 0));
    });

    test("Add section numbers", () => {
        return testCommand('markdown.extension.toc.addSecNumbers',
            [
                '---',
                'title: test',
                '---',
                '# Heading 1',
                '##  Heading 1.1',
                '   Heading 2',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## Heading 2.1',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## Heading 2.2',
            ],
            new Selection(0, 0, 0, 0),
            [
                '---',
                'title: test',
                '---',
                '# 1. Heading 1',
                '##  1.1. Heading 1.1',
                '   2. Heading 2',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## 2.1. Heading 2.1',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## 2.2. Heading 2.2',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Update section numbers", () => {
        return testCommand('markdown.extension.toc.addSecNumbers',
            [
                '---',
                'title: test',
                '---',
                '# Heading 1',
                '## 1.2. Heading 1.1',
                '2. Not Heading',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## 2.1.1. Heading 1.2',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## 2.2. Heading 1.3',
            ],
            new Selection(0, 0, 0, 0),
            [
                '---',
                'title: test',
                '---',
                '# 1. Heading 1',
                '## 1.1. Heading 1.1',
                '2. Not Heading',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## 1.2. Heading 1.2',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## 1.3. Heading 1.3',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Remove section numbers", () => {
        return testCommand('markdown.extension.toc.removeSecNumbers',
            [
                '---',
                'title: test',
                '---',
                '# 1. Heading 1',
                '## 1.1. Heading 1.1',
                '2. Not Heading',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## 2.1. Heading 2.1',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## 2.2. Heading 2.2',
            ],
            new Selection(0, 0, 0, 0),
            [
                '---',
                'title: test',
                '---',
                '# Heading 1',
                '## Heading 1.1',
                '2. Not Heading',
                '===',
                '```markdown',
                '# _Heading 3',
                '```',
                '## Heading 2.1',
                '## _Heading 2.2 <!-- omit in toc -->',
                '<!--',
                '## _Heading 2.3',
                '-->',
                '## Heading 2.2',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Section numbering starting level", () => {
        return testCommand('markdown.extension.toc.addSecNumbers',
            [
                '# Heading <!-- omit in toc -->',
                '## Heading 1',
                '## Heading 2',
                '## Heading 3',
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Heading <!-- omit in toc -->',
                '## 1. Heading 1',
                '## 2. Heading 2',
                '## 3. Heading 3',
            ],
            new Selection(0, 0, 0, 0));
    });

    test("Section numbering and `toc.levels`", async () => {
        await updateConfiguration({ config: [["markdown.extension.toc.levels", "2..6"]] });
        await testCommand('markdown.extension.toc.addSecNumbers',
            [
                '# Heading',
                '## Heading 1',
                '## Heading 2',
                '## Heading 3',
            ],
            new Selection(0, 0, 0, 0),
            [
                '# Heading',
                '## 1. Heading 1',
                '## 2. Heading 2',
                '## 3. Heading 3',
            ],
            new Selection(0, 0, 0, 0)
        );
        await resetConfiguration();
    });
});
