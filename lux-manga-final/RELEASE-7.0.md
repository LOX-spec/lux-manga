# LUX LIBRARY 7.0

- Incremental catalogue rendering preserves existing card nodes on loading, append, and refresh; pagination records the current page before choosing the next URL and deduplicates IDs.
- Navigation uses one 180ms transition on the section strip, with no cloned page snapshots or staggered cover animations. Active tabs use their own button backgrounds.
- All discover tab merges stored manga, comics and novels. Source setup is manual only; the first-visit prompt no longer opens automatically.
- Sidebar brand moves to the topbar when collapsed and returns when expanded.
- Appearance has 15 preview cards, text-only scaling without page zoom, persistent 0–28px corners, and sliding checkbox switches.
- All ambient scenes are static. No Canvas engines start. New selected-scene photographs/illustrations are loaded from Unsplash; unavailable images retain the dark background. See BACKGROUND-CREDITS.md.
- Current release is 7.0; manual update checks display a spinner for at least 1.2 seconds and handle network errors.

## Essential QA

Passed: build, source chapter/parser tests, UX tests, automatic update tests, rapid tab/motion tests, pagination/deduplication/offline retention tests, and core application regression tests.

Browser at 1280px: Azora 40→80 works after Load More; all tab displays 80 loaded works; logo relocation works both ways; text at125% renders paragraph17.5px with page zoom1; corner22px survives reload; 15 palette cards; check spinner visible then latest-release message; zero ambient canvases or page ghosts. Search lies within viewport (378–788 of1280px). Console error list empty in the exercised flow.

Scope: essential tests only as requested. No exhaustive device matrix or every chapter/source/download was re-tested. External photo availability requires network and is not guaranteed offline. No Railway usage.
