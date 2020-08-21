'use strict';

import * as fs from "fs";
import * as path from 'path';
import { commands, ExtensionContext, TextDocument, Uri, window, workspace } from 'vscode';
import localize from './localize';
import { mdEngine, extensionBlacklist } from "./markdownEngine";
import { isMdEditor } from './util';

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

    if (!isMdEditor(editor)) {
        window.showErrorMessage(localize("noValidMarkdownFile"));
        return;
    }

    const doc = uri ? await workspace.openTextDocument(uri) : editor.document;
    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    window.setStatusBarMessage(localize("printing") + ` '${path.basename(doc.fileName)}' ` + localize("to") + ` '${type.toUpperCase()}' ...`, 1000);

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

    //// HTML title (GitHub #506)
    let title: string;
    const firstLineText = doc.lineAt(0).text;
    let m: RegExpExecArray | null;
    if (!!(m = /^<!-- title:\s*(\S.+)-->/.exec(firstLineText))) {
        title = m[1].trim();
    } else {
        title = doc.getText().split(/\r?\n/g).find(lineText => lineText.startsWith('#'));
        if (title) {
            title = title.replace(/^#+/, '').replace(/#+$/, '').trim();
        }
    }

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
                window.showWarningMessage(`${localize("unableToReadFile")} ${imgSrc}, ${localize("revertingToImagePaths")}. (${doc.fileName})`);
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

    //// Convert `.md` links to `.html` by default (#667)
    const hrefRegex = /(<a[^>]+href=")([^"]+)("[^>]*>)/g;  // Match '<a...href="..."...>'
    body = body.replace(hrefRegex, function (_, g1, g2, g3) {
        if (g2.endsWith('.md')) {
            return `${g1}${g2.replace(/\.md$/, '.html')}${g3}`;
        } else {
            return _;
        }
    });

    const hasMath = hasMathEnv(doc.getText());
    const extensionStyles = await getPreviewExtensionStyles();
    const extensionScripts = await getPreviewExtensionScripts();
    const includeVscodeStyles = config.get<boolean>('print.includeVscodeStylesheets')
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${title ? title : ''}</title>
        ${extensionStyles}
        ${getStyles(doc.uri, hasMath, includeVscodeStyles)}
        ${hasMath ? '<script src="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.js"></script>' : ''}
        ${extensionScripts}
    </head>
    <body${config.get<string>('print.theme') === 'light' ? ' class="vscode-light"' : ''}>
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

function batchPrint() {
    const doc = window.activeTextEditor.document;
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
                        print('html', uri, path.join(outFolder, path.relative(selectedPath, path.dirname(uri.fsPath))));
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
        msg = msg.replace(/'([c-z]):/, function (_, g1) {
            return `'${g1.toUpperCase()}:`;
        });
        window.showWarningMessage(msg);
        return '';
    }
}

function getStyles(uri: Uri, hasMathEnv: boolean, includeVscodeStyles: boolean) {
    const katexCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.10.2/dist/katex.min.css" integrity="sha384-yFRtMMDnQtDRO8rLpMIKrtPCD5jdktao2TV19YiZYWMDkUR5GQZR/NOVTdquEx1j" crossorigin="anonymous">';
    const markdownCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/markdown.css">';
    const highlightCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/highlight.css">';
    const copyTeXCss = '<link href="https://cdn.jsdelivr.net/npm/katex-copytex@latest/dist/katex-copytex.min.css" rel="stylesheet" type="text/css">';

    const baseCssPaths = ['checkbox.css'].map(s => getMediaPath(s));
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
        if (extensionBlacklist.has(contribute.extensionId)) {
            continue;
        }
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
        if (extensionBlacklist.has(contribute.extensionId)) {
            continue;
        }
        if (!contribute.previewScripts || !contribute.previewScripts.length) {
            continue;
        }
        for (const scriptFile of contribute.previewScripts) {
            result += `<script type="text/javascript">\n/* From extension ${contribute.extensionId} */\n`;
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
