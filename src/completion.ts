'use strict'

import * as fs from 'fs';
import sizeOf from 'image-size';
import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, languages, MarkdownString, Position, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { configManager } from "./configuration/manager";
import { getAllTocEntry, IHeading } from './toc';
import { mathEnvCheck } from "./util/contextCheck";
import { Document_Selector_Markdown } from './util/generic';
import * as katexFuncs from './util/katex-funcs';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider(Document_Selector_Markdown, new MdCompletionItemProvider(), '(', '\\', '/', '[', '#'));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    mathCompletions: CompletionItem[];

    EXCLUDE_GLOB: string;

    constructor() {
        // \cmd
        let c1 = Array.from(new Set(
            [
                ...katexFuncs.delimiters0, ...katexFuncs.delimeterSizing0,
                ...katexFuncs.greekLetters0, ...katexFuncs.otherLetters0,
                ...katexFuncs.spacing0, ...katexFuncs.verticalLayout0,
                ...katexFuncs.logicAndSetTheory0, ...katexFuncs.macros0, ...katexFuncs.bigOperators0,
                ...katexFuncs.binaryOperators0, ...katexFuncs.binomialCoefficients0,
                ...katexFuncs.fractions0, ...katexFuncs.mathOperators0,
                ...katexFuncs.relations0, ...katexFuncs.negatedRelations0,
                ...katexFuncs.arrows0, ...katexFuncs.font0, ...katexFuncs.size0,
                ...katexFuncs.style0, ...katexFuncs.symbolsAndPunctuation0,
                ...katexFuncs.debugging0
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = cmd;
            return item;
        });
        // \cmd{$1}
        let c2 = Array.from(new Set(
            [
                ...katexFuncs.accents1, ...katexFuncs.annotation1,
                ...katexFuncs.verticalLayout1, ...katexFuncs.overlap1, ...katexFuncs.spacing1,
                ...katexFuncs.logicAndSetTheory1, ...katexFuncs.mathOperators1, ...katexFuncs.sqrt1,
                ...katexFuncs.extensibleArrows1, ...katexFuncs.font1,
                ...katexFuncs.braketNotation1, ...katexFuncs.classAssignment1
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}`);
            return item;
        });
        // \cmd{$1}{$2}
        let c3 = Array.from(new Set(
            [
                ...katexFuncs.verticalLayout2, ...katexFuncs.binomialCoefficients2,
                ...katexFuncs.fractions2, ...katexFuncs.color2
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`);
            return item;
        });
        let envSnippet = new CompletionItem('\\begin', CompletionItemKind.Snippet);
        envSnippet.insertText = new SnippetString('begin{${1|' + katexFuncs.envs.join(',') + '|}}\n\t$2\n\\end{$1}');

        // Pretend to support multi-workspacefolders
        const folder = workspace.workspaceFolders?.[0]?.uri;

        // Import macros from configurations
        const configMacros = configManager.get("katex.macros", folder);
        var macroItems: CompletionItem[] = [];
        for (const [cmd, expansion] of Object.entries(configMacros)) {
            let item = new CompletionItem(cmd, CompletionItemKind.Function);

            // Find the number of arguments in the expansion
            let numArgs = 0;
            for (let i = 1; i < 10; i++) {
                if (!expansion.includes(`#${i}`)) {
                    numArgs = i - 1;
                    break;
                }
            }

            item.insertText = new SnippetString(cmd.slice(1) + [...Array(numArgs).keys()].map(i => `\{$${i + 1}\}`).join(""));
            macroItems.push(item);
        }

        this.mathCompletions = [...c1, ...c2, ...c3, envSnippet, ...macroItems];

        // Sort
        for (const item of this.mathCompletions) {
            const label = typeof item.label === "string" ? item.label : item.label.label;
            item.sortText = label.replace(/[a-zA-Z]/g, (c) => {
                if (/[a-z]/.test(c)) {
                    return `0${c}`;
                } else {
                    return `1${c.toLowerCase()}`;
                }
            });
        }

        const Always_Exclude = ["**/node_modules", "**/bower_components", "**/*.code-search"];
        const excludePatterns = new Set(Always_Exclude);

        if (configManager.get("completion.respectVscodeSearchExclude", folder)) {
            const vscodeSearchExclude = configManager.getByAbsolute<object>("search.exclude", folder)!;
            for (const [pattern, enabled] of Object.entries(vscodeSearchExclude)) {
                if (enabled) {
                    excludePatterns.add(pattern);
                }
            }
        }

        this.EXCLUDE_GLOB = "{" + Array.from(excludePatterns).join(",") + "}";
    }

    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[] | CompletionList<CompletionItem> | undefined> {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character);
        const lineTextAfter = document.lineAt(position.line).text.substring(position.character);

        let matches;
        matches = lineTextBefore.match(/\\+$/);
        if (/!\[[^\]]*?\]\([^\)]*$/.test(lineTextBefore) || /<img [^>]*src="[^"]*$/.test(lineTextBefore)) {
            /* ┌─────────────┐
               │ Image paths │
               └─────────────┘ */
            if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

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

            return workspace.findFiles('**/*.{png,jpg,jpeg,svg,gif,webp}', this.EXCLUDE_GLOB).then(uris => {
                const items: CompletionItem[] = [];

                for (const imgUri of uris) {
                    const label = path.relative(basePath, imgUri.fsPath).replace(/\\/g, '/');

                    if (isRootedPath && label.startsWith("..")) {
                        continue;
                    }

                    let item = new CompletionItem(label.replace(/ /g, '%20'), CompletionItemKind.File);
                    items.push(item);

                    //// Add image preview
                    let dimensions: { width: number; height: number; };
                    try {
                        // @ts-ignore Deprecated.
                        dimensions = sizeOf(imgUri.fsPath);
                    } catch (error) {
                        console.error(error);
                        continue;
                    }
                    const maxWidth = 318;
                    if (dimensions.width > maxWidth) {
                        dimensions.height = Number(dimensions.height * maxWidth / dimensions.width);
                        dimensions.width = maxWidth;
                    }
                    item.documentation = new MarkdownString(`![${label}](${imgUri.fsPath.replace(/ /g, '%20')}|width=${dimensions.width},height=${dimensions.height})`);

                    item.sortText = label.replace(/\./g, '{');
                }

                return items;
            });
        } else if (
            //// ends with an odd number of backslashes
            (matches = lineTextBefore.match(/\\+$/)) !== null
            && matches[0].length % 2 !== 0
        ) {
            /* ┌────────────────┐
               │ Math functions │
               └────────────────┘ */
            if (mathEnvCheck(document, position) === "") {
                return [];
            } else {
                return this.mathCompletions;
            }
        } else if (/\[[^\[\]]*$/.test(lineTextBefore)) {
            /* ┌───────────────────────┐
               │ Reference link labels │
               └───────────────────────┘ */
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
            const range = new Range(position.with({ character: startIndex + 1 }), position);

            if (token.isCancellationRequested) {
                return;
            }

            const completionItemList = Array.from<IReferenceDefinition, CompletionItem>(refDefinitions.values(), ref => {
                const label = ref.label;
                const item = new CompletionItem(label, CompletionItemKind.Reference);
                const usages = ref.usageCount;
                item.documentation = new MarkdownString(label);
                item.detail = usages === 1 ? `1 usage` : `${usages} usages`;
                // Prefer unused items. <https://github.com/yzhang-gh/vscode-markdown/pull/414#discussion_r272807189>
                item.sortText = usages === 0 ? `0-${label}` : `1-${label}`;
                item.range = range;
                return item;
            });

            return completionItemList;
        } else if (
            /\[[^\[\]]*?\]\(#[^#\)]*$/.test(lineTextBefore)
            || /^>? {0,3}\[[^\[\]]+?\]\:[ \t\f\v]*#[^#]*$/.test(lineTextBefore)
            // /\[[^\]]*\]\((\S*)#[^\)]*$/.test(lineTextBefore) // `[](url#anchor|` Link with anchor.
            // || /\[[^\]]*\]\:\s?(\S*)#$/.test(lineTextBefore) // `[]: url#anchor|` Link reference definition with anchor.
        ) {
            /* ┌───────────────────────────┐
               │ Anchor tags from headings │
               └───────────────────────────┘ */
            let startIndex = lineTextBefore.lastIndexOf('#') - 1;
            let isLinkRefDefinition = /^>? {0,3}\[[^\[\]]+?\]\:[ \t\f\v]*#[^#]*$/.test(lineTextBefore); // The same as the 2nd conditon above.
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

            const range = new Range(position.with({ character: startIndex + 1 }), endPosition);

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

                const headingCompletions = toc.map<CompletionItem>(heading => {
                    const item = new CompletionItem('#' + heading.slug, CompletionItemKind.Reference);

                    if (addClosingParen) {
                        item.insertText = item.label + ')';
                    }

                    item.documentation = heading.rawContent;
                    item.range = range;
                    return item;
                });

                res(headingCompletions);
            });
        } else if (/\[[^\[\]]*?\](?:(?:\([^\)]*)|(?:\:[ \t\f\v]*\S*))$/.test(lineTextBefore)) {
            /* ┌────────────┐
               │ File paths │
               └────────────┘ */
            //// Should be after anchor completions
            if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

            const typedDir = lineTextBefore.match(/(?<=((?:\]\()|(?:\]\:))[ \t\f\v]*)\S*$/)![0];
            const basePath = getBasepath(document, typedDir);
            const isRootedPath = typedDir.startsWith('/');

            const files = await workspace.findFiles("**/*", this.EXCLUDE_GLOB);

            const items: CompletionItem[] = [];

            for (const uri of files) {
                const label = path.relative(basePath, uri.fsPath).replace(/\\/g, "/").replace(/ /g, "%20");
                if (isRootedPath && label.startsWith("..")) {
                    continue;
                }

                const item = new CompletionItem(label, CompletionItemKind.File);
                item.sortText = label.replace(/\./g, "{");
                items.push(item);
            }

            return items;
        } else {
            return [];
        }
    }
}

/**
 * @param doc
 * @param dir The dir already typed in the src field, e.g. `[alt text](dir_here|)`
 */
function getBasepath(doc: TextDocument, dir: string): string {
    if (dir.includes('/')) {
        dir = dir.substr(0, dir.lastIndexOf('/') + 1);
    } else {
        dir = '';
    }

    let root = workspace.getWorkspaceFolder(doc.uri)!.uri.fsPath;
    const rootFolder = workspace.getConfiguration('markdown.extension.completion', doc.uri).get<string>('root', '');
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
