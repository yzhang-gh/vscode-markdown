'use strict'

import * as path from 'path';
import { extensions, workspace } from 'vscode';

export const officialExtPath = extensions.getExtension("vscode.markdown-language-features").extensionPath;
const tocModule = require(path.join(officialExtPath, 'out', 'tableOfContentsProvider'));
export const TocProvider = tocModule.TableOfContentsProvider;

export function slugify(heading: string) {
    if (workspace.getConfiguration('markdown.extension.toc').get<boolean>('githubCompatibility')) {
        // GitHub slugify function <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        let slug = heading.trim()
            .replace(/[A-Z]/g, match => match.toLowerCase()) // only downcase ASCII region
            .replace(/[\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\{\|\}\~\`]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^\-+/, '')
            .replace(/\-+$/, '');
        return slug;
    } else {
        // VSCode slugify function
        // <https://github.com/Microsoft/vscode/blob/b6417424521559acb9a5088111fb0ed70de7ccf2/extensions/markdown-language-features/src/tableOfContentsProvider.ts#L13>
        return tocModule.Slug.fromHeading(heading).value;
    }
}
