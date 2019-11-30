//// <https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownEngine.ts>

import { extensions, workspace, WorkspaceConfiguration } from 'vscode';
import { slugify } from './util';

class MarkdownEngine {
    private md?;

    private _slugCount = new Map<string, number>();

    private async initMdIt() {
        if (!this.md) {
            const hljs = await import('highlight.js');
            const mdtl = await import('markdown-it-task-lists');
            const mdkt = await import('@neilsustc/markdown-it-katex');

            //// Make a deep copy as `macros` will be modified by KaTeX during initialization
            let userMacros = JSON.parse(JSON.stringify(workspace.getConfiguration('markdown.extension.katex').get<object>('macros')));
            let katexOptions = { throwOnError: false };
            if (Object.keys(userMacros).length !== 0) {
                katexOptions['userMacros'] = userMacros;
            }

            this.md = (await import('markdown-it'))({
                html: true,
                highlight: (str: string, lang?: string) => {
                    lang = normalizeHighlightLang(lang);
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return `<div>${hljs.highlight(lang, str, true).value}</div>`;
                        }
                        catch (error) { }
                    }
                    return `<code><div>${this.md.utils.escapeHtml(str)}</div></code>`;
                }
            }).use(mdtl).use(mdkt, katexOptions);

            //// Conditional modules
            if (extensions.getExtension('bierner.markdown-footnotes') !== undefined) {
                const mdfn = await import('markdown-it-footnote');
                this.md = this.md.use(mdfn);
            }

            if (!workspace.getConfiguration('markdown.extension.print').get<boolean>('validateUrls', true)) {
                this.md.validateLink = () => true;
            }

            this.addNamedHeaders(this.md);
        }
    }

    public async render(text: string, config: WorkspaceConfiguration): Promise<string> {
        if (this.md === undefined) {
            await this.initMdIt();
        }

        this.md.set({
            breaks: config.get<boolean>('breaks', false),
            linkify: config.get<boolean>('linkify', true)
        });

        this._slugCount = new Map<string, number>();

        return this.md.render(text);
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
