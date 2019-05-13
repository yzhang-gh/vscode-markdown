'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import * as fs from "fs";
import * as path from 'path';
import * as vscode from 'vscode';
import localize from './localize';
import { isMdEditor, slugify } from './util';
import { workspace } from 'vscode';

let md;
let slugCounts = {};

async function initMdIt() {
    // takes ~0.5s

    // Cannot reuse these modules since vscode packs them using webpack
    const hljs = await import('highlight.js');
    const mdtl = await import('markdown-it-task-lists');
    const mdkt = await import('@neilsustc/markdown-it-katex');

    md = (await import('markdown-it'))({
        html: true,
        highlight: (str: string, lang: string) => {
            // Workaround for highlight not supporting tsx: https://github.com/isagalaev/highlight.js/issues/1155
            if (lang && ['tsx', 'typescriptreact'].indexOf(lang.toLocaleLowerCase()) >= 0) {
                lang = 'jsx';
            }
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<div>${hljs.highlight(lang, str, true).value}</div>`;
                } catch (error) { }
            }
            return `<div>${md.utils.escapeHtml(str)}</div>`;
        }
    }).use(mdtl)
        .use(mdkt, {
            throwOnError: false,
            macros: workspace.getConfiguration('markdown.extension.katex').get<object>('macros')
        });

    addNamedHeaders(md);
}

// Adapted from <https://github.com/leff/markdown-it-named-headers/blob/master/index.js>
// and <https://github.com/Microsoft/vscode/blob/cadd6586c6656e0c7df3b15ad01c5c4030da5d46/extensions/markdown-language-features/src/markdownEngine.ts#L225>
function addNamedHeaders(md: any): void {
    const originalHeadingOpen = md.renderer.rules.heading_open;

    md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
        const title = tokens[idx + 1].children.reduce((acc: string, t: any) => acc + t.content, '');
        let slug = slugify(title);

        if (slugCounts.hasOwnProperty(slug)) {
            slugCounts[slug] += 1;
            slug += '-' + slugCounts[slug];
        } else {
            slugCounts[slug] = 0;
        }

        tokens[idx].attrs = tokens[idx].attrs || [];
        tokens[idx].attrs.push(['id', slug]);

        if (originalHeadingOpen) {
            return originalHeadingOpen(tokens, idx, options, env, self);
        } else {
            return self.renderToken(tokens, idx, options, env, self);
        }
    };
}

let thisContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(
        vscode.commands.registerCommand('markdown.extension.printToHtml', () => { print('html'); }),
        vscode.workspace.onDidSaveTextDocument(onDidSave)
    );
}

export function deactivate() { }

function onDidSave(doc: vscode.TextDocument) {
    if (
        doc.languageId === 'markdown'
        && vscode.workspace.getConfiguration('markdown.extension.print', doc.uri).get<boolean>('onFileSave')
    ) {
        print('html');
    }
}

async function print(type: string) {
    const editor = vscode.window.activeTextEditor;

    if (!isMdEditor(editor)) {
        vscode.window.showErrorMessage(localize("noValidMarkdownFile"));
        return;
    }

    const doc = editor.document;
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

    let title = doc.getText().split(/\r?\n/g).find(lineText => lineText.startsWith('#'));
    if (title) {
        title = title.replace(/^#+/, '').replace(/#+$/, '').trim();
    }

    let body: string = await render(doc.getText(), vscode.workspace.getConfiguration('markdown.preview', doc.uri));

    // Image paths
    const config = vscode.workspace.getConfiguration('markdown.extension', doc.uri);
    const configToBase64 = config.get<boolean>("print.imgToBase64");
    const configAbsPath = config.get<boolean>('print.absoluteImgPath')
    const imgTagRegex = /(<img[^>]+src=")([^"]+)("[^>]*>)/g;  // Match '<img...src="..."...>'

    if (configToBase64) {
        body = body.replace(imgTagRegex, function (_, p1, p2, p3) {
            if (!p2.startsWith('http')) {
                const imgSrc = relToAbsPath(doc.uri, p2);
                try {
                    const imgExt = path.extname(imgSrc).slice(1);
                    const file = fs.readFileSync(imgSrc).toString('base64');
                    return `${p1}data:image/${imgExt};base64,${file}${p3}`;
                } catch (e) {
                    vscode.window.showWarningMessage(localize("unableToReadFile") + ` ${imgSrc}, ` + localize("revertingToImagePaths"));
                    if (configAbsPath) {
                        return `${p1}file:///${imgSrc}${p3}`;
                    } else {
                        return _;
                    }
                }
            }
        });
    } else if (configAbsPath) {
        body = body.replace(imgTagRegex, function (_, p1, p2, p3) {
            if (!p2.startsWith('http')) {
                const imgSrc = relToAbsPath(doc.uri, p2);
                // Absolute paths need `file:///` but relative paths don't
                return `${p1}file:///${imgSrc}${p3}`;
            } else {
                return _;
            }
        });
    }

    const hasMath = hasMathEnv(doc.getText());

    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
        <title>${title ? title : ''}</title>
        ${getStyles(doc.uri, hasMath)}
        ${hasMath ? '<script src="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.js"></script>' : ''}
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

function hasMathEnv(text: string) {
    // I'm lazy
    return text.includes('$');
}

async function render(text: string, config: vscode.WorkspaceConfiguration) {
    if (md === undefined) {
        await initMdIt();
    }

    md.set({
        breaks: config.get<boolean>('breaks', false),
        linkify: config.get<boolean>('linkify', true)
    });

    slugCounts = {};

    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(path.join('media', mediaFile));
}

function wrapWithStyleTag(src: string) {
    if (src.startsWith('http')) {
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

function getStyles(uri: vscode.Uri, hasMathEnv: boolean) {
    const katexCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.10.0/dist/katex.min.css" integrity="sha384-9eLZqc9ds8eNjO3TmqPeYcDj8n+Qfa4nuSiGYa6DjLNcv9BtN69ZIulL9+8CqC9Y" crossorigin="anonymous">';
    const markdownCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/markdown.css">';
    const highlightCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/highlight.css">';
    const copyTeXCss = '<link href="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.css" rel="stylesheet" type="text/css">';

    const baseCssPaths = ['checkbox.css'].map(s => getMediaPath(s));
    const customCssPaths = getCustomStyleSheets(uri);

    return `${hasMathEnv ? katexCss : ''}
        ${markdownCss}
        ${highlightCss}
        ${hasMathEnv ? copyTeXCss : ''}
        ${baseCssPaths.map(cssSrc => wrapWithStyleTag(cssSrc)).join('\n')}
        ${getPreviewSettingStyles()}
        ${customCssPaths.map(cssSrc => wrapWithStyleTag(cssSrc)).join('\n')}`;
}

function getCustomStyleSheets(resource: vscode.Uri): string[] {
    const styles = vscode.workspace.getConfiguration('markdown', resource)['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        const root = vscode.workspace.getWorkspaceFolder(resource);
        return styles.map(s => {
            if (!s || s.startsWith('http') || path.isAbsolute(s)) {
                return s;
            }

            if (root) {
                return path.join(root.uri.fsPath, s);
            } else {
                // Otherwise look relative to the markdown file
                return path.join(path.dirname(resource.fsPath), s);
            }
        });
    }
    return [];
}

function relToAbsPath(resource: vscode.Uri, href: string): string {
    if (!href || href.startsWith('http') || path.isAbsolute(href)) {
        return href;
    }

    // Otherwise look relative to the markdown file
    return path.join(path.dirname(resource.fsPath), href);
}

function getPreviewSettingStyles(): string {
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
