# Development

## Requirements

- Node.js 24+ and npm.
- A Chromium browser. Windows defaults to installed Chrome; elsewhere the tests use Playwright's Chromium.
- Optional, only to regenerate fixtures: Python with ReportLab, and Poppler's `pdftoppm` on PATH. The fixtures are committed, so a normal build and test run needs neither.

## Install, build and test

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

The build writes to `dist/` by default; pass another destination with `node build.mjs path/to/output`. It emits a self-contained `Revision Lens.html` plus renderer license copies, and never copies test PDFs into the runtime build.

For the browser suites:

```sh
npx playwright install chromium
npm run test:browser
npm run test:batch
```

On Linux use `npx playwright install --with-deps chromium`. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. To pick Edge or another Chromium build:

```powershell
$env:REVISION_LENS_BROWSER = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm.cmd run test:browser
npm.cmd run test:batch
```

Both browser suites open the built HTML with networking disabled, exercise only the invented fixtures, and fail on an external HTTP request, a reachable network API or an uncaught page error. They write screenshots and sample exports to the project root; those scratch files are gitignored.

## Source map

| File | Responsibility |
|---|---|
| `source/app.mjs` | File intake, PDF.js setup, UI state, batch orchestration, sheet map and exports. |
| `source/matching.mjs` | Token normalization, similarity scoring and order-preserving alignment with pins. |
| `source/engine.mjs` | Pixel masks, region grouping, translation suggestion, line diff and split highlights. |
| `source/template.html` | Interface markup, the offline lock and the Content Security Policy. |
| `source/style.css` | All interface styling. |
| `build.mjs` | esbuild bundles, embedded renderer assets, worker offline lock, license copies. |
| `test-support.mjs` | Browser selection and fixture paths shared by the browser tests. |

## Keeping it offline

Two things must stay true, and the tests check both:

- `source/template.html` keeps `connect-src 'none'` in the Content Security Policy and the inline offline lock as the **first** script in the document.
- `build.mjs` prepends the same lock to the PDF worker bundle, because a worker has its own global scope.

PDF.js is configured with `useWorkerFetch: false` and a custom `BinaryDataFactory` that serves character maps, fonts and WASM from the embedded asset map, so no asset load ever resolves to a URL.

## Fixture regeneration

`python make_demo.py` builds the small drawing and report revision pair; `python make_batch_demo.py` builds the insertion, deletion, blank and scanned cases. Output goes to `test-fixtures/`, scratch images to the ignored `batch-fixture-images/`. The word “demo” survives only in those generator filenames — the app has no demo mode or bundled sample document.

## Release steps

1. Update the version in `package.json`, the version badge in `source/template.html` and `CHANGELOG.md` together.
2. Install from the lockfile, then run `npm test`, `npm run test:browser` and `npm run test:batch`.
3. Check insertion, deletion, equal-count edits, scans, blank ambiguity, pins, cancellation, the exports and the identical-document case.
4. Reopen the generated PDFs to confirm page counts and structure.
5. Rebuild `dist/`, keep the license files alongside it, and refresh the screenshots in `docs/images/`.
6. Package the standalone HTML with the documentation and licenses. Keep test fixtures out of the release.

## Continuous integration

`docs/ci-template.yml` is a ready-to-use GitHub Actions workflow that builds the app and runs the unit and offline browser suites against the committed fixtures. Copy it to `.github/workflows/ci.yml` to enable it.
