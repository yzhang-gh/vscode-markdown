import { strict as assert } from "assert";
import * as path from "path";
import * as vscode from "vscode";

//#region Constant

export const Test_Workspace_Path = vscode.Uri.file(path.resolve(__dirname, "..", "..", "..", "..", "test"));
export const Test_Md_File_Path = vscode.Uri.joinPath(Test_Workspace_Path, "test.md");

//#endregion Constant

//#region Utility

/**
 * Opens a document with the corresponding editor.
 * @param file A Uri or file system path which identifies the resource.
 */
export const openDocument = async (file: vscode.Uri): Promise<readonly [vscode.TextDocument, vscode.TextEditor]> => {
    const document = await vscode.workspace.openTextDocument(file);
    const editor = await vscode.window.showTextDocument(document);
    return [document, editor];
};

/**
 * Pauses for a while.
 * @param ms - Time to pause in millisecond.
 * @example
 * await sleep(1000);
 */
export function sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/**
 * Tests a command.
 */
export async function testCommand(
    command: string,
    initLines: readonly string[],
    initSelection: vscode.Selection,
    expectedLines: readonly string[],
    expectedSelection: vscode.Selection
): Promise<void> {

    // Open the file.
    const [document, editor] = await openDocument(Test_Md_File_Path);

    // Place the initial content.
    await editor.edit(editBuilder => {
        const fullRange = new vscode.Range(new vscode.Position(0, 0), document.positionAt(document.getText().length));
        editBuilder.delete(fullRange);
        editBuilder.insert(new vscode.Position(0, 0), initLines.join("\n"));
    });
    editor.selection = initSelection;

    await sleep(50);

    // Run the command.
    await vscode.commands.executeCommand(command);

    // Assert.
    const actual = document.getText()
        .replace(/\r\n/g, "\n"); // Normalize line endings.

    assert.deepStrictEqual(actual, expectedLines.join("\n"));
    assert.deepStrictEqual(editor.selection, expectedSelection);
}

//#endregion Utility
