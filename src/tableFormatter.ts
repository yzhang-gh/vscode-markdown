'use strict';

// https://github.github.com/gfm/#tables-extension-

import * as vscode from "vscode";
import { configManager } from "./configuration/manager";
import { Document_Selector_Markdown } from "./util/generic";
//// This module can only be referenced with ECMAScript imports/exports by turning on the 'esModuleInterop' flag and referencing its default export.
// import { GraphemeSplitter } from 'grapheme-splitter';
import GraphemeSplitter = require('grapheme-splitter');

const splitter = new GraphemeSplitter();

interface ITableRange {
    text: string;
    offset: number;
    range: vscode.Range;
}

// Dedicated objects for managing the formatter.
const d0 = Object.freeze<vscode.Disposable & { _disposables: vscode.Disposable[] }>({
    _disposables: [],
    dispose: function () {
        for (const item of this._disposables) {
            item.dispose();
        }
        this._disposables.length = 0;
    },
});

const registerFormatter = () => {
    if (configManager.get("tableFormatter.enabled")) {
        d0._disposables.push(vscode.languages.registerDocumentFormattingEditProvider(Document_Selector_Markdown, new MarkdownDocumentFormatter()));
    } else {
        d0.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const d1 = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("markdown.extension.tableFormatter.enabled")) {
            registerFormatter();
        }
    });

    registerFormatter();

    context.subscriptions.push(d1, d0);
}

class MarkdownDocumentFormatter implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken) {
        const tables = this.detectTables(document);
        if (!tables || token.isCancellationRequested) {
            return;
        }

        const edits: vscode.TextEdit[] = tables.map(
            (target) => new vscode.TextEdit(target.range, this.formatTable(target, document, options))
        );

        return edits;
    }

    private detectTables(document: vscode.TextDocument): ITableRange[] | undefined {
        const text = document.getText();

        const lineBreak = String.raw`\r?\n`;
        const contentLine = String.raw`\|?.*\|.*\|?`;

        const leftSideHyphenComponent = String.raw`(?:\|? *:?-+:? *\|)`;
        const middleHyphenComponent = String.raw`(?: *:?-+:? *\|)*`;
        const rightSideHyphenComponent = String.raw`(?: *:?-+:? *\|?)`;
        const multiColumnHyphenLine = leftSideHyphenComponent + middleHyphenComponent + rightSideHyphenComponent;

        //// GitHub issue #431
        const singleColumnHyphenLine = String.raw`(?:\| *:?-+:? *\|)`;

        const hyphenLine =  String.raw`[ \t]*(?:${multiColumnHyphenLine}|${singleColumnHyphenLine})[ \t]*`;

        const tableRegex = new RegExp(contentLine + lineBreak + hyphenLine + '(?:' + lineBreak + contentLine + ')*', 'g');

        const result: ITableRange[] = Array.from(
            text.matchAll(tableRegex),
            (item): ITableRange => ({
                text: item[0],
                offset: item.index!,
                range: new vscode.Range(
                    document.positionAt(item.index!),
                    document.positionAt(item.index! + item[0].length)
                ),
            })
        );

        return result.length ? result : undefined;
    }

    /**
     * Return the indentation of a table as a string of spaces by reading it from the first line.
     * In case of `markdown.extension.table.normalizeIndentation` is `enabled` it is rounded to the closest multiple of
     * the configured `tabSize`.
     */
    private getTableIndentation(text: string, options: vscode.FormattingOptions) {
        let doNormalize = configManager.get("tableFormatter.normalizeIndentation");
        let indentRegex = new RegExp(/^(\s*)\S/u);
        let match = text.match(indentRegex);
        let spacesInFirstLine = match?.[1].length ?? 0;
        let tabStops = Math.round(spacesInFirstLine / options.tabSize);
        let spaces = doNormalize ? " ".repeat(options.tabSize * tabStops) : " ".repeat(spacesInFirstLine);
        return spaces;
    }

    private formatTable(target: ITableRange, doc: vscode.TextDocument, options: vscode.FormattingOptions) {
        // The following operations require the Unicode Normalization Form C (NFC).
        const text = target.text.normalize();

        let indentation = this.getTableIndentation(text, options);

        let rowsNoIndentPattern = new RegExp(/^\s*(\S.*)$/gum);
        const rows: string[] = Array.from(text.matchAll(rowsNoIndentPattern), (match) => match[1].trim());

        // Desired width of each column
        const colWidth: number[] = [];
        // Alignment of each column
        const colAlign: ("l" | "c" | "r")[] = [];
        // Regex to extract cell content.
        // GitHub #24
        let fieldRegExp = new RegExp(/((\\\||[^\|])*)\|/gu);
        // https://www.ling.upenn.edu/courses/Spring_2003/ling538/UnicodeRanges.html
        let cjkRegex = /[\u3000-\u9fff\uac00-\ud7af\uff01-\uff60]/g;

        let lines = rows.map((row, num) => {
            // Normalize
            if (row.startsWith('|')) {
                row = row.slice(1);
            }
            if (!row.endsWith('|')) {
                row = row + '|';
            }

            let values = [];
            let i = 0;
            for (const field of row.matchAll(fieldRegExp)) {
                let cell = field[1].trim();
                values.push(cell);

                // Calculate column width.
                // The following notes help to understand the precondition for our calculation.
                // They don't reflect how text layout engines really work.
                // For more information, please consult UAX #11.
                // A grapheme cluster may comprise multiple Unicode code points.
                // One CJK grapheme consists of one CJK code point, in NFC.
                // In typical fixed-width typesetting without ligature, one grapheme is finally mapped to one glyph.
                // Such a glyph is usually the same width as an ASCII letter, but a CJK glyph is twice.

                if (num === 1) {
                    i++;
                    continue; // Ignore the delimiter row.
                }

                const graphemeCount = splitter.countGraphemes(cell);
                const cjkPoints = cell.match(cjkRegex);
                const width = graphemeCount + (cjkPoints?.length ?? 0);
                colWidth[i] = width;

                i++;
            }
            return values;
        });

        // @ts-ignore What's this on earth?
        // Normalize the num of hyphen, use Math.max to determine minimum length based on dash-line format
        lines[1] = lines[1].map((cell, i) => {
            if (/:-+:/.test(cell)) {
                //:---:
                colWidth[i] = Math.max(colWidth[i], 5);
                colAlign[i] = 'c';
                return ':' + '-'.repeat(colWidth[i] - 2) + ':';
            } else if (/:-+/.test(cell)) {
                //:---
                colWidth[i] = Math.max(colWidth[i], 4);
                colAlign[i] = 'l';
                return ':' + '-'.repeat(colWidth[i] - 1);
            } else if (/-+:/.test(cell)) {
                //---:
                colWidth[i] = Math.max(colWidth[i], 4);
                colAlign[i] = 'r';
                return '-'.repeat(colWidth[i] - 1) + ':';
            } else if (/-+/.test(cell)) {
                //---
                colWidth[i] = Math.max(colWidth[i], 3);
                colAlign[i] = 'l';
                return '-'.repeat(colWidth[i]);
            } else {
                colAlign[i] = 'l';
            }
        });

        return lines.map(row => {
            let cells = row.map((cell, i) => {
                const desiredWidth = colWidth[i];
                let jsLength = splitter.splitGraphemes(cell + ' '.repeat(desiredWidth)).slice(0, desiredWidth).join('').length;

                const cjkPoints = cell.match(cjkRegex);
                if (cjkPoints) {
                    jsLength -= cjkPoints.length;
                }

                return this.alignText(cell, colAlign[i], jsLength);
            });
            return indentation + '| ' + cells.join(' | ') + ' |';
        }).join(doc.eol === vscode.EndOfLine.LF ? '\n' : '\r\n');
    }

    private alignText(text: string, align: string, length: number) {
        if (align === 'c' && length > text.length) {
            return (' '.repeat(Math.floor((length - text.length) / 2)) + text + ' '.repeat(length)).slice(0, length);
        } else if (align === 'r') {
            return (' '.repeat(length) + text).slice(-length);
        } else {
            return (text + ' '.repeat(length)).slice(0, length);
        }
    }
}
