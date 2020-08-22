'use strict'

import * as fs from 'fs';
import * as sizeOf from 'image-size';
import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, languages, MarkdownString, Position, ProviderResult, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { buildToc } from './toc';
import { mathEnvCheck, mdDocSelector, slugify } from './util';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider(mdDocSelector, new MdCompletionItemProvider(), '(', '\\', '/', '[', '#'));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    // Suffixes explained:
    // \cmd         -> 0
    // \cmd{$1}     -> 1
    // \cmd{$1}{$2} -> 2
    // 
    // Use linebreak to mimic the structure of the KaTeX [Support Table](https://katex.org/docs/supported.html)
    accents1 = [
        'tilde', 'mathring',
        'widetilde', 'overgroup',
        'utilde', 'undergroup',
        'acute', 'vec', 'Overrightarrow',
        'bar', 'overleftarrow', 'overrightarrow',
        'breve', 'underleftarrow', 'underrightarrow',
        'check', 'overleftharpoon', 'overrightharpoon',
        'dot', 'overleftrightarrow', 'overbrace',
        'ddot', 'underleftrightarrow', 'underbrace',
        'grave', 'overline', 'overlinesegment',
        'hat', 'underline', 'underlinesegment',
        'widehat', 'widecheck'
    ];
    delimiters0 = [
        'lparen', 'rparen', 'lceil', 'rceil', 'uparrow',
        'lbrack', 'rbrack', 'lfloor', 'rfloor', 'downarrow', 'updownarrow',
        'langle', 'rangle', 'lgroup', 'rgroup', 'Uparrow',
        'vert', 'ulcorner', 'urcorner', 'Downarrow',
        'Vert', 'llcorner', 'lrcorner', 'Updownarrow',
        'lvert', 'rvert', 'lVert', 'rVert', 'backslash',
        'lang', 'rang', 'lt', 'gt'
    ];
    delimeterSizing0 = [
        'left', 'big', 'bigl', 'bigm', 'bigr',
        'middle', 'Big', 'Bigl', 'Bigm', 'Bigr',
        'right', 'bigg', 'biggl', 'biggm', 'biggr',
        'Bigg', 'Biggl', 'Biggm', 'Biggr'
    ];
    greekLetters0 = [
        'Alpha', 'Beta', 'Gamma', 'Delta',
        'Epsilon', 'Zeta', 'Eta', 'Theta',
        'Iota', 'Kappa', 'Lambda', 'Mu',
        'Nu', 'Xi', 'Omicron', 'Pi',
        'Sigma', 'Tau', 'Upsilon', 'Phi',
        'Chi', 'Psi', 'Omega',
        'varGamma', 'varDelta', 'varTheta', 'varLambda',
        'varXi', 'varPi', 'varSigma', 'varUpsilon',
        'varPhi', 'varPsi', 'varOmega',
        'alpha', 'beta', 'gamma', 'delta',
        'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu',
        'nu', 'xi', 'omicron', 'pi',
        'rho', 'sigma', 'tau', 'upsilon',
        'phi', 'chi', 'psi', 'omega',
        'varepsilon', 'varkappa', 'vartheta', 'thetasym',
        'varpi', 'varrho', 'varsigma', 'varphi',
        'digamma'
    ];
    otherLetters0 = [
        'imath', 'nabla', 'Im', 'Reals',
        'jmath', 'partial', 'image', 'wp',
        'aleph', 'Game', 'Bbbk', 'weierp',
        'alef', 'Finv', 'N', 'Z',
        'alefsym', 'cnums', 'natnums',
        'beth', 'Complex', 'R',
        'gimel', 'ell', 'Re',
        'daleth', 'hbar', 'real',
        'eth', 'hslash', 'reals'
    ];
    annotation1 = [
        'cancel', 'overbrace',
        'bcancel', 'underbrace',
        'xcancel', 'not =',
        'sout', 'boxed',
        'tag', 'tag*'
    ];
    verticalLayout0 = ['atop']
    verticalLayout2 = ['stackrel', 'overset', 'underset', 'raisebox'];
    overlap1 = ['mathllap', 'mathrlap', 'mathclap', 'llap', 'rlap', 'clap', 'smash'];
    spacing0 = [
        'thinspace', 'medspace', 'thickspace', 'enspace',
        'quad', 'qquad', 'negthinspace', 'negmedspace',
        'nobreakspace', 'negthickspace'
    ];
    spacing1 = [
        'kern', 'mkern', 'mskip', 'hskip',
        'hspace', 'hspace*', 'phantom', 'hphantom', 'vphantom'
    ];
    logicAndSetTheory0 = [
        'forall', 'complement', 'therefore', 'emptyset',
        'exists', 'subset', 'because', 'empty',
        'exist', 'supset', 'mapsto', 'varnothing',
        'nexists', 'mid', 'to', 'implies',
        'in', 'land', 'gets', 'impliedby',
        'isin', 'lor', 'leftrightarrow', 'iff',
        'notin', 'ni', 'notni', 'neg', 'lnot'
    ];
    bigOperators0 = [
        'sum', 'prod', 'bigotimes', 'bigvee',
        'int', 'coprod', 'bigoplus', 'bigwedge',
        'iint', 'intop', 'bigodot', 'bigcap',
        'iiint', 'smallint', 'biguplus', 'bigcup',
        'oint', 'oiint', 'oiiint', 'bigsqcup'
    ];
    binaryOperators0 = [
        'cdot', 'gtrdot', 'pmod',
        'cdotp', 'intercal', 'pod',
        'centerdot', 'land', 'rhd',
        'circ', 'leftthreetimes', 'rightthreetimes',
        'amalg', 'circledast', 'ldotp', 'rtimes',
        'And', 'circledcirc', 'lor', 'setminus',
        'ast', 'circleddash', 'lessdot', 'smallsetminus',
        'barwedge', 'Cup', 'lhd', 'sqcap',
        'bigcirc', 'cup', 'ltimes', 'sqcup',
        'bmod', 'curlyvee', 'times',
        'boxdot', 'curlywedge', 'mp', 'unlhd',
        'boxminus', 'div', 'odot', 'unrhd',
        'boxplus', 'divideontimes', 'ominus', 'uplus',
        'boxtimes', 'dotplus', 'oplus', 'vee',
        'bullet', 'doublebarwedge', 'otimes', 'veebar',
        'Cap', 'doublecap', 'oslash', 'wedge',
        'cap', 'doublecup', 'pm', 'plusmn', 'wr'
    ];
    fractions0 = ['over', 'above'];
    fractions2 = ['frac', 'dfrac', 'tfrac', 'cfrac', 'genfrac'];
    binomialCoefficients0 = ['choose'];
    binomialCoefficients2 = ['binom', 'dbinom', 'tbinom', 'brace', 'brack'];
    mathOperators0 = [
        'arcsin', 'cotg', 'ln', 'det',
        'arccos', 'coth', 'log', 'gcd',
        'arctan', 'csc', 'sec', 'inf',
        'arctg', 'ctg', 'sin', 'lim',
        'arcctg', 'cth', 'sinh', 'liminf',
        'arg', 'deg', 'sh', 'limsup',
        'ch', 'dim', 'tan', 'max',
        'cos', 'exp', 'tanh', 'min',
        'cosec', 'hom', 'tg', 'Pr',
        'cosh', 'ker', 'th', 'sup',
        'cot', 'lg', 'argmax',
        'argmin', 'limits'
    ];
    mathOperators1 = ['operatorname'];
    sqrt1 = ['sqrt'];
    relations0 = [
        'eqcirc', 'lesseqgtr', 'sqsupset',
        'eqcolon', 'lesseqqgtr', 'sqsupseteq',
        'Eqcolon', 'lessgtr', 'Subset',
        'eqqcolon', 'lesssim', 'subset',
        'approx', 'Eqqcolon', 'll', 'subseteq', 'sube',
        'approxeq', 'eqsim', 'lll', 'subseteqq',
        'asymp', 'eqslantgtr', 'llless', 'succ',
        'backepsilon', 'eqslantless', 'lt', 'succapprox',
        'backsim', 'equiv', 'mid', 'succcurlyeq',
        'backsimeq', 'fallingdotseq', 'models', 'succeq',
        'between', 'frown', 'multimap', 'succsim',
        'bowtie', 'ge', 'owns', 'Supset',
        'bumpeq', 'geq', 'parallel', 'supset',
        'Bumpeq', 'geqq', 'perp', 'supseteq',
        'circeq', 'geqslant', 'pitchfork', 'supseteqq',
        'colonapprox', 'gg', 'prec', 'thickapprox',
        'Colonapprox', 'ggg', 'precapprox', 'thicksim',
        'coloneq', 'gggtr', 'preccurlyeq', 'trianglelefteq',
        'Coloneq', 'gt', 'preceq', 'triangleq',
        'coloneqq', 'gtrapprox', 'precsim', 'trianglerighteq',
        'Coloneqq', 'gtreqless', 'propto', 'varpropto',
        'colonsim', 'gtreqqless', 'risingdotseq', 'vartriangle',
        'Colonsim', 'gtrless', 'shortmid', 'vartriangleleft',
        'cong', 'gtrsim', 'shortparallel', 'vartriangleright',
        'curlyeqprec', 'in', 'sim', 'vcentcolon',
        'curlyeqsucc', 'Join', 'simeq', 'vdash',
        'dashv', 'le', 'smallfrown', 'vDash',
        'dblcolon', 'leq', 'smallsmile', 'Vdash',
        'doteq', 'leqq', 'smile', 'Vvdash',
        'Doteq', 'leqslant', 'sqsubset',
        'doteqdot', 'lessapprox', 'sqsubseteq'
    ];
    negatedRelations0 = [
        'gnapprox', 'ngeqslant', 'nsubseteq', 'precneqq',
        'gneq', 'ngtr', 'nsubseteqq', 'precnsim',
        'gneqq', 'nleq', 'nsucc', 'subsetneq',
        'gnsim', 'nleqq', 'nsucceq', 'subsetneqq',
        'gvertneqq', 'nleqslant', 'nsupseteq', 'succnapprox',
        'lnapprox', 'nless', 'nsupseteqq', 'succneqq',
        'lneq', 'nmid', 'ntriangleleft', 'succnsim',
        'lneqq', 'notin', 'ntrianglelefteq', 'supsetneq',
        'lnsim', 'notni', 'ntriangleright', 'supsetneqq',
        'lvertneqq', 'nparallel', 'ntrianglerighteq', 'varsubsetneq',
        'ncong', 'nprec', 'nvdash', 'varsubsetneqq',
        'ne', 'npreceq', 'nvDash', 'varsupsetneq',
        'neq', 'nshortmid', 'nVDash', 'varsupsetneqq',
        'ngeq', 'nshortparallel', 'nVdash',
        'ngeqq', 'nsim', 'precnapprox'
    ];
    arrows0 = [
        'circlearrowleft', 'leftharpoonup', 'rArr',
        'circlearrowright', 'leftleftarrows', 'rarr',
        'curvearrowleft', 'leftrightarrow', 'restriction',
        'curvearrowright', 'Leftrightarrow', 'rightarrow',
        'Darr', 'leftrightarrows', 'Rightarrow',
        'dArr', 'leftrightharpoons', 'rightarrowtail',
        'darr', 'leftrightsquigarrow', 'rightharpoondown',
        'dashleftarrow', 'Lleftarrow', 'rightharpoonup',
        'dashrightarrow', 'longleftarrow', 'rightleftarrows',
        'downarrow', 'Longleftarrow', 'rightleftharpoons',
        'Downarrow', 'longleftrightarrow', 'rightrightarrows',
        'downdownarrows', 'Longleftrightarrow', 'rightsquigarrow',
        'downharpoonleft', 'longmapsto', 'Rrightarrow',
        'downharpoonright', 'longrightarrow', 'Rsh',
        'gets', 'Longrightarrow', 'searrow',
        'Harr', 'looparrowleft', 'swarrow',
        'hArr', 'looparrowright', 'to',
        'harr', 'Lrarr', 'twoheadleftarrow',
        'hookleftarrow', 'lrArr', 'twoheadrightarrow',
        'hookrightarrow', 'lrarr', 'Uarr',
        'iff', 'Lsh', 'uArr',
        'impliedby', 'mapsto', 'uarr',
        'implies', 'nearrow', 'uparrow',
        'Larr', 'nleftarrow', 'Uparrow',
        'lArr', 'nLeftarrow', 'updownarrow',
        'larr', 'nleftrightarrow', 'Updownarrow',
        'leadsto', 'nLeftrightarrow', 'upharpoonleft',
        'leftarrow', 'nrightarrow', 'upharpoonright',
        'Leftarrow', 'nRightarrow', 'upuparrows',
        'leftarrowtail', 'nwarrow', 'leftharpoondown', 'Rarr'
    ];
    extensibleArrows1 = [
        'xleftarrow', 'xrightarrow',
        'xLeftarrow', 'xRightarrow',
        'xleftrightarrow', 'xLeftrightarrow',
        'xhookleftarrow', 'xhookrightarrow',
        'xtwoheadleftarrow', 'xtwoheadrightarrow',
        'xleftharpoonup', 'xrightharpoonup',
        'xleftharpoondown', 'xrightharpoondown',
        'xleftrightharpoons', 'xrightleftharpoons',
        'xtofrom', 'xmapsto',
        'xlongequal'
    ];
    classAssignment1 = [
        'mathbin', 'mathclose', 'mathinner', 'mathop',
        'mathopen', 'mathord', 'mathpunct', 'mathrel'
    ];
    color2 = ['color', 'textcolor', 'colorbox'];
    font0 = ['rm', 'bf', 'it', 'sf', 'tt'];
    font1 = [
        'mathrm', 'mathbf', 'mathit',
        'mathnormal', 'textbf', 'textit',
        'textrm', 'bold', 'Bbb',
        'textnormal', 'boldsymbol', 'mathbb',
        'text', 'bm', 'frak',
        'mathsf', 'mathtt', 'mathfrak',
        'textsf', 'texttt', 'mathcal', 'mathscr'
    ];
    size0 = [
        'Huge', 'huge', 'LARGE', 'Large', 'large',
        'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'
    ];
    style0 = [
        'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
        'limits', 'nolimits', 'verb'
    ];
    symbolsAndPunctuation0 = [
        'cdots', 'LaTeX',
        'ddots', 'TeX',
        'ldots', 'nabla',
        'vdots', 'infty',
        'dotsb', 'infin',
        'dotsc', 'checkmark',
        'dotsi', 'dag',
        'dotsm', 'dagger',
        'dotso',
        'sdot', 'ddag',
        'mathellipsis', 'ddagger',
        'Box', 'Dagger',
        'lq', 'square', 'angle',
        'blacksquare', 'measuredangle',
        'rq', 'triangle', 'sphericalangle',
        'triangledown', 'top',
        'triangleleft', 'bot',
        'triangleright',
        'colon', 'bigtriangledown',
        'backprime', 'bigtriangleup', 'pounds',
        'prime', 'blacktriangle', 'mathsterling',
        'blacktriangledown',
        'blacktriangleleft', 'yen',
        'blacktriangleright', 'surd',
        'diamond', 'degree',
        'Diamond',
        'lozenge', 'mho',
        'blacklozenge', 'diagdown',
        'star', 'diagup',
        'bigstar', 'flat',
        'clubsuit', 'natural',
        'copyright', 'clubs', 'sharp',
        'circledR', 'diamondsuit', 'heartsuit',
        'diamonds', 'hearts',
        'circledS', 'spadesuit', 'spades',
        'maltese'
    ];

    mathCompletions: CompletionItem[];

    EXCLUDE_GLOB: string;

    constructor() {
        // \cmd
        let c1 = Array.from(new Set(
            [
                ...this.delimiters0, ...this.delimeterSizing0,
                ...this.greekLetters0, ...this.otherLetters0,
                ...this.spacing0, ...this.verticalLayout0,
                ...this.logicAndSetTheory0, ...this.bigOperators0,
                ...this.binaryOperators0, ...this.binomialCoefficients0,
                ...this.fractions0, ...this.mathOperators0,
                ...this.relations0, ...this.negatedRelations0,
                ...this.arrows0, ...this.font0, ...this.size0,
                ...this.style0, ...this.symbolsAndPunctuation0
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = cmd;
            return item;
        });
        // \cmd{$1}
        let c2 = Array.from(new Set(
            [
                ...this.accents1, ...this.annotation1,
                ...this.overlap1, ...this.spacing1,
                ...this.mathOperators1, ...this.sqrt1,
                ...this.extensibleArrows1, ...this.font1,
                ...this.classAssignment1
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}`);
            return item;
        });
        // \cmd{$1}{$2}
        let c3 = Array.from(new Set(
            [
                ...this.verticalLayout2, ...this.binomialCoefficients2,
                ...this.fractions2, ...this.color2
            ]
        )).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`);
            return item;
        });
        let envSnippet = new CompletionItem('\\begin', CompletionItemKind.Snippet);
        envSnippet.insertText = new SnippetString('begin{${1|aligned,alignedat,array,bmatrix,Bmatrix,cases,darray,dcases,gathered,matrix,pmatrix,vmatrix,Vmatrix|}}\n\t$2\n\\end{$1}');

        // Pretend to support multi-workspacefolders
        let resource = null;
        if (workspace.workspaceFolders !== undefined && workspace.workspaceFolders.length > 0) {
            resource = workspace.workspaceFolders[0].uri;
        }

        // Import macros from configurations
        let configMacros = workspace.getConfiguration('markdown.extension.katex', resource).get<object>('macros');
        var macroItems: CompletionItem[] = [];
        for (const cmd of Object.keys(configMacros)) {
            const expansion: string = configMacros[cmd];
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
        this.mathCompletions.forEach(item => {
            item.sortText = item.label.replace(/[a-zA-Z]/g, c => {
                if (/[a-z]/.test(c)) {
                    return `0${c}`;
                } else {
                    return `1${c.toLowerCase()}`;
                }
            });
        });

        let excludePatterns = ['**/node_modules', '**/bower_components', '**/*.code-search'];
        if (workspace.getConfiguration('markdown.extension.completion', resource).get<boolean>('respectVscodeSearchExclude')) {
            const configExclude = workspace.getConfiguration('search', resource).get<object>('exclude');
            for (const key of Object.keys(configExclude)) {
                if (configExclude[key] === true) {
                    excludePatterns.push(key);
                }
            }
        }

        excludePatterns = Array.from(new Set(excludePatterns));
        this.EXCLUDE_GLOB = '{' + excludePatterns.join(',') + '}';
    }

    provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
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

            return workspace.findFiles('**/*.{png,jpg,jpeg,svg,gif}', this.EXCLUDE_GLOB).then(uris => {
                let items = uris.map(imgUri => {
                    const label = path.relative(basePath, imgUri.fsPath).replace(/\\/g, '/');
                    let item = new CompletionItem(label.replace(/ /g, '%20'), CompletionItemKind.File);

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
                    item.documentation = new MarkdownString(`![${label}](${imgUri.fsPath.replace(/ /g, '%20')}|width=${dimensions.width},height=${dimensions.height})`);

                    item.sortText = label.replace(/\./g, '{');

                    return item;
                });

                if (isRootedPath) {
                    return items.filter(item => !item.label.startsWith('..'));
                } else {
                    return items;
                }
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
        } else if (/\[[^\]]*?\]\[[^\]]*$/.test(lineTextBefore)) {
            /* ┌───────────────────────┐
               │ Reference link labels │
               └───────────────────────┘ */
            let startIndex = lineTextBefore.lastIndexOf('[');
            const range = new Range(position.with({ character: startIndex + 1 }), position);
            return new Promise((res, _) => {
                const lines = document.getText().split(/\r?\n/);
                const usageCounts = lines.reduce((useCounts, currentLine) => {
                    let match: RegExpExecArray;
                    const pattern = /\[[^\]]+\]\[([^\]]*?)\]/g;
                    while ((match = pattern.exec(currentLine)) !== null) {
                        let usedRef = match[1];
                        if (!useCounts.has(usedRef)) {
                            useCounts.set(usedRef, 0);
                        }
                        useCounts.set(usedRef, useCounts.get(usedRef) + 1);
                    }
                    return useCounts;
                }, new Map<string, number>());
                let refLabels = lines.reduce((prev, curr) => {
                    let match;
                    if ((match = /^\[([^\]]*?)\]: (\S*)( .*)?/.exec(curr)) !== null) {
                        const ref = match[1];
                        let item = new CompletionItem(ref, CompletionItemKind.Reference);
                        const usages = usageCounts.get(ref) || 0;
                        item.documentation = new MarkdownString(match[2]);
                        item.detail = usages === 1 ? `1 usage` : `${usages} usages`;
                        // Prefer unused items
                        item.sortText = usages === 0 ? `0-${ref}` : item.sortText = `1-${ref}`;
                        item.range = range;
                        prev.push(item);
                    }
                    return prev;
                }, []);

                res(refLabels);
            });
        } else if (/\[[^\]]*\]\(#[^\)]*$/.test(lineTextBefore)) {
            /* ┌───────────────────────────┐
               │ Anchor tags from headings │
               └───────────────────────────┘ */
            let startIndex = lineTextBefore.lastIndexOf('(');
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
                const toReplace = (lineTextAfter.search(/(?<=^\S+)(\s|$)/))
                endPosition = position.with({ character: + endPosition.character + toReplace });

                addClosingParen = true;
            }

            const range = new Range(position.with({ character: startIndex + 1 }), endPosition);

            return new Promise((res, _) => {
                const toc = buildToc(document);

                const headingCompletions = toc.reduce((prev, curr) => {
                    let item = new CompletionItem('#' + slugify(curr.text), CompletionItemKind.Reference);

                    if (addClosingParen) {
                        item.insertText = item.label + ')';
                    }

                    item.documentation = curr.text;
                    item.range = range;
                    prev.push(item);
                    return prev;
                }, []);

                res(headingCompletions);
            });
        } else if (/\[[^\]]*?\]\([^\)]*$/.test(lineTextBefore)) {
            /* ┌────────────┐
               │ File paths │
               └────────────┘ */
            //// Should be after anchor completions
            if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

            const typedDir = lineTextBefore.substr(lineTextBefore.lastIndexOf('](') + 2);
            const basePath = getBasepath(document, typedDir);
            const isRootedPath = typedDir.startsWith('/');

            return workspace.findFiles('**/*', this.EXCLUDE_GLOB).then(uris => {
                let items = uris.map(uri => {
                    const label = path.relative(basePath, uri.fsPath).replace(/\\/g, '/').replace(/ /g, '%20');
                    let item = new CompletionItem(label, CompletionItemKind.File);
                    item.sortText = label.replace(/\./g, '{');
                    return item;
                });

                if (isRootedPath) {
                    return items.filter(item => !item.label.startsWith('..'));
                } else {
                    return items;
                }
            });
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

    let root = workspace.getWorkspaceFolder(doc.uri).uri.fsPath;
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
