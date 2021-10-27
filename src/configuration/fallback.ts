import * as vscode from "vscode";
import { IConfigurationFallbackMap } from "./manager";
import { IConfigurationKeyTypeMap } from "./model";

/**
 * Configuration keys that are no longer supported,
 * and will be removed in the next major version.
 */
export const Deprecated_Keys = Object.freeze<string>([
    "syntax.decorations", //
]);

export const Fallback_Map = Object.freeze<IConfigurationFallbackMap<IConfigurationKeyTypeMap>>({
    "theming.decoration.renderCodeSpan": (scope): boolean => {
        const config = vscode.workspace.getConfiguration("markdown.extension", scope);
        const old = config.get<boolean | null>("syntax.decorations");
        if (old === null || old === undefined) {
            return config.get<boolean>("theming.decoration.renderCodeSpan")!;
        } else {
            return old;
        }
    },

    "theming.decoration.renderStrikethrough": (scope): boolean => {
        const config = vscode.workspace.getConfiguration("markdown.extension", scope);
        const old = config.get<boolean | null>("syntax.decorations");
        if (old === null || old === undefined) {
            return config.get<boolean>("theming.decoration.renderStrikethrough")!;
        } else {
            return old;
        }
    },
});
