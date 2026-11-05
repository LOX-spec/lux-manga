/* Compatibility entry for browsers still running the cached 4.1 bootstrap. */
const comicFilters = { publisher: '', status: '', query: '', order: 'updated', limit: 24 };
const comicPublishers = [['', 'كل العوالم'], ['marvel', 'MARVEL'], ['dc', 'DC'], ['image', 'IMAGE'], ['boom', 'BOOM!'], ['ghost', 'GHOST MACHINE'], ['indie', 'المستقلون']];
const comicPublisherName = value => comicPublishers.find(([key]) => key === value)?.[1] || 'مستقلون';
function comicSelection(all) {
  const publisher = ({ dc: 'dc', marvel: 'marvel', 'comic-other': 'indie' })[view] ?? comicFilters.publisher;
  const query = studioNormalize(comicFilters.query);
  const items = all.filter(book => (!publisher || (publisher === 'indie' ? !['marvel', 'dc'].includes(book.publisher) : (book.publisher || 'other') === publisher)) &&
    (!comicFilters.status || book.status === comicFilters.status) &&
    (!query || studioNormalize([book.title, book.author, ...(book.genres || [])].join(' ')).includes(query)));
  const date = book => Date.parse(book.sourceUpdated || book.updated || book.added || '') || 0;
  const order = { updated: (a, b) => date(b) - date(a), title: (a, b) => a.title.localeCompare(b.title, 'ar'),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0), issues: (a, b) => b.chapters.length - a.chapters.length };
  return { publisher, items: items.sort(order[comicFilters.order] || order.updated) };
}
function comicImage(url, title) {
  return url ? `<img src="${esc(proxy(url))}" alt="${esc(title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-comic-cover>`
    : '<span class="comic-cover-fallback" aria-hidden="true">L<span>LUX COMICS</span></span>';
}
function comicCard(book) {
  const index = state.progress[book.id]?.chapter ?? 0;
  const latest = [...book.chapters].sort((a, b) => (Date.parse(b.published || b.sourceUpdated || '') || 0) - (Date.parse(a.published || a.sourceUpdated || '') || 0))[0];
  return `<article class="comic-series-card" data-comic-card>
    <button class="comic-series-cover" data-open="${esc(book.id)}" aria-label="تفاصيل ${esc(book.title)}">
      ${comicImage(book.cover, 'غلاف ' + book.title)}<span class="comic-status">${esc(book.status || 'حالة غير محددة')}</span>
      <span class="comic-cover-action">اكتشف السلسلة ↗</span>
    </button>
    <div class="comic-series-copy"><span class="comic-publisher-name">${esc(comicPublisherName(book.publisher))}</span>
      <h3><button data-open="${esc(book.id)}" dir="auto">${esc(book.title)}</button></h3>
      <p>${book.chapters.length ? book.chapters.length + ' أعداد متاحة' : 'لا توجد أعداد مكتشفة'}</p>
      ${latest ? `<small dir="auto">آخر عدد · ${esc(latest.title)}</small>` : ''}
    </div>
    <div class="comic-series-actions">${book.chapters.length ? `<button data-read="${esc(book.id)}" data-chapter="${index}">${state.progress[book.id] ? 'أكمل القراءة' : 'ابدأ القراءة'} ←</button>` : `<button data-open="${esc(book.id)}">افتح التفاصيل ←</button>`}
      <button class="comic-favorite" data-fav="${esc(book.id)}" aria-label="${state.favorites.includes(book.id) ? 'إزالة من المفضلة' : 'أضف للمفضلة'}: ${esc(book.title)}" aria-pressed="${state.favorites.includes(book.id)}">${studioIcon('favorites')}</button>
    </div>
  </article>`;
}
function renderComics() {
  const all = books().filter(book => mediaOf(book) === 'comics' && listOf(book.id) !== 'ignored');
  const { publisher, items } = comicSelection(all);
  const sources = state.sites.filter(site => site.contentType === 'comics');
  const featured = items.find(book => book.cover) || all.find(book => book.cover);
  const comicverse = sources.find(site => LuxComicverse.supports(site.url));
  const running = comicverse && syncing.has(comicverse.id);
  const latest = items.flatMap(book => book.chapters.map((chapter, index) => ({ book, chapter, index })))
    .sort((a, b) => (Date.parse(b.chapter.published || b.chapter.sourceUpdated || b.book.updated) || 0) -
      (Date.parse(a.chapter.published || a.chapter.sourceUpdated || a.book.updated) || 0)).slice(0, 10);
  const page = document.getElementById('page');
  page.classList.add('collection-page', 'comics-theme');
  page.innerHTML = `<div class="comic-world" id="comic-world">
    <header class="comic-page-heading"><div><span class="eyetag">LUX / COMICS</span><h1>كل بطل، له عالم.</h1></div><button data-action="add-site">＋ أضف مصدر كومكس</button></header>
    <section class="comic-hero" aria-labelledby="comic-hero-title">
      <div class="comic-hero-copy"><span class="comic-kicker">BEYOND THE ORDINARY</span><h2 id="comic-hero-title">عالم أكبر<br>من <em>الصفحات.</em></h2>
        <p>من شوارع غوثام إلى أبعد المجرات. اكتشف السلاسل، تابع أحدث الأعداد، واختر بطلك القادم.</p>
        <div class="comic-hero-actions"><a href="#comic-catalogue">تصفح السلاسل ↓</a><button data-comic-connect>${comicverse ? 'افتح مصدر كوميكس فيرس ↗' : 'استكشف كوميكس فيرس ↗'}</button></div>
        <div class="comic-hero-stats"><span><b>${all.length}</b> سلسلة في مكتبتك</span><span><b>${all.reduce((sum, book) => sum + book.chapters.length, 0)}</b> أعداد مكتشفة</span></div>
      </div>
      <div class="comic-hero-art" aria-hidden="true">${featured ? comicImage(featured.cover, '') : '<span class="comic-art-orbit"></span><b>LUX</b><span class="comic-art-caption">EVERY PANEL.<br>A NEW POSSIBILITY.</span>'}<span class="comic-art-stamp">COMICS<br>UNIVERSE</span></div>
    </section>
    <section class="comic-source-strip" aria-label="مصدر كوميكس فيرس"><div><span class="comic-source-dot ${running ? 'running' : ''}"></span><b>كوميكس فيرس</b><a href="${LuxComicverse.origin}/" target="_blank" rel="noopener">المصدر الأصلي ↗</a></div>
      <p role="status">${running ? 'جارٍ اكتشاف السلاسل والأعداد · فُحص ' + comicverse.scan.processed + ' صفحات' : comicverse ? 'المصدر متصل · ' + all.filter(book => book.siteId === comicverse.id).length + (comicverse.catalogueTotal ? ' من ' + comicverse.catalogueTotal : '') + ' سلسلة مكتشفة' : 'اربط المصدر مرة واحدة؛ تبقى السلاسل والتقدم في مكتبتك.'}</p>
      <button ${comicverse ? 'data-view="sites"' : 'data-comic-connect'}>${comicverse ? 'التقدم وإدارة المصدر' : 'ربط المصدر وبدء الفحص'}</button>
    </section>
    <nav class="comic-publishers" aria-label="دار نشر الكوميكس">${comicPublishers.map(([key, name]) => `<button data-comic-publisher="${key}" aria-pressed="${publisher === key}">${name}</button>`).join('')}</nav>
    ${latest.length ? `<section class="comic-latest" aria-labelledby="comic-latest-title"><div class="comic-section-heading"><div><span class="eyetag">FRESH OFF THE PRESS</span><h2 id="comic-latest-title">آخر الأعداد المضافة</h2></div><span>من المصادر المتصلة</span></div>
      <div class="comic-issue-rail">${latest.map(({book, chapter, index}) => `<button class="comic-issue" data-read="${esc(book.id)}" data-chapter="${index}"><span class="comic-issue-cover">${comicImage(chapter.cover || book.cover, '')}</span><span><strong dir="auto">${esc(book.title)}</strong><small dir="auto">${esc(chapter.title)}</small><em>${esc(comicPublisherName(book.publisher))} ←</em></span></button>`).join('')}</div></section>` : ''}
    <section id="comic-catalogue" aria-labelledby="comic-catalogue-title"><div class="comic-section-heading"><div><span class="eyetag">PICK YOUR UNIVERSE</span><h2 id="comic-catalogue-title">اكتشف سلسلتك القادمة</h2></div><span aria-live="polite">${items.length} سلسلة</span></div>
      <div class="comic-catalogue-tools"><label>ابحث عن بطلك<input type="search" id="comic-query" placeholder="اسم السلسلة، الكاتب، أو التصنيف…" value="${esc(comicFilters.query)}" autocomplete="off"></label>
        <label>ترتيب السلاسل<select id="comic-order">${[['updated','آخر تحديث'],['title','الاسم أبجديًا'],['rating','تقييم المصدر'],['issues','عدد الأعداد']].map(([key,name]) => `<option value="${key}" ${comicFilters.order === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
      </div>
      <div class="comic-status-tabs" aria-label="حالة السلسلة">${[['','جميع الأعمال'],['مستمر','مستمرة'],['مكتمل','مكتملة']].map(([key,name]) => `<button data-comic-status="${key}" aria-pressed="${comicFilters.status === key}">${name}</button>`).join('')}</div>
      ${items.length ? `<div class="comic-series-grid">${items.slice(0,comicFilters.limit).map(comicCard).join('')}</div>${items.length > comicFilters.limit ? '<button class="comic-load-more" data-comic-more>عرض المزيد من السلاسل ↓</button>' : ''}` : `<div class="comic-empty"><span aria-hidden="true">✦</span><h3>${all.length ? 'لا توجد سلاسل مطابقة' : 'عالمك ينتظر أول سلسلة'}</h3><p>${all.length ? 'غيّر كلمات البحث أو امسح التصفية.' : 'اربط كوميكس فيرس أو أضف مصدر كومكس لتظهر أعماله الحقيقية هنا.'}</p><button ${all.length ? 'data-comic-reset' : 'data-comic-connect'}>${all.length ? 'عرض كل السلاسل' : 'ابدأ بكوميكس فيرس'}</button></div>`}
    </section>
    <p class="comic-source-note">أغلفة الأعمال ونصوصها من مصادرها الأصلية. الأعداد المعروضة هي الروابط المكتشفة؛ يمكنك متابعة الفحص من «مصادري».</p>
  </div>`;
}
const comicsPreviousCollection = renderCollections;
renderCollections = function () { if (view === 'novels') return comicsPreviousCollection(); renderComics(); };
const comicsPreviousDetail = detail;
detail = function (id) {
  const book = get(id);
  if (book && mediaOf(book) === 'novels' && book.chapters.length) { read(id); return; }
  comicsPreviousDetail(id);
  if (!book || mediaOf(book) !== 'comics') return;
  document.querySelector('.chapter-heading h3').firstChild.textContent = 'الأعداد ';
  document.querySelector('.detail-facts span').textContent = book.chapters.length ? book.chapters.length + ' أعداد متاحة' : 'لا توجد أعداد مكتشفة';
  const publisher = document.getElementById('comicPublisher');
  for (const [value, name] of comicPublishers.filter(([value]) => ['image', 'boom', 'ghost'].includes(value))) publisher.add(new Option(name, value));
  publisher.value = book.publisher || 'other';
};
let comicQueryTimer;
document.addEventListener('input', event => {
  if (event.target.id !== 'comic-query') return;
  comicFilters.query = event.target.value;
  comicFilters.limit = 24;
  clearTimeout(comicQueryTimer);
  comicQueryTimer = setTimeout(() => {
    if (!['comics','dc','marvel','comic-other'].includes(view)) return;
    renderComics();
    document.getElementById('comic-query')?.focus({ preventScroll: true });
  }, 180);
});
document.addEventListener('change', event => {
  if (event.target.id !== 'comic-order') return;
  comicFilters.order = event.target.value;
  renderComics();
});
document.addEventListener('error', event => {
  const image = event.target;
  if (!image.matches?.('img[data-comic-cover]')) return;
  image.outerHTML = '<span class="comic-cover-fallback" aria-hidden="true">L<span>LUX COMICS</span></span>';
}, true);
async function connectComicverse() {
  let site = state.sites.find(site => site.contentType === 'comics' && LuxComicverse.supports(site.url));
  if (site) { go('sites'); return; }
  site = { id: 's' + crypto.randomUUID().replaceAll('-', ''), url: LuxComicverse.origin + '/', entryUrl: LuxComicverse.origin + '/',
    name: 'كوميكس فيرس', contentType: 'comics', publisher: 'other', queue: [], seen: [], done: 0, failed: [], paused: false, status: 'pending', lastCheck: null };
  state.sites.push(site);
  enqueue(site, 'catalog', LuxComicverse.feedUrl());
  if (!await save()) {
    state.sites = state.sites.filter(item => item !== site);
    throw new Error('تعذّر حفظ المصدر. تحقّق من إذن التخزين ثم أعد المحاولة.');
  }
  renderComics();
  runImport(site.id);
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-comic-publisher')) {
    comicFilters.publisher = button.dataset.comicPublisher;
    comicFilters.limit = 24;
    if (view !== 'comics') go('comics'); else renderComics();
  }
  if (button.hasAttribute('data-comic-status')) { comicFilters.status = button.dataset.comicStatus; comicFilters.limit = 24; renderComics(); }
  if (button.hasAttribute('data-comic-more')) { comicFilters.limit += 24; renderComics(); }
  if (button.hasAttribute('data-comic-reset')) { Object.assign(comicFilters, { publisher: '', status: '', query: '', limit: 24 }); if (view !== 'comics') go('comics'); else renderComics(); }
  if (button.hasAttribute('data-comic-connect')) { button.disabled = true; try { await connectComicverse(); } catch (error) { toast(error.message); button.disabled = false; } }
});
