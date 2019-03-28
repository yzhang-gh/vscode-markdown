'use strict'

import { ExtensionContext, Range, TextEditor, window, workspace, Position } from "vscode";
import { isMdEditor, isInFencedCodeBlock } from "./util";

let decorTypes = {
    "baseColor": window.createTextEditorDecorationType({
        "dark": { "color": "#EEFFFF" },
        "light": { "color": "000000" }
    }),
    "gray": window.createTextEditorDecorationType({
        "rangeBehavior": 1,
        "dark": { "color": "#636363" },
        "light": { "color": "#CCC" }
    }),
    "lightBlue": window.createTextEditorDecorationType({
        "color": "#4080D0"
    }),
    "orange": window.createTextEditorDecorationType({
        "color": "#D2B640"
    }),
    "strikethrough": window.createTextEditorDecorationType({
        "rangeBehavior": 1,
        "textDecoration": "line-through"
    }),
    "codeSpan": window.createTextEditorDecorationType({
        "rangeBehavior": 1,
        "border": "1px solid #454D51",
        "borderRadius": "3px"
    })
};

let decors = {}

for (const decorTypeName in decorTypes) {
    if (decorTypes.hasOwnProperty(decorTypeName)) {
        decors[decorTypeName] = [];
    }
}

let regexDecorTypeMapping = {
    "(~~.+?~~)": ["strikethrough"],
    "(?<!`)(`+)(?!`)(.*?)(?<!`)(\\1)(?!`)": ["codeSpan"]
};

let regexDecorTypeMappingPlainTheme = {
    // `code`
    "(?<!`)(`+)(?!`)(.*?)(?<!`)(\\1)(?!`)": ["gray", "baseColor", "gray"],
    // [alt](link)
    "(^|[^!])(\\[)([^\\]\\n]*(?!\\].*\\[)[^\\[\\n]*)(\\]\\(.+?\\))": ["", "gray", "lightBlue", "gray"],
    // ![alt](link)
    "(\\!\\[)([^\\]\\n]*(?!\\].*\\[)[^\\[\\n]*)(\\]\\(.+?\\))": ["gray", "orange", "gray"],
    // *italic*
    "(\\*)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(\\*)": ["gray", "baseColor", "gray"],
    // _italic_
    "(_)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(_)": ["gray", "baseColor", "gray"],
    // **bold**
    "(\\*\\*)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(\\*\\*)": ["gray", "baseColor", "gray"]
}

export function activiate(context: ExtensionContext) {
    window.onDidChangeActiveTextEditor(updateDecorations);

    workspace.onDidChangeTextDocument(event => {
        let editor = window.activeTextEditor;
        if (editor !== undefined && event.document === editor.document) {
            triggerUpdateDecorations(editor);
        }
    });

    var timeout = null;
    function triggerUpdateDecorations(editor) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => updateDecorations(editor), 200);
    }

    let editor = window.activeTextEditor;
    if (editor) {
        updateDecorations(editor);
    }
}

function updateDecorations(editor?: TextEditor) {
    if (!workspace.getConfiguration('markdown.extension.syntax').get<boolean>('decorations')) return;

    if (editor === undefined) {
        editor = window.activeTextEditor;
    }

    if (!isMdEditor(editor)) {
        return;
    }

    const doc = editor.document;

    // Clean decorations
    for (const decorTypeName in decorTypes) {
        if (decorTypes.hasOwnProperty(decorTypeName)) {
            decors[decorTypeName] = [];
        }
    }

    // e.g. { "(~~.+?~~)": ["strikethrough"] }
    let appliedMappings = workspace.getConfiguration('markdown.extension.syntax').get<boolean>('plainTheme') ?
        { ...regexDecorTypeMapping, ...regexDecorTypeMappingPlainTheme } :
        regexDecorTypeMapping;

    doc.getText().split(/\r?\n/g).forEach((lineText, lineNum) => {
        if (isInFencedCodeBlock(doc, lineNum)) { return; }

        for (const reText in appliedMappings) {
            if (appliedMappings.hasOwnProperty(reText)) {
                const decorTypeNames: string[] = appliedMappings[reText];  // e.g. ["strikethrough"]
                const regex = new RegExp(reText, 'g');  // e.g. "(~~.+?~~)"

                let match;
                while ((match = regex.exec(lineText)) !== null) {

                    let startIndex = match.index;

                    for (let i = 0; i < decorTypeNames.length; i++) {
                        // Skip if in math environment (See `completion.ts`)
                        const lineTextBefore = lineText.substr(0, startIndex);
                        const lineTextAfter = lineText.substr(startIndex);
                        if (
                            /(^|[^\$])\$(|[^ \$].*)\w*$/.test(lineTextBefore)
                            && lineTextAfter.includes('$')
                        ) {
                            // Inline math ($...$)
                            break;
                        } else {
                            const textBefore = doc.getText(new Range(0, 0, lineNum, startIndex));
                            const textAfter = doc.getText().substr(doc.offsetAt(new Position(lineNum, startIndex)));
                            let matches;
                            if (
                                (matches = textBefore.match(/\$\$/g)) !== null
                                && matches.length % 2 !== 0
                                && textAfter.includes('\$\$')
                            ) {
                                // Display math ($$ ... $$)
                                break;
                            }
                        }

                        const decorTypeName = decorTypeNames[i];
                        const caughtGroup = decorTypeName == "codeSpan" ? match[0] : match[i + 1];
                        const range = new Range(lineNum, startIndex, lineNum, startIndex + caughtGroup.length);
                        startIndex += caughtGroup.length;

                        if (decorTypeName.length === 0) {
                            continue;
                        }
                        decors[decorTypeName].push(range);
                    }
                }
            }
        }
    });

    for (const decorTypeName in decors) {
        if (decors.hasOwnProperty(decorTypeName)) {
            editor.setDecorations(decorTypes[decorTypeName], decors[decorTypeName]);
        }
    }
}
