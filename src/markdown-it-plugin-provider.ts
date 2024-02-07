import type { KatexOptions } from "katex";
import MarkdownIt = require("markdown-it");
import { configManager } from "./configuration/manager";

const katexOptions: KatexOptions = { throwOnError: false };

/**
 * https://code.visualstudio.com/api/extension-guides/markdown-extension#adding-support-for-new-syntax-with-markdownit-plugins
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    md.use(require("markdown-it-task-lists"), {enabled: true});
    md.use(require("markdown-it-github-alerts"), { matchCaseSensitive: false })

    if (configManager.get("math.enabled")) {
        // We need side effects. (#521)
        require("katex/contrib/mhchem");

        // Deep copy, as KaTeX needs a normal mutable object. <https://katex.org/docs/options.html>
        const macros: KatexOptions["macros"] = JSON.parse(JSON.stringify(configManager.get("katex.macros")));

        if (Object.keys(macros).length === 0) {
            delete katexOptions["macros"];
        } else {
            katexOptions["macros"] = macros;
        }

        md.use(require("@neilsustc/markdown-it-katex"), katexOptions);
    }

    return md;
}
