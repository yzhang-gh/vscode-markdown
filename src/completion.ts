'use strict'

import * as sizeOf from 'image-size';
import * as path from 'path';
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, languages, MarkdownString, Position, ProviderResult, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { mdDocSelector } from './util';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerCompletionItemProvider(mdDocSelector, new MdCompletionItemProvider(), '(', '\\', '/', '['));
}

class MdCompletionItemProvider implements CompletionItemProvider {

    // Suffixes explained:
    // \cmd         -> 0
    // \cmd{$1}     -> 1
    // \cmd{$1}{$2} -> 2
    accents1 = ['tilde', 'mathring', 'widetilde', 'overgroup', 'utilde', 'undergroup', 'acute', 'vec', 'Overrightarrow', 'bar', 'overleftarrow', 'overrightarrow', 'breve', 'underleftarrow', 'underrightarrow', 'check', 'overleftharpoon', 'overrightharpoon', 'dot', 'overleftrightarrow', 'overbrace', 'ddot', 'underleftrightarrow', 'underbrace', 'grave', 'overline', 'overlinesegment', 'hat', 'underline', 'underlinesegment', 'widehat', 'widecheck'];
    delimiters0 = ['lparen', 'rparen', 'lceil', 'rceil', 'uparrow', 'lbrack', 'rbrack', 'lfloor', 'rfloor', 'downarrow', 'updownarrow', 'langle', 'rangle', 'lgroup', 'rgroup', 'Uparrow', 'vert', 'vert', 'Downarrow', 'Vert', 'Vert', 'Updownarrow', 'lvert', 'rvert', 'lVert', 'rVert', 'backslash', 'lang', 'rang', 'lt', 'gt'];
    delimeterSizing0 = ['left', 'big', 'bigl', 'bigm', 'bigr', 'middle', 'Big', 'Bigl', 'Bigm', 'Bigr', 'right', 'bigg', 'biggl', 'biggm', 'biggr', 'Bigg', 'Biggl', 'Biggm', 'Biggr'];
    greekLetters0 = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'varGamma', 'varDelta', 'varTheta', 'varLambda', 'varXi', 'varPi', 'varSigma', 'varUpsilon', 'varPhi', 'varPsi', 'varOmega', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'varepsilon', 'varkappa', 'vartheta', 'thetasym', 'varpi', 'varrho', 'varsigma', 'varphi', 'digamma'];
    otherLetters0 = ['imath', 'nabla', 'Im', 'Reals', 'text', 'jmath', 'partial', 'image', 'wp', 'text', 'aleph', 'Game', 'Bbbk', 'weierp', 'text', 'alef', 'Finv', 'N', 'Z', 'text', 'alefsym', 'cnums', 'natnums', 'text', 'text', 'beth', 'Complex', 'R', 'text', 'text', 'gimel', 'ell', 'Re', 'text', 'daleth', 'hbar', 'real', 'text', 'eth', 'hslash', 'reals', 'text'];
    annotation1 = ['cancel', 'overbrace', 'bcancel', 'underbrace', 'xcancel', 'not =', 'sout', 'boxed'];
    overlap1 = ['mathllap', 'mathrlap', 'mathclap', 'llap', 'rlap', 'clap', 'smash'];
    spacing0 = ['\kern', '\thinspace', '\mkern', '\mskip', '\hskip', '\medspace', '\hspace', '\hspace*', '\thickspace', '\phantom', '\enspace', '\hphantom', '\quad', '\vphantom', '\qquad', '\negthinspace', '\negmedspace', '\nobreakspace', '\negthickspace', '\space'];
    verticalLayout0 = ['atop']
    verticalLayout2 = ['stackrel', 'overset', 'underset', 'raisebox'];
    logicAndSetTheory0 = ['forall', 'complement', 'therefore', 'emptyset', 'exists', 'subset', 'because', 'empty', 'exist', 'supset', 'mapsto', 'varnothing', 'nexists', 'mid', 'to', 'implies', 'in', 'land', 'gets', 'impliedby', 'isin', 'lor', 'leftrightarrow', 'iff', 'notin', 'ni', 'notni', 'neg'];
    bigOperators0 = ['sum', 'prod', 'bigotimes', 'bigvee', 'int', 'coprod', 'bigoplus', 'bigwedge', 'iint', 'intop', 'bigodot', 'bigcap', 'iiint', 'smallint', 'biguplus', 'bigcup', 'oint', 'oiint', 'oiiint', 'bigsqcup'];
    binaryOperators0 = ['cdot', 'gtrdot', 'cdotp', 'intercal', 'centerdot', 'land', 'rhd', 'circ', 'leftthreetimes', 'rightthreetimes', 'amalg', 'circledast', 'ldotp', 'rtimes', 'And', 'circledcirc', 'lor', 'setminus', 'ast', 'circleddash', 'lessdot', 'smallsetminus', 'barwedge', 'Cup', 'lhd', 'sqcap', 'bigcirc', 'cup', 'ltimes', 'sqcup', 'bmod', 'curlyvee', 'times', 'boxdot', 'curlywedge', 'mp', 'unlhd', 'boxminus', 'div', 'odot', 'unrhd', 'boxplus', 'divideontimes', 'ominus', 'uplus', 'boxtimes', 'dotplus', 'oplus', 'vee', 'bullet', 'doublebarwedge', 'otimes', 'veebar', 'Cap', 'doublecap', 'oslash', 'wedge', 'cap', 'doublecup', 'pm', 'wr', 'plusmn'];
    binomialCoefficients0 = ['choose'];
    binomialCoefficients2 = ['binom', 'dbinom', 'tbinom', 'brace', 'brack'];
    fractions0 = ['over', 'above'];
    fractions2 = ['frac', 'dfrac', 'tfrac', 'cfrac', 'genfrac'];
    mathOperators0 = ['arcsin', 'cotg', 'ln', 'det', 'arccos', 'coth', 'log', 'gcd', 'arctan', 'csc', 'sec', 'inf', 'arctg', 'ctg', 'sin', 'lim', 'arcctg', 'cth', 'sinh', 'liminf', 'arg', 'deg', 'sh', 'limsup', 'ch', 'dim', 'tan', 'max', 'cos', 'exp', 'tanh', 'min', 'cosec', 'hom', 'tg', 'Pr', 'cosh', 'ker', 'th', 'sup', 'cot', 'lg', 'argmax', 'argmin', 'limits'];
    mathOperators1 = ['operatorname'];
    sqrt1 = ['sqrt'];
    relations0 = ['eqcirc', 'lesseqgtr', 'sqsupset', 'eqcolon', 'lesseqqgtr', 'sqsupseteq', 'Eqcolon', 'lessgtr', 'Subset', 'eqqcolon', 'lesssim', 'subset', 'approx', 'Eqqcolon', 'll', 'subseteq', 'approxeq', 'eqsim', 'lll', 'subseteqq', 'asymp', 'eqslantgtr', 'llless', 'succ', 'backepsilon', 'eqslantless', 'lt', 'succapprox', 'backsim', 'equiv', 'mid', 'succcurlyeq', 'backsimeq', 'fallingdotseq', 'models', 'succeq', 'between', 'frown', 'multimap', 'succsim', 'bowtie', 'ge', 'owns', 'Supset', 'bumpeq', 'geq', 'parallel', 'supset', 'Bumpeq', 'geqq', 'perp', 'supseteq', 'circeq', 'geqslant', 'pitchfork', 'supseteqq', 'colonapprox', 'gg', 'prec', 'thickapprox', 'Colonapprox', 'ggg', 'precapprox', 'thicksim', 'coloneq', 'gggtr', 'preccurlyeq', 'trianglelefteq', 'Coloneq', 'gt', 'preceq', 'triangleq', 'coloneqq', 'gtrapprox', 'precsim', 'trianglerighteq', 'Coloneqq', 'gtreqless', 'propto', 'varpropto', 'colonsim', 'gtreqqless', 'risingdotseq', 'vartriangle', 'Colonsim', 'gtrless', 'shortmid', 'vartriangleleft', 'cong', 'gtrsim', 'shortparallel', 'vartriangleright', 'curlyeqprec', 'in', 'sim', 'vcentcolon', 'curlyeqsucc', 'Join', 'simeq', 'vdash', 'dashv', 'le', 'smallfrown', 'vDash', 'dblcolon', 'leq', 'smallsmile', 'Vdash', 'doteq', 'leqq', 'smile', 'Vvdash', 'Doteq', 'leqslant', 'sqsubset', 'doteqdot', 'lessapprox', 'sqsubseteq'];
    negatedRelations0 = ['gnapprox', 'ngeqslant', 'nsubseteq', 'precneqq', 'gneq', 'ngtr', 'nsubseteqq', 'precnsim', 'gneqq', 'nleq', 'nsucc', 'subsetneq', 'gnsim', 'nleqq', 'nsucceq', 'subsetneqq', 'gvertneqq', 'nleqslant', 'nsupseteq', 'succnapprox', 'lnapprox', 'nless', 'nsupseteqq', 'succneqq', 'lneq', 'nmid', 'ntriangleleft', 'succnsim', 'lneqq', 'notin', 'ntrianglelefteq', 'supsetneq', 'lnsim', 'notni', 'ntriangleright', 'supsetneqq', 'lvertneqq', 'nparallel', 'ntrianglerighteq', 'varsubsetneq', 'ncong', 'nprec', 'nvdash', 'varsubsetneqq', 'ne', 'npreceq', 'nvDash', 'varsupsetneq', 'neq', 'nshortmid', 'nVDash', 'varsupsetneqq', 'ngeq', 'nshortparallel', 'nVdash', 'ngeqq', 'nsim', 'precnapprox'];
    arrows0 = ['circlearrowleft', 'leftharpoonup', 'rArr', 'circlearrowright', 'leftleftarrows', 'rarr', 'curvearrowleft', 'leftrightarrow', 'restriction', 'curvearrowright', 'Leftrightarrow', 'rightarrow', 'Darr', 'leftrightarrows', 'Rightarrow', 'dArr', 'leftrightharpoons', 'rightarrowtail', 'darr', 'leftrightsquigarrow', 'rightharpoondown', 'dashleftarrow', 'Lleftarrow', 'rightharpoonup', 'dashrightarrow', 'longleftarrow', 'rightleftarrows', 'downarrow', 'Longleftarrow', 'rightleftharpoons', 'Downarrow', 'longleftrightarrow', 'rightrightarrows', 'downdownarrows', 'Longleftrightarrow', 'rightsquigarrow', 'downharpoonleft', 'longmapsto', 'Rrightarrow', 'downharpoonright', 'longrightarrow', 'Rsh', 'gets', 'Longrightarrow', 'searrow', 'Harr', 'looparrowleft', 'swarrow', 'hArr', 'looparrowright', 'to', 'harr', 'Lrarr', 'twoheadleftarrow', 'hookleftarrow', 'lrArr', 'twoheadrightarrow', 'hookrightarrow', 'lrarr', 'Uarr', 'iff', 'Lsh', 'uArr', 'impliedby', 'mapsto', 'uarr', 'implies', 'nearrow', 'uparrow', 'Larr', 'nleftarrow', 'Uparrow', 'lArr', 'nLeftarrow', 'updownarrow', 'larr', 'nleftrightarrow', 'Updownarrow', 'leadsto', 'nLeftrightarrow', 'upharpoonleft', 'leftarrow', 'nrightarrow', 'upharpoonright', 'Leftarrow', 'nRightarrow', 'upuparrows', 'leftarrowtail', 'nwarrow', 'leftharpoondown', 'Rarr'];
    extensibleArrows1 = ['xleftarrow', 'xrightarrow[under]', 'xLeftarrow', 'xRightarrow', 'xleftrightarrow', 'xLeftrightarrow', 'xhookleftarrow', 'xhookrightarrow', 'xtwoheadleftarrow', 'xtwoheadrightarrow', 'xleftharpoonup', 'xrightharpoonup', 'xleftharpoondown', 'xrightharpoondown', 'xleftrightharpoons', 'xrightleftharpoons', 'xtofrom', 'xmapsto', 'xlongequal'];
    classAssignment0 = ['mathbin', 'mathclose', 'mathinner', 'mathop', 'mathopen', 'mathord', 'mathpunct', 'mathrel'];
    color2 = ['color', 'textcolor', 'colorbox'];
    font0 = ['rm', 'bf', 'it', 'sf', 'tt'];
    font1 = ['mathrm', 'mathbf', 'mathit', 'mathnormal', 'mathsf', 'mathtt', 'textrm', 'textbf', 'textit', 'textsf', 'texttt', 'textnormal', 'bold', 'Bbb', 'mathcal', 'frak', 'text', 'boldsymbol', 'mathbb', 'mathscr', 'mathfrak', 'bm'];
    size0 = ['Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'];
    style0 = ['displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle', 'limits', 'nolimits', 'verb'];
    style1 = ['text'];
    symbolsAndPunctuation0 = ['cdots', 'LaTeX', '#', 'ddots', 'TeX', '&', 'ldots', 'nabla', '_', 'vdots', 'infty', 'text{\textunderscore}', 'dotsb', 'infin', 'text{--}', 'dotsc', 'checkmark', 'text{\textendash}', 'dotsi', 'dag', 'text{---}', 'dotsm', 'dagger', 'text{\textemdash}', 'dotso', 'text{\textdagger}', 'text{\textasciitilde}', 'sdot', 'ddag', 'text{\textasciicircum}', 'mathellipsis', 'ddagger', 'text{\textellipsis}', 'text{\textdaggerdbl}', 'text{\textquoteleft}', 'Box', 'Dagger', 'lq', 'square', 'angle', 'text{\textquoteright}', 'blacksquare', 'measuredangle', 'rq', 'triangle', 'sphericalangle', 'text{\textquotedblleft}', 'triangledown', 'top', 'triangleleft', 'bot', 'text{\textquotedblright}', 'triangleright', '$', 'colon', 'bigtriangledown', 'text{\textdollar}', 'backprime', 'bigtriangleup', 'pounds', 'prime', 'blacktriangle', 'mathsterling', 'text{\textless}', 'blacktriangledown', 'text{\textsterling}', 'text{\textgreater}', 'blacktriangleleft', 'yen', 'text{\textbar}', 'blacktriangleright', 'surd', 'text{\textbardbl}', 'diamond', 'degree', 'text{\textbraceleft}', 'Diamond', 'text{\textdegree}', 'text{\textbraceright}', 'lozenge', 'mho', 'text{\textbackslash}', 'blacklozenge', 'diagdown', 'text{\P}', 'star', 'diagup', 'text{\S}', 'bigstar', 'flat', 'text{\sect}', 'clubsuit', 'natural', 'copyright', 'clubs', 'sharp', 'circledR', 'diamondsuit', 'heartsuit', 'text{\textregistered}', 'diamonds', 'hearts', 'circledS', 'spadesuit', 'spades', 'text{\textcircled a}', 'maltese'];

    mathCompletions: CompletionItem[];

    constructor() {
        // \cmd
        let c1 = Array.from(new Set([...this.delimiters0, ...this.delimeterSizing0, ...this.greekLetters0, ...this.otherLetters0, ...this.spacing0, ...this.verticalLayout0, ...this.logicAndSetTheory0, ...this.bigOperators0, ...this.binaryOperators0, ...this.binomialCoefficients0, ...this.fractions0, ...this.mathOperators0, ...this.relations0, ...this.negatedRelations0, ...this.arrows0, ...this.classAssignment0, ...this.font0, ...this.size0, ...this.style0, ...this.symbolsAndPunctuation0])).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = cmd;
            return item;
        });
        // \cmd{$1}
        let c2 = Array.from(new Set([...this.accents1, ...this.annotation1, ...this.overlap1, ...this.mathOperators1, ...this.sqrt1, ...this.extensibleArrows1, ...this.font1, ...this.style1])).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}`);
            return item;
        });
        // \cmd{$1}{$2}
        let c3 = Array.from(new Set([...this.verticalLayout2, ...this.binomialCoefficients2, ...this.fractions2, ...this.color2])).map(cmd => {
            let item = new CompletionItem('\\' + cmd, CompletionItemKind.Function);
            item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`);
            return item;
        });
        let envSnippet = new CompletionItem('\\begin', CompletionItemKind.Snippet);
        envSnippet.insertText = new SnippetString('begin{${1|matrix,aligned,array,pmatrix,bmatrix,alignedat,vmatrix,Vmatrix,gathered,Bmatrix,cases|}}\n\t$2\n\\end{$1}');

        this.mathCompletions = [...c1, ...c2, ...c3, envSnippet];
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
    }

    provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
        const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character);
        const lineTextAfter = document.lineAt(position.line).text.substring(position.character);

        let matches;
        matches = lineTextBefore.match(/\\+$/);
        if (/!\[[^\]]*?\]\([^\)]*$/.test(lineTextBefore)) {
            /* ┌─────────────┐
               │ Image paths │
               └─────────────┘ */
            if (workspace.getWorkspaceFolder(document.uri) === undefined) return [];

            matches = lineTextBefore.match(/!\[[^\]]*?\]\(([^\)]*?)[\\\/]?[^\\\/\)]*$/);
            let dir = matches[1].replace(/\\/g, '/');

            return workspace.findFiles((dir.length == 0 ? '' : dir + '/') + '**/*.{png,jpg,jpeg,svg,gif}', '**/node_modules/**').then(uris =>
                uris.map(imgUri => {
                    let relPath = path.relative(path.join(path.dirname(document.uri.fsPath), dir), imgUri.fsPath);
                    relPath = relPath.replace(/\\/g, '/');
                    let item = new CompletionItem(relPath.replace(/ /g, '&#32;'), CompletionItemKind.File);

                    // Add image preview
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
                    item.documentation = new MarkdownString(`![${relPath}](${imgUri.fsPath.replace(/ /g, '&#32;')}|width=${dimensions.width},height=${dimensions.height})`);

                    return item;
                })
            );
        } else if (
            (matches = lineTextBefore.match(/\\+$/)) !== null
            && matches[0].length % 2 !== 0
        ) {
            /* ┌────────────────┐
               │ Math functions │
               └────────────────┘ */
            if (
                /(^|[^\$])\$(|[^ \$].*)\\\w*$/.test(lineTextBefore)
                && lineTextAfter.includes('$')
            ) {
                // Complete math functions (inline math)
                return this.mathCompletions;
            } else {
                const textBefore = document.getText(new Range(new Position(0, 0), position));
                const textAfter = document.getText().substr(document.offsetAt(position));
                if (
                    (matches = textBefore.match(/\$\$/g)) !== null
                    && matches.length % 2 !== 0
                    && textAfter.includes('\$\$')
                ) {
                    // Complete math functions ($$ ... $$)
                    return this.mathCompletions;
                } else {
                    return [];
                }
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
                        item.detail = usages === 1 ? `1 usage`  : `${usages} usages`;
                        // Prefer unused items
                        item.sortText = usages === 0 ? `0-${ref}` : item.sortText = `1-${ref}`;
                        
                        item.range = range;
                        prev.push(item);
                    }
                    return prev;
                }, []);

                res(refLabels);
            });
        } else {
            return [];
        }
    }
}
