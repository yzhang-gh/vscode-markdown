"use strict";

import * as vscode from "vscode";
import { IConfigurationFallbackMap } from "./manager";

const defaultFallback: IConfigurationFallbackMap = {

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
};

export default defaultFallback;
