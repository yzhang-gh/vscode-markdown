'use strict'

import * as fs from 'fs';
import { commands, Position, Range, TextDocument, TextEditor, Uri, workspace } from 'vscode';
import localize from './localize';
import { mdEngine } from './markdownEngine';

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
 * Remove Markdown syntax (bold, italic, links etc.) in a heading.
 * This function is only used before the `slugify` function of `github` mode.
 * 
 * A Markdown heading may contain Markdown styles, e.g. `_italic_`.
 * It can also have HTML tags, e.g. `<code>`.
 * They should not be passed to the `slugify` function.
 *
 * What this function actually does:
 * 1. (Escape syntax like `1.`)
 * 2. `md.render(text)`
 * 3. `getTextInHtml(text)`
 * 4. (Unescape)
 *
 * @param text A Markdown heading
 */
function mdHeadingToPlaintext(text: string) {
    //// Issue #515
    text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/, (_, g1) => g1);
    //// Escape leading `1.` and `1)` (#567, #585)
    text = text.replace(/^([\d]+)(\.)/, (_, g1) => g1 + '%dot%');
    text = text.replace(/^([\d]+)(\))/, (_, g1) => g1 + '%par%');
    //// TMP escape emoji code (which is a side effect of using `mdEngine.cacheMd` to convert MD to HTML)
    text = text.replace(/:/g, '%colon%');
    //// Escape math environment
    text = text.replace(/\$/g, '%dollar%');

    if (!mdEngine.cacheMd) {
        return text;
    }

    const html = mdEngine.cacheMd.render(text).replace(/\r?\n$/, '');
    text = getTextInHtml(html);

    //// Unescape
    text = text.replace('%dot%', '.');
    text = text.replace('%par%', ')');
    text = text.replace(/%colon%/g, ':');
    text = text.replace(/%dollar%/g, '$');
    return text;
}

/**
 * Get plaintext from a HTML string
 * 
 * 1. Convert HTML entities (#175, #575)
 * 2. Strip HTML tags (#179)
 * 
 * @param html 
 */
function getTextInHtml(html: string) {
    //// HTML entities
    let text = html.replace(/(&emsp;)/g, _ => ' ')
        .replace(/(&quot;)/g, _ => '"')
        .replace(/(&lt;)/g, _ => '<')
        .replace(/(&gt;)/g, _ => '>')
        .replace(/(&amp;)/g, _ => '&');
    //// remove <!-- HTML comments -->
    text = text.replace(/(<!--[^>]*?-->)/g, '');
    //// remove HTML tags
    while (/<(span|em|strong|a|p|code|kbd)[^>]*>(.*?)<\/\1>/.test(text)) {
        text = text.replace(/<(span|em|strong|a|p|code|kbd)[^>]*>(.*?)<\/\1>/g, (_, _g1, g2) => g2)
    }
    text = text.replace(/ +/g, ' ');
    return text;
}

/* ┌─────────┐
   │ Slugify │
   └─────────┘ */

// Converted from `/[^\p{Word}\- ]/u`
// `\p{Word}` => ASCII plus Letter (Ll/Lm/Lo/Lt/Lu), Mark (Mc/Me/Mn), Number (Nd/Nl/No), Connector_Punctuation (Pc)
const PUNCTUATION_REGEXP = /[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu;

export function slugify(heading: string, mode?: string, downcase?: boolean) {
    if (mode === undefined) {
        mode = workspace.getConfiguration('markdown.extension.toc').get<string>('slugifyMode');
    }
    if (downcase === undefined) {
        downcase = workspace.getConfiguration('markdown.extension.toc').get<boolean>('downcaseLink');
    }

    let slug = mdHeadingToPlaintext(heading.trim());

    if (mode === 'github') {
        // GitHub slugify function
        // <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        slug = slug.replace(PUNCTUATION_REGEXP, '')
            // .replace(/[A-Z]/g, match => match.toLowerCase()) // only downcase ASCII region
            .replace(/ /g, '-');

        if (downcase) {
            slug = slug.toLowerCase()
        }
    } else if (mode === 'gitea') {
        // Gitea uses the blackfriday parser
        // https://godoc.org/github.com/russross/blackfriday#hdr-Sanitized_Anchor_Names
        slug = slug.replace(PUNCTUATION_REGEXP, '-')
            .replace(/ /g, '-')
            .replace(/_/g, '-')
            .split('-')
            .filter(Boolean)
            .join('-');

        if (downcase) {
            slug = slug.toLowerCase()
        }
    } else if (mode === 'gitlab') {
        // GitLab slugify function, translated to JS
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/lib/banzai/filter/table_of_contents_filter.rb#L32>
        // Some bits from their other slugify function
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/app/assets/javascripts/lib/utils/text_utility.js#L49>
        slug = slug.replace(PUNCTUATION_REGEXP, '')
            .replace(/ /g, '-')
            // Remove any duplicate separators or separator prefixes/suffixes
            .split('-')
            .filter(Boolean)
            .join('-')
            // digits-only hrefs conflict with issue refs
            .replace(/^(\d+)$/, 'anchor-$1');

        if (downcase) {
            slug = slug.toLowerCase();
        }
    } else {
        // VSCode slugify function
        // <https://github.com/Microsoft/vscode/blob/f5738efe91cb1d0089d3605a318d693e26e5d15c/extensions/markdown-language-features/src/slugify.ts#L22-L29>
        slug = encodeURI(
            slug.replace(/\s+/g, '-') // Replace whitespace with -
                .replace(/[\]\[\!\'\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
                .replace(/^\-+/, '') // Remove leading -
                .replace(/\-+$/, '') // Remove trailing -
        );

        if (downcase) {
            slug = slug.toLowerCase()
        }
    }

    return slug;
}
