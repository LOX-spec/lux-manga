# LUX8.0 — BYOS candidate (not production-approved)

## Files
- reader-local.js: natural sorting, bounded ZIP extraction, URL ownership and PDF loading.
- byos-ui.js: local file/drop entry points; source-list JSON merge/export; safe RSS/OPDS link catalogue. Files never enter state.books or upload endpoints. PDF bitmap rendering is serialized and requested near visible pages.
- reader-comfort-plus.js: image-only brightness50–100 and sepia0–45; next4 preloading; exact chapter offset/ratio; auto-scroll5–150px/sec with manual stop and cleanup. Preferences are local.
- lux-source-bridge.user.js: optional manually installed client script, fixed configurable domain, confirmation and anonymous requests; no server bypass. Not installed or tested against a real external domain.
- app.js/comfort-reader.js: local blob URLs bypass network proxies; local readers close without looking up a saved book; local PDFs release tasks and URLs on close.
- install.js: defer automatic application updates while a local file is open.
- build/SW/manifest: standalone home launch; vendored lazy reader assets fetched at build from exact version/hash and cached after first use. Initial local PDF use needs an online preparation of the libraries.

## Required QA status
| Test | Status | Evidence / limitation |
|1 ZIP/PDF/order/cleanup|PARTIAL|Real ZIP extracted1/2/10;3 URLs revoked once. Real PDF3 pages parsed1/2/10 and PDF loading task destroyed. PDF raster rendering and local file-picker/drop flow are NOT browser verified.|
|2 source JSON|PASS (unit)|Roundtrip, malformed structure/JSON, unsafe URLs rejected before mutation.|
|3 filters|PASS (unit); browser pending|Actual comfort script in DOM fixture applies brightness.75/sepia.2 to images, leaves toolbar unaffected, reloads persisted values.|
|4 preload/memory/auto|PASS (unit); browser pending|Actual comfort script marks current+4 eager; saves777px, restores600px, advances auto-scroll and stops on wheel/explicit toggle. Browser layout-dependent restoration still pending.|
|5 PWA|PARTIAL|Manifest standalone/icons and SW cache paths validated. Actual browser registration/offline runtime not verified in this turn.|
|6 Console/responsive|BLOCKED|Automatic approval review rejected reading the unrelated existing Chrome Gemini Notebook window. Awaiting permission to open an isolated test window. No0-errors claim or mobile/desktop success claim is made.|

Automated core application, UX, viewport, updates, archive, source validation and comfort tests passed. Node PDF parser emitted optional canvas/Path2D warnings; it was used for parsing only.

## Browser QA
After build run node scripts/prepare-browser-qa.mjs, start a fresh-port preview, then open /byos-qa.html. The harness uses synthetic ZIP/PDF fixtures through the real local file input and the application in390px/1200px iframe widths. It records failures rather than hiding them. This harness has NOT yet been executed in a browser.

Production remains7.6 pending browser QA. No Railway resources, browser solvers or source additions. No library schema migration or user-file uploads.
