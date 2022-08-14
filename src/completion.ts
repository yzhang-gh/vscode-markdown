'use strict'

import * as fs from 'fs';
import sizeOf from 'image-size';
import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, languages, MarkdownString, Position, ProviderResult, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { configManager } from "./configuration/manager";
import { getAllTocEntry, IHeading } from './toc';
import { mathEnvCheck } from "./util/contextCheck";
import { Document_Selector_Markdown } from './util/generic';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider(Document_Selector_Markdown, new MdCompletionItemProvider(), '(', '\\', '/', '[', '#'));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    //
    // Suffixes explained:
    // \cmd         -> 0
    // \cmd{$1}     -> 1
    // \cmd{$1}{$2} -> 2
    //
    // Use linebreak to mimic the structure of the KaTeX [Support Table](https://katex.org/docs/supported.html)
    // source https://github.com/KaTeX/KaTeX/blob/main/docs/supported.md
    //
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
        'widehat', 'widecheck', 'underbar'
    ];
    delimiters0 = [
        'lparen', 'rparen', 'lceil', 'rceil', 'uparrow',
        'lbrack', 'rbrack', 'lfloor', 'rfloor', 'downarrow',
        'lbrace', 'rbrace', 'lmoustache', 'rmoustache', 'updownarrow',
        'langle', 'rangle', 'lgroup', 'rgroup', 'Uparrow',
        'vert', 'ulcorner', 'urcorner', 'Downarrow',
        'Vert', 'llcorner', 'lrcorner', 'Updownarrow',
        'lvert', 'rvert', 'lVert', 'rVert', 'backslash',
        'lang', 'rang', 'lt', 'gt', 'llbracket', 'rrbracket', 'lBrace', 'rBrace'
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
        'Rho', 'Sigma', 'Tau', 'Upsilon',
        'Phi', 'Chi', 'Psi', 'Omega',
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
        'phase',
        'tag', 'tag*'
    ];
    verticalLayout0 = ['atop']
    verticalLayout1 = ['substack']
    verticalLayout2 = ['stackrel', 'overset', 'underset', 'raisebox'];
    overlap1 = ['mathllap', 'mathrlap', 'mathclap', 'llap', 'rlap', 'clap', 'smash'];
    spacing0 = [
        'thinspace', 'medspace', 'thickspace', 'enspace',
        'quad', 'qquad', 'negthinspace', 'negmedspace',
        'nobreakspace', 'negthickspace', 'space', 'mathstrut'
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
    macros0 = [
        'def', 'gdef', 'edef', 'xdef', 'let', 'futurelet', 'global',
        'newcommand', 'renewcommand', 'providecommand',
        'long', 'char', 'mathchoice', 'TextOrMath',
        '@ifstar', '@ifnextchar', '@firstoftwo', '@secondoftwo',
        'relax', 'expandafter', 'noexpand'
    ]
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
        'arcsin', 'cosec', 'deg', 'sec',
        'arccos', 'cosh', 'dim', 'sin',
        'arctan', 'cot', 'exp', 'sinh',
        'arctg', 'cotg', 'hom', 'sh',
        'arcctg', 'coth', 'ker', 'tan',
        'arg', 'csc', 'lg', 'tanh',
        'ch', 'ctg', 'ln', 'tg',
        'cos', 'cth', 'log', 'th',
        'argmax', 'injlim', 'min', 'varinjlim',
        'argmin', 'lim', 'plim', 'varliminf',
        'det', 'liminf', 'Pr', 'varlimsup',
        'gcd', 'limsup', 'projlim', 'varprojlim',
        'inf', 'max', 'sup'
    ];
    mathOperators1 = ['operatorname', 'operatorname*', 'operatornamewithlimits'];
    sqrt1 = ['sqrt'];
    relations0 = [
        'doteqdot', 'lessapprox', 'smile',
        'eqcirc', 'lesseqgtr', 'sqsubset',
        'eqcolon', 'minuscolon', 'lesseqqgtr', 'sqsubseteq',
        'Eqcolon', 'minuscoloncolon', 'lessgtr', 'sqsupset',
        'approx', 'eqqcolon', 'equalscolon', 'lesssim', 'sqsupseteq',
        'approxcolon', 'Eqqcolon', 'equalscoloncolon', 'll', 'Subset',
        'approxcoloncolon', 'eqsim', 'lll', 'subset', 'sub',
        'approxeq', 'eqslantgtr', 'llless', 'subseteq', 'sube',
        'asymp', 'eqslantless', 'lt', 'subseteqq',
        'backepsilon', 'equiv', 'mid', 'succ',
        'backsim', 'fallingdotseq', 'models', 'succapprox',
        'backsimeq', 'frown', 'multimap', 'succcurlyeq',
        'between', 'ge', 'origof', 'succeq',
        'bowtie', 'geq', 'owns', 'succsim',
        'bumpeq', 'geqq', 'parallel', 'Supset',
        'Bumpeq', 'geqslant', 'perp', 'supset',
        'circeq', 'gg', 'pitchfork', 'supseteq', 'supe',
        'colonapprox', 'ggg', 'prec', 'supseteqq',
        'Colonapprox', 'coloncolonapprox', 'gggtr', 'precapprox', 'thickapprox',
        'coloneq', 'colonminus', 'gt', 'preccurlyeq', 'thicksim',
        'Coloneq', 'coloncolonminus', 'gtrapprox', 'preceq', 'trianglelefteq',
        'coloneqq', 'colonequals', 'gtreqless', 'precsim', 'triangleq',
        'Coloneqq', 'coloncolonequals', 'gtreqqless', 'propto', 'trianglerighteq',
        'colonsim', 'gtrless', 'risingdotseq', 'varpropto',
        'Colonsim', 'coloncolonsim', 'gtrsim', 'shortmid', 'vartriangle',
        'cong', 'imageof', 'shortparallel', 'vartriangleleft',
        'curlyeqprec', 'in', 'isin', 'sim', 'vartriangleright',
        'curlyeqsucc', 'Join', 'simcolon', 'vcentcolon', 'ratio',
        'dashv', 'le', 'simcoloncolon', 'vdash',
        'dblcolon', 'coloncolon', 'leq', 'simeq', 'vDash',
        'doteq', 'leqq', 'smallfrown', 'Vdash',
        'Doteq', 'leqslant', 'smallsmile', 'Vvdash',
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
    braketNotation1 = ['bra', 'Bra', 'ket', 'Ket', 'braket']
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
        'textsf', 'texttt', 'mathcal', 'mathscr',
        'pmb'
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
        'maltese', 'minuso'
    ];
    debugging0 = ['message', 'errmessage', 'show']
    envs = [
        'matrix', 'array',
        'pmatrix', 'bmatrix',
        'vmatrix', 'Vmatrix',
        'Bmatrix',
        'cases', 'rcases',
        'smallmatrix', 'subarray',
        'equation', 'split', 'align',
        'gather', 'alignat',
        'CD',
        'darray', 'dcases', 'drcases',
        'matrix*', 'pmatrix*', 'bmatrix*',
        'Bmatrix*', 'vmatrix*', 'Vmatrix*',
        'equation*', 'gather*', 'align*', 'alignat*',
        'gathered', 'aligned', 'alignedat'
    ]

    mathCompletions: CompletionItem[];

    EXCLUDE_GLOB: string;

    constructor() {
        // \cmd
        let c1 = Array.from(new Set(
            [
                ...this.delimiters0, ...this.delimeterSizing0,
                ...this.greekLetters0, ...this.otherLetters0,
                ...this.spacing0, ...this.verticalLayout0,
                ...this.logicAndSetTheory0, ...this.macros0, ...this.bigOperators0,
                ...this.binaryOperators0, ...this.binomialCoefficients0,
                ...this.fractions0, ...this.mathOperators0,
                ...this.relations0, ...this.negatedRelations0,
                ...this.arrows0, ...this.font0, ...this.size0,
                ...this.style0, ...this.symbolsAndPunctuation0,
                ...this.debugging0
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
                ...this.verticalLayout1, ...this.overlap1, ...this.spacing1,
                ...this.mathOperators1, ...this.sqrt1,
                ...this.extensibleArrows1, ...this.font1,
                ...this.braketNotation1, ...this.classAssignment1
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
        envSnippet.insertText = new SnippetString('begin{${1|' + this.envs.join(',') + '|}}\n\t$2\n\\end{$1}');

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
