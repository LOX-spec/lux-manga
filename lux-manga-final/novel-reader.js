/* Lux novel reader and homepage shelf. Uses Lux's existing chapter actions. */
const LuxNovelReader = (() => {
  const storageKey = 'lux-novel-reader:v1';
  const themes = ['dark', 'sepia', 'light'];
  const minFont = 16;
  const maxFont = 36;
  const words = {
    ar: {
      reader: 'قارئ الروايات', theme: 'المظهر', dark: 'داكن', sepia: 'بيج',
      light: 'فاتح', language: 'اللغة', smaller: 'تصغير الخط', larger: 'تكبير الخط',
      switchDark: 'الوضع الليلي', switchPaper: 'الوضع الورقي', retry: 'إعادة المحاولة',
      font: 'حجم الخط', chapter: 'اختر الفصل', previous: 'السابق', next: 'التالي',
      save: 'حفظ الفصل', finish: 'أنهيت الفصل', shelf: 'الروايات في مكتبتك',
      all: 'كل الروايات', latest: 'آخر فصل متاح', empty: 'لا توجد فصول بعد',
      start: 'اقرأ الآن', resume: 'أكمل القراءة', unavailable: 'القراءة غير متاحة بعد'
    },
    en: {
      reader: 'Novel reader', theme: 'Theme', dark: 'Dark', sepia: 'Sepia',
      light: 'Light', language: 'Language', smaller: 'Decrease font size',
      switchDark: 'Night mode', switchPaper: 'Paper mode', retry: 'Retry',
      larger: 'Increase font size', font: 'Font size', chapter: 'Choose a chapter',
      previous: 'Previous', next: 'Next', save: 'Save chapter', finish: 'Mark as read',
      shelf: 'Novels in your library', all: 'All novels', latest: 'Latest available chapter',
      empty: 'No chapters yet', start: 'Read now', resume: 'Continue reading',
      unavailable: 'Reading unavailable'
    }
  };
  const limitFont = value => Math.min(maxFont, Math.max(minFont, Math.round(value)));
  let settings;

  function preferences() {
    if (settings) return settings;
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch {
      // Reading still works if storage is unavailable.
    }
    const oldFont = state.novelFont;
    settings = {
      theme: themes.includes(stored?.theme) ? stored.theme : 'sepia',
      font: Number.isFinite(stored?.font) ? limitFont(stored.font)
        : Number.isFinite(oldFont) ? limitFont(oldFont) : 22,
      language: stored?.language === 'en' ? 'en' : 'ar'
    };
    return settings;
  }

  function savePreferences() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // The current session retains the preferences in memory.
    }
  }

  function applyPreferences(root) {
    const { theme, font, language } = preferences();
    const t = words[language];
    root.dataset.theme = theme;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.style.setProperty('--lux-novel-font', font + 'px');
    for (const el of root.querySelectorAll('[data-novel-label]')) {
      el.textContent = t[el.dataset.novelLabel];
    }
    for (const el of root.querySelectorAll('[data-novel-aria]')) {
      el.setAttribute('aria-label', t[el.dataset.novelAria]);
    }
    root.querySelector('[data-novel-toggle-theme]').textContent =
      theme === 'dark' ? t.switchPaper : t.switchDark;
    for (const option of root.querySelectorAll('#luxNovelTheme option')) {
      option.selected = option.value === theme;
    }
    const output = root.querySelector('output');
    output.textContent = font + ' px';
    root.querySelector('[data-novel-font="-2"]').disabled = font <= minFont;
    root.querySelector('[data-novel-font="2"]').disabled = font >= maxFont;
  }

  function render(book, index, options = {}) {
    const { mount, selectChapter, message, retry, canSave, finishChapter } = options;
    const chapter = book.chapters[index];
    if (!chapter) return;
    const id = esc(book.id);
    const hasChapterLabel = /^(?:الفصل|chapter)(?:\s|[:.·-]|$)/i.test(chapter.title);
    const chapterTitle = Number.isFinite(chapter.number) && !hasChapterLabel
      ? `الفصل ${chapter.number} · ${chapter.title}` : chapter.title;
    const { language, theme } = preferences();
    const chapterButton = (target, label) =>
      `<button type="button" ${mount ? `data-sample-chapter="${target}"` : `data-read="${id}" data-chapter="${target}"`}
        data-novel-label="${label}" ${target < 0 || target >= book.chapters.length ? 'disabled' : ''}></button>`;
    const navigation = `${chapterButton(index - 1, 'previous')}${chapterButton(index + 1, 'next')}`;

    const markup = `<section class="lux-novel-reader" data-novel-aria="reader">
      <div class="reader-tools lux-novel-tools">
        <header class="lux-novel-heading">
          <p dir="auto">${esc(book.title)}</p>
          <h2 dir="auto">${esc(chapterTitle)}</h2>
        </header>
        <div class="lux-novel-settings">
          <button type="button" data-novel-toggle-theme></button>
          <label for="luxNovelTheme" data-novel-label="theme"></label>
          <select id="luxNovelTheme">
            ${themes.map(value => `<option value="${value}" data-novel-label="${value}"
              ${value === theme ? 'selected' : ''}></option>`).join('')}
          </select>
          <button type="button" data-novel-font="-2" data-novel-aria="smaller">A−</button>
          <output aria-live="polite" data-novel-aria="font"></output>
          <button type="button" data-novel-font="2" data-novel-aria="larger">A+</button>
          <label for="luxNovelLanguage" data-novel-label="language"></label>
          <select id="luxNovelLanguage">
            <option value="ar" lang="ar" ${language === 'ar' ? 'selected' : ''}>العربية</option>
            <option value="en" lang="en" ${language === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>
        <div class="lux-novel-chapters">
          ${navigation}
          <select id="${mount ? 'luxSampleChapterSelect' : 'chapterSelect'}" data-id="${id}" data-novel-aria="chapter">
            ${book.chapters.map((item, position) =>
              `<option value="${position}" ${position === index ? 'selected' : ''}>${esc(item.title)}</option>`
            ).join('')}
          </select>
          ${!mount || canSave ? `<button type="button" data-download="${id}" data-chapter="${index}" data-novel-label="save"></button>` : ''}
        </div>
      </div>
      <article class="novel-body lux-novel-text">
        ${message
          ? `<p role="status">${esc(message)}</p>${retry ? '<button type="button" data-novel-retry data-novel-label="retry"></button>' : ''}`
          : (chapter.text || []).map(paragraph => `<p dir="auto">${esc(paragraph)}</p>`).join('')}
      </article>
      <div class="chapter-end lux-novel-chapters">
        ${navigation}
        ${finishChapter ? '<button type="button" class="primary" data-novel-finish data-novel-label="finish"></button>' : ''}
        ${mount ? '' : `<button type="button" class="primary" data-finish="${id}" data-chapter="${index}" data-novel-label="finish"></button>`}
      </div>
    </section>`;

    const host = mount || $('#modal');
    if (mount) {
      mount.innerHTML = markup;
    } else {
      show(markup);
      host.classList.add('reader-modal');
      host.scrollTop = 0;
    }
    const root = host.querySelector('.lux-novel-reader');
    applyPreferences(root);
    root.addEventListener('click', event => {
      if (event.target.closest('[data-novel-retry]')) return retry();
      if (event.target.closest('[data-novel-finish]')) return finishChapter();
      if (event.target.closest('[data-novel-toggle-theme]')) {
        settings.theme = settings.theme === 'dark' ? 'sepia' : 'dark';
        applyPreferences(root);
        savePreferences();
        return;
      }
      const chapterButton = event.target.closest('[data-sample-chapter]');
      if (chapterButton) {
        selectChapter(Number(chapterButton.dataset.sampleChapter));
        return;
      }
      const button = event.target.closest('[data-novel-font]');
      if (!button) return;
      settings.font = limitFont(settings.font + Number(button.dataset.novelFont));
      applyPreferences(root);
      savePreferences();
    });
    root.addEventListener('change', event => {
      const { id, value } = event.target;
      if (id === 'luxSampleChapterSelect') {
        selectChapter(Number(value));
        return;
      }
      if (id === 'luxNovelTheme' && themes.includes(value)) settings.theme = value;
      else if (id === 'luxNovelLanguage' && ['ar', 'en'].includes(value)) settings.language = value;
      else return;
      applyPreferences(root);
      savePreferences();
      if (id === 'luxNovelLanguage' && view === 'home') renderHomeShelf();
    });
  }

  function card(book, t) {
    const chapters = book.chapters || [];
    const latest = chapters.at(-1);
    const saved = state.progress[book.id]?.chapter;
    const canResume = Number.isInteger(saved) && saved >= 0 && saved < chapters.length;
    const id = esc(book.id);
    return `<article class="lux-novel-card">
      ${latest
        ? `<a class="lux-novel-cover" href="${esc(novelReaderHref(book.id))}" aria-label="${esc(book.title)}">${cover(book)}</a>`
        : `<button type="button" class="lux-novel-cover" data-open="${id}" aria-label="${esc(book.title)}">${cover(book)}</button>`}
      <div class="lux-novel-card-copy">
        <h3 dir="auto">${esc(book.title)}</h3>
        <p>${latest ? t.latest : t.empty}${latest ? `<span dir="auto">${esc(latest.title)}</span>` : ''}</p>
        <button type="button" class="primary" data-read="${id}"
          data-chapter="${canResume ? saved : 0}" ${latest ? '' : 'disabled'}>
          ${latest ? canResume ? t.resume : t.start : t.unavailable}
        </button>
      </div>
    </article>`;
  }

  function homeShelf() {
    const novels = books().filter(book => mediaOf(book) === 'novels' && listOf(book.id) !== 'ignored')
      .sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')))
      .slice(0, 6);
    if (!novels.length) return '';
    const { language } = preferences();
    const t = words[language];
    return `<section id="luxNovelShelf" class="lux-novel-shelf" lang="${language}"
      dir="${language === 'ar' ? 'rtl' : 'ltr'}" aria-labelledby="luxNovelShelfTitle">
      <div class="lux-novel-shelf-heading">
        <h2 id="luxNovelShelfTitle">${t.shelf}</h2>
        <button type="button" data-view="novels">${t.all}</button>
      </div>
      <div class="lux-novel-grid">${novels.map(book => card(book, t)).join('')}</div>
    </section>`;
  }

  function renderHomeShelf() {
    const current = document.getElementById('luxNovelShelf');
    if (current) current.outerHTML = homeShelf();
  }

  return { render, homeShelf };
})();
