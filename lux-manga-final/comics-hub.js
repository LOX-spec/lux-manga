const comicFilters = { publisher: '', status: '', query: '', genre: '', source: '', readable: false, order: 'updated', limit: 24 };
const comicPublishers = [['', 'كل العوالم'], ['marvel', 'MARVEL'], ['dc', 'DC'], ['image', 'IMAGE'], ['boom', 'BOOM!'], ['ghost', 'GHOST MACHINE'], ['indie', 'المستقلون']];
const comicPublisherName = value => comicPublishers.find(([key]) => key === value)?.[1] || 'مستقلون';
let comicFeatureBooks = [], comicFeatureIndex = 0;
function comicSelection(all) {
  const publisher = ({ dc: 'dc', marvel: 'marvel', 'comic-other': 'indie' })[view] ?? comicFilters.publisher;
  return { publisher, items: LuxComicLibrary.select(all, { ...comicFilters, publisher }) };
}
function comicImage(url, title = '', eager = false) {
  return url ? `<img src="${esc(proxy(url))}" alt="${esc(title)}" loading="${eager ? 'eager' : 'lazy'}" ${eager ? 'fetchpriority="high"' : ''} decoding="async" referrerpolicy="no-referrer" data-comic-cover>`
    : '<span class="comic-cover-fallback" aria-hidden="true">L<span>LUX COMICS</span></span>';
}
function comicCard(book) {
  const index = LuxComicLibrary.readingIndex(book, state.progress);
  const latest = LuxComicLibrary.latest([book], 1)[0]?.chapter;
  return `<article class="comic-series-card" data-comic-card>
    <button class="comic-series-cover" data-open="${esc(book.id)}" aria-label="تفاصيل ${esc(book.title)}">
      ${comicImage(book.cover, 'غلاف ' + book.title)}<span class="comic-status">${esc(book.status || 'حالة غير محددة')}</span>
      ${book.rating > 0 ? `<span class="comic-card-score" aria-label="تقييم المصدر ${esc(book.rating)} من 10">★ ${esc(book.rating)}</span>` : ''}
      <span class="comic-cover-action">اكتشف السلسلة ↗</span>
    </button>
    <div class="comic-series-copy"><span class="comic-publisher-name">${esc(comicPublisherName(book.publisher))}</span>
      <h3><button data-open="${esc(book.id)}" dir="auto">${esc(book.title)}</button></h3>
      <p>${book.chapters.length ? book.chapters.length + ' أعداد متاحة' : 'الأعداد غير متاحة حاليًا'}</p>
      ${latest ? `<small dir="auto">آخر عدد · ${esc(latest.title)}</small>` : ''}
    </div>
    <div class="comic-series-actions">${index >= 0 ? `<button data-read="${esc(book.id)}" data-chapter="${index}">${state.progress[book.id] ? 'أكمل القراءة' : 'ابدأ القراءة'} ←</button>` : `<button data-open="${esc(book.id)}">تفاصيل المصدر ←</button>`}
      <button class="comic-favorite" data-fav="${esc(book.id)}" aria-label="${state.favorites.includes(book.id) ? 'إزالة من المفضلة' : 'أضف للمفضلة'}: ${esc(book.title)}" aria-pressed="${state.favorites.includes(book.id)}">${studioIcon('favorites')}</button>
    </div></article>`;
}
function renderComicSpotlight() {
  const book = comicFeatureBooks[comicFeatureIndex];
  if (!book) return `<section class="comic-spotlight comic-spotlight-empty"><div class="comic-spotlight-copy"><span class="comic-kicker">YOUR NEXT UNIVERSE</span><h2>عالمٌ ينتظر<br><em>بطلك القادم.</em></h2><p>اربط مصدرك لتكتشف سلاسله وأغلفته وأعداده في مكان واحد.</p><button class="comic-primary" data-comic-connect>استكشف كوميكس فيرس ←</button></div><div class="comic-empty-art" aria-hidden="true"><span>01</span><b>LUX<br>COMICS</b><small>EVERY PANEL. A NEW WORLD.</small></div></section>`;
  const index = LuxComicLibrary.readingIndex(book, state.progress);
  return `<section class="comic-spotlight" id="comic-spotlight" tabindex="0" role="region" aria-label="سلاسل مختارة" aria-roledescription="عارض أعمال">
    <div class="comic-spotlight-bg" aria-hidden="true">${comicImage(book.cover, '', true)}</div>
    <div class="comic-spotlight-body"><div class="comic-spotlight-copy"><span class="comic-kicker">من عوالم مكتبتك</span>
      <div class="comic-feature-tags"><span>${esc(comicPublisherName(book.publisher))}</span>${book.status ? `<span>${esc(book.status)}</span>` : ''}${book.rating > 0 ? `<span class="comic-feature-rating">★ ${esc(book.rating)} / 10</span>` : ''}</div>
      <h2 dir="auto">${esc(book.title)}</h2>
      <p class="comic-feature-description">${esc(book.description || 'اكتشف شخصيات السلسلة وعالمها، وتصفح أعدادها المتاحة من المصدر.')}</p>
      <ul class="comic-feature-genres">${(book.genres || []).slice(0, 3).map(genre => `<li>${esc(genre)}</li>`).join('')}</ul>
      <div class="comic-hero-actions">${index >= 0 ? `<button class="comic-primary" data-read="${esc(book.id)}" data-chapter="${index}">${state.progress[book.id] ? 'متابعة القراءة' : 'اقرأ الآن'} ←</button>` : ''}<button class="comic-secondary" data-open="${esc(book.id)}">تفاصيل السلسلة ↗</button></div>
      <p class="comic-feature-availability">${book.chapters.length ? book.chapters.length + ' أعداد متاحة' : 'لا توجد أعداد مكتشفة'}</p>
    </div><button class="comic-feature-poster" data-open="${esc(book.id)}" aria-label="غلاف وتفاصيل ${esc(book.title)}">${comicImage(book.cover, 'غلاف ' + book.title, true)}</button></div>
    <div class="comic-carousel-controls"><div class="comic-carousel-dots">${comicFeatureBooks.map((item, i) => `<button data-comic-feature="${i}" aria-label="عرض ${esc(item.title)}" aria-pressed="${i === comicFeatureIndex}"></button>`).join('')}</div><div class="comic-carousel-arrows"><button data-comic-hero-step="-1" aria-label="السلسلة السابقة" ${comicFeatureBooks.length < 2 ? 'disabled' : ''}>→</button><output aria-live="polite">${comicFeatureIndex + 1} / ${comicFeatureBooks.length}</output><button data-comic-hero-step="1" aria-label="السلسلة التالية" ${comicFeatureBooks.length < 2 ? 'disabled' : ''}>←</button></div></div>
  </section>`;
}
function comicSidePanel(all) {
  const recent = LuxComicLibrary.resume(all, state.progress);
  const ranked = [...all].filter(book => book.rating > 0).sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title)).slice(0, 5);
  return `<section class="comic-side-panel" aria-label="اختيارات مكتبتك">
    ${recent.length ? `<section class="comic-side-block"><span class="eyetag">PICK UP YOUR STORY</span><h2>أكمل الحكاية</h2>${recent.map(book => {
      const index = LuxComicLibrary.readingIndex(book, state.progress);
      return `<button class="comic-side-item" data-read="${esc(book.id)}" data-chapter="${index}"><span class="comic-side-cover">${comicImage(book.cover)}</span><span><b dir="auto">${esc(book.title)}</b><small dir="auto">${esc(book.chapters[index].title)}</small><em>متابعة القراءة ←</em></span></button>`;
    }).join('')}</section>` : ''}
    ${ranked.length ? `<section class="comic-side-block"><span class="eyetag">WORTH A LOOK</span><h2>الأعلى تقييمًا</h2><p>وفق التقييم المنشور في المصدر</p>${ranked.map((book, index) => `<button class="comic-side-item" data-open="${esc(book.id)}"><span class="comic-rank-number">${index + 1}</span><span class="comic-side-cover">${comicImage(book.cover)}</span><span><b dir="auto">${esc(book.title)}</b><small>${esc(comicPublisherName(book.publisher))}</small><em>★ ${esc(book.rating)} / 10</em></span></button>`).join('')}</section>` : ''}
    <section class="comic-side-guide"><span aria-hidden="true">✦</span><h2>مكتبتك، على طريقتك.</h2><p>أضف سلسلة للمفضلة، واحفظ الأعداد التي تريد قراءتها دون اتصال من القارئ.</p><button data-view="guide">دليل الاستخدام ↗</button></section>
  </section>`;
}
function renderComics() {
  const all = books().filter(book => mediaOf(book) === 'comics' && listOf(book.id) !== 'ignored');
  const { publisher, items } = comicSelection(all);
  const sources = state.sites.filter(site => site.contentType === 'comics');
  const comicverse = sources.find(site => LuxComicverse.supports(site.url));
  const running = comicverse && syncing.has(comicverse.id);
  const latest = LuxComicLibrary.latest(items);
  const genres = [...new Set(all.flatMap(book => book.genres || []))].sort((a, b) => a.localeCompare(b, 'ar'));
  comicFeatureBooks = LuxComicLibrary.featured(items.length ? items : all);
  comicFeatureIndex = comicFeatureIndex % Math.max(1, comicFeatureBooks.length);
  const active = !!(publisher || comicFilters.status || comicFilters.query || comicFilters.genre || comicFilters.source || comicFilters.readable);
  const page = document.getElementById('page');
  page.classList.add('collection-page', 'comics-theme');
  page.innerHTML = `<div class="comic-world" id="comic-world"><header class="comic-page-heading"><div><span class="eyetag">LUX LIBRARY / COMICS</span><h1>عالم الكوميكس</h1><p>كل سلسلة تفتح بابًا إلى عالم آخر.</p></div><button data-action="add-site">＋ أضف مصدر كومكس</button></header>
    ${renderComicSpotlight()}
    <section class="comic-source-strip" aria-label="مصدر كوميكس فيرس"><div><span class="comic-source-dot ${running ? 'running' : ''}"></span><b>كوميكس فيرس</b><a href="${LuxComicverse.origin}/" target="_blank" rel="noopener">المصدر ↗</a></div><p role="status">${running ? 'جارٍ الفحص · ' + comicverse.scan.processed + ' صفحات ناجزة' : comicverse ? 'متصل · ' + all.filter(book => book.siteId === comicverse.id).length + (comicverse.catalogueTotal ? ' من ' + comicverse.catalogueTotal : '') + ' سلسلة مكتشفة' : 'اربط المصدر لتظهر سلاسله وأعداده هنا.'}</p><button ${comicverse ? 'data-view="sites"' : 'data-comic-connect'}>${comicverse ? 'إدارة المصدر ↗' : 'ربط المصدر وبدء الفحص'}</button></section>
    <nav class="comic-publishers" aria-label="دار نشر الكوميكس">${comicPublishers.map(([key, name]) => `<button data-comic-publisher="${key}" aria-pressed="${publisher === key}">${name}</button>`).join('')}</nav>
    <div class="comic-editorial-layout"><div class="comic-main-column">
    ${latest.length ? `<section class="comic-latest" aria-labelledby="comic-latest-title"><div class="comic-section-heading"><div><span class="eyetag">JUST ARRIVED</span><h2 id="comic-latest-title">آخر الأعداد المضافة</h2></div><span>اسحب لاستكشاف المزيد ←</span></div><div class="comic-issue-rail">${latest.map(({book, chapter, index}) => `<button class="comic-issue" data-read="${esc(book.id)}" data-chapter="${index}"><span class="comic-issue-cover">${comicImage(chapter.cover || book.cover)}<em>${esc(chapter.title)}</em></span><strong dir="auto">${esc(book.title)}</strong><small>${esc(comicPublisherName(book.publisher))}</small></button>`).join('')}</div></section>` : ''}
    <section id="comic-catalogue" aria-labelledby="comic-catalogue-title"><div class="comic-section-heading"><div><span class="eyetag">YOUR NEXT OBSESSION</span><h2 id="comic-catalogue-title">اكتشف سلسلتك القادمة</h2></div><span aria-live="polite">${items.length} من ${all.length} سلسلة</span></div>
      <div class="comic-catalogue-tools"><label class="comic-search-label" for="comic-query">ابحث عن بطلك<input type="search" id="comic-query" placeholder="اسم السلسلة، الكاتب، أو التصنيف…" value="${esc(comicFilters.query)}" autocomplete="off"></label>
      <label for="comic-order">ترتيب السلاسل<select id="comic-order">${[['updated','آخر تحديث'],['title','الاسم أبجديًا'],['rating','تقييم المصدر'],['issues','عدد الأعداد']].map(([key,name]) => `<option value="${key}" ${comicFilters.order === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
      <label for="comic-genre">التصنيف<select id="comic-genre"><option value="">كل التصنيفات</option>${genres.map(genre => `<option ${comicFilters.genre === genre ? 'selected' : ''}>${esc(genre)}</option>`).join('')}</select></label>
      ${sources.length > 1 ? `<label for="comic-source">المصدر<select id="comic-source"><option value="">كل المصادر</option>${sources.map(site => `<option value="${esc(site.id)}" ${comicFilters.source === site.id ? 'selected' : ''}>${esc(site.name)}</option>`).join('')}</select></label>` : ''}</div>
      <div class="comic-filter-row"><div class="comic-status-tabs" aria-label="حالة السلسلة">${[['','جميع الأعمال'],['مستمر','مستمرة'],['مكتمل','مكتملة']].map(([key,name]) => `<button data-comic-status="${key}" aria-pressed="${comicFilters.status === key}">${name}</button>`).join('')}</div><label class="comic-readable"><input type="checkbox" id="comic-readable" ${comicFilters.readable ? 'checked' : ''}> يمكن قراءتها الآن</label></div>
      ${active ? `<div class="comic-active-filters"><span>تصفية مفعّلة · ${items.length} نتائج</span><button data-comic-reset>مسح التصفية ×</button></div>` : ''}
      ${items.length ? `<div class="comic-series-grid">${items.slice(0,comicFilters.limit).map(comicCard).join('')}</div>${items.length > comicFilters.limit ? `<button class="comic-load-more" data-comic-more>عرض المزيد من السلاسل ↓ <small>${Math.min(comicFilters.limit,items.length)} / ${items.length}</small></button>` : ''}` : `<div class="comic-empty"><span aria-hidden="true">✦</span><h3>${all.length ? 'لا توجد سلاسل مطابقة' : 'عالمك ينتظر أول سلسلة'}</h3><p>${all.length ? 'جرّب كلمات أخرى أو امسح التصفية.' : 'اربط كوميكس فيرس أو أضف مصدرًا لتظهر أعماله الحقيقية هنا.'}</p><button ${all.length ? 'data-comic-reset' : 'data-comic-connect'}>${all.length ? 'عرض كل السلاسل' : 'ابدأ بكوميكس فيرس'}</button></div>`}
    </section></div>${comicSidePanel(all)}</div><p class="comic-source-note">أغلفة الأعمال ونصوصها من مصادرها الأصلية. نعرض روابط الأعداد المكتشفة فعلًا؛ بيانات مكتبتك محفوظة في هذا المتصفح.</p></div>`;
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
function showComicFeature(index, control) {
  if (!comicFeatureBooks.length) return;
  comicFeatureIndex = (index + comicFeatureBooks.length) % comicFeatureBooks.length;
  const spotlight = document.getElementById('comic-spotlight');
  if (!spotlight) return;
  spotlight.outerHTML = renderComicSpotlight();
  document.querySelector(control || '#comic-spotlight')?.focus({ preventScroll: true });
}
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
  const fields = { 'comic-order': 'order', 'comic-genre': 'genre', 'comic-source': 'source', 'comic-readable': 'readable' };
  const field = fields[event.target.id];
  if (!field) return;
  comicFilters[field] = field === 'readable' ? event.target.checked : event.target.value;
  comicFilters.limit = 24;
  renderComics();
});
document.addEventListener('keydown', event => {
  if (!event.target.closest('#comic-spotlight') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  showComicFeature(comicFeatureIndex + (event.key === 'ArrowLeft' ? 1 : -1));
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
  if (!await save()) { state.sites = state.sites.filter(item => item !== site); throw new Error('تعذّر حفظ المصدر. تحقّق من إذن التخزين ثم أعد المحاولة.'); }
  renderComics();
  runImport(site.id);
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-comic-feature')) showComicFeature(Number(button.dataset.comicFeature), '[data-comic-feature="' + button.dataset.comicFeature + '"]');
  if (button.hasAttribute('data-comic-hero-step')) showComicFeature(comicFeatureIndex + Number(button.dataset.comicHeroStep), '[data-comic-hero-step="' + button.dataset.comicHeroStep + '"]');
  if (button.hasAttribute('data-comic-publisher')) { comicFilters.publisher = button.dataset.comicPublisher; comicFilters.limit = 24; comicFeatureIndex = 0; if (view !== 'comics') go('comics'); else renderComics(); }
  if (button.hasAttribute('data-comic-status')) { comicFilters.status = button.dataset.comicStatus; comicFilters.limit = 24; renderComics(); }
  if (button.hasAttribute('data-comic-more')) { comicFilters.limit += 24; renderComics(); }
  if (button.hasAttribute('data-comic-reset')) { Object.assign(comicFilters, { publisher: '', status: '', query: '', genre: '', source: '', readable: false, limit: 24 }); if (view !== 'comics') go('comics'); else renderComics(); }
  if (button.hasAttribute('data-comic-connect')) { button.disabled = true; try { await connectComicverse(); } catch (error) { toast(error.message); button.disabled = false; } }
});
