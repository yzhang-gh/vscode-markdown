import * as vscode from "vscode";

/**
 * `[id, value]`
 */
export type IConfigurationRecord<T = unknown> = readonly [string, T];

const Default_Config: readonly IConfigurationRecord[] = [
    ["markdown.extension.toc.levels", "1..6"],
    ["markdown.extension.toc.unorderedList.marker", "-"],
    ["markdown.extension.toc.orderedList", false],
    ["markdown.extension.toc.plaintext", false],
    ["markdown.extension.toc.updateOnSave", true],
    ["markdown.extension.toc.slugifyMode", "github"],
    ["markdown.extension.toc.omittedFromToc", Object.create(null)],
    ["markdown.extension.preview.autoShowPreviewToSide", false],
    ["markdown.extension.orderedList.marker", "ordered"],
    ["markdown.extension.italic.indicator", "*"],
    ["markdown.extension.bold.indicator", "**"],
    ["markdown.extension.tableFormatter.normalizeIndentation", false],
    ["markdown.extension.tableFormatter.delimiterRowNoPadding", false],
    ["editor.insertSpaces", true],
    ["editor.tabSize", 4],
];

export function resetConfiguration(configurationTarget: vscode.ConfigurationTarget | boolean = true): Promise<void> {
    return updateConfiguration({ config: Default_Config, configurationTarget });
}

/**
 * A wrapper for `vscode.WorkspaceConfiguration.update()`.
 *
 * @param configurationTarget Defaults to `true` (Global).
 * @param overrideInLanguage Defaults to `undefined`.
 */
export async function updateConfiguration({
    config,
    configurationTarget = true,
    overrideInLanguage,
}: {
    config: Iterable<IConfigurationRecord>;
    configurationTarget?: vscode.ConfigurationTarget | boolean;
    overrideInLanguage?: boolean;
}): Promise<void> {
    const configObj = vscode.workspace.getConfiguration();
    for (const [id, value] of config) {
        await configObj.update(id, value, configurationTarget, overrideInLanguage);
    }
}
