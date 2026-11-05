function setupNovelDetails() {
  const page = document.getElementById('novel-details');
  const list = document.getElementById('novel-chapter-list');
  const chapters = Array.from(list.children);
  const sort = document.getElementById('novel-chapter-order');
  const resume = document.getElementById('novel-resume');
  const unavailable = document.getElementById('novel-resume-unavailable');
  const progressKey = 'lux-sample-progress:v1:' + page.dataset.novelId;
  let descending = false;
  const search = document.getElementById('novel-chapter-search');
  const results = document.getElementById('novel-chapter-results');
  search.addEventListener('input', () => {
    const query = search.value.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).toLowerCase();
    let count = 0;
    for (const item of chapters) {
      item.hidden = !item.textContent.toLowerCase().includes(query);
      if (!item.hidden) count++;
    }
    results.textContent = query ? (count ? count + ' فصول مطابقة' : 'لا توجد فصول مطابقة') : '';
  });

  sort.addEventListener('click', () => {
    descending = !descending;
    list.append(...(descending ? [...chapters].reverse() : chapters));
    sort.textContent = descending ? 'الترتيب: الأحدث أولًا' : 'الترتيب: الأقدم أولًا';
    sort.setAttribute('aria-pressed', String(descending));
  });

  function updateResume() {
    let chapter;
    try { chapter = localStorage.getItem(progressKey); } catch {}
    const link = chapters.find(item => item.dataset.chapter === chapter)?.firstElementChild;
    resume.hidden = !link;
    unavailable.hidden = !!link;
    if (link) {
      resume.href = link.getAttribute('href');
      resume.textContent = 'متابعة القراءة · الفصل ' + chapter;
    } else {
      resume.removeAttribute('href');
    }
    updateBookmark();
  }
  const bookmark = document.getElementById('novel-bookmark');
  function updateBookmark() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('lux-reader-bookmark:v1:' + page.dataset.novelId)); } catch {}
    const marked = chapters.find(item => item.dataset.chapter === String(saved?.chapter))?.firstElementChild;
    bookmark.hidden = !marked;
    if (marked) {
      bookmark.href = marked.getAttribute('href') + '#bookmark';
      bookmark.textContent = 'علامة القراءة · الفصل ' + saved.chapter;
    } else bookmark.removeAttribute('href');
  }
  updateResume();
  return updateResume;
}
