### 0.10.0 (2017.09.24)

- **New**: Outline view ([#36](https://github.com/neilsustc/vscode-markdown/issues/36))
- **New**: Toggle strikethrough `~~` with <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>`</kbd> ([#35](https://github.com/neilsustc/vscode-markdown/issues/35))
- **Fix**: Update TOC on save

### 0.9.0 (2017.09.11)

- **New**: Multi-cursor support ([#33](https://github.com/neilsustc/vscode-markdown/issues/33))
- **Fix**: Support setext heading syntax on TOC generation ([#30](https://github.com/neilsustc/vscode-markdown/issues/30))
- **Fix**: Remove backticks in generated TOC link ([#29](https://github.com/neilsustc/vscode-markdown/issues/29))

### 0.8.3 (2017.08.17)

- **Fix**: Respect indentation rules ([#9](https://github.com/neilsustc/vscode-markdown/issues/9))
- **Fix**: Handle escaped pipe when formatting GFM table ([#28](https://github.com/neilsustc/vscode-markdown/issues/28))

### 0.8.2 (2017.08.07)

- **Fix**: Handle Chinese characters when formatting table ([#26](https://github.com/neilsustc/vscode-markdown/issues/26))
- **Fix**: Use the same slugify function with vscode when creating table of contents ([#27](https://github.com/neilsustc/vscode-markdown/issues/27))

### 0.8.1 (2017.07.30)

- **New**: Support more than 9 list items and some improvements. Thank you [@rbolsius](https://github.com/rbolsius)
- **Fix**: Wrong formatting when table contains `|` ([#24](https://github.com/neilsustc/vscode-markdown/issues/24))

### 0.8.0 (2017.07.26)

- **New**: New setting `markdown.extension.quickStyling`. Quick styling (toggle bold/italic without selecting words) (default `false`)
- **New**: New setting `markdown.extension.italic.indicator` (`*` or `_`)
- **New**: New setting `markdown.extension.toc.levels` controlling the range of TOC levels (syntax `x..y`, default `1..6`)
- **Other**: Add unit tests and continuous integration (Appveyor)

### 0.7.6/7 (2017.07.18/20)

- **Fix**: Fix again (activation events). Finally go back to the legacy activation events (not fancy but robust).

### 0.7.5 (2017.07.15)

- **Fix**: Cannot activate extension when no folder is opened ([#14](https://github.com/neilsustc/vscode-markdown/issues/14))

### 0.7.4 (2017.07.14)

- **Fix**: Fix activation events ([#12](https://github.com/neilsustc/vscode-markdown/issues/12))

### 0.7.3 (2017.07.11)

- **Fix**: Chinese TOC ([#11](https://github.com/neilsustc/vscode-markdown/issues/11))

### 0.7.2 (2017.06.30)

- **Fix**: Adopt normal <kbd>Enter</kbd>, <kbd>Tab</kbd> and <kbd>Backspace</kbd> behaviors in fenced code blocks ([#8](https://github.com/neilsustc/vscode-markdown/issues/8))
- **Fix**: Unexpected list continuing

### 0.7.1 (2017.06.24)

- **Fix**: Better TOC detection rules ([#7](https://github.com/neilsustc/vscode-markdown/issues/7))

### 0.7.0 (2017.06.10)

- **New**: GFM table formatter
- **New**: Add shortcuts for code spans (<kbd>ctrl</kbd> + <kbd>`</kbd>)
- **New**: Remove empty list item when pressing <kbd>Enter</kbd>

### 0.6.2 (2017.06.07)

- **Other**: Add marketplace badges; Improve documentation

### 0.6.1 (2017.05.23)

- **Fix**: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> won't break current line now
- **Other**: Move word completion feature to a standalone extension [Dictionary Completion](https://marketplace.visualstudio.com/items?itemName=yzhang.dictionary-completion)

### 0.6.0 (2017.05.15)

- **New**: Edit lists with <kbd>Enter</kbd>, <kbd>Tab</kbd> and <kbd>Backspace</kbd>

### 0.5.2 (2017.04.17)

- Rollback

### 0.5.1 (2017.04.16)

- ~~**New**: Automatic close Markdown preview when change editor~~

### 0.5.0 (2017.04.13)

- **New**: New shortcut behavior to let cursor jump out of **bold** or *italic* block

Thanks, [Zach Kirkland (@zkirkland)](https://github.com/zkirkland)

### 0.4.4 (2017.03.27)

- **New**: Suggest capitalized words
- **Other**: More words

### 0.4.3

- **Fix**: Word completion, handle `,`, `.`, ...

### 0.4.2

- **Other**: Word completion, more words, more accurate

### 0.4.1

- **Fix**: Typo

### 0.4.0 (2017.02.23)

- **New**: Word completion for frequently used words
- **New**: Continue quote block `>`

### 0.3.0 (2017.02.08)

- ~~**New**: Print your Markdown to PDF~~ (Need more tests for the installation of required library)
- **New**: At the end of a list item, pressing <kbd>Enter</kbd> will automatically insert the new list item bullet
  - Blank list item won't be continued
  - (Planed: Pressing <kbd>Tab</kbd> on the blank list item will indent it) (Help wanted)
- **Fix**: LF and CRLF in TOC
- **Other**: Override `blockComment` (`<!--`, `-->` to <code>&lt;!--&nbsp;</code>, <code>&nbsp;--&gt;</code>)

### 0.2.0 (2017.01.05)

- **New**: Automatically show preview to side when opening a Markdown file
- **New**: Option for plain text TOC

### 0.1.0

- **New**: Keyboard shortcuts (toggle bold, italic, heading)
- **New**: Table of contents (create, update)
  - Options (depth, orderedList, updateOnSave)
