// Reference to https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownExtensions.ts
// Note:
// Not all extensions are implemented correctly.
// Thus, we need to check redundantly when loading their contributions, typically in `resolveMarkdownContribution()`.

import * as vscode from "vscode";
import MarkdownIt = require("markdown-it");
import { Lazy } from "./util/lazy";

/**
 * Represents a VS Code extension with Markdown contribution.
 *
 * @see {@link https://code.visualstudio.com/api/extension-guides/markdown-extension}
 * @see {@link https://code.visualstudio.com/api/references/extension-manifest}
 */
export interface IVscodeMarkdownExtension
    extends vscode.Extension<{
        readonly extendMarkdownIt?: (md: MarkdownIt) => MarkdownIt;
    }> {
    readonly packageJSON: {
        readonly name: string;
        readonly version: string;
        readonly publisher: string;
        readonly engines: { readonly [engine: string]: string };
        readonly contributes?: {
            /**
             * `true` when the extension should provide `extendMarkdownIt()`.
             */
            readonly "markdown.markdownItPlugins"?: boolean;

            /**
             * A list of JavaScript files relative to the extension's root directory.
             */
            readonly "markdown.previewScripts"?: readonly string[];

            /**
             * A list of CSS files relative to the extension's root directory.
             */
            readonly "markdown.previewStyles"?: readonly string[];
        };
    };
}

/**
 * Represents the Markdown contribution from one VS Code extension.
 */
export interface IMarkdownContribution {
    readonly extensionId: string;
    readonly extensionUri: vscode.Uri;
    readonly extendMarkdownIt?: undefined | ((md: MarkdownIt) => Promise<MarkdownIt>);
    readonly previewScripts?: undefined | readonly vscode.Uri[];
    readonly previewStyles?: undefined | readonly vscode.Uri[];
}

/**
 * Represents a function that transforms `IMarkdownContribution`.
 */
export interface IFuncMarkdownContributionTransformer {
    /**
     * @returns `original` when no need to transform. Otherwise, a shallow copy with properties tweaked.
     */
    (original: IMarkdownContribution): IMarkdownContribution;
}

/**
 * Extracts and wraps `extendMarkdownIt()` from the extension.
 *
 * @returns A function that will activate the extension and invoke its `extendMarkdownIt()`.
 */
function getContributedMarkdownItPlugin(extension: IVscodeMarkdownExtension): (md: MarkdownIt) => Promise<MarkdownIt> {
    return async (md) => {
        const exports = await extension.activate();
        if (exports && exports.extendMarkdownIt) {
            return exports.extendMarkdownIt(md);
        }
        return md;
    };
}

/**
 * Resolves absolute Uris of paths from the extension.
 *
 * @param paths The list of paths relative to the extension's root directory.
 *
 * @returns A list of resolved absolute Uris.
 * `undefined` indicates error.
 */
function resolveExtensionResourceUris(
    extension: vscode.Extension<unknown>,
    paths: readonly string[]
): vscode.Uri[] | undefined {
    try {
        return paths.map((path) => vscode.Uri.joinPath(extension.extensionUri, path));
    } catch {
        return undefined; // Discard the extension.
    }
}

/**
 * Resolves the Markdown contribution from the VS Code extension.
 *
 * This function extracts and wraps the contribution without validating the underlying resources.
 */
function resolveMarkdownContribution(extension: IVscodeMarkdownExtension): IMarkdownContribution | undefined {
    const contributes = extension.packageJSON && extension.packageJSON.contributes;

    if (!contributes) {
        return;
    }

    const extendMarkdownIt = contributes["markdown.markdownItPlugins"]
        ? getContributedMarkdownItPlugin(extension)
        : undefined;

    const previewScripts =
        contributes["markdown.previewScripts"] && contributes["markdown.previewScripts"].length
            ? resolveExtensionResourceUris(extension, contributes["markdown.previewScripts"])
            : undefined;

    const previewStyles =
        contributes["markdown.previewStyles"] && contributes["markdown.previewStyles"].length
            ? resolveExtensionResourceUris(extension, contributes["markdown.previewStyles"])
            : undefined;

    if (!extendMarkdownIt && !previewScripts && !previewStyles) {
        return;
    }

    return {
        extensionId: extension.id,
        extensionUri: extension.extensionUri,
        extendMarkdownIt,
        previewScripts,
        previewStyles,
    };
}

/**
 * Skip these extensions!
 */
const Extension_Blacklist: ReadonlySet<string> = new Set<string>([
    "vscode.markdown-language-features", // Deadlock.
    "yzhang.markdown-all-in-one", // This.
]);

/**
 * The contributions from these extensions can not be utilized directly.
 *
 * `ID -> Transformer`
 */
const Extension_Special_Treatment: ReadonlyMap<string, IFuncMarkdownContributionTransformer> = new Map([
    ["vscode.markdown-math", (original) => ({ ...original, previewStyles: undefined })], // Its CSS is not portable. (#986)
]);

/**
 * Represents a VS Code extension Markdown contribution provider.
 */
export interface IMarkdownContributionProvider extends vscode.Disposable {
    // This is theoretically long-running, and should be a `getContributions()` method.
    // But we're not motivated to rename it for now.
    readonly contributions: ReadonlyArray<IMarkdownContribution>;

    readonly onDidChangeContributions: vscode.Event<this>;
}

class MarkdownContributionProvider implements IMarkdownContributionProvider {
    private readonly _onDidChangeContributions = new vscode.EventEmitter<this>();

    protected readonly _disposables: vscode.Disposable[] = [];

    private _cachedContributions: ReadonlyArray<IMarkdownContribution> | undefined = undefined;

    private _isDisposed = false;

    public readonly onDidChangeContributions = this._onDidChangeContributions.event;

    public constructor() {
        this._disposables.push(
            this._onDidChangeContributions,

            vscode.extensions.onDidChange(() => {
                // `contributions` will rebuild the cache.
                this._cachedContributions = undefined;
                this._onDidChangeContributions.fire(this);
            })
        );
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        for (const item of this._disposables) {
            item.dispose();
        }

        this._disposables.length = 0;
        this._isDisposed = true;
    }

    public get contributions() {
        if (!this._cachedContributions) {
            this._cachedContributions = vscode.extensions.all.reduce<IMarkdownContribution[]>((result, extension) => {
                if (Extension_Blacklist.has(extension.id)) {
                    return result;
                }

                const c = resolveMarkdownContribution(extension);

                if (!c) {
                    return result;
                }

                const t = Extension_Special_Treatment.get(extension.id);

                result.push(t ? t(c) : c);
                return result;
            }, []);
        }
        return this._cachedContributions;
    }
}

const defaultProvider = new Lazy(() => new MarkdownContributionProvider());

export function getMarkdownContributionProvider(): IMarkdownContributionProvider {
    return defaultProvider.value;
}
