//// <https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownEngine.ts>

import * as vscode from "vscode";
import MarkdownIt = require("markdown-it");
import Token = require("markdown-it/lib/token");
import type IDisposable from "./IDisposable";
import { slugify } from "./util/slugify";
import { getMarkdownContributionProvider } from './markdownExtensions';
import { extendMarkdownIt } from "./markdown-it-plugin-provider";
import { isMdDocument } from "./util/generic";

// To help consumers.
export type { MarkdownIt, Token };

/**
 * Represents the parsing result of a document.
 * An instance of this kind should be **shallow immutable**.
 */
export interface DocumentToken {

    readonly document: vscode.TextDocument;

    /**
     * The markdown-it environment sandbox.
     */
    readonly env: object;

    /**
     * The list of markdown-it block tokens.
     */
    readonly tokens: readonly Token[];

    /**
     * The document version number when parsing it.
     */
    readonly version: number;
}

interface IMarkdownEngine extends IDisposable {

    /**
     * Parses the document.
     */
    getDocumentToken(document: vscode.TextDocument): DocumentToken | Thenable<DocumentToken>;

    /**
     * Gets the markdown-it instance that this engine holds asynchronously.
     */
    getEngine(): Thenable<MarkdownIt>;
}

export interface IDynamicMarkdownEngine extends IMarkdownEngine {

    getDocumentToken(document: vscode.TextDocument): Thenable<DocumentToken>;
}

export interface IStaticMarkdownEngine extends IMarkdownEngine {

    /**
     * The markdown-it instance that this engine holds.
     */
    readonly engine: MarkdownIt;

    getDocumentToken(document: vscode.TextDocument): DocumentToken;

    /**
     * This is for interface consistency.
     * As a static engine, it is recommended to read the `engine` property.
     */
    getEngine(): Thenable<MarkdownIt>;
}

/**
 * A strict CommonMark only engine powered by `markdown-it`.
 */
class CommonMarkEngine implements IStaticMarkdownEngine {

    private readonly _disposables: vscode.Disposable[];

    private readonly _documentTokenCache = new Map<vscode.TextDocument, DocumentToken>();

    private readonly _engine: MarkdownIt;

    public get engine(): MarkdownIt {
        return this._engine;
    }

    constructor() {
        this._engine = new MarkdownIt('commonmark');

        this._disposables = [
            vscode.workspace.onDidCloseTextDocument(document => {
                if (isMdDocument(document)) {
                    this._documentTokenCache.delete(document);
                }
            }),
        ];
    }

    public dispose(): void {
        // Unsubscribe event listeners.
        for (const disposable of this._disposables) {
            disposable.dispose();
        }
        this._disposables.length = 0;
    }

    public getDocumentToken(document: vscode.TextDocument): DocumentToken {
        // It's safe to be sync.
        // In the worst case, concurrent calls lead to run `parse()` multiple times.
        // Only performance regression. No data corruption.

        const cache = this._documentTokenCache.get(document);

        if (cache && cache.version === document.version) {
            return cache;
        } else {
            const env = Object.create(null);
            const result: DocumentToken = {
                document,
                env,
                // Read the version before parsing, in case the document changes,
                // so that we won't declare an old result as a new one.
                version: document.version,
                tokens: this._engine.parse(document.getText(), env),
            };
            this._documentTokenCache.set(document, result);
            return result;
        }
    }

    public async getEngine() {
        return this._engine;
    }
}

class MarkdownEngine implements IDynamicMarkdownEngine {

    private readonly _disposables: vscode.Disposable[];

    private readonly _documentTokenCache = new Map<vscode.TextDocument, DocumentToken>();

    private _engine: MarkdownIt | undefined;

    /**
     * This is used by `addNamedHeaders()`, and reset on each call to `render()`.
     */
    private _slugCount = new Map<string, number>();

    public readonly contributionsProvider = getMarkdownContributionProvider();

    constructor() {
        this._disposables = [
            vscode.workspace.onDidCloseTextDocument(document => {
                if (isMdDocument(document)) {
                    this._documentTokenCache.delete(document);
                }
            }),

            this.contributionsProvider.onDidChangeContributions(() => {
                this.newEngine().then((engine) => {
                    this._engine = engine;
                });
            }),
        ];

        // Initialize an engine.
        this.newEngine().then((engine) => {
            this._engine = engine;
        });
    }

    public dispose(): void {
        // Unsubscribe event listeners.
        for (const disposable of this._disposables) {
            disposable.dispose();
        }
        this._disposables.length = 0;
    }

    public async getDocumentToken(document: vscode.TextDocument): Promise<DocumentToken> {
        const cache = this._documentTokenCache.get(document);

        if (cache && cache.version === document.version) {
            return cache;
        } else {
            const env = Object.create(null);
            const engine = await this.getEngine();
            const result: DocumentToken = {
                document,
                env,
                version: document.version,
                tokens: engine.parse(document.getText(), env),
            };
            this._documentTokenCache.set(document, result);
            return result;
        }
    }

    public async getEngine() {
        if (!this._engine) {
            this._engine = await this.newEngine();
        }
        return this._engine;
    }

    private async newEngine() {
        let md: MarkdownIt;

        const hljs: typeof import("highlight.js").default = require("highlight.js");

        md = new MarkdownIt({
            html: true,
            highlight: (str: string, lang?: string) => {
                if (lang && (lang = normalizeHighlightLang(lang)) && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
                    } catch { }
                }
                return ""; // Signal to markdown-it itself to handle it.
            }
        });

        // contributions provided by this extension must be processed specially,
        // since this extension may not finish activation when creating an engine.
        extendMarkdownIt(md);

        if (!vscode.workspace.getConfiguration('markdown.extension.print').get<boolean>('validateUrls', true)) {
            md.validateLink = () => true;
        }
        this.addNamedHeaders(md);

        for (const contribute of this.contributionsProvider.contributions) {
            if (!contribute.extendMarkdownIt) {
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

    public async render(text: string, config: vscode.WorkspaceConfiguration): Promise<string> {
        const md: MarkdownIt = await this.getEngine();

        md.set({
            breaks: config.get<boolean>('breaks', false),
            linkify: config.get<boolean>('linkify', true)
        });

        this._slugCount.clear();

        return md.render(text);
    }

    /**
     * Tweak the render rule for headings, to set anchor ID.
     */
    private addNamedHeaders(md: MarkdownIt): void {
        const originalHeadingOpen = md.renderer.rules.heading_open;

        // Arrow function ensures that `this` is inherited from `addNamedHeaders`,
        // so that we won't need `bind`, and save memory a little.
        md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
            const raw = tokens[idx + 1].content;
            let slug = slugify(raw, { env });

            let lastCount = this._slugCount.get(slug);
            if (lastCount !== undefined) {
                lastCount++;
                this._slugCount.set(slug, lastCount);
                slug += '-' + lastCount;
            } else {
                this._slugCount.set(slug, 0);
            }

            tokens[idx].attrs = [...(tokens[idx].attrs || []), ["id", slug]];

            if (originalHeadingOpen) {
                return originalHeadingOpen(tokens, idx, options, env, self);
            } else {
                return self.renderToken(tokens, idx, options);
            }
        };
    }
}

/**
 * Tries to convert the identifier to a language name supported by Highlight.js.
 *
 * @see {@link https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md}
 */
function normalizeHighlightLang(lang: string): string {
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

/**
 * This engine dynamically refreshes in the same way as VS Code's built-in Markdown preview.
 */
export const mdEngine = new MarkdownEngine();

/**
 * A strict CommonMark only engine instance.
 */
export const commonMarkEngine = new CommonMarkEngine();
