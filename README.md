# Markdown Support for Visual Studio Code

[![version](https://img.shields.io/vscode-marketplace/v/yzhang.markdown-all-in-one.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)
[![installs](https://img.shields.io/vscode-marketplace/d/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)
[![AppVeyor](https://img.shields.io/appveyor/ci/yzhang-gh/vscode-markdown.svg?style=flat-square&label=appveyor%20build)](https://ci.appveyor.com/project/yzhang-gh/vscode-markdown)
[![GitHub stars](https://img.shields.io/github/stars/yzhang-gh/vscode-markdown.svg?style=flat-square&label=github%20stars)](https://github.com/yzhang-gh/vscode-markdown)
[![GitHub Contributors](https://img.shields.io/github/contributors/yzhang-gh/vscode-markdown.svg?style=flat-square)](https://github.com/yzhang-gh/vscode-markdown/graphs/contributors)

All you need for Markdown (keyboard shortcuts, table of contents, auto preview and more).

## Features

- **Keyboard shortcuts** (toggle bold, italic, code span, strikethrough and heading)

  ![ctrl b (multi-cursor)](images/gifs/multi-ctrl-b-light.gif) (toggle bold)

  ![check task list](images/gifs/keybinding-tasklist.gif) (check/uncheck task list)

  See full key binding list in [keyboard shortcuts](#keyboard-shortcuts) section

- **Table of contents**

  ![toc](images/toc.png)

  - The indentation rules (tab or spaces) of TOC will be the same of your current file (find it in the right bottom corner)

  - To make TOC compatible with GitHub, you need to set option `githubCompatibility` to `true`

  - Use `<!-- omit in toc -->` to ignore specific heading in TOC

- **List editing**

  ![on enter key 1](images/gifs/on-enter-key1.gif) (<kbd>Enter</kbd>)

  ![on enter key 2](images/gifs/on-enter-key2.gif) (<kbd>Enter</kbd>)

  ![on tab key](images/gifs/on-tab-key.gif) (<kbd>Tab</kbd>)

  ![on backspace key](images/gifs/on-backspace-key.gif) (<kbd>Backspace</kbd>)

  ![marker fixing](images/gifs/marker-fixing.gif) (auto fix ordered list markers)

- **Print Markdown to HTML**

  - Command `Markdown: Print current document to HTML`

  - It's recommended to print the exported HTML to PDF with browser (e.g. Chrome) if you want to share your documents with others

- **GitHub Flavoured Markdown**

  - Table formatter

    ![table-formatter](images/gifs/table-formatter.gif)

    (Note that the keybinding is <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> on Linux)

  - Task list

- **Math**

  ![math](images/math.png)

- **Auto completions**

  - Images

    ![image paths](images/image-completions.png)

  - Math functions

    ![math completions](images/math-completions.png)

  - Reference links

    ![suggest ref link](images/gifs/suggest-ref-link-light.png)

- **Others**

  - Paste link on selected text

    ![paste link](images/gifs/paste-link-light.gif)

  - Override "Open Preview" keybinding with "Toggle Preview", which means you can close preview using the same keybinding (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd> <kbd>V</kbd>).

## Available Commands

- Markdown: Create Table of Contents
- Markdown: Update Table of Contents
- Markdown: Toggle code span
- Markdown: Print current document to HTML
- Markdown: Toggle math environment
- Markdown: Toggle list

## Keyboard Shortcuts

<details>
<summary>Table</summary>

| Key                                               | Command                      |
| ------------------------------------------------- | ---------------------------- |
| <kbd>Ctrl</kbd> + <kbd>B</kbd>                    | Toggle bold                  |
| <kbd>Ctrl</kbd> + <kbd>I</kbd>                    | Toggle italic                |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd> | Toggle heading (uplevel)     |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd> | Toggle heading (downlevel)   |
| <kbd>Ctrl</kbd> + <kbd>M</kbd>                    | Toggle math environment      |
| <kbd>Alt</kbd> + <kbd>C</kbd>                     | Check/Uncheck task list item |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | Toggle preview               |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> <kbd>V</kbd>       | Toggle preview to side       |

</details>

## Supported Settings

<details>
<summary>Table</summary>

| Name                                               | Default    | Description                                                       |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| `markdown.extension.italic.indicator`              | `*`        | Use `*` or `_` to wrap italic text                                |
| `markdown.extension.list.indentationSize`          | `adaptive` | Use different indentation size for ordered and unordered list     |
| `markdown.extension.orderedList.autoRenumber`      | `true`     | Auto fix list markers as you edits                                |
| `markdown.extension.orderedList.marker`            | `ordered`  | Or `one`: always use `1.` as ordered list marker                  |
| `markdown.extension.preview.autoShowPreviewToSide` | `false`    | Automatically show preview when opening a Markdown file.          |
| `markdown.extension.print.absoluteImgPath`         | `true`     | Convert image path to absolute path                               |
| `markdown.extension.print.imgToBase64`             | `false`    | Convert images to base64 when printing to HTML                    |
| `markdown.extension.print.onFileSave`              | `false`    | Print to HTML on file save                                        |
| `markdown.extension.showExplorer`                  | `true`     | Show outline view in explorer panel                               |
| `markdown.extension.syntax.decorations`            | `true`     | Add decorations to strikethrough and code spans                   |
| `markdown.extension.syntax.plainTheme`             | `false`    | A distraction-free theme                                          |
| `markdown.extension.toc.githubCompatibility`       | `false`    | GitHub compatibility                                              |
| `markdown.extension.toc.downcaseLink`              | `true`     | Force the TOC links to be lowercase                               |
| `markdown.extension.toc.levels`                    | `1..6`     | Control the heading levels to show in the table of contents.      |
| `markdown.extension.toc.orderedList`               | `false`    | Use ordered list in the table of contents.                        |
| `markdown.extension.toc.plaintext`                 | `false`    | Just plain text.                                                  |
| `markdown.extension.toc.tabSize`                   | `auto`     | Control the indentation size of TOC (`auto` or a number)          |
| `markdown.extension.toc.unorderedList.marker`      | `-`        | Use `-`, `*` or `+` in the table of contents (for unordered list) |
| `markdown.extension.toc.updateOnSave`              | `true`     | Automatically update the table of contents on save.               |
| `markdown.extension.katex.macros`                  | `{}`       | KaTeX macros e.g. `{ "\\name": "expansion", ... }`                |

</details>

## Changelog

See [CHANGELOG](CHANGELOG.md) for more information.

## Latest Development Build

Download it [here](https://ci.appveyor.com/project/yzhang-gh/vscode-markdown/build/artifacts).

To install, execute `Extensions: Install from VSIX...` in the Command Palette (`ctrl + shift + p`)

## Contributing

- File bugs, feature requests in [GitHub Issues](https://github.com/yzhang-gh/vscode-markdown/issues).
- Leave a review on [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one#review-details).
- Buy me a coffee ☕ (via [PayPal](https://www.paypal.me/2yzhang), [Alipay or WeChat](donate.md)).

Special thanks to all the [contributors](https://github.com/yzhang-gh/vscode-markdown/graphs/contributors).

---

Thanks [VSCode Power User Course](https://VSCode.pro?utm_source=MarkdownAllInOne) for sharing many VSCode tips with me.

[![VSCode Power User course](https://img.shields.io/badge/Learn%20-VSCode%20Power%20User%20Course%20%E2%86%92-gray.svg?style=flat-square&colorA=444444&colorB=4F44D6)](https://VSCode.pro?utm_source=MarkdownAllInOne)
