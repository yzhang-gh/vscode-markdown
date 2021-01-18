'use strict';

import { commands, DocumentSelector, Position, Range, TextDocument, TextEditor, Uri, workspace } from 'vscode';
import localize from './localize';
import { commonmarkEngine, mdEngine } from './markdownEngine';
import { decodeHTML } from 'entities';
import LanguageIdentifier from "./contract/LanguageIdentifier";
import SlugifyMode from "./contract/SlugifyMode";

/* ┌────────┐
   │ Others │
   └────────┘ */

/** Scheme `File` or `Untitled` */
export const mdDocSelector: DocumentSelector = [
    { language: LanguageIdentifier.Markdown, scheme: 'file' },
    { language: LanguageIdentifier.Markdown, scheme: 'untitled' },
];

export function isMdEditor(editor: TextEditor) {
    return editor && editor.document && editor.document.languageId === 'markdown';
}

/**
 * **Do not call `exec()` method, to avoid accidentally changing its state!**
 *
 * Match most kinds of fenced code blocks:
 *
 * * Only misses <https://spec.commonmark.org/0.29/#example-116>.
 * * Due to the limitations of regular expression, the "end of the document" cases are not handled.
 */
export const REGEX_FENCED_CODE_BLOCK = /^ {0,3}(?<fence>(?<char>[`~])\k<char>{2,})[^`\r\n]*$[^]*?^ {0,3}\k<fence>\k<char>* *$/gm;

/**
 * Checks whether the line is in a fenced code block.
 * @param lineIndex The zero-based line index.
 */
export function isInFencedCodeBlock(doc: TextDocument, lineIndex: number): boolean {
    const docTokens = commonmarkEngine.engine.parse(doc.getText(), {});

    for (const token of docTokens) {
        if (
            token.type === 'fence'
            && token.tag === 'code'
            && token.map![0] <= lineIndex
            && lineIndex < token.map![1]
        ) {
            return true;
        }
    }

    return false;
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

const fileSizesCache = new Map<string, [number, boolean]>();
export function isFileTooLarge(document: TextDocument): boolean {
    const sizeLimit = workspace.getConfiguration('markdown.extension.syntax').get<number>('decorationFileSizeLimit')!;

    const docUri = document.uri.toString();
    const docVersion = document.version;

    const cache = fileSizesCache.get(docUri);
    if (cache !== undefined && cache[0] === docVersion) {
        return cache[1];
    } else {
        // Very close but not equal to the binary size, however, enough.
        const isTooLarge = document.getText().length * 2 > sizeLimit;
        fileSizesCache.set(docUri, [docVersion, isTooLarge]);
        return isTooLarge;
    }
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
    text = text.replace(/\[([^\]]*?)\]\[[^\]]*?\]/g, '$1');

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
    text = text.replace(/<!--[^>]*?-->/g, '');
    //// remove HTML tags
    while (/<(em|strong|code|a|kbd|span|p)[^>]*?>(.*?)<\/\1>/s.test(text)) {
        text = text.replace(/<(em|strong|code|a|kbd|span|p)[^>]*?>(.*?)<\/\1>/sg, '$2');
    }

    //// Remove common empty elements (aka. single tag).
    //// https://developer.mozilla.org/en-US/docs/Glossary/Empty_element
    while (/<(?:br|img)[^>]*?\/?>/.test(text)) {
        text = text.replace(/<(?:br|img)[^>]*?\/?>/g, '');
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
const Regexp_Punctuation_Github = /[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc}\- ]/gu;

const Regexp_Gitlab_Product_Suffix = /[ \t\r\n\f\v]*\**\((?:core|starter|premium|ultimate)(?:[ \t\r\n\f\v]+only)?\)\**/g;

/**
 * Slugify a string.
 * @param heading - The raw content of the heading according to the CommonMark Spec.
 * @param mode - The slugify mode.
 * @param downcase - `true` to force to convert all the characters to lowercase. Otherwise, `false`.
 */
export function slugify(heading: string, mode?: SlugifyMode, downcase?: boolean) {
    if (mode === undefined) {
        mode = workspace.getConfiguration('markdown.extension.toc').get<SlugifyMode>('slugifyMode');
    }
    if (downcase === undefined) {
        downcase = workspace.getConfiguration('markdown.extension.toc').get<boolean>('downcaseLink');
    }

    // Do never twist the input here!
    // Pass the raw heading content as is to slugify function.
    let slug = heading;

    // Additional case conversion must be performed before calling slugify function.
    // Because some slugify functions encode strings in their own way.
    if (downcase) {
        slug = slug.toLowerCase();
    }

    // Sort by popularity.
    switch (mode) {
        case SlugifyMode.GitHub:
            slug = slugifyMethods[SlugifyMode.GitHub](slug);
            break;

        case SlugifyMode.GitLab:
            slug = slugifyMethods[SlugifyMode.GitLab](slug);
            break;

        case SlugifyMode.Gitea:
            slug = slugifyMethods[SlugifyMode.Gitea](slug);
            break;

        case SlugifyMode.VisualStudioCode:
            slug = slugifyMethods[SlugifyMode.VisualStudioCode](slug);
            break;

        case SlugifyMode.AzureDevOps:
            slug = slugifyMethods[SlugifyMode.AzureDevOps](slug);
            break;

        case SlugifyMode.BitbucketCloud:
            slug = slugifyMethods[SlugifyMode.BitbucketCloud](slug);
            break;

        default:
            slug = slugifyMethods[SlugifyMode.GitHub](slug);
            break;
    }

    return slug;
}

/**
 * Slugify methods.
 *
 * The keys are slugify modes.
 * The values are corresponding slugify functions, whose signature must be `(rawContent: string) => string`.
 */
const slugifyMethods: { readonly [mode in SlugifyMode]: (rawContent: string) => string; } = {
    // Sort in alphabetical order.

    /**
     * Azure DevOps
     */
    [SlugifyMode.AzureDevOps]: (slug: string): string => {
        // https://markdown-all-in-one.github.io/docs/specs/slugify/azure-devops.html
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#Description
        slug = encodeURIComponent(
            slug.trim()
                .toLowerCase()
                .replace(/\p{Zs}/gu, '-')
        ).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16));

        return slug;
    },

    /**
     * Bitbucket Cloud
     */
    [SlugifyMode.BitbucketCloud]: (slug: string): string => {
        // https://support.atlassian.com/bitbucket-cloud/docs/readme-content/
        // https://bitbucket.org/tutorials/markdowndemo/
        slug = 'markdown-header-'
            + slugifyMethods.github(slug).replace(/-+/g, '-');

        return slug;
    },

    /**
     * GitHub
     */
    [SlugifyMode.GitHub]: (slug: string): string => {
        // According to an inspection in 2020-12, GitHub passes the raw content as is,
        // and does not trim leading or trailing C0, Zs characters in any step.
        // <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        slug = mdHeadingToPlaintext(slug)
            .replace(Regexp_Punctuation_Github, '')
            .toLowerCase() // According to an inspection in 2020-09, GitHub performs full Unicode case conversion now.
            .replace(/ /g, '-');

        return slug;
    },

    /**
     * Gitea
     */
    [SlugifyMode.Gitea]: (slug: string): string => {
        // Gitea uses the blackfriday parser
        // https://godoc.org/github.com/russross/blackfriday#hdr-Sanitized_Anchor_Names
        slug = slug
            .replace(/^[^\p{L}\p{N}]+/u, '')
            .replace(/[^\p{L}\p{N}]+$/u, '')
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .toLowerCase();

        return slug;
    },

    /**
     * GitLab
     */
    [SlugifyMode.GitLab]: (slug: string): string => {
        // https://gitlab.com/help/user/markdown
        // https://docs.gitlab.com/ee/api/markdown.html
        // https://docs.gitlab.com/ee/development/wikis.html
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/lib/banzai/filter/table_of_contents_filter.rb#L32>
        // https://gitlab.com/gitlab-org/gitlab/blob/a8c5858ce940decf1d263b59b39df58f89910faf/lib/gitlab/utils/markdown.rb

        slug = mdHeadingToPlaintext(slug)
            .replace(/^[ \t\r\n\f\v]+/, '')
            .replace(/[ \t\r\n\f\v]+$/, '') // https://ruby-doc.org/core/String.html#method-i-strip
            .toLowerCase()
            .replace(Regexp_Gitlab_Product_Suffix, '')
            .replace(Regexp_Punctuation_Github, '')
            .replace(/ /g, '-') // Replace space with dash.
            .replace(/-+/g, '-') // Replace multiple/consecutive dashes with only one.
            // digits-only hrefs conflict with issue refs
            .replace(/^(\d+)$/, 'anchor-$1');

        return slug;
    },

    /**
     * Visual Studio Code
     */
    [SlugifyMode.VisualStudioCode]: (slug: string): string => {
        // <https://github.com/Microsoft/vscode/blob/f5738efe91cb1d0089d3605a318d693e26e5d15c/extensions/markdown-language-features/src/slugify.ts#L22-L29>
        slug = encodeURI(
            slug.trim()
                .replace(/\s+/g, '-') // Replace whitespace with -
                .replace(/[\]\[\!\'\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
                .replace(/^\-+/, '') // Remove leading -
                .replace(/\-+$/, '') // Remove trailing -
        );

        return slug;
    }
};
