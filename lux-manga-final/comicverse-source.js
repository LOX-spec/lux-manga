(() => {
  const previousParser = parseManga;
  const empty = url => ({ url, title: '', cover: '', kind: 'كومكس', contentType: 'comics', publisher: 'other',
    genres: [], description: '', author: '', rating: 0, published: '', images: [], chapters: [], works: [], pages: [], chapterPages: [],
    isWork: false, comicverse: true, discovery: { method: 'خلاصات كوميكس فيرس المنشورة', dynamic: false } });
  function work(entry) {
    const doc = new DOMParser().parseFromString(entry.html, 'text/html');
    const p = empty(entry.url);
    const metadata = name => [...doc.querySelectorAll('#extra-info .y6x11p')]
      .find(node => node.textContent.trim().startsWith(name))?.querySelector('.dt')?.textContent.trim() || '';
    const label = doc.querySelector('.manga-widget[data-label]')?.getAttribute('data-label') || entry.title;
    const labels = entry.labels || [];
    const image = imageURL(doc.querySelector('.separator img,img'), entry.url);
    Object.assign(p, {
      isWork: true, title: entry.title, cover: (image || safeLink(entry.cover, entry.url) || '').replace(/\/s\d+(?:-c)?\//, '/w600/'),
      publisher: LuxComicverse.publisher([metadata('دار النشر')]) !== 'other'
        ? LuxComicverse.publisher([metadata('دار النشر')]) : LuxComicverse.publisher(labels),
      status: labels.some(label => /^(مكتمل|مكتملة|completed)$/i.test(label)) ? 'مكتمل'
        : labels.some(label => /^(مستمر|مستمرة|ongoing)$/i.test(label)) ? 'مستمر' : '',
      rating: Number(labels.find(label => /^(?:10|\d)(?:\.\d)?$/.test(label)) || 0),
      genres: labels.filter(label => /^[\u0600-\u06ff]/.test(label) && !/^(مستمر|مكتمل|مكتملة|مستمرة)$/.test(label)),
      description: doc.querySelector('#synopsis')?.textContent.trim().slice(0, 1500) || '',
      author: metadata('الكاتب'), published: entry.published.slice(0, 10), sourceUpdated: entry.updated,
      seriesLabel: label, chapterPages: [LuxComicverse.feedUrl(label, 1, true)]
    });
    return p;
  }
  parseManga = function (data) {
    if (!LuxComicverse.supports(data.url)) return previousParser(data);
    if (/^\s*\{/.test(data.content)) {
      const result = LuxComicverse.feed(data.content, data.url);
      const p = empty(data.url);
      p.feedValid = true;
      const path = decodeURIComponent(new URL(data.url).pathname);
      if (path.endsWith('/-/Series')) {
        p.catalogueTotal = result.total;
        p.catalogBooks = result.entries.filter(entry => entry.labels.includes('Series')).map(work);
        p.works = p.catalogBooks.map(book => ({ url: book.url, title: book.title, cover: book.cover }));
        if (result.next) p.pages.push(result.next);
      } else {
        p.chapters = result.entries.filter(entry => entry.labels.includes('Chapter') && !entry.labels.includes('Series')).map(entry => ({
          url: entry.url, title: entry.title, number: LuxComicverse.number(entry.title), images: [],
          cover: safeLink(entry.cover, entry.url), published: entry.published, sourceUpdated: entry.updated
        })).sort((a, b) => a.number - b.number || a.url.localeCompare(b.url));
        if (result.next) p.chapterPages.push(result.next);
      }
      return p;
    }
    const doc = new DOMParser().parseFromString(data.content, 'text/html');
    const widget = doc.querySelector('.manga-widget[data-label]');
    // Older series pages have metadata but no chapter widget. They are still
    // catalogue entries; their cover images must never be treated as an issue.
    if (widget || (doc.querySelector('#extra-info') && doc.querySelector('#synopsis'))) {
      const labels = [...doc.querySelectorAll('a[rel="tag"],.post-labels a,.genres a')].map(node => node.textContent.trim());
      return work({ url: data.url, title: doc.querySelector('h1')?.textContent.trim() || widget?.getAttribute('data-label') || '',
        html: doc.querySelector('#comic-original-body-source,.post-body')?.innerHTML || data.content, labels,
        cover: doc.querySelector('meta[property="og:image"]')?.content || '', published: '', updated: '' });
    }
    const p = previousParser(data);
    Object.assign(p, { comicverse: true, contentType: 'comics', kind: 'كومكس' });
    const area = doc.querySelector('#cvOriginal,.post-body.entry-content,.post-body,#readerarea');
    const images = area ? [...area.querySelectorAll('.separator img, img[data-original-width],#readerarea img')]
      .map(image => imageURL(image, data.url)).filter(Boolean) : [];
    if (images.length) { p.images = [...new Set(images)]; p.works = []; p.pages = []; }
    else if (!p.isWork) { p.works = []; p.pages = [LuxComicverse.feedUrl()]; }
    return p;
  };
  const previousCatalog = applyCatalog;
  applyCatalog = function (site, parsed) {
    if (parsed.comicverse && parsed.isWork && !parsed.catalogBooks) {
      const book = upsertWork(parsed, site.id);
      for (const url of parsed.chapterPages) enqueue(site, 'chapter-index', url, { bookId: book.id });
      return;
    }
    if (!parsed.catalogBooks) return previousCatalog(site, parsed);
    site.catalogueTotal = parsed.catalogueTotal;
    if (site.scan) site.scan.sitemapChecked = true;
    for (const entry of parsed.catalogBooks) {
      const book = upsertWork(entry, site.id);
      for (const url of entry.chapterPages) enqueue(site, 'chapter-index', url, { bookId: book.id });
    }
    for (const url of parsed.pages) enqueue(site, 'catalog', url);
  };
  const previousUpsert = upsertWork;
  upsertWork = function (parsed, siteId) {
    const book = previousUpsert(parsed, siteId);
    if (parsed.comicverse) {
      if (parsed.isWork) {
        if (parsed.publisher !== 'other' || !book.publisher) book.publisher = parsed.publisher;
        book.status = parsed.status || book.status;
        book.seriesLabel = parsed.seriesLabel;
        book.sourceUpdated = parsed.sourceUpdated || book.sourceUpdated;
      }
      book.connector = 'comicverse';
    }
    return book;
  };
})();
