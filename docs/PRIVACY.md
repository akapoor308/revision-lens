# Privacy

Revision Lens runs entirely inside your browser. Nothing you open leaves your computer.

## How your files are handled

- You choose PDFs with the browser's file picker, or by dropping them on the page. They are read into memory and never uploaded.
- Rendering, page matching and comparison all happen in that browser tab.
- Exports are built in memory and handed to the browser as an ordinary download.
- The PDF renderer, its fonts, character maps and decoders are embedded in the single HTML file, so nothing is fetched while you work.
- Your original PDFs are never modified. The app never asks for write access to them.

## Why it cannot send anything

The app contains no network code, and two independent measures keep it that way:

1. A Content Security Policy of `connect-src 'none'` tells the browser to refuse every outbound connection from the page.
2. Before any other script runs, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `RTCPeerConnection`, `SharedWorker` and `navigator.sendBeacon` are replaced with functions that throw. The same lock is applied inside the PDF worker, which has its own global scope.

There is no account system, analytics, telemetry, cookie, `localStorage`, `IndexedDB`, service worker or upload endpoint. PDF JavaScript is disabled and annotations are not rendered. The automated browser tests open the built HTML with networking switched off and fail if a single HTTP request is attempted, or if any of those network APIs can still be called.

## What is outside the app

Everything the app does stays local, but the rest of your computer is not under its control:

- Where you save an export is your choice. If you pick a cloud-synced folder, your file sync will upload it.
- Browser extensions can read any page you open, including this one.
- Downloading the release needs internet access. Running it does not — you can disconnect first and it still works.

## Memory and clearing up

**Clear session** releases the loaded documents, the sheet map and the comparison. Closing or reloading the tab releases whatever the browser still holds. Exported files stay wherever you saved them.

## Opening PDFs you do not trust

Working offline does not make an unknown PDF safe. The app uses Mozilla's PDF.js at a pinned version with scripting disabled, but a PDF renderer is still a complex parser. Keep your browser up to date, and prefer a current release of the app.
