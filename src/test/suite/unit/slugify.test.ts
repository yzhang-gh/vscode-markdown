import * as assert from 'assert';
import SlugifyMode from "../../../contract/SlugifyMode";
import { importZolaSlug, slugify } from "../../../util/slugify";

type ICase = readonly [string, string];

/**
 * `mode -> [rawContent, slug]`
 */
const cases: Readonly<Record<SlugifyMode, readonly ICase[]>> = {
    [SlugifyMode.AzureDevOps]: [
        ["A !\"#$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~", "a-!%22%23%24%25%26'()*%2B%2C-.%2F%3A%3B%3C%3D%3E%3F%40%5B%5C%5C%5D%5E_%60%7B%7C%7D~"],
        ["W\u{0020}\u{00A0}\u{2003}\u{202F}\u{205F}\u{3000}\u{1680}S", "w-------s"],
        ["1\u{0020}\u{007F}\u{0080}\u{07FF}\u{0800}\u{FFFF}\u{10000}\u{10FFFF}2", "%31%2D%7F%C2%80%DF%BF%E0%A0%80%EF%BF%BF%F0%90%80%80%F4%8F%BF%BF%32"], // Test UTF-8 encoding.
        ["1. Hi, there!!!", "%31%2E%2D%68%69%2C%2D%74%68%65%72%65%21%21%21"],
        ["Hi, there!!! without and index number", "hi%2C-there!!!-without-and-index-number"],
        ["Design & Process", "design-%26-process"],
        ["These symbols -\_.!~\*'(), should remain", "these-symbols--_.!~*'()%2C-should-remain"],
        ["1. These symbols -\_.!~\*'(), should be fully encoded because of the number in front", "%31%2E%2D%74%68%65%73%65%2D%73%79%6D%62%6F%6C%73%2D%2D%5F%2E%21%7E%2A%27%28%29%2C%2D%73%68%6F%75%6C%64%2D%62%65%2D%66%75%6C%6C%79%2D%65%6E%63%6F%64%65%64%2D%62%65%63%61%75%73%65%2D%6F%66%2D%74%68%65%2D%6E%75%6D%62%65%72%2D%69%6E%2D%66%72%6F%6E%74"],
    ],

    [SlugifyMode.BitbucketCloud]: [],

    [SlugifyMode.GitHub]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["foo_foo_bar", "foo_foo_bar"],
        ["`a.b` c", "ab-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
        ["1) not a list", "1-not-a-list"],
        ["foo & < >  \"foo\"", "foo---foo"],
        ["$\\LaTeX equations$", "latex-equations"],
        ["Секция 1.1", "секция-11"], // Cyrillic.
        ["Section 中文", "section-中文"], // CJK.
    ],

    [SlugifyMode.GitLab]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["foo_foo_bar", "foo_foo_bar"],
        ["`a.b` c", "ab-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
        ["1) not a list", "1-not-a-list"],
        ["A  +  B", "a-b"], // One dash. (#469)
        ["foo & < >  \"foo\"", "foo-foo"],
        ["1", "anchor-1"], // GitLab adds "anchor-" before digit-only IDs
        ["Секция 1.1", "секция-11"], // Cyrillic. (#469)
    ],

    [SlugifyMode.Gitea]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["foo_foo_bar", "foo-foo-bar"],
        ["`a.b` c", "a-b-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
        ["1) not a list", "1-not-a-list"],
        ["foo & < >  \"foo\"", "foo-foo"],
        ["$\\LaTeX equations$", "latex-equations"],
        [":checkered_flag: with emoji shortname", "checkered-flag-with-emoji-shortname"],
        ["Секция 1.1", "секция-1-1"], // Cyrillic.
    ],

    [SlugifyMode.VisualStudioCode]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["`a.b` c", "ab-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
    ],

    [SlugifyMode.Zola]: [
        [
            "this is some example [text](https://www.url.com) haha [fun](http://another.example)",
            "this-is-some-example-text-haha-fun",
        ],
        [
            "Check out this [link](http://example.com) and this [another one](https://another.com)!",
            "check-out-this-link-and-this-another-one",
        ],
        ["No links here!", "no-links-here"],
        [
            "[Edge cases](https://edge.com) lead to [interesting](http://test.com?query=example) results. 大時代",
            "edge-cases-lead-to-interesting-results-da-shi-dai",
        ],
        ["にでも長所と短所がある", "nidemochang-suo-toduan-suo-gaaru"],
        [
            "命来犯天写最大巡祭視死乃読",
            "ming-lai-fan-tian-xie-zui-da-xun-ji-shi-si-nai-du",
        ],
        [
            "국무위원은 국무총리의 제청으로 대통령이 임명한다",
            "gugmuwiweoneun-gugmucongriyi-jeceongeuro-daetongryeongi-immyeonghanda",
        ],
    ],
};

const modeName: Readonly<Record<SlugifyMode, string>> = {
    [SlugifyMode.AzureDevOps]: "Azure DevOps",
    [SlugifyMode.BitbucketCloud]: "Bitbucket Cloud",
    [SlugifyMode.GitHub]: "GitHub",
    [SlugifyMode.GitLab]: "GitLab",
    [SlugifyMode.Gitea]: "Gitea",
    [SlugifyMode.VisualStudioCode]: "VS Code",
    [SlugifyMode.Zola]: "Zola",
};

suite("Slugify function.", () => {
    importZolaSlug().then(() => { // import the wasm module before running the tests
        for (const [group, testCase] of Object.entries(cases) as ReadonlyArray<[SlugifyMode, readonly ICase[]]>) {
            for (const [rawContent, slug] of testCase) {
                globalThis.test(`(${modeName[group]}) ${rawContent} → ${slug}`, () => {
                    assert.strictEqual(slugify(rawContent, { mode: group }), slug);
                });
            }
        }
    });
});
