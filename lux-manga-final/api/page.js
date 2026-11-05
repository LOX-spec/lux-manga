import { readFileSync } from 'node:fs';
import { buildSamplePages, novelPageView, samplePagePath } from '../scripts/build-sample-reader.mjs';
import { normalizeRoute } from '../routing.js';

const main = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const { pages, shells } = buildSamplePages();

export function GET(request) {
  const url = normalizeRoute(request.url);
  // The Vercel rewrite may pass the internal pathname to this handler.
  url.pathname = '/';
  const html = pages[samplePagePath(url)] ?? shells[novelPageView(url)] ?? main;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
  });
}

export function HEAD(request) {
  return new Response(null, { headers: GET(request).headers });
}
