(() => {
  try {
    const font = localStorage.getItem('lux.app.font');
    if (['Tajawal', 'Cairo', 'IBM Plex Sans Arabic'].includes(font)) {
      document.documentElement.style.setProperty('--app-font', '"' + font + '"');
    }
    const accent = localStorage.getItem('lux.app.accent');
    if (/^#[0-9a-f]{6}$/i.test(accent || '')) document.documentElement.style.setProperty('--theme-color', accent);
    const theme = localStorage.getItem('lux.app.theme');
    if (new URLSearchParams(location.search).get('view') !== 'reader' && !/^\/reader\//.test(location.pathname) && ['dark', 'light', 'sepia'].includes(theme)) {
      document.documentElement.dataset.theme = theme;
    }
  } catch {}
})();
