import * as assert from 'assert';
import * as util from '../../util';


suite("Slugify function.", () => {
    const headings = {
        "foo _italic_ bar": "foo-italic-bar",
        // "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c",
        "Via [remark-cli][]": "via-remark-cli"
    }

    const headings_github = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c",
        "Via [remark-cli][]": "via-remark-cli"
    }

    for (const heading in headings) {
        if (headings.hasOwnProperty(heading)) {
            const slug = headings[heading];
            test(`(VSCode) ${heading} → ${slug}`, () => {
                assert.strictEqual(util.slugify(heading, false), slug);
            });
        }
    }

    for (const heading in headings_github) {
        if (headings_github.hasOwnProperty(heading)) {
            const slug = headings_github[heading];
            test(`(GitHub) ${heading} → ${slug}`, () => {
                assert.strictEqual(util.slugify(heading, true), slug);
            });
        }
    }
});
