import * as vscode from "vscode";
import { commonMarkEngine } from "../markdownEngine";

/**
 * Checks whether the line is in a fenced code block.
 * @param lineIndex The zero-based line index.
 */
export function isInFencedCodeBlock(doc: vscode.TextDocument, lineIndex: number): boolean {
    const { tokens } = commonMarkEngine.getDocumentToken(doc);

    for (const token of tokens) {
        if (token.type === "fence"
            && token.tag === "code"
            && token.map![0] <= lineIndex
            && lineIndex < token.map![1]) {
            return true;
        }
    }

    return false;
}

export function mathEnvCheck(doc: vscode.TextDocument, pos: vscode.Position): "display" | "inline" | "" {
    const docText = doc.getText();
    const crtOffset = doc.offsetAt(pos);
    const crtLine = doc.lineAt(pos.line);

    const lineTextBefore = crtLine.text.substring(0, pos.character);
    const lineTextAfter = crtLine.text.substring(pos.character);

    if (/(?:^|[^\$])\$(?:[^ \$].*)??\\\w*$/.test(lineTextBefore)
        && lineTextAfter.includes("$")) {
        // Inline math
        return "inline";
    } else {
        const textBefore = docText.substring(0, crtOffset);
        const textAfter = docText.substring(crtOffset);
        let matches = textBefore.match(/\$\$/g);
        if (matches !== null
            && matches.length % 2 !== 0
            && textAfter.includes("$$")) {
            // $$ ... $$
            return "display";
        } else {
            return "";
        }
    }
}
