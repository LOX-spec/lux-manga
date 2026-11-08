function sourceWelcome() {
  show(`<section class="source-welcome"><span class="eyetag">أهلًا بك في لوكس</span><h2>اختر بداية مكتبتك</h2><p>مكتبة المانجا العربية جاهزة عبر Suwayomi وAzora. هل ترغب بإضافة مصادر أخرى؟</p><form id="readySources"><label class="ready-source"><input type="checkbox" name="comics"><span><b>كوميكس فيرس</b><small>سلاسل مصورة · DC، مارفل وناشرون آخرون</small></span></label><label class="ready-source"><input type="checkbox" name="novels"><span><b>فضاء الروايات</b><small>اكتشاف الروايات والفصول المنشورة من فهرس المصدر</small></span></label><p class="note">اختياري. تبدأ الفهرسة بعد موافقتك، ويمكن إدارة المصادر أو حذفها لاحقًا.</p><div class="actions"><button class="primary">إضافة المحدد والبدء</button><button type="button" data-sources-skip>ليس الآن</button></div><p id="readySourceStatus" role="status"></p></form></section>`);
}
maybeGuide = function() { if (!state.sourceSetupSeen) sourceWelcome(); };
async function finishSourceWelcome(choices) {
  const pending=[];
  for(const [key,name,url,type] of [['comics','كوميكس فيرس','https://arcomixverse.blogspot.com/','comics'],['novels','فضاء الروايات','https://cenele.com/','novels']]) {
    if(!choices.has(key)||state.sites.some(site=>site.url===url)) continue;
    const site={id:'s'+crypto.randomUUID().replaceAll('-',''),name,url,entryUrl:url,contentType:type,publisher:'other',queue:[],seen:[],done:0,failed:[],paused:false,status:'pending',lastCheck:null};
    state.sites.push(site);
    enqueue(site,'catalog',type==='comics'?LuxComicverse.feedUrl():url);
    pending.push(site);
  }
  state.sourceSetupSeen=true; state.guideSeen=true;
  if(!await save()) throw Error('تعذّر حفظ المصادر. أعد المحاولة.');
  $('#modal').close(); render();
  pending.forEach(site=>runImport(site.id));
}
document.addEventListener('submit', async event=>{
  if(event.target.id!=='readySources')return;
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
  try{await finishSourceWelcome(new FormData(event.target));}catch(error){$('#readySourceStatus').textContent=error.message;button.disabled=false;}
});
document.addEventListener('click',event=>{
  if(event.target.closest('[data-sources-skip]'))void finishSourceWelcome(new FormData()).catch(error=>toast(error.message));
  if(event.target.closest('[data-ready-sources]'))sourceWelcome();
});
const settingsBeforeReadySources=renderSettings;
renderSettings=function(){settingsBeforeReadySources();$('#page').insertAdjacentHTML('beforeend','<section class="backup-panel"><h3>مصادر جاهزة لمكتبتك</h3><p>اختر مصادر الكوميكس والروايات وقتما تشاء.</p><button data-ready-sources>اختيار المصادر الجاهزة</button></section>');};

const parseBeforeNovelPreset=parseManga;
parseManga=function(data){
  const parsed=parseBeforeNovelPreset(data),url=new URL(data.url);
  if(url.hostname!=='cenele.com')return parsed;
  const doc=new DOMParser().parseFromString(data.content,'text/html');
  parsed.kind='رواية';parsed.contentType='novels';
  const parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]==='cont'&&parts.length===2){
    parsed.title=doc.querySelector('.nhv-novel-title')?.textContent.trim()||parsed.title;
    parsed.isWork=true;
    parsed.discovery={method:'فهرس الرواية المنشور',dynamic:true};
  }else{
    const seen=new Set(parsed.works.map(work=>work.url));
    for(const anchor of doc.querySelectorAll('a[href]')){
      const link=safeLink(anchor.getAttribute('href'),url.href);if(!link)continue;
      const target=new URL(link),segments=target.pathname.split('/').filter(Boolean);
      if(target.origin!==url.origin||segments[0]!=='cont'||segments.length!==2||seen.has(link))continue;
      const image=anchor.querySelector('img');
      parsed.works.push({url:link,title:(anchor.textContent.trim()||image?.alt||decodeURIComponent(segments[1])).slice(0,180),cover:image?imageURL(image,url.href):''});seen.add(link);
    }
  }
  return parsed;
};
