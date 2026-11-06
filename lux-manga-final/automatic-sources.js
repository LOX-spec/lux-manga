const dexSite = 'mangadex-auto';
const dexId = (value, type) => {
  try {
    const url = new URL(value);
    const [, section, id] = url.pathname.split('/');
    return url.origin === 'https://mangadex.org' && section === type && /^[a-f0-9-]{36}$/i.test(id) ? id : '';
  } catch { return ''; }
};
async function dexRequest(action, id = '', offset = 0) {
  const params = new URLSearchParams({ action, id, offset });
  const response = await fetch('/api/mangadex?' + params, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'تعذر الاتصال بـ MangaDex.');
  return data;
}
let dexUpdate, dexLastAttempt = 0, dexStatus = 'تتحدث أحدث الفصول المترجمة تلقائيًا.';
async function updateDex() {
  if (!db || navigator.onLine === false) return;
  if (dexUpdate) return dexUpdate;
  if (Date.now() - dexLastAttempt < 300000) return;
  dexLastAttempt = Date.now();
  const library = state;
  dexUpdate = (async () => {
    try {
      const { books } = await dexRequest('latest');
      if (state !== library) return;
      for (const book of books) {
        const saved = upsertWork(book, dexSite);
        saved.updated = book.chapters.reduce((latest, chapter) => chapter.published > latest ? chapter.published : latest, '');
      }
      dexStatus = books.length ? 'أحدث الفصول المترجمة من MangaDex · عربي وEnglish' : 'لم ترسل MangaDex فصولًا مطابقة الآن.';
      await save();
    } catch {
      dexStatus = 'تعذر تحديث MangaDex الآن. تبقى الأعمال المحفوظة متاحة.';
    } finally {
      dexUpdate = null;
      if (['home','catalog','new','updates'].includes(view)) render();
    }
  })();
  return dexUpdate;
}

const previousReaderLoad = loadChapter;
loadChapter = async function(chapter, options) {
  const id = dexId(chapter.url, 'chapter');
  if (!id) return previousReaderLoad(chapter, options);
  if (chapter.images?.length && (state.downloads[chapter.url] || Date.now() - (chapter.pagesFetchedAt || 0) < 600000)) return chapter;
  const { images } = await dexRequest('pages', id);
  if (!images.length) throw Error('لا توجد صور متاحة لهذا الفصل على MangaDex.');
  chapter.images = images;
  chapter.pagesFetchedAt = Date.now();
  await save();
  return chapter;
};

async function refreshDexBook(book) {
  let offset = 0;
  do {
    const result = await dexRequest('chapters', dexId(book.source, 'title'), offset);
    upsertWork({ ...book, url: book.source, chapters: result.chapters }, dexSite);
    offset = result.next;
  } while (offset !== null && offset < 500);
  await save();
  return book;
}
const previousDetail = detail;
detail = function(id) {
  previousDetail(id);
  const book = get(id);
  if (book?.siteId !== dexSite || Date.now() - (book.dexCheckedAt || 0) < 300000) return;
  book.dexCheckedAt = Date.now();
  refreshDexBook(book).then(() => {
    const modal = $('#modal');
    if (modal?.open && modal.querySelector('[data-refresh="' + id + '"]')) previousDetail(id);
  }).catch(() => { book.dexCheckedAt = 0; });
};

async function fetchPublicFeed(url) {
  const response = await fetch('/api/source', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, feedOnly: true }), signal: AbortSignal.timeout(19000)
  });
  if (!response.ok) return null;
  return response.json();
}
const feedText = value => new DOMParser().parseFromString(value || '', 'text/html').body.textContent.trim();
function feedRecords(data, type) {
  if (!data) return [];
  let items;
  try { items = JSON.parse(data.content); } catch {}
  if (!Array.isArray(items)) {
    const doc = new DOMParser().parseFromString(data.content, 'application/xml');
    items = [...doc.querySelectorAll('rss channel item, feed > entry')].map(item => ({
      link: item.querySelector('link[href]')?.getAttribute('href') || item.querySelector('link')?.textContent,
      title: { rendered: item.querySelector('title')?.textContent },
      excerpt: { rendered: item.querySelector('description, summary')?.textContent },
      content: { rendered: [...item.children].find(node => node.localName === 'encoded' || node.localName === 'content')?.textContent },
      date: item.querySelector('pubDate, published, updated')?.textContent
    }));
  }
  return items.slice(0, 100).flatMap(item => {
    const url = safeLink(item.link, data.url);
    const title = feedText(item.title?.rendered);
    if (!url || !title || new URL(url).origin !== new URL(data.url).origin) return [];
    const html = item.content?.rendered || '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const reader = doc.querySelector('.reading-content, #readerarea, .chapter-content, .entry-content');
    const isChapter = /chapter|الفصل|الحلقة/i.test(title + ' ' + url);
    const images = [...new Set([...(reader || (isChapter ? doc.body : null))?.querySelectorAll('img') || []].map(img => imageURL(img, url)).filter(Boolean))];
    const text = type === 'novels' ? [...doc.querySelectorAll('p')].map(node => node.textContent.trim()).filter(Boolean) : [];
    const cover = safeLink(item._embedded?.['wp:featuredmedia']?.[0]?.source_url, url) || imageURL(doc.querySelector('img'), url);
    return [{ url, title, description: feedText(item.excerpt?.rendered), cover, genres: [],
      kind: type === 'novels' ? 'رواية' : type === 'comics' ? 'كومكس' : /manhwa|مانهوا/i.test(title) ? 'مانهوا' : 'مانجا',
      chapters: images.length || text.length ? [{ url, title, number: 1, images, ...(text.length ? { text } : {}) }] : [],
      published: String(item.date || '').slice(0, 10) }];
  });
}

const feedScans = new Map();
function refreshExternalFeed(site) {
  if (feedScans.has(site.id)) return feedScans.get(site.id);
  const run = (async () => {
    const base = site.url;
    const paths = ['/wp-json/wp/v2/manga?per_page=30&_embed=1', '/wp-json/', '/feed/'];
    const data = await Promise.all(paths.map(path => fetchPublicFeed(new URL(path, base)).catch(() => null)));
    let routes = [];
    try {
      routes = Object.keys(JSON.parse(data[1]?.content).routes || {}).filter(route =>
        /^\/wp\/v2\/(?:manga|manhwa|manhua|wp-manga|comics?|novels?)$/.test(route) && route !== '/wp/v2/manga');
    } catch {}
    const extra = await Promise.all(routes.slice(0, 3).map(route =>
      fetchPublicFeed(new URL('/wp-json' + route + '?per_page=30&_embed=1', base)).catch(() => null)));
    const found = new Map();
    for (const page of [data[2], ...extra, data[0]]) {
      for (const book of feedRecords(page, site.contentType)) {
        const old = found.get(book.url);
        found.set(book.url, old?.chapters.length && !book.chapters.length ? { ...book, chapters: old.chapters } : book);
      }
    }
    if (!found.size) throw Error('لم نجد أعمالًا في خلاصات عامة لهذا المصدر. استخدم الاستيراد البديل إذا كانت الخلاصات محجوبة أو غير مفعّلة.');
    if (!state.sites.includes(site)) state.sites.push(site);
    for (const work of found.values()) {
      const book = upsertWork(work, site.id);
      book.contentType = site.contentType;
      for (const chapter of work.chapters) {
        const saved = book.chapters.find(item => item.url === canonicalChapter(chapter.url));
        if (saved && chapter.images.length && !saved.images.length) saved.images = chapter.images;
        if (saved && chapter.text?.length) saved.text = chapter.text;
      }
    }
    site.status = 'ready';
    site.feedOnly = true;
    site.queue = [];
    site.lastCheck = new Date().toISOString();
    site.discoveryError = '';
    await save();
    return found.size;
  })().finally(() => feedScans.delete(site.id));
  feedScans.set(site.id, run);
  return run;
}

addSite = async function(value) {
  try {
    const url = new URL(cleanSourceInput(value)).origin + '/';
    let contentType = $('#sourceType')?.value;
    if (!contentType || contentType === 'auto') contentType = view === 'novels' ? 'novels' : ['comics','dc','marvel','comic-other'].includes(view) ? 'comics' : 'manga';
    const site = state.sites.find(item => item.url === url && item.contentType === contentType) ||
      { id: 's' + crypto.randomUUID(), url, entryUrl: url, name: new URL(url).hostname, contentType, queue: [], seen: [], failed: [], done: 0 };
    const count = await refreshExternalFeed(site);
    $('#modal').close();
    go('sites');
    toast('استُورد ' + count + ' عمل من الخلاصات العامة.');
  } catch (error) {
    if ($('#smartImport')) $('#smartImport').open = true;
    throw error;
  }
};

const previousRefresh = refreshBook;
refreshBook = async function(id) {
  const book = get(id);
  if (book?.siteId === dexSite) return refreshDexBook(book);
  const site = state.sites.find(item => item.id === book?.siteId && item.feedOnly);
  if (site) { await refreshExternalFeed(site); return get(id); }
  return previousRefresh(id);
};

const previousRunImport = runImport;
runImport = async function(id) {
  const site = state.sites.find(item => item.id === id);
  if (!site?.feedOnly) return previousRunImport(id);
  try { await refreshExternalFeed(site); }
  catch (error) { site.status = 'partial'; site.discoveryError = error.message; await save(); toast(error.message); }
  finally { render(); }
};

const previousAutoRender = render;
render = function() {
  previousAutoRender();
  if (['home','catalog','new','updates'].includes(view)) {
    $('#page')?.insertAdjacentHTML('afterbegin', '<p class="note" role="status">' + esc(dexStatus) + '</p>');
    if (db) void updateDex();
  }
};
setInterval(() => {
  if (!document.hidden && ['home','catalog','new','updates'].includes(view)) void updateDex();
}, 300000);
