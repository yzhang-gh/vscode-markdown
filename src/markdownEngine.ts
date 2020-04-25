//// <https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownEngine.ts>

import { extensions, workspace, WorkspaceConfiguration } from 'vscode';
import { slugify } from './util';
import { MarkdownContribution, MarkdownContributionProvider, getMarkdownContributionProvider } from './markdownExtensions'

class MarkdownEngine {
    public cacheMd;

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
        let md;

        const hljs = await import('highlight.js');

        md = (await import('markdown-it'))({
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

        if (!workspace.getConfiguration('markdown.extension.print').get<boolean>('validateUrls', true)) {
            md.validateLink = () => true;
        }
        this.addNamedHeaders(md);

        for (const contribute of this.contributionsProvider.contributions) {
            md = await contribute.extendMarkdownIt(md);
        }
        return md;
    }

    public async render(text: string, config: WorkspaceConfiguration): Promise<string> {
        const md = await this.getEngine();

        md.set({
            breaks: config.get<boolean>('breaks', false),
            linkify: config.get<boolean>('linkify', true)
        });

        this._slugCount = new Map<string, number>();

        return md.render(text);
    }

    private addNamedHeaders(md: any): void {
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
                return self.renderToken(tokens, idx, options, env, self);
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
