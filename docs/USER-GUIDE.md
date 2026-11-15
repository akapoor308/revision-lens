# User guide

## Compare a document stack

Open `Revision Lens.html` in a current desktop Chrome or Edge. Drop your original PDF and revised PDF onto the two cards on the left — or drop both anywhere on the page, and the first one becomes the original — then select **Compare all sheets**.

The app indexes every page, matches the two stacks, then compares each pair in turn. You never pick page numbers by hand. **⇅ Swap original and revised** exchanges the two sides if you loaded them the wrong way round.

Matching accounts for insertions and removals, including both at once when the two PDFs have the same total page count. It preserves page order, so it will not reconstruct a report that reflows across page boundaries.

## Read the sheet map

`A 5 → B 6` means original page 5 is paired with revised page 6. `A — → B 5` is a proposed added sheet, `A 5 → B —` a proposed removed sheet. Click a row to open its comparison, or step through rows with <kbd>[</kbd> and <kbd>]</kbd>.

| Label | Meaning |
|---|---|
| Changed | At least one changed pixel or extracted-text change at this row's settings. The row also shows how many regions and text changes. |
| No differences | Nothing changed at these settings. |
| Added / Removed | No sufficiently similar counterpart in document order. |
| Pending | Not compared yet, for example after stopping a run. |
| Error | Could not be compared. The whole-document PDF export stays disabled until every row succeeds. |
| Check match | The pairing needs your eye. Repeated and blank pages are the usual causes. |

Use the dropdown to filter the map, for example to **Changed** or **Review matches**. The counters at the top show matched pairs, additions, removals and matches needing review. Similarity percentages are scores, not probabilities.

Page numbers and revision letters are ignored when deciding which sheets correspond, but they are **not** hidden from the comparison itself — a correctly matched sheet can still read as Changed because its page number changed.

## Review the differences

**Overlay** (<kbd>1</kbd>) puts both revisions on one canvas. Original-only pixels are red, revised-only pixels blue, shared content grey. Amber boxes group nearby changed pixels; <kbd>n</kbd> and <kbd>p</kbd> jump between them. A box is a place to look, not necessarily one change.

**Side by side** (<kbd>2</kbd>) shows the original on the left and the aligned revision on the right, each highlighting only its own changes, so neither pane invents content the other has. Matching region boxes appear in both panes. The two sheets share vertical position, and region navigation stays in this view.

**Text changes** (<kbd>3</kbd>) lists added and removed extracted lines with whitespace normalized. An edited line appears as one removal plus one addition, and reordering shows up the same way. Scanned or outlined text may yield nothing — there is no OCR. Ignored areas and the sensitivity settings do not affect this view.

## Correct an uncertain match

Expand **Manual pairing & match corrections**, choose the real original and revised page, then select **Pin this match & rematch all**. The stack is matched and compared again around the pair you confirmed, and pins that conflict with the new one are replaced automatically. Several pins can fix the order among identical sheets.

Pins stay one-to-one and in page order. A pin confirms which sheets correspond — it says nothing about whether either sheet is correct. **Clear pinned matches** rematches without them.

**Compare this pair** is there for ad hoc checks. Pick “No sheet” on one side to inspect a single sheet on its own. Manual comparisons do not change the saved automatic map.

## Align & Filter

This section starts collapsed; open it when one comparison needs adjusting.

- **X/Y shift** — moves revised page B, in PDF points (72 pt = 1 inch). Positive X moves right, positive Y moves down.
- **Rotation** — clockwise, around B's centre.
- **Scale** — relative to B's own PDF scale. Different page sizes are never silently equalized.
- **Suggest shift** — estimates translation from downsampled linework, keeping rotation and scale. Check the result; **Reset alignment** undoes it.
- **Difference threshold** — higher values ignore fainter differences.
- **Line-edge tolerance** — 1–2 px absorbs antialiasing and hairline shifts, but can also hide a genuinely small change. Use 0 px with a higher render quality for a careful review.
- **Ignore an area** — switches on rectangle drawing in Overlay view, for dates or title blocks. Ignored areas affect the visual comparison only and are outlined in exports.

Each mapped row remembers its own alignment and ignored areas, and gets them back when you return to it. Changing render quality re-renders the selected row. **Compare all sheets** applies the current quality, threshold and tolerance across the stack while keeping saved alignment for pairs that still match.

Default quality is 144 dpi, with 100 and 200 dpi options. The 12-megapixel ceiling can reduce the actual dpi on very large sheets; the footer reports what was used. Low quality can hide small dimensions and symbols.

## Export results

| Button | Scope |
|---|---|
| Overlay PDF / PNG | The selected comparison, with file and page identifiers, the settings used, region outlines and a review warning when one applies. |
| Text changes CSV | Extracted-line changes for the selected comparison. |
| Whole-document summary CSV | Every map row: pairing, status, review reason, similarity, change counts, dpi and whether the run completed. |
| All sheets comparison PDF | One page per map row, including added and removed sheets, using each row's saved settings. |

Export filenames include the pages they cover, so saving several does not overwrite anything. The whole-document PDF button is enabled only when every row compared successfully. PDF output is rasterized, not vector or layered, and is not calibrated for measurement. Your original files are never modified. CSV text is quoted and formula-like prefixes are neutralized so a spreadsheet cannot execute them.

## Stop or clear

**Stop after current sheet** takes effect between indexing, comparison or export steps; a single long render finishes first. Pending rows stay marked Pending, and stopping an export saves nothing partial.

**Clear session** releases the loaded PDFs, the map, the pins and the settings. Close or reload the tab to release whatever the browser still holds.

## Keyboard shortcuts

| Key | Action |
|---|---|
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Overlay, side by side, text changes |
| <kbd>n</kbd> / <kbd>p</kbd> | Next / previous change region |
| <kbd>[</kbd> / <kbd>]</kbd> | Previous / next sheet in the map |

Shortcuts are ignored while a text field or dropdown has focus.

## Limits

150 MB per PDF, 250,000 candidate page pairs per run, 12 megapixels per rendered sheet, 1,500 extracted text lines per sheet, 200 MB of image data per whole-document PDF export. Split an exceptionally large stack. Only local, unencrypted PDFs are supported — a password-protected file is reported as such. Annotations, comments and interactive form fields are outside the comparison.
