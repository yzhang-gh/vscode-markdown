import * as assert from 'assert';
import * as util from '../../util';
import SlugifyMode from "../../contract/SlugifyMode";

type ICase = readonly [string, string];

/**
 * `mode -> [rawContent, slug]`
 */
const cases: Readonly<Record<SlugifyMode, readonly ICase[]>> = {
    [SlugifyMode.AzureDevOps]: [
        ["A !\"#$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~", "a-%21%22%23%24%25%26%27%28%29%2a%2B%2C-.%2F%3A%3B%3C%3D%3E%3F%40%5B%5C%5C%5D%5E_%60%7B%7C%7D~"],
        ["W\u{0020}\u{00A0}\u{2003}\u{202F}\u{205F}\u{3000}\u{1680}S", "w-------s"],
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
    ],

    [SlugifyMode.GitLab]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["foo_foo_bar", "foo_foo_bar"],
        ["`a.b` c", "ab-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
        ["1) not a list", "1-not-a-list"],
        ["foo & < >  \"foo\"", "foo-foo"],
        ["1", "anchor-1"], // GitLab adds "anchor-" before digit-only IDs
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
    ],

    [SlugifyMode.VisualStudioCode]: [
        ["foo _italic_ bar", "foo-italic-bar"],
        ["`a.b` c", "ab-c"],
        ["Via [remark-cli][]", "via-remark-cli"],
        ["1. not a list", "1-not-a-list"],
    ],
};

const modeName: Readonly<Record<SlugifyMode, string>> = {
    [SlugifyMode.AzureDevOps]: "Azure DevOps",
    [SlugifyMode.BitbucketCloud]: "Bitbucket Cloud",
    [SlugifyMode.GitHub]: "GitHub",
    [SlugifyMode.GitLab]: "GitLab",
    [SlugifyMode.Gitea]: "Gitea",
    [SlugifyMode.VisualStudioCode]: "VS Code",
};

suite("Slugify function.", () => {
    for (const group of Object.keys(cases) as SlugifyMode[]) {
        for (const testCase of cases[group]) {
            const [rawContent, slug] = testCase;
            globalThis.test(`(${modeName[group]}) ${rawContent} → ${slug}`, () => {
                assert.strictEqual(util.slugify(rawContent, group), slug);
            });
        }
    }
});
