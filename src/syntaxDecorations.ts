'use strict'

import { ExtensionContext, workspace, extensions, window, ConfigurationTarget, DecorationRangeBehavior } from "vscode";

export function activiate(context: ExtensionContext) {
    const decorations = {
        "(~~.+?~~)": {
            "regexFlags": "g",
            "filterLanguageRegex": "markdown",
            "decorations": [
                { "textDecoration": "line-through" }
            ]
        },
        "(`[^`\\n]+?`)": {
            "regexFlags": "g",
            "filterLanguageRegex": "markdown",
            "decorations": [
                {
                    "border": "1px solid #3D474C",
                    "borderRadius": "3px",
                    "dark": { "backgroundColor": "#30383D" },
                    "light": { "backgroundColor": "#DDDDDD" }
                }
            ]
        },
        "(^|[^!\\r\\n])(\\[)([^\\]]*(?!\\].*\\[)[^\\[]*)(\\]\\(.+?\\))": {
            "regexFlags": "gm",
            "filterLanguageRegex": "markdown",
            "decorations": [
                {},
                {
                    "dark": { "color": "#636363" },
                    "light": { "color": "#CCC" }
                },
                {},
                {
                    "dark": { "color": "#636363" },
                    "light": { "color": "#CCC" }
                }
            ]
        }
    }

    if (workspace.getConfiguration('markdown.extension.syntax').get<boolean>('decorations')) {
        if (extensions.getExtension('fabiospampinato.vscode-highlight') !== undefined) {
            const config = workspace.getConfiguration('highlight');
            let regexes = config.get<object>('regexes', {});
            for (const key in decorations) {
                if (decorations.hasOwnProperty(key)) {
                    regexes[key] = decorations[key];
                }
            }
            config.update('regexes', regexes, ConfigurationTarget.Global);
        }
    }
}