function setupNovelDetails() {
  const page = document.getElementById('novel-details');
  const list = document.getElementById('novel-chapter-list');
  const chapters = Array.from(list.children);
  const sort = document.getElementById('novel-chapter-order');
  const resume = document.getElementById('novel-resume');
  const unavailable = document.getElementById('novel-resume-unavailable');
  const progressKey = 'lux-sample-progress:v1:' + page.dataset.novelId;
  let descending = false;

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
  }
  updateResume();
  return updateResume;
}
