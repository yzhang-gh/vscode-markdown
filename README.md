# Markdown Support for Visual Studio Code

[![version](https://vsmarketplacebadge.apphb.com/version/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![installs](https://vsmarketplacebadge.apphb.com/installs/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![AppVeyor](https://img.shields.io/appveyor/ci/neilsustc/vscode-markdown.svg?style=flat-square)](https://ci.appveyor.com/project/neilsustc/vscode-markdown)

All you need for Markdown (keyboard shortcuts, table of contents, auto preview and more).

## Features

- **Keyboard shortcuts** (toggle bold, italic, code span and heading)
  - Different behaviors depending on the context (see instruction below)
  - *Quick styling mode*: toggle bold/italic without selecting words
- **Table of contents** (No additional annoying tags like `<!-- TOC -->`)
- **Automatically show preview** when opening a Markdown file (Disabled by default)
  - ~~Automatically close preview when changing editor~~
- ~~**Print your Markdown to PDF**~~ (not satisfied with the current solution)
- **List editing** (when pressing <kbd>Enter</kbd> at the end of a list item) (also work for quote block)
  - Pressing <kbd>Tab</kbd> at the beginning of a list item will indent it
  - Pressing <kbd>Backspace</kbd> at the beginning of a list item will unindent it (or delete the list marker)
  - Blank list item won't be continued
  - *Note*: there is an option to choose ordered list marker: always `1.` or ordered number.
- **Document formatter** (only format GFM table now)
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

<!-- ### Print to PDF

![print to pdf](images/gifs/pdf.gif) -->

## Shortcuts

| Key | Command |
| --- | --- |
| <kbd>ctrl</kbd> + <kbd>b</kbd> | Toggle bold |
| <kbd>ctrl</kbd> + <kbd>i</kbd> | Toggle italic |
| <kbd>ctrl</kbd> + <kbd>`</kbd> | Toggle code span |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>]</kbd> | Toggle heading (uplevel) |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>[</kbd> | Toggle heading (downlevel) |

## Available Commands

- Markdown: Create Table of Contents
- Markdown: Update Table of Contents
- ~~Markdown: Print to PDF~~

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

## Changelog

### Latest 0.8.2 (2017.08.07)

- **Fix**: Handle Chinese characters when formatting table ([#26](https://github.com/neilsustc/vscode-markdown/issues/26))
- **Fix**: Use the same slugify function with vscode when creating table of contents ([#27](https://github.com/neilsustc/vscode-markdown/issues/27))

### 0.8.1 (2017.07.30)

- **New**: Support more than 9 list items and some improvements. Thank you [@rbolsius](https://github.com/rbolsius)
- **Fix**: Wrong formatting when table cell contains `|` ([#24](https://github.com/neilsustc/vscode-markdown/issues/24))

### 0.8.0 (2017.07.26)

- **New**: New setting `markdown.extension.quickStyling`. Quick styling (toggle bold/italic without selecting words) (default `false`)
- **New**: New setting `markdown.extension.italic.indicator` (`*` or `_`)
- **New**: New setting `markdown.extension.toc.levels` controling the range of TOC levels (syntax `x..y`, default `1..6`)
- **Other**: Add unit tests and continuous integration (Appveyor)

See [CHANGELOG](CHANGELOG.md) for more information.

## Contributing

Bugs, feature requests and more, in [GitHub Issues](https://github.com/neilsustc/vscode-markdown/issues).

Or write a review on [vscode marketplace](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one#review-details) 😉.

## If You Would Like to ...

Vote for prospective vscode features (Add 👍 to GitHub issues):

- Open `.pdf`, `.xlsx` etc. in vscode [#12176](https://github.com/Microsoft/vscode/issues/12176)
- Print Markdown to PDF using electron `printToPdf` [#20869](https://github.com/Microsoft/vscode/issues/20869)
- Support setting font-size in Decoration [#9078](https://github.com/Microsoft/vscode/issues/9078)
