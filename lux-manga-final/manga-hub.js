/* Arabic Azora catalogue. HTML is parsed inertly; only same-origin series links are accepted. */
const mangaHub={language:'ar',adult:false,started:false,loading:false,query:'',ids:[],pages:[],next:'',message:'',error:false};
function matchesLibraryChapter(book,chapter){return !!chapter;}
function visibleLibraryWork(book){return book.siteId!=='local-samples';}
const previousPrimaryParser=parseManga;
parseManga=function(data){
  const url=new URL(data.url);if(url.hostname!=='azorafly.com')return previousPrimaryParser(data);
  const doc=new DOMParser().parseFromString(data.content,'text/html');
  const meta=name=>doc.querySelector('meta[property="'+name+'"],meta[name="'+name+'"]')?.content||'';
  const links=[...doc.querySelectorAll('a[href]')],works=[],chapters=[],images=[],pages=[],seen=new Set();
  for(const a of links){const href=safeLink(a.getAttribute('href'),data.url);if(!href)continue;const u=new URL(href);if(u.origin!==url.origin)continue;
    if(/^\/series\/[^/]+\/chapter-[^/]+\/?$/.test(u.pathname)&&url.pathname.startsWith(u.pathname.split('/chapter-')[0])){
      const number=Number(u.pathname.match(/chapter-(\d+(?:\.\d+)?)/)?.[1]);if(!Number.isFinite(number)||seen.has(href))continue;seen.add(href);chapters.push({url:href,title:'الفصل '+number,number,images:[],language:'ar'});
    }else if(/^\/series\/[^/]+\/?$/.test(u.pathname)&&!seen.has(href)){
      const img=a.querySelector('img');if(!img)continue;seen.add(href);works.push({url:href,title:(img.alt||a.textContent).trim(),cover:imageURL(img,data.url),genres:[],kind:'مانهوا',chapters:[]});
    }
    if((a.rel==='next'||a.getAttribute('aria-label')?.includes('التالي'))&&u.pathname==='/series'&&!pages.includes(href))pages.push(href);
  }
  [...doc.querySelectorAll('img[data-reader-page-image]')].sort((a,b)=>Number(a.dataset.readerIndex)-Number(b.dataset.readerIndex)).forEach(img=>{const src=imageURL(img,data.url);if(src&&!images.includes(src))images.push(src)});
  // Public hydration metadata contains the complete index, beyond the first visible rows.
  // Read only known string/number fields; never execute source scripts.
  const start=data.content.lastIndexOf('initialChapters:');
  const end=start<0?-1:data.content.indexOf('totalChapterCount:',start);
  const hydrated=start>=0&&end>start?data.content.slice(start,end):'';
  for(const entry of hydrated.matchAll(/slug:"(chapter-[^"\\]+)",number:(\d+(?:\.\d+)?),/g)){
    const href=safeLink(url.pathname.replace(/\/$/,'')+'/'+entry[1],url.origin);
    if(href&&!seen.has(href)){seen.add(href);chapters.push({url:href,title:'الفصل '+entry[2],number:Number(entry[2]),images:[],language:'ar'})}
  }
  const expected=Number(end<0?'':data.content.slice(end).match(/^totalChapterCount:(\d+)/)?.[1])||0;
  for(const work of works){
    const slug=decodeURIComponent(new URL(work.url).pathname.split('/')[2]);
    const marker='slug:'+JSON.stringify(slug)+',postTitle:';const position=data.content.lastIndexOf(marker);
    if(position<0)continue;
    const raw=data.content.slice(position,position+3000).split('chapters:')[0];
    work.kind=/seriesType:"MANGA"/.test(raw)?'مانجا':/seriesType:"MANHUA"/.test(raw)?'مانها':'مانهوا';
    work.genres=[...raw.matchAll(/name:"((?:[^"\\]|\\.)*)"/g)].flatMap(match=>{try{return [JSON.parse('"'+match[1]+'"')]}catch{return []}});
  }
  chapters.sort((a,b)=>a.number-b.number);
  const title=(meta('og:title')||doc.querySelector('h1')?.textContent||'').trim();
  const cover=works.find(work=>new URL(work.url).pathname===url.pathname)?.cover||safeLink(meta('og:image'),data.url);
  return {url:data.url,isWork:/^\/series\/[^/]+\/?$/.test(url.pathname),title,cover,description:meta('og:description')||meta('description'),genres:[],kind:/seriesType:"MANGA"/.test(data.content)?'مانجا':/seriesType:"MANHUA"/.test(data.content)?'مانها':'مانهوا',chapters,images,works,pages,expectedChapters:expected,indexComplete:!expected||chapters.length>=expected};
};
function paintPrimaryHub(){const output=$('#manga-hub-results');if(!output)return;const items=mangaHub.ids.map(get).filter(Boolean).filter(b=>!mangaHub.query||b.title.toLowerCase().includes(mangaHub.query.toLowerCase()));output.innerHTML=items.length?'<div class="studio-grid">'+items.map(card).join('')+'</div>':mangaHub.loading?'':'<div class="empty">'+(mangaHub.query?'لا توجد نتائج في الأعمال المحمّلة.':'لم تُحمّل أعمال بعد. أعد المحاولة أو افتح المصدر.')+'</div>';$('#manga-hub-status').textContent=mangaHub.message;const more=$('#azora-more');if(more){more.hidden=!mangaHub.next;more.disabled=mangaHub.loading}}
async function browsePrimary(url='https://azorafly.com/series',append=false){if(mangaHub.loading)return;mangaHub.started=true;mangaHub.loading=true;if(!append)mangaHub.pages=[];mangaHub.message='جارٍ تحميل فهرس أزورا…';paintPrimaryHub();try{const data=parseManga(await fetchSource(url));if(!data.works.length)throw Error('لم يعرض المصدر أعمالًا قابلة للاستخراج. يمكنك استخدام الاستيراد البديل أو فتح المصدر.');const ids=data.works.map(work=>upsertWork(work,primarySite).id);mangaHub.ids=[...new Set(append?[...mangaHub.ids,...ids]:ids)];mangaHub.next=data.pages.find(page=>!mangaHub.pages.includes(page))||'';mangaHub.pages.push(url);mangaHub.message='أزورا العربي · '+mangaHub.ids.length+' عمل محمّل · تُفحص الفصول عند فتح العمل';mangaHub.error=false;await save();}catch(error){mangaHub.error=true;mangaHub.message=error.message+' تبقى مكتبتك المحفوظة متاحة.'}finally{mangaHub.loading=false;paintPrimaryHub()}}
const previousPrimaryDetail=detail;
const primaryDetails=new Map();
detail=function(id){previousPrimaryDetail(id);const book=get(id);if(book?.siteId!==primarySite||Date.now()-(book.sourceCheckedAt||0)<300000)return;const status=$('#studioChapters');if(status)status.textContent='جارٍ التحقق من فهرس الفصول…';if(!primaryDetails.has(id))primaryDetails.set(id,(async()=>{const parsed=parseManga(await fetchSource(book.source));if(!parsed.isWork)throw Error('تعذر التحقق من صفحة العمل.');upsertWork(parsed,primarySite);book.sourceCheckedAt=Date.now();book.sourceExpectedChapters=parsed.expectedChapters;book.sourceIndexComplete=parsed.indexComplete;await save()})().finally(()=>primaryDetails.delete(id)));primaryDetails.get(id).then(()=>{if($('#modal')?.open&&$('#modal').querySelector('[data-refresh="'+id+'"]'))previousPrimaryDetail(id)}).catch(error=>{if($('#modal')?.open&&$('#modal').querySelector('[data-refresh="'+id+'"]')&&$('#studioChapters'))$('#studioChapters').textContent=error.message});};
const previousPrimaryRender=render;
render=function(){previousPrimaryRender();if(view!=='catalog')return;$('#page').innerHTML='';$('#page').insertAdjacentHTML('afterbegin','<section class="manga-hub primary-hub"><div class="azora-heading"><div><span class="eyetag">المصدر الأساسي · عربي</span><h2>اكتشف أزورا</h2><p>أعمالك في واجهة واحدة، وفصولها من المصدر مباشرة.</p></div><button id="azora-refresh">↻ تحديث الفهرس</button></div><form id="azora-search" class="azora-search"><input name="title" type="search" aria-label="البحث في أعمال أزورا المحمّلة" placeholder="ابحث في الأعمال المحمّلة…" value="'+esc(mangaHub.query)+'"><button class="primary">بحث</button></form><p role="status" id="manga-hub-status"></p><div id="manga-hub-results"></div><button id="azora-more" hidden>تحميل المزيد</button></section>');paintPrimaryHub();const personal=$('#page > .section-head');if(personal)personal.remove();if(db&&!mangaHub.started){mangaHub.ids=state.books.filter(b=>b.siteId===primarySite).map(b=>b.id);void browsePrimary()}};
document.addEventListener('submit',event=>{if(event.target.id!=='azora-search')return;event.preventDefault();mangaHub.query=new FormData(event.target).get('title').trim();paintPrimaryHub()});
document.addEventListener('input',event=>{if(event.target.matches('#azora-search input')){mangaHub.query=event.target.value.trim();paintPrimaryHub()}});
document.addEventListener('click',event=>{if(event.target.closest('#azora-refresh'))void browsePrimary();if(event.target.closest('#azora-more')&&mangaHub.next)void browsePrimary(mangaHub.next,true)});
const previousPrimarySiteForm=siteForm;
siteForm=function(){previousPrimarySiteForm();$('#siteForm')?.insertAdjacentHTML('beforebegin','<div class="source-choice"><strong>أزورا العربي هو مصدر المانجا الأساسي</strong><p>للروايات والكوميكس، أضف رابط الخلاصة العامة للمصدر الذي تختاره.</p><button data-view="catalog" data-primary-open>تصفح أزورا ←</button></div>')};
document.addEventListener('click',event=>{if(event.target.closest('[data-primary-open]'))$('#modal')?.close()});
window.addEventListener('online',()=>{if(view==='catalog'&&mangaHub.error)void browsePrimary()});
