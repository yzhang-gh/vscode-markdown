'use strict';

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
    let uri = editor.document.uri;

    let body = render(editor.document.getText());
    let html = `<!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('markdown.css')).toString()}">
            <link rel="stylesheet" type="text/css" href="${Uri.file(getMediaPath('tomorrow.css')).toString()}">
            ${computeCustomStyleSheetIncludes(uri)}
        </head>
        <body>
            ${body}
        </body>
        </html>`;
    console.log(html);
    pdf.create(html, options).toFile('D:/test.pdf', function (err, res) {
        if (err) {
            console.log(err);
        }
        console.log(res);
    });
    console.log('done');
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

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src
