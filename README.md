# Markdown Support for Visual Studio Code

[![version](https://vsmarketplacebadge.apphb.com/version/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![installs](https://vsmarketplacebadge.apphb.com/installs/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)

All you need for Markdown (keyboard shortcuts, table of contents, auto preview and more).

## Features

- **Keyboard shortcuts** (toggle bold, italic, code span and heading)
  - Different behaviors depending on the context (see instruction below)
- **Table of contents** (No additional annoying tags like `<!-- TOC -->`)
- **Automatically show preview** when opening a Markdown file (Disabled by default)
  - ~~Automatically close preview when changing editor~~
- ~~Print your Markdown to PDF~~ (not satisfied with the current solution)
- **List editing** (when pressing <kbd>Enter</kbd> at the end of a list item) (also work for quote block)
  - Pressing <kbd>Tab</kbd> at the beginning of a list item will indent it
  - Pressing <kbd>Backspace</kbd> at the beginning of a list item will unindent it (or delete the list marker)
  - Blank list item won't be continued
  - *Note*: there is an option to choose ordered list marker: always `1.` or ordered number.
- **Document formatter** (only format GFM table now)
- **Word completion** (moved to a standalone extension [Dictionary Completion](https://marketplace.visualstudio.com/items?itemName=yzhang.dictionary-completion))

### Keyboard Shortcuts

- When toggling bold or italic,
  - If there is NO selection, pressing the hotkey will **turn on** or **off** the style
    - `|` becomes `**|**` or `*|*` (turn on the style)
    - `**|**` or `*|*` becomes `|` (turn off the style)
    - `**bold|**` or `*italic|*` becomes `**bold**|` or `*italic*|` (turn off the style, if the cursor is at the end of a **bold** or *italic* block)
  - If there is a selection, pressing the hotkey will add or remove asterisk (`*`) depending on the selected text
- When toggling heading,
  - the same logic with indenting/unindenting one line (<kbd>ctrl</kbd> + <kbd>]</kbd>/<kbd>[</kbd>)
  - easily adjusting the heading level without moving cursor to the beginning of the line (<kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>]</kbd>/<kbd>[</kbd>)

![shortcuts](images/gifs/shortcuts.gif)

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
| `markdown.extension.toc.depth` | `6` | Control the heading level to show in the table of contents. |
| `markdown.extension.toc.orderedList` | `false` | Use ordered list in the table of contents. |
| `markdown.extension.toc.plaintext` | `false` | Just plain text. |
| `markdown.extension.toc.updateOnSave` | `false` | Automatically update the table of contents on save. |
| `markdown.extension.preview.autoShowPreviewToSide` | `false` | Automatically show preview when opening a Markdown file. |
| `markdown.extension.orderedList.marker` | `one` | Start a list item always with '1.' or in increasing numerical order (using option `ordered`) |

## Changelog

### Latest 0.7.1 (2017.06.23)

- **Fix**: Better TOC detection rules ([#7](https://github.com/neilsustc/vscode-markdown/issues/7))

### 0.7.0 (2017.06.10)

- **New**: GFM table formatter
- **New**: Add shortcuts for code spans (<kbd>ctrl</kbd> + <kbd>`</kbd>)
- **New**: Remove empty list item when pressing <kbd>Enter</kbd>

See [CHANGELOG](CHANGELOG.md) for more information.

## Contributing

Bugs, feature requests and more, in [GitHub Issues](https://github.com/neilsustc/vscode-markdown/issues).

## Known Issues

<!-- - To avoid distractive HTML comments, this extension will 'guess' where the TOC is. Currently, a TOC will be recognized if
  - It's a list block in Markdown syntax
  - Its first list item title matches the first heading in the file -->
- CJK in TOC anchors (A more complex slugify function is needed)
<!-- - (**Help wanted**) Because of the using of `html-pdf` package,
  - Anchors within PDF won't work
  - No bookmarks generated -->

## If You Would Like to ...

Vote for prospective vscode features (Add 👍 to GitHub issues):

- Open `.pdf`, `.xlsx` etc. in vscode [#12176](https://github.com/Microsoft/vscode/issues/12176)
- Print Markdown to PDF using electron `printToPdf` [#20869](https://github.com/Microsoft/vscode/issues/20869)
- Support setting font-size in Decoration [#9078](https://github.com/Microsoft/vscode/issues/9078)
