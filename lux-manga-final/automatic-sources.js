const primarySite='azora-primary';
function allowedCachedWork(book){return book.siteId!==['manga','dex-auto'].join('') && !book.adultContent && !['pornographic','erotica'].includes(book.contentRating);}
function sourceChapterLabel(book){return book.sourceCheckedAt ? (book.chapters.length?'عدد الفصول: '+book.chapters.length+(book.sourceIndexComplete===false?' · فهرس جزئي من '+book.sourceExpectedChapters:''):'لا يوجد فصل'):'افتح الفهرس للتحقق من الفصول';}
function isPrimaryChapter(value){try{return new URL(value).hostname==='azorafly.com'&&/\/chapter-/.test(new URL(value).pathname)}catch{return false}}
function bindSourceReaderImages(chapter){
  document.querySelectorAll('#modal .manga-page').forEach((page,index)=>{
    const image=page.querySelector('img'),message=page.querySelector('.image-failure'),button=message.querySelector('button');let retried=false;
    image.addEventListener('error',()=>{if(!retried&&!image.src.includes('/api/image?')){retried=true;image.src=proxy(chapter.images[index]);return}image.hidden=true;message.hidden=false});
    image.addEventListener('load',()=>{image.hidden=false;message.hidden=true});
    if(button)button.onclick=()=>{image.hidden=false;message.hidden=true;image.src=proxy(chapter.images[index])};
  });
}
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


const previousRefresh=refreshBook;
refreshBook=async function(id){const book=get(id);const site=state.sites.find(item=>item.id===book?.siteId&&item.feedOnly);if(site){await refreshExternalFeed(site);return get(id)}const result=await previousRefresh(id);result.sourceCheckedAt=Date.now();await save();return result;};
const previousRunImport=runImport;
runImport=async function(id){const site=state.sites.find(item=>item.id===id);if(!site?.feedOnly)return previousRunImport(id);try{await refreshExternalFeed(site)}catch(error){site.status='partial';site.discoveryError=error.message;await save();toast(error.message)}finally{render()}};
