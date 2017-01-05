# Markdown Support for Visual Studio Code

All you need for Markdown.

## Features

- Keyboard shortcuts (toggle bold, italic, heading)
- Table of contents
  - **No additional annoying tags like `<!-- TOC -->`**
- Automatically show preview when openning a Markdown file

### Keyboard Shortcuts

![shortcuts](images/gifs/shortcuts.gif)

### Table of Contents

![toc](images/gifs/toc.gif)

## Shortcuts

| Key | Command |
| --- | --- |
| `ctrl` + `b` | Toggle bold |
| `ctrl` + `i` | Toggle italic |
| `ctrl` + `shift` + `]` | Toggle heading (uplevel) |
| `ctrl` + `shift` + `[` | Toggle heading (downlevel) |

## Available Commands

- Markdown: Toggle Bold
- Markdown: Toggle Italic
- Markdown: Toggle Heading Uplevel
- Markdown: Toggle Heading Downlevel
- Markdown: Create Table of Contents
- Markdown: Update Table of Contents

## Supported Settings

| Name | Default | Description |
| --- | --- | --- |
| `markdown.extension.toc.depth` | `6` | Control the heading level to show in the table of contents. |
| `markdown.extension.toc.orderedList` | `false` | Use ordered list in the table of contents. |
| `markdown.extension.toc.plaintext` | `false` | Just plain text. |
| `markdown.extension.toc.updateOnSave` | `false` | Automatically update the table of contents on save. |
| `markdown.extension.preview.autoShowPreviewToSide` | `false` | Automatically show preview when openning a Markdown file. |

## Changelog

### Latest 0.1.0

- Keyboard shortcuts (toggle bold, italic, heading)
- Table of contents (create, update)
  - Options (depth, orderedList, updateOnSave)

See [CHANGELOG](CHANGELOG.md) for more information.

## Roadmap

These depend on the feedback and user requests.

## Contributing

Bugs, feature requests and more, in [GitHub Issues](https://github.com/neilsustc/vscode-markdown/issues).

## Known Issues

- To avoid distractive HTML comments, this extension will 'guess' where the TOC is. Currently, a TOC will be recognized if
  - It's a list block in Markdown syntax
  - Its first list item title matches the first heading in the file
- CJK in TOC anchors (A more complex slugify function is needed)

## Acknowledgement

- [mdickin/vscode-markdown-shortcuts](https://github.com/mdickin/vscode-markdown-shortcuts)
- [AlanWalk/Markdown-TOC](https://github.com/AlanWalk/Markdown-TOC)
- [hnw/vscode-auto-open-markdown-preview](https://github.com/hnw/vscode-auto-open-markdown-preview)

## Useful Links

- [CommonMark](http://commonmark.org/): A strongly defined, highly compatible specification of Markdown
