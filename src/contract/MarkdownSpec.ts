"use strict";

// The name of types here begins with `Markdown`.

/**
 * CommonMark bullet list marker.
 * https://spec.commonmark.org/0.29/#list-items
 */
export const enum MarkdownBulletListMarker {
    Asterisk = "*",
    Hyphen = "-",
    Plus = "+",
}

/**
 * CommonMark emphasis indicator.
 * https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis
 */
export const enum MarkdownEmphasisIndicator {
    Asterisk = "*",
    Underscore = "_",
}

/**
 * CommonMark strong emphasis indicator.
 * https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis
 */
 export const enum MarkdownStrongEmphasisIndicator {
    Asterisk = "**",
    Underscore = "__",
}

/**
 * The heading level allowed by the CommonMark Spec.
 * https://spec.commonmark.org/0.29/#atx-headings
 */
export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
