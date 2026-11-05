import { normalizeRoute } from './routing.js';

(() => {
  const params = normalizeRoute(location.href).searchParams;
  const isDetails = params.get('view') === 'novel';
  const id = params.get('id');
  const requestedChapter = params.get('chapter');
  let active;
  let restore;

  function refresh() {
    document.body.className = '';
    const book = LuxNovelPublications.catalogue().find(novel => String(novel.id) === id);
    const number = requestedChapter === null ? book?.chapters[0]?.number
      : LuxNovelPublications.chapterNumber(requestedChapter);
    const chapterIndex = book?.chapters.findIndex(chapter => chapter.number === number);
    const signature = book ? LuxNovelPages.contentKey(book) : null;
    if (!book || (!isDetails && chapterIndex === -1)) {
      if (active === false) return;
      active = false;
      restore = undefined;
      document.title = 'القراءة غير متاحة — لوكس';
      const main = document.createElement('main');
      main.className = 'novel-page-missing';
      main.innerHTML = '<h1>القراءة غير متاحة</h1><p role="status">تعذّر العثور على الرواية أو الفصل في مكتبة هذا المتصفح.</p>';
      const back = document.createElement('a');
      back.href = book ? LuxNovelPages.detailsUrl(book.id) : '/?view=novels';
      back.textContent = book ? 'الرجوع إلى فهرس الرواية' : 'الرجوع إلى رف الروايات';
      main.append(back);
      document.body.replaceChildren(main);
      return;
    }
    if (active === signature) return;
    const existing = document.querySelector(isDetails ? '#novel-details' : '#sample-reader');
    if (!existing || existing.dataset.contentKey !== signature) {
      const title = isDetails ? 'فهرس الفصول' : 'الفصل ' + number;
      document.title = book.title + ' · ' + title + ' — لوكس';
      document.body.innerHTML = isDetails ? LuxNovelPages.details(book) : LuxNovelPages.reader(book, chapterIndex);
    }
    active = signature;
    restore = isDetails ? setupNovelDetails() : setupNovelChapter();
  }

  document.addEventListener('error', event => {
    const image = event.target;
    if (!image.matches?.('img[data-published-cover]')) return;
    image.removeAttribute('data-published-cover');
    image.src = '/novel-cover-fallback.svg';
  }, true);
  refresh();
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    refresh();
    restore?.();
  });
  window.addEventListener('storage', event => {
    if (LuxNovelPublications.changed(event)) refresh();
    if (isDetails && [null, 'lux-sample-progress:v1:' + id, 'lux-reader-bookmark:v1:' + id].includes(event.key)) restore?.();
  });
  window.addEventListener('lux-novels-changed', refresh);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
})();
