const LuxNovelPublications = (() => {
  const prefix = 'lux-novel-studio:v1:';
  const bookPrefix = prefix + 'book:';
  const chapterPrefix = prefix + 'chapter:';
  const seedKey = 'lux-novel-studio:seed:v1';
  let warning = '';

  function imageUrl(value) {
    const input = String(value || '').trim();
    if (/^\/(?!\/)[a-z0-9/_-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(input)) return input;
    try {
      const url = new URL(input);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch {}
    return '';
  }

  function chapterNumber(value) {
    const normalized = String(value).trim()
      .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15))
      .replace('٫', '.');
    if (!/^\d{1,9}(?:\.\d{1,6})?$/.test(normalized)) return null;
    const number = Number(normalized);
    return number > 0 ? number : null;
  }

  function validBook(book) {
    return book && ['number', 'string'].includes(typeof book.id) &&
      typeof book.title === 'string' && typeof book.author === 'string' &&
      typeof book.synopsis === 'string' && imageUrl(book.cover) &&
      Array.isArray(book.genres) && book.genres.every(tag => typeof tag === 'string') &&
      Array.isArray(book.chapters) && ['مستمرة', 'مكتملة'].includes(book.status);
  }

  function validChapter(chapter) {
    if (!chapter || chapterNumber(chapter.number) === null || typeof chapter.title !== 'string') return false;
    if (Array.isArray(chapter.content)) {
      return chapter.content.length > 0 && chapter.content.every(block => block &&
        (typeof block.text === 'string' || (imageUrl(block.image) && typeof block.alt === 'string')));
    }
    return Array.isArray(chapter.text) && chapter.text.length > 0 &&
      chapter.text.every(paragraph => typeof paragraph === 'string');
  }

  function records(keyPrefix, validate) {
    const items = [];
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(keyPrefix)) continue;
        try {
          const record = JSON.parse(localStorage.getItem(key));
          if (!validate(record)) throw new Error('Invalid saved record');
          items.push(record);
        } catch {
          warning = 'تعذّرت قراءة بعض السجلات المحفوظة. تبقى بقية الأعمال متاحة.';
        }
      }
    } catch {
      warning = 'المتصفح لا يتيح الوصول إلى التخزين المحلي حاليًا.';
    }
    return items;
  }

  function seedDatabase() {
    try {
      const saved = localStorage.getItem(seedKey);
      if (saved !== null) {
        const data = JSON.parse(saved);
        if (data.version !== 1 || !Array.isArray(data.novels) || !data.novels.every(validBook)) {
          throw new Error('Invalid sample database');
        }
        return data.novels;
      }
      localStorage.setItem(seedKey, JSON.stringify({ version: 1, novels: NOVELS_DATA }));
    } catch {
      warning = 'تعمل الروايات المرفقة، لكن تعذّر تهيئة التخزين. تحقّق من مساحة المتصفح وإذن حفظ البيانات.';
    }
    return NOVELS_DATA;
  }

  function catalogue() {
    const books = new Map(seedDatabase().map(book => [String(book.id), book]));
    for (const book of records(bookPrefix, validBook)) books.set(String(book.id), book);
    const chaptersByBook = new Map();
    for (const chapter of records(chapterPrefix, validChapter)) {
      const id = String(chapter.bookId);
      if (!chaptersByBook.has(id)) chaptersByBook.set(id, []);
      chaptersByBook.get(id).push(chapter);
    }
    return [...books.values()].map(book => {
      const chapters = new Map(book.chapters.filter(validChapter).map(chapter => [Number(chapter.number), chapter]));
      for (const chapter of chaptersByBook.get(String(book.id)) || []) chapters.set(Number(chapter.number), chapter);
      return { ...book, chapters: [...chapters.values()].sort((a, b) => a.number - b.number) };
    }).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  }

  function write(key, record) {
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      throw new Error('تعذّر الحفظ. تحقّق من مساحة التخزين وإذن حفظ بيانات الموقع في المتصفح.');
    }
    window.dispatchEvent(new Event('lux-novels-changed'));
  }

  function locked(key, operation) {
    return navigator.locks ? navigator.locks.request(key, operation) : Promise.resolve().then(operation);
  }

  function saveNovel(fields) {
    const id = fields.id || 'studio-' + crypto.randomUUID();
    return locked(bookPrefix + id, () => {
      const previous = catalogue().find(book => String(book.id) === id);
      const savedBook = records(bookPrefix, validBook).find(book => String(book.id) === id);
      if (fields.id && !previous) throw new Error('هذه الرواية غير موجودة.');
      if (fields.id && Number(fields.revision) !== (previous.revision || 0)) {
        throw new Error('عُدّلت الرواية في تبويب آخر. اخترها مجددًا لتحميل آخر نسخة.');
      }
      const book = {
        id: previous?.id ?? id,
        title: String(fields.title || '').trim(),
        author: String(fields.author || '').trim(),
        cover: imageUrl(fields.cover),
        synopsis: String(fields.synopsis || '').trim(),
        genres: [...new Set(String(fields.genres || '').split(/[،,\n]/).map(tag => tag.trim()).filter(Boolean))],
        status: fields.status,
        chapters: savedBook?.chapters ?? seedDatabase().find(book => String(book.id) === id)?.chapters ?? [],
        publishedAt: previous ? previous.publishedAt : Date.now(),
        revision: (previous?.revision || 0) + 1,
        updatedAt: Date.now()
      };
      if (!book.title || !book.author || !book.synopsis || !book.genres.length) {
        throw new Error('أدخل العنوان والمؤلف والنبذة وتصنيفًا واحدًا على الأقل.');
      }
      if (!book.cover) throw new Error('أدخل رابط صورة صالحًا أو مسار غلاف مرفق يبدأ بـ /.');
      if (!['مستمرة', 'مكتملة'].includes(book.status)) throw new Error('اختر حالة الرواية.');
      write(bookPrefix + id, book);
      return book;
    });
  }

  function chapterContent(body) {
    const content = [];
    let lines = [];
    function flush() {
      if (!lines.length) return;
      content.push({ text: lines.join('\n') });
      lines = [];
    }
    for (const raw of String(body || '').split(/\r\n?|\n/)) {
      const line = raw.trim();
      const markdown = /^!\[([^\]]*)\]\((.+)\)$/.exec(line);
      const direct = /^(?:https?:\/\/\S+|\/[a-z0-9/_-]+\.(?:svg|png|jpe?g|webp|gif))$/i.test(line);
      const url = imageUrl(markdown?.[2] ?? (direct ? line : ''));
      if (markdown && !url) throw new Error('أحد روابط الصور في الفصل غير صالح.');
      if (url) {
        flush();
        content.push({ image: url, alt: markdown?.[1] || 'صورة من الفصل' });
      } else if (line) {
        lines.push(line);
      } else {
        flush();
      }
    }
    flush();
    return content;
  }

  function saveChapter(fields) {
    const bookId = String(fields.bookId || '');
    const number = chapterNumber(fields.number);
    if (number === null) throw new Error('أدخل رقم فصل موجبًا، مثل 1 أو 25.1.');
    const content = chapterContent(fields.body);
    const title = String(fields.title || '').trim();
    if (!title || !content.length) throw new Error('أدخل عنوان الفصل ومحتواه.');
    const key = chapterPrefix + bookId + ':' + number;
    return locked(key, () => {
      const book = catalogue().find(item => String(item.id) === bookId);
      if (!book) throw new Error('اختر الرواية التي تريد النشر فيها.');
      const previous = book.chapters.find(chapter => chapter.number === number);
      const editing = fields.editing === '1';
      if (!editing && previous) throw new Error('رقم الفصل مستخدم بالفعل في هذه الرواية.');
      if (editing && !previous) throw new Error('هذا الفصل غير موجود.');
      if (editing && Number(fields.revision) !== (previous.revision || 0)) {
        throw new Error('عُدّل الفصل في تبويب آخر. اختره مجددًا لتحميل آخر نسخة.');
      }
      const chapter = { bookId, number, title, content, revision: (previous?.revision || 0) + 1, updatedAt: Date.now() };
      write(key, chapter);
      return chapter;
    });
  }

  function contentSource(chapter) {
    if (!chapter.content) return chapter.text.join('\n\n');
    return chapter.content.map(block => block.image
      ? '![' + block.alt + '](' + block.image + ')' : block.text).join('\n\n');
  }

  return {
    catalogue, imageUrl, chapterNumber, contentSource,
    publishNovel: saveNovel, publishChapter: saveChapter,
    storageWarning: () => warning,
    changed: event => event.key === null || event.key === seedKey || event.key.startsWith(prefix)
  };
})();

