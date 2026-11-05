const LuxLibraryBackup = (() => {
  const maxSize=48*1024*1024;
  function parse(text) {
    if(text.length>maxSize)throw Error('حجم النسخة يتجاوز 48 ميغابايت.');
    const data=JSON.parse(text,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('مفاتيح غير صالحة في النسخة.');return value;});
    if(data?.format!=='lux-library-complete'||data.version!==1||!data.library||data.novels?.format!=='lux-novels')throw Error('اختر نسخة المكتبة الشاملة من لوكس.');
    const library=data.library;
    if(!Array.isArray(library.books)||!Array.isArray(library.sites)||!Array.isArray(library.favorites)||!library.progress||!library.lists||!Array.isArray(data.novels.books)||!data.novels.books.length)throw Error('بنية النسخة غير مكتملة.');
    const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,180}$/.test(id);
    const validURL=url=>typeof url==='string'&&(/^https?:\/\//.test(url)||/^\/manga-sample-[\w-]+\.svg$/.test(url)||/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(url));
    const seen=new Set();
    for(const book of library.books){
      if(!validId(book.id)||seen.has(book.id)||typeof book.title!=='string'||!Array.isArray(book.chapters)||!Array.isArray(book.genres)||!book.genres.every(tag=>typeof tag==='string')||!validURL(book.source))throw Error('أحد الأعمال غير صالح في النسخة.');
      seen.add(book.id);
      for(const chapter of book.chapters)if(typeof chapter.title!=='string'||!validURL(chapter.url)||!Array.isArray(chapter.images)||!chapter.images.every(validURL))throw Error('بيانات صور أو فصول غير صالحة.');
      if(book.cover&&!validURL(book.cover))throw Error('رابط غلاف غير صالح.');
    }
    for(const site of library.sites)if(!validId(site.id)||!validURL(site.url))throw Error('مصدر غير صالح.');
    for(const [id,progress]of Object.entries(library.progress)){if(!validId(id)||!progress||!Number.isInteger(progress.chapter)||progress.chapter<0||!Array.isArray(progress.read)||!progress.read.every(validURL))throw Error('سجل قراءة غير صالح.');}
    if(!library.favorites.every(validId)||Object.entries(library.lists).some(([id,list])=>!validId(id)||!['reading','later','completed','ignored',''].includes(list)))throw Error('قوائم غير صالحة.');
    return data;
  }
  function snapshot(){if(!db)throw Error('انتظر تجهيز تخزين المكتبة قبل التصدير.');return {format:'lux-library-complete',version:1,exportedAt:new Date().toISOString(),library:structuredClone(state),novels:LuxNovelPublications.backup(),mangaMode:localStorage.getItem('lux.manga.mode')||'vertical'};}
  async function restore(data) {
    data=parse(JSON.stringify(data));
    if(syncing.size)throw Error('أوقف فحص المصادر قبل الاستيراد.');
    const previous=structuredClone(state), saved=new Map();
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(/^(lux-novel|lux-sample-progress:|lux-reader-bookmark:|lux\.manga\.mode)/.test(key))saved.set(key,localStorage.getItem(key));}
    try {
      await LuxNovelPublications.restoreBackup(data.novels);
      state=Object.assign(emptyState(),data.library);
      state.sites.forEach(site=>{site.paused=true;site.status='paused';site.queue=Array.isArray(site.queue)?site.queue:[];site.seen=Array.isArray(site.seen)?site.seen:[];site.failed=Array.isArray(site.failed)?site.failed:[];});
      // Offline image cache files do not travel in JSON. Embedded local pages do.
      state.downloads={};state.downloadJobs={};
      localStorage.setItem('lux.manga.mode',data.mangaMode==='rtl'?'rtl':'vertical');
      LuxChapterLinks.repairState(state);
      if(!await save())throw Error('تعذر حفظ المكتبة المستوردة.');
      applyPrefs();render();return state.books.length;
    } catch(error) {
      state=previous;
      for(const key of Object.keys(localStorage))if(/^(lux-novel|lux-sample-progress:|lux-reader-bookmark:|lux\.manga\.mode)/.test(key)&&!saved.has(key))localStorage.removeItem(key);
      for(const[key,value]of saved)localStorage.setItem(key,value);
      await save();throw error;
    }
  }
  return {parse,snapshot,restore,maxSize};
})();
function mountLibraryBackup() {
  const page=$('#page');if(!page||page.querySelector('#completeLibraryBackup'))return;
  page.insertAdjacentHTML('beforeend',`<section id="completeLibraryBackup" class="novel-backup-panel"><div><h2>نسخة واحدة لكل مكتبتك</h2><p>الروايات وفصولها، المانجا والكوميكس، المصادر، المفضلة، تقدم القراءة والإعدادات في ملف JSON واحد. الصور المرفوعة محليًا مشمولة؛ صور المصادر الخارجية تبقى روابط وتحتاج إعادة تحميل على الجهاز الآخر.</p></div><div class="actions"><button type="button" data-library-export>تصدير المكتبة</button><label class="textbutton">استيراد المكتبة<input type="file" data-library-import accept=".json,application/json"></label></div><p role="status" data-library-result></p><div data-library-confirm hidden><p data-library-summary></p><p>سيستبدل الاستيراد مكتبة الصور والقوائم والإعدادات، ويدمج الروايات. صدّر نسختك الحالية أولًا للاحتفاظ بها.</p><button type="button" data-library-restore>تأكيد استيراد المكتبة</button><button type="button" data-library-cancel>إلغاء</button></div></section>`);
  const panel=page.querySelector('#completeLibraryBackup'),result=panel.querySelector('[data-library-result]');let pending;
  panel.querySelector('[data-library-export]').onclick=()=>{try{const url=URL.createObjectURL(new Blob([JSON.stringify(LuxLibraryBackup.snapshot())],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='lux-complete-library-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);result.textContent='تم تجهيز المكتبة كاملة للتنزيل.';}catch(error){result.textContent=error.message;}};
  panel.querySelector('[data-library-import]').onchange=async event=>{pending=null;panel.querySelector('[data-library-confirm]').hidden=true;try{const file=event.target.files[0];if(!file)return;if(file.size>LuxLibraryBackup.maxSize)throw Error('حجم الملف الأقصى 48 ميغابايت.');pending=LuxLibraryBackup.parse(await file.text());panel.querySelector('[data-library-summary]').textContent=`${pending.library.books.length} أعمال مصورة ومستوردات، و${pending.novels.books.length} روايات بفصولها.`;panel.querySelector('[data-library-confirm]').hidden=false;result.textContent='تمت قراءة النسخة؛ لم تتغير المكتبة بعد.';}catch(error){result.textContent=error.message;}};
  panel.querySelector('[data-library-cancel]').onclick=()=>{pending=null;panel.querySelector('[data-library-confirm]').hidden=true;};
  panel.querySelector('[data-library-restore]').onclick=async event=>{if(!pending)return;event.target.disabled=true;try{await LuxLibraryBackup.restore(pending);toast('اكتمل استيراد المكتبة والتقدم في القراءة.');}catch(error){result.textContent=error.message;event.target.disabled=false;}};
}
const backupSettings=renderSettings;renderSettings=function(){backupSettings();mountLibraryBackup();};
const backupAdmin=renderNovelAdmin;renderNovelAdmin=function(){backupAdmin();mountLibraryBackup();};
if(document.querySelector('.novel-admin')||view==='settings')mountLibraryBackup();
