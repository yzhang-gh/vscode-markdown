'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import { commands, window, workspace, Disposable, ExtensionContext, TextDocument, Uri } from 'vscode';
import * as path from 'path';

const hljs = require('highlight.js');
const mdnh = require('markdown-it-named-headers');
const md = require('markdown-it')({
    html: true,
    highlight: (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code><div>${hljs.highlight(lang, str, true).value}</div></code></pre>`;
            } catch (error) { }
        }
        // return `<pre class="hljs"><code><div>${this.engine.utils.escapeHtml(str)}</div></code></pre>`;
        return str;
    }
}).use(mdnh, {});
const htmlPdf = require('html-pdf');
const fs = require('fs');

let options = {
    "format": "A4",
    "orientation": "portrait",
    "border": {
        "top": "1in",
        "right": "0.8in",
        "bottom": "1in",
        "left": "0.8in"
    }
};

let thisContext: ExtensionContext;
// let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(commands.registerCommand('markdown.extension.print', print));
}

export function deactivate() {
    // disposables.forEach(d => {
    //     d.dispose();
    // });
}

function print() {
    let editor = window.activeTextEditor;
    let doc = editor.document;
    let uri = doc.uri;

    if (!editor || doc.languageId != 'markdown') {
        window.showErrorMessage('No valid Markdown file');
        return;
    }

    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    window.setStatusBarMessage(`Printing '${path.basename(doc.fileName)}'...`, printToPdf(doc));
}

function printToPdf(doc: TextDocument) {
    return new Promise((resolve, reject) => {
        let outPath = doc.fileName.replace(/\.md$/, '.pdf');
        outPath = outPath.replace(/^([cdefghij]):\\/, function (match, p1: string) {
            return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
        });

        let body = render(doc.getText());
        body = body.replace(/(<img[^>]+src=")([^"]+)("[^>]+>)/g, function (match, p1, p2, p3) { // Match '<img...src="..."...>'
            return `${p1}${fixHref(doc.fileName, p2)}${p3}`;
        });
        let html = `<!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('github.css')).toString()}">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('tomorrow.css')).toString()}">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('fix.css')).toString()}">
            ${computeCustomStyleSheetIncludes(doc.fileName)}
            ${getSettingsOverrideStyles()}
        </head>
        <body>
            ${body}
        </body>
        </html>`;
        // Print HTML to debug
        // fs.writeFile(outPath.replace(/.pdf$/, '.html'), html, 'utf-8', function (err) {
        //     if (err) {
        //         console.log(err);
        //     }
        // });
        htmlPdf.create(html, options).toBuffer(function (err, buffer) {
            fs.writeFile(outPath, buffer, function (err) {
                if (err) {
                    window.showErrorMessage(err.message);
                    reject();
                } else {
                    window.setStatusBarMessage(`Output written on '${outPath}'`, 3000);
                    resolve();
                }
            });
        });
    });
}

function render(text: string) {
    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(path.join('media', mediaFile));
}

function computeCustomStyleSheetIncludes(fileName: string): string {
    const styles = workspace.getConfiguration('markdown')['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        return styles.map((style) => {
            return `<link rel="stylesheet" href="${fixHref(fileName, style)}" type="text/css" media="screen">`;
        }).join('\n');
    }
    return '';
}

function fixHref(activeFileName: string, href: string): string {
    if (href) {
        // Use href if it is already an URL
        if (Uri.parse(href).scheme) {
            return href;
        }

        // Use href as file URI if it is absolute
        if (isAbsolute(href)) {
            return Uri.file(href).toString();
        }

        // use a workspace relative path if there is a workspace
        // let rootPath = workspace.rootPath;
        // if (rootPath) {
        //     return Uri.file(path.join(rootPath, href)).toString();
        // }

        // otherwise look relative to the markdown file
        return Uri.file(path.join(path.dirname(activeFileName), href)).toString();
    }
    return href;
}

function isAbsolute(p: string): boolean {
    return path.normalize(p + '/') === path.normalize(path.resolve(p) + '/');
}

function getSettingsOverrideStyles(): string {
    const previewSettings = workspace.getConfiguration('markdown')['preview'];
    if (!previewSettings) {
        return '';
    }
    const {fontFamily, fontSize, lineHeight} = previewSettings;
    return `<style>
            body {
                ${fontFamily ? `font-family: ${fontFamily};` : ''}
                ${+fontSize > 0 ? `font-size: ${fontSize}px;` : ''}
                ${+lineHeight > 0 ? `line-height: ${lineHeight};` : ''}
            }
        </style>`;
}
