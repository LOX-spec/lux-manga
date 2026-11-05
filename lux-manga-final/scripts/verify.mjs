import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeRoute } from '../routing.js';
import { GET } from '../api/page.js';
import { POST } from '../api/source.js';
import { GET as getImage } from '../api/image.js';

const origin = 'https://lux.example.com';
const request = (path, init) => new Request(new URL(path, origin), init);
const sampleSource = fs.readFileSync('novels-demo.js', 'utf8');
const storageSource = fs.readFileSync('novel-publications.js', 'utf8');
const samples = vm.runInNewContext(sampleSource + '\nNOVELS_DATA;');
assert.equal(samples.length, 4);
for (const book of samples) {
  assert.ok(book.chapters.length >= 3);
  assert.match(fs.readFileSync('.' + book.cover, 'utf8'), /<svg/);
  for (const chapter of book.chapters) {
    assert.ok(chapter.text.length >= 6);
    assert.ok(chapter.text.join(' ').split(/\s+/).length >= 200);
  }
}

function openStorage(records = new Map(), denyWrites = false) {
  const queues = new Map();
  const storage = {
    get length() { return records.size; },
    key: index => [...records.keys()][index],
    getItem: key => records.get(key) ?? null,
    setItem: (key, value) => {
      if (denyWrites) throw new Error('Quota exceeded');
      records.set(key, value);
    }
  };
  const locks = {
    request: (key, operation) => {
      const next = (queues.get(key) || Promise.resolve()).then(operation);
      queues.set(key, next.catch(() => {}));
      return next;
    }
  };
  const context = vm.createContext({
    localStorage: storage, URL, crypto, navigator: { locks },
    window: { dispatchEvent: () => true }, Event
  });
  vm.runInContext(sampleSource + '\n' + storageSource, context);
  return vm.runInContext('LuxNovelPublications', context);
}

const records = new Map();
let store = openStorage(records);
assert.equal(store.catalogue().length, 4);
assert.ok(records.has('lux-novel-studio:seed:v1'));
const fields = { title: 'بحر المصابيح', author: 'مؤلف تجريبي', cover: '/moon-library-cover.svg',
  synopsis: 'قصة اختبار محلية.', genres: 'فانتازيا، مغامرة', status: 'مستمرة' };
const novel = await store.publishNovel(fields);
const longText = 'فقرة عربية واضحة ومريحة للقراءة. '.repeat(20000);
const chapter = await store.publishChapter({ bookId: novel.id, number: '٢٥٫١', title: 'الضوء',
  body: longText + '\n\n![صورة المشهد](/sample-reader-scene.svg)\n\nالنهاية.' });
assert.equal(chapter.number, 25.1);
store = openStorage(records);
let loaded = store.catalogue().find(book => book.id === novel.id);
assert.ok(loaded.chapters[0].content[0].text.length > 500000);
assert.equal(loaded.chapters[0].content[1].image, '/sample-reader-scene.svg');
await assert.rejects(store.publishChapter({ bookId: novel.id, number: '25.10', title: 'تكرار', body: 'نص' }), /مستخدم/);
const results = await Promise.allSettled([1, 2].map(() =>
  store.publishChapter({ bookId: novel.id, number: '2', title: 'فصل متزامن', body: 'نص مستقل' })));
assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
await store.publishChapter({ bookId: novel.id, number: '25.1', editing: '1', revision: '1',
  title: 'الضوء بعد التعديل', body: 'النص المعدّل.' });
await assert.rejects(store.publishChapter({ bookId: novel.id, number: '25.1', editing: '1', revision: '1',
  title: 'نسخة قديمة', body: 'نص' }), /تبويب آخر/);
const demo = store.catalogue().find(book => book.id === 1);
await store.publishNovel({ ...fields, id: '1', revision: '0', title: 'عهد الرماد بعد التعديل' });
assert.equal(store.catalogue().find(book => book.id === 1).chapters.length, demo.chapters.length);
await assert.rejects(store.publishNovel({ ...fields, id: '1', revision: '0' }), /تبويب آخر/);
await assert.rejects(openStorage(records, true).publishNovel(fields), /تعذّر الحفظ/);
records.set('lux-novel-studio:v1:book:broken', '{"title":');
assert.equal(openStorage(records).catalogue().length, 5);
records.delete('lux-novel-studio:v1:book:broken');

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.equal(config.routes, undefined);
for (const view of ['novels', 'novel', 'reader', 'admin']) {
  assert.ok(config.rewrites.some(rule => rule.has?.some(item => item.key === 'view' && item.value === view)));
}
for (const path of ['/', '/?view=novels', '/?view=admin', '/index.html']) {
  assert.match(await GET(request(path)).text(), /app-bootstrap\.js/);
}
for (const book of samples) {
  const detail = await GET(request('/novel/' + book.id)).text();
  assert.match(detail, /id="novel-details"/);
  assert.match(detail, /manifest\.json/);
  for (const chapter of book.chapters) {
    const html = await GET(request('/reader/' + book.id + '/' + chapter.number)).text();
    assert.match(html, /id="reader-content"/);
    assert.ok(html.includes(chapter.title));
  }
}
assert.equal(normalizeRoute(origin + '/reader/3/25.1').searchParams.get('chapter'), '25.1');
assert.doesNotThrow(() => normalizeRoute(origin + '/novel/%'));
assert.equal((await POST(request('/api/source', { method: 'POST', body: '{"url":"https://127.0.0.1/"}' }))).status, 400);
assert.equal((await getImage(request('/api/image?url=https://169.254.169.254/'))).status, 400);

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const bytes = fs.readFileSync('.' + icon.src);
  assert.equal(bytes.readUInt32BE(16) + 'x' + bytes.readUInt32BE(20), icon.sizes);
}
const handlers = {};
const cachesByName = new Map();
let online = true;
const keyOf = key => typeof key === 'string' ? key : key.url;
const cacheAPI = {
  open: async name => {
    if (!cachesByName.has(name)) cachesByName.set(name, new Map());
    const cache = cachesByName.get(name);
    return {
      put: async (key, value) => cache.set(keyOf(key), value.clone()),
      match: async key => cache.get(keyOf(key))?.clone(),
      keys: async () => [...cache.keys()],
      delete: async key => cache.delete(keyOf(key))
    };
  }
};
vm.runInNewContext(fs.readFileSync('public-build/sw.js', 'utf8'), {
  self: { location: { origin }, addEventListener: (name, handler) => handlers[name] = handler, skipWaiting: async () => {} },
  URL, Response, Request: class extends Request { constructor(path, init) { super(new URL(path, origin), init); } },
  caches: cacheAPI,
  fetch: async req => {
    if (!online) throw new Error('Offline');
    const url = new URL(req.url);
    if (url.origin !== origin) return new Response('cached-image', { headers: { 'Content-Type': 'image/png' } });
    if (url.pathname === '/' || url.pathname === '/api/page') return GET(req);
    return new Response(fs.readFileSync('public-build' + url.pathname));
  }
});
let install;
handlers.install({ waitUntil: promise => install = promise });
await install;
online = false;
for (const path of ['/?view=reader&id=3&chapter=1', '/reader/2/3', '/?view=reader&id=studio-test&chapter=25.1']) {
  let response;
  handlers.fetch({ request: request(path), respondWith: promise => response = promise });
  assert.equal((await response).status, 200);
}
online = true;
const imageRequest = new Request('https://images.example.org/scene.png');
Object.defineProperty(imageRequest, 'destination', { value: 'image' });
let response;
let saved;
handlers.fetch({ request: imageRequest, respondWith: promise => response = promise, waitUntil: promise => saved = promise });
assert.equal(await (await response).text(), 'cached-image');
await saved;
online = false;
handlers.fetch({ request: imageRequest, respondWith: promise => response = promise, waitUntil: () => {} });
assert.equal(await (await response).text(), 'cached-image');
console.log('PASS: four seeded novels and 16 complete chapters, persistence, long text, images, edits, conflicts, routes, manifest, and offline cache.');

