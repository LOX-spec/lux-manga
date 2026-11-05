let readerCleanup;
function setupNovelChapter() {
  readerCleanup?.();
  const events = new AbortController();
  const options = { signal: events.signal };
  const key = 'lux-novel-reader:v1';
  const themes = ['dark', 'sepia', 'light'];
  const labels = {
    ar: {
      back: 'الرجوع للمكتبة', index: 'الرجوع لفهرس الرواية', theme: 'المظهر', dark: 'داكن', sepia: 'بيج', light: 'فاتح',
      language: 'اللغة', decrease: 'تصغير الخط', increase: 'تكبير الخط', chapters: 'اختر الفصل',
      font: 'حجم الخط',
      previous: 'الفصل السابق', next: 'الفصل التالي', sample: 'فصل تجريبي من لوكس',
      published: 'منشور في استوديو لوكس', width: 'عرض النص', spacing: 'تباعد الأسطر',
      bookmark: 'حفظ علامة', saved: 'موضعك وإعداداتك محفوظان في هذا المتصفح.', tools: 'إعدادات القراءة'
    },
    en: {
      back: 'Back to library', index: 'Back to chapter index', theme: 'Theme', dark: 'Dark', sepia: 'Paper', light: 'Light',
      language: 'Language', decrease: 'Decrease font size', increase: 'Increase font size',
      chapters: 'Choose a chapter', previous: 'Previous chapter', next: 'Next chapter',
      font: 'Font size',
      sample: 'Lux sample chapter', published: 'Published in Lux Studio', width: 'Text width', spacing: 'Line spacing',
      bookmark: 'Bookmark', saved: 'Your place and preferences are saved in this browser.', tools: 'Reading settings'
    }
  };
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  const settings = {
    theme: themes.includes(stored?.theme) ? stored.theme : 'sepia',
    font: Number.isFinite(stored?.font) ? Math.max(16, Math.min(36, stored.font)) : 22,
    language: stored?.language === 'en' ? 'en' : 'ar',
    width: [36, 42, 50].includes(stored?.width) ? stored.width : 42,
    spacing: [1.7, 1.9, 2.2].includes(stored?.spacing) ? stored.spacing : 1.9
  };
  const theme = document.getElementById('sample-theme');
  const language = document.getElementById('sample-language');
  const article = document.getElementById('reader-content');
  const fontSize = document.getElementById('sample-font-size');
  const fontButtons = document.querySelectorAll('[data-font-step]');
  const width = document.getElementById('reader-width');
  const spacing = document.getElementById('reader-spacing');
  const reader = document.getElementById('sample-reader');
  const bookmark = document.getElementById('reader-bookmark');
  const bookmarkKey = 'lux-reader-bookmark:v1:' + reader.dataset.novelId;
  const positionKey = 'lux-reader-position:v1:' + reader.dataset.novelId + ':' + reader.dataset.chapter;
  let position;
  try { position = JSON.parse(localStorage.getItem(positionKey)); } catch {}
  if (location.hash === '#bookmark') {
    try {
      const marked = JSON.parse(localStorage.getItem(bookmarkKey));
      if (String(marked?.chapter) === reader.dataset.chapter) position = marked;
    } catch {}
  }
  const tools = document.querySelector('.reader-options');
  if (matchMedia('(max-width: 600px)').matches) tools.open = false;
  function apply() {
    document.documentElement.dataset.theme = settings.theme;
    article.style.fontSize = settings.font + 'px';
    article.style.maxWidth = settings.width + 'rem';
    article.style.lineHeight = settings.spacing;
    width.value = settings.width;
    spacing.value = settings.spacing;
    fontSize.textContent = settings.font + ' px';
    for (const button of fontButtons) {
      button.disabled = Number(button.dataset.fontStep) < 0 ? settings.font <= 16 : settings.font >= 36;
    }
    theme.value = settings.theme;
    language.value = settings.language;
    for (const element of document.querySelectorAll('[data-label]')) {
      element.textContent = labels[settings.language][element.dataset.label];
      element.lang = settings.language;
    }
    for (const element of document.querySelectorAll('[data-control-label]')) {
      element.setAttribute('aria-label', labels[settings.language][element.dataset.controlLabel]);
    }
    let marked;
    try { marked = JSON.parse(localStorage.getItem(bookmarkKey)); } catch {}
    bookmark.setAttribute('aria-pressed', String(String(marked?.chapter) === reader.dataset.chapter));
    const widthLabels = settings.language === 'en' ? ['Narrow', 'Comfortable', 'Wide'] : ['ضيّق', 'مريح', 'واسع'];
    Array.from(width.options).forEach((option, index) => { option.textContent = widthLabels[index]; });
  }
  function save() {
    apply();
    try { localStorage.setItem(key, JSON.stringify(settings)); } catch {}
  }
  theme.addEventListener('change', () => {
    if (themes.includes(theme.value)) settings.theme = theme.value;
    save();
  });
  language.addEventListener('change', () => {
    settings.language = language.value === 'en' ? 'en' : 'ar';
    save();
  });
  width.addEventListener('change', () => {
    settings.width = Number(width.value);
    save();
  });
  spacing.addEventListener('change', () => {
    settings.spacing = Number(spacing.value);
    save();
  });
  document.getElementById('sample-chapters').addEventListener('change', event => {
    location.assign(event.target.value);
  });
  for (const button of fontButtons) {
    button.addEventListener('click', () => {
      settings.font = Math.max(16, Math.min(36, settings.font + Number(button.dataset.fontStep)));
      save();
    });
  }
  apply();
  function rememberChapter() {
    try {
      localStorage.setItem('lux-sample-progress:v1:' + reader.dataset.novelId, reader.dataset.chapter);
      localStorage.setItem('lux-reader-visited:v1:' + reader.dataset.novelId, String(Date.now()));
    } catch {}
  }
  function ratio() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    return distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 1;
  }
  function updateProgress() {
    const value = Math.round(ratio() * 100);
    document.getElementById('reader-progress-bar').style.width = value + '%';
    document.getElementById('reader-progress-label').textContent = value + '%';
  }
  function savePosition() {
    try { localStorage.setItem(positionKey, JSON.stringify({ ratio: ratio(), time: Date.now() })); } catch {}
  }
  bookmark.addEventListener('click', () => {
    try {
      if (bookmark.getAttribute('aria-pressed') === 'true') localStorage.removeItem(bookmarkKey);
      else localStorage.setItem(bookmarkKey, JSON.stringify({ chapter: reader.dataset.chapter, ratio: ratio(), time: Date.now() }));
      apply();
    } catch {}
  });
  let scrollTimer;
  window.addEventListener('scroll', () => {
    updateProgress();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(savePosition, 200);
  }, { ...options, passive: true });
  window.addEventListener('pagehide', savePosition, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); }, options);
  document.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select,button') || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.key === 'ArrowLeft' ? 'next' : event.key === 'ArrowRight' ? 'prev' : '';
    const link = target && document.querySelector('.reader-nav a[rel="' + target + '"]');
    if (link) { event.preventDefault(); savePosition(); location.assign(link.href); }
  }, options);
  const frame = requestAnimationFrame(() => {
    if (Number.isFinite(position?.ratio) && position.ratio >= 0 && position.ratio <= 1) {
      window.scrollTo(0, position.ratio * Math.max(0, document.documentElement.scrollHeight - innerHeight));
    }
    updateProgress();
  });
  readerCleanup = () => {
    events.abort();
    clearTimeout(scrollTimer);
    cancelAnimationFrame(frame);
  };
  rememberChapter();
  return rememberChapter;
}
