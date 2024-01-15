'use strict';

import * as fs from "fs";
import * as path from 'path';
import { commands, ExtensionContext, TextDocument, Uri, window, workspace } from 'vscode';
import { encodeHTML } from 'entities';
import { localize } from './nls';
import { mdEngine } from "./markdownEngine";
import { isMdDocument } from "./util/generic";

let thisContext: ExtensionContext;

export function activate(context: ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(
        commands.registerCommand('markdown.extension.printToHtml', () => { print('html'); }),
        commands.registerCommand('markdown.extension.printToHtmlBatch', () => { batchPrint(); }),
        workspace.onDidSaveTextDocument(onDidSave)
    );
}

export function deactivate() { }

function onDidSave(doc: TextDocument) {
    if (
        doc.languageId === 'markdown'
        && workspace.getConfiguration('markdown.extension.print', doc.uri).get<boolean>('onFileSave')
    ) {
        print('html');
    }
}

async function print(type: string, uri?: Uri, outFolder?: string) {
    const editor = window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
        window.showErrorMessage(localize("ui.general.messageNoValidMarkdownFile"));
        return;
    }

    const doc = uri ? await workspace.openTextDocument(uri) : editor.document;
    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    const statusBarMessage = window.setStatusBarMessage("$(sync~spin) " + localize("ui.exporting.messageExportingInProgress", path.basename(doc.fileName), type.toUpperCase()));

    if (outFolder && !fs.existsSync(outFolder)) {
        fs.mkdirSync(outFolder, { recursive: true });
    }

    /**
     * Modified from <https://github.com/Microsoft/vscode/tree/master/extensions/markdown>
     * src/previewContentProvider MDDocumentContentProvider provideTextDocumentContent
     */
    let outPath = outFolder ? path.join(outFolder, path.basename(doc.fileName)) : doc.fileName;
    outPath = outPath.replace(/\.\w+?$/, `.${type}`);
    outPath = outPath.replace(/^([cdefghij]):\\/, function (_, p1: string) {
        return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
    });
    if (!outPath.endsWith(`.${type}`)) {
        outPath += `.${type}`;
    }

    //// Determine document title.
    // 1. If the document begins with a comment like `<!-- title: Document Title -->`, use it. Empty title is not allow here. (GitHub #506)
    // 2. Else, find the first ATX heading, and use it.

    const firstLineText = doc.lineAt(0).text;
    // The lazy quantifier and `trim()` can avoid mistakenly capturing cases like:
    // <!-- title:-->-->
    // <!-- title: --> -->
    let m = /^<!-- title:(.*?)-->/.exec(firstLineText);
    let title: string | undefined = m === null ? undefined : m[1].trim();

    // Empty string is also falsy.
    if (!title) {
        // Editors treat `\r\n`, `\n`, and `\r` as EOL.
        // Since we don't care about line numbers, a simple alternation is enough and slightly faster.
        title = doc.getText().split(/\n|\r/g).find(lineText => lineText.startsWith('#') && /^#{1,6} /.test(lineText));
        if (title) {
            title = title.replace(/<!--(.*?)-->/g, '');
            title = title.trim().replace(/^#+/, '').replace(/#+$/, '').trim();
        }
    }

    //// Render body HTML.
    let body: string = await mdEngine.render(doc.getText(), workspace.getConfiguration('markdown.preview', doc.uri));

    //// Image paths
    const config = workspace.getConfiguration('markdown.extension', doc.uri);
    const configToBase64 = config.get<boolean>('print.imgToBase64');
    const configAbsPath = config.get<boolean>('print.absoluteImgPath');
    const imgTagRegex = /(<img[^>]+src=")([^"]+)("[^>]*>)/g;  // Match '<img...src="..."...>'

    if (configToBase64) {
        body = body.replace(imgTagRegex, function (_, p1, p2, p3) {
            if (p2.startsWith('http') || p2.startsWith('data:')) {
                return _;
            }

            const imgSrc = relToAbsPath(doc.uri, p2);
            try {
                let imgExt = path.extname(imgSrc).slice(1);
                if (imgExt === "jpg") {
                    imgExt = "jpeg";
                } else if (imgExt === "svg") {
                    imgExt += "+xml";
                }
                const file = fs.readFileSync(imgSrc.replace(/%20/g, '\ ')).toString('base64');
                return `${p1}data:image/${imgExt};base64,${file}${p3}`;
            } catch (e) {
                window.showWarningMessage(localize("ui.general.messageUnableToReadFile", imgSrc) + ` ${localize("ui.exporting.messageRevertingToImagePaths")} (${doc.fileName})`);
            }

            if (configAbsPath) {
                return `${p1}file:///${imgSrc}${p3}`;
            } else {
                return _;
            }
        });
    } else if (configAbsPath) {
        body = body.replace(imgTagRegex, function (_, p1, p2, p3) {
            if (p2.startsWith('http') || p2.startsWith('data:')) {
                return _;
            }

            const imgSrc = relToAbsPath(doc.uri, p2);
            // Absolute paths need `file:///` but relative paths don't
            return `${p1}file:///${imgSrc}${p3}`;
        });
    }

    //// Convert `.md` links to `.html` by default (#667, #1324, #1347)
    const hrefRegex = /(<a[^>]+href=")([^"]+)("[^>]*>)/g;  // Match '<a...href="..."...>'
    body = body.replace(hrefRegex, function (_, g1, g2, g3) {
        if ((g2.endsWith('.md') || g2.includes('.md#')) && !(g2.includes('github.com') && g2.includes('blob'))) {
            return `${g1}${g2.replace(/\.md$/, '.html').replace(/\.md#/, '.html#')}${g3}`;
        } else {
            return _;
        }
    });

    const hasMath = hasMathEnv(doc.getText());
    const extensionStyles = await getPreviewExtensionStyles();
    const extensionScripts = await getPreviewExtensionScripts();
    const includeVscodeStyles = config.get<boolean>('print.includeVscodeStylesheets')!;
    const pureHtml = config.get<boolean>('print.pureHtml')!;
    const themeKind = config.get<string>('print.theme');
    const themeClass = themeKind === 'light' ? 'vscode-light' : themeKind === 'dark' ? 'vscode-dark' : '';

    let html = body;
    if (!pureHtml) {
        html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title ? encodeHTML(title) : ''}</title>
            ${extensionStyles}
            ${getStyles(doc.uri, hasMath, includeVscodeStyles)}
        </head>
        <body class="vscode-body ${themeClass}">
            ${body}
            ${hasMath ? '<script async src="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.js"></script>' : ''}
            ${extensionScripts}
        </body>
        </html>`;
    }

    switch (type) {
        case 'html':
            fs.writeFile(outPath, html, 'utf-8', function (err) {
                if (err) { console.log(err); }
            });
            break;
        case 'pdf':
            break;
    }

    // Hold the message for extra 500ms, in case the operation finished very fast.
    setTimeout(() => statusBarMessage.dispose(), 500);
}

function batchPrint() {
    const doc = window.activeTextEditor?.document;
    // @ts-ignore Needs refactoring.
    const root = workspace.getWorkspaceFolder(doc.uri).uri;
    window.showOpenDialog({ defaultUri: root, openLabel: 'Select source folder', canSelectFiles: false, canSelectFolders: true }).then(uris => {
        if (uris && uris.length > 0) {
            const selectedPath = uris[0].fsPath;
            const relPath = path.relative(root.fsPath, selectedPath);

            if (relPath.startsWith('..')) {
                window.showErrorMessage('Cannot use a path outside the current folder');
                return;
            }

            workspace.findFiles((relPath.length > 0 ? relPath + '/' : '') + '**/*.{md}', '{**/node_modules,**/bower_components,**/*.code-search}').then(uris => {
                window.showInputBox({
                    value: selectedPath + path.sep + 'out',
                    valueSelection: [selectedPath.length + 1, selectedPath.length + 4],
                    prompt: 'Please specify an output folder'
                }).then(outFolder => {
                    uris.forEach(uri => {
                        print('html', uri, path.join(outFolder!, path.relative(selectedPath, path.dirname(uri.fsPath))));
                    });
                });
            });
        }
    });
}

function hasMathEnv(text: string) {
    // I'm lazy
    return text.includes('$');
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
        return fs.readFileSync(fileName).toString();
    } catch (error) {
        // https://nodejs.org/docs/latest-v12.x/api/errors.html#errors_class_systemerror
        window.showWarningMessage(localize("ui.exporting.messageCustomCssNotFound", (error as NodeJS.ErrnoException).path));
        return '';
    }
}

function getStyles(uri: Uri, hasMathEnv: boolean, includeVscodeStyles: boolean) {
    const katexCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">';
    const markdownCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/markdown.css">';
    const highlightCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/highlight.css">';
    const copyTeXCss = '<link href="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.css" rel="stylesheet" type="text/css">';

    const baseCssPaths = [
        'media/checkbox.css',
        "node_modules/markdown-it-github-alerts/styles/github-colors-light.css",
        "node_modules/markdown-it-github-alerts/styles/github-colors-dark-media.css",
        'node_modules/markdown-it-github-alerts/styles/github-base.css'
    ].map(s => thisContext.asAbsolutePath(s));
    const customCssPaths = getCustomStyleSheets(uri);

    return `${hasMathEnv ? katexCss + '\n' + copyTeXCss : ''}
        ${includeVscodeStyles
            ? markdownCss + '\n' + highlightCss + '\n' + getPreviewSettingStyles()
            : ''}
        ${baseCssPaths.map(cssSrc => wrapWithStyleTag(cssSrc)).join('\n')}
        ${customCssPaths.map(cssSrc => wrapWithStyleTag(cssSrc)).join('\n')}`;
}

function getCustomStyleSheets(resource: Uri): string[] {
    const styles = workspace.getConfiguration('markdown', resource)['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        const root = workspace.getWorkspaceFolder(resource);
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

function relToAbsPath(resource: Uri, href: string): string {
    if (!href || href.startsWith('http') || path.isAbsolute(href)) {
        return href;
    }

    // Otherwise look relative to the markdown file
    return path.join(path.dirname(resource.fsPath), href);
}

function getPreviewSettingStyles(): string {
    const previewSettings = workspace.getConfiguration('markdown')['preview'];
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

async function getPreviewExtensionStyles() {
    var result = "<style>\n"
    for (const contribute of mdEngine.contributionsProvider.contributions) {
        if (!contribute.previewStyles || !contribute.previewStyles.length) {
            continue;
        }
        result += `/* From extension ${contribute.extensionId} */\n`;
        for (const styleFile of contribute.previewStyles) {
            try {
                result += await fs.promises.readFile(styleFile.fsPath, { encoding: "utf8" });
            } catch (error) {
                result += "/* Error */";
            }
            result += "\n";
        }
    }
    result += "</style>";
    return result;
}

async function getPreviewExtensionScripts() {
    var result = "";
    for (const contribute of mdEngine.contributionsProvider.contributions) {
        if (!contribute.previewScripts || !contribute.previewScripts.length) {
            continue;
        }
        for (const scriptFile of contribute.previewScripts) {
            result += `<script async type="text/javascript">\n/* From extension ${contribute.extensionId} */\n`;
            try {
                result += await fs.promises.readFile(scriptFile.fsPath, { encoding: "utf8" });
            } catch (error) {
                result += "/* Error */";
            }
            result += `\n</script>\n`;
        }
    }
    return result;
}
