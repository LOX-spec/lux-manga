function readerBookmark(book) {
  try { return JSON.parse(localStorage.getItem('lux.picture.position:' + book.id)); }
  catch { return null; }
}

const readBeforeBookmark = read;
read = function(id, index) {
  const book = get(id);
  if (index == null && book && mediaOf(book) === 'manga') {
    const url = readerBookmark(book)?.chapter;
    const found = book.chapters.findIndex(chapter => chapter.url === url);
    if (found >= 0) index = found;
  }
  if (book && mediaOf(book) === 'manga' && mangaHub.language && !matchesLibraryChapter(book, book.chapters[index ?? state.progress[id]?.chapter])) {
    index = book.chapters.findIndex(chapter => matchesLibraryChapter(book, chapter));
    if (index < 0) { toast('لا توجد فصول متاحة باللغة المختارة.'); return; }
  }
  return readBeforeBookmark(id, index);
};

function adjacentReadingChapter(book, index, step) {
  for (let i = index + step; i >= 0 && i < book.chapters.length; i += step) {
    if (matchesLibraryChapter(book, book.chapters[i])) return i;
  }
  return -1;
}

const drawBeforeComfort = drawReader;
drawReader = function(book, index) {
  drawBeforeComfort(book, index);
  if (mediaOf(book) === 'novels') return;
  const modal = $('#modal');
  const reader = modal.querySelector('.manga-reader');
  if (!reader) return;
  const chapter = book.chapters[index];
  const pages = [...reader.querySelectorAll('.manga-page')];
  if (!pages.length) return;
  const images = pages.map(page => page.querySelector('img'));
  const urls = images.map(image => image.getAttribute('src'));
  const bookmark = readerBookmark(book);
  let position = bookmark?.chapter === chapter.url && Number.isInteger(bookmark.page)
    ? Math.min(pages.length - 1, Math.max(0, bookmark.page)) : 0;
  const autoMode = book.kind === 'مانهوا' || book.kind === 'مانها' ? 'vertical' : 'rtl';
  let mode = ['rtl', 'vertical'].includes(bookmark?.mode) ? bookmark.mode : autoMode;
  let clean = false;
  let frame = 0;
  let restoring = false;
  const toolbar = document.createElement('div');
  toolbar.className = 'comfort-reader-tools';
  toolbar.innerHTML = '<button data-comfort-prev aria-label="الصفحة السابقة">→</button><output aria-live="polite"></output><button data-comfort-next aria-label="الصفحة التالية">←</button><button data-comfort-mode></button><button data-lux-fullscreen>ملء الشاشة</button><button data-comfort-hide>إخفاء الأدوات</button>';
  reader.before(toolbar);
  let zoom=100;
  try{zoom=Math.max(50,Math.min(250,Number(localStorage.getItem('lux.picture.zoom'))||100));}catch{}
  const zoomTools=document.createElement('span');zoomTools.className='reader-zoom-tools';
  zoomTools.innerHTML='<button data-zoom-out aria-label="تصغير الصفحة">−</button><output aria-label="نسبة التكبير"></output><button data-zoom-in aria-label="تكبير الصفحة">+</button><button data-zoom-fit>ملاءمة الصفحة</button><select data-reader-fit aria-label="طريقة ملاءمة الصورة"><option value="page">الصفحة كاملة</option><option value="width" selected>ملاءمة العرض</option><option value="height">ملاءمة الارتفاع</option></select><small id="readerViewportStatus" role="status" aria-live="polite"></small>';
  toolbar.append(zoomTools);
  const viewport=window.LuxReaderViewport.attach(modal,reader,images,()=>position);
  let fit='width';
  function applyZoom(){viewport.set({fit,zoom});zoomTools.querySelector('output').textContent=zoom+'%';zoomTools.querySelector('[data-zoom-out]').disabled=zoom<=50;zoomTools.querySelector('[data-zoom-in]').disabled=zoom>=250;try{localStorage.setItem('lux.picture.zoom',zoom);}catch{}}
  zoomTools.querySelector('[data-zoom-out]').onclick=()=>{zoom=Math.max(50,zoom-10);applyZoom();};
  zoomTools.querySelector('[data-zoom-in]').onclick=()=>{zoom=Math.min(250,zoom+10);applyZoom();};
  zoomTools.querySelector('[data-zoom-fit]').onclick=()=>{zoom=100;fit='page';zoomTools.querySelector('[data-reader-fit]').value=fit;applyZoom();viewport.focus();};
  zoomTools.querySelector('[data-reader-fit]').onchange=event=>{fit=event.target.value;zoom=100;applyZoom();viewport.focus();};
  const widthButton=modal.querySelector('#readerWidth');if(widthButton)widthButton.onclick=()=>{fit=fit==='width'?'page':'width';zoom=100;zoomTools.querySelector('[data-reader-fit]').value=fit;applyZoom();viewport.focus();};
  applyZoom();
  modal.classList.remove('reader-clean');
  modal.setAttribute('closedby', 'none');
  const exit = modal.querySelector('#close');
  exit.id = 'readerReturnIndex';
  exit.classList.remove('close');
  exit.textContent = 'العودة للفهرس';
  exit.setAttribute('aria-label', 'العودة للفهرس');
  const returnToIndex = () => { readerSession = null; detail(book.id); };
  exit.onclick = returnToIndex;
  const reveal = document.createElement('button');
  reveal.className = 'reader-reveal';
  reveal.textContent = 'إظهار الأدوات';
  reveal.hidden = true;
  modal.append(reveal);

  function savePosition() {
    try { localStorage.setItem('lux.picture.position:' + book.id, JSON.stringify({ chapter: chapter.url, page: position, mode })); }
    catch {}
  }
  function preload() {
    for (let i = position; i < Math.min(position + 4, images.length); i++) {
      images[i].loading = 'eager';
      if (!images[i].getAttribute('src')) images[i].src = urls[i];
    }
  }
  function update() {
    toolbar.querySelector('output').textContent = 'صفحة ' + (position + 1) + ' من ' + pages.length;
    toolbar.querySelector('[data-comfort-prev]').disabled = position === 0;
    toolbar.querySelector('[data-comfort-next]').disabled = position === pages.length - 1;
    preload();
    viewport.apply();
    savePosition();
  }
  function layout(scrollToPage) {
    reader.classList.toggle('rtl-pages', mode === 'rtl');
    reader.classList.toggle('webtoon-continuous', mode === 'vertical');
    toolbar.querySelector('[data-comfort-mode]').textContent = mode === 'rtl' ? 'تمرير عمودي' : 'تقليب RTL';
    pages.forEach((page, i) => {
      page.hidden = mode === 'rtl' && i !== position;
      if (mode === 'vertical' && !images[i].getAttribute('src')) images[i].src = urls[i];
    });
    if (scrollToPage && mode === 'vertical') {
      restoring = true;
      pages[position].scrollIntoView({ block: 'start', behavior: 'instant' });
      requestAnimationFrame(() => { restoring = false; });
    }
    update();
  }
  function move(delta) {
    position = Math.min(pages.length - 1, Math.max(0, position + delta));
    layout(true);
    if (mode === 'rtl') reader.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function toggleTools() {
    clean = !clean;
    modal.classList.toggle('reader-clean', clean);
    reveal.hidden = !clean;
  }
  reveal.onclick = toggleTools;
  const preventExit = event => event.preventDefault();
  modal.addEventListener('cancel', preventExit);
  toolbar.querySelector('[data-comfort-prev]').onclick = () => move(-1);
  toolbar.querySelector('[data-comfort-next]').onclick = () => move(1);
  toolbar.querySelector('[data-comfort-mode]').onclick = () => {
    mode = mode === 'rtl' ? 'vertical' : 'rtl';
    layout(true);
  };
  toolbar.querySelector('[data-comfort-hide]').onclick = toggleTools;
  const gapClick = event => {
    if (!reader.isConnected || !modal.open || event.target.closest('button,a,input,select,textarea,label,.comfort-reader-tools,.reader-tools,.reader-heading,.chapter-end')) return;
    const visible = images.filter(image => !image.closest('.manga-page').hidden);
    const onPage = visible.some(image => {
      const rect = image.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!onPage && (event.target === modal || event.target === reader || event.target.closest('.manga-page'))) {
      event.stopPropagation();
      returnToIndex();
    }
  };
  modal.addEventListener('click', gapClick);
  reader.tabIndex = 0;
  reader.addEventListener('keydown', event => {
    if (mode === 'rtl' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      move(event.key === 'ArrowLeft' ? 1 : -1);
    }
  });
  const scroll = () => {
    if (mode !== 'vertical' || restoring || frame || !reader.isConnected) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!reader.isConnected || restoring) return;
      const activeHeight=images[position]?.getBoundingClientRect().height||modal.clientHeight;
      const line = modal.getBoundingClientRect().top + Math.min(modal.clientHeight*.4,Math.max(1,activeHeight*.3));
      let visible = 0;
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].getBoundingClientRect().top > line) break;
        visible = i;
      }
      if (position !== visible) { position = visible; update(); }
    });
  };
  const cleanup = () => {
    viewport.destroy();
    window.removeEventListener('lux:before-update',savePosition);
    modal.removeEventListener('scroll', scroll);
    modal.removeEventListener('cancel', preventExit);
    modal.removeEventListener('click', gapClick);
    modal.removeAttribute('closedby');
    modal.classList.remove('reader-clean');
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
  const observer = new MutationObserver(() => { if (!reader.isConnected || !modal.open) cleanup(); });
  observer.observe(modal, { childList: true, attributes: true, attributeFilter: ['open'] });
  modal.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('lux:before-update',savePosition);

  images.forEach(image => {
    image.loading = 'lazy';
    image.decoding = 'async';
    if (mode === 'rtl') image.removeAttribute('src');
  });
  layout(false);
  if (mode === 'vertical' && position > 0) {
    const initialPage = position;
    restoring = true;
    const restore = () => {
      if (!reader.isConnected) return;
      if (mode === 'vertical') pages[initialPage].scrollIntoView({ block: 'start', behavior: 'instant' });
      requestAnimationFrame(() => { restoring = false; });
    };
    if (images[initialPage].complete) requestAnimationFrame(restore);
    else {
      images[initialPage].addEventListener('load', restore, { once: true });
      images[initialPage].addEventListener('error', restore, { once: true });
    }
  }
};
