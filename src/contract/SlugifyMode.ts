/**
 * Slugify mode.
 */
export const enum SlugifyMode {
    /** Azure DevOps */
    AzureDevOps = "azureDevops",

    /** Bitbucket Cloud */
    BitbucketCloud = "bitbucket-cloud",

    /** Gitea */
    Gitea = "gitea",

    /** GitHub */
    GitHub = "github",

    /** GitLab */
    GitLab = "gitlab",

    /** Visual Studio Code */
    VisualStudioCode = "vscode",

    /** Zola */
    Zola = "zola",
}

export default SlugifyMode;
