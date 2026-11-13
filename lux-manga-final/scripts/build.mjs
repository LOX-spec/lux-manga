import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSamplePages, novelPageView, samplePagePath } from './build-sample-reader.mjs';
import { normalizeRoute } from '../routing.js';

const output = 'public-build';
const { pages, coverAssets } = buildSamplePages();
const assetExtensions = new Set(['.html', '.js', '.css', '.svg', '.png', '.jpg', '.webmanifest', '.otf']);
const files = readdirSync('.', { withFileTypes: true })
  .filter(entry => entry.isFile() && (assetExtensions.has(extname(entry.name)) || entry.name === 'manifest.json'));
const fingerprint = createHash('sha256');
for (const { name } of files.sort((a, b) => a.name.localeCompare(b.name))) {
  fingerprint.update(name).update(readFileSync(name));
}
fingerprint.update(JSON.stringify(pages));
const buildId=fingerprint.digest('hex').slice(0,12);
mkdirSync(output, { recursive: true });
for (const { name } of files) {
  if (name === 'sw.js') continue;
  copyFileSync(name, output + '/' + name);
}
// Static entry points and server-rendered chapters use the same versioned offline cache.
const serviceWorker = readFileSync('sw.js', 'utf8')
  .replace(/lux-shell-v\d+/, 'lux-shell-vercel-' + buildId)
  .replace('const SAMPLE_PAGE_URLS = [];',
    `const SAMPLE_PAGE_URLS = ${JSON.stringify(Object.keys(pages))};\n${normalizeRoute}\n${samplePagePath}\n${novelPageView}`)
  .replace('const SAMPLE_COVER_URLS = [];',
    `const SAMPLE_COVER_URLS = ${JSON.stringify(Object.keys(coverAssets))};`);
writeFileSync(output + '/sw.js', serviceWorker);
writeFileSync(output+'/version.json',JSON.stringify({build:buildId,version:JSON.parse(readFileSync('package.json','utf8')).version.replace(/\.0$/, '')}));
console.log('Vercel public assets built in ' + output);
