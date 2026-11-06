const dexSite = 'mangadex-auto';
function allowedCachedWork(book) {
  return book.siteId !== dexSite || mangaHub.adult || (!book.dexBlocked && !book.adultContent &&
    (!book.contentRating || ['safe', 'suggestive'].includes(book.contentRating)) &&
    !(book.genres || []).some(tag => /^hentai$/i.test(tag.trim())));
}
function storeDexWork(work) {
  const book = upsertWork(work, dexSite);
  if (Array.isArray(work.translationLanguages)) book.translationLanguages = work.translationLanguages;
  if (work.contentRating) book.contentRating = work.contentRating;
  if (typeof work.adultContent === 'boolean') {
    book.adultContent = work.adultContent;
    book.dexBlocked = false;
  }
  return book;
}
const dexId = (value, type) => {
  try {
    const url = new URL(value);
    const [, section, id] = url.pathname.split('/');
    return url.origin === 'https://mangadex.org' && section === type && /^[a-f0-9-]{36}$/i.test(id) ? id : '';
  } catch { return ''; }
};
async function dexRequest(action, id = '', offset = 0, language = '', q = '', { type = '', since = '' } = {}) {
  const params = new URLSearchParams({ action, id, offset, language, q, type, since });
  if (mangaHub.adult) params.set('adult', '1');
  const response = await fetch('/api/mangadex?' + params, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(Error(data.error || 'تعذر الاتصال بـ MangaDex.'), { status: response.status });
  return data;
}
let dexUpdate, dexLastAttempt = 0, dexStatus = 'تتحدث أحدث الفصول المترجمة تلقائيًا.';
async function updateDex() {
  if (!db || navigator.onLine === false) return;
  if (dexUpdate) return dexUpdate;
  if (Date.now() - dexLastAttempt < 300000) return;
  dexLastAttempt = Date.now();
  const library = state;
  const language = mangaHub.language;
  const adult = mangaHub.adult;
  dexUpdate = (async () => {
    try {
      const { books } = await dexRequest('latest', '', 0, language);
      if (state !== library || language !== mangaHub.language || adult !== mangaHub.adult) return;
      for (const book of books) {
        const saved = storeDexWork(book);
        saved.updated = book.chapters.reduce((latest, chapter) => chapter.published > latest ? chapter.published : latest, '');
      }
      dexStatus = books.length ? 'أحدث الفصول من MangaDex' : 'لم ترسل MangaDex فصولًا مطابقة الآن.';
      await save();
    } catch {
      dexStatus = 'تعذر تحديث MangaDex الآن. تبقى الأعمال المحفوظة متاحة.';
      flagDexOutage();
    } finally {
      dexUpdate = null;
      if (['home','catalog','new','updates'].includes(view)) render();
    }
  })();
  return dexUpdate;
}

const previousReaderLoad = loadChapter;
async function fetchDexPages(chapter) {
  const { images } = await dexRequest('pages', dexId(chapter.url, 'chapter'));
  if (!images.length) throw Error('لا توجد صور متاحة لهذا الفصل على MangaDex.');
  chapter.images = images;
  chapter.pagesFetchedAt = Date.now();
  chapter.fullManifest = 2;
  await save();
  return images;
}

loadChapter = async function(chapter, options) {
  const id = dexId(chapter.url, 'chapter');
  if (!id) return previousReaderLoad(chapter, options);
  if (chapter.images?.length && (state.downloads[chapter.url] || (chapter.fullManifest === 2 && Date.now() - (chapter.pagesFetchedAt || 0) < 600000))) return chapter;
  try { await fetchDexPages(chapter); }
  catch (error) {
    if (error.status !== 403) flagDexOutage();
    throw error;
  }
  return chapter;
};

function bindDexReaderImages(chapter) {
  const container = $('#modal .manga-reader');
  let refreshed;
  const refresh = () => refreshed ??= fetchDexPages(chapter);
  container.querySelectorAll('.manga-page').forEach((page, index) => {
    const img = page.querySelector('img');
    const message = page.querySelector('.image-failure');
    const retry = message.querySelector('button');
    let attempt = 0;
    async function recover() {
      if (!img.getAttribute('src')) return;
      if (attempt++ === 0 && navigator.onLine !== false && !img.getAttribute('src').startsWith('/api/image?')) {
        img.src = proxy(chapter.images[index]);
        return;
      }
      if (attempt <= 2 && navigator.onLine !== false) {
        attempt = 3;
        try {
          const images = await refresh();
          if (!img.isConnected) return;
          if (images[index]) {
            img.src = images[index];
            message.querySelector('a').href = images[index];
            return;
          }
        } catch {}
      }
      img.hidden = true;
      message.hidden = false;
      flagDexOutage();
    }
    img.addEventListener('error', recover);
    img.addEventListener('load', () => { img.hidden = false; message.hidden = true; });
    retry.onclick = () => {
      refreshed = undefined;
      attempt = 1;
      message.hidden = true;
      img.hidden = false;
      void recover();
    };
  });
}

async function refreshDexBook(book) {
  const catalog = state;
  const adult = mangaHub.adult;
  let offset = 0;
  let result;
  const chapters = [];
  do {
    try { result = await dexRequest('chapters', dexId(book.source, 'title'), offset); }
    catch (error) {
      if (error.status === 403 && state === catalog) { book.dexBlocked = true; await save(); }
      throw error;
    }
    chapters.push(...result.chapters);
    offset = result.next;
  } while (offset !== null && offset < 500);
  if (state !== catalog || adult !== mangaHub.adult || !get(book.id)) return book;
  const saved = storeDexWork({ ...book, url: book.source, chapters });
  saved.dexAvailability = {
    total: result.total, complete: result.complete,
    arabic: chapters.filter(item => item.language === 'ar').length,
    other: chapters.filter(item => item.language !== 'ar').length
  };
  saved.dexCheckedAt = Date.now();
  await save();
  return saved;
}
const previousDetail = detail;
detail = function(id) {
  previousDetail(id);
  const book = get(id);
  if (book?.siteId !== dexSite || Date.now() - (book.dexCheckedAt || 0) < 300000) return;
  refreshDexBook(book).then(() => {
    const modal = $('#modal');
    if (modal?.open && modal.querySelector('[data-refresh="' + id + '"]')) previousDetail(id);
  }).catch(error => {
    book.dexCheckedAt = 0;
    const status = $('#modal #studioChapters');
    if ($('#modal')?.open && $('#modal').querySelector('[data-refresh="' + id + '"]') && status) {
      if (error.status === 403) { $('#modal').close(); render(); }
      else if (!book.chapters.length) status.textContent = error.message;
    }
    if (error.status !== 403) flagDexOutage();
  });
};

async function fetchPublicFeed(url, useProxy = false) {
  const response = await fetch('/api/source', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, feedOnly: !useProxy }), signal: AbortSignal.timeout(useProxy ? 45000 : 19000)
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
    const data = await Promise.all(paths.map(path => fetchPublicFeed(new URL(path, base), site.useFeedProxy).catch(() => null)));
    let routes = [];
    try {
      routes = Object.keys(JSON.parse(data[1]?.content).routes || {}).filter(route =>
        /^\/wp\/v2\/(?:manga|manhwa|manhua|wp-manga|comics?|novels?)$/.test(route) && route !== '/wp/v2/manga');
    } catch {}
    const extra = await Promise.all(routes.slice(0, 3).map(route =>
      fetchPublicFeed(new URL('/wp-json' + route + '?per_page=30&_embed=1', base), site.useFeedProxy).catch(() => null)));
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
    site.useFeedProxy = $('#sourcePreset')?.value === 'proxy';
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
    if (db && view !== 'catalog') void updateDex();
  }
};
setInterval(() => {
  if (!document.hidden && ['home','new','updates'].includes(view)) void updateDex();
}, 300000);

function dexChapterLabel(book) {
  const status = book.dexAvailability;
  if (status?.total === 0 && status.complete) return 'لا يوجد فصول';
  const chapters = book.chapters || [];
  const arabic = status?.arabic ?? chapters.filter(isArabicDexChapter).length;
  const other = status?.other ?? chapters.length - arabic;
  const partial = !status?.complete ? ' على الأقل' : '';
  if (arabic) return 'متاح ' + arabic + ' فصل بالعربية' + partial + (other ? ' · ' + other + ' بلغات أخرى' : '');
  if (other) return 'متاح ' + other + ' فصل بلغات أخرى' + partial;
  return status?.complete ? 'الفصول مسجلة لكن القراءة غير متاحة في لوكس' : 'لم يُتحقق من الفصول بعد';
}

let dexHealthStarted = false, dexHealthRunning = false, dexHealthFailed = false, dexHealthRetry;
function flagDexOutage() {
  dexHealthFailed = true;
  if (!dexHealthRetry && navigator.onLine !== false) dexHealthRetry = setTimeout(monitorDexHealth, 30000);
}
async function monitorDexHealth() {
  if (dexHealthRunning || !db) return;
  clearTimeout(dexHealthRetry);
  dexHealthRetry = null;
  if (navigator.onLine === false) { dexHealthFailed = true; return; }
  dexHealthRunning = true;
  try {
    const session = $('#modal')?.open && readerSession;
    const chapter = session && get(session.id)?.chapters[session.ch];
    const health = await dexRequest('health', chapter ? dexId(chapter.url, 'chapter') : '');
    if (!health.api || !health.images) throw Error('MangaDex service unavailable');
    if (dexHealthFailed) {
      dexHealthFailed = false;
      const modal = $('#modal');
      if (modal?.open) {
        modal.querySelectorAll('.image-failure:not([hidden]) button').forEach(button => button.click());
        if (session && readerSession === session && get(session.id)?.siteId === dexSite && !modal.querySelector('.manga-reader')) {
          modal.querySelector('[data-read]')?.click();
        }
        const bookId = modal.querySelector('[data-refresh]')?.dataset.refresh;
        const book = bookId && get(bookId);
        if (book?.siteId === dexSite) { book.dexCheckedAt = 0; detail(bookId); }
      }
      if (view === 'catalog') void browseMangaDex(mangaHub.action);
      else if (['home','new','updates'].includes(view)) { dexLastAttempt = 0; void updateDex(); }
    }
  } catch {
    flagDexOutage();
  } finally { dexHealthRunning = false; }
}
window.addEventListener('offline', () => { dexHealthFailed = true; });
window.addEventListener('online', monitorDexHealth);
setInterval(monitorDexHealth, 300000);
