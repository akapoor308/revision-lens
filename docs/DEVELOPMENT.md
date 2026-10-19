# Development

## Requirements

- Node.js 24+ and npm for build/tests.
- A Chromium browser. Windows tests default to installed Chrome; other platforms default to Playwright's installed Chromium.
- Optional fixture regeneration: Python with ReportLab and Poppler's `pdftoppm` on PATH. Existing fictional fixtures are committed, so normal build/test does not need Python.

## Install, build and test

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

The build defaults to `dist/`; a different destination can be passed with `node build.mjs path/to/output`. It emits a self-contained `Revision Lens.html` and renderer license copies. It never copies test PDFs into the runtime build.

For browser workflows on a machine without an installed supported browser:

```sh
npx playwright install chromium
npm run test:browser
npm run test:batch
```

On Linux CI, use `npx playwright install --with-deps chromium`. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. To select Edge or another Chromium installation:

```powershell
$env:REVISION_LENS_BROWSER = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm.cmd run test:browser
npm.cmd run test:batch
```

The browser tests open the local HTML with networking disabled, exercise only fictional fixtures, and fail on external HTTP(S) requests or uncaught page errors. They write screenshots, JSON evidence and export samples to the project root; these generated scratch files are ignored by Git. Reviewed evidence in `docs/test-evidence/` is a release snapshot, not an automatically updated assertion.

## Source map

| File | Responsibility |
|---|---|
| `source/app.mjs` | Local file loading, PDF.js setup, UI state, batch orchestration, mapping review and exports. |
| `source/matching.mjs` | Token normalization, similarity and order-preserving alignment with pins. |
| `source/engine.mjs` | Pixel masks, region grouping, translation suggestion, line diff and split highlights. |
| `source/template.html` | Three-tab interface, sheet map, collapsed controls and CSP. |
| `source/*.css` | Base layout, playful styling and compact-control/split-label overrides. |
| `build.mjs` | esbuild bundles plus embedded renderer assets; preserves required license headers. |
| `test-support.mjs` | Browser selection and fixture paths shared by browser tests. |

## Fixture regeneration

Run `python make_demo.py` for the small drawing/report revision pair and `python make_batch_demo.py` for insertion/deletion/blank/scanned cases. The latter renders temporary fictional pages using Poppler before creating pure-image fixtures. Files go to `test-fixtures/`; scratch image/PDF material goes to ignored `batch-fixture-images/`.

The word “demo” remains in the historical generator filename only. There is no demo runtime flow or embedded sample document.

## Release checklist

1. Update package version, UI version and changelog together.
2. Install from the lockfile; run unit/matching and both offline browser workflows.
3. Verify original-only and revised-only highlights in both split panes, including unchanged-source preservation and change navigation.
4. Check insert/delete, equal-count edits, scans, blank ambiguity, reviewer pins, cancellation, exports and identical-document cases.
5. Reopen generated PDFs to check structure/page counts; render representative exports and inspect the UI at the intended laptop viewport.
6. Rebuild `dist/`, retain app/dependency licenses, refresh release evidence/screenshots, and record SHA-256 checksums for downloads.
7. Package standalone HTML with documentation and licenses. Keep developer fixtures outside the runtime package. Publish only after repository/source review.

## Enable GitHub Actions

An optional workflow is provided in `docs/ci-template.yml`. To enable it, copy that file to `.github/workflows/ci.yml` using GitHub's web editor or a Git credential permitted to manage workflows. It uses read-only repository permissions, builds/tests against committed fictional fixtures, and does not deploy or upload office documents. Hosted CI was not enabled as part of the initial repository upload; local test evidence is recorded separately.
