# User guide

## Compare a document stack

Open the extracted `Revision Lens.html` in a current desktop Chrome or Edge browser. Select the original PDF and revised PDF using the two file cards. Choose a render quality, then select **Compare all sheets**.

The app first indexes every page, then matches the two stacks, then compares each mapped pair or unmatched sheet. Progress is shown throughout. You do not need to select the page numbers one by one.

The map accounts for insertions and removals, including simultaneous insertion/deletion when both PDFs have the same total page count. Automatic matching preserves order; it does not reconstruct reports that reflow across page boundaries.

## Read the sheet map

`A 5 → B 6` means original page 5 is paired with revised page 6. `A — → B 5` means a proposed added sheet; `A 5 → B —` means a proposed removed sheet. Click a row to open its comparison.

| Label | Meaning |
|---|---|
| Changed | At least one changed pixel or extracted-text change was detected at that row's settings. |
| No differences | No changed pixels or extracted-line changes at those settings. This is not engineering certification. |
| Added / Removed | A sheet has no sufficiently similar counterpart in document order. Check any uncertainty flag. |
| Pending | The row has not been compared, for example after stopping a run. |
| Error | The row could not be compared. A complete comparison export is unavailable until all rows succeed. |
| Check match | The pairing/unmatched status needs review. Repeated and blank pages are especially ambiguous. |

The map can be filtered by result or match-review flag. Top counters show matched pairs, additions, removals and matches needing review. Similarity scores are heuristic scores, not probabilities.

Numbering/revision text is normalized for page matching only. A correctly matched sheet can still be marked Changed because its page number or total-page count changed. These changes are not silently hidden from review.

## Review the differences

**Overlay** places both revisions on one canvas. Original-only pixels are red; revised-only pixels are blue. Shared/within-tolerance content is grey. Amber boxes group nearby changed pixels; a group does not necessarily represent one engineering change.

**Side by side** shows the original on the left and the aligned revision on the right. Original-only pixels are highlighted red on the left, revised-only pixels blue on the right. Corresponding region boxes appear in both panes, even if content exists on only one side, to help locate the relevant area. Unchanged source content keeps its source appearance. Use zoom for fine detail; fit-width shrinks both pages to fit the workspace. The two sheets share vertical position/geometry. Up/down change navigation stays in side-by-side view.

**Text changes** lists whitespace-normalized extracted-line additions and removals. A changed row can appear as one removed line and one added line. Reordering can also create additions/removals. Scanned or outlined text may have no extractable content; no OCR is performed. Visual ignored areas and thresholds do not suppress the text comparison.

## Correct an uncertain match

Expand **Manual pairing & match corrections**. Choose the real original and revised page, then select **Pin this match & rematch all**. The full stack is matched and compared again around the confirmed pair. Multiple pins can establish positions among identical sheets.

Pins must be unique and preserve order. Conflicts are rejected; clear conflicting pins and try again. A pin confirms the correspondence, not the engineering correctness of either sheet. **Clear pinned matches** rematches without the pins.

**Compare this pair** is available for ad hoc inspection. Select “No sheet” on one side to inspect a whole sheet manually. Manual comparisons outside the map do not alter its saved automatic mapping.

## Align & Filter

This section starts collapsed. Expand it only when a selected comparison needs adjustment.

- **X/Y shift:** translation of revised page B in PDF points; 72 pt = 1 inch. Positive X moves right; positive Y moves down.
- **Rotation:** clockwise around revised page B's centre.
- **Scale:** relative to B's original PDF scale. Different page sizes are not silently made equivalent.
- **Suggest shift:** a translation suggestion from downsampled linework. Rotation/scale are retained. Inspect the result and reset if worse.
- **Difference threshold:** larger values suppress lighter pixel differences.
- **Line-edge tolerance:** 1–2 pixels suppress tiny displacements and antialiasing, but may hide real small changes. Use 0 pixels and adequate quality for sensitive review.
- **Ignore an area:** turns on rectangle selection in Overlay view. Draw rectangles over dates/title blocks if appropriate. Ignored areas affect visual comparison only and are outlined in exports.

Settings and exclusions are saved per mapped row. Revisiting that row restores them. Changing the selected row's alignment/filter values updates its result. Changing render quality rerenders the selected row. **Compare all sheets** applies current quality/threshold/tolerance throughout the stack while retaining saved alignment/exclusions for pairs that still match.

Default quality is 144 dpi, with 100 and 200 dpi options. The 12-megapixel limit may reduce actual dpi for large drawings; the footer reports the actual value. Low quality can hide small dimensions/symbols.

## Export results

| Button | Scope |
|---|---|
| Overlay PDF / PNG | Selected comparison with file/page identifiers, settings, grouped regions and a match-review warning when needed. |
| Text changes CSV | Extracted-line changes for the selected comparison. |
| Whole-document summary CSV | Every map row, mapping/status/review reason, similarity, change counts, dpi and run-complete indicator. |
| All sheets comparison PDF | One rasterized comparison page per map row, including added/removed sheets, using saved row settings. |

The full PDF button is enabled only when every row has compared successfully. Review flags remain visible in the export. The image-data limit is 200 MB. PDF output is rasterized, not vector/layered, and is not calibrated for manufacturing measurements. Original files are not modified. CSV strings are quoted and formula-like prefixes are neutralized.

## Stop or clear

**Stop after current sheet** acts between indexing, comparison or export steps. A long render/comparison can finish before the stop is handled. Pending rows remain explicit and a stopped comparison is incomplete. Stopping a full-PDF export does not save a partial PDF.

**Clear session** disposes of loaded PDF tasks, clears the map/pins/settings and collapses the controls. Close/reload the tab to release remaining browser-managed resources. This is not a secure memory-erasure promise.

## Limits

150 MB per input PDF; 250,000 candidate page pairs; 12 megapixels per rendered page; 1,500 extracted text lines per page; 200 MB of image data per full-PDF export. Split exceptionally large stacks. Only local, unencrypted PDFs are supported. Annotations/comments and interactive-form changes are outside scope. Review small engineering changes and ambiguous page mappings manually.
