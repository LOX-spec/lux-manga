# Lux 4.2 — public sources and reading

## Included
- Updated overall UI and editorial comics hub, source ratings and real covers.
- Canonical chapter URLs and migration preserving cached images and reading position.
- Browser-style request headers; public DNS validation remains enabled.
- On HTTP 403/503 or a detected challenge: CorsProxy (when configured), AllOrigins, Jina, then WordPress manga feed and RSS for root URLs. Requests have time and size limits. No login, CAPTCHA solver, or guaranteed Cloudflare bypass.
- `CORSPROXY_KEY`: optional server environment variable. CorsProxy requires an account/key; no key is bundled. Public source URLs are sent to the fallback services. Never submit private or signed links.
- Same-window HTML/RSS import and quick work creation. Imported HTML is parsed inertly; scripts are not executed. Links found in an index may still require network access to retrieve individual chapters.
- Existing Madara/MangaStream/Blogger adapters plus RSS, WordPress JSON and Jina link normalization. Dynamic JavaScript-only content may require a dedicated connector. WordPress feeds currently expose only the page returned by that endpoint, not guaranteed complete archives.
- Four original illustrated demonstration works, three sample chapters each. They are clearly marked samples and reuse three local scene illustrations to demonstrate reading. They are not commercial manga or licensed chapters. Seed only once in a library without manga.
- Webtoon continuous scrolling and RTL single-page reading with saved mode, previous/next page buttons. Existing image proxy supplies same-origin referer headers for remote raster images. Source hotlink restrictions may still apply.

## Build and deploy
Use Node.js 24. Run `npm run build`. Vercel output: `public-build`; index.html and vercel.json are at the archive root. If replacing the contents of an existing `lux-manga-final` directory, keep Vercel Root Directory set to that directory. If uploading these files directly at repository root, clear Root Directory. Preserve the api and worker directories.

## Essential verification only
- `node scripts/verify-smart-import.mjs`: passed link cleanup, credential rejection, protection detection, alternative routes and simulated actual API 403 recovery.
- Browser: pasted mixed Arabic/link input and Madara fixture HTML, imported one work with two chapters without external fetching; passed.
- Browser: original sample images all loaded; RTL next page showed 2/3 with exactly one visible image; passed.
- Build and JavaScript syntax checks passed.
- Live successful scraping of olympustaff.com/hijala.com is not asserted. External proxies can deny requests, require keys or change their behavior.
- This archive is a source release. GitHub integration previously returned 403; this package does not claim a GitHub push or a new production deployment.
