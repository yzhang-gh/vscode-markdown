'use strict'

import * as path from 'path';
import { extensions, workspace, Uri, commands } from 'vscode';

export const officialExtPath = extensions.getExtension("vscode.markdown-language-features").extensionPath;
const tocModule = require(path.join(officialExtPath, 'out', 'tableOfContentsProvider'));
export const TocProvider = tocModule.TableOfContentsProvider;

export function slugify(heading: string) {
    if (workspace.getConfiguration('markdown.extension.toc').get<boolean>('githubCompatibility')) {
        // GitHub slugify function <https://github.com/jch/html-pipeline/blob/master/lib/html/pipeline/toc_filter.rb>
        let slug = heading.trim()
            .replace(/[A-Z]/g, match => match.toLowerCase()) // only downcase ASCII region
            .replace(/[\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\{\|\}\~\`]/g, '') // `_` should be converted to `-` instead of being removed
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

export function getNewFeatureMsg(version: string) {
    switch (version) {
        case '1.3.0':
            return 'Introduce an exciting feature! Auto renumbering ordered list.';
    }
    return undefined;
}

export function showChangelog() {
    // vscode#49268
    // let mdExt = extensions.getExtension('vscode.markdown');
    // if (mdExt.isActive) {
    //     previewChangelog();
    // } else {
    //     mdExt.activate().then(previewChangelog);
    // }

    commands.executeCommand('vscode.open', Uri.parse('https://github.com/neilsustc/vscode-markdown/blob/master/CHANGELOG.md'))
}

function previewChangelog() {
    commands.executeCommand('markdown.showPreview', Uri.file(path.join(__dirname, '../../CHANGELOG.md')));
}
