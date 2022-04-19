'use strict';

// https://github.github.com/gfm/#tables-extension-

import { CancellationToken, Disposable, DocumentFormattingEditProvider, EndOfLine, ExtensionContext, FormattingOptions, languages, Range, TextDocument, TextEdit, workspace } from 'vscode';
import { Document_Selector_Markdown } from "./util/generic";
//// This module can only be referenced with ECMAScript imports/exports by turning on the 'esModuleInterop' flag and referencing its default export.
// import { GraphemeSplitter } from 'grapheme-splitter';
import GraphemeSplitter = require('grapheme-splitter');

const splitter = new GraphemeSplitter();

export function activate(_: ExtensionContext) {
    let registration: Disposable | undefined;

    function registerFormatterIfEnabled() {
        const isEnabled = workspace.getConfiguration().get('markdown.extension.tableFormatter.enabled', true);
        if (isEnabled && !registration) {
            registration = languages.registerDocumentFormattingEditProvider(Document_Selector_Markdown, new MarkdownDocumentFormatter());
        } else if (!isEnabled && registration) {
            registration.dispose();
            registration = undefined;
        }
    }

    registerFormatterIfEnabled();

    workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('markdown.extension.tableFormatter.enabled')) {
            registerFormatterIfEnabled();
        }
    });
}

export function deactivate() { }

enum ColumnAlignment {
    None,
    Left,
    Center,
    Right
}

class MarkdownDocumentFormatter implements DocumentFormattingEditProvider {
    public provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): TextEdit[] | Thenable<TextEdit[]> {
        let edits: TextEdit[] = [];
        let tables = this.detectTables(document.getText());
        if (tables !== null) {
            let startingPos = 0;
            tables.forEach(table => {
                const tableRange = this.getRange(document, table, startingPos);
                edits.push(new TextEdit(tableRange, this.formatTable(table, document, options)));
                startingPos = document.offsetAt(tableRange.end);
            });
            return edits;
        } else {
            return [];
        }
    }

    private detectTables(text: string) {
        const lineBreak = String.raw`\r?\n`;
        const contentLine = String.raw`\|?.*\|.*\|?`;

        const leftSideHyphenComponent = String.raw`(?:\|? *:?-+:? *\|)`;
        const middleHyphenComponent = String.raw`(?: *:?-+:? *\|)*`;
        const rightSideHyphenComponent = String.raw`(?: *:?-+:? *\|?)`;
        const multiColumnHyphenLine = leftSideHyphenComponent + middleHyphenComponent + rightSideHyphenComponent;

        //// GitHub issue #431
        const singleColumnHyphenLine = String.raw`(?:\| *:?-+:? *\|)`;

        const hyphenLine = String.raw`[ \t]*(?:${multiColumnHyphenLine}|${singleColumnHyphenLine})[ \t]*`;

        const tableRegex = new RegExp(contentLine + lineBreak + hyphenLine + '(?:' + lineBreak + contentLine + ')*', 'g');
        return text.match(tableRegex);
    }

    private getRange(document: TextDocument, text: string, startingPos: number) {
        let documentText = document.getText();
        let start = document.positionAt(documentText.indexOf(text, startingPos));
        let end = document.positionAt(documentText.indexOf(text, startingPos) + text.length);
        return new Range(start, end);
    }

    /**
     * Return the indentation of a table as a string of spaces by reading it from the first line.
     * In case of `markdown.extension.table.normalizeIndentation` is `enabled` it is rounded to the closest multiple of
     * the configured `tabSize`.
     */
    private getTableIndentation(text: string, options: FormattingOptions) {
        let doNormalize = workspace.getConfiguration('markdown.extension.tableFormatter').get<boolean>('normalizeIndentation');
        let indentRegex = new RegExp(/^(\s*)\S/u);
        let match = text.match(indentRegex);
        let spacesInFirstLine = match[1].length;
        let tabStops = Math.round(spacesInFirstLine / options.tabSize);
        let spaces = doNormalize ? " ".repeat(options.tabSize * tabStops) : " ".repeat(spacesInFirstLine);
        return spaces;
    }

    private formatTable(text: string, doc: TextDocument, options: FormattingOptions) {
        const delimiterRowIndex = 1;
        const delimiterRowNoPadding = workspace.getConfiguration('markdown.extension.tableFormatter').get<boolean>('delimiterRowNoPadding');
        const indentation = this.getTableIndentation(text, options);

        const rows: string[] = [];
        const rowsNoIndentPattern = new RegExp(/^\s*(\S.*)$/gum);
        let match = null;
        while ((match = rowsNoIndentPattern.exec(text)) !== null) {
            rows.push(match[1].trim());
        }

        // Column "content" width (the length of the longest cell in each column), **without padding**
        const colWidth = [];
        // Alignment of each column
        const colAlign = []
        // Regex to extract cell content.
        // GitHub #24
        const fieldRegExp = new RegExp(/((\\\||[^\|])*)\|/gu);
        // https://www.ling.upenn.edu/courses/Spring_2003/ling538/UnicodeRanges.html
        const cjkRegex = /[\u3000-\u9fff\uac00-\ud7af\uff01-\uff60]/g;

        const lines = rows.map((row, iRow) => {
            // Normalize
            if (row.startsWith('|')) {
                row = row.slice(1);
            }
            if (!row.endsWith('|')) {
                row = row + '|';
            }

            // Parse cells in the current row
            let field = null;
            let values = [];
            let iCol = 0;
            while ((field = fieldRegExp.exec(row)) !== null) {
                let cell = field[1].trim();
                values.push(cell);
                // Ignore the length of delimiter-line before we normalize it
                if (iRow != delimiterRowIndex) {
                    // Treat CJK characters as 2 English ones because of Unicode stuff
                    const numOfUnicodeChars = splitter.countGraphemes(cell);
                    const width = cjkRegex.test(cell) ? numOfUnicodeChars + cell.match(cjkRegex).length : numOfUnicodeChars;
                    colWidth[iCol] = colWidth[iCol] > width ? colWidth[iCol] : width;
                }
                iCol++;
            }
            return values;
        });

        // Normalize the num of hyphen
        lines[delimiterRowIndex] = lines[delimiterRowIndex].map((cell, iCol) => {
            if (/:-+:/.test(cell)) {
                // :---:
                colAlign[iCol] = ColumnAlignment.Center;

                // Update `colWidth` (lower bound) based on the column alignment specification
                colWidth[iCol] = Math.max(colWidth[iCol], delimiterRowNoPadding ? 5 - 2 : 5);
                const specWidth = delimiterRowNoPadding ? colWidth[iCol] + 2 : colWidth[iCol];

                return ':' + '-'.repeat(specWidth - 2) + ':';
            } else if (/:-+/.test(cell)) {
                // :---
                colAlign[iCol] = ColumnAlignment.Left;
                colWidth[iCol] = Math.max(colWidth[iCol], delimiterRowNoPadding ? 4 - 2 : 4);
                const specWidth = delimiterRowNoPadding ? colWidth[iCol] + 2 : colWidth[iCol];

                return ':' + '-'.repeat(specWidth - 1);
            } else if (/-+:/.test(cell)) {
                // ---:
                colAlign[iCol] = ColumnAlignment.Right;
                colWidth[iCol] = Math.max(colWidth[iCol], delimiterRowNoPadding ? 4 - 2 : 4);
                const specWidth = delimiterRowNoPadding ? colWidth[iCol] + 2 : colWidth[iCol];

                return '-'.repeat(specWidth - 1) + ':';
            } else if (/-+/.test(cell)) {
                // ---
                colAlign[iCol] = ColumnAlignment.None;
                colWidth[iCol] = Math.max(colWidth[iCol], delimiterRowNoPadding ? 3 - 2 : 3);
                const specWidth = delimiterRowNoPadding ? colWidth[iCol] + 2 : colWidth[iCol];

                return '-'.repeat(specWidth);
            } else {
                colAlign[iCol] = ColumnAlignment.None;
            }
        });

        return lines.map((row, iRow) => {
            if (iRow === delimiterRowIndex && delimiterRowNoPadding) {
                return indentation + '|' + row.join('|') + '|';
            }

            let cells = row.map((cell, iCol) => {
                const desiredWidth = colWidth[iCol];
                let jsLength = splitter.splitGraphemes(cell + ' '.repeat(desiredWidth)).slice(0, desiredWidth).join('').length;

                if (cjkRegex.test(cell)) {
                    jsLength -= cell.match(cjkRegex).length;
                }

                return this.alignText(cell, colAlign[iCol], jsLength);
            });
            return indentation + '| ' + cells.join(' | ') + ' |';
        }).join(doc.eol === EndOfLine.LF ? '\n' : '\r\n');
    }

    private alignText(text: string, align: ColumnAlignment, length: number) {
        if (align === ColumnAlignment.Center && length > text.length) {
            return (' '.repeat(Math.floor((length - text.length) / 2)) + text + ' '.repeat(length)).slice(0, length);
        } else if (align === ColumnAlignment.Right) {
            return (' '.repeat(length) + text).slice(-length);
        } else {
            return (text + ' '.repeat(length)).slice(0, length);
        }
    }
}
