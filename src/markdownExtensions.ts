// Reference to https://github.com/microsoft/vscode/blob/master/extensions/markdown-language-features/src/markdownExtensions.ts
// Changes have been made to differentiate contributions by extension id
import { extensions, Disposable, Uri, Extension, Event, EventEmitter } from 'vscode';
import * as path from 'path';

const resolveExtensionResource = (extension: Extension<any>, resourcePath: string): Uri => {
    return Uri.file(path.join(extension.extensionPath, resourcePath));
};

const resolveExtensionResources = (extension: Extension<any>, resourcePaths: unknown): Uri[] => {
    const result: Uri[] = [];
    if (Array.isArray(resourcePaths)) {
        for (const resource of resourcePaths) {
            try {
                result.push(resolveExtensionResource(extension, resource));
            } catch (e) {
                //Do nothing
            }
        }
    }
    return result;
};

export interface MarkdownContribution {
    readonly previewScripts: ReadonlyArray<Uri>;
    readonly previewStyles: ReadonlyArray<Uri>;
    readonly previewResourceRoot: Uri;
    readonly extendMarkdownIt: (md: any) => Promise<any>;
    readonly extensionId: string;
}

export namespace MarkdownContribution {
    export function fromExtension(extension: Extension<any>): MarkdownContribution {
        const contributes = extension.packageJSON && extension.packageJSON.contributes;
        if (!contributes) {
            return null;
        }
        if (!contributes['markdown.previewStyles']
            && !contributes['markdown.previewScripts']
            && !contributes['markdown.markdownItPlugins']) {
                return null;
        }
        const previewStyles = resolveExtensionResources(extension, contributes['markdown.previewStyles']);
        const previewScripts = resolveExtensionResources(extension, contributes['markdown.previewScripts']);
        const previewResourceRoot = Uri.file(extension.extensionPath);
        const extendMarkdownIt = getContributedExtender(contributes, extension);
        const extensionId = extension.id;
        return {
            previewScripts,
            previewStyles,
            previewResourceRoot,
            extendMarkdownIt,
            extensionId
        };
    }

    function getContributedExtender(contributes: any, extension: Extension<any>): (md: any) => Promise<any> {
        if (contributes['markdown.markdownItPlugins']) {
            return async (md: any) => {
                if (!extension.isActive) {
                    await extension.activate();
                }
                if (extension.exports && extension.exports.extendMarkdownIt) {
                    return extension.exports.extendMarkdownIt(md);
                }
                return md;
            };
        }
        return async (md: any) => md;
    }
}

export interface MarkdownContributionProvider {
    readonly contributions: ReadonlyArray<MarkdownContribution>;
    readonly onContributionsChanged: Event<this>;
    dispose(): void;
}

class MdItContributionProvider implements Disposable, MarkdownContributionProvider {
    private _cachedContributions?: ReadonlyArray<MarkdownContribution>;
    private _isDisposed = false;
    protected _disposables: Disposable[] = [];
    private readonly _onContributionsChanged = new EventEmitter<this>();
    public readonly onContributionsChanged = this._onContributionsChanged.event;

    public constructor() {
        this._disposables.push(this._onContributionsChanged);
        extensions.onDidChange(() => {
            //TODO Check if necessary to clear cache
            this._cachedContributions = null;
            this._onContributionsChanged.fire(this);
        }, undefined, this._disposables);
    }

    public dispose(): any {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        while (this._disposables.length) {
            const item = this._disposables.pop();
            if (item) {
                item.dispose();
            }
        }
    }

    public get contributions() {
        if (!this._cachedContributions) {
            this._cachedContributions = extensions.all
                .map(MarkdownContribution.fromExtension)
                .filter(contribution => !!contribution);;
        }
        return this._cachedContributions;
    }
}

export function getMarkdownContributionProvider(): MarkdownContributionProvider {
    return new MdItContributionProvider();
}