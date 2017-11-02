# Markdown Support for Visual Studio Code

[![version](https://img.shields.io/vscode-marketplace/v/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![installs](https://img.shields.io/vscode-marketplace/d/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![AppVeyor](https://img.shields.io/appveyor/ci/neilsustc/vscode-markdown.svg?style=flat-square&label=appveyor%20build)](https://ci.appveyor.com/project/neilsustc/vscode-markdown)  
[![GitHub stars](https://img.shields.io/github/stars/neilsustc/vscode-markdown.svg?style=flat-square&label=github%20stars)](https://github.com/neilsustc/vscode-markdown)

All you need for Markdown (keyboard shortcuts, table of contents, auto preview and more).

## Features

- **Keyboard shortcuts** (toggle bold, italic, code span, strikethrough and heading)
  - Different behaviors depending on the context (see instruction below)
  - *Quick styling mode*: toggle bold/italic without selecting words
- **Table of contents** (No additional annoying tags like `<!-- TOC -->`)
- **Outline view** in explorer panel
- **Automatically show preview** when opening a Markdown file (Disabled by default)
  - ~~Automatically close preview when changing editor~~
- **Print your Markdown to HTML/PDF** (PDF not yet finished)
- **List editing** (when pressing <kbd>Enter</kbd> at the end of a list item) (also work for quote block)
  - Pressing <kbd>Tab</kbd> at the beginning of a list item will indent it
  - Pressing <kbd>Backspace</kbd> at the beginning of a list item will unindent it (or delete the list marker)
  - Blank list item won't be continued
  - *Note*: there is an option to choose ordered list marker: always `1.` or ordered number.
- **GitHub Flavored Markdown**
  - Table formatter
  - Task lists
- **Word completion** (moved to a standalone extension [Dictionary Completion](https://marketplace.visualstudio.com/items?itemName=yzhang.dictionary-completion))

### Keyboard Shortcuts

![shortcuts1](images/gifs/bold-normal.gif)

![shortcuts2](images/gifs/bold-quick.gif)

![shortcuts3](images/gifs/heading.gif)

### Table of Contents

![toc](images/gifs/toc.gif)

### List Editing

![list editing](images/gifs/list-editing.gif)

### Table Formatter

![table formatter](images/gifs/table-formatter.gif)

### Outline

![outline](images/outline.png)

### Task Lists

![task lists](images/gifs/tasklists.gif)

<!-- ### Print to PDF

![print to pdf](images/gifs/pdf.gif) -->

## Shortcuts

| Key | Command |
| --- | --- |
| <kbd>ctrl</kbd> + <kbd>b</kbd> | Toggle bold |
| <kbd>ctrl</kbd> + <kbd>i</kbd> | Toggle italic |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>]</kbd> | Toggle heading (uplevel) |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>[</kbd> | Toggle heading (downlevel) |
| <kbd>alt</kbd> + <kbd>c</kbd> | Check/Uncheck task list item |

## Available Commands

- Markdown: Create Table of Contents
- Markdown: Update Table of Contents
- Markdown: Toggle code span
- Markdown: Toggle strikethrough
- Markdown: Print current document to HTML (*preview*)

## Supported Settings

| Name | Default | Description |
| --- | --- | --- |
| `markdown.extension.toc.levels` | `1..6` | Control the heading levels to show in the table of contents. |
| `markdown.extension.toc.orderedList` | `false` | Use ordered list in the table of contents. |
| `markdown.extension.toc.plaintext` | `false` | Just plain text. |
| `markdown.extension.toc.updateOnSave` | `false` | Automatically update the table of contents on save. |
| `markdown.extension.preview.autoShowPreviewToSide` | `false` | Automatically show preview when opening a Markdown file. |
| `markdown.extension.orderedList.marker` | `one` | Start a list item always with '1.' or in increasing numerical order (using option `ordered`) |
| `markdown.extension.italic.indicator` | `*` | Use `*` or `_` to wrap italic text |
| `markdown.extension.quickStyling` | `false` | Toggle bold/italic without selecting words |
| `markdown.extension.showExplorer` | `true` | Show outline view in explorer panel |

## Changelog

### 0.11.1 (2017.11.02)

- **New**: Use <kbd>Tab</kbd>/<kbd>Backspace</kbd> key to indent/outdent task list ([#50](https://github.com/neilsustc/vscode-markdown/issues/50))

### 0.11.0 (2017.10.18)

- **New**: Support GFM task lists (checkbox)
  - Press <kbd>alt</kbd> + <kbd>c</kbd> to check/uncheck a task list item
- **New**: Add new setting `markdown.extension.showExplorer` to control whether to show outline view in the explorer panel (Thank you, [Ali Karbassi (@karbassi)](https://github.com/karbassi), [PR#44](https://github.com/neilsustc/vscode-markdown/pull/44))
- **Preview**: Print to HTML<del>/PDF</del> (work in progress)

See [CHANGELOG](CHANGELOG.md) for more information.

## Contributing

Bugs, feature requests and more, in [GitHub Issues](https://github.com/neilsustc/vscode-markdown/issues).

Or write a review on [vscode marketplace](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one#review-details) 😉.

## If You Would Like to ...

Vote for prospective vscode features (Add 👍 to GitHub issues):

- Open `.pdf`, `.xlsx` etc. in vscode [#12176](https://github.com/Microsoft/vscode/issues/12176)
- Support setting font-size in Decoration [#9078](https://github.com/Microsoft/vscode/issues/9078)
