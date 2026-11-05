import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeRoute } from '../routing.js';

export function novelPageView(url) {
  url = normalizeRoute(url);
  if (url.pathname !== '/' || url.searchParams.get('library') === '1') return '';
  const view = url.searchParams.get('view');
  return view === 'novel' || view === 'reader' ? view : '';
}

export function samplePagePath(url) {
  url = normalizeRoute(url);
  if (url.pathname !== '/' || url.searchParams.get('library') === '1') return '';
  const view = url.searchParams.get('view');
  const id = url.searchParams.get('id') || '';
  if (!/^\d+$/.test(id)) return '';
  if (view === 'novel') return '/?view=novel&id=' + id;
  if (view !== 'reader') return '';
  const chapter = url.searchParams.get('chapter') || '1';
  if (!/^\d+$/.test(chapter)) return '';
  return '/?view=reader&id=' + id + '&chapter=' + chapter;
}

function documentHtml(view, title, css, markup = '') {
  const escaped = title.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
  return `<!doctype html>
<html lang="ar" dir="rtl"${view === 'reader' ? ' data-theme="sepia"' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171311">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/icon-192.png" type="image/png">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <title>${escaped}</title>
  <style>${css}</style>
  <script src="/novels-demo.js" defer></script>
  <script src="/novel-publications.js" defer></script>
  <script src="/novel-pages.js" defer></script>
  <script src="/${view === 'novel' ? 'novel-details-controls' : 'sample-reader-controls'}.js" defer></script>
  <script src="/novel-page-runtime.js" type="module"></script>
</head>
<body>
  ${markup}
</body>
</html>`;
}

export function buildSamplePages() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const source = fs.readFileSync(resolve(root, 'novels-demo.js'), 'utf8');
  const templates = fs.readFileSync(resolve(root, 'novel-pages.js'), 'utf8');
  const { books, views } = vm.runInNewContext(source + '\n' + templates + '\n({ books: NOVELS_DATA, views: LuxNovelPages });');
  const css = fs.readFileSync(resolve(root, 'sample-reader.css'), 'utf8');
  const detailsCss = fs.readFileSync(resolve(root, 'novel-details.css'), 'utf8');
  const pages = {};
  const coverAssets = {};

  for (const book of books) {
    const coverSvg = fs.readFileSync(resolve(root, '.' + book.cover), 'utf8');
    coverAssets[book.cover] = [coverSvg, 'image/svg+xml'];
    const cover = 'data:image/svg+xml;base64,' + Buffer.from(coverSvg).toString('base64');
    pages[views.detailsUrl(book.id)] = documentHtml('novel', book.title + ' · فهرس الفصول — لوكس',
      detailsCss, views.details(book, cover));
    book.chapters.forEach((chapter, index) => {
      let illustration = '';
      if (chapter.illustration) {
        illustration = fs.readFileSync(resolve(root, '.' + chapter.illustration.asset), 'utf8');
        coverAssets[chapter.illustration.asset] = [illustration, 'image/svg+xml'];
      }
      pages[views.chapterUrl(book.id, chapter.number)] = documentHtml('reader',
        book.title + ' · الفصل ' + chapter.number + ' — لوكس', css, views.reader(book, index, illustration));
    });
  }
  const shells = {
    novel: documentHtml('novel', 'فهرس الرواية — لوكس', detailsCss),
    reader: documentHtml('reader', 'قارئ الروايات — لوكس', css)
  };
  return { pages, shells, coverAssets };
}
