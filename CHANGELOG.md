# Changelog

## 0.3.0

- Remove the application demo flow, buttons and embedded sample PDFs. Fictional fixtures remain development-only.
- Make Align & Filter initially collapsed, alongside manual pairing/corrections.
- Keep three tabs: Overlay, Side by side and Text changes. Remove separate Original/Revised tabs.
- Highlight original-only pixels red on the left and revised-only pixels blue on the right in side-by-side view; show corresponding region outlines in both panes.
- Preserve side-by-side mode while navigating change regions.
- Add pane labels, clear split-view render caches when results change, and collapse controls when a session is cleared.
- Publish source, architecture/privacy/user documentation, pinned build dependencies and offline browser regression tests.

## 0.2.0

- Whole-document comparison and content/order-based page matching.
- Explicit added/removed-sheet rows, including equal-count insertion/deletion cases.
- Match-review flags, pinned corrections, per-row settings and a filterable sheet map.
- Complete comparison PDF and sheet-map CSV exports, progress/stop controls.
- Warmer, more playful interface with a neutral drawing canvas.

## 0.1.0

- Local selected-page overlay, side-by-side view and extracted-line comparison.
- Alignment controls, sensitivity, ignored areas and selected-page exports.
- Self-contained offline HTML application with PDF.js assets embedded.
