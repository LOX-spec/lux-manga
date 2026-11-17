# LUX LIBRARY 7.1 — ready external sources

Added Toon Arab and Manga Arabia cards to source management and the Add Source dialog. Both explicitly open external reading sites; neither is advertised as an in-app chapter importer. Azora remains the in-app manga source. No records or mock chapters are inserted.

Each card has an availability check. The endpoint accepts two fixed IDs only, performs a single bounded request without redirect following, and reports blocked/timeout conditions without bypass or automatic retries. Reading links remain available even if checks fail.

## Essential QA (18 November 2026)
- Both official homepages returned HTTP200 in the initial public connection test.
- Toon Arab /feed/ and /wp-json/ returned404. No supported public feed was discovered by that test. This is not proof that no integration exists anywhere.
- Local browser: both cards visible in sources and Add Source; Manga Arabia check succeeded; Toon Arab check timed out and displayed the fallback correctly; no console errors in this flow. Chapter indexes/images were not imported or tested as an in-app reader source.
- Build, source-health allowlist/403/429/404/redirect/offline tests, UX and update regression tests passed.
- No Railway or bypass tooling used.
