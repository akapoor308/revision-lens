# Third-party components

The standalone application embeds the PDF.js display and worker modules plus bundled character maps, fonts and WASM decoder data from **pdfjs-dist 6.4.299**. Source: https://github.com/mozilla/pdf.js ; distribution: https://www.npmjs.com/package/pdfjs-dist/v/6.4.299 .

PDF.js is copyright Mozilla Foundation and individual contributors, under Apache License 2.0. The original license headers are retained by the bundler. A complete license copy is in `licenses/PDFJS-APACHE-2.0.txt`.

The PDF.js distribution also includes component/asset licenses. Copies from the pinned distribution are provided under `licenses/`, including character maps, Foxit and Liberation fonts, OpenJPEG, JBIG2, and QCMS notices. Some notices are included conservatively for assets not used by this configuration. These files are not relicensed under the Revision Lens MIT license.

The build uses **esbuild** (MIT), the browser tests use **Playwright** (Apache 2.0), and the fixture generator uses **ReportLab**. None of these ship inside the application: an end user needs only the HTML file. Exact versions are recorded in `package-lock.json`.
