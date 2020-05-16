'use strict';

// https://github.github.com/gfm/#tables-extension-

import { CancellationToken, Disposable, DocumentFormattingEditProvider, EndOfLine, ExtensionContext, FormattingOptions, languages, Range, TextDocument, TextEdit, workspace } from 'vscode';
import { mdDocSelector } from './util';
//// This module can only be referenced with ECMAScript imports/exports by turning on the 'esModuleInterop' flag and referencing its default export.
// import { GraphemeSplitter } from 'grapheme-splitter';
import GraphemeSplitter = require('grapheme-splitter');

const splitter = new GraphemeSplitter();

export function activate(_: ExtensionContext) {
    let registration: Disposable | undefined;

    function registerFormatterIfEnabled() {
        const isEnabled = workspace.getConfiguration().get('markdown.extension.tableFormatter.enabled', true);
        if (isEnabled && !registration) {
            registration = languages.registerDocumentFormattingEditProvider(mdDocSelector, new MarkdownDocumentFormatter());
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
        const lineBreak = '\\r?\\n';
        const contentLine = '\\|?.*\\|.*\\|?';

        const leftSideHyphenComponent = '(?:\\|? *:?-+:? *\\|)';
        const middleHyphenComponent = '(?: *:?-+:? *\\|)*';
        const rightSideHyphenComponent = '(?: *:?-+:? *\\|?)'
        const multiColumnHyphenLine = leftSideHyphenComponent + middleHyphenComponent + rightSideHyphenComponent;

        //// GitHub issue #431
        const singleColumnHyphenLine = '(?:\\| *:?-+:? *\\|)'

        const hyphenLine =  '[ \\t]*(?:' + multiColumnHyphenLine + '|' + singleColumnHyphenLine + ')[ \\t]*';

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
        // Known issue: `\\|` is not correctly parsed as a valid delimiter
        let fieldRegExp = new RegExp(/(?:((?:\\\||`.*?`|[^\|])*)\|)/gu);
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
                //// Ignore length of dash-line to enable width reduction
                if (num != 1) {
                    //// Treat CJK characters as 2 English ones because of Unicode stuff
                    const numOfUnicodeChars = splitter.countGraphemes(cell);
                    const width = cjkRegex.test(cell) ? numOfUnicodeChars + cell.match(cjkRegex).length : numOfUnicodeChars;
                    colWidth[i] = colWidth[i] > width ? colWidth[i] : width;
                }

                i++;
            }
            return values;
        });

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

                if (cjkRegex.test(cell)) {
                    jsLength -= cell.match(cjkRegex).length;
                }

                return this.alignText(cell, colAlign[i], jsLength);
            });
            return indentation + '| ' + cells.join(' | ') + ' |';
        }).join(doc.eol === EndOfLine.LF ? '\n' : '\r\n');
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
