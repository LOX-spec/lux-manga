const sourceEngine = { provider: 'mangadex', sources: [], loaded: false, busy: false, page: 1, next: false, items: [], selected: '', message: '', revision: 0 };
try { sourceEngine.provider = localStorage.getItem('lux.source.engine') === 'suwayomi' ? 'suwayomi' : 'mangadex'; } catch {}
async function engineRequest(action, options = {}) {
  const response = await fetch('/api/suwayomi?' + new URLSearchParams({ action, adult: mangaHub.adult ? '1' : '0', ...options }), { signal: AbortSignal.timeout(28000) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'تعذر تحميل بيانات المحرك.');
  return data;
}
function saveEngineBook(work) {
  const book = upsertWork(work, 'suwayomi-' + work.engineSource);
  Object.assign(book, { engine: 'suwayomi', engineId: work.engineId, engineSource: work.engineSource, isNsfw: work.isNsfw, verifiedLanguages: work.verifiedLanguages || [] });
  return book;
}
async function loadEngineSources() {
  sourceEngine.message = 'جارٍ فحص اتصال محرك الإضافات…';
  paintSourceEngine();
  try {
    const result = await engineRequest('sources');
    sourceEngine.sources = result.sources;
    sourceEngine.message = result.configured ? 'اختر مصدرًا مثبتًا على الخادم لبدء التصفح.' : result.message;
    sourceEngine.loaded = true;
  } catch (error) { sourceEngine.message = error.message; }
  paintSourceEngine();
}
function paintSourceEngine() {
  const panel = $('#source-engine-panel');
  if (!panel) return;
  const engine = sourceEngine.provider === 'suwayomi';
  const dex = $('.manga-hub');
  if (dex) dex.hidden = engine;
  panel.innerHTML = `<label for="libraryEngine">محرك المكتبة</label><select id="libraryEngine"><option value="mangadex" ${!engine?'selected':''}>MangaDex · المصدر الحالي</option><option value="suwayomi" ${engine?'selected':''}>Suwayomi · إضافات Tachiyomi / Keiyoushi</option></select>${engine?`<p>مصادر الإضافات المثبتة على خادمك. تُدار الإضافات من Suwayomi، وتُقرأ الفصول هنا في لوكس.</p><label for="engineSource">المصدر المثبت</label><select id="engineSource"><option value="">اختر المصدر</option>${sourceEngine.sources.filter(source=>!mangaHub.language||source.lang===mangaHub.language).map(source=>`<option value="${esc(source.id)}" ${sourceEngine.selected===String(source.id)?'selected':''}>${esc(source.name)} · ${esc(source.lang)}</option>`).join('')}</select><label for="engineLanguage">لغة المصادر</label><select id="engineLanguage">${languageOptions()}</select><form id="engineSearch"><label for="engineQuery">عنوان العمل</label><input id="engineQuery" maxlength="150" name="q"><button ${sourceEngine.busy?'disabled':''}>بحث</button></form><div class="actions"><button data-engine-browse="POPULAR" ${sourceEngine.busy?'disabled':''}>الأكثر شعبية</button><button data-engine-browse="LATEST" ${sourceEngine.busy?'disabled':''}>أحدث الأعمال</button><button data-engine-connect>إعادة الاتصال</button></div><p role="status">${esc(sourceEngine.message)}</p><div>${sourceEngine.items.map((book,index)=>`<button class="engine-result" data-engine-book="${index}">${esc(book.title)} · فتح الفهرس والتحقق من الفصول</button>`).join('')}</div><button data-engine-more ${!sourceEngine.next||sourceEngine.busy?'disabled':''}>تحميل المزيد</button>`:''}`;
}
const renderBeforeSourceEngine = render;
render = function() {
  renderBeforeSourceEngine();
  if (view !== 'catalog') return;
  $('#page').insertAdjacentHTML('afterbegin', '<section id="source-engine-panel" class="backup-panel"></section>');
  paintSourceEngine();
  if (sourceEngine.provider === 'suwayomi' && !sourceEngine.loaded) void loadEngineSources();
  if (db && !sourceEngine.deepOpened && /^\d+$/.test(engineDeepLink.get('suwayomi') || '')) {
    sourceEngine.deepOpened = true;
    void openEngineBook(engineDeepLink.get('suwayomi'),engineDeepLink.get('chapter'));
  }
};
async function browseEngine(type, query = '', more = false) {
  if (sourceEngine.busy || !sourceEngine.selected) { if(!sourceEngine.selected) toast('اختر مصدرًا مثبتًا أولًا.'); return; }
  const revision = ++sourceEngine.revision;
  const adult = mangaHub.adult;
  sourceEngine.busy = true;
  if (!more) { sourceEngine.page = 1; sourceEngine.items = []; }
  sourceEngine.type = type; sourceEngine.query = query;
  sourceEngine.message = 'جارٍ جلب فهرس المصدر…';
  paintSourceEngine();
  try {
    const result = await engineRequest('browse', { source: sourceEngine.selected, page: sourceEngine.page, type, q: query });
    if (revision !== sourceEngine.revision || adult !== mangaHub.adult) return;
    sourceEngine.items.push(...result.books);
    sourceEngine.next = result.hasNextPage;
    sourceEngine.message = sourceEngine.items.length + ' نتائج في المصدر. تُجلب الفصول عند فتح الفهرس.';
  } catch(error) { sourceEngine.message = error.message; sourceEngine.next = false; }
  finally { sourceEngine.busy = false; paintSourceEngine(); }
}
async function openEngineBook(id, chapterId) {
  const adult = mangaHub.adult;
  try {
    const { book: work } = await engineRequest('details', { id });
    if (adult !== mangaHub.adult) return;
    const book = saveEngineBook(work);
    await save();
    if (chapterId) {
      const index = book.chapters.findIndex(chapter => String(chapter.engineId) === String(chapterId));
      if(index >= 0) { read(book.id, index); return; }
    }
    detail(book.id);
  } catch(error) { toast(error.message); }
}
const loadBeforeSourceEngine = loadChapter;
loadChapter = async function(chapter, options) {
  if (chapter.engine !== 'suwayomi') return loadBeforeSourceEngine(chapter, options);
  if (chapter.images?.length && state.downloads[chapter.url]) return chapter;
  const data = await engineRequest('pages', { id: chapter.engineId });
  if (!data.images.length) throw Error('لا توجد صفحات متاحة لهذا الفصل.');
  chapter.images = data.images;
  await save();
  return chapter;
};
const refreshBeforeSourceEngine = refreshBook;
refreshBook = async function(id) {
  const book = get(id);
  if (book?.engine !== 'suwayomi') return refreshBeforeSourceEngine(id);
  const result = await engineRequest('details', { id: book.engineId });
  const saved = saveEngineBook(result.book);
  await save();
  return saved;
};
document.addEventListener('change', event => {
  if (event.target.id === 'libraryEngine') {
    sourceEngine.provider = event.target.value;
    try { localStorage.setItem('lux.source.engine', sourceEngine.provider); } catch {}
    render();
    if(sourceEngine.provider==='mangadex'&&!mangaHub.started) void browseMangaDex('catalog');
  }
  if (event.target.id === 'engineSource') { sourceEngine.selected = event.target.value; sourceEngine.items=[]; sourceEngine.next=false; sourceEngine.revision++; }
  if (event.target.id === 'engineLanguage') {
    mangaHub.language = event.target.value;
    try { localStorage.setItem('lux.library.language',mangaHub.language); } catch {}
    sourceEngine.selected='';sourceEngine.items=[];sourceEngine.next=false;sourceEngine.revision++;render();
  }
  if(event.target.id==='dex-adult-content') { sourceEngine.items=[];sourceEngine.sources=[];sourceEngine.loaded=false;sourceEngine.next=false;sourceEngine.revision++; }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'engineSearch') return;
  event.preventDefault();
  void browseEngine('SEARCH',new FormData(event.target).get('q').trim());
});
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if(button.hasAttribute('data-engine-connect')) void loadEngineSources();
  if(button.dataset.engineBrowse) void browseEngine(button.dataset.engineBrowse);
  if(button.hasAttribute('data-engine-more')) { sourceEngine.page++; void browseEngine(sourceEngine.type,sourceEngine.query,true); }
  if(button.hasAttribute('data-engine-book')) void openEngineBook(sourceEngine.items[Number(button.dataset.engineBook)].engineId);
  if(button.hasAttribute('data-open-engine')) { sourceEngine.provider='suwayomi';try{localStorage.setItem('lux.source.engine','suwayomi')}catch{};$('#modal').close();go('catalog'); }
});
const engineDeepLink = new URLSearchParams(location.search);
