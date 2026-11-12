import { normalizeRoute } from './routing.js';

const url = normalizeRoute(location.href);
const params = url.searchParams;
const view = params.get('view');
const novelPage = ['novel', 'reader'].includes(view) && params.get('library') !== '1';
const applicationScripts = [
  'chapter-links.js', 'import.js', 'audit.js', 'settings.js', 'features.js', 'experience.js', 'app.js',
  'novel-reader.js', 'media.js', 'discovery.js', 'scanner.js', 'source-delete.js',
  'collections.js', 'novels-demo.js', 'novel-publications.js', 'novel-pages.js',
  'novel-admin.js', 'novels-view.js', 'studio.js', 'comicverse-data.js',
  'comicverse-source.js', 'comics-model.js', 'comics-hub.js', 'manga-samples.js', 'smart-import.js', 'universal-backup.js', 'automatic-sources.js', 'manga-hub.js', 'comfort-reader.js', 'interface-repairs.js', 'ux-shell.js', 'install.js'
];

if (novelPage) {
  for (const stylesheet of document.querySelectorAll('link[rel="stylesheet"]')) stylesheet.remove();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = view === 'novel' ? '/novel-details.css' : '/sample-reader.css';
  document.head.append(stylesheet);
  const appearance = document.createElement('link');
  appearance.rel = 'stylesheet';
  appearance.href = '/appearance.css';
  document.head.append(appearance);
  const fontSheet=document.createElement('link');fontSheet.rel='stylesheet';fontSheet.href='/thmanyah-font.css';document.head.append(fontSheet);
}

function loadScript(path, module = false) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/' + path;
    script.async = false;
    if (module) script.type = 'module';
    script.onload = resolve;
    script.onerror = () => reject(new Error('تعذّر تحميل أحد ملفات الواجهة. أعد تحميل الصفحة.'));
    document.head.append(script);
  });
}

try {
  if (novelPage) {
    await Promise.all([
      'novels-demo.js', 'novel-publications.js', 'novel-pages.js',
      view === 'novel' ? 'novel-details-controls.js' : 'sample-reader-controls.js'
    ].map(path => loadScript(path)));
    await loadScript('novel-page-runtime.js', true);
  } else {
    if (url.href !== location.href) history.replaceState(null, '', url.pathname + url.search + url.hash);
    await Promise.all(applicationScripts.map(path => loadScript(path)));
  }
} catch (error) {
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = error.message;
  const retry = document.createElement('button');
  retry.textContent = 'إعادة التحميل';
  retry.onclick = () => location.reload();
  const main = document.createElement('main');
  main.style.cssText = 'max-width:40rem;margin:4rem auto;padding:1rem;font-family:Tahoma,sans-serif';
  main.append(message, retry);
  document.body.replaceChildren(main);
  document.body.className = '';
}
