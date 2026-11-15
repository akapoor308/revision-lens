# Changelog

## 0.4.0

### Offline guarantee
- Replace `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `RTCPeerConnection`, `SharedWorker` and `navigator.sendBeacon` with functions that throw, before any other script runs, and apply the same lock inside the PDF worker. The Content Security Policy already refused outbound connections; nothing in the page can now attempt one.
- The offline browser test asserts that each of those APIs is unreachable and that the lock cannot be replaced, that the worker bundle carries the same lock, and, as before, that no HTTP request is attempted.

### Fixes
- Run PDF parsing in a real background worker. The embedded worker was a module worker started from a blob URL, which Chrome refuses on a `file://` page, so PDF.js silently fell back to parsing every page on the main thread — the cause of the interface locking up on large stacks. The worker is now a classic script handed to PDF.js as an explicit port, one per document, with the main-thread path kept only as a fallback. The browser test fails if the fallback is used.
- Disable the page selects, render quality, threshold, tolerance and alignment fields while a comparison runs. Changing them mid-run used to be dropped silently or saved against the wrong row; keyboard users could change them even though pointer events were blocked.
- Choosing a file during a run now says so instead of being ignored, and a non-PDF file is reported by name.
- Report a password-protected PDF as password-protected instead of as an unspecified parse failure.
- A text-extraction warning no longer overwrites a row's match verdict permanently; re-comparing the row clears it.
- Pinning a match now replaces the pins it conflicts with instead of failing and asking you to clear them by hand.
- Replacing one of the two files keeps the other document's page index instead of re-indexing both.
- Release each page's parser data after every comparison, not only during a batch run.
- Report unhandled promise rejections in the status line instead of losing them.
- Remove a dead error branch in the sheet map that could not be reached, and a duplicated CSV quoting helper.
- State one page-pair limit, 250,000, in the matcher, the interface and the documentation; the matcher previously claimed four million.

### Performance
- Precompute token weights, per-page weight totals and visual norms, so scoring a page pair no longer builds a set per pair: 5.7x faster matching on a 200-by-200 stack.
- Run the edge-tolerance maximum filter as two separable passes instead of a full window per pixel.
- Encode export images through `canvas.toBlob` instead of a base64 data URL, halving peak memory on large sheets.

### Usability
- Drop PDFs onto the file cards, or drop both anywhere on the page.
- **⇅ Swap original and revised** exchanges the two sides without reloading either file.
- Keyboard shortcuts: `1`/`2`/`3` for the three views, `n`/`p` for change regions, `[`/`]` for sheet map rows.
- Show each changed row's region and text-change counts in the sheet map.
- Name exports after the pages they cover, so saving several no longer overwrites one file.

### Documentation
- Rewrite the README, user guide, privacy notes and architecture notes in plain language, and drop the release-audit material.
- Merge the three stylesheets into one and delete the rules left over from the removed demo mode.

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
