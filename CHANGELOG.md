### 2.8.0 (2020.04.10)

- **New**: Path auto-completion now respects option `search.exclude` ([#614](https://github.com/yzhang-gh/vscode-markdown/issue/614)).
- **New**: Suggest `katex.macros` in math environments ([#633](https://github.com/yzhang-gh/vscode-markdown/pull/633)). Thanks, [Y. Ding (@yd278)](https://github.com/yd278).
- **New**: Option `math.enabled`.

<!--  -->

- **Fix**: Escape spaces in file path completions ([#590](https://github.com/yzhang-gh/vscode-markdown/pull/590)). Thanks, [Tomoki Aonuma (@uasi)](https://github.com/uasi).
- **Fix**: TOC issues ([#593](https://github.com/yzhang-gh/vscode-markdown/issues/593), [#603](https://github.com/yzhang-gh/vscode-markdown/issues/603), [#629](https://github.com/yzhang-gh/vscode-markdown/issues/629)).
- **Fix**: Table formatter for Thai characters ([#602](https://github.com/yzhang-gh/vscode-markdown/pull/602)). Thanks, [Nutchanon Ninyawee (@CircleOnCircles)](https://github.com/CircleOnCircles).
- **Fix**: Single column table formatting ([#604](https://github.com/yzhang-gh/vscode-markdown/pull/604)). Thanks, [@chnicholas](https://github.com/chnicholas).
- **Fix**: Issues with option `omitFromToc` ([#644](https://github.com/yzhang-gh/vscode-markdown/issue/644)).

<!--  -->

- **Other**: Added Japanese translation ([#608](https://github.com/yzhang-gh/vscode-markdown/pull/608)). Thanks, [にせ十字 (@falsecross)](https://github.com/falsecross).
- **Other**: Upgraded KaTeX.
- **Other**: Moved from AppVeyor to GitHub Actions. Thank [雪松 (@yxs)](https://github.com/yxs) for the CI badge.

---

### 2.7.0 (2020.01.11)

- **New**: Option `omittedFromToc` ([#580](https://github.com/yzhang-gh/vscode-markdown/pull/580)). Thanks, [Dorian Marchal (@dorian-marchal)](https://github.com/dorian-marchal).

<!--  -->

- **Fix**: Don't continue list item in math environment ([#574](https://github.com/yzhang-gh/vscode-markdown/issues/574)).
- **Fix**: HTML entities in TOC ([#575](https://github.com/yzhang-gh/vscode-markdown/issues/575)).
- **Fix**: User-defined KaTeX macros weren't included in the exported HTML ([#579](https://github.com/yzhang-gh/vscode-markdown/issues/579)).
- **Fix**: Strange HTML tags in the generated TOC ([#585](https://github.com/yzhang-gh/vscode-markdown/issues/585)).
- **Fix**: Use `%20` for space in URL ([#589](https://github.com/yzhang-gh/vscode-markdown/issues/589)).

<!--  -->

- **Other**: Update keybindings ([#571](https://github.com/yzhang-gh/vscode-markdown/issues/571)).
- **Other**: Disable decorations for large files (threshold 128 KB → 50 KB) ([#578](https://github.com/yzhang-gh/vscode-markdown/issues/578)).

---

### 2.6.1 (2019.12.12)

- **Fix**: Strange HTML tags in TOC ([#567](https://github.com/yzhang-gh/vscode-markdown/issues/567)).

---

### 2.6.0 (2019.12.08)

- **New**: Support `<!-- omit in toc -->` above a heading ([#495](https://github.com/yzhang-gh/vscode-markdown/issues/495)).
- **New**: Support `<!-- no toc -->` above a list ([#525](https://github.com/yzhang-gh/vscode-markdown/issues/525)).
- **New**: Option `print.theme` ([#534](https://github.com/yzhang-gh/vscode-markdown/issues/534)).
- **New**: Command "toggle code block" ([#551](https://github.com/yzhang-gh/vscode-markdown/pull/551)). Thanks, [@axiqia](https://github.com/axiqia).
- **New**: Support image path completions for HTML `img` tags.
- **New**: Include [Markdown Footnotes](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-footnotes) in exported HTML if you have that extension installed ([#212](https://github.com/yzhang-gh/vscode-markdown/issues/212)).

<!--  -->

- **Fix**: TOC links ([#494](https://github.com/yzhang-gh/vscode-markdown/issues/494), [#515](https://github.com/yzhang-gh/vscode-markdown/issues/515) and [#550](https://github.com/yzhang-gh/vscode-markdown/issues/550)).
- **Fix**: No longer convert images paths with data URIs ([#539](https://github.com/yzhang-gh/vscode-markdown/pull/539)). Thanks, [@leapwill](https://github.com/leapwill).
- **Fix**: Unexpected ordered list marker updating ([#546](https://github.com/yzhang-gh/vscode-markdown/pull/546)). Thanks, [Alper Cugun (@alper)](https://github.com/alper).
- **Fix**: <kbd>Shift</kbd> + <kbd>Tab</kbd> never outdents ([#561](https://github.com/yzhang-gh/vscode-markdown/issues/561)).

<!--  -->

- **Other**: Update `README` with high-resolution images.

---

### 2.5.0/2.5.1 (2019.10.12)

- **New**: File path completions ([#497](https://github.com/yzhang-gh/vscode-markdown/pull/497)). Thanks, [@linsui](https://github.com/linsui).
- **New**: Toggle multiple checkboxes ([#513](https://github.com/yzhang-gh/vscode-markdown/pull/513)). Thanks, [@GeorchW](https://github.com/GeorchW).
- **New**: Option `print.validateUrls` ([#517](https://github.com/yzhang-gh/vscode-markdown/pull/517)). Thanks, [Olmo Maldonado (@ibolmo)](https://github.com/ibolmo).
- **New**: Add KaTeX mhchem extension ([#521](https://github.com/yzhang-gh/vscode-markdown/pull/521)). Thanks, [Balthild Ires (@balthild)](https://github.com/balthild).
- **New**: Option `completion.root` ([#526](https://github.com/yzhang-gh/vscode-markdown/issues/526)).

<!--  -->

- **Fix**: Cannot recognize indented headings ([#508](https://github.com/yzhang-gh/vscode-markdown/issues/508)).
- **Fix**: TOC and code blocks ([#532](https://github.com/yzhang-gh/vscode-markdown/issues/532)).

<!--  -->

- **Other**: New logo with white background ([#498](https://github.com/yzhang-gh/vscode-markdown/issues/498)).
- **Other**: Remove obsolete HTML attributes ([#499](https://github.com/yzhang-gh/vscode-markdown/issues/499)).
- **Other**: Use light theme in exported HTML ([#529](https://github.com/yzhang-gh/vscode-markdown/issues/529)).

---

### 2.4.1/2.4.2 (2019.07.21)

- **New**: Option `toc.downcaseLink` (default: `true`) ([#476](https://github.com/yzhang-gh/vscode-markdown/issues/476)).

<!--  -->

- **Fix**: KaTeX macros ([#473](https://github.com/yzhang-gh/vscode-markdown/pull/473)). Thanks, [Pierre (@PierreMarchand20)](https://github.com/PierreMarchand20).
- **Fix**: Ignore headings in comments ([#462](https://github.com/yzhang-gh/vscode-markdown/issues/462)).
- **Fix**: Magic comment `<!-- omit in toc -->` was ignored ([#490](https://github.com/yzhang-gh/vscode-markdown/issues/490)).

<!--  -->

- **Other**: Improve performance for large documents

---

### 2.4.0 (2019.06.16)

- **New**: Command `toggleList` (*Note: no default keybinding assigned*) ([#237](https://github.com/yzhang-gh/vscode-markdown/issues/237), [#307](https://github.com/yzhang-gh/vscode-markdown/issues/307)).

  ![toggle list](images/gifs/toggle-list.gif)

<!--  -->

- **New**: Support KaTeX macros ([#426](https://github.com/yzhang-gh/vscode-markdown/issues/426)). Thanks, [Pierre (@PierreMarchand20)](https://github.com/PierreMarchand20).

<!--  -->

- **Fix**: Image paths ([#415](https://github.com/yzhang-gh/vscode-markdown/issues/415)).
- **Fix**: Fenced code block checking ([#434](https://github.com/yzhang-gh/vscode-markdown/issues/434)).

<!--  -->

- **Other**: Don't downcase the TOC links ([#312](https://github.com/yzhang-gh/vscode-markdown/issues/312)). Thanks, [Scott Meesseman (@spmeesseman)](https://github.com/spmeesseman).
- **Other**: Command `toggleMath` now cycles through `|` -> `$|$` -> `$$\n|\n$$` -> `$$ | $$` ([#421](https://github.com/yzhang-gh/vscode-markdown/issues/421#issuecomment-493747064)). Thanks, [Li Yiming (@upupming)](https://github.com/upupming).
- **Other**: Don't include KaTeX stylesheets in the exported HTML if no math ([#430](https://github.com/yzhang-gh/vscode-markdown/issues/430)).
- **Other**: Upgrade KaTeX ([#446](https://github.com/yzhang-gh/vscode-markdown/issues/446)).
- **Other**: Better math completions ([PR#470](https://github.com/yzhang-gh/vscode-markdown/pull/470), [PR#471](https://github.com/yzhang-gh/vscode-markdown/pull/471)).

---

### 2.3.1 (2019.04.29)

- **Fix**: Option `markdown.extension.print.onFileSave` not respected ([#432](https://github.com/yzhang-gh/vscode-markdown/issues/432)).

---

### 2.3.0 (2019.04.28)

- **New** Prefer unused links for reference link label completions ([#414](https://github.com/yzhang-gh/vscode-markdown/issues/414)). Thanks, [Chris (@alshain)](https://github.com/alshain).
- **New**: Option `markdown.extension.print.onFileSave` ([#417](https://github.com/yzhang-gh/vscode-markdown/issues/417)). Thanks, [Li Yiming (@upupming)](https://github.com/upupming).
- **New**: Autocompletion for heading links ([#419](https://github.com/yzhang-gh/vscode-markdown/issues/419)). Thanks again, [Chris (@alshain)](https://github.com/alshain).

<!--  -->

- **Fix**: Syntax decorations ([#390](https://github.com/yzhang-gh/vscode-markdown/issues/390)).
- **Fix**: Table formatter ([#408](https://github.com/yzhang-gh/vscode-markdown/issues/408)).
- **Fix**: Delete space rather than outdent list when there are two or more spaces on <kbd>Backspace</kbd> ([#410](https://github.com/yzhang-gh/vscode-markdown/issues/410)).
- **Fix**: Image paths in exported HTML ([#415](https://github.com/yzhang-gh/vscode-markdown/issues/415), [#429](https://github.com/yzhang-gh/vscode-markdown/issues/429)).
- **Fix**: TOC and fenced code blocks ([#425](https://github.com/yzhang-gh/vscode-markdown/issues/425)).

<!--  -->

- **Other**: Sort KaTeX functions (lowercase first) ([#413](https://github.com/yzhang-gh/vscode-markdown/issues/413)).
- **Other**: Update KaTeX supported functions ([#416](https://github.com/yzhang-gh/vscode-markdown/issues/416)). Thanks again, [Li Yiming (@upupming)](https://github.com/upupming).

---

### 2.2.0 (2019.03.24)

- **Fix**: Better syntax decorations ([#390](https://github.com/yzhang-gh/vscode-markdown/issues/390), [#393](https://github.com/yzhang-gh/vscode-markdown/issues/393)).
- **Fix**: Recognize relative path of `markdown.styles` when exporting to HTML ([#394](https://github.com/yzhang-gh/vscode-markdown/issues/394)).
- **Other**: Unregister formatter when being disabled ([#395](https://github.com/yzhang-gh/vscode-markdown/issues/395)).
- **Other**: Better URL regexp ([#397](https://github.com/yzhang-gh/vscode-markdown/issues/397)). Thanks, [Igor (@Ovsyanka)](https://github.com/Ovsyanka).
- **Other**: Remove default `alt + s` keybinding for macOS ([#404](https://github.com/yzhang-gh/vscode-markdown/issues/404)).
- **Other**: webpack!

---

### 2.1.1 (2019.03.05)

- **Fix**: Table format ([#381](https://github.com/yzhang-gh/vscode-markdown/issues/381)).
- **Fix**: Unexpected link creation on pasting ([#382](https://github.com/yzhang-gh/vscode-markdown/issues/382)).
- **Fix**: Image path encoding when printing ([#385](https://github.com/yzhang-gh/vscode-markdown/issues/385)).

---

### 2.1.0 (2019.02.16)

- **New**: Paste link on selected text ([#20](https://github.com/yzhang-gh/vscode-markdown/issues/20)).

  ![paste](images/gifs/paste.gif)

- **New**: Multi-cursor support ([#33](https://github.com/yzhang-gh/vscode-markdown/issues/33)).

  ![multi-cursor](images/gifs/multi-cursor.gif)

- **New**: Auto-complete for reference link IDs ([#366](https://github.com/yzhang-gh/vscode-markdown/issues/366)).

  ![suggest ref link](images/gifs/suggest-ref-link.png)

<!--  -->

- **Fix**: Conflict with `editor.tabCompletion` setting ([#367](https://github.com/yzhang-gh/vscode-markdown/issues/367)).

<!--  -->

- **Other**: Added ways to buy me a coffee 😉 ([PayPal](https://www.paypal.me/2yzhang), [Alipay or WeChat](donate.md)).

---

### 2.0.0 (2019.01.19)

🎂🎂 This extension is 2 years old!

- **New**: Option `markdown.extension.list.indentationSize` ([#344](https://github.com/yzhang-gh/vscode-markdown/issues/344)).
  - `adaptive`: use 2 spaces indentation for unordered lists, 3 for ordered lists.
  - `inherit`: respect the tab size setting of current file.
- **New**: Copy math as TeX command in exported HTML ([#358](https://github.com/yzhang-gh/vscode-markdown/issues/358)).

<!--  -->

- **Fix**: Many performance issue ([#181](https://github.com/yzhang-gh/vscode-markdown/issues/181), [#323](https://github.com/yzhang-gh/vscode-markdown/issues/323)).
- **Fix**: Fake heading in YAML front matter ([#343](https://github.com/yzhang-gh/vscode-markdown/issues/343)).
- **Fix**: Math function `\neq` rendering ([#252](https://github.com/yzhang-gh/vscode-markdown/issues/252), [#349](https://github.com/yzhang-gh/vscode-markdown/issues/349)).
- **Fix**: Keybinding for checking/unchecking task list ([#361](https://github.com/yzhang-gh/vscode-markdown/issues/361)).
- **Fix**: <kbd>Backspace</kbd> conflicts with Vim extension ([#362](https://github.com/yzhang-gh/vscode-markdown/issues/362)).
- **Fix**: GFM table syntax ([#316](https://github.com/yzhang-gh/vscode-markdown/issues/316)).

Thanks a lot, [Li Yiming (@upupming)](https://github.com/upupming).

---

### 1.8.0 (2018.12.08)

- **New**: Option `markdown.extension.toc.tabSize`, default `auto`. Thanks, [Maël Valais (@maelvalais)](https://github.com/maelvalais).
- **New**: Adaptive indentation size on <kbd>Tab</kbd>/<kbd>Backspace</kbd> key ([#155](https://github.com/yzhang-gh/vscode-markdown/issues/155), [#241](https://github.com/yzhang-gh/vscode-markdown/issues/241)).
- **New**: Better alignment of cells within tables ([#341](https://github.com/yzhang-gh/vscode-markdown/issues/341)). Thanks, [Sriram Krishna (@k-sriram)](https://github.com/k-sriram).

<!--  -->

- **Fix**: Support setext headings in TOC ([#284](https://github.com/yzhang-gh/vscode-markdown/issues/284), [#311](https://github.com/yzhang-gh/vscode-markdown/issues/311)).
- **Fix**: Markdown preview stylesheets priority (VSCode base styles < VSCode preview settings < Custom stylesheets) ([#329](https://github.com/yzhang-gh/vscode-markdown/issues/329)).
- **Fix**: Math completions for untitled document ([#326](https://github.com/yzhang-gh/vscode-markdown/issues/326)).
- **Fix**: Image completions ([#330](https://github.com/yzhang-gh/vscode-markdown/issues/330)).
- **Other**: Use `cmd` instead of `ctrl` for some keybindings on Mac ([#334](https://github.com/yzhang-gh/vscode-markdown/issues/334)).

---

### 1.7.0 (2018.10.27)

- **New**: Math syntax highlight ([#254](https://github.com/yzhang-gh/vscode-markdown/issues/254)). Many thanks, [@linsui](https://github.com/linsui).

<!--  -->

- **Fix**: `imgToBase64` option doesn't apply to relative image paths ([#266](https://github.com/yzhang-gh/vscode-markdown/issues/266)).
- **Fix**: TOC generation error `Cannot read property '1' of null` ([#275](https://github.com/yzhang-gh/vscode-markdown/issues/275)).
- **Fix**: Escape HTML markup in code blocks ([#285](https://github.com/yzhang-gh/vscode-markdown/issues/285)).
- **Fix**: Fix false positive TOC detection ([#304](https://github.com/yzhang-gh/vscode-markdown/issues/304)).
- **Other**: Generate HTML with `title` field ([#280](https://github.com/yzhang-gh/vscode-markdown/issues/280)).
- **Other**: Upgrade `KaTeX` to `v0.10.0-rc.1`

---

### 1.6.3 (2018.10.24)

- **Fix**: Table formatter

---

### 1.6.1 (2018.09.10), 1.6.2 (2018.09.19)

- **Fix**: for VSCode v1.28.0-insider (and again)
- **Other**: Remove outline view feature

---

### 1.6.0 (2018.07.22)

- **New**: Add Chinese language support ([#240](https://github.com/yzhang-gh/vscode-markdown/issues/240)). Thanks, [@linsui](https://github.com/linsui).
- **Fix**: Some minor bugs ([#205](https://github.com/yzhang-gh/vscode-markdown/issues/205), [#223](https://github.com/yzhang-gh/vscode-markdown/issues/223), [#231](https://github.com/yzhang-gh/vscode-markdown/issues/231)). Thanks, [Tom Bresson (@tombresson)](https://github.com/tombresson) for #231.
- **Other**: More math completions (in fact, all KaTeX function) ([#219](https://github.com/yzhang-gh/vscode-markdown/issues/219)).

---

### 1.5.1 (2018.06.29)

- **Fix**: Handle activation error for vscode earlier than v1.24.0.

---

### 1.5.0 (2018.06.24)

- **New**: Additional syntax decorations (for strikethrough, code span etc.) and a new plain theme ([#185](https://github.com/yzhang-gh/vscode-markdown/issues/185)).
- **New**: Show image preview along with path intellisense ([#188](https://github.com/yzhang-gh/vscode-markdown/issues/188)).
- **Fix**: Multi-line task list indentation ([#203](https://github.com/yzhang-gh/vscode-markdown/issues/203)).
- **Fix**: Add unique ids to duplicate headings (only when `githubCompatibility` is `true`) ([#211](https://github.com/yzhang-gh/vscode-markdown/issues/211)).
- **Other**: Upgrade KaTeX version ([#196](https://github.com/yzhang-gh/vscode-markdown/issues/196)).

![v1.5.0 release note](images/v1.5.0.png)

---

### 1.4.0 (2018.05.20)

- **New**: Auto completions! Images paths and math commands
- **New**: Use comment `<!-- omit in toc -->` to omit specific heading in TOC ([#177](https://github.com/yzhang-gh/vscode-markdown/issues/177)).
- **New**: Option `print.imgToBase64`, encoding images into HTML file ([#73](https://github.com/yzhang-gh/vscode-markdown/issues/73)). Thanks, [Eric Yancey Dauenhauer (@ericyd)](https://github.com/ericyd).
- **Fix**: Regression on table formatting ([#171](https://github.com/yzhang-gh/vscode-markdown/issues/171)). Thanks, [Stefan Zi (@StefanZi)](https://github.com/StefanZi).
- **Fix**: Problem of losing track of TOC after editing the first heading ([#48](https://github.com/yzhang-gh/vscode-markdown/issues/48)).
- **Other**: Remove `quickStylingMode` option. (It's default behavior now)
- **Other**: Provide latest CI build ([here](https://ci.appveyor.com/project/yzhang-gh/vscode-markdown/build/artifacts)).

---

### 1.3.0 (2018.05.06)

- **New**: Automatically fix list markers when editing ordered list ([#32](https://github.com/yzhang-gh/vscode-markdown/issues/32), [#104](https://github.com/yzhang-gh/vscode-markdown/issues/104), [#154](https://github.com/yzhang-gh/vscode-markdown/issues/154)). Thanks, [Eric Yancey Dauenhauer (@ericyd)](https://github.com/ericyd)
- **New**: Keyboard shortcut for toggling math environment (<kbd>Ctrl</kbd> + <kbd>M</kbd>) ([#165](https://github.com/yzhang-gh/vscode-markdown/issues/165))
- **New**: Command `toggleUnorderedList`, switching between non-list, <code>- </code>, <code>* </code> and <code>+ </code> ([#145](https://github.com/yzhang-gh/vscode-markdown/issues/145))
- **Fix**: Tables inside list item will be also formatted now ([#107](https://github.com/yzhang-gh/vscode-markdown/issues/107)). Thanks, [Stefan Zi (@StefanZi)](https://github.com/StefanZi)
- **Fix**: Keybinding (<kbd>Ctrl</kbd> + <kbd>K</kbd> <kbd>V</kbd>) conflicts with command `workbench.action.terminal.clear` ([#161](https://github.com/yzhang-gh/vscode-markdown/issues/161))
- **Other**: Handle Japanese characters when formatting tables ([#153](https://github.com/yzhang-gh/vscode-markdown/issues/153)). Thanks, [Matsuyanagi (@Matsuyanagi)](https://github.com/Matsuyanagi)
- **Other**: Smartly set collapse states when showing outline view ([#149](https://github.com/yzhang-gh/vscode-markdown/issues/149))

#### List Renumbering

![list renumbering](images/gifs/list-renumbering.gif)

#### Keyboard Shortcut for Toggling Math Environment

![math toggle](images/gifs/math-toggle.gif)

#### Toggle Unordered List

(assign your desired key binding to `markdown.extension.editing.toggleUnorderedList` first)

![toggle unordered list](images/gifs/toggle-unordered-list.gif)

---

### 1.2.0 (2018.04.20)

- **New**: Math rendering! (supported in both vscode preview and exported HTML) ([#106](https://github.com/yzhang-gh/vscode-markdown/issues/106))
- **New**: Option `toc.githubCompatibility` (in place of removed `toc.encodeUri` and `toc.toLowerCase`)
- **Fix**: Replace underscore with dash when slugifying ([#147](https://github.com/yzhang-gh/vscode-markdown/issues/147))
- **Other**: Add default keybinding <kbd>Alt</kbd> + <kbd>S</kbd> to command `toggleStrikethrough` ([#91](https://github.com/yzhang-gh/vscode-markdown/issues/91))

---

### 1.1.2 (2018.04.04)

- **New**: Option `toc.toLowerCase` determining whether or not lowercasing TOC anchors ([#136](https://github.com/yzhang-gh/vscode-markdown/issues/136), [#137](https://github.com/yzhang-gh/vscode-markdown/issues/137). Thanks, [Владислав Люминарский (@Vladislav-Lyuminarskiy)](https://github.com/Vladislav-Lyuminarskiy))
- **Fix**: Handle relative CSS paths in `markdown.styles` setting when printing ([#113](https://github.com/yzhang-gh/vscode-markdown/issues/113))
- **Fix**: TOC now works better with ordered list ([#130](https://github.com/yzhang-gh/vscode-markdown/issues/130), [#131](https://github.com/yzhang-gh/vscode-markdown/issues/131))
- **Fix**: Keybinding conflict between `togglePreview` and `paste` on Linux ([#134](https://github.com/yzhang-gh/vscode-markdown/issues/134))
- **Fix**: Reveal cursor after editing list in case it is out of view ([#138](https://github.com/yzhang-gh/vscode-markdown/issues/138))

---

### 1.1.1 (2018.03.24)

- **New**: Override default "Open Preview" keybinding with "Toggle Preview". Now you can close preview use the same keybinding. ([#86](https://github.com/yzhang-gh/vscode-markdown/issues/86))
- **Fix**: No outline if first-level headiing is missing ([#120](https://github.com/yzhang-gh/vscode-markdown/issues/120))
- **Fix**: List does not continue if a list item starts with URL ([#122](https://github.com/yzhang-gh/vscode-markdown/issues/122))
- **Fix**: `print.absoluteImgPath` option doesn't take effect on some image tags ([#124](https://github.com/yzhang-gh/vscode-markdown/issues/124))
- **Fix**: A bug when formatting table ([#128](https://github.com/yzhang-gh/vscode-markdown/issues/128))

---

### 1.1.0 (2018.03.08)

- **New**: Option `toc.encodeUri` ([#90](https://github.com/yzhang-gh/vscode-markdown/issues/90), [#98](https://github.com/yzhang-gh/vscode-markdown/issues/98))
- **Fix**: TOC detection ([#85](https://github.com/yzhang-gh/vscode-markdown/issues/85), [#102](https://github.com/yzhang-gh/vscode-markdown/issues/102))
- **Fix**: Wrong HTML output path if you are editing `.MD` file ([#105](https://github.com/yzhang-gh/vscode-markdown/issues/105))

### 1.0.5 (2018.02.01)

- **Fix**: Option `markdown.extension.print.absoluteImgPath` doesn't work ([#84](https://github.com/yzhang-gh/vscode-markdown/issues/84))

### 1.0.4 (2018.01.29)

- **Fix**: TOC entries that contain links do not generate correctly ([#83](https://github.com/yzhang-gh/vscode-markdown/issues/83))

### 1.0.3 (2018.01.23)

- **New**: Option `markdown.extension.print.absoluteImgPath` ([#81](https://github.com/yzhang-gh/vscode-markdown/issues/81))

### 1.0.2 (2018.01.15)

- **Fix**: Anchors in exported HTML ([#78](https://github.com/yzhang-gh/vscode-markdown/issues/78))

### 1.0.1 (2018.01.12)

- **Fix**: Conditions to show outline ([#60](https://github.com/yzhang-gh/vscode-markdown/issues/60))
- **Fix**: Respect `insertSpaces` and `tabSize` options of current file when generating TOC ([#77](https://github.com/yzhang-gh/vscode-markdown/issues/77))

### 1.0.0 (2018.01.05)

- **New**: Update outline view on save ([#68](https://github.com/yzhang-gh/vscode-markdown/issues/68))
- **New**: Option `markdown.extension.toc.unorderedList.marker` ([#74](https://github.com/yzhang-gh/vscode-markdown/issues/74))
- **Change**: Use <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd> (or <kbd>]</kbd>) to change heading level in Mac ([#71](https://github.com/yzhang-gh/vscode-markdown/issues/71))
- **Fix**: Some fixes you might not notice

### 0.11.2 (2017.11.23)

- **New**: Option `markdown.extension.tableFormatter.enabled` ([#51](https://github.com/yzhang-gh/vscode-markdown/issues/51))
- **Fix**: Show outline only when current doc is Markdown ([#40](https://github.com/yzhang-gh/vscode-markdown/issues/40))
- **Fix**: Now option `editor.tabCompletion` is correctly handled ([#55](https://github.com/yzhang-gh/vscode-markdown/issues/55))
- **Fix**: Now if you export Markdown to HTML, all CSS will be embedded rather than referred ([#57](https://github.com/yzhang-gh/vscode-markdown/issues/57))

### 0.11.1 (2017.11.02)

- **New**: Use <kbd>Tab</kbd>/<kbd>Backspace</kbd> key to indent/outdent task list ([#50](https://github.com/yzhang-gh/vscode-markdown/issues/50))

### 0.11.0 (2017.10.18)

- **New**: Support GFM task lists (checkbox)
  - Press <kbd>Alt</kbd> + <kbd>C</kbd> to check/uncheck a task list item
- **New**: Add new setting `markdown.extension.showExplorer` to control whether to show outline view in the explorer panel (Thank you, [Ali Karbassi (@karbassi)](https://github.com/karbassi), [PR#44](https://github.com/yzhang-gh/vscode-markdown/pull/44))
- **Preview**: Print to HTML<del>/PDF</del> (work in progress)

### 0.10.3 (2017.09.30)

- **New**: Support GFM checkbox when continuing list item ([#38](https://github.com/yzhang-gh/vscode-markdown/issues/38))
- **Fix**: Unexpected deletion of list marker when deleting leading spaces of a list item ([#39](https://github.com/yzhang-gh/vscode-markdown/issues/39))

### Patches

- **v0.10.2**: Fix `toc == null`
- **v0.10.1**: Update readme

### 0.10.0 (2017.09.24)

- **New**: Outline view ([#36](https://github.com/yzhang-gh/vscode-markdown/issues/36))
- **New**: Toggle strikethrough `~~` with the keybinding you like `markdown.extension.editing.toggleStrikethrough` ([#35](https://github.com/yzhang-gh/vscode-markdown/issues/35))
- **Fix**: Update TOC on save

### 0.9.0 (2017.09.11)

- **New**: Multi-cursor support ([#33](https://github.com/yzhang-gh/vscode-markdown/issues/33))
- **Fix**: Support setext heading syntax on TOC generation ([#30](https://github.com/yzhang-gh/vscode-markdown/issues/30))
- **Fix**: Remove backticks in generated TOC link ([#29](https://github.com/yzhang-gh/vscode-markdown/issues/29))

### 0.8.3 (2017.08.17)

- **Fix**: Respect indentation rules ([#9](https://github.com/yzhang-gh/vscode-markdown/issues/9))
- **Fix**: Handle escaped pipe when formatting GFM table ([#28](https://github.com/yzhang-gh/vscode-markdown/issues/28))

### 0.8.2 (2017.08.07)

- **Fix**: Handle Chinese characters when formatting table ([#26](https://github.com/yzhang-gh/vscode-markdown/issues/26))
- **Fix**: Use the same slugify function with vscode when creating table of contents ([#27](https://github.com/yzhang-gh/vscode-markdown/issues/27))

### 0.8.1 (2017.07.30)

- **New**: Support more than 9 list items and some improvements. Thank you [@rbolsius](https://github.com/rbolsius)
- **Fix**: Wrong formatting when table contains `|` ([#24](https://github.com/yzhang-gh/vscode-markdown/issues/24))

### 0.8.0 (2017.07.26)

- **New**: New setting `markdown.extension.quickStyling`. Quick styling (toggle bold/italic without selecting words) (default `false`)
- **New**: New setting `markdown.extension.italic.indicator` (`*` or `_`)
- **New**: New setting `markdown.extension.toc.levels` controlling the range of TOC levels (syntax `x..y`, default `1..6`)
- **Other**: Add unit tests and continuous integration (Appveyor)

### 0.7.6/7 (2017.07.18/20)

- **Fix**: Fix again (activation events). Finally go back to the legacy activation events (not fancy but robust).

### 0.7.5 (2017.07.15)

- **Fix**: Cannot activate extension when no folder is opened ([#14](https://github.com/yzhang-gh/vscode-markdown/issues/14))

### 0.7.4 (2017.07.14)

- **Fix**: Fix activation events ([#12](https://github.com/yzhang-gh/vscode-markdown/issues/12))

### 0.7.3 (2017.07.11)

- **Fix**: Chinese TOC ([#11](https://github.com/yzhang-gh/vscode-markdown/issues/11))

### 0.7.2 (2017.06.30)

- **Fix**: Adopt normal <kbd>Enter</kbd>, <kbd>Tab</kbd> and <kbd>Backspace</kbd> behaviors in fenced code blocks ([#8](https://github.com/yzhang-gh/vscode-markdown/issues/8))
- **Fix**: Unexpected list continuing

### 0.7.1 (2017.06.24)

- **Fix**: Better TOC detection rules ([#7](https://github.com/yzhang-gh/vscode-markdown/issues/7))

### 0.7.0 (2017.06.10)

- **New**: GFM table formatter
- **New**: Add shortcuts for code spans (<kbd>Ctrl</kbd> + <kbd>`</kbd>)
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
