import * as vscode from "vscode";

// The commands are sorted into logical groups
// in the same way as KaTeX [Supported Functions](https://katex.org/docs/supported.html).
// The variable name is group name.
// The last number indicates the number of parameters that the command takes.
// TODO:
// Needs clean up. Needs reorganization.

const Accent_1: readonly string[] = [
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
const Delimiter_0: readonly string[] = [
    'lparen', 'rparen', 'lceil', 'rceil', 'uparrow',
    'lbrack', 'rbrack', 'lfloor', 'rfloor', 'downarrow',
    'lbrace', 'rbrace', 'lmoustache', 'rmoustache', 'updownarrow',
    'langle', 'rangle', 'lgroup', 'rgroup', 'Uparrow',
    'vert', 'ulcorner', 'urcorner', 'Downarrow',
    'Vert', 'llcorner', 'lrcorner', 'Updownarrow',
    'lvert', 'rvert', 'lVert', 'rVert', 'backslash',
    'lang', 'rang', 'lt', 'gt', 'llbracket', 'rrbracket', 'lBrace', 'rBrace'
];
const Delimiter_Sizing_0: readonly string[] = [
    'left', 'big', 'bigl', 'bigm', 'bigr',
    'middle', 'Big', 'Bigl', 'Bigm', 'Bigr',
    'right', 'bigg', 'biggl', 'biggm', 'biggr',
    'Bigg', 'Biggl', 'Biggm', 'Biggr'
];
const Greek_Letter_0: readonly string[] = [
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
const Other_Letter_0: readonly string[] = [
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
const Annotation_1: readonly string[] = [
    'cancel', 'overbrace',
    'bcancel', 'underbrace',
    'xcancel', 'not =',
    'sout', 'boxed',
    'tag', 'tag*'
];
const Vertical_Layout_0: readonly string[] = ['atop'];
const Vertical_Layout_1: readonly string[] = ['substack'];
const Vertical_Layout_2: readonly string[] = ['stackrel', 'overset', 'underset', 'raisebox'];
const Overlap_1: readonly string[] = ['mathllap', 'mathrlap', 'mathclap', 'llap', 'rlap', 'clap', 'smash'];
const Spacing_0: readonly string[] = [
    'thinspace', 'medspace', 'thickspace', 'enspace',
    'quad', 'qquad', 'negthinspace', 'negmedspace',
    'nobreakspace', 'negthickspace'
];
const Spacing_1: readonly string[] = [
    'kern', 'mkern', 'mskip', 'hskip',
    'hspace', 'hspace*', 'phantom', 'hphantom', 'vphantom'
];
const Logic_And_Set_Theory_0: readonly string[] = [
    'forall', 'complement', 'therefore', 'emptyset',
    'exists', 'subset', 'because', 'empty',
    'exist', 'supset', 'mapsto', 'varnothing',
    'nexists', 'mid', 'to', 'implies',
    'in', 'land', 'gets', 'impliedby',
    'isin', 'lor', 'leftrightarrow', 'iff',
    'notin', 'ni', 'notni', 'neg', 'lnot'
];
const Macro_0: readonly string[] = [
    'def', 'gdef', 'edef', 'xdef', 'let', 'futurelet', 'global',
    'newcommand', 'renewcommand', 'providecommand',
    'long', 'char', 'mathchoice', 'TextOrMath',
    '@ifstar', '@ifnextchar', '@firstoftwo', '@secondoftwo',
    'relax', 'expandafter', 'noexpand'
];
const Big_Operator_0: readonly string[] = [
    'sum', 'prod', 'bigotimes', 'bigvee',
    'int', 'coprod', 'bigoplus', 'bigwedge',
    'iint', 'intop', 'bigodot', 'bigcap',
    'iiint', 'smallint', 'biguplus', 'bigcup',
    'oint', 'oiint', 'oiiint', 'bigsqcup'
];
const Binary_Operator_0: readonly string[] = [
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
const Fraction_0: readonly string[] = ['over', 'above'];
const Fraction_2: readonly string[] = ['frac', 'dfrac', 'tfrac', 'cfrac', 'genfrac'];
const Binomial_Coefficient_0: readonly string[] = ['choose'];
const Binomial_Coefficient_2: readonly string[] = ['binom', 'dbinom', 'tbinom', 'brace', 'brack'];
const Math_Operator_0: readonly string[] = [
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
const Math_Operator_1: readonly string[] = ['operatorname'];
const Sqrt_1: readonly string[] = ['sqrt'];
const Relation_0: readonly string[] = [
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
const Negated_Relation_0: readonly string[] = [
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
const Arrow_0: readonly string[] = [
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
const Extensible_Arrow_1: readonly string[] = [
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
const Braket_Notation_1: readonly string[] = ['bra', 'Bra', 'ket', 'Ket', 'braket'];
const Class_Assignment_1: readonly string[] = [
    'mathbin', 'mathclose', 'mathinner', 'mathop',
    'mathopen', 'mathord', 'mathpunct', 'mathrel'
];
const Color_2: readonly string[] = ['color', 'textcolor', 'colorbox'];
const Font_0: readonly string[] = ['rm', 'bf', 'it', 'sf', 'tt'];
const Font_1: readonly string[] = [
    'mathrm', 'mathbf', 'mathit',
    'mathnormal', 'textbf', 'textit',
    'textrm', 'bold', 'Bbb',
    'textnormal', 'boldsymbol', 'mathbb',
    'text', 'bm', 'frak',
    'mathsf', 'mathtt', 'mathfrak',
    'textsf', 'texttt', 'mathcal', 'mathscr'
];
const Size_0: readonly string[] = [
    'Huge', 'huge', 'LARGE', 'Large', 'large',
    'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'
];
const Style_0: readonly string[] = [
    'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
    'limits', 'nolimits', 'verb'
];
const Symbol_And_Punctuation_0: readonly string[] = [
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
const Debugging_0: readonly string[] = ['message', 'errmessage', 'show'];

const Snippet_Environment = new vscode.CompletionItem('\\begin', vscode.CompletionItemKind.Snippet);
Snippet_Environment.insertText = new vscode.SnippetString('begin{${1|aligned,alignedat,array,bmatrix,Bmatrix,cases,darray,dcases,gathered,matrix,pmatrix,rcases,smallmatrix,vmatrix,Vmatrix|}}\n\t$2\n\\end{$1}');

/**
 * Completion items of LaTeX commands supported by KaTeX.
 */
export const Katex_Command_Completion_Items: readonly vscode.CompletionItem[] = (() => {
    // \cmd
    const c0 = Array.from<string, vscode.CompletionItem>(new Set([
        ...Delimiter_0, ...Delimiter_Sizing_0,
        ...Greek_Letter_0, ...Other_Letter_0,
        ...Spacing_0, ...Vertical_Layout_0,
        ...Logic_And_Set_Theory_0, ...Macro_0, ...Big_Operator_0,
        ...Binary_Operator_0, ...Binomial_Coefficient_0,
        ...Fraction_0, ...Math_Operator_0,
        ...Relation_0, ...Negated_Relation_0,
        ...Arrow_0, ...Font_0, ...Size_0,
        ...Style_0, ...Symbol_And_Punctuation_0,
        ...Debugging_0
    ]), cmd => {
        const item = new vscode.CompletionItem('\\' + cmd, vscode.CompletionItemKind.Function);
        item.insertText = cmd;
        return item;
    });
    // \cmd{$1}
    const c1 = Array.from<string, vscode.CompletionItem>(new Set([
        ...Accent_1, ...Annotation_1,
        ...Vertical_Layout_1, ...Overlap_1, ...Spacing_1,
        ...Math_Operator_1, ...Sqrt_1,
        ...Extensible_Arrow_1, ...Font_1,
        ...Braket_Notation_1, ...Class_Assignment_1
    ]), cmd => {
        const item = new vscode.CompletionItem('\\' + cmd, vscode.CompletionItemKind.Function);
        item.insertText = new vscode.SnippetString(cmd + "{$1}");
        return item;
    });
    // \cmd{$1}{$2}
    const c2 = Array.from<string, vscode.CompletionItem>(new Set([
        ...Vertical_Layout_2, ...Binomial_Coefficient_2,
        ...Fraction_2, ...Color_2
    ]), cmd => {
        const item = new vscode.CompletionItem('\\' + cmd, vscode.CompletionItemKind.Function);
        item.insertText = new vscode.SnippetString(cmd + "{$1}{$2}");
        return item;
    });

    return [...c0, ...c1, ...c2, Snippet_Environment];
})();
