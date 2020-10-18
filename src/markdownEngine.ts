//// <https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownEngine.ts>

import { extensions, workspace, WorkspaceConfiguration } from 'vscode';
import { slugify } from './util';
import { MarkdownContribution, MarkdownContributionProvider, getMarkdownContributionProvider } from './markdownExtensions';
import MarkdownIt = require('markdown-it');

// extensions that treat specially
export const extensionBlacklist = new Set<string>(["vscode.markdown-language-features", "yzhang.markdown-all-in-one"]);

interface IMarkdownEngine {
}

/**
 * A strict CommonMark only engine powered by `markdown-it`.
 */
class CommonmarkEngine implements IMarkdownEngine {
    readonly #engine: MarkdownIt;

    public get engine(): MarkdownIt {
        return this.#engine;
    }

    constructor() {
        this.#engine = new MarkdownIt('commonmark');
    }
}

class MarkdownEngine {
    public cacheMd: MarkdownIt;

    public async getEngine() {
        if (!this.cacheMd) {
            this.cacheMd = await this.newEngine();
        }
        return this.cacheMd;
    }

    public contributionsProvider = getMarkdownContributionProvider();
    private _slugCount = new Map<string, number>();

    constructor() {
        this.cacheMd = null;
        this.contributionsProvider.onContributionsChanged(() => {
            this.newEngine().then((engine) => {
                this.cacheMd = engine;
            })
        });
        this.newEngine().then((engine) => {
            this.cacheMd = engine;
        })
    }

    private async newEngine() {
        let md: MarkdownIt;

        const hljs = await import('highlight.js');
        const mdtl = await import('markdown-it-task-lists');
        const mdkt = await import('@neilsustc/markdown-it-katex');

        //// Make a deep copy as `macros` will be modified by KaTeX during initialization
        let userMacros = JSON.parse(JSON.stringify(workspace.getConfiguration('markdown.extension.katex').get<object>('macros')));
        let katexOptions = { throwOnError: false };
        if (Object.keys(userMacros).length !== 0) {
            katexOptions['macros'] = userMacros;
        }

        md = new MarkdownIt({
            html: true,
            highlight: (str: string, lang?: string) => {
                lang = normalizeHighlightLang(lang);
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<div>${hljs.highlight(lang, str, true).value}</div>`;
                    }
                    catch (error) { }
                }
                return `<code><div>${md.utils.escapeHtml(str)}</div></code>`;
            }
        });

        // contributions provided by this extension must be processed specially,
        // since this extension may not finish activing when a engine is needed to be created.
        md.use(mdtl).use(mdkt, katexOptions);

        if (!workspace.getConfiguration('markdown.extension.print').get<boolean>('validateUrls', true)) {
            md.validateLink = () => true;
        }
        this.addNamedHeaders(md);

        for (const contribute of this.contributionsProvider.contributions) {
            if (extensionBlacklist.has(contribute.extensionId)) {
                continue;
            }

            // Skip the third-party Markdown extension, if it is broken or crashes.
            try {
                md = await contribute.extendMarkdownIt(md);
            } catch (err) {
                // Use the multiple object overload, so that the console can output the error object in its own way, which usually keeps more details than `toString`.
                console.warn(`[yzhang.markdown-all-in-one]:\nSkipped Markdown extension: ${contribute.extensionId}\nReason:`, err);
            }
        }
        return md;
    }

    public async render(text: string, config: WorkspaceConfiguration): Promise<string> {
        const md: MarkdownIt = await this.getEngine();

        md.set({
            breaks: config.get<boolean>('breaks', false),
            linkify: config.get<boolean>('linkify', true)
        });

        this._slugCount = new Map<string, number>();

        return md.render(text);
    }

    private addNamedHeaders(md: MarkdownIt): void {
        const originalHeadingOpen = md.renderer.rules.heading_open;

        md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
            const title = tokens[idx + 1].children.reduce((acc: string, t: any) => acc + t.content, '');
            let slug = slugify(title);

            if (mdEngine._slugCount.has(slug)) {
                mdEngine._slugCount.set(slug, mdEngine._slugCount.get(slug) + 1);
                slug += '-' + mdEngine._slugCount.get(slug);
            } else {
                mdEngine._slugCount.set(slug, 0);
            }

            tokens[idx].attrs = tokens[idx].attrs || [];
            tokens[idx].attrs.push(['id', slug]);

            if (originalHeadingOpen) {
                return originalHeadingOpen(tokens, idx, options, env, self);
            } else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
}

function normalizeHighlightLang(lang: string | undefined) {
    switch (lang && lang.toLowerCase()) {
        case 'tsx':
        case 'typescriptreact':
            return 'jsx';
        case 'json5':
        case 'jsonc':
            return 'json';
        case 'c#':
        case 'csharp':
            return 'cs';
        default:
            return lang;
    }
}

export const mdEngine = new MarkdownEngine();

/**
 * A strict CommonMark only engine instance.
 */
export const commonmarkEngine = new CommonmarkEngine();
