'use strict'

import { ExtensionContext, workspace, extensions, window, ConfigurationTarget } from "vscode";

export function activiate(context: ExtensionContext) {
    const decorations = {
        "(~~.+?~~)": [
            {
                "textDecoration": "line-through"
            }
        ],
        "(`[^`\\n]+?`)": [
            {
                "borderRadius": "3px",
                "dark": {
                    "backgroundColor": "#3D474C"
                },
                "light": {
                    "backgroundColor": "#DDDDDD"
                }
            }
        ],
        "(^|[^!])(\\[)(.+)(\\]\\(.+?\\))": [
            {},
            {
                "dark": {
                    "color": "#636363"
                },
                "light": {
                    "color": "#CCC"
                }
            },
            {},
            {
                "dark": {
                    "color": "#636363"
                },
                "light": {
                    "color": "#CCC"
                }
            }
        ]
    }

    if (workspace.getConfiguration('markdown.extension.syntax').get<boolean>('decorations')) {
        if (extensions.getExtension('fabiospampinato.vscode-highlight') !== undefined) {
            const config = workspace.getConfiguration('highlight');
            let regexes = config.get<object>('regexes');
            for (const key in decorations) {
                if (decorations.hasOwnProperty(key)) {
                    if (!regexes.hasOwnProperty(key)) {
                        regexes[key] = decorations[key];
                    }
                }
            }
            config.update('regexes', regexes, ConfigurationTarget.Global);
        }
    }
}