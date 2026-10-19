# Validation snapshot: version 0.3.0

Date: 19 October 2026. All documents were fictional; no proprietary drawings/reports were supplied or accessed.

Standalone HTML SHA-256: 701998e538a6b0f930cbbeb1801685e05f369421037f630597b900b7225aafef

## Completed local checks

- **16 unit/matching tests passed:** pixel identity, additions/removals, exclusions, translation, line diff, edge tolerance, split-source highlighting, sequence insertion/deletion, equal-count edits, unmatched pages, duplicates, pins, normalization and blank review flags.
- **Chrome 155.0.8059.82:** interface regression and whole-document workflows passed with networking disabled, 0 HTTP(S) requests and 0 uncaught page errors.
- **Edge 155.0.4283.62:** the same interface and whole-document workflows passed with networking disabled, 0 HTTP(S) requests and 0 uncaught page errors.

The 0.3 interface tests explicitly verified no demo launcher/embedded-demo element, initially collapsed manual/alignment controls, and exactly three tabs: Overlay, Side by side and Text changes. Canvas inspection found 1561 red original-only pixels in the left pane and 4926 blue revised-only pixels in the right pane. Navigating a region retained split mode. Unit tests also verified that unchanged and opposite-side pixels are preserved.

Whole-document cases: 19 → 20 sheets with revised page 5 added and original 5 → revised 6; 19 → 18 with original page 5 removed and original 6 → revised 5; simultaneous insertion/removal with 19 sheets on both sides; pure-image 4 → 5 PDFs; 2 → 3 blank-page ambiguity; pinned corrections; identical-document zero differences; stopped indexing without a complete export. The full-stack workflow saved a 20-page comparison PDF and a map CSV with the expected offsets.

Other regressions exercised report text, local file replacement, translation suggestion, ignored-area drawing, selected PDF/PNG/CSV exports and session clearing. Raw JSON evidence is in [test-evidence/](test-evidence/). These are local headless-browser results, not a claim about every managed-browser configuration.

## Visual and PDF checks

The split-view screenshot and empty-state layout were inspected. Selected/exported PDFs were reopened with pypdf, and representative output pages were rendered with Poppler. The full comparison PDF contained 20 pages. Poppler's fixture environment reported an unavailable display font for an unused Symbol reference; visible inspected content rendered correctly.

## CI and limits

The optional workflow template in docs/ci-template.yml builds and runs the unit and offline browser suites on committed fictional fixtures once enabled by a maintainer. No hosted CI run was performed for this release; the results above are local checks.

No production speed benchmark, memory profile on large drawings, corporate managed-browser trial, security certification, OCR validation, annotation comparison or proprietary-document validation was performed. These checks do not establish general matching accuracy or detection of every engineering change. Use the [IT pilot criteria](IT-EVALUATION.md) before operational adoption.
