import * as vscode from "vscode";
import LanguageIdentifier from "../contract/LanguageIdentifier";

/** Scheme `File` or `Untitled` */
export const Document_Selector_Markdown: vscode.DocumentSelector = [
    { language: LanguageIdentifier.Markdown, scheme: "file" },
    { language: LanguageIdentifier.Markdown, scheme: "untitled" },
];

/**
 * **Do not call `exec()` method, to avoid accidentally changing its state!**
 *
 * Match most kinds of fenced code blocks:
 *
 * * Only misses <https://spec.commonmark.org/0.29/#example-116>.
 * * Due to the limitations of regular expression, the "end of the document" cases are not handled.
 */
export const Regexp_Fenced_Code_Block = /^ {0,3}(?<fence>(?<char>[`~])\k<char>{2,})[^`\r\n]*$[^]*?^ {0,3}\k<fence>\k<char>* *$/gm;

export function isMdDocument(doc: vscode.TextDocument | undefined): boolean {
    if (doc) {
        const extraLangIds = vscode.workspace.getConfiguration("markdown.extension").get<Array<string>>("extraLangIds");
        const langId = doc.languageId;
        if (extraLangIds?.includes(langId)) {
            return true;
        }
        if (langId === LanguageIdentifier.Markdown) {
            return true;
        }
    }
    return false;
}
