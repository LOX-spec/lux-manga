const LuxComicLibrary = (() => {
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase().trim();
  const time = value => Date.parse(value || '') || 0;
  const status = value => /^(مكتمل|مكتملة|completed)$/i.test(value || '') ? 'مكتمل'
    : /^(مستمر|مستمرة|ongoing)$/i.test(value || '') ? 'مستمر' : '';
  function updated(book) {
    const remote = Math.max(time(book.sourceUpdated), ...(book.chapters || []).map(chapter => time(chapter.sourceUpdated || chapter.published)));
    return remote || time(book.updated || book.added);
  }
  function select(all, filters) {
    const words = normalize(filters.query).split(/\s+/).filter(Boolean);
    const items = all.filter(book => {
      const text = normalize([book.title, book.author, ...(book.genres || [])].join(' '));
      return (!filters.publisher || (filters.publisher === 'indie' ? !['marvel', 'dc'].includes(book.publisher) : book.publisher === filters.publisher)) &&
        (!filters.status || status(book.status) === filters.status) && (!filters.genre || book.genres?.includes(filters.genre)) &&
        (!filters.source || book.siteId === filters.source) && (!filters.readable || book.chapters?.length > 0) && words.every(word => text.includes(word));
    });
    const title = (a, b) => String(a.title).localeCompare(String(b.title), 'ar');
    const orders = { updated: (a, b) => updated(b) - updated(a) || title(a, b), title,
      rating: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || title(a, b),
      issues: (a, b) => b.chapters.length - a.chapters.length || title(a, b) };
    return items.sort(orders[filters.order] || orders.updated);
  }
  function latest(all, limit = 10) {
    const seen = new Set();
    return all.flatMap(book => book.chapters.map((chapter, index) => ({ book, chapter, index })))
      .sort((a, b) => time(b.chapter.published || b.chapter.sourceUpdated || b.book.sourceUpdated || b.book.updated) -
        time(a.chapter.published || a.chapter.sourceUpdated || a.book.sourceUpdated || a.book.updated))
      .filter(({chapter}) => { if (seen.has(chapter.url)) return false; seen.add(chapter.url); return true; }).slice(0, limit);
  }
  function readingIndex(book, progress) {
    if (!book.chapters.length) return -1;
    const index = progress?.[book.id]?.chapter;
    return Number.isInteger(index) && index >= 0 && index < book.chapters.length ? index : 0;
  }
  function resume(all, progress) {
    return all.filter(book => book.chapters.length && Number.isInteger(progress?.[book.id]?.chapter) &&
      progress[book.id].chapter >= 0 && progress[book.id].chapter < book.chapters.length)
      .sort((a, b) => time(progress[b.id].time) - time(progress[a.id].time)).slice(0, 3);
  }
  function featured(all) {
    const readable = all.filter(book => book.cover && book.chapters.length);
    return (readable.length ? readable : all.filter(book => book.cover)).slice(0, 5);
  }
  return { normalize, status, updated, select, latest, readingIndex, resume, featured };
})();
