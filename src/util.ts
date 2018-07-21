'use strict'

import * as path from 'path';
import { commands, extensions, TextEditor, Uri, version, window, workspace } from 'vscode';
import localize from './localize';

const versionNum = eval(version.replace('.', ' * 10000 + ').replace('.', ' * 100 + ').replace('-insider', ' - 1'));

export const mdDocSelector = [{ language: 'markdown', scheme: 'file' }, { language: 'markdown', scheme: 'untitled' }];

export const officialExtPath = extensions.getExtension("vscode.markdown-language-features").extensionPath;
const tocModule = require(path.join(officialExtPath, 'out', 'tableOfContentsProvider'));
export const TocProvider = tocModule.TableOfContentsProvider;

let fromHeading: (string) => { value: string };
if (versionNum < 12400) {
    // <https://github.com/Microsoft/vscode/blob/b6417424521559acb9a5088111fb0ed70de7ccf2/extensions/markdown-language-features/src/tableOfContentsProvider.ts#L13>
    fromHeading = tocModule.Slug.fromHeading;
} else {
    fromHeading = require(path.join(officialExtPath, 'out', 'slugify')).githubSlugifier.fromHeading;
}

export function isMdEditor(editor: TextEditor) {
    return editor && editor.document && editor.document.languageId === 'markdown';
}

/**
 * For example: [text](link) -> text
 * @param text
 */
export function extractText(text: string) {
    return textInHtml(textInMd(text));
}

// [text](link) -> text. In case there are links in heading (#83)
// 💩
function textInMd(text: string) {
    return text.replace(/\[([^\]]+?)\]\([^\)]+?\)/g, (_, g1) => g1);
}

// Convert HTML entities (#175)
// Strip HTML tags (#179)
// 💩
function textInHtml(text: string) {
    return text.replace(/(&emsp;)/g, _ => ' ')
        .replace(/(<!--[^>]*?-->)/g, '') // remove <!-- HTML comments -->
        .replace(/<span[^>]*>(.*?)<\/span>/g, (_, g1) => g1) // remove <span>
        .replace(/ +/g, ' ');
}

// Converted from `/[^\p{Word}\- ]/u`
// `\p{Word}` => ASCII plus Letter (Ll/Lm/Lo/Lt/Lu), Mark (Mc/Me/Mn), Number (Nd/Nl/No), Connector_Punctuation (Pc)
// Using <https://apps.timwhitlock.info/js/regex>
const PUNCTUATION_REGEXP = /[^0-9A-Z_a-z\- ª²-³µ¹-º¼-¾À-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ\u0300-ʹͶ-ͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁ\u0483-ԣԱ-Ֆՙա-և\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7א-תװ-ײ\u0610-\u061aء-\u065e٠-٩ٮ-ۓە-\u06dc\u06de-\u06e8\u06ea-ۼۿܐ-\u074aݍ-ޱ߀-ߵߺ\u0901-ह\u093c-\u094dॐ-\u0954क़-\u0963०-९ॱ-ॲॻ-ॿ\u0981-\u0983অ-ঌএ-ঐও-নপ-রলশ-হ\u09bc-\u09c4\u09c7-\u09c8\u09cb-ৎ\u09d7ড়-ঢ়য়-\u09e3০-ৱ৴-৹\u0a01-\u0a03ਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹ\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51ਖ਼-ੜਫ਼੦-\u0a75\u0a81-\u0a83અ-ઍએ-ઑઓ-નપ-રલ-ળવ-હ\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acdૐૠ-\u0ae3૦-૯\u0b01-\u0b03ଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହ\u0b3c-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b56-\u0b57ଡ଼-ଢ଼ୟ-\u0b63୦-୯ୱ\u0b82-ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹ\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcdௐ\u0bd7௦-௲\u0c01-\u0c03అ-ఌఎ-ఐఒ-నప-ళవ-హఽ-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56ౘ-ౙౠ-\u0c63౦-౯౸-౾\u0c82-\u0c83ಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6ೞೠ-\u0ce3೦-೯\u0d02-\u0d03അ-ഌഎ-ഐഒ-നപ-ഹഽ-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57ൠ-\u0d63൦-൵ൺ-ൿ\u0d82-\u0d83අ-ඖක-නඳ-රලව-ෆ\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2-\u0df3ก-\u0e3aเ-\u0e4e๐-๙ກ-ຂຄງ-ຈຊຍດ-ທນ-ຟມ-ຣລວສ-ຫອ-\u0eb9\u0ebb-ຽເ-ໄໆ\u0ec8-\u0ecd໐-໙ໜ-ໝༀ\u0f18-\u0f19༠-༳\u0f35\u0f37\u0f39\u0f3e-ཇཉ-ཬ\u0f71-\u0f84\u0f86-ྋ\u0f90-\u0f97\u0f99-\u0fbc\u0fc6က-၉ၐ-႙Ⴀ-Ⴥა-ჺჼᄀ-ᅙᅟ-ᆢᆨ-ᇹሀ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ\u135f፩-፼ᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙶᚁ-ᚚᚠ-ᛪ\u16ee-\u16f0ᜀ-ᜌᜎ-\u1714ᜠ-\u1734ᝀ-\u1753ᝠ-ᝬᝮ-ᝰ\u1772-\u1773ក-ឳ\u17b6-\u17d3ៗៜ-\u17dd០-៩៰-៹\u180b-\u180d᠐-᠙ᠠ-ᡷᢀ-ᢪᤀ-ᤜ\u1920-\u192b\u1930-\u193b᥆-ᥭᥰ-ᥴᦀ-ᦩ\u19b0-\u19c9᧐-᧙ᨀ-\u1a1b\u1b00-ᭋ᭐-᭙\u1b6b-\u1b73\u1b80-\u1baaᮮ-᮹ᰀ-\u1c37᱀-᱉ᱍ-ᱽᴀ-\u1de6\u1dfe-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ‿-⁀⁔⁰-ⁱ⁴-⁹ⁿ-₉ₐ-ₔ\u20d0-\u20f0ℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎ⅓-\u2188①-⒛⓪-⓿❶-➓Ⰰ-Ⱞⰰ-ⱞⱠ-Ɐⱱ-ⱽⲀ-ⳤ⳽ⴀ-ⴥⴰ-ⵥⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ\u2de0-\u2dffⸯ々-\u3007\u3021-\u302f〱-〵\u3038-〼ぁ-ゖ\u3099-\u309aゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎ㆒-㆕ㆠ-ㆷㇰ-ㇿ㈠-㈩㉑-㉟㊀-㊉㊱-㊿㐀-䶵一-鿃ꀀ-ꒌꔀ-ꘌꘐ-ꘫꙀ-ꙟꙢ-\ua672\ua67c-\ua67dꙿ-ꚗꜗ-ꜟꜢ-ꞈꞋ-ꞌꟻ-\ua827ꡀ-ꡳ\ua880-\ua8c4꣐-꣙꤀-\ua92dꤰ-\ua953ꨀ-\uaa36ꩀ-\uaa4d꩐-꩙가-힣豈-鶴侮-頻並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ\ufe00-\ufe0f\ufe20-\ufe26︳-︴﹍-﹏ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚ＿ａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/gu;

export function slugify(heading: string) {
    try {
        if (!workspace.getConfiguration('markdown.extension.toc').get<boolean>('githubCompatibility')) {
            return fromHeading(heading).value;
        }
    } catch (error) {
        window.showWarningMessage(localize("cannotUseBuiltinSlugifyFunc"));
    }
    // GitHub slugify function: <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
    let slug = extractText(heading.trim())
        .replace(/[A-Z]/g, match => match.toLowerCase()) // only downcase ASCII region
        .replace(PUNCTUATION_REGEXP, '')
        .replace(/ /g, '-');
    return slug;
}

export function getNewFeatureMsg(version: string) {
    switch (version) {
        case '1.3.0':
            return localize("1.3.0 msg");
        case '1.4.0':
            return localize("1.4.0 msg");
        case '1.5.0':
            return localize("1.5.0 msg");
    }
    return undefined;
}

export function showChangelog() {
    // let mdExt = extensions.getExtension('vscode.markdown');
    // if (mdExt.isActive) {
    //     previewChangelog();
    // } else {
    //     mdExt.activate().then(previewChangelog);
    // }

    commands.executeCommand('vscode.open', Uri.parse('https://github.com/neilsustc/vscode-markdown/blob/master/CHANGELOG.md'));
}

function previewChangelog() {
    commands.executeCommand('markdown.showPreview', Uri.file(path.join(__dirname, '../../CHANGELOG.md')));
}
