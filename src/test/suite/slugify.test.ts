import * as assert from 'assert';
import * as util from '../../util';


suite("Slugify function.", () => {
    const headings = {
        "foo _italic_ bar": "foo-italic-bar",
        // "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c",
        "Via [remark-cli][]": "via-remark-cli",
        "1. not a list": "1-not-a-list"
    }

    const headings_github = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c",
        "Via [remark-cli][]": "via-remark-cli",
        "1. not a list": "1-not-a-list",
        "1) not a list": "1-not-a-list",
        "foo & < >  \"foo\"": "foo---foo",
        "$\\LaTeX equations$": "latex-equations"
    }

    const headings_gitlab = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c",
        "Via [remark-cli][]": "via-remark-cli",
        "1. not a list": "1-not-a-list",
        "1) not a list": "1-not-a-list",
        "foo & < >  \"foo\"": "foo-foo",
        "1": "anchor-1" // GitLab adds "anchor-" before digit-only IDs
    }

    const headings_gitea = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo-foo-bar",
        "`a.b` c": "a-b-c",
        "Via [remark-cli][]": "via-remark-cli",
        "1. not a list": "1-not-a-list",
        "1) not a list": "1-not-a-list",
        "foo & < >  \"foo\"": "foo-foo",
        "$\\LaTeX equations$": "latex-equations",
        ":checkered_flag: with emoji shortname": "checkered-flag-with-emoji-shortname"
    }

    const headings_azureDevops = {
        "A !\"#$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~": "a-%21%22%23%24%25%26%27%28%29%2a%2B%2C-.%2F%3A%3B%3C%3D%3E%3F%40%5B%5C%5C%5D%5E_%60%7B%7C%7D~",
        "W\u{0020}\u{00A0}\u{2003}\u{202F}\u{205F}\u{3000}\u{1680}S": "w-------s"
    };

    for (const heading of Object.keys(headings)) {
        const slug = headings[heading];
        test(`(VSCode) ${heading} → ${slug}`, () => {
            assert.strictEqual(util.slugify(heading, "vscode"), slug);
        });
    }

    for (const heading of Object.keys(headings_github)) {
        const slug = headings_github[heading];
        test(`(GitHub) ${heading} → ${slug}`, () => {
            assert.strictEqual(util.slugify(heading, "github"), slug);
        });
    }

    for (const heading of Object.keys(headings_gitlab)) {
        const slug = headings_gitlab[heading];
        test(`(GitLab) ${heading} → ${slug}`, () => {
            assert.strictEqual(util.slugify(heading, "gitlab"), slug);
        });
    }

    for (const heading of Object.keys(headings_gitea)) {
        const slug = headings_gitea[heading];
        test(`(Gitea) ${heading} → ${slug}`, () => {
            assert.strictEqual(util.slugify(heading, "gitea"), slug);
        });
    }

    for (const heading of Object.keys(headings_azureDevops)) {
        const slug = headings_azureDevops[heading];
        test(`(Azure DevOps) ${heading} → ${slug}`, () => {
            assert.strictEqual(util.slugify(heading, "azureDevops"), slug);
        });
    }
});
