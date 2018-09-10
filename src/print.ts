'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import * as fs from "fs";
import * as path from 'path';
import * as vscode from 'vscode';
import localize from './localize';
import { isMdEditor, slugify } from './util';

// Cannot reuse these modules since vscode packs them using webpack
const hljs = require('highlight.js');
const mdnh = require('markdown-it-named-headers');
const mdtl = require('markdown-it-task-lists');
const mdkt = require('@neilsustc/markdown-it-katex');
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
}).use(mdnh, {
    slugify: (header: string) => slugify(header)
}).use(mdtl).use(mdkt);

let thisContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(vscode.commands.registerCommand('markdown.extension.printToHtml', () => { print('html'); }));
}

export function deactivate() { }

function print(type: string) {
    let editor = vscode.window.activeTextEditor;

    if (!isMdEditor(editor)) {
        vscode.window.showErrorMessage(localize("noValidMarkdownFile"));
        return;
    }

    let doc = editor.document;
    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    vscode.window.setStatusBarMessage(localize("printing") + ` '${path.basename(doc.fileName)}' ` + localize("to") + ` '${type.toUpperCase()}' ...`, 1000);

    /**
     * Modified from <https://github.com/Microsoft/vscode/tree/master/extensions/markdown>
     * src/previewContentProvider MDDocumentContentProvider provideTextDocumentContent
     */
    let outPath = doc.fileName.replace(/\.\w+?$/, `.${type}`);
    outPath = outPath.replace(/^([cdefghij]):\\/, function (match, p1: string) {
        return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
    });
    if (!outPath.endsWith(`.${type}`)) {
        outPath += `.${type}`;
    }

    let body = render(doc.getText(), vscode.workspace.getConfiguration('markdown.preview', doc.uri));

    if (vscode.workspace.getConfiguration("markdown.extension.print", doc.uri).get<boolean>("absoluteImgPath")) {
        body = body.replace(/(<img[^>]+src=")([^"]+)("[^>]*>)/g, function (match, p1, p2, p3) { // Match '<img...src="..."...>'
            const imgUri = fixHref(doc.uri, p2);
            if (vscode.workspace.getConfiguration("markdown.extension.print", doc.uri).get<boolean>("imgToBase64")) {
                try {
                    const imgExt = path.extname(imgUri.fsPath).slice(1);
                    const file = fs.readFileSync(imgUri.fsPath).toString('base64');
                    return `${p1}data:image/${imgExt};base64,${file}${p3}`;
                } catch (e) {
                    vscode.window.showWarningMessage(localize("unableToReadFile") + ` ${imgUri.fsPath}, ` + localize("revertingToImagePaths"));
                }
            }
            return `${p1}${imgUri.toString()}${p3}`;
        });
    }

    let styleSheets = ['markdown.css', 'tomorrow.css', 'checkbox.css'].map(s => getMediaPath(s))
        .concat(getCustomStyleSheets(doc.uri));

    let html = `<!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.10.0-alpha/dist/katex.min.css" integrity="sha384-BTL0nVi8DnMrNdMQZG1Ww6yasK9ZGnUxL1ZWukXQ7fygA1py52yPp9W4wrR00VML" crossorigin="anonymous">
        ${styleSheets.map(css => wrapWithStyleTag(css)).join('\n')}
        ${getSettingsOverrideStyles()}
    </head>
    <body>
        ${body}
    </body>
    </html>`;

    switch (type) {
        case 'html':
            fs.writeFile(outPath, html, 'utf-8', function (err) {
                if (err) { console.log(err); }
            });
            break;
        case 'pdf':
            break;
    }
}

function render(text: string, config: vscode.WorkspaceConfiguration) {
    md.set({
        breaks: config.get<boolean>('breaks', false),
        linkify: config.get<boolean>('linkify', true)
    });
    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(path.join('media', mediaFile));
}

function wrapWithStyleTag(src: string) {
    let uri = vscode.Uri.parse(src);
    if (uri.scheme.includes('http')) {
        return `<link rel="stylesheet" href="${src}">`;
    } else {
        return `<style>\n${readCss(src)}\n</style>`;
    }
}

function readCss(fileName: string) {
    try {
        return fs.readFileSync(fileName).toString().replace(/\s+/g, ' ');
    } catch (error) {
        let msg = error.message.replace('ENOENT: no such file or directory, open', localize("customStyle")) + localize("notFound");
        msg = msg.replace(/'([c-z]):/, function (match, g1) {
            return `'${g1.toUpperCase()}:`;
        });
        vscode.window.showWarningMessage(msg);
        return '';
    }
}

function getCustomStyleSheets(resource: vscode.Uri): string[] {
    const styles = vscode.workspace.getConfiguration('markdown')['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        return styles.map(s => {
            let uri = fixHref(resource, s);
            if (uri.scheme === 'file') {
                return uri.fsPath;
            }
            return s;
        });
    }
    return [];
}

function fixHref(resource: vscode.Uri, href: string): vscode.Uri {
    if (!href) {
        return vscode.Uri.file(href);
    }

    // Use href if it is already an URL
    const hrefUri = vscode.Uri.parse(href);
    if (['http', 'https'].indexOf(hrefUri.scheme) >= 0) {
        return hrefUri;
    }

    // Use href as file URI if it is absolute
    if (path.isAbsolute(href) || hrefUri.scheme === 'file') {
        return vscode.Uri.file(href);
    }

    // Use a workspace relative path if there is a workspace
    let root = vscode.workspace.getWorkspaceFolder(resource);
    if (root) {
        return vscode.Uri.file(path.join(root.uri.fsPath, href));
    }

    // Otherwise look relative to the markdown file
    return vscode.Uri.file(path.join(path.dirname(resource.fsPath), href));
}

function getSettingsOverrideStyles(): string {
    const previewSettings = vscode.workspace.getConfiguration('markdown')['preview'];
    if (!previewSettings) {
        return '';
    }
    const { fontFamily, fontSize, lineHeight } = previewSettings;
    return `<style>
            body {
                ${fontFamily ? `font-family: ${fontFamily};` : ''}
                ${+fontSize > 0 ? `font-size: ${fontSize}px;` : ''}
                ${+lineHeight > 0 ? `line-height: ${lineHeight};` : ''}
            }
        </style>`;
}
