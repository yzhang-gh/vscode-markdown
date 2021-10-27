import * as vscode from "vscode";
import type { IConfigurationKnownKey } from "../configuration/model";

// Keys are sorted in alphabetical order.

const enum Color {
    EditorCodeSpanBackground,
    EditorCodeSpanBorder,
    EditorFormattingMarkForeground,
    EditorTrailingSpaceBackground,
}

const colors: Readonly<Record<Color, vscode.ThemeColor>> = {
    [Color.EditorCodeSpanBackground]: new vscode.ThemeColor("markdown.extension.editor.codeSpan.background"),
    [Color.EditorCodeSpanBorder]: new vscode.ThemeColor("markdown.extension.editor.codeSpan.border"),
    [Color.EditorFormattingMarkForeground]: new vscode.ThemeColor("markdown.extension.editor.formattingMark.foreground"),
    [Color.EditorTrailingSpaceBackground]: new vscode.ThemeColor("markdown.extension.editor.trailingSpace.background"),
};

const enum FontIcon {
    DownwardsArrow,
    DownwardsArrowWithCornerLeftwards,
    Link,
    Pilcrow,
}

const fontIcons: Readonly<Record<FontIcon, Readonly<vscode.ThemableDecorationAttachmentRenderOptions>>> = {
    [FontIcon.DownwardsArrow]: {
        contentText: "↓",
        color: colors[Color.EditorFormattingMarkForeground],
    },
    [FontIcon.DownwardsArrowWithCornerLeftwards]: {
        contentText: "↵",
        color: colors[Color.EditorFormattingMarkForeground],
    },
    [FontIcon.Link]: {
        contentText: "\u{1F517}\u{FE0E}",
        color: colors[Color.EditorFormattingMarkForeground],
    },
    [FontIcon.Pilcrow]: {
        contentText: "¶",
        color: colors[Color.EditorFormattingMarkForeground],
    },
};

export const enum DecorationClass {
    CodeSpan,
    HardLineBreak,
    Link,
    Paragraph,
    Strikethrough,
    TrailingSpace,
}

/**
 * Rendering styles for each decoration class.
 */
export const decorationStyles: Readonly<Record<DecorationClass, Readonly<vscode.DecorationRenderOptions>>> = {
    [DecorationClass.CodeSpan]: {
        backgroundColor: colors[Color.EditorCodeSpanBackground],
        border: "1px solid",
        borderColor: colors[Color.EditorCodeSpanBorder],
        borderRadius: "3px",
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    },
    [DecorationClass.HardLineBreak]: {
        after: fontIcons[FontIcon.DownwardsArrowWithCornerLeftwards],
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    },
    [DecorationClass.Link]: {
        before: fontIcons[FontIcon.Link],
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    },
    [DecorationClass.Paragraph]: {
        after: fontIcons[FontIcon.Pilcrow],
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    },
    [DecorationClass.Strikethrough]: {
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        textDecoration: "line-through",
    },
    [DecorationClass.TrailingSpace]: {
        backgroundColor: colors[Color.EditorTrailingSpaceBackground],
    },
};

/**
 * DecorationClass -> Configuration key
 */
export const decorationClassConfigMap: Readonly<Record<DecorationClass, IConfigurationKnownKey>> = {
    [DecorationClass.CodeSpan]: "theming.decoration.renderCodeSpan",
    [DecorationClass.HardLineBreak]: "theming.decoration.renderHardLineBreak",
    [DecorationClass.Link]: "theming.decoration.renderLink",
    [DecorationClass.Paragraph]: "theming.decoration.renderParagraph",
    [DecorationClass.Strikethrough]: "theming.decoration.renderStrikethrough",
    [DecorationClass.TrailingSpace]: "theming.decoration.renderTrailingSpace",
};
