function novelReaderHref(id, chapterIndex) {
  const params = new URLSearchParams({ view: 'reader', id: String(id), library: '1' });
  if (Number.isInteger(chapterIndex) && chapterIndex >= 0) params.set('chapterIndex', String(chapterIndex));
  return '/?' + params.toString();
}

function novelCover(book) {
  const alt = esc('غلاف ' + book.title);
  const photo = book.cover
    ? `<img src="${esc(proxy(book.cover) + '&kind=cover')}" alt="${alt}" loading="lazy" decoding="async" data-novel-cover>`
    : '';
  return `<span class="novel-cover-art" ${photo ? '' : `role="img" aria-label="${alt}"`}>${photo}</span>`;
}

document.addEventListener('load', event => {
  const image = event.target;
  if (image.matches?.('img[data-novel-cover]') && image.naturalWidth > 4 && image.naturalHeight > 4) {
    image.classList.add('novel-cover-ready');
  }
}, true);

document.addEventListener('error', event => {
  const image = event.target;
  if (!image.matches?.('img[data-published-cover]')) return;
  image.removeAttribute('data-published-cover');
  image.src = '/novel-cover-fallback.svg';
}, true);

function novelCatalogMeta(book) {
  const chapter = book.chapters?.at(-1);
  const tags = (book.genres || []).slice(0, 4);
  return `<p class="novel-sample-chapter">آخر فصل · ${esc(chapter?.title || 'غير متاح')}</p>
    ${tags.length ? `<ul class="novel-catalog-tags" aria-label="التصنيفات">${tags.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>` : ''}`;
}

const novelShelfFilters = { query: '', genre: '', status: '', sort: 'updated' };
const novelSearchText = value => String(value).normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();

function renderNovelSampleShelf() {
  const formatChapter = new Intl.NumberFormat('ar');
  const allNovels = LuxNovelPublications.catalogue();
  const query = novelSearchText(novelShelfFilters.query.trim());
  const novels = allNovels.filter(book =>
    (!query || novelSearchText([book.title, book.author, book.synopsis, ...book.genres].join(' ')).includes(query)) &&
    (!novelShelfFilters.genre || book.genres.includes(novelShelfFilters.genre)) &&
    (!novelShelfFilters.status || book.status === novelShelfFilters.status));
  const order = {
    title: (a, b) => a.title.localeCompare(b.title, 'ar'),
    chapters: (a, b) => b.chapters.length - a.chapters.length,
    updated: (a, b) => (b.updatedAt || b.publishedAt || 0) - (a.updatedAt || a.publishedAt || 0)
  };
  novels.sort(order[novelShelfFilters.sort] || order.updated);
  const genres = [...new Set(allNovels.flatMap(book => book.genres))];
  const recent = allNovels.map(book => ({ book, progress: LuxNovelPages.savedChapter(book) }))
    .filter(item => item.progress).sort((a, b) => b.progress.time - a.progress.time).slice(0, 3);
  function cards(items) {
    return `<div class="novel-sample-grid">${items.map(novel => {
      const latest = novel.chapters.at(-1);
      const progress = LuxNovelPages.savedChapter(novel);
      const chapterLabel = latest ? 'آخر فصل · ' + formatChapter.format(latest.number) + ' — ' + latest.title : 'لا توجد فصول منشورة بعد';
      const primaryUrl = latest ? LuxNovelPages.chapterUrl(novel.id, progress?.chapter ?? novel.chapters[0].number) : LuxNovelPages.detailsUrl(novel.id);
      return `<article class="novel-sample-card" id="sample-novel-${esc(novel.id)}">
        <a class="novel-sample-link" href="${esc(primaryUrl)}" aria-label="${latest ? 'قراءة' : 'تفاصيل'} ${esc(novel.title)}">
        <div class="novel-sample-art">
          <img src="${esc(novel.cover)}" alt="غلاف ${esc(novel.title)}" width="600" height="800" loading="lazy" referrerpolicy="no-referrer" ${novel.publishedAt ? 'data-published-cover' : ''}>
          <span>${esc(novel.status)}</span>
        </div>
        <div class="novel-sample-copy">
          <h3>${esc(novel.title)}</h3>
          <p class="novel-card-author">${esc(novel.author)} · ${formatChapter.format(novel.chapters.length)} فصول</p>
          <p class="novel-sample-chapter">${esc(chapterLabel)}</p>
          <p class="novel-sample-synopsis">${esc(novel.synopsis)}</p>
          <ul aria-label="التصنيفات">${novel.genres.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>
        </div>
        </a>
        <div class="novel-card-footer">
          ${latest ? `<a href="${esc(LuxNovelPages.chapterUrl(novel.id, progress?.chapter ?? novel.chapters[0].number))}">${progress ? 'أكمل القراءة' : 'ابدأ القراءة'} ←</a>` : '<span>لا توجد فصول منشورة</span>'}
          <a href="${esc(LuxNovelPages.detailsUrl(novel.id))}">الفهرس</a>
        </div>
      </article>`;
    }).join('')}</div>`;
  }
  return `<section id="novel-local-shelf" class="novel-sample-shelf" aria-label="رف الروايات">
    <section class="novel-discover-hero" aria-labelledby="novel-discover-title">
      <div class="novel-hero-copy"><span class="eyetag" lang="en">A LITTLE QUIET. A WHOLE NEW WORLD.</span>
        <h2 id="novel-discover-title">افتح كتابًا.<br><em>واترك العالم ينتظر.</em></h2>
        <p>مساحة هادئة لحكاياتك. اقرأ على مهل، وارجع دائمًا إلى حيث توقفت.</p>
        <div class="novel-hero-actions"><a class="primary" href="#novel-samples-title">اكتشف حكايتك التالية ↓</a><a href="/?view=admin">استوديو الناشر ↗</a></div>
        <div class="novel-library-numbers"><span><b>${formatChapter.format(allNovels.length)}</b> روايات في الرف</span><span><b>${formatChapter.format(allNovels.reduce((sum, book) => sum + book.chapters.length, 0))}</b> فصول متاحة</span><span>ثلاثة أوضاع للقراءة</span></div>
      </div>
      <div class="novel-cover-stack" aria-hidden="true">${allNovels.slice(0, 3).map(book => `<img src="${esc(book.cover)}" alt="" width="600" height="800" referrerpolicy="no-referrer" data-published-cover>`).join('')}</div>
    </section>
    ${recent.length ? `<section class="novel-resume-section"><div class="novel-section-title"><div><span class="eyetag">YOUR NEXT CHAPTER</span><h2>من حيث توقفت</h2></div><span>موضعك محفوظ على هذا الجهاز</span></div><div class="novel-resume-grid">${recent.map(({book, progress}) => `<a class="novel-resume-card" href="${esc(LuxNovelPages.chapterUrl(book.id, progress.chapter))}"><img src="${esc(book.cover)}" alt="" width="60" height="80" data-published-cover><span><b>${esc(book.title)}</b><small>متابعة الفصل ${formatChapter.format(progress.chapter)}</small></span><span aria-hidden="true">←</span></a>`).join('')}</div></section>` : ''}
    <div class="novel-section-title"><div><span class="eyetag">THE COLLECTION</span><h2 id="novel-samples-title">كل حكاياتك، في مكان واحد</h2></div><span aria-live="polite">${formatChapter.format(novels.length)} روايات</span></div>
    <div class="novel-library-tools">
      <label class="novel-library-search">ابحث في الروايات<input type="search" id="novelLibraryQuery" value="${esc(novelShelfFilters.query)}" placeholder="عنوان، كاتب، أو تصنيف…" autocomplete="off"></label>
      <label>حالة العمل<select id="novelLibraryStatus"><option value="">كل الحالات</option>${['مستمرة','مكتملة'].map(status => `<option ${status === novelShelfFilters.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
      <label>الترتيب<select id="novelLibrarySort">${[['updated','آخر تحديث'],['title','الاسم أبجديًا'],['chapters','عدد الفصول']].map(([value,label]) => `<option value="${value}" ${value === novelShelfFilters.sort ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    </div>
    <div class="novel-genre-filters" aria-label="تصنيفات الروايات">${['',...genres].map(genre => `<button type="button" data-novel-genre="${esc(genre)}" aria-pressed="${genre === novelShelfFilters.genre}">${esc(genre || 'الكل')}</button>`).join('')}</div>
    ${cards(novels)}
    ${!novels.length ? '<div class="novel-search-empty"><h3>لم نعثر على حكاية مطابقة</h3><p>جرّب عنوانًا آخر أو امسح عوامل التصفية.</p><button type="button" data-novel-reset>عرض كل الروايات</button></div>' : ''}
    <p class="novel-shelf-note">أعمال استوديو الناشر ومواضع القراءة محفوظة في متصفحك. أضف مصادر حقيقية لتوسيع مكتبتك.</p>
  </section>`;
}

let novelFilterTimer;
function updateNovelFilters() {
  const shelf = document.getElementById('novel-local-shelf');
  if (shelf) shelf.outerHTML = renderNovelSampleShelf();
}
document.addEventListener('input', event => {
  if (event.target.id !== 'novelLibraryQuery') return;
  novelShelfFilters.query = event.target.value;
  clearTimeout(novelFilterTimer);
  novelFilterTimer = setTimeout(() => {
    if (view !== 'novels') return;
    updateNovelFilters();
    document.getElementById('novelLibraryQuery')?.focus({ preventScroll: true });
  }, 180);
});
document.addEventListener('change', event => {
  if (event.target.id === 'novelLibraryStatus') novelShelfFilters.status = event.target.value;
  else if (event.target.id === 'novelLibrarySort') novelShelfFilters.sort = event.target.value;
  else return;
  updateNovelFilters();
});
document.addEventListener('click', event => {
  const genre = event.target.closest('[data-novel-genre]');
  if (genre) {
    novelShelfFilters.genre = genre.dataset.novelGenre;
    updateNovelFilters();
  }
  if (event.target.closest('[data-novel-reset]')) {
    Object.assign(novelShelfFilters, { query: '', genre: '', status: '', sort: 'updated' });
    updateNovelFilters();
  }
});

function prepareNovelReader(note) {
  const page = document.getElementById('page');
  document.body.classList.add('novel-sample-reading');
  page.innerHTML = `<div class="novel-sample-reader-top">
    <a href="/?view=novels">العودة إلى الروايات</a>
    <span>${note}</span>
  </div><div class="novel-sample-reader-host"></div>`;
  return page.querySelector('.novel-sample-reader-host');
}

function renderNovelSampleReader(params) {
  const mount = prepareNovelReader('فصول تجريبية مختارة');
  const sample = NOVELS_DATA.find(novel => String(novel.id) === params.get('id'));

  if (!sample) {
    document.title = 'رواية غير متاحة — لوكس';
    mount.innerHTML = '<p role="status">تعذّر العثور على هذه الرواية التجريبية.</p>';
    return;
  }

  document.title = sample.title + ' — لوكس';
  const book = {
    ...sample,
    chapters: sample.chapters.map(chapter => ({
      ...chapter,
      title: `الفصل ${chapter.number} · ${chapter.title}`
    }))
  };
  const render = index => LuxNovelReader.render(book, index, { mount, selectChapter });
  function selectChapter(index) {
    const chapter = book.chapters[index];
    if (!chapter) return;
    params.set('chapter', String(chapter.number));
    history.replaceState(null, '', '?' + params.toString());
    render(index);
    const heading = mount.querySelector('h2');
    heading.tabIndex = -1;
    heading.focus();
  }
  const index = book.chapters.findIndex(chapter => String(chapter.number) === params.get('chapter'));
  render(Math.max(0, index));
}

async function renderLibraryNovelReader(params) {
  const mount = prepareNovelReader('قارئ الروايات');
  mount.innerHTML = '<p role="status">جارٍ استعادة الفصل من مكتبتك…</p>';
  try {
    await init({ localFirst: true, renderPage: false });
  } catch {
    mount.innerHTML = '<p role="status">تعذّر فتح المكتبة على هذا الجهاز.</p>';
    return;
  }
  const book = get(params.get('id'));
  if (!book || mediaOf(book) !== 'novels' || !book.chapters?.length) {
    mount.innerHTML = '<p role="status">هذه الرواية أو فصولها غير متاحة في مكتبة هذا الجهاز.</p>';
    return;
  }

  document.title = book.title + ' — لوكس';
  let requestId = 0;

  function render(index, message, retry) {
    LuxNovelReader.render(book, index, {
      mount,
      selectChapter,
      message,
      retry,
      canSave: !message,
      finishChapter: message ? undefined : () => {
        recordRead(book.id, index, { refresh: false });
        if (prefs().autoNext && book.chapters[index + 1]) selectChapter(index + 1);
        else toast('حُفظ الفصل ضمن المقروء');
      }
    });
  }

  async function selectChapter(index) {
    const chapter = book.chapters[index];
    if (!chapter) return;
    const attempt = ++requestId;
    history.replaceState(null, '', novelReaderHref(book.id, index));
    window.scrollTo(0, 0);
    const retry = () => selectChapter(index);
    if (!chapter.text?.length) {
      if (!navigator.onLine) {
        render(index, 'هذا الفصل غير محفوظ على الجهاز. اتصل بالإنترنت لإحضاره من المصدر.', retry);
        return;
      }
      render(index, 'جارٍ جلب نص الفصل من المصدر…');
      try {
        await loadChapter(chapter, { fetchPage: sourceAttempt });
      } catch (error) {
        const message = error.name === 'TimeoutError'
          ? 'انتهت مهلة المصدر. أعد المحاولة أو اختر فصلًا آخر.'
          : error.message || 'تعذّر فتح الفصل من المصدر.';
        if (attempt === requestId) render(index, message, retry);
        return;
      }
    }
    if (attempt !== requestId) return;
    const progress = state.progress[book.id] ??= { read: [] };
    progress.chapter = index;
    progress.time = new Date().toISOString();
    if (listOf(book.id) !== 'completed') state.lists[book.id] = 'reading';
    render(index);
    save();
    if (navigator.onLine && state.autoDownload && state.favorites.includes(book.id) && !state.downloads[chapter.url]) {
      downloadChapter(book.id, index);
    }
  }

  const requested = params.get('chapterIndex');
  const index = requested !== null && /^\d+$/.test(requested)
    ? Number(requested) : state.progress[book.id]?.chapter ?? 0;
  selectChapter(book.chapters[index] ? index : 0);
}
