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
const storageSource = 'globalThis.LUX_TEST_DEMOS=true;\n'+fs.readFileSync('novel-publications.js', 'utf8');
const samples = vm.runInNewContext(sampleSource + '\nNOVELS_DATA;');
const comicverse = vm.runInNewContext(fs.readFileSync('comicverse-data.js', 'utf8') + '\nLuxComicverse;', { URL });
assert.equal(comicverse.supports('https://arcomixverse.blogspot.com/2026/10/24.html'), true);
assert.equal(comicverse.supports('https://arcomixverse.blogspot.com.attacker.org/'), false);
assert.equal(comicverse.publisher(['Project', 'DC']), 'dc');
assert.equal(comicverse.publisher(['IMAGE']), 'image');
assert.equal(comicverse.number('العدد ٢٥٫١'), 25.1);
const feedEntry = index => ({ title: { $t: 'العدد ' + index }, category: [{ term: 'Chapter' }],
  link: [{ rel: 'alternate', href: comicverse.origin + '/2026/10/issue-' + index + '.html' }] });
let discovered = 0;
let nextFeed = comicverse.feedUrl('A / B', 1, true);
while (nextFeed) {
  const start = Number(new URL(nextFeed).searchParams.get('start-index'));
  const count = Math.min(100, 245 - start + 1);
  const result = comicverse.feed({ feed: { openSearch$totalResults: { $t: '245' },
    entry: Array.from({ length: count }, (_, index) => feedEntry(start + index)) } }, nextFeed);
  discovered += result.entries.length;
  nextFeed = result.next;
}
assert.equal(discovered, 245, 'issue feeds must continue beyond 200 entries');
assert.equal(comicverse.feed({ feed: { openSearch$totalResults: { $t: '5' } } }, comicverse.feedUrl()).next, '');
assert.equal(comicverse.feed({ feed: { entry: [{ title: { $t: 'Unsafe' }, link: [{ rel: 'alternate', href: 'javascript:alert(1)' }] }] } }, comicverse.feedUrl()).entries.length, 0);
const comicLibrary = vm.runInNewContext(fs.readFileSync('comics-model.js', 'utf8') + '\nLuxComicLibrary;');
const chapterLinksSource = fs.readFileSync('chapter-links.js', 'utf8');
const chapterLinks = vm.runInNewContext(chapterLinksSource + '\nLuxChapterLinks;', { URL });
assert.equal(chapterLinks.canonical('https://site.example/2026/01/1.html/?utm_source=test#page'), 'https://site.example/2026/01/1.html');
assert.equal(chapterLinks.canonical('https://site.example/series/1/'), 'https://site.example/series/1/');
assert.equal(chapterLinks.canonical('/reader.php?id=3', 'https://site.example/'), 'https://site.example/reader.php?id=3');
const legacyState = { books: [{id:'legacy',source:'https://site.example/series.html',chapters:[
  {url:'https://site.example/1.html/',number:1,title:'العدد 1',images:['page-1','page-2']},
  {url:'https://site.example/1.html',number:1,title:'العدد 1',images:[]},
  {url:'https://site.example/2.html/',number:2,title:'العدد 2',images:[]}
]}],progress:{legacy:{chapter:2,read:['https://site.example/1.html/','https://site.example/1.html']}},
downloads:{'https://site.example/1.html/':{bookId:'legacy',count:2}} };
assert.equal(chapterLinks.repairState(legacyState), true);
assert.equal(legacyState.books[0].chapters.length, 2);
assert.equal(legacyState.books[0].chapters[0].images.length, 2);
assert.equal(legacyState.progress.legacy.chapter, 1);
assert.equal(legacyState.progress.legacy.read.length, 1);
assert.equal(legacyState.downloads['https://site.example/1.html'].count, 2);
assert.equal(chapterLinks.repairState(legacyState), false, 'migration must be idempotent');
const scanContext = vm.createContext({URL,crypto,console,state:{books:[],progress:{},favorites:[],notifications:[],lists:{}},prefs:()=>({notify:false}),
  canonicalChapter:chapterLinks.canonical,listOf:()=>'',document:{addEventListener:()=>{}}});
vm.runInContext(chapterLinksSource + '\n' + fs.readFileSync('import.js','utf8'),scanContext);
const scanBook = {url:'https://site.example/series.html',title:'Series',kind:'كومكس',genres:[],chapters:[
  {url:'https://site.example/1.html',title:'1',number:1,images:[]},
  {url:'https://site.example/2.html',title:'2',number:2,images:[]}
]};
scanContext.payload=scanBook;
vm.runInContext("upsertWork(payload,'source')",scanContext);
vm.runInContext("state.progress[state.books[0].id]={chapter:1,read:[]};state.books[0].chapters[0].images=['cached-page']",scanContext);
scanContext.payload={...scanBook,chapters:scanBook.chapters.map(chapter=>({...chapter,url:chapter.url+'/'}))};
vm.runInContext("upsertWork(payload,'source')",scanContext);
assert.equal(scanContext.state.books[0].chapters.length,2,'repeated scans of equivalent URLs must not inflate counts');
assert.equal(scanContext.state.books[0].chapters[0].images[0],'cached-page');
assert.equal(scanContext.state.progress[scanContext.state.books[0].id].chapter,1);
const testComics = Array.from({length: 7}, (_, index) => ({ id: String(index), title: index === 0 ? 'أبطال اللّيل' : 'Hero ' + index,
  cover: '/cover.svg', siteId: index < 4 ? 'source-a' : 'source-b', publisher: index % 2 ? 'dc' : 'image',
  status: index % 2 ? 'مستمر' : 'مكتملة', genres: [index % 2 ? 'مغامرة' : 'خيال علمي'], rating: 9 - index,
  sourceUpdated: '2026-01-01', updated: '2026-12-01',
  chapters: index === 6 ? [] : [{ title: 'العدد الأول', number: 1, url: 'https://comic.example/' + index,
    published: '2026-01-0' + (index + 1) }] }));
assert.equal(comicLibrary.select(testComics, {query:'ابطال الليل'})[0].id, '0');
assert.deepEqual(Array.from(comicLibrary.select(testComics, {publisher:'indie',status:'مكتمل',genre:'خيال علمي',source:'source-a',readable:true}), book=>book.id), ['2','0']);
assert.equal(comicLibrary.select(testComics, {readable:true}).length, 6);
assert.equal(comicLibrary.select(testComics, {order:'updated'})[0].id, '5', 'published source dates must take precedence over local scan timestamps');
assert.equal(comicLibrary.featured(testComics).length, 5);
assert.ok(comicLibrary.featured(testComics).every(book => book.chapters.length));
assert.equal(comicLibrary.readingIndex(testComics[0], {'0':{chapter:999}}), 0);
assert.equal(comicLibrary.readingIndex(testComics[6], {}), -1);
assert.equal(comicLibrary.resume(testComics, {'0':{chapter:999}, '1':{chapter:0,time:'2026-01-01'}}).length, 1);
const duplicate = {...testComics[0],id:'duplicate'};
assert.equal(comicLibrary.latest([testComics[0], duplicate]).length, 1, 'shared issue links must not repeat in latest releases');
assert.equal(testComics[0].id, '0', 'sorting should not reorder saved library records');
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
    removeItem: key => records.delete(key),
    setItem: (key, value) => {
      if (typeof denyWrites === 'function' ? denyWrites(key, value) : denyWrites) throw new Error('Quota exceeded');
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

records.set('lux-sample-progress:v1:' + novel.id, '25.1');
records.set('lux-reader-bookmark:v1:' + novel.id, JSON.stringify({ chapter: '25.1', ratio: 0.5 }));
records.set('lux-novel-reader:v1', JSON.stringify({ theme: 'dark', font: 26, width: 50, spacing: 2.2 }));
const backup = JSON.parse(JSON.stringify(store.backup()));
const restoredRecords = new Map();
const restored = openStorage(restoredRecords);
await restored.restoreBackup(backup);
assert.equal(restored.catalogue().length, 5);
assert.equal(restored.catalogue().find(book => book.id === novel.id).chapters.length, 2);
assert.equal(restoredRecords.get('lux-sample-progress:v1:' + novel.id), '25.1');
assert.equal(JSON.parse(restoredRecords.get('lux-reader-bookmark:v1:' + novel.id)).ratio, 0.5);
assert.equal(JSON.parse(restoredRecords.get('lux-novel-reader:v1')).width, 50);
await restored.restoreBackup(backup);
assert.equal(restored.catalogue().length, 5, 'repeated imports must not duplicate books');
assert.throws(() => restored.restoreBackup({ ...backup, books: [{ id: 'broken' }] }), /غير صالح/);
const rollbackRecords = new Map(restoredRecords);
let writes = 0;
const rollback = openStorage(rollbackRecords, () => ++writes === 3);
const beforeFailure = [...rollbackRecords].sort();
await assert.rejects(rollback.restoreBackup(backup), /لم تكتمل/);
assert.deepEqual([...rollbackRecords].sort(), beforeFailure, 'partial restore must roll back');
assert.equal(store.previewContent('<script>alert(1)</script>')[0].text, '<script>alert(1)</script>');
assert.throws(() => store.previewContent('![unsafe](javascript:alert(1))'), /غير صالح/);

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.equal(config.routes, undefined);
for (const view of ['novels', 'novel', 'reader', 'admin']) {
  assert.ok(config.rewrites.some(rule => rule.has?.some(item => item.key === 'view' && item.value === view)));
}
for (const path of ['/', '/?view=novels', '/?view=admin', '/index.html']) {
  assert.match(await GET(request(path)).text(), /app-bootstrap\.js/);
}
for (const book of samples) {
  const detail = vm.runInNewContext(fs.readFileSync('novel-pages.js','utf8')+'\nLuxNovelPages;', {URL}).details(book);
  assert.match(detail, /id="novel-details"/);
  assert.match(await GET(request('/novel/'+book.id)).text(), /manifest\.json/);
  assert.match(detail, /id="novel-chapter-search"/);
  for (const chapter of book.chapters) {
    const html = vm.runInNewContext(fs.readFileSync('novel-pages.js','utf8')+'\nLuxNovelPages;', {URL}).reader(book,book.chapters.indexOf(chapter));
    assert.match(html, /id="reader-content"/);
    assert.match(html, /id="reader-width"/);
    assert.match(html, /id="reader-bookmark"/);
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
console.log('PASS: Comicverse publisher classification and paginated discovery beyond 200 issues; novels, publishing, backup/rollback, safe previews, reader controls, routes, manifest, and offline cache.');

