'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import { commands, window, workspace, ExtensionContext, Uri } from 'vscode';
import * as path from 'path';

const hljs = require('highlight.js');
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
});
const pdf = require('html-pdf');

let options = {
    "format": "A4",
    "orientation": "portrait",
    "border": {
        "top": "1in",
        "right": "1in",
        "bottom": "1in",
        "left": "1in"
    }
};

let thisContext;

export function activate(context: ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(commands.registerCommand('markdown.extension.print', print));
}

function print() {
    let editor = window.activeTextEditor;
    let doc = editor.document;
    let uri = doc.uri;

    if (!editor || doc.languageId != 'markdown') {
        window.showWarningMessage('No valid Markdown file');
    }

    if (doc.isUntitled) {
        doc.save();
    }

    let outPath = uri.fsPath.replace(/\.md$/, '.pdf');

    let body = render(doc.getText());
    let html = `<!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('github.css')).toString()}">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('tomorrow.css')).toString()}">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('fix.css')).toString()}">
            ${computeCustomStyleSheetIncludes(uri)}
            ${getSettingsOverrideStyles()}
        </head>
        <body>
            ${body}
        </body>
        </html>`;
    // Print HTML to debug
    // require('fs').writeFile('D:/test.html', html, 'utf-8', function (err) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });
    pdf.create(html, options).toFile(outPath, function (err, res) {
        if (err) {
            console.log(err);
        }
        // console.log(res);
    });
}

function render(text: string) {
    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(path.join('media', mediaFile));
}

function computeCustomStyleSheetIncludes(uri: Uri): string {
    const styles = workspace.getConfiguration('markdown')['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        return styles.map((style) => {
            return `<link rel="stylesheet" href="${fixHref(uri, style)}" type="text/css" media="screen">`;
        }).join('\n');
    }
    return '';
}

function fixHref(resource: Uri, href: string): string {
    if (href) {
        // Use href if it is already an URL
        if (Uri.parse(href).scheme) {
            return href;
        }

        // Use href as file URI if it is absolute
        if (this.isAbsolute(href)) {
            return Uri.file(href).toString();
        }

        // use a workspace relative path if there is a workspace
        let rootPath = workspace.rootPath;
        if (rootPath) {
            return Uri.file(path.join(rootPath, href)).toString();
        }

        // otherwise look relative to the markdown file
        return Uri.file(path.join(path.dirname(resource.fsPath), href)).toString();
    }
    return href;
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
