# IT evaluation proposal

**Decision requested:** permit a limited pilot of a no-license-fee PDF revision comparison aid. It supplements the existing engineering review/release process.

## Business problem and proposed workflow

Reviewers compare drawing and part-report revisions in PDF form. Page-number pairing becomes cumbersome when sheets are inserted or removed. Revision Lens indexes and compares the full stack, proposes content-based correspondences, and exposes additions/removals and uncertain matches in a sheet map.

The user selects local original/revised PDFs, selects Compare all sheets, reviews the map and highlighted differences, corrects uncertain correspondences with pins when necessary, then optionally exports review results. Overlay, highlighted side-by-side and extracted-text views are available. Alignment/filter and manual correction controls start collapsed.

## Deployment and licensing

The runtime is one HTML file with its PDF renderer/assets embedded. No installer, administrator access, Power Platform subscription, account, paid comparison API or cloud upload service is required by the app. Browser policy may still prohibit local HTML. If necessary, IT can assess internal static hosting with separate deployment validation.

Custom application code is MIT licensed. PDF.js and bundled assets retain their component licenses. No Bluebeam source/binaries were used. There is no application license fee, but maintenance, security review and any internal hosting require company effort and possibly infrastructure expense.

## Data flow

```text
Selected local PDFs -> browser memory -> local rendering/matching/comparison
                                      -> optional browser downloads
```

The runtime has no upload endpoint, analytics or persistent browser storage. CSP blocks network connections. Offline browser tests observed no HTTP(S) requests. Validate the broader device boundary separately: browser extensions, monitoring software and synced download folders are outside the app's control.

## Capabilities and limitations

| Included | Outside supported scope |
|---|---|
| Whole-document matching and explicit inserted/removed rows | Guaranteed identity for blank/repeated/reordered/heavily revised sheets |
| Per-sheet overlay and highlighted side-by-side review | CAD entity/intent comparison or engineering correctness certification |
| Extracted-line additions/removals | OCR, part-number matching or tables reconstructed across page boundaries |
| Per-row alignment, sensitivity, exclusions and pinned matches | Calibrated measurement, vector editing or robust automatic rotation/scale registration |
| Selected-page and full-document exports | Layered/vector PDF output, enterprise identity, collaboration or audit trail |

PDF annotations/comments and interactive-form changes are outside scope. Colour-only changes of equal luminance can be missed. Small tolerances, dimensions and GD&T need deliberate resolution/sensitivity testing. Similarity is a heuristic score, not probability. Footers can change even when page correspondence is correct. Pins confirm correspondence only.

## Pilot acceptance criteria

1. Inspect source, pinned dependencies, licenses and vulnerability status. Offline processing does not establish that a PDF parser has no vulnerabilities.
2. Verify network/data boundaries on the intended managed browser and approved storage/download locations.
3. Prepare internal known-change fixtures covering insertions at start/middle/end, deletions, equal-count insertion/deletion, repeats, blanks, scans, small engineering details, annotations and reflowing reports. No proprietary files need leave the company.
4. Measure page-mapping accuracy separately from visual/text change detection. Review flags and test pins; record false positives and missed changes at selected settings.
5. Benchmark review time, peak memory and responsiveness against the existing tool on the same laptop and largest intended documents.
6. Verify incomplete/error runs cannot be accepted as complete, and review exports for page coverage, identifiers, settings and raster quality.
7. Assign maintenance ownership for PDF.js/browser updates, regression fixtures and incidents before wider use.

Suggested pitch: “We propose a controlled pilot of a local PDF comparator that automatically accounts for inserted and removed sheets. It has no application license fee or installer. Source, component licenses and fictional test evidence are supplied for IT inspection. We will validate mapping accuracy, detection and review time internally before wider adoption; the existing release/approval process remains authoritative during evaluation.”
