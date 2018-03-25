'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from "fs";
import { slugify } from './util';

const officialExt = vscode.extensions.getExtension("vscode.markdown-language-features");

const tocModule = require(path.join(officialExt.extensionPath, 'out', 'tableOfContentsProvider'));
const TocProvider = tocModule.TableOfContentsProvider;
const Slug = tocModule.Slug;

const hljs = require(path.join(officialExt.extensionPath, 'node_modules', 'highlight.js'));
const mdnh = require(path.join(officialExt.extensionPath, 'node_modules', 'markdown-it-named-headers'));
const mdtl = require('markdown-it-task-lists');
const mdkt = require('@iktakahiro/markdown-it-katex');
const md = require(path.join(officialExt.extensionPath, 'node_modules', 'markdown-it'))({
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
    slugify: (header: string) => Slug.fromHeading(header).value
}).use(mdtl).use(mdkt);

let thisContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(vscode.commands.registerCommand('markdown.extension.printToHtml', () => { print('html'); }));
}

export function deactivate() { }

function print(type: string) {
    let editor = vscode.window.activeTextEditor;
    let doc = editor.document;

    if (!editor || doc.languageId != 'markdown') {
        vscode.window.showErrorMessage('No valid Markdown file');
        return;
    }

    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    let statusBarMsg = vscode.window.setStatusBarMessage(`Printing '${path.basename(doc.fileName)}' to ${type.toUpperCase()} ...`, 1000);

    /**
     * Modified from <https://github.com/Microsoft/vscode/tree/master/extensions/markdown>
     * src/previewContentProvider MDDocumentContentProvider provideTextDocumentContent
     */
    let outPath = doc.fileName.replace(/\.(md|MD|markdown)$/, `.${type}`);
    outPath = outPath.replace(/^([cdefghij]):\\/, function (match, p1: string) {
        return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
    });

    let body = render(doc.getText(), vscode.workspace.getConfiguration('markdown.preview', doc.uri));

    if (vscode.workspace.getConfiguration("markdown.extension.print", doc.uri).get<boolean>("absoluteImgPath")) {
        body = body.replace(/(<img[^>]+src=")([^"]+)("[^>]*>)/g, function (match, p1, p2, p3) { // Match '<img...src="..."...>'
            return `${p1}${fixHref(doc.fileName, p2)}${p3}`;
        });
    }

    let styleSheets = ['markdown.css', 'tomorrow.css', 'checkbox.css'].map(s => getMediaPath(s))
        .concat(getCustomStyleSheets());

    let html = `<!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
        ${styleSheets.map(css => `<style>\n${readCss(css)}\n</style>`).join('\n')}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0/katex.min.css" integrity="sha384-TEMocfGvRuD1rIAacqrknm5BQZ7W7uWitoih+jMNFXQIbNl16bO8OZmylH/Vi/Ei" crossorigin="anonymous">
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
    console.log('config.get<boolean>(\'breaks\', false)', config.get<boolean>('breaks', false));
    md.set({
        breaks: config.get<boolean>('breaks', false),
        linkify: config.get<boolean>('linkify', true)
    });
    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(path.join('media', mediaFile));
}

function readCss(fileName: string) {
    return fs.readFileSync(fileName).toString().replace(/\s+/g, ' ');
}

function getCustomStyleSheets(): string[] {
    const styles = vscode.workspace.getConfiguration('markdown')['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        return styles;
    }
    return [];
}

function fixHref(activeFileName: string, href: string): string {
    if (href) {
        // Use href if it is already an URL
        if (vscode.Uri.parse(href).scheme) {
            return href;
        }

        // Use href as file URI if it is absolute
        if (isAbsolute(href)) {
            return vscode.Uri.file(href).toString();
        }

        // use a workspace relative path if there is a workspace
        // let rootPath = workspace.rootPath;
        // if (rootPath) {
        //     return Uri.file(path.join(rootPath, href)).toString();
        // }

        // otherwise look relative to the markdown file
        return vscode.Uri.file(path.join(path.dirname(activeFileName), href)).toString();
    }
    return href;
}

function isAbsolute(p: string): boolean {
    return path.normalize(p + '/') === path.normalize(path.resolve(p) + '/');
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
