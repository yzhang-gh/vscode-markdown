import * as fs from 'fs';
import * as path from "path";
import * as vscode from "vscode";
import sizeOf from 'image-size';
import { getAllTocEntry, IHeading } from "../toc";
import { mathEnvCheck } from "../util/contextCheck";
import { Document_Selector_Markdown } from "../util/generic";
import { Katex_Command_Completion_Items } from "./latex";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(Document_Selector_Markdown, new MdCompletionItemProvider(), '(', '\\', '/', '[', '#'));
}

type CompletionItemProviderResult = Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | undefined>;

class MdCompletionItemProvider implements vscode.CompletionItemProvider {

    mathCompletionItems: vscode.CompletionItem[];

    EXCLUDE_GLOB: string;

    constructor() {
        // Pretend to support multi-workspacefolders
        let resource = null;
        if (vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0) {
            resource = vscode.workspace.workspaceFolders[0].uri;
        }

        // Import macros from configurations
        const configMacros = vscode.workspace.getConfiguration('markdown.extension.katex', resource).get<Record<string, string>>('macros');
        const macroItems: vscode.CompletionItem[] = [];
        for (const [cmd, expansion] of Object.entries(configMacros)) {
            let item = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Function);

            // Find the number of arguments in the expansion
            let numArgs = 0;
            for (let i = 1; i < 10; i++) {
                if (!expansion.includes(`#${i}`)) {
                    numArgs = i - 1;
                    break;
                }
            }

            item.insertText = new vscode.SnippetString(cmd.slice(1) + [...Array(numArgs).keys()].map(i => `\{$${i + 1}\}`).join(""));
            macroItems.push(item);
        }

        this.mathCompletionItems = [...Katex_Command_Completion_Items, ...macroItems];

        // Sort
        this.mathCompletionItems.forEach(item => {
            item.sortText = item.label.replace(/[a-zA-Z]/g, c => {
                if (/[a-z]/.test(c)) {
                    return `0${c}`;
                } else {
                    return `1${c.toLowerCase()}`;
                }
            });
        });

        let excludePatterns = ['**/node_modules', '**/bower_components', '**/*.code-search'];
        if (vscode.workspace.getConfiguration('markdown.extension.completion', resource).get<boolean>('respectVscodeSearchExclude')) {
            const configExclude = vscode.workspace.getConfiguration('search', resource).get<Record<string, boolean>>('exclude');
            for (const [pattern, enabled] of Object.entries(configExclude)) {
                if (enabled) {
                    excludePatterns.push(pattern);
                }
            }
        }

        excludePatterns = Array.from(new Set(excludePatterns));
        this.EXCLUDE_GLOB = '{' + excludePatterns.join(',') + '}';
    }

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character);

        let matches: string[];
        if (/!\[[^\]]*?\]\([^\)]*$/.test(lineTextBefore) || /<img [^>]*src="[^"]*$/.test(lineTextBefore)) {
            let completionItemList = await this.imagePathCompletion(document, position, token, _context);
            return (completionItemList);
        } else if (
            //// ends with an odd number of backslashes
            (matches = lineTextBefore.match(/\\+$/)) !== null
            && matches[0].length % 2 !== 0
        ) {
            let completionItemList = await this.mathCompletion(document, position, token, _context);
            return (completionItemList);
        } else if (/\[[^\[\]]*$/.test(lineTextBefore)) {
            let completionItemList = await this.referenceLinkLabelCompletion(document, position, token, _context);
            return (completionItemList);
        } else if (
            /\[[^\[\]]*?\]\(#[^#\)]*$/.test(lineTextBefore)
            || /^>? {0,3}\[[^\[\]]+?\]\:[ \t\f\v]*#[^#]*$/.test(lineTextBefore)
            // /\[[^\]]*\]\((\S*)#[^\)]*$/.test(lineTextBefore) // `[](url#anchor|` Link with anchor.
            // || /\[[^\]]*\]\:\s?(\S*)#$/.test(lineTextBefore) // `[]: url#anchor|` Link reference definition with anchor.
        ) {
            let completionItemList = await this.anchorFromHeadingCompletion(document, position, token, _context);
            return (completionItemList);
        } else if (/\[[^\[\]]*?\](?:(?:\([^\)]*)|(?:\:[ \t\f\v]*\S*))$/.test(lineTextBefore)) {
            let completionItemList = await this.filePathsCompletion(document, position, token, _context);
            return (completionItemList);
        } else {
            return [];
        }
    }

    async imagePathCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character); //this line is duplicated on purpose for future extraction

        if (vscode.workspace.getWorkspaceFolder(document.uri) === undefined) return [];

        //// 🤔 better name?
        let typedDir: string;
        if (/!\[[^\]]*?\]\([^\)]*$/.test(lineTextBefore)) {
            //// `![](dir_here|)`
            typedDir = lineTextBefore.substr(lineTextBefore.lastIndexOf('](') + 2);
        } else {
            //// `<img src="dir_here|">`
            typedDir = lineTextBefore.substr(lineTextBefore.lastIndexOf('="') + 2);
        }
        const basePath = getBasepath(document, typedDir);
        const isRootedPath = typedDir.startsWith('/');

        if (token.isCancellationRequested) {
            return;
        }

        return vscode.workspace.findFiles('**/*.{png,jpg,jpeg,svg,gif,webp}', this.EXCLUDE_GLOB).then(uris => {
            let items = uris.map(imgUri => {
                const label = path.relative(basePath, imgUri.fsPath).replace(/\\/g, '/');
                let item = new vscode.CompletionItem(label.replace(/ /g, '%20'), vscode.CompletionItemKind.File);

                //// Add image preview
                let dimensions: { width: number; height: number; };
                try {
                    dimensions = sizeOf(imgUri.fsPath);
                } catch (error) {
                    console.error(error);
                    return item;
                }
                const maxWidth = 318;
                if (dimensions.width > maxWidth) {
                    dimensions.height = Number(dimensions.height * maxWidth / dimensions.width);
                    dimensions.width = maxWidth;
                }
                item.documentation = new vscode.MarkdownString(`![${label}](${imgUri.fsPath.replace(/ /g, '%20')}|width=${dimensions.width},height=${dimensions.height})`);

                item.sortText = label.replace(/\./g, '{');

                return item;
            });

            if (isRootedPath) {
                return items.filter(item => !item.label.startsWith('..'));
            } else {
                return items;
            }
        });
    }

    async referenceLinkLabelCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character); //this line is duplicated on purpose for future extraction

        const RXlookbehind = String.raw`(?<=(^[>]? {0,3}\[[ \t\r\n\f\v]*))`; // newline, not quoted, max 3 spaces, open [
        const RXlinklabel = String.raw`(?<linklabel>([^\]]|(\\\]))*)`;       // string for linklabel, allows for /] in linklabel
        const RXlink = String.raw`(?<link>((<[^>]*>)|([^< \t\r\n\f\v]+)))`;  // link either <mylink> or mylink
        const RXlinktitle = String.raw`(?<title>[ \t\r\n\f\v]+(("([^"]|(\\"))*")|('([^']|(\\'))*')))?$)`; // optional linktitle in "" or ''
        const RXlookahead =
            String.raw`(?=(\]:[ \t\r\n\f\v]*` + // close linklabel with ]:
            RXlink + RXlinktitle +
            String.raw`)`; // end regex
        const RXflags = String.raw`mg`; // multiline & global
        // This pattern matches linklabels in link references definitions:  [linklabel]: link "link title"
        const pattern = new RegExp(RXlookbehind + RXlinklabel + RXlookahead, RXflags);

        interface IReferenceDefinition {
            label: string;
            usageCount: number;
        }

        // TODO: may be extracted to a seperate function and used for all completions in the future.
        const docText = document.getText();
        /**
         * NormalizedLabel (upper case) -> IReferenceDefinition
         */
        const refDefinitions = new Map<string, IReferenceDefinition>();

        for (const match of docText.matchAll(pattern)) {
            // Remove leading and trailing whitespace characters.
            const label = match[0].replace(/^[ \t\r\n\f\v]+/, '').replace(/[ \t\r\n\f\v]+$/, '');
            // For case-insensitive comparison.
            const normalizedLabel = label.toUpperCase();

            // The one that comes first in the document is used.
            if (!refDefinitions.has(normalizedLabel)) {
                refDefinitions.set(normalizedLabel, {
                    label, // Preserve original case in result.
                    usageCount: 0,
                });
            }
        }

        if (refDefinitions.size === 0 || token.isCancellationRequested) {
            return;
        }

        // A confusing feature from #414. Not sure how to get it work.
        const docLines = docText.split(/\r?\n/);
        for (const crtLine of docLines) {
            // Match something that may be a reference link.
            const pattern = /\[([^\[\]]+?)\](?![(:\[])/g;
            for (const match of crtLine.matchAll(pattern)) {
                const label = match[1];
                const record = refDefinitions.get(label.toUpperCase());
                if (record) {
                    record.usageCount++;
                }
            }
        }

        let startIndex = lineTextBefore.lastIndexOf('[');
        const range = new vscode.Range(position.with({ character: startIndex + 1 }), position);

        if (token.isCancellationRequested) {
            return;
        }

        const completionItemList = Array.from<IReferenceDefinition, vscode.CompletionItem>(refDefinitions.values(), ref => {
            const label = ref.label;
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
            const usages = ref.usageCount;
            item.documentation = new vscode.MarkdownString(label);
            item.detail = usages === 1 ? `1 usage` : `${usages} usages`;
            // Prefer unused items. <https://github.com/yzhang-gh/vscode-markdown/pull/414#discussion_r272807189>
            item.sortText = usages === 0 ? `0-${label}` : `1-${label}`;
            item.range = range;
            return item;
        });

        return completionItemList;
    }

    async anchorFromHeadingCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character); //this line is duplicated on purpose for future extraction
        const lineTextAfter = document.lineAt(position.line).text.substring(position.character);

        let startIndex = lineTextBefore.lastIndexOf('#') - 1;
        let isLinkRefDefinition = /^>? {0,3}\[[^\[\]]+?\]\:[ \t\f\v]*#[^#]*$/.test(lineTextBefore); // Check if this is a linkref definition
        let endPosition = position;

        let addClosingParen = false;
        if (/^([^\) ]+\s*|^\s*)\)/.test(lineTextAfter)) {
            // try to detect if user wants to replace a link (i.e. matching closing paren and )
            // Either: ... <CURSOR> something <whitespace> )
            //     or: ... <CURSOR> <whitespace> )
            //     or: ... <CURSOR> )     (endPosition assignment is a no-op for this case)

            // in every case, we want to remove all characters after the cursor and before that first closing paren
            endPosition = position.with({ character: + endPosition.character + lineTextAfter.indexOf(')') });
        } else {
            // If no closing paren is found, replace all trailing non-white-space chars and add a closing paren
            // distance to first non-whitespace or EOL
            const toReplace = (lineTextAfter.search(/(?<=^\S+)(\s|$)/));
            endPosition = position.with({ character: + endPosition.character + toReplace });
            if (!isLinkRefDefinition) {
                addClosingParen = true;
            }
        }

        const range = new vscode.Range(position.with({ character: startIndex + 1 }), endPosition);

        if (token.isCancellationRequested) {
            return;
        }

        return new Promise((res, _) => {
            //// let linkedDocument: TextDocument;
            //// let urlString = lineTextBefore.match(/(?<=[\(|\:\s])\S*(?=\#)/)![0];
            //// if (urlString) {
            ////     /* If the anchor is in a seperate file then the link is of the form:
            ////        "[linkLabel](urlString#MyAnchor)" or "[linkLabel]: urlString#MyAnchor"

            ////        If urlString is a ".md" or ".markdown" file and accessible then we should (pseudo code):

            ////            if (isAccessible(urlString)) {
            ////                linkedDocument = open(urlString)
            ////            } else {
            ////                return []
            ////            }

            ////        This has not been implemented yet so instead return with no completion for now. */

            ////     res(undefined); // remove when implementing anchor completion fron external file
            //// } else {
            ////     /* else the anchor is in the current file and the link is of the form
            ////        "[linkLabel](#MyAnchor)"" or "[linkLabel]: #MyAnchor"
            ////        Then we should set linkedDocument = document */
            ////     linkedDocument = document;
            //// }
            const toc: readonly Readonly<IHeading>[] = getAllTocEntry(document, { respectMagicCommentOmit: false, respectProjectLevelOmit: false });

            const headingCompletions = toc.map<vscode.CompletionItem>(heading => {
                const item = new vscode.CompletionItem('#' + heading.slug, vscode.CompletionItemKind.Reference);

                if (addClosingParen) {
                    item.insertText = item.label + ')';
                }

                item.documentation = heading.rawContent;
                item.range = range;
                return item;
            });

            res(headingCompletions);
        });
    }

    async filePathsCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character); //this line is duplicated on purpose for future extraction

        //// Should be after anchor completions
        if (vscode.workspace.getWorkspaceFolder(document.uri) === undefined) return [];

        const typedDir = lineTextBefore.match(/(?<=((?:\]\()|(?:\]\:))[ \t\f\v]*)\S*$/)[0];
        const basePath = getBasepath(document, typedDir);
        const isRootedPath = typedDir.startsWith('/');

        if (token.isCancellationRequested) {
            return;
        }

        return vscode.workspace.findFiles('**/*', this.EXCLUDE_GLOB).then(uris => {
            let items = uris.map(uri => {
                const label = path.relative(basePath, uri.fsPath).replace(/\\/g, '/').replace(/ /g, '%20');
                let item = new vscode.CompletionItem(label, vscode.CompletionItemKind.File);
                item.sortText = label.replace(/\./g, '{');
                return item;
            });

            if (isRootedPath) {
                return items.filter(item => !item.label.startsWith('..'));
            } else {
                return items;
            }
        });
    }

    async mathCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): CompletionItemProviderResult {
        if (mathEnvCheck(document, position) === "") {
            return [];
        } else {
            return this.mathCompletionItems;
        }
    }
}

/**
 * @param doc
 * @param dir The dir already typed in the src field, e.g. `[alt text](dir_here|)`
 */
function getBasepath(doc: vscode.TextDocument, dir: string): string {
    if (dir.includes('/')) {
        dir = dir.substr(0, dir.lastIndexOf('/') + 1);
    } else {
        dir = '';
    }

    let root = vscode.workspace.getWorkspaceFolder(doc.uri).uri.fsPath;
    const rootFolder = vscode.workspace.getConfiguration('markdown.extension.completion', doc.uri).get<string>('root', '');
    if (rootFolder.length > 0 && fs.existsSync(path.join(root, rootFolder))) {
        root = path.join(root, rootFolder);
    }

    const basePath = path.join(
        dir.startsWith('/')
            ? root
            : path.dirname(doc.uri.fsPath),
        dir
    );

    return basePath;
}
