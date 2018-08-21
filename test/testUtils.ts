import * as path from 'path'
import * as assert from 'assert';
import { commands, window, workspace, Position, Range, Selection } from 'vscode';

export const testMdFile = path.join(__dirname, '..', '..', 'test', 'test.md');
export interface Config {
    'markdown.extension.toc.levels'?: string;
    'markdown.extension.toc.unorderedList.marker'?: string;
    'markdown.extension.toc.orderedList'?: boolean;
    'markdown.extension.toc.plaintext'?: boolean;
    'markdown.extension.toc.updateOnSave'?: boolean;
    'markdown.extension.toc.githubCompatibility'?: boolean;
    'markdown.extension.preview.autoShowPreviewToSide'?: boolean;
    'markdown.extension.orderedList.marker'?: string;
    'markdown.extension.italic.indicator'?: string;
    'markdown.extension.tableFormatter.normalizeIndentation'?: boolean;
    'editor.insertSpaces'?: boolean;
    'editor.tabSize'?: number;
}

export const defaultConfigs: Config = {
    "markdown.extension.toc.levels": "1..6",
    "markdown.extension.toc.unorderedList.marker": "-",
    "markdown.extension.toc.orderedList": false,
    "markdown.extension.toc.plaintext": false,
    "markdown.extension.toc.updateOnSave": true,
    "markdown.extension.toc.githubCompatibility": false,
    "markdown.extension.preview.autoShowPreviewToSide": false,
    "markdown.extension.orderedList.marker": "ordered",
    "markdown.extension.italic.indicator": "*",
    "markdown.extension.tableFormatter.normalizeIndentation": false,
    "editor.insertSpaces": true,
    "editor.tabSize": 4
}

// 💩 Promise, then, async/await ... <https://github.com/Microsoft/vscode/issues/31210>

export async function testCommand(command: string, linesBefore: string[], selectionBefore: Selection, expectedLines: string[], expectedSelection: Selection, configuration?: Config) {
    const tempConfiguration: Config = { ...defaultConfigs, ...configuration }
    
    for (let key in tempConfiguration) {
        await workspace.getConfiguration().update(key, tempConfiguration[key], true);
    }

    const document = await workspace.openTextDocument(testMdFile);
    const editor = await window.showTextDocument(document);

    const _applied = await editor.edit(editBuilder => {
        let fullRange = new Range(new Position(0, 0), editor.document.positionAt(editor.document.getText().length));
        editBuilder.delete(fullRange);
        editBuilder.insert(new Position(0, 0), linesBefore.join('\n'));
    });

    window.activeTextEditor.selection = selectionBefore;

    await commands.executeCommand(command);

    let actual = window.activeTextEditor.document.getText();
    actual = actual.replace(/\r\n/g, '\n').replace(/\t/g, '    '); /* !!! */

    assert.deepEqual(actual, expectedLines.join('\n'));
    assert.deepEqual(window.activeTextEditor.selection, expectedSelection);
}
