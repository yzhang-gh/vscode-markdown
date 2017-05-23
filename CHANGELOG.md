## 0.6.1 (2017.05.23)

- FIX: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> won't break current line now
- OTHER: Move word completion feature to standalone extension [Dictionary Completion](https://marketplace.visualstudio.com/items?itemName=yzhang.dictionary-completion)

## 0.6.0 (2017.05.15)

- NEW: Edit lists with <kbd>Enter</kbd>, <kbd>Tab</kbd> and <kbd>Backspace</kbd>

## 0.5.2 (2017.04.17)

- Rollback

## 0.5.1 (2017.04.16)

- ~~NEW: Automatic close Markdown preview when change editor~~

## 0.5.0 (2017.04.13)

- NEW: New shortcut behavior to let cursor jump out of **bold** or *italic* block

Thanks, [Zach Kirkland (@zkirkland)](https://github.com/zkirkland)

## 0.4.4 (2017.03.27)

- NEW: Suggest capitalized words
- OTHER: More words

## 0.4.3

- FIX: Word completion, handle `,`, `.`, ...

## 0.4.2

- OTHER: Word completion, more words, more accurate

## 0.4.1

- FIX: Typo

## 0.4.0 (2017.02.23)

- NEW: Word completion for frequently used words
- NEW: Continue quote block `>`

## 0.3.0 (2017.02.08)

- ~~NEW: Print your Markdown to PDF~~ (Need more tests for the installation of required library)
- NEW: At the end of a list item, pressing <kbd>Enter</kbd> will automatically insert the new list item bullet
  - Blank list item won't be continued
  - (Planed: Pressing <kbd>Tab</kbd> on the blank list item will indent it) (Help wanted)
- FIX: LF and CRLF in TOC
- OTHER: Override `blockComment` (`<!--`, `-->` to <code>&lt;!--&nbsp;</code>, <code>&nbsp;--&gt;</code>)

## 0.2.0 (2017.01.05)

- NEW: Automatically show preview to side when opening a Markdown file
- NEW: Option for plain text TOC

## 0.1.0

- NEW: Keyboard shortcuts (toggle bold, italic, heading)
- NEW: Table of contents (create, update)
  - Options (depth, orderedList, updateOnSave)
