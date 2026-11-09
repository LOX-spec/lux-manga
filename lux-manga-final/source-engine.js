const sourceEngine = { provider: 'suwayomi', sources: [], loaded: false, busy: false, page: 1, next: false, items: [], selected: '', message: '', revision: 0 };
try { localStorage.setItem('lux.source.engine','suwayomi'); } catch {}
async function engineRequest(action, options = {}) {
  const response = await fetch('/api/suwayomi?' + new URLSearchParams({ action, adult: mangaHub.adult ? '1' : '0', ...options }), { signal: AbortSignal.timeout(28000) });
  const data = await response.json();
  if (!response.ok) {const error=Error(data.error || 'تعذر تحميل بيانات المحرك.');error.code=data.code;throw error;}
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
    if(!result.sources.some(source=>String(source.id)===sourceEngine.selected))sourceEngine.selected='';
    sourceEngine.message = result.configured ? 'اختر مصدرًا مثبتًا على الخادم لبدء التصفح.' : result.message;
    sourceEngine.loaded = true;
    if (result.configured && !sourceEngine.selected) {
      sourceEngine.selected = String(result.sources.find(source => !mangaHub.language || source.lang === mangaHub.language)?.id || '');
      if (sourceEngine.selected) void browseEngine('POPULAR');
    }
  } catch (error) { sourceEngine.message = error.message; }
  paintSourceEngine();
}
function paintSourceEngine() {
  const panel = $('#source-engine-panel');
  if (!panel) return;
  panel.innerHTML = `<header class="engine-heading"><div><span class="eyetag">LUX / MANGA</span><h1>مكتبة المانجا والمانهوا</h1><p>اكتشف عملك القادم من المصادر العربية.</p></div><button data-engine-connect aria-label="تحديث المصادر">↻ تحديث المصادر</button></header>
  <div class="engine-controls"><label for="engineSource">المصدر<select id="engineSource"><option value="">اختر المصدر</option>${sourceEngine.sources.filter(source=>!mangaHub.language||source.lang===mangaHub.language).map(source=>`<option value="${esc(source.id)}" ${sourceEngine.selected===String(source.id)?'selected':''}>${esc(source.name)}</option>`).join('')}</select></label><label for="engineLanguage">اللغة<select id="engineLanguage">${languageOptions()}</select></label><form id="engineSearch"><label for="engineQuery">ابحث عن عمل</label><div><input id="engineQuery" maxlength="150" name="q" value="${esc(sourceEngine.query||'')}" placeholder="اسم المانجا أو المانهوا…"><button class="primary" ${sourceEngine.busy?'disabled':''}>بحث</button></div></form></div>
  <div class="engine-tabs"><button data-engine-browse="POPULAR" aria-pressed="${sourceEngine.type!=='LATEST'}">الأكثر شعبية</button><button data-engine-browse="LATEST" aria-pressed="${sourceEngine.type==='LATEST'}">أحدث الأعمال</button><span role="status">${esc(sourceEngine.message)}</span></div>
  ${sourceEngine.failedSource===sourceEngine.selected?'<div class="engine-recovery"><button data-engine-alternative>تجربة مصدر آخر</button><button data-action="add-site">استيراد بديل من رابط أو كود الصفحة</button></div>':''}<div class="engine-grid" aria-busy="${sourceEngine.busy}">${sourceEngine.items.map((book,index)=>`<article class="engine-card"><button class="engine-cover" data-engine-book="${index}" aria-label="تفاصيل ${esc(book.title)}"><img src="${esc(book.cover)}" alt="غلاف ${esc(book.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/novel-cover-fallback.svg'"><span>عرض الفصول ←</span></button><div class="engine-card-copy"><small>${esc(book.kind)} · عربي</small><h2 dir="auto">${esc(book.title)}</h2><button data-engine-book="${index}">تصفح العمل ←</button></div></article>`).join('')}</div>
  ${!sourceEngine.busy&&!sourceEngine.items.length?'<div class="empty">اختر مصدرًا أو جرّب البحث عن عمل.</div>':''}<div class="engine-pagination"><button data-engine-more ${!sourceEngine.next||sourceEngine.busy?'disabled':''}>${sourceEngine.busy?'جارٍ التحميل…':'تحميل المزيد'}</button></div>`;
}
const renderBeforeSourceEngine = render;
render = function() {
  renderBeforeSourceEngine();
  if (view !== 'catalog') return;
  $('#page').innerHTML='<section id="source-engine-panel"></section>'+ (books().filter(book=>mediaOf(book)==='manga').length?'<section class="engine-saved"><h2>من مكتبتك</h2><div class="studio-grid">'+books().filter(book=>mediaOf(book)==='manga').map(card).join('')+'</div></section>':'');
  paintSourceEngine();
  if (sourceEngine.provider === 'suwayomi' && !sourceEngine.loaded) void loadEngineSources();
  if (db && !sourceEngine.deepOpened && /^\d+$/.test(engineDeepLink.get('suwayomi') || '')) {
    sourceEngine.deepOpened = true;
    void openEngineBook(engineDeepLink.get('suwayomi'),engineDeepLink.get('chapter'));
  }
};
async function browseEngine(type, query = '', more = false) {
  if (sourceEngine.busy) { sourceEngine.pending={type,query,more}; return; }
  if (!sourceEngine.selected) { toast('اختر مصدرًا مثبتًا أولًا.'); return; }
  const revision = ++sourceEngine.revision;
  const adult = mangaHub.adult;
  sourceEngine.busy = true;sourceEngine.failedSource='';
  if (!more) { sourceEngine.page = 1; sourceEngine.items = []; }
  sourceEngine.type = type; sourceEngine.query = query;
  sourceEngine.message = 'جارٍ جلب فهرس المصدر…';
  paintSourceEngine();
  try {
    const result = await engineRequest('browse', { source: sourceEngine.selected, page: sourceEngine.page, type, q: query });
    if (revision !== sourceEngine.revision || adult !== mangaHub.adult) return;
    sourceEngine.items.push(...result.books);
    sourceEngine.next = result.hasNextPage;sourceEngine.failedSource='';
    sourceEngine.message = sourceEngine.items.length + ' نتائج في المصدر. تُجلب الفصول عند فتح الفهرس.';
  } catch(error) { if(revision!==sourceEngine.revision)return;sourceEngine.message = error.message; sourceEngine.next = false;sourceEngine.failedSource=sourceEngine.selected;if(more)sourceEngine.page=Math.max(1,sourceEngine.page-1); }
  finally { sourceEngine.busy = false; paintSourceEngine(); if(sourceEngine.pending){const next=sourceEngine.pending;sourceEngine.pending=null;void browseEngine(next.type,next.query,next.more);} }
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
  if (event.target.id === 'engineSource') { sourceEngine.selected = event.target.value; sourceEngine.items=[]; sourceEngine.next=false; sourceEngine.revision++; void browseEngine('POPULAR'); }
  if (event.target.id === 'engineLanguage') {
    mangaHub.language = event.target.value;
    try { localStorage.setItem('lux.library.language',mangaHub.language); } catch {}
    sourceEngine.selected=String(sourceEngine.sources.find(source=>!mangaHub.language||source.lang===mangaHub.language)?.id||'');sourceEngine.items=[];sourceEngine.next=false;sourceEngine.revision++;sourceEngine.failedSource='';render();
    if(sourceEngine.selected)void browseEngine('POPULAR');
    else if(!sourceEngine.loaded)void loadEngineSources();
    else {sourceEngine.message='لا يوجد مصدر مثبت لهذه اللغة. اختر لغة أخرى أو أضف مصدرًا مناسبًا إلى الخادم.';paintSourceEngine();}
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
  if(button.hasAttribute('data-engine-alternative')){const alternative=sourceEngine.sources.find(source=>String(source.id)!==sourceEngine.selected&&(!mangaHub.language||source.lang===mangaHub.language));if(alternative){sourceEngine.selected=String(alternative.id);sourceEngine.failedSource='';void browseEngine('POPULAR');}}
  if(button.dataset.engineBrowse) void browseEngine(button.dataset.engineBrowse);
  if(button.hasAttribute('data-engine-more')&&!sourceEngine.busy) { sourceEngine.page++; void browseEngine(sourceEngine.type,sourceEngine.query,true); }
  if(button.hasAttribute('data-engine-book')) void openEngineBook(sourceEngine.items[Number(button.dataset.engineBook)].engineId);
  if(button.hasAttribute('data-open-engine')) { sourceEngine.provider='suwayomi';try{localStorage.setItem('lux.source.engine','suwayomi')}catch{};$('#modal').close();go('catalog'); }
});
const engineDeepLink = new URLSearchParams(location.search);
