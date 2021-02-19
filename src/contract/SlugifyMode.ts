"use strict";

/**
 * Slugify mode.
 */
const enum SlugifyMode {

    /** Azure DevOps */
    AzureDevOps = "azureDevops",

    /** Bitbucket Cloud */
    BitbucketCloud = "bitbucketCloud",

    /** Gitea */
    Gitea = "gitea",

    /** GitHub */
    GitHub = "github",

    /** GitLab */
    GitLab = "gitlab",

    /** Visual Studio Code */
    VisualStudioCode = "vscode",
}

export default SlugifyMode;
