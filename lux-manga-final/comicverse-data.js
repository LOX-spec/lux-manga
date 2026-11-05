const LuxComicverse = (() => {
  const origin = 'https://arcomixverse.blogspot.com';
  function supports(value) {
    try { return new URL(value).origin === origin; } catch { return false; }
  }
  function feedUrl(label = 'Series', start = 1, summary = false) {
    const url = new URL('/feeds/posts/' + (summary ? 'summary' : 'default') + '/-/' + encodeURIComponent(label), origin);
    url.searchParams.set('alt', 'json');
    url.searchParams.set('max-results', summary ? '100' : '20');
    url.searchParams.set('start-index', String(start));
    return url.href;
  }
  function feed(data, url) {
    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    if (!supports(url) || !payload?.feed || !Array.isArray(payload.feed.entry || [])) throw new Error('خلاصة كوميكس فيرس غير صالحة.');
    const source = new URL(url);
    const entries = (payload.feed.entry || []).filter(entry => {
      const link = entry.link?.find(link => link.rel === 'alternate')?.href;
      return supports(link) && typeof entry.title?.$t === 'string';
    }).map(entry => ({
      title: entry.title.$t,
      url: entry.link.find(link => link.rel === 'alternate').href,
      labels: (entry.category || []).map(item => item.term).filter(item => typeof item === 'string'),
      html: entry.content?.$t || '',
      cover: (entry.media$thumbnail?.url || '').replace(/\/s72-c\//, '/w400/'),
      published: entry.published?.$t || '', updated: entry.updated?.$t || ''
    }));
    const count = payload.feed.entry?.length || 0;
    const total = Number(payload.feed.openSearch$totalResults?.$t) || 0;
    const start = Math.max(1, Number(source.searchParams.get('start-index')) || 1);
    let next = '';
    if (count && start + count <= total) {
      source.searchParams.set('start-index', String(start + count));
      source.searchParams.delete('callback');
      next = source.href;
    }
    return { entries, total, next };
  }
  function publisher(labels) {
    const values = labels.map(value => String(value).trim().toUpperCase());
    return values.includes('MARVEL') ? 'marvel' : values.includes('DC') ? 'dc' : values.includes('IMAGE') ? 'image'
      : values.some(value => /^BOOM!?/.test(value)) ? 'boom' : values.some(value => /^GHOST\s?MACHINE$/.test(value)) ? 'ghost' : 'other';
  }
  function number(title) {
    const text = title.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).replace('٫', '.');
    return Number(text.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  }
  return { origin, supports, feedUrl, feed, publisher, number };
})();
