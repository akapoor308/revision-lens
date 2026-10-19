# How Revision Lens works

## Runtime boundary

The app is a standalone HTML file. `build.mjs` bundles the custom JavaScript with PDF.js, a PDF worker module, fonts, character maps and decoder assets. A custom `EmbeddedBinaryDataFactory` supplies bytes from the embedded asset map. `useWorkerFetch` is false, so asset loading does not depend on network URLs. The worker is loaded from a Blob URL, with PDF.js main-thread fallback when local-file restrictions require it.

There is no application backend. Local file inputs produce in-memory byte arrays. Exports are Blob downloads. Development fixtures are not embedded or copied into the runtime build.

```mermaid
flowchart TD
  A[Original and revised PDF file inputs] --> B[PDF.js page text and thumbnail rendering]
  B --> C[Page fingerprints and text tokens]
  C --> D[Order-preserving sequence alignment]
  D --> E[Matched / added / removed sheet map]
  E --> F[Full-resolution rendering per map row]
  F --> G[Visual mask and extracted-line diff]
  G --> H[Overlay / highlighted side by side / text view]
  G --> I[Selected-page exports and complete PDF / CSV]
  J[Reviewer pins] --> D
```

## Page identity and similarity

`source/matching.mjs` handles pure matching logic; `indexDocument()` in `source/app.mjs` extracts features.

1. Render each page to a thumbnail no larger than 240 pixels on its longest side.
2. Crop the matching thumbnail to reduce page-edge counters/title-block influence. The crop starts at 5.5% X / 7.5% Y and covers 89% width / 81% height.
3. Resample the crop into a 24 × 24 grayscale-ink vector. This is a page-identity hint, not the change-detection resolution.
4. Extract text lines. For matching only, lowercase and normalize common page/sheet counters and revision labels; retain dimensions and part identifiers as tokens.
5. Weight tokens using their document frequency across both PDFs. Uncommon tokens contribute more than boilerplate. Text similarity is weighted Jaccard overlap; visual similarity is cosine similarity of the ink vectors.
6. When both pages have at least five tokens, similarity is 68% text + 32% visual. Otherwise use visual similarity. Apply a page-aspect-ratio penalty.

These weights are heuristic and are not trained confidence probabilities. Rotated/scaled/shifted scans, repeated templates and substantial redraws can need manual review.

## Sequence alignment and inserted/removed sheets

`alignPageScores()` uses dynamic programming across the original/revised similarity matrix. A pair is eligible above a minimum similarity of 0.56. Matched pairs contribute their similarity minus that threshold; gaps represent unmatched sheets. The global alignment maximizes accumulated pair value while preserving order.

This avoids comparing only equal page numbers. An inserted revised page creates a gap on the original side, allowing all later correspondences to shift by one. The same logic supports deletion or insertion and deletion within equal-length documents.

Valid reviewer pins split the sequence into constrained segments; the pinned pairs anchor the surrounding alignment. Pins must be one-to-one and preserve order. Reordered sheets are not solved as arbitrary permutations and can appear as removals/additions.

Pairs are flagged if similarity is below 0.76 or an alternative is within 0.045 of their score. Unmatched pages with a plausible alternative are also flagged. Blank/near-blank pages are flagged regardless of high visual similarity. A reviewer pin confirms a pair but does not validate engineering content.

## Visual comparison

`comparePixels()` in `source/engine.mjs` compares full-resolution renders for a mapped row. An absent page is represented by white. Pages share a canvas large enough for both without automatic scale normalization. Manual transforms apply to revised page B around its centre.

Pixels are converted to grayscale ink. A configurable maximum-neighbourhood operation implements 0/1/2-pixel edge tolerance. Ink differences beyond the chosen threshold become mask value 1 (original only) or 2 (revised only); excluded rectangles suppress visual changes there.

The overlay colours mask 1 red and mask 2 blue. Unchanged/within-tolerance content is grey. `highlightSide()` uses that same mask to tint only mask 1 on the original source and only mask 2 on the revised source. It preserves other source pixels, so the split view does not invent the missing geometry on the opposite side. Region outlines are drawn in both panes for context.

Region grouping connects occupied 40-pixel tiles, retaining clusters with at least eight changed pixels. Region counts are review-navigation aids, not counts of engineering edits. Smaller changed clusters can still contribute to pixel totals.

`suggestTranslation()` uses a downsampled distance-field search. It proposes translation only, with manual visual verification. It is not rotation/scale registration or CAD entity matching.

## Text comparison

Extracted items are assembled into lines using PDF text placement and end-of-line hints. Whitespace is normalized and an LCS-based line diff lists additions/removals. The limit is 1,500 lines per page. Reordered/reflowed tables are not interpreted as keyed rows; scanned/outlined text can yield no extracted lines.

Text comparison is independent of ignored rectangles and visual sensitivity. Matching normalization of counters/revision labels does not suppress their changes in the actual text/pixel comparisons.

## State, performance and export

Index features and map summaries are retained in memory. Detailed canvases are replaced/released between rows, rather than caching full-resolution images for an entire stack. Alignment/exclusions/settings are stored per mapped row. Stop requests are checked between steps; synchronous pixel work and long renders can delay them.

All-page PDF export rerenders rows sequentially using saved settings, then packages JPEG image pages into a PDF with explicit page objects and cross-reference offsets. Output is rasterized. The 200 MB image-data limit bounds that export's retained image buffers. No partial full-PDF file is saved after stopping. The sheet-map CSV includes incomplete/error states explicitly.

For limits and data boundaries see [Privacy and security](PRIVACY-AND-SECURITY.md). For measured tests and untested cases see [Validation](VALIDATION.md).
