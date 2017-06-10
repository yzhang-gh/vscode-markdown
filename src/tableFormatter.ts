'use strict';

// https://help.github.com/articles/organizing-information-with-tables/

import { languages, workspace, CancellationToken, DocumentFormattingEditProvider, ExtensionContext, FormattingOptions, Range, TextDocument, TextEdit } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerDocumentFormattingEditProvider('markdown', new MarkdownDocumentFormatter))
}

export function deactivate() { }

class MarkdownDocumentFormatter implements DocumentFormattingEditProvider {
    public provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): TextEdit[] | Thenable<TextEdit[]> {
        let edits: TextEdit[] = [];
        let tables = this.detectTables(document.getText());
        tables.forEach(table => {
            edits.push(new TextEdit(this.getRange(document, table), this.formatTable(table, options)));
        });
        return edits;
    }

    private detectTables(text: string) {
        const lineBreak = '\\r?\\n';
        const contentLine = '\\|?.*\\|.*\\|?';
        const hyphenLine = '\\|?[- :\\|]{3,}\\|?';
        const tableRegex = new RegExp(contentLine + lineBreak + hyphenLine + '(?:' + lineBreak + contentLine + ')*', 'g');
        return text.match(tableRegex);
    }

    private getRange(document: TextDocument, text: string) {
        let documentText = document.getText();
        let start = document.positionAt(documentText.indexOf(text));
        let end = document.positionAt(documentText.indexOf(text) + text.length);
        return new Range(start, end);
    }

    private formatTable(text: string, options: FormattingOptions) {
        let rows = text.split(/\r?\n/g);
        let content = rows.map(row => {
            return row.trim().replace(/^\|/g, '').replace(/\|$/g, '').trim().split(/\s*\|\s*/g);
        });
        // Normalize the num of hyphen
        content[1] = content[1].map(cell => {
            if (/:-+:/.test(cell)) {
                return ':---:';
            } else if (/:-+/.test(cell)) {
                return ':---';
            } else if (/-+:/.test(cell)) {
                return '---:';
            } else if (/-+/.test(cell)) {
                return '---';
            }
        });
        let colWidth = Array(content[0].length).fill(3);
        content.forEach(row => {
            row.forEach((cell, i) => {
                if (colWidth[i] < cell.length) {
                    colWidth[i] = cell.length;
                }
            });
        });
        // Format
        content[1] = content[1].map((cell, i) => {
            if (cell == ':---:') {
                return ':' + '-'.repeat(colWidth[i] - 2) + ':';
            } else if (cell == ':---') {
                return ':' + '-'.repeat(colWidth[i] - 1);
            } else if (cell == '---:') {
                return '-'.repeat(colWidth[i] - 1) + ':';
            } else if (cell == '---') {
                return '-'.repeat(colWidth[i]);
            }
        });
        return content.map(row => {
            let cells = row.map((cell, i) => {
                return (cell + ' '.repeat(colWidth[i])).slice(0, colWidth[i]);
            });
            return '| ' + cells.join(' | ') + ' |';
        }).join(<string>workspace.getConfiguration("files").get("eol"));
    }
}
