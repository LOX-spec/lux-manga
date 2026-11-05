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

function renderNovelSampleShelf() {
  const formatChapter = new Intl.NumberFormat('ar');
  const novels = LuxNovelPublications.catalogue();
  function cards(items) {
    return `<div class="novel-sample-grid">${items.map(novel => {
      const latest = novel.chapters.at(-1);
      const chapterLabel = latest ? 'آخر فصل · ' + formatChapter.format(latest.number) + ' — ' + latest.title : 'لا توجد فصول منشورة بعد';
      return `<article class="novel-sample-card" id="sample-novel-${esc(novel.id)}">
        <a class="novel-sample-link" href="${esc(LuxNovelPages.detailsUrl(novel.id))}" aria-label="تفاصيل ${esc(novel.title)}">
        <div class="novel-sample-art">
          <img src="${esc(novel.cover)}" alt="غلاف ${esc(novel.title)}" width="600" height="800" loading="lazy" referrerpolicy="no-referrer" ${novel.publishedAt ? 'data-published-cover' : ''}>
          <span>${esc(novel.status)}</span>
        </div>
        <div class="novel-sample-copy">
          <h3>${esc(novel.title)}</h3>
          <p class="novel-sample-chapter">${esc(chapterLabel)}</p>
          <p class="novel-sample-synopsis">${esc(novel.synopsis)}</p>
          <ul aria-label="التصنيفات">${novel.genres.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>
          <span class="novel-sample-action">عرض الرواية والفصول ←</span>
        </div>
        </a>
      </article>`;
    }).join('')}</div>`;
  }
  const published = novels.filter(novel => novel.publishedAt);
  return `<section id="novel-local-shelf" class="novel-sample-shelf" aria-label="رف الروايات">
    ${published.length ? `<h2>روايات من استوديو لوكس</h2>${cards(published)}` : ''}
    <h2 id="novel-samples-title">روايات تجريبية</h2>
    <p class="note">روايات تجريبية بأغلفة وفصول مختارة جاهزة للقراءة.</p>
    ${cards(novels.filter(novel => !novel.publishedAt))}
  </section>`;
}

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
