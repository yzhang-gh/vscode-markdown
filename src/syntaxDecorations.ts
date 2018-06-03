'use strict'

import { ExtensionContext, Range, TextEditor, window, workspace } from "vscode";
import { isMdEditor } from "./util";

let decorTypes = {
    "baseColor": window.createTextEditorDecorationType({
        "dark": { "color": "#EEFFFF" },
        "light": { "color": "000000" }
    }),
    "gray": window.createTextEditorDecorationType({
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
        "textDecoration": "line-through"
    }),
    "codeSpan": window.createTextEditorDecorationType({
        "border": "1px solid #3D474C",
        "borderRadius": "3px",
        "dark": { "backgroundColor": "#30383D" },
        "light": { "backgroundColor": "#DDDDDD" }
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
    "(`[^`\\n]+?`)": ["codeSpan"],
    "(`)([^`\\n]+?)(`)": ["gray", "baseColor", "gray"],
    "(^|[^!])(\\[)([^\\]\\n]*(?!\\].*\\[)[^\\[\\n]*)(\\]\\(.+?\\))": ["", "gray", "lightBlue", "gray"],
    "(\\!\\[)([^\\]\\n]*(?!\\].*\\[)[^\\[\\n]*)(\\]\\(.+?\\))": ["gray", "orange", "gray"],
    "(\\*)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(\\*)": ["gray", "baseColor", "gray"],
    "(_)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(_)": ["gray", "baseColor", "gray"],
    "(\\*\\*)([^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s].*?[^\\*\\`\\!\\@\\#\\%\\^\\&\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s])(\\*\\*)": ["gray", "baseColor", "gray"]
};

export function activiate(context: ExtensionContext) {
    if (!workspace.getConfiguration('markdown.extension.syntax').get<boolean>('decorations')) return;

    window.onDidChangeActiveTextEditor(triggerUpdateDecorations);

    workspace.onDidChangeTextDocument(event => {
        let editor = window.activeTextEditor;
        if (editor !== undefined && event.document === editor.document) {
            triggerUpdateDecorations(editor);
        }
    });

    var timeout = null;
    function triggerUpdateDecorations(editor?) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => updateDecorations(editor), 100);
    }

    let editor = window.activeTextEditor;
    if (editor) {
        triggerUpdateDecorations(editor);
    }
}

function updateDecorations(editor?: TextEditor) {
    if (editor === undefined) {
        editor = window.activeTextEditor;
    }

    if (!isMdEditor(editor)) {
        return;
    }

    // Clean decorations
    for (const decorTypeName in decorTypes) {
        if (decorTypes.hasOwnProperty(decorTypeName)) {
            decors[decorTypeName] = [];
        }
    }

    editor.document.getText().split(/\r?\n/g).forEach((lineText, lineNum) => {
        for (const reText in regexDecorTypeMapping) {
            if (regexDecorTypeMapping.hasOwnProperty(reText)) {
                const decorTypeNames = regexDecorTypeMapping[reText];
                const regex = new RegExp(reText, 'g');
                let match;
                while ((match = regex.exec(lineText)) !== null) {
                    let startIndex = match.index;
                    for (let i = 0; i < decorTypeNames.length; i++) {
                        let range = new Range(lineNum, startIndex, lineNum, startIndex + match[i + 1].length);
                        startIndex += match[i + 1].length;

                        const decorTypeName = decorTypeNames[i];
                        if (decorTypeName.length === 0) {
                            continue;
                        }
                        decors[decorTypeNames[i]].push(range);
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
