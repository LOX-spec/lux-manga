function renderNovelAdmin() {
  const count = new Intl.NumberFormat('ar');
  const page = document.getElementById('page');
  page.innerHTML = `
    <section class="novel-admin" aria-labelledby="novel-admin-title">
      <header class="novel-admin-intro">
        <div>
          <span class="eyetag" lang="en">LUX TRANSLATOR STUDIO</span>
          <h1 id="novel-admin-title">لوحة إدارة الروايات</h1>
          <p>أضف رواية، ثم انشر فصولها مباشرة في رف الروايات.</p>
        </div>
        <a href="/?view=novels">افتح رف الروايات ←</a>
      </header>
      <p class="novel-admin-storage">النصوص محفوظة في متصفح هذا الجهاز. تتوفر الصور دون اتصال بعد عرضها مع اكتمال تجهيز التطبيق.</p>
      <div class="novel-admin-grid">
        <form id="novel-publish" class="novel-admin-panel">
          <header><span class="novel-admin-step">١</span><div><h2>الروايات</h2><p>أضف عملًا جديدًا أو عدّل بيانات رواية منشورة.</p></div></header>
          <div class="novel-admin-field"><label for="novel-edit-id">إضافة أو تعديل رواية</label>
            <select name="id" id="novel-edit-id"></select>
          </div>
          <input name="revision" type="hidden" value="0">
          <label>عنوان الرواية<input name="title" required maxlength="160" dir="auto"></label>
          <label>اسم المؤلف<input name="author" required maxlength="120" dir="auto"></label>
          <label>رابط صورة الغلاف<input name="cover" required maxlength="2048" dir="ltr" placeholder="https://example.com/cover.jpg أو /moon-library-cover.svg"></label>
          <label>النبذة<textarea name="synopsis" required maxlength="2400" rows="4" dir="auto"></textarea></label>
          <label>التصنيفات<input name="genres" required maxlength="220" dir="auto" placeholder="فانتازيا، مغامرة"></label>
          <div class="novel-admin-field"><label for="novel-publish-status">حالة الرواية</label>
            <select id="novel-publish-status" name="status"><option>مستمرة</option><option>مكتملة</option></select>
          </div>
          <button type="submit" class="primary">حفظ ونشر الرواية</button>
          <p class="novel-admin-result" role="status"></p>
        </form>
        <form id="chapter-publish" class="novel-admin-panel">
          <header><span class="novel-admin-step">٢</span><div><h2>إضافة فصل</h2><p>اختر الرواية واكتب الفصل أو الصق نصه.</p></div></header>
          <div class="novel-admin-field"><label for="chapter-publish-book">الرواية</label>
            <select id="chapter-publish-book" name="bookId" required></select>
          </div>
          <div class="novel-admin-field"><label for="chapter-edit-number">إضافة أو تعديل فصل</label>
            <select id="chapter-edit-number" name="savedChapter"></select>
          </div>
          <input name="editing" type="hidden" value="0">
          <input name="revision" type="hidden" value="0">
          <label>رقم الفصل<input name="number" required inputmode="decimal" dir="ltr" maxlength="16" placeholder="25.1"></label>
          <label>عنوان الفصل<input name="title" required maxlength="180" dir="auto"></label>
          <label>نص الفصل<textarea name="body" required rows="13" dir="auto" aria-describedby="chapter-image-hint"></textarea></label>
          <p id="chapter-image-hint">اترك سطرًا فارغًا بين الفقرات. لإضافة صورة، ضع رابطها المباشر في سطر مستقل، أو استخدم <code dir="ltr">![وصف الصورة](https://example.com/image.jpg)</code>.</p>
          <button type="submit" class="primary">نشر الفصل</button>
          <p class="novel-admin-result" role="status"></p>
        </form>
      </div>
    </section>`;
  const novelForm = page.querySelector('#novel-publish');
  const chapterForm = page.querySelector('#chapter-publish');
  const select = chapterForm.elements.bookId;
  const novelSelect = novelForm.elements.id;
  const chapterSelect = chapterForm.elements.savedChapter;

  function updateChapters() {
    const selected = chapterSelect.value;
    const book = LuxNovelPublications.catalogue().find(book => String(book.id) === select.value);
    chapterSelect.replaceChildren(new Option('فصل جديد', ''), ...(book?.chapters || []).map(chapter =>
      new Option('الفصل ' + chapter.number + ' · ' + chapter.title, chapter.number)));
    chapterSelect.value = book?.chapters.some(chapter => String(chapter.number) === selected) ? selected : '';
  }

  function updateBooks(selected = select.value) {
    const books = LuxNovelPublications.catalogue();
    const editing = novelSelect.value;
    novelSelect.replaceChildren(new Option('رواية جديدة', ''), ...books.map(book => new Option(book.title, book.id)));
    novelSelect.value = books.some(book => String(book.id) === editing) ? editing : '';
    const options = books.map(book =>
      new Option(`${book.title} · عدد الفصول: ${count.format(book.chapters.length)}`, book.id));
    select.replaceChildren(new Option('اختر رواية', ''), ...options);
    select.value = options.some(option => option.value === selected) ? selected : '';
    updateChapters();
    const warning = LuxNovelPublications.storageWarning();
    if (warning) page.querySelector('.novel-admin-storage').textContent = warning;
  }

  novelSelect.addEventListener('change', () => {
    const book = LuxNovelPublications.catalogue().find(book => String(book.id) === novelSelect.value);
    if (!book) {
      novelForm.reset();
    } else {
      for (const field of ['title', 'author', 'cover', 'synopsis', 'status']) novelForm.elements[field].value = book[field];
      novelForm.elements.genres.value = book.genres.join('، ');
      novelForm.elements.revision.value = book.revision || 0;
    }
    novelForm.querySelector('[type="submit"]').textContent = book ? 'حفظ تعديلات الرواية' : 'حفظ ونشر الرواية';
    novelForm.querySelector('[role="status"]').replaceChildren();
  });

  function newChapter() {
    for (const field of ['number', 'title', 'body', 'savedChapter']) chapterForm.elements[field].value = '';
    chapterForm.elements.editing.value = '0';
    chapterForm.elements.revision.value = '0';
    chapterForm.elements.number.readOnly = false;
    chapterForm.querySelector('[type="submit"]').textContent = 'نشر الفصل';
    chapterForm.querySelector('[role="status"]').replaceChildren();
  }
  select.addEventListener('change', () => { newChapter(); updateChapters(); });
  chapterSelect.addEventListener('change', () => {
    const book = LuxNovelPublications.catalogue().find(book => String(book.id) === select.value);
    const chapter = book?.chapters.find(chapter => String(chapter.number) === chapterSelect.value);
    if (!chapter) { newChapter(); return; }
    chapterForm.elements.number.value = chapter.number;
    chapterForm.elements.title.value = chapter.title;
    chapterForm.elements.body.value = LuxNovelPublications.contentSource(chapter);
    chapterForm.elements.editing.value = '1';
    chapterForm.elements.revision.value = chapter.revision || 0;
    chapterForm.elements.number.readOnly = true;
    chapterForm.querySelector('[type="submit"]').textContent = 'حفظ تعديلات الفصل';
    chapterForm.querySelector('[role="status"]').replaceChildren();
  });

  function bind(form, publish) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const result = form.querySelector('[role="status"]');
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      result.classList.remove('is-error');
      try {
        const { message, href, label } = await publish(Object.fromEntries(new FormData(form)));
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        result.replaceChildren(message + ' ', link);
      } catch (error) {
        result.classList.add('is-error');
        result.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  bind(novelForm, async fields => {
    const book = await LuxNovelPublications.publishNovel(fields);
    novelForm.reset();
    novelForm.querySelector('[type="submit"]').textContent = 'حفظ ونشر الرواية';
    updateBooks(book.id);
    return { message: 'حُفظت الرواية وأضيفت إلى الرف.', href: LuxNovelPages.detailsUrl(book.id), label: 'عرض الرواية' };
  });
  bind(chapterForm, async fields => {
    const chapter = await LuxNovelPublications.publishChapter(fields);
    chapterForm.reset();
    newChapter();
    updateBooks(chapter.bookId);
    return { message: 'نُشر الفصل وأُضيف إلى الفهرس.', href: LuxNovelPages.chapterUrl(chapter.bookId, chapter.number), label: 'قراءة الفصل' };
  });
  updateBooks();
  page.querySelector('.novel-admin').addEventListener('novel-catalog-change', () => updateBooks());
}

function refreshNovelShelf() {
  if (view === 'novels') {
    const shelf = document.getElementById('novel-local-shelf');
    if (shelf) shelf.outerHTML = renderNovelSampleShelf();
  }
}

window.addEventListener('storage', event => {
  if (!LuxNovelPublications.changed(event)) return;
  refreshNovelShelf();
  document.querySelector('.novel-admin')?.dispatchEvent(new Event('novel-catalog-change'));
});
window.addEventListener('lux-novels-changed', () => {
  refreshNovelShelf();
  document.querySelector('.novel-admin')?.dispatchEvent(new Event('novel-catalog-change'));
});
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  refreshNovelShelf();
  document.querySelector('.novel-admin')?.dispatchEvent(new Event('novel-catalog-change'));
});
