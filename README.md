# Revision Lens

**Compare PDF revisions locally, including inserted and removed drawing sheets.**

Revision Lens is a free, independent browser application for reviewing engineering drawings and part reports. Choose two PDFs, compare the whole stack, and follow the sheet map to the changes. The delivered HTML works offline without an installer, account, subscription or cloud service.

[Download the latest release](https://github.com/akapoor308/revision-lens/releases/latest) · [User guide](docs/USER-GUIDE.md) · [How it works](docs/ARCHITECTURE.md)

![Side-by-side PDF comparison with highlighted differences](docs/images/side-by-side.png)

## Start using it

1. Download and extract the release ZIP. Keep the license and documentation files with it.
2. Open **Revision Lens.html** in a current desktop Chrome or Edge browser.
3. Choose the original PDF and the revised PDF, then select **Compare all sheets**.
4. Select a row in **The sheet map**. Review any **Check match** flags before relying on the pairing.

No installation or internet connection is needed to use the extracted application. Your organisation may still restrict local HTML or JavaScript. Source PDFs are not modified. There is no demo flow or sample-PDF payload in the application; fictional PDFs in `test-fixtures/` are development tests only.

## Features

| Feature | Behaviour |
|---|---|
| Whole-document comparison | Indexes and compares every sheet, rather than requiring manual page-number selection. |
| Automatic page matching | Uses normalized text, visual fingerprints and document order. Insertions/removals receive explicit sheet-map rows. |
| Coloured overlay | Red marks original-only pixels; blue marks revised-only pixels. |
| Highlighted side-by-side view | Original-only changes appear in red on the left; revised-only changes appear in blue on the right. Region boxes appear in both panes. |
| Text changes | Lists extracted-line additions/removals for the selected sheet pair. |
| Match corrections | Flagged pairings can be inspected and pinned, then the stack rematched around the pins. |
| Alignment and filters | Shift, rotate, scale, suggest translation, adjust sensitivity and ignore rectangles. Controls start collapsed. |
| Exports | Selected-sheet PDF/PNG and text CSV; whole-document map CSV and multi-page comparison PDF. |
| Offline operation | PDF renderer, fonts, character maps and decoder assets are embedded in one HTML file. |

For example, if a 19-sheet drawing gains a sheet at revised page 5, the map can show an added page 5 and pair original page 5 with revised page 6, continuing through original 19 → revised 20. Equal total page counts can still contain both an insertion and a deletion.

Automatic pairing is heuristic. Blank, repeated, reordered or heavily revised sheets can need review. Similarity percentages are scores, not accuracy probabilities. Page-counter changes remain visible in the actual comparison even when they are ignored for page identity.

## Three review views

- **Overlay:** both revisions on one canvas, with changed pixels coloured and nearby changes grouped into regions.
- **Side by side:** synchronized page geometry with changes highlighted on each corresponding source. Change navigation stays in this view.
- **Text changes:** whitespace-normalized extracted-text additions/removals. No OCR or part-number matching is performed.

**Manual pairing & match corrections** and **Align & Filter** both start collapsed, keeping the everyday workflow compact. Per-sheet alignment and ignored regions are restored when you revisit a mapped row.

## Privacy and limits

PDFs are selected through the browser file picker and processed in browser memory. The app has no upload endpoint, analytics, CDN, account system, browser storage or service worker. A Content Security Policy blocks network connections. Downloading the release requires internet access; running the extracted app does not. See [Privacy and security](docs/PRIVACY-AND-SECURITY.md).

Review comparison results before engineering approval. Supported scope and limitations:

- Annotations/comments and interactive-form changes are outside the supported comparison scope.
- No OCR, CAD entity/intent recognition, logical table reconstruction, calibrated measurement or vector editing is provided.
- Grayscale pixel comparison can miss colour-only changes of similar luminance. Resolution, tolerance and ignored areas can hide small real changes.
- Matching preserves page order; moved sheets can appear as added/removed.
- Limits are 150 MB per input, 250,000 candidate page pairs, 12 megapixels per rendered sheet, 1,500 extracted lines per page, and 200 MB of image data per full PDF export.
- Large PDFs can pause the browser. Stop takes effect between processing steps, not during a long render.

Validate on internal known-change examples before operational use. Synthetic test success does not prove suitability for your company's documents.

## Build and test

End users do not need development tools. Developers need Node.js 24+. Run these commands from the repository root, or from `developer-source/` if using the packaged release ZIP:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

The standalone app is written to `dist/Revision Lens.html`; the repository also includes a prebuilt copy there. Build dependencies must first be downloaded; the resulting app needs no network access. To run the browser workflows on a machine without an installed Chrome:

```sh
npx playwright install chromium
npm run test:browser
npm run test:batch
```

Windows tests use installed Chrome by default. Set `REVISION_LENS_BROWSER` to an installed Chromium/Edge executable to choose another browser. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

See [Development](docs/DEVELOPMENT.md), [Architecture](docs/ARCHITECTURE.md), and [Validation](docs/VALIDATION.md) for details. An optional CI template is included for running the engine and offline browser workflows on fictional fixtures.

## Repository layout

```text
source/             Application, comparison engine, matcher, HTML and CSS
dist/               Prebuilt standalone application and renderer license files
docs/               User guide, architecture, privacy and validation
test-fixtures/      Fictional PDFs used only by automated tests
test-*.mjs          Pixel, matching and offline browser tests
build.mjs           Bundles renderer, worker and binary assets into the HTML
make_*.py           Optional fictional-fixture generators
licenses/           Third-party license copies
```

## License and project status

Custom application code is [MIT licensed](LICENSE). Bundled third-party components retain their own licenses; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and `licenses/`. There is no application license fee. Review, maintenance and any internal hosting can still cost company time or money.

Revision Lens was independently implemented. See [the changelog](CHANGELOG.md) for version history.
