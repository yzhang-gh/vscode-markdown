"use strict";

/**
 * Slugify mode.
 */
const enum SlugifyMode {
    AzureDevOps = "azureDevops",
    BitbucketCloud = "bitbucketCloud",
    Gitea = "gitea",
    GitHub = "github",
    GitLab = "gitlab",
    VisualStudioCode = "vscode",
}

export default SlugifyMode;
