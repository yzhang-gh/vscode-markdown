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

        const hyphenLine =  String.raw`[ \t]*(?:${multiColumnHyphenLine}|${singleColumnHyphenLine})[ \t]*`;

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
        const delimiterRowNum = 1;

        let delimiterRowNoPadding = workspace.getConfiguration('markdown.extension.tableFormatter').get<boolean>('delimiterRowNoPadding');

        let indentation = this.getTableIndentation(text, options);

        let rows: string[] = [];
        let rowsNoIndentPattern = new RegExp(/^\s*(\S.*)$/gum);
        let match = null;
        while ((match = rowsNoIndentPattern.exec(text)) !== null) {
            rows.push(match[1].trim());
        }

        // Desired width of each column
        let colWidth = [];
        // Alignment of each column
        let colAlign = []
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

            let field = null;
            let values = [];
            let i = 0;
            while ((field = fieldRegExp.exec(row)) !== null) {
                let cell = field[1].trim();
                values.push(cell);
                //// Calculate `colWidth`
                //// Ignore length of delimiter-line to enable width reduction
                if (num != delimiterRowNum) {
                    //// Treat CJK characters as 2 English ones because of Unicode stuff
                    const numOfUnicodeChars = splitter.countGraphemes(cell);
                    const width = (cjkRegex.test(cell) ? numOfUnicodeChars + cell.match(cjkRegex).length : numOfUnicodeChars);
                    colWidth[i] = colWidth[i] > width ? colWidth[i] : width;
                }

                i++;
            }
            return values;
        });

        // Normalize the num of hyphen, use Math.max to determine minimum length based on dash-line format
        lines[delimiterRowNum] = lines[delimiterRowNum].map((cell, i) => {
            if (/:-+:/.test(cell)) {
                //:---:
                colWidth[i] = Math.max(colWidth[i], delimiterRowNoPadding ? 3 : 5);
                colAlign[i] = ColumnAlignment.Center;

                return ':' + '-'.repeat(delimiterRowNoPadding ? colWidth[i] : colWidth[i] - 2) + ':';
            } else if (/:-+/.test(cell)) {
                //:---
                colWidth[i] = Math.max(colWidth[i], delimiterRowNoPadding ? 2 : 4);
                colAlign[i] = ColumnAlignment.Left;

                return ':' + '-'.repeat(delimiterRowNoPadding ? colWidth[i] - 1 + 2 : colWidth[i] - 1);
            } else if (/-+:/.test(cell)) {
                //---:
                colWidth[i] = Math.max(colWidth[i], delimiterRowNoPadding ? 2 : 4);
                colAlign[i] = ColumnAlignment.Right;

                return '-'.repeat(delimiterRowNoPadding ? colWidth[i] - 1 + 2 : colWidth[i] - 1) + ':';
            } else if (/-+/.test(cell)) {
                //---
                colWidth[i] = Math.max(colWidth[i], delimiterRowNoPadding ? 1 : 3);
                colAlign[i] = ColumnAlignment.None;

                return '-'.repeat(delimiterRowNoPadding ? colWidth[i] + 2 : colWidth[i]);
            } else {
                colAlign[i] = ColumnAlignment.None;
            }
        });

        return lines.map((row, i) => {
            if (delimiterRowNoPadding && i === delimiterRowNum) {
                return indentation + '|' + row.join('|') + '|';
            }

            let cells = row.map((cell, i) => {
                const desiredWidth = colWidth[i];
                let jsLength = splitter.splitGraphemes(cell + ' '.repeat(desiredWidth)).slice(0, desiredWidth).join('').length;

                if (cjkRegex.test(cell)) {
                    jsLength -= cell.match(cjkRegex).length;
                }

                return this.alignText(cell, colAlign[i], jsLength);
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
