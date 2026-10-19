# Privacy and security boundary

## What the app does

- Reads only PDFs selected through the browser file inputs into memory.
- Renders, indexes, matches and compares them in that browser session.
- Creates downloads when the user chooses an export action.
- Embeds renderer code/assets so runtime use does not need a CDN or API.
- Uses a Content Security Policy with `connect-src 'none'` and no upload feature.

It has no account system, analytics, cookies, localStorage, IndexedDB or service worker. PDF scripting is not exposed by the app. Annotations/comments are excluded from rendering. The app does not obtain file-system write handles for the source PDFs and does not modify them.

Obtaining the app from GitHub and installing development dependencies require network access. Running the extracted standalone HTML is designed to work with networking disabled. Offline browser tests observe HTTP(S) requests and fail if any are attempted.

## What this does not guarantee

Browser extensions, device management/monitoring, antivirus, cloud-synced folders and the operating system operate outside this app's control. The default download location might be cloud-backed. IT should validate those boundaries on the actual managed devices.

Clearing the session releases loaded document tasks and application references; closing/reloading the tab releases remaining browser-managed resources. This is not guaranteed secure memory erasure. Export files remain wherever the browser saved them.

An offline app still parses complex document formats. Do not treat offline operation as proof that arbitrary PDFs are harmless or that the renderer has no vulnerabilities. The project includes pinned dependencies and licenses for review; maintainers should monitor PDF.js and browser updates. These checks are not a penetration test, vulnerability certification or engineering validation.

## Permissions and distribution

The runtime requires a modern browser with JavaScript, canvas, Blob URLs, local file-input access and downloads. Corporate policy may block local HTML or workers. The app does not require administrator access, an installer or a cloud subscription. IT can assess an internal static host if local-file use is prohibited; that deployment needs separate validation.

The production HTML contains no sample PDFs or demo launcher. `test-fixtures/` contains only invented data for development tests. Never commit proprietary drawings/reports to this public repository or use them as issue attachments.

## Reporting a problem

For usability or matching problems, describe browser/version, relevant settings and expected mapping using fictional or approved sanitized examples. Do not upload confidential documents. If a vulnerability could expose sensitive data, use GitHub's private vulnerability-reporting channel if enabled, or an established private contact with the maintainer; do not publish exploit details in a public issue before coordination.
