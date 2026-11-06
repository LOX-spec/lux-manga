const mangaHub = { action: 'latest', language: '', query: '', ids: null, message: '', revision: 0 };
const isArabicDexChapter = chapter => chapter.language === 'ar' || (!chapter.language && chapter.title.endsWith(' · عربي'));

function paintMangaHub() {
  const target = $('#manga-hub-results');
  if (!target) return;
  const items = mangaHub.ids ? mangaHub.ids.map(get).filter(Boolean)
    : books().filter(book => book.siteId === dexSite).sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || ''))).slice(0, 12);
  target.innerHTML = items.length ? '<div class="studio-grid">' + items.map(card).join('') + '</div>' : '';
  $('#manga-hub-status').textContent = mangaHub.message;
  studioFixImages();
}

async function browseMangaDex(action) {
  const revision = ++mangaHub.revision;
  const library = state;
  mangaHub.action = action;
  mangaHub.message = 'جارٍ جلب النتائج من MangaDex…';
  paintMangaHub();
  try {
    const result = await dexRequest(action, '', 0, mangaHub.language, mangaHub.query);
    if (revision !== mangaHub.revision || state !== library) return;
    mangaHub.ids = result.books.map(book => upsertWork(book, dexSite).id);
    mangaHub.message = result.books.length ? result.books.length + ' عمل من MangaDex' : 'لا توجد نتائج مطابقة.';
    await save();
  } catch (error) {
    if (revision !== mangaHub.revision) return;
    mangaHub.message = error.message;
  }
  if (revision === mangaHub.revision) paintMangaHub();
}

const mountHubAfterRender = render;
render = function() {
  mountHubAfterRender();
  if (view !== 'catalog') return;
  $('#page').insertAdjacentHTML('afterbegin', `<section class="manga-hub" aria-label="تصفح MangaDex">
    <h2>MangaDex</h2>
    <form id="manga-hub-form" class="actions">
      <input name="title" type="search" maxlength="150" aria-label="عنوان المانجا في MangaDex" placeholder="ابحث في MangaDex" value="${esc(mangaHub.query)}" required>
      <button class="primary">بحث</button>
      <label><input id="manga-hub-ar" type="checkbox" ${mangaHub.language === 'ar' ? 'checked' : ''}> ترجمات عربية فقط</label>
    </form>
    <div class="actions"><button data-dex-browse="latest">أحدث الفصول</button><button data-dex-browse="popular">الأكثر شعبية</button><button data-action="add-site">المصادر</button></div>
    <p id="manga-hub-status" class="note" role="status"></p><div id="manga-hub-results"></div>
  </section>`);
  paintMangaHub();
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
  if (event.target.id !== 'manga-hub-ar') return;
  mangaHub.language = event.target.checked ? 'ar' : '';
  mangaHub.ids = [];
  void browseMangaDex(mangaHub.action);
});
document.addEventListener('click', event => {
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
