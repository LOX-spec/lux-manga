function readLibraryLanguage() {
  try { return localStorage.getItem('lux.library.language') || ''; }
  catch { return ''; }
}
function readAdultPreference() {
  try { return localStorage.getItem('lux.library.adult') === '1'; }
  catch { return false; }
}
const libraryLanguageCodes = ('aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu es-la pt-br zh-hk ja-ro ko-ro zh-ro fil sco yue').split(' ');
const libraryLanguageNames = new Intl.DisplayNames(['ar'], { type: 'language' });
const libraryVariants = { 'es-la': 'الإسبانية (أمريكا اللاتينية)', 'pt-br': 'البرتغالية (البرازيل)', 'zh-hk': 'الصينية التقليدية',
  'ja-ro': 'اليابانية (بحروف لاتينية)', 'ko-ro': 'الكورية (بحروف لاتينية)', 'zh-ro': 'الصينية (بحروف لاتينية)' };
const libraryLanguageName = code => libraryVariants[code] || libraryLanguageNames.of(code);
function languageOptions() {
  const common = ['ar','en','es','es-la','fr','ja','ko','zh','pt','pt-br','de','it','tr','ru'];
  const rest = libraryLanguageCodes.filter(code => !common.includes(code))
    .sort((a, b) => libraryLanguageName(a).localeCompare(libraryLanguageName(b), 'ar'));
  return [['','كل اللغات'], ...[...common, ...rest].map(code => [code, libraryLanguageName(code)])]
    .map(([code, name]) => `<option value="${code}" ${mangaHub.language === code ? 'selected' : ''}>${esc(name)}</option>`).join('');
}
const mangaHub = {
  action: 'catalog', type: '', language: readLibraryLanguage(), adult: readAdultPreference(), query: '', activeQuery: '',
  ids: [], message: '', revision: 0, pages: [], page: 0,
  loading: false, started: false, total: null, seen: new Set()
};
const isArabicDexChapter = chapter => chapter.language === 'ar' || (!chapter.language && chapter.title.endsWith(' · عربي'));
function matchesLibraryChapter(book, chapter) {
  const language = mangaHub.language;
  if (!chapter) return false;
  if (!language || mediaOf(book) !== 'manga') return true;
  if (book.siteId === 'local-samples') return language === 'ar';
  return language === 'ar' ? isArabicDexChapter(chapter) : chapter.language === language ||
    (language === 'en' && !chapter.language && chapter.title.endsWith(' · English'));
}
function visibleLibraryWork(book) {
  if (!mangaHub.language || mediaOf(book) !== 'manga') return true;
  return book.translationLanguages?.includes(mangaHub.language) ||
    (book.siteId === 'local-samples' && mangaHub.language === 'ar') ||
    book.chapters.some(chapter => matchesLibraryChapter(book, chapter));
}

function paintMangaHub() {
  const target = $('#manga-hub-results');
  if (!target) return;
  const items = mangaHub.ids.map(get).filter(book => book && visibleLibraryWork(book));
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
      ids.push(storeDexWork(book).id);
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
        visibleLibraryWork(book)).slice(0, 50).map(book => book.id);
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
      <select id="manga-hub-ar">${languageOptions()}</select>
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
    mangaHub.language = libraryLanguageCodes.includes(event.target.value) ? event.target.value : '';
    try { localStorage.setItem('lux.library.language', mangaHub.language); } catch {}
    dexLastAttempt = 0;
    render();
  }
  else if (event.target.id === 'manga-hub-type') mangaHub.type = event.target.value;
  else return;
  void browseMangaDex(mangaHub.action);
});

const settingsBeforeContentChoice = renderSettings;
renderSettings = function() {
  settingsBeforeContentChoice();
  $('#page').insertAdjacentHTML('beforeend', `<section class="backup-panel"><div>
    <h3>محتوى MangaDex للبالغين</h3>
    <label><input id="dex-adult-content" type="checkbox" ${mangaHub.adult ? 'checked' : ''}> عرض محتوى البالغين (+18)</label>
    <p>رؤية المحتوى الإباحي وأي محتوى آخر للبالغين على مسؤوليتك أنت.</p>
  </div></section>`);
};
document.addEventListener('change', event => {
  if (event.target.id !== 'dex-adult-content') return;
  if (event.target.checked && !window.confirm('أؤكد أن عمري 18 سنة أو أكثر. رؤية المحتوى الإباحي وأي محتوى آخر للبالغين على مسؤوليتك أنت.')) {
    event.target.checked = false;
    return;
  }
  mangaHub.adult = event.target.checked;
  try { localStorage.setItem('lux.library.adult', mangaHub.adult ? '1' : '0'); } catch {}
  mangaHub.revision++;
  mangaHub.pages = [];
  mangaHub.ids = [];
  mangaHub.seen.clear();
  mangaHub.loading = false;
  mangaHub.started = false;
  dexLastAttempt = 0;
  toast(mangaHub.adult ? 'فُعّل عرض محتوى البالغين.' : 'أُخفي محتوى البالغين.');
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
