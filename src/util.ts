'use strict'

import * as fs from 'fs';
import { commands, Position, Range, TextDocument, TextEditor, Uri, workspace } from 'vscode';
import localize from './localize';
import { commonmarkEngine, mdEngine } from './markdownEngine';
import { decodeHTML } from 'entities';

/* ┌────────┐
   │ Others │
   └────────┘ */

/** Scheme `File` or `Untitled` */
export const mdDocSelector = [{ language: 'markdown', scheme: 'file' }, { language: 'markdown', scheme: 'untitled' }];

export function isMdEditor(editor: TextEditor) {
    return editor && editor.document && editor.document.languageId === 'markdown';
}

export const REGEX_FENCED_CODE_BLOCK = /^( {0,3}|\t)```[^`\r\n]*$[\w\W]+?^( {0,3}|\t)``` *$/gm;

export function isInFencedCodeBlock(doc: TextDocument, lineNum: number): boolean {
    let textBefore = doc.getText(new Range(new Position(0, 0), new Position(lineNum, 0)));
    textBefore = textBefore.replace(REGEX_FENCED_CODE_BLOCK, '').replace(/<!--[\W\w]+?-->/g, '');
    //// So far `textBefore` should contain no valid fenced code block or comment
    return /^( {0,3}|\t)```[^`\r\n]*$[\w\W]*$/gm.test(textBefore);
}

export function mathEnvCheck(doc: TextDocument, pos: Position): string {
    const lineTextBefore = doc.lineAt(pos.line).text.substring(0, pos.character);
    const lineTextAfter = doc.lineAt(pos.line).text.substring(pos.character);

    if (
        /(^|[^\$])\$(|[^ \$].*)\\\w*$/.test(lineTextBefore)
        && lineTextAfter.includes('$')
    ) {
        // Inline math
        return "inline";
    } else {
        const textBefore = doc.getText(new Range(new Position(0, 0), pos));
        const textAfter = doc.getText().substr(doc.offsetAt(pos));
        let matches;
        if (
            (matches = textBefore.match(/\$\$/g)) !== null
            && matches.length % 2 !== 0
            && textAfter.includes('\$\$')
        ) {
            // $$ ... $$
            return "display";
        } else {
            return "";
        }
    }
}

let fileSizesCache = {}
export function isFileTooLarge(document: TextDocument): boolean {
    const sizeLimit = workspace.getConfiguration('markdown.extension.syntax').get<number>('decorationFileSizeLimit');
    const filePath = document.uri.fsPath;
    if (!filePath || !fs.existsSync(filePath)) {
        return false;
    }
    const version = document.version;
    if (fileSizesCache.hasOwnProperty(filePath) && fileSizesCache[filePath][0] === version) {
        return fileSizesCache[filePath][1];
    } else {
        const isTooLarge = fs.statSync(filePath)['size'] > sizeLimit;
        fileSizesCache[filePath] = [version, isTooLarge];
        return isTooLarge;
    }
}

/* ┌───────────┐
   │ Changelog │
   └───────────┘ */

export function getNewFeatureMsg(version: string) {
    switch (version) {
        case '1.3.0':
            return localize("1.3.0 msg");
        case '1.4.0':
            return localize("1.4.0 msg");
        case '1.5.0':
            return localize("1.5.0 msg");
        case '2.1.0':
            return localize("2.1.0 msg");
        case '2.4.0':
            return localize("2.4.0 msg");
        case '3.0.0':
            return localize("3.0.0 msg");
    }
    return undefined;
}

export function showChangelog() {
    commands.executeCommand('vscode.open', Uri.parse('https://github.com/yzhang-gh/vscode-markdown/blob/master/CHANGELOG.md'));
}

/* ┌─────────────────┐
   │ Text Extraction │
   └─────────────────┘ */

/**
 * Convert Markdown to plain text.
 * Remove Markdown syntax (bold, italic, links etc.) in a heading.
 * This function is only for the `github` and `gitlab` slugify functions.
 *
 * A Markdown heading may contain Markdown styles, e.g. `_italic_`.
 * It can also have HTML tags, e.g. `<code>`.
 * They should be converted to their plain text form first.
 *
 * What this function actually does:
 * 1. Handle a few special cases.
 * 2. `renderInline(text)`
 * 3. `getTextInHtml(html)`
 *
 * @param text - A Markdown heading content.
 */
function mdHeadingToPlaintext(text: string): string {
    //// Issue #515
    text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/, (_, g1) => g1);

    // ! Use a clean CommonMark only engine to avoid interfering with plugins from other extensions.
    // ! Use `renderInline` to avoid parsing the string as blocks accidentally.
    // ! See #567, #585, #732, #792
    const html = commonmarkEngine.engine.renderInline(text).replace(/\r?\n$/, '');
    text = getTextInHtml(html);

    return text;
}

/**
 * Get plain text from an HTML string.
 *
 * This function is similar to `HTMLElement.innerText` getter. The differences are:
 *
 * * It only considers most common cases.
 * * It preserves consecutive spaces.
 *
 * What this function actually does:
 * 1. Strip paired tags (#179)
 * 2. Strip empty elements
 * 3. Decode HTML entities (#175, #575)
 *
 * @param html
 */
function getTextInHtml(html: string) {
    let text = html;
    //// remove <!-- HTML comments -->
    text = text.replace(/(<!--[^>]*?-->)/g, '');
    //// remove HTML tags
    while (/<(span|em|strong|a|p|code|kbd)[^>]*>(.*?)<\/\1>/.test(text)) {
        text = text.replace(/<(span|em|strong|a|p|code|kbd)[^>]*>(.*?)<\/\1>/g, (_, _g1, g2) => g2)
    }

    //// Remove common empty elements (aka. single tag).
    //// https://developer.mozilla.org/en-US/docs/Glossary/Empty_element
    while (/<(br|img)[^>]*\/?>/.test(text)) {
        text = text.replace(/<(br|img)[^>]*\/?>/g, '')
    }

    //// Decode HTML entities.
    text = decodeHTML(text);

    return text;
}

/* ┌─────────┐
   │ Slugify │
   └─────────┘ */

// Converted from Ruby regular expression `/[^\p{Word}\- ]/u`
// `\p{Word}` => Letter (Ll/Lm/Lo/Lt/Lu), Mark (Mc/Me/Mn), Number (Nd/Nl), Connector_Punctuation (Pc)
// ! It's weird that Ruby's `\p{Word}` actually does not include Category No.
// https://ruby-doc.org/core/Regexp.html
// https://rubular.com/r/ThqXAm370XRMz6
/**
 * The definition of punctuation from GitHub and GitLab.
 */
const PUNCTUATION_REGEXP = /[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc}\- ]/gu;

/**
 * Slugify a string.
 * @param heading - The string.
 * @param mode - The slugify mode.
 * @param downcase - `true` to force to convert all the characters to lowercase. Otherwise, `false`.
 */
export function slugify(heading: string, mode?: string, downcase?: boolean) {
    if (mode === undefined) {
        mode = workspace.getConfiguration('markdown.extension.toc').get<string>('slugifyMode');
    }
    if (downcase === undefined) {
        downcase = workspace.getConfiguration('markdown.extension.toc').get<boolean>('downcaseLink');
    }

    let slug = heading.trim();

    // Case conversion must be performed before calling slugify function.
    // Because some slugify functions encode strings in their own way.
    if (downcase) {
        slug = slug.toLowerCase()
    }

    // Sort by popularity.
    switch (mode) {
        case 'github':
            slug = slugifyMethods.github(slug);
            break;

        case 'gitlab':
            slug = slugifyMethods.gitlab(slug);
            break;

        case 'gitea':
            slug = slugifyMethods.gitea(slug);
            break;

        case 'vscode':
            slug = slugifyMethods.vscode(slug);
            break;

        case 'azureDevops':
            slug = slugifyMethods.azureDevops(slug);
            break;

        default:
            slug = slugifyMethods.github(slug);
            break;
    }

    return slug;
}

/**
 * Slugify methods.
 *
 * The keys are slugify modes.
 * The values are corresponding slugify functions, whose signature must be `(slug: string) => string`.
 */
const slugifyMethods: { readonly [mode: string]: (text: string) => string; } = {
    /**
     * Azure DevOps
     */
    "azureDevops": (slug: string): string => {
        // https://lemmingh.github.io/vscode-markdown-docs/specs/slugify/azure-devops.html
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#Description
        slug = encodeURIComponent(
            slug.toLowerCase()
                .replace(/\p{Zs}/gu, '-')
        ).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16));

        return slug;
    },

    /**
     * GitHub slugify function
     */
    "github": (slug: string): string => {
        // <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        slug = mdHeadingToPlaintext(slug);
        slug = slug.replace(PUNCTUATION_REGEXP, '')
            .toLowerCase() // According to an inspection in 2020-09, GitHub performs full Unicode case conversion now.
            .replace(/ /g, '-');

        return slug;
    },

    /**
     * Gitea
     */
    "gitea": (slug: string): string => {
        // Gitea uses the blackfriday parser
        // https://godoc.org/github.com/russross/blackfriday#hdr-Sanitized_Anchor_Names
        slug = slug.replace(PUNCTUATION_REGEXP, '-')
            .replace(/ /g, '-')
            .replace(/_/g, '-')
            .split('-')
            .filter(Boolean)
            .join('-');

        return slug;
    },

    /**
     * GitLab
     */
    "gitlab": (slug: string): string => {
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/lib/banzai/filter/table_of_contents_filter.rb#L32>
        // https://gitlab.com/gitlab-org/gitlab/blob/b434ca4f27a0c4e3eed2c087a8d1902a09418790/lib/gitlab/utils/markdown.rb#L8-16
        // Some bits from their other slugify function
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/app/assets/javascripts/lib/utils/text_utility.js#L49>
        slug = mdHeadingToPlaintext(slug);
        slug = slug.replace(PUNCTUATION_REGEXP, '')
            .toLowerCase()
            .replace(/ /g, '-') // Replace space with dash.
            .replace(/-+/g, '-') // Replace multiple/consecutive dashes with only one.
            // digits-only hrefs conflict with issue refs
            .replace(/^(\d+)$/, 'anchor-$1');

        return slug;
    },

    /**
     * Visual Studio Code
     */
    "vscode": (slug: string): string => {
        // <https://github.com/Microsoft/vscode/blob/f5738efe91cb1d0089d3605a318d693e26e5d15c/extensions/markdown-language-features/src/slugify.ts#L22-L29>
        slug = encodeURI(
            slug.replace(/\s+/g, '-') // Replace whitespace with -
                .replace(/[\]\[\!\'\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
                .replace(/^\-+/, '') // Remove leading -
                .replace(/\-+$/, '') // Remove trailing -
        );

        return slug;
    }
};
