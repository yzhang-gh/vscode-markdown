import SlugifyMode from "../contract/SlugifyMode";
import { configManager } from "../configuration/manager";
import { commonMarkEngine } from "../markdownEngine";

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
 * This function is only for the `github` and `gitlab` slugify functions.
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
        slug = slug.trim()
            .toLowerCase()
            .replace(/\p{Zs}/gu, "-")

            // Encode every character. Although opposed by RFC 3986, it's the only way to solve #802.
            .replace(/./gus, char => {
                const code = char.codePointAt(0)!;
                const bytes: number[] = (code <= 0x007F) // U+0000 to U+007F
                    ? [code]
                    : (code <= 0x07FF) // U+0080 to U+07FF
                        ? [
                            (code >>> 6) + 0b11000000,
                            (code & 0x3F) + 0x80,
                        ]
                        : (code <= 0xFFFF) // U+0800 to U+FFFF
                            ? [
                                (code >>> 12) + 0b11100000,
                                ((code >>> 6) & 0x3F) + 0x80,
                                (code & 0x3F) + 0x80,
                            ]
                            : [
                                (code >>> 18) + 0b11110000,
                                ((code >>> 12) & 0x3F) + 0x80,
                                ((code >>> 6) & 0x3F) + 0x80,
                                (code & 0x3F) + 0x80,
                            ];
                return bytes.map<string>(b => "%" + b.toString(16)).join("");
            }).toUpperCase();

        return slug;
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

    [SlugifyMode.VisualStudioCode]: (slug: string): string => {
        // <https://github.com/Microsoft/vscode/blob/f5738efe91cb1d0089d3605a318d693e26e5d15c/extensions/markdown-language-features/src/slugify.ts#L22-L29>
        slug = encodeURI(
            slug.trim()
                .replace(/\s+/g, "-") // Replace whitespace with -
                .replace(/[\]\[\!\'\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, "") // Remove known punctuators
                .replace(/^\-+/, "") // Remove leading -
                .replace(/\-+$/, "") // Remove trailing -
        );

        return slug;
    }
};

/**
 * Slugify a string.
 * @param heading - The raw content of the heading according to the CommonMark Spec.
 * @param env - The markdown-it environment sandbox (**mutable**).
 * @param mode - The slugify mode.
 * @param downcase - `true` to force to convert all the characters to lowercase. Otherwise, `false`.
 */
export function slugify(heading: string, {
    env = Object.create(null),
    mode = configManager.get<SlugifyMode>("toc.slugifyMode"),
    downcase = configManager.get<boolean>("toc.downcaseLink"),
}: { env?: object; mode?: SlugifyMode; downcase?: boolean; }) {

    // Do never twist the input here!
    // Pass the raw heading content as is to slugify function.
    let slug = heading;

    // Additional case conversion must be performed before calling slugify function.
    // Because some slugify functions encode strings in their own way.
    if (downcase) {
        slug = slug.toLowerCase();
    }

    // Sort by popularity.
    switch (mode) {
        case SlugifyMode.GitHub:
            slug = Slugify_Methods[SlugifyMode.GitHub](slug, env);
            break;

        case SlugifyMode.GitLab:
            slug = Slugify_Methods[SlugifyMode.GitLab](slug, env);
            break;

        case SlugifyMode.Gitea:
            slug = Slugify_Methods[SlugifyMode.Gitea](slug, env);
            break;

        case SlugifyMode.VisualStudioCode:
            slug = Slugify_Methods[SlugifyMode.VisualStudioCode](slug, env);
            break;

        case SlugifyMode.AzureDevOps:
            slug = Slugify_Methods[SlugifyMode.AzureDevOps](slug, env);
            break;

        case SlugifyMode.BitbucketCloud:
            slug = Slugify_Methods[SlugifyMode.BitbucketCloud](slug, env);
            break;

        default:
            slug = Slugify_Methods[SlugifyMode.GitHub](slug, env);
            break;
    }

    return slug;
}
