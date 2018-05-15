'use strict'

import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, Position, ProviderResult, TextDocument, languages, workspace, SnippetString, Range } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider({ scheme: 'file', language: 'markdown' }, new MdCompletionItemProvider(), '(', '\\', '/'));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    accents = ['bar', 'hat', 'widehat', 'tilde', 'widetilde', 'vec', 'overline', 'underline'];
    delimeterSizing = ['left', 'middle', 'right', 'big', 'Big'];
    greekLetters = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'varepsilon', 'varphi'];
    otherLetters = ['ell', 'Re', 'nabla'];
    logicAndSetTheory = ['forall', 'exists', 'in', 'notin', 'subset', 'supset', 'mid', 'land', 'lor', 'neg', 'therefore', 'because', 'mapsto', 'to', 'gets', 'leftrightarrow', 'implies', 'impliedby', 'iff'];
    bigOperators = ['sum', 'prod', 'int'];
    binaryOperators = ['cdot', 'times'];
    fractions = ['frac'];
    mathOperaters = ['sin', 'cos', 'exp', 'tan', 'tanh', 'ln', 'lg', 'log', 'det', 'inf', 'lim', 'max', 'min', 'Pr', 'sup']; // plus \operatorname{...}
    sqrt = ['sqrt'];
    relations = ['coloneq', 'equiv', 'ge', 'gt', 'gg', 'le', 'lt', 'll', 'prec', 'succ', 'sim', 'simeq', 'ne']; // including negated relations
    font = ['rm', 'bf', 'it', 'sf', 'tt', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathbb', 'mathcal', 'mathscr', 'mathfrak'];
    size = ['Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'];
    symbolsAndPunctuation = ['dots', 'cdots', 'ddots', 'ldots', 'vdots', 'checkmark', 'infty']

    mathCompletions: CompletionItem[];

    constructor() {
        // \cmd
        let c1 = [...this.delimeterSizing, ...this.greekLetters, ...this.otherLetters, ...this.logicAndSetTheory, ...this.bigOperators, ...this.binaryOperators, ...this.mathOperaters, ...this.relations, ...this.size, ...this.symbolsAndPunctuation].map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = cmd;
            return item;
        });
        // \cmd{$0}
        let c2 = [...this.accents, ...this.sqrt, ...this.font, 'operatorname'].map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$0\}`);
            return item;
        });
        // \cmd{$1}{$2}
        let c3 = this.fractions.map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`);
            return item;
        });
        let envSnippet = new CompletionItem('\\begin', CompletionItemKind.Snippet);
        envSnippet.insertText = new SnippetString('begin{${1|aligned,array,bmatrix,Bmatrix,cases,gathered,matrix,pmatrix,vmatrix,Vmatrix|}}\n\t$0\n\\end{$1}');
        this.mathCompletions = Array.from(new Set([...c1, ...c2, ...c3, envSnippet]));
    }

    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
        if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

        let textBefore = document.lineAt(position.line).text.substring(0, position.character);

        let matches;
        if (/!\[[^\]]*?\]\([^\)]*$/.test(textBefore)) {
            // Complete image paths
            matches = textBefore.match(/!\[[^\]]*?\]\(([^\)]*?)[\\\/]?[^\\\/]*$/);
            let dir = matches[1].replace(/\\/g, '/');

            return workspace.findFiles((dir.length == 0 ? '' : dir + '/') + '**/*.{png,jpg,jpeg,svg,gif}', '**/node_modules/**').then(uris =>
                uris.map(uri => {
                    let relPath = path.relative(path.join(workspace.getWorkspaceFolder(uri).uri.fsPath, dir), uri.fsPath);
                    relPath.replace(/\\/g, '/');
                    return new CompletionItem(relPath, CompletionItemKind.File);
                })
            );
        } else if (/(^|[^\$])\$(|[^ \$].*)\\\w*$/.test(textBefore)) {
            // Complete math functions (inline math)
            return this.mathCompletions;
        } else if ((matches = document.getText(new Range(new Position(0, 0), position)).match(/\$\$/g)) !== null && matches.length % 2 !== 0) {
            // Complete math functions
            return this.mathCompletions;
        } else {
            return [];
        }
    }
}
