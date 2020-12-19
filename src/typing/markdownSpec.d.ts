// Sort in alphabetical order.
// The name of types here begins with `Markdown`.

/**
 * CommonMark bullet list marker.
 * https://spec.commonmark.org/0.29/#list-items
 */
export type MarkdownBulletListMarker =
    | "-"
    | "+"
    | "*"
    ;

/**
 * CommonMark emphasis indicator.
 * https://spec.commonmark.org/0.29/#emphasis-and-strong-emphasis
 */
export type MarkdownEmphasisIndicator =
    | "*"
    | "_"
    ;

/**
 * The heading level allowed by the CommonMark Spec.
 * https://spec.commonmark.org/0.29/#atx-headings
 */
export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
