const LuxChapterLinks = (() => {
  function canonical(value, base) {
    try {
      const url = new URL(value, base);
      if (url.protocol === 'http:') url.protocol = 'https:';
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
      url.hash = '';
      for (const key of [...url.searchParams.keys()]) if (/^utm_|^(?:fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
      const path = url.pathname.replace(/\/+$/, '') || '/';
      url.pathname = /\.[a-z0-9]{1,8}$/i.test(path) || path === '/' ? path : path + '/';
      url.searchParams.sort();
      return url.href;
    } catch { return ''; }
  }
  function merge(chapters, base) {
    const records = new Map();
    for (const chapter of chapters || []) {
      const url = canonical(chapter.url, base);
      if (!url) continue;
      const previous = records.get(url);
      const record = { ...previous, ...chapter, url };
      if ((previous?.images?.length || 0) > (record.images?.length || 0)) record.images = previous.images;
      if ((previous?.text?.length || 0) > (record.text?.length || 0)) record.text = previous.text;
      records.set(url, record);
    }
    return [...records.values()].sort((a, b) => (a.number || 0) - (b.number || 0));
  }
  function repairState(state) {
    let changed = false;
    const library = [...(state.books || []), ...(state.removedSources || []).flatMap(item => item.books || [])];
    for (const book of library) {
      const progress = state.progress?.[book.id];
      const current = progress && canonical(book.chapters?.[progress.chapter]?.url, book.source);
      const previousChapters = book.chapters || [];
      const chapters = merge(previousChapters, book.source);
      if (chapters.length !== previousChapters.length || chapters.some((chapter, index) => chapter.url !== previousChapters[index].url)) changed = true;
      book.chapters = chapters;
      if (current) {
        const index = chapters.findIndex(chapter => chapter.url === current);
        if (index >= 0 && progress.chapter !== index) { progress.chapter = index; changed = true; }
      }
      if (Array.isArray(progress?.read)) {
        const read = [...new Set(progress.read.map(url => canonical(url, book.source)).filter(Boolean))];
        if (JSON.stringify(read) !== JSON.stringify(progress.read)) { progress.read = read; changed = true; }
      }
    }
    for (const field of ['downloads', 'downloadJobs']) {
      if (!state[field]) continue;
      const migrated = {};
      for (const [oldUrl, record] of Object.entries(state[field])) {
        const url = canonical(oldUrl) || oldUrl;
        if (url !== oldUrl || migrated[url]) changed = true;
        if (!migrated[url] || (record.count || 0) > (migrated[url].count || 0)) migrated[url] = record;
      }
      if (changed) state[field] = migrated;
    }
    return changed;
  }
  return { canonical, merge, repairState };
})();
