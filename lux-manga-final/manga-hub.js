function readLibraryLanguage() {
  try { return localStorage.getItem('lux.library.language') === 'ar' ? 'ar' : ''; }
  catch { return ''; }
}
const mangaHub = {
  action: 'catalog', type: '', language: readLibraryLanguage(), query: '', activeQuery: '',
  ids: [], message: '', revision: 0, pages: [], page: 0,
  loading: false, started: false, total: null, seen: new Set()
};
const isArabicDexChapter = chapter => chapter.language === 'ar' || (!chapter.language && chapter.title.endsWith(' · عربي'));

function paintMangaHub() {
  const target = $('#manga-hub-results');
  if (!target) return;
  const items = mangaHub.ids.map(get).filter(Boolean);
  target.innerHTML = items.length ? '<div class="studio-grid">' + items.map(card).join('') + '</div>' : '';
  $('#manga-hub-status').textContent = mangaHub.message;
  $('#manga-hub-pagination').hidden = !mangaHub.pages.length;
  $('#manga-hub-page').textContent = 'صفحة ' + (mangaHub.page + 1).toLocaleString('ar-SA');
  $('#manga-hub-prev').disabled = mangaHub.loading || mangaHub.page === 0;
  $('#manga-hub-next').disabled = mangaHub.loading || !mangaHub.pages[mangaHub.page]?.next;
  document.querySelectorAll('.manga-hub [data-dex-browse]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.dexBrowse === mangaHub.action)));
  studioFixImages();
}

async function browseMangaDex(action, cursor = { offset: 0, since: '' }, append = false) {
  const revision = ++mangaHub.revision;
  const library = state;
  if (!append) {
    mangaHub.pages = [];
    mangaHub.page = 0;
    mangaHub.ids = [];
    mangaHub.total = null;
    mangaHub.seen.clear();
    mangaHub.activeQuery = action === 'search' ? mangaHub.query : '';
  }
  mangaHub.action = action;
  mangaHub.started = true;
  mangaHub.loading = true;
  mangaHub.message = 'جارٍ جلب النتائج من MangaDex…';
  paintMangaHub();
  try {
    const options = { type: mangaHub.type, since: cursor.since };
    const result = await dexRequest(action, '', cursor.offset, mangaHub.language, mangaHub.activeQuery, options);
    if (revision !== mangaHub.revision || state !== library) return;
    const ids = [];
    for (const book of result.books) {
      if (mangaHub.seen.has(book.url)) continue;
      mangaHub.seen.add(book.url);
      ids.push(upsertWork(book, dexSite).id);
    }
    mangaHub.total ??= result.total;
    mangaHub.pages.push({ ids, next: result.next });
    showMangaHubPage(mangaHub.pages.length - 1);
    await save();
    if (append && revision === mangaHub.revision) $('#manga-hub-status')?.scrollIntoView({ block: 'start' });
  } catch (error) {
    if (revision !== mangaHub.revision) return;
    mangaHub.message = error.message;
    flagDexOutage();
    if (!append && action === 'catalog') {
      mangaHub.ids = books().filter(book => book.siteId === dexSite &&
        (!mangaHub.type || book.kind === (mangaHub.type === 'ja' ? 'مانجا' : 'مانهوا')) &&
        (!mangaHub.language || book.chapters.some(isArabicDexChapter))).slice(0, 50).map(book => book.id);
      mangaHub.started = mangaHub.ids.length > 0;
    }
  } finally {
    if (revision === mangaHub.revision) {
      mangaHub.loading = false;
      paintMangaHub();
    }
  }
}

function showMangaHubPage(index) {
  mangaHub.page = index;
  mangaHub.ids = mangaHub.pages[index].ids;
  const total = mangaHub.total;
  mangaHub.message = total > 0 ? total.toLocaleString('ar-SA') + ' عمل مطابق في MangaDex'
    : mangaHub.ids.length ? mangaHub.ids.length + ' عمل من MangaDex' : 'لا توجد نتائج مطابقة.';
}

const mountHubAfterRender = render;
render = function() {
  mountHubAfterRender();
  if (db && !dexHealthStarted) {
    dexHealthStarted = true;
    void monitorDexHealth();
  }
  if (view !== 'catalog') return;
  $('#page').insertAdjacentHTML('afterbegin', `<section class="manga-hub" aria-label="تصفح MangaDex">
    <h2>MangaDex</h2>
    <form id="manga-hub-form" class="actions">
      <input name="title" type="search" maxlength="150" aria-label="عنوان المانجا في MangaDex" placeholder="ابحث في MangaDex" value="${esc(mangaHub.query)}" required>
      <button class="primary">بحث</button>
      <label for="manga-hub-ar">لغة المكتبة</label>
      <select id="manga-hub-ar"><option value="" ${mangaHub.language ? '' : 'selected'}>كل اللغات</option><option value="ar" ${mangaHub.language === 'ar' ? 'selected' : ''}>المكتبة العربية فقط</option></select>
    </form>
    <div class="actions">
      <label for="manga-hub-type">نوع العمل</label>
      <select id="manga-hub-type">${[['','الكل'],['ja','مانجا يابانية'],['ko','مانهوا كورية']].map(([value, label]) => `<option value="${value}" ${mangaHub.type === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <button data-dex-browse="catalog" aria-pressed="${mangaHub.action === 'catalog'}">كل الأعمال</button>
      <button data-dex-browse="latest" aria-pressed="${mangaHub.action === 'latest'}">أحدث الفصول</button>
      <button data-dex-browse="popular" aria-pressed="${mangaHub.action === 'popular'}">الأكثر شعبية</button>
      <button data-dex-browse="rated" aria-pressed="${mangaHub.action === 'rated'}">الأعلى تقييمًا</button>
      <button data-action="add-site">المصادر</button>
    </div>
    <p id="manga-hub-status" class="note" role="status"></p><div id="manga-hub-results"></div>
    <div id="manga-hub-pagination" class="actions" hidden><button id="manga-hub-prev">السابق</button><span id="manga-hub-page"></span><button id="manga-hub-next">التالي · أعمال أكثر</button></div>
  </section>`);
  paintMangaHub();
  if (db && !mangaHub.started) void browseMangaDex('catalog');
};

const sitePresetForm = siteForm;
siteForm = function() {
  sitePresetForm();
  $('#siteForm').insertAdjacentHTML('beforebegin', `<div class="manga-hub-presets">
    <label for="sourcePreset">المصدر</label>
    <select id="sourcePreset"><option value="dex">MangaDex · API رسمي</option><option value="proxy">مصدر مخصص · بروكسي الخلاصات</option></select>
    <div id="sourcePresetActions" class="actions"><button data-dex-browse="latest">أحدث الفصول</button><button data-dex-browse="popular">الأكثر شعبية</button></div>
  </div>`);
  const sync = () => {
    const custom = $('#sourcePreset').value === 'proxy';
    $('#siteForm').hidden = !custom;
    $('#smartImport').hidden = !custom;
    $('#sourcePresetActions').hidden = custom;
  };
  $('#sourcePreset').onchange = sync;
  sync();
};

document.addEventListener('submit', event => {
  if (event.target.id !== 'manga-hub-form') return;
  event.preventDefault();
  mangaHub.query = new FormData(event.target).get('title').trim();
  if (mangaHub.query) void browseMangaDex('search');
});
document.addEventListener('change', event => {
  if (event.target.id === 'manga-hub-ar') {
    mangaHub.language = event.target.value === 'ar' ? 'ar' : '';
    try { localStorage.setItem('lux.library.language', mangaHub.language); } catch {}
    dexLastAttempt = 0;
  }
  else if (event.target.id === 'manga-hub-type') mangaHub.type = event.target.value;
  else return;
  void browseMangaDex(mangaHub.action);
});
document.addEventListener('click', event => {
  const pager = event.target.closest('#manga-hub-prev, #manga-hub-next');
  if (pager) {
    if (mangaHub.loading) return;
    const index = mangaHub.page + (pager.id === 'manga-hub-next' ? 1 : -1);
    if (mangaHub.pages[index]) {
      showMangaHubPage(index);
      paintMangaHub();
      $('#manga-hub-status')?.scrollIntoView({ block: 'start' });
    }
    else if (mangaHub.pages[mangaHub.page]?.next) void browseMangaDex(mangaHub.action, mangaHub.pages[mangaHub.page].next, true);
    return;
  }
  const action = event.target.closest('[data-dex-browse]')?.dataset.dexBrowse;
  if (!action) return;
  if ($('#modal')?.open) $('#modal').close();
  if (view !== 'catalog') go('catalog');
  void browseMangaDex(action);
});

const previousMangaCard = card;
card = function(book) {
  const markup = previousMangaCard(book);
  const resume = state.progress[book.id]?.chapter;
  if (mediaOf(book) !== 'manga' || !book.chapters[resume]) return markup;
  return markup.replace('</div></article>', `<button class="textbutton manga-resume" data-read="${esc(book.id)}">متابعة القراءة ←</button></div></article>`);
};
