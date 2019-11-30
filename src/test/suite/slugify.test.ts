import * as assert from 'assert';
import * as util from '../../util';


suite("Slugify function.", () => {
    const headings = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c"
    }

    const headings_github = {
        "foo _italic_ bar": "foo-italic-bar",
        "foo_foo_bar": "foo_foo_bar",
        "`a.b` c": "ab-c"
    }

    for (const heading in headings) {
        if (headings.hasOwnProperty(heading)) {
            const slug = headings[heading];
            test(`${heading} → ${slug}`, () => {
                assert.strictEqual(util.slugify(heading, false), slug);
            });
        }
    }

    for (const heading in headings_github) {
        if (headings_github.hasOwnProperty(heading)) {
            const slug = headings_github[heading];
            test(`${heading} → ${slug} (GitHub compatible)`, () => {
                assert.strictEqual(util.slugify(heading, true), slug);
            });
        }
    }
});
