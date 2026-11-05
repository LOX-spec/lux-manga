function setupNovelChapter() {
  const key = 'lux-novel-reader:v1';
  const themes = ['dark', 'sepia', 'light'];
  const labels = {
    ar: {
      back: 'الرجوع للمكتبة', index: 'الرجوع لفهرس الرواية', theme: 'المظهر', dark: 'داكن', sepia: 'بيج', light: 'فاتح',
      language: 'اللغة', decrease: 'تصغير الخط', increase: 'تكبير الخط', chapters: 'اختر الفصل',
      font: 'حجم الخط',
      previous: 'الفصل السابق', next: 'الفصل التالي', sample: 'فصل تجريبي من لوكس',
      published: 'منشور في استوديو لوكس'
    },
    en: {
      back: 'Back to library', index: 'Back to chapter index', theme: 'Theme', dark: 'Dark', sepia: 'Paper', light: 'Light',
      language: 'Language', decrease: 'Decrease font size', increase: 'Increase font size',
      chapters: 'Choose a chapter', previous: 'Previous chapter', next: 'Next chapter',
      font: 'Font size',
      sample: 'Lux sample chapter', published: 'Published in Lux Studio'
    }
  };
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  const settings = {
    theme: themes.includes(stored?.theme) ? stored.theme : 'sepia',
    font: Number.isFinite(stored?.font) ? Math.max(16, Math.min(36, stored.font)) : 22,
    language: stored?.language === 'en' ? 'en' : 'ar'
  };
  const theme = document.getElementById('sample-theme');
  const language = document.getElementById('sample-language');
  const article = document.getElementById('reader-content');
  const fontSize = document.getElementById('sample-font-size');
  const fontButtons = document.querySelectorAll('[data-font-step]');
  function apply() {
    document.documentElement.dataset.theme = settings.theme;
    article.style.fontSize = settings.font + 'px';
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
  const reader = document.getElementById('sample-reader');
  function rememberChapter() {
    try {
      localStorage.setItem('lux-sample-progress:v1:' + reader.dataset.novelId, reader.dataset.chapter);
    } catch {}
  }
  rememberChapter();
  return rememberChapter;
}
