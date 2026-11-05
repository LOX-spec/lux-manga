const LuxNovelPages = (() => {
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const chapterUrl = (id, number) => '/?view=reader&id=' + encodeURIComponent(id) + '&chapter=' + encodeURIComponent(number);
  const detailsUrl = id => '/?view=novel&id=' + encodeURIComponent(id);

  const chapterNumbers = chapters => chapters.map(chapter => chapter.number).join(',');
  function savedChapter(book) {
    try {
      const number = localStorage.getItem('lux-sample-progress:v1:' + book.id);
      const chapter = book.chapters.find(item => String(item.number) === number);
      if (chapter) return { chapter: chapter.number, time: Number(localStorage.getItem('lux-reader-visited:v1:' + book.id)) || 0 };
    } catch {}
    return null;
  }
  function chapterMetrics(chapter) {
    const text = chapter.text?.join(' ') || chapter.content?.map(block => block.text || '').join(' ') || '';
    const words = text.match(/\S+/g)?.length || 0;
    return { words, minutes: Math.max(1, Math.ceil(words / 180)) };
  }
  function contentKey(book) {
    const source = JSON.stringify(book);
    let fingerprint = 2166136261;
    for (let index = 0; index < source.length; index++) {
      fingerprint = Math.imul(fingerprint ^ source.charCodeAt(index), 16777619);
    }
    return (fingerprint >>> 0).toString(16);
  }

  function details(book, cover = book.cover) {
    const { chapters } = book;
    const title = escapeHtml(book.title);
    return `
    <header class="novel-top">
      <a class="novel-brand" href="/?view=novels" aria-label="لوكس، عالم الروايات">لوكس</a>
      <a href="/?view=novels">الرجوع إلى الروايات</a>
    </header>
    <main id="novel-details" data-novel-id="${escapeHtml(book.id)}" data-chapter-numbers="${chapterNumbers(chapters)}" data-content-key="${contentKey(book)}">
      <section class="novel-hero" aria-labelledby="novel-title">
        <figure class="novel-cover"><img src="${escapeHtml(cover)}" data-published-cover referrerpolicy="no-referrer" width="600" height="800" alt="غلاف ${title}"></figure>
        <div class="novel-copy">
          <span class="novel-eyebrow">${book.publishedAt ? 'من استوديو لوكس' : 'رواية تجريبية من لوكس'}</span>
          <h1 id="novel-title">${title}</h1>
          <p class="novel-byline">تأليف ${escapeHtml(book.author)}</p>
          <ul class="novel-tags" aria-label="حالة الرواية وتصنيفاتها">
            <li class="novel-status">${escapeHtml(book.status)}</li>
            ${book.genres.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}
          </ul>
          <p class="novel-synopsis">${escapeHtml(book.synopsis)}</p>
          <div class="novel-facts"><span><b>${chapters.length}</b> فصول متاحة</span><span>نص عربي · قراءة متسلسلة</span><span>أكمل من حيث توقفت</span></div>
          <div class="novel-actions">
            ${chapters.length
              ? '<a class="novel-button primary" href="' + escapeHtml(chapterUrl(book.id, chapters[0].number)) + '">ابدأ القراءة</a>'
              : '<button class="novel-button primary" type="button" disabled>ابدأ القراءة</button>'}
            <a class="novel-button" id="novel-resume" hidden>متابعة القراءة</a>
            <button class="novel-button" type="button" id="novel-resume-unavailable" disabled title="افتح فصلًا ليظهر موضع المتابعة">متابعة القراءة</button>
            <a class="novel-button" id="novel-bookmark" hidden>علامة القراءة</a>
          </div>
        </div>
      </section>
      <section class="chapter-index" aria-labelledby="chapter-index-title">
        <header class="chapter-index-header">
          <div><h2 id="chapter-index-title">فهرس الفصول</h2><p>عدد الفصول المتاحة: ${chapters.length}</p></div>
          <button class="novel-button" type="button" id="novel-chapter-order" aria-pressed="false"${chapters.length < 2 ? ' disabled' : ''}>الترتيب: الأقدم أولًا</button>
        </header>
        <label class="chapter-search">ابحث في الفصول<input type="search" id="novel-chapter-search" placeholder="رقم الفصل أو عنوانه…" autocomplete="off"></label>
        <p id="novel-chapter-results" aria-live="polite" class="chapter-search-results"></p>
        <ol class="chapter-list" id="novel-chapter-list">
          ${chapters.map(chapter => `<li data-chapter="${chapter.number}">
            <a href="${escapeHtml(chapterUrl(book.id, chapter.number))}">
              <small>الفصل ${chapter.number}</small><strong>${escapeHtml(chapter.title)}</strong><span aria-hidden="true">←</span>
            </a>
          </li>`).join('')}
        </ol>
        ${chapters.length ? '' : '<p class="novel-byline">لم يُنشر أي فصل بعد.</p>'}
      </section>
    </main>
  `;
  }

  function reader(book, index, illustration = '') {
    const { chapters } = book;
    const chapter = chapters[index];
    const chapterName = 'الفصل ' + chapter.number;
    const chapterLabel = chapterName + ' · ' + chapter.title;
    const metrics = chapterMetrics(chapter);
    const navigation = (direction, target, label) => target
      ? `<a data-label="${direction}" rel="${direction === 'previous' ? 'prev' : 'next'}"
        href="${escapeHtml(chapterUrl(book.id, target.number))}">${label}</a>`
      : `<button type="button" data-label="${direction}" disabled>${label}</button>`;
    const previous = navigation('previous', chapters[index - 1], 'الفصل السابق');
    const next = navigation('next', chapters[index + 1], 'الفصل التالي');
    return `
    <main id="sample-reader" data-novel-id="${escapeHtml(book.id)}" data-chapter="${chapter.number}" data-chapter-numbers="${chapterNumbers(chapters)}" data-content-key="${contentKey(book)}">
      <header class="reader-bar">
        <div class="reader-progress-track"><div id="reader-progress-bar"></div></div>
        <div class="reader-bar-inner">
          <a class="reader-back" data-label="index" href="${escapeHtml(detailsUrl(book.id))}">الرجوع لفهرس الرواية</a>
          <div class="reader-title">
            <strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(chapterLabel)}</small>
          </div>
          <details class="reader-options" open><summary data-label="tools">إعدادات القراءة</summary><div class="reader-controls">
            <label for="sample-theme" data-label="theme">المظهر</label>
            <select id="sample-theme">
              <option value="dark" data-label="dark">داكن</option>
              <option value="sepia" data-label="sepia" selected>بيج</option>
              <option value="light" data-label="light">فاتح</option>
            </select>
            <button type="button" data-font-step="-2" data-control-label="decrease" aria-label="تصغير الخط">A−</button>
            <output id="sample-font-size" aria-live="polite" aria-label="حجم الخط" data-control-label="font" dir="ltr">22 px</output>
            <button type="button" data-font-step="2" data-control-label="increase" aria-label="تكبير الخط">A+</button>
            <select id="sample-language" aria-label="اللغة" data-control-label="language">
              <option value="ar">العربية</option><option value="en" lang="en">English</option>
            </select>
            <select id="sample-chapters" aria-label="اختر الفصل" data-control-label="chapters">
              ${chapters.map(item => `<option value="${escapeHtml(chapterUrl(book.id, item.number))}"${item === chapter ? ' selected' : ''}>${escapeHtml('الفصل ' + item.number)}</option>`).join('')}
            </select>
            <label for="reader-width" data-label="width">عرض النص</label>
            <select id="reader-width"><option value="36">ضيّق</option><option value="42">مريح</option><option value="50">واسع</option></select>
            <label for="reader-spacing" data-label="spacing">تباعد الأسطر</label>
            <select id="reader-spacing"><option value="1.7">1.7</option><option value="1.9">1.9</option><option value="2.2">2.2</option></select>
            <button type="button" id="reader-bookmark" aria-pressed="false" data-label="bookmark">حفظ علامة</button>
          </div></details>
        </div>
      </header>
      <div class="reader-paper">
        <p class="reader-eyebrow" data-label="${chapter.content ? 'published' : 'sample'}">${chapter.content ? 'منشور في استوديو لوكس' : 'فصل تجريبي من لوكس'}</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <div class="reader-chapter-meta"><span>${metrics.words} كلمة</span><span>نحو ${metrics.minutes} د للقراءة</span><output id="reader-progress-label" aria-label="تقدم القراءة" dir="ltr">0%</output></div>
        ${chapter.illustration
          ? `<figure class="reader-scene">${illustration || '<img src="' + escapeHtml(chapter.illustration.asset) + '" alt="">'}<figcaption>${escapeHtml(chapter.illustration.caption)}</figcaption></figure>`
          : ''}
        <article id="reader-content" aria-label="نص الفصل">
          ${chapter.content ? chapter.content.map(block => block.image
            ? '<figure class="reader-scene"><img src="' + escapeHtml(block.image) + '" alt="' + escapeHtml(block.alt) + '" loading="lazy" referrerpolicy="no-referrer"></figure>'
            : '<p class="published-paragraph" dir="auto">' + escapeHtml(block.text) + '</p>').join('')
            : chapter.text.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </article>
        <nav class="reader-nav" aria-label="التنقل بين الفصول">${previous}${next}</nav>
        <p class="reader-footnote" data-label="saved">موضعك وإعداداتك محفوظان في هذا المتصفح.</p>
      </div>
    </main>
  `;
  }

  return { details, reader, detailsUrl, chapterUrl, chapterNumbers, contentKey, savedChapter, chapterMetrics };
})();
