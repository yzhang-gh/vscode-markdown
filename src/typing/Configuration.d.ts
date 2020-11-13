import { MarkdownEmphasisIndicator, MarkdownBulletListMarker } from "./markdownSpec";
import { SlugifyMode } from "./SlugifyMode";

/**
 * Configuration settings.
 */

export default interface Configuration {
    completion: {
        respectVscodeSearchExclude: boolean;
        root: string;
    };

    italic: {
        indicator: MarkdownEmphasisIndicator;
    };

    katex: {
        /**
         * A collection of custom macros.
         * https://katex.org/docs/options.html
         */
        macros: { [key: string]: string; };
    };

    list: {
        indentationSize:
        | "adaptive"
        | "inherit"
        ;
    };

    math: {
        enabled: boolean;
    };

    orderedList: {
        autoRenumber: boolean;
        marker:
        | "one"
        | "ordered"
        ;
    };

    preview: {
        autoShowPreviewToSide: boolean;
    };

    print: {
        absoluteImgPath: boolean;
        imgToBase64: boolean;
        includeVscodeStylesheets: boolean;
        onFileSave: boolean;
        theme:
        | "dark"
        | "light"
        ;
        validateUrls: boolean;
    };

    syntax: {
        decorationFileSizeLimit: number;
        decorations: boolean;
        plainTheme: boolean;
    };

    tableFormatter: {
        enabled: boolean;
        normalizeIndentation: boolean;
    };

    toc: {
        downcaseLink: boolean;
        levels: string;
        omittedFromToc: { [path: string]: string[]; };
        orderedList: boolean;
        plaintext: boolean;
        slugifyMode: SlugifyMode;
        unorderedList: {
            marker: MarkdownBulletListMarker;
        };
        updateOnSave: boolean;
    };
}
