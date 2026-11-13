/* Unified navigation and compact preferences; existing storage and readers stay shared. */
studioViews.release='التحديثات';
state.preferences={...prefs(),ornaments:false};applyPrefs();
let uxReleaseInfo=null,uxChecking=false;
const uxSections=[['catalog','المانجا والمانهوا','reading'],['comics','الكوميكس','comics'],['novels','عالم الروايات','novels']];
function uxSectionTabs(){return '<nav class="ux-sections" aria-label="أقسام اكتشف">'+uxSections.map(([key,label,icon])=>`<button data-view="${key}" aria-current="${(key==='comics'?['comics','dc','marvel','comic-other'].includes(view):view===key)?'page':'false'}">${studioIcon(icon)}${label}</button>`).join('')+'</nav>';}
const uxOriginalNavigation=studioNavigation;
studioNavigation=function(){
  uxOriginalNavigation();
  $('#nav').innerHTML=[['home','اكتشف'],['history','السجل'],['favorites','المفضلة'],['later','اقرأ لاحقًا'],['downloads','التحميلات'],['settings','الإعدادات']].map(([key,label])=>studioNavItem(key,label)).join('');
  $('#mobileNav').innerHTML=[['home','اكتشف'],['favorites','المفضلة'],['later','لاحقًا'],['downloads','التحميلات'],['settings','الإعدادات']].map(([key,label])=>`<button data-view="${key}" class="${view===key?'active':''}">${studioIcon(key)}<span>${label}</span></button>`).join('');
  const brand=$('.brand');brand.setAttribute('aria-label','مكتبة لوكس');
  brand.querySelector('span:last-child').innerHTML='مكتبة لوكس<small>LUX LIBRARY</small>';
};
function uxActions(id){return `<div class="ux-card-actions"><button data-ux-favorite="${esc(id)}" aria-label="المفضلة" aria-pressed="${state.favorites.includes(id)}">${studioIcon('favorites')}</button><button data-ux-later="${esc(id)}" aria-label="اقرأ لاحقًا" aria-pressed="${listOf(id)==='later'}">${studioIcon('later')}</button></div>`;}
const uxOriginalCard=card;
card=function(book){return uxOriginalCard(book).replace('<div class="card-art">','<div class="card-art">'+uxActions(book.id)).replace(/<button class="card-favorite[\s\S]*?<\/button>/,'');};
function uxDecorateCards(){
  for(const article of document.querySelectorAll('.comic-series-card')){
    const id=article.querySelector('[data-open]')?.dataset.open;
    if(id&&!article.querySelector('.ux-card-actions'))article.insertAdjacentHTML('afterbegin',uxActions(id));
  }
  for(const article of document.querySelectorAll('.novel-sample-card')){
    const id=article.id.replace('sample-novel-','');
    if(!article.querySelector('.ux-card-actions'))article.insertAdjacentHTML('afterbegin',`<div class="ux-card-actions"><button aria-pressed="${state.favorites.includes('publication-'+id)}" data-ux-publication="${esc(id)}" data-mode="favorite" aria-label="المفضلة">${studioIcon('favorites')}</button><button data-ux-publication="${esc(id)}" data-mode="later" aria-pressed="${listOf('publication-'+id)==='later'}" aria-label="اقرأ لاحقًا">${studioIcon('later')}</button></div>`);
  }
}
function uxDiscover(){
  const recent=books().filter(book=>state.progress[book.id]).sort((a,b)=>(state.progress[b.id].time||'').localeCompare(state.progress[a.id].time||'')).slice(0,6);
  $('#page').innerHTML=`<section class="ux-discover"><span class="eyetag">LUX LIBRARY</span><h1>عالمك، بين الصفحات.</h1><p>اختر ما تحب أن تقرأه اليوم.</p>${uxSectionTabs()}<div class="ux-discover-links"><button data-view="updates">${studioIcon('updates')} آخر الفصول</button><button data-view="sites">${studioIcon('sites')} إدارة المصادر</button><button data-view="getapp">${studioIcon('downloads')} تحميل التطبيق</button></div></section>${recent.length?'<section class="ux-recent"><h2>تابع من حيث توقفت</h2><div class="studio-grid">'+recent.map(card).join('')+'</div></section>':'<section class="ux-intro"><h2>مكتبة على ذوقك</h2><p>احفظ أعمالك بالقلب، أو أضفها إلى «اقرأ لاحقًا». ستجدها دائمًا في قائمتك.</p><button class="primary" data-view="catalog">اكتشف المانجا والمانهوا ←</button></section>'}`;
}
renderSettings=function(){
  $('#page').innerHTML=`<header class="ux-page-heading"><h1>الإعدادات</h1><p>خيارات واضحة لتجربة تناسبك. تُطبّق تحديثات الموقع والتطبيق تلقائيًا بعد حفظ بياناتك، دون إعادة التثبيت.</p></header><div class="ux-settings-grid"><button data-ux-panel="appearance">${studioIcon('sun')}<span><b>المظهر وحجم العرض</b><small>السمة، الألوان، الخط وحجم النص</small></span>←</button><button data-ux-panel="reader">${studioIcon('reading')}<span><b>القراءة</b><small>عرض الصفحات والتحميل والتنقل</small></span>←</button><button data-view="release">${studioIcon('updates')}<span><b>التحقق من التحديثات</b><small>الإصدار الحالي وآخر إصدار متاح</small></span>←</button><button data-view="getapp">${studioIcon('downloads')}<span><b>تحميل التطبيق</b><small>التثبيت على الجوال والكمبيوتر</small></span>←</button></div><div class="ux-settings-footer"><button data-ux-help>دليل سريع</button><a href="/?view=admin">استوديو الناشر</a><small>لوكس ${luxRelease}</small></div>`;
};
function uxPreferenceSelect(key,label,options){return `<label>${label}<select data-ux-pref="${key}">${options.map(([value,text])=>`<option value="${value}" ${String(prefs()[key])===String(value)?'selected':''}>${text}</option>`).join('')}</select></label>`;}
function uxPreferenceToggle(key,label){return `<label class="ux-toggle"><input type="checkbox" data-ux-pref="${key}" ${prefs()[key]?'checked':''}>${label}</label>`;}
function uxAppearance(){
  let font='Thmanyah Sans';try{font=localStorage.getItem('lux.app.font')||font;}catch{}
  show(`<section class="ux-preferences" id="uxAppearance"><h2>المظهر وحجم العرض</h2><p>تُطبّق اختياراتك وتُحفظ مباشرة.</p>${uxPreferenceSelect('theme','السمة',[['dark','داكن'],['sepia','بني مريح'],['light','فاتح']])}<label>لون الواجهة</label>${paletteHTML(prefs())}<label for="uxFont">خط القراءة والعناوين</label><select id="uxFont">${fontChoices.map(value=>`<option ${font===value?'selected':''}>${value}</option>`).join('')}</select><label for="uxFontSize">حجم النص <output id="uxFontValue">${prefs().font}%</output></label><input id="uxFontSize" type="range" min="85" max="140" step="5" value="${prefs().font}" data-ux-pref="font">${uxPreferenceToggle('compact','بطاقات أصغر')}${uxPreferenceToggle('reducedMotion','تقليل الحركة')}<button class="primary" data-ux-close>تم</button></section>`);
}
function uxReaderSettings(){show(`<section class="ux-preferences"><h2>إعدادات القراءة</h2>${uxPreferenceSelect('readerWidth','عرض صفحات المانجا',[['640','640 بكسل'],['820','820 بكسل'],['1000','1000 بكسل'],['full','ملاءمة الشاشة']])}${uxPreferenceSelect('gap','المسافة بين الصور',[[0,'بدون فواصل'],[8,'مسافة صغيرة'],[16,'مسافة مريحة']])}${uxPreferenceToggle('lazy','تحميل الصور عند الحاجة')}${uxPreferenceToggle('autoMark','حفظ الفصل مقروءًا عند إتمامه')}${uxPreferenceToggle('autoNext','الانتقال للفصل التالي بعد الإتمام')}<p>يمكن التكبير والتصغير وإخفاء الأدوات من داخل القارئ.</p><button class="primary" data-ux-close>تم</button></section>`);}
function uxRenderRelease(){
  $('#page').innerHTML=`<header class="ux-page-heading"><button data-view="settings">→ الإعدادات</button><h1>تحديثات لوكس</h1><p>آخر إصدار منشور من مستودع المشروع إلى الموقع.</p></header><section class="ux-release"><dl><div><dt>الإصدار الحالي</dt><dd>${luxRelease}</dd></div><div><dt>الإصدار المتاح</dt><dd>${esc(uxReleaseInfo?.version||'لم يُفحص بعد')}</dd></div></dl><p role="status" id="uxUpdateStatus">${esc(uxReleaseInfo?.message||'اضغط للتحقق من آخر إصدار متاح.')}</p><div class="actions"><button class="primary" data-ux-check ${uxChecking?'disabled':''}>${uxChecking?'جارٍ التحقق…':'التحقق من التحديثات'}</button>${uxReleaseInfo?.available?'<button data-ux-install-update>تحميل وتطبيق التحديث</button>':''}</div><p class="note">تُحفظ المكتبة قبل إعادة التحميل. التحقق يحتاج اتصالًا بالإنترنت.</p></section>`;
}
async function uxCheckUpdate(){
  if(uxChecking)return;uxChecking=true;uxRenderRelease();
  try{
    const response=await fetch('/version.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('تعذر الوصول إلى خدمة التحديثات.');
    const release=await response.json();
    const available=release.version?release.version!==luxRelease:!!luxRegistration?.waiting;
    await luxRegistration?.update();
    uxReleaseInfo={version:release.version||'إصدار منشور',available,message:available?'يوجد إصدار جديد جاهز للتحميل والتطبيق.':'أنت تستخدم آخر إصدار متاح.'};
  }catch(error){uxReleaseInfo={message:navigator.onLine?error.message:'أنت دون اتصال. أعد المحاولة بعد الاتصال.'};}
  finally{uxChecking=false;if(view==='release')uxRenderRelease();}
}
const uxBaseRender=render;
render=function(){
  $('#page').classList.remove('collection-page','novels-theme','comics-theme');
  if(view==='home'){studioNavigation();uxDiscover();}
  else if(view==='settings'){studioNavigation();renderSettings();}
  else if(view==='release'){studioNavigation();uxRenderRelease();}
  else if(view==='guide'){studioNavigation();uxDiscover();uxWelcome();}
  else{uxBaseRender();if(['catalog','comics','dc','marvel','comic-other','novels'].includes(view))$('#page').insertAdjacentHTML('afterbegin',uxSectionTabs());}
  if(['comics','dc','marvel','comic-other'].includes(view)){
    const publishers=$('.comic-publishers');if(publishers)publishers.innerHTML=[['comics','كل الكوميكس'],['dc','DC'],['marvel','مارفل'],['comic-other','ناشرون آخرون']].map(([key,label])=>`<button data-view="${key}" aria-pressed="${view===key}">${label}</button>`).join('');
  }
  if(view==='history')$('#page').insertAdjacentHTML('afterbegin','<div class="ux-history-tabs"><button data-view="history">سجل القراءة</button><button data-view="updates">آخر الفصول</button></div>');
  uxDecorateCards();
};
menu=function(open){
  if(innerWidth>760){document.body.classList.toggle('desktop-collapsed',open);try{localStorage.setItem('lux.sidebar.hidden',open?'1':'0');}catch{}}
  else document.body.classList.toggle('menu-open',open);
  $('#menuToggle').setAttribute('aria-expanded',String(innerWidth>760?!open:open));
};
try{if(innerWidth>760&&localStorage.getItem('lux.sidebar.hidden')==='1')document.body.classList.add('desktop-collapsed');}catch{}
const uxGo=go;
go=function(target){const collapsed=document.body.classList.contains('desktop-collapsed');uxGo(target);if(innerWidth>760)menu(collapsed);};
function uxWelcome(){show('<section class="ux-welcome"><span class="eyetag">مكتبة لوكس</span><h2>أهلًا بك في عالم القراءة</h2><p>١. اختر المانجا أو الكوميكس أو الروايات من «اكتشف».</p><p>٢. احفظ العمل بالقلب أو زر «اقرأ لاحقًا».</p><p>٣. افتح فصلًا، واضبط القارئ كما تحب.</p><button class="primary" data-ux-close>ابدأ القراءة</button></section>');}
maybeGuide=function(){if(typeof showSourceSetup==='function')showSourceSetup();};
const uxOldNovelHref=novelReaderHref;
novelReaderHref=function(id,index){const book=get(id);return book?.publicationId?LuxNovelPages.chapterUrl(book.publicationId,book.chapters[index||0]?.number):uxOldNovelHref(id,index);};
function uxPublicationRecord(id){
  const novel=LuxNovelPublications.catalogue().find(book=>String(book.id)===id);if(!novel)throw Error('تعذر العثور على الرواية.');
  const key='publication-'+id;let book=get(key);
  if(!book){book={id:key,publicationId:novel.id,title:novel.title,author:novel.author,cover:novel.cover,description:novel.synopsis,genres:novel.genres,kind:'رواية',contentType:'novels',siteId:'published-local',source:location.origin+LuxNovelPages.detailsUrl(novel.id),chapters:novel.chapters.map(ch=>({...ch,url:location.origin+LuxNovelPages.chapterUrl(novel.id,ch.number),images:[]}))};state.books.push(book);}return book;
}
async function uxToggleAction(id,mode){if(mode==='favorite')toggleFavorite(id);else{setList(id,listOf(id)==='later'?'':'later');toast(listOf(id)==='later'?'أُضيف إلى اقرأ لاحقًا':'أُزيل من اقرأ لاحقًا');}await save();}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.uxPanel==='appearance')uxAppearance();
  if(button.dataset.uxPanel==='reader')uxReaderSettings();
  if(button.hasAttribute('data-ux-close'))$('#modal').close();
  if(button.hasAttribute('data-ux-help'))uxWelcome();
  if(button.hasAttribute('data-ux-check'))void uxCheckUpdate();
  if(button.hasAttribute('data-ux-install-update')){await luxUpdateApp();}
  const mode=button.dataset.mode;
  try{
    if(button.dataset.uxFavorite)await uxToggleAction(button.dataset.uxFavorite,'favorite');
    if(button.dataset.uxLater)await uxToggleAction(button.dataset.uxLater,'later');
    if(button.dataset.uxPublication){await uxToggleAction(uxPublicationRecord(button.dataset.uxPublication).id,mode);render();}
  }catch(error){toast(error.message);button.disabled=false;}
});
function uxChangePreference(event){
  const input=event.target;
  if(input.id==='uxFont'){applyAppFont(input.value);return;}
  let key=input.dataset.uxPref;
  if(!key&&input.name==='accent'&&input.closest('#uxAppearance'))key='accent';
  if(!key)return;
  const defaults=defaultPrefs(),value=typeof defaults[key]==='boolean'?input.checked:typeof defaults[key]==='number'?Number(input.value):input.value;
  state.preferences={...prefs(),[key]:value,ornaments:false};applyPrefs();void save();
  if(key==='font'&&$('#uxFontValue'))$('#uxFontValue').textContent=value+'%';
}
document.addEventListener('change',uxChangePreference);
document.addEventListener('input',event=>{if(event.target.id==='uxFontSize')uxChangePreference(event);});
