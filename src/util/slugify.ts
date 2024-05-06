import SlugifyMode from "../contract/SlugifyMode";
import { configManager } from "../configuration/manager";
import { commonMarkEngine } from "../markdownEngine";
import { window } from "vscode";

/**
 * the wasm equivalent to just doing `import * as zolaSLug from "zola-slug"`, which we can't do because it's a wasm module
 */
let zolaSlug: typeof import("zola-slug");

/**
 * Ideally this function is called before any code that relies on slugify,
 * and any code that relies on slugify should be called in the `then` block.
 */
export async function importZolaSlug() {
    zolaSlug = await import("zola-slug");
}

const utf8Encoder = new TextEncoder();

// Converted from Ruby regular expression `/[^\p{Word}\- ]/u`
// `\p{Word}` => Letter (Ll/Lm/Lo/Lt/Lu), Mark (Mc/Me/Mn), Number (Nd/Nl), Connector_Punctuation (Pc)
// It's weird that Ruby's `\p{Word}` actually does not include Category No.
// https://ruby-doc.org/core/Regexp.html
// https://rubular.com/r/ThqXAm370XRMz6
/**
 * The definition of punctuation from GitHub and GitLab.
 */
const Regexp_Github_Punctuation = /[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc}\- ]/gu;

const Regexp_Gitlab_Product_Suffix = /[ \t\r\n\f\v]*\**\((?:core|starter|premium|ultimate)(?:[ \t\r\n\f\v]+only)?\)\**/g;

/**
 * Converts a string of CommonMark **inline** structures to plain text
 * by removing Markdown syntax in it.
 * This function is only for the `github`, `gitlab` and `zola` slugify functions.
 * @see <https://spec.commonmark.org/0.29/#inlines>
 *
 * @param text - The Markdown string.
 * @param env - The markdown-it environment sandbox (**mutable**).
 * If you don't provide one properly, we cannot process reference links, etc.
 */
function mdInlineToPlainText(text: string, env: object): string {
    // Use a clean CommonMark only engine to avoid interfering with plugins from other extensions.
    // Use `parseInline` to avoid parsing the string as blocks accidentally.
    // See #567, #585, #732, #792; #515; #179; #175, #575
    const inlineTokens = commonMarkEngine.engine.parseInline(text, env)[0].children!;

    return inlineTokens.reduce<string>((result, token) => {
        switch (token.type) {
            case "image":
            case "html_inline":
                return result;
            default:
                return result + token.content;
        }
    }, "");
}

/**
 * Slugify methods.
 *
 * Each key is a slugify mode.
 * A values is the corresponding slugify function, whose signature must be `(rawContent: string, env: object) => string`.
 */
const Slugify_Methods: { readonly [mode in SlugifyMode]: (rawContent: string, env: object) => string; } = {
    // Sort in alphabetical order.

    [SlugifyMode.AzureDevOps]: (slug: string): string => {
        // https://markdown-all-in-one.github.io/docs/specs/slugify/azure-devops.html
        // Encode every character. Although opposed by RFC 3986, it's the only way to solve #802.

        slug = slug.trim()
            .toLowerCase()
            .replace(/\p{Zs}/gu, "-")

        if (/^\d/.test(slug)) {
            slug = Array.from(
                utf8Encoder.encode(slug),
                (b) => "%" + b.toString(16)
            )
                .join("")
                .toUpperCase();
        }
        else {
            slug = encodeURIComponent(slug)
        }

        return slug
    },

    [SlugifyMode.BitbucketCloud]: (slug: string, env: object): string => {
        // https://support.atlassian.com/bitbucket-cloud/docs/readme-content/
        // https://bitbucket.org/tutorials/markdowndemo/
        slug = "markdown-header-"
            + Slugify_Methods.github(slug, env).replace(/-+/g, "-");

        return slug;
    },

    [SlugifyMode.Gitea]: (slug: string): string => {
        // Gitea uses the blackfriday parser
        // https://godoc.org/github.com/russross/blackfriday#hdr-Sanitized_Anchor_Names
        slug = slug
            .replace(/^[^\p{L}\p{N}]+/u, "")
            .replace(/[^\p{L}\p{N}]+$/u, "")
            .replace(/[^\p{L}\p{N}]+/gu, "-")
            .toLowerCase();

        return slug;
    },

    [SlugifyMode.GitHub]: (slug: string, env: object): string => {
        // According to an inspection in 2020-12, GitHub passes the raw content as is,
        // and does not trim leading or trailing C0, Zs characters in any step.
        // <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        slug = mdInlineToPlainText(slug, env)
            .replace(Regexp_Github_Punctuation, "")
            .toLowerCase() // According to an inspection in 2020-09, GitHub performs full Unicode case conversion now.
            .replace(/ /g, "-");

        return slug;
    },

    [SlugifyMode.GitLab]: (slug: string, env: object): string => {
        // https://gitlab.com/help/user/markdown
        // https://docs.gitlab.com/ee/api/markdown.html
        // https://docs.gitlab.com/ee/development/wikis.html
        // <https://gitlab.com/gitlab-org/gitlab/blob/master/lib/banzai/filter/table_of_contents_filter.rb#L32>
        // https://gitlab.com/gitlab-org/gitlab/blob/a8c5858ce940decf1d263b59b39df58f89910faf/lib/gitlab/utils/markdown.rb
        slug = mdInlineToPlainText(slug, env)
            .replace(/^[ \t\r\n\f\v]+/, "")
            .replace(/[ \t\r\n\f\v]+$/, "") // https://ruby-doc.org/core/String.html#method-i-strip
            .toLowerCase()
            .replace(Regexp_Gitlab_Product_Suffix, "")
            .replace(Regexp_Github_Punctuation, "")
            .replace(/ /g, "-") // Replace space with dash.
            .replace(/-+/g, "-") // Replace multiple/consecutive dashes with only one.

            // digits-only hrefs conflict with issue refs
            .replace(/^(\d+)$/, "anchor-$1");

        return slug;
    },

    [SlugifyMode.VisualStudioCode]: (rawContent: string, env: object): string => {
        // https://github.com/microsoft/vscode/blob/0798d13f10b193df0297e301affe761b90a8bfa9/extensions/markdown-language-features/src/slugify.ts#L22-L29
        return encodeURI(
            // Simulate <https://github.com/microsoft/vscode/blob/0a57fd87b1d1ef0ff81750f84840ee4303b8800b/extensions/markdown-language-features/src/markdownEngine.ts#L286>.
            // Not the same, but should cover most needs.
            commonMarkEngine.engine.parseInline(rawContent, env)[0].children!
                .reduce<string>((result, token) => result + token.content, "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "-") // Replace whitespace with -
                .replace(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, "") // Remove known punctuators
                .replace(/^\-+/, "") // Remove leading -
                .replace(/\-+$/, "") // Remove trailing -
        );
    },

    [SlugifyMode.Zola]: (rawContent: string, env: object): string => {
        if (zolaSlug !== undefined) {
            return zolaSlug.slugify(mdInlineToPlainText(rawContent, env));
        } else {
            importZolaSlug();
            window.showErrorMessage("Importing Zola Slug... Please try again.");
            return rawContent; //unsure if we should throw an error, let it fail or return the original content
        }
    }
};

/**
 * Slugify a string.
 * @param heading - The raw content of the heading according to the CommonMark Spec.
 * @param env - The markdown-it environment sandbox (**mutable**).
 * @param mode - The slugify mode.
 */
export function slugify(heading: string, {
    env = Object.create(null),
    mode = configManager.get("toc.slugifyMode"),
}: { env?: object; mode?: SlugifyMode; }) {

    // Do never twist the input here!
    // Pass the raw heading content as is to slugify function.

    // Sort by popularity.
    switch (mode) {
        case SlugifyMode.GitHub:
            return Slugify_Methods[SlugifyMode.GitHub](heading, env);

        case SlugifyMode.GitLab:
            return Slugify_Methods[SlugifyMode.GitLab](heading, env);

        case SlugifyMode.Gitea:
            return Slugify_Methods[SlugifyMode.Gitea](heading, env);

        case SlugifyMode.VisualStudioCode:
            return Slugify_Methods[SlugifyMode.VisualStudioCode](heading, env);

        case SlugifyMode.AzureDevOps:
            return Slugify_Methods[SlugifyMode.AzureDevOps](heading, env);

        case SlugifyMode.BitbucketCloud:
            return Slugify_Methods[SlugifyMode.BitbucketCloud](heading, env);

        case SlugifyMode.Zola:
            return Slugify_Methods[SlugifyMode.Zola](heading, env);

        default:
            return Slugify_Methods[SlugifyMode.GitHub](heading, env);
    }
}
