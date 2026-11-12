/* Public-source recovery and local, inert HTML imports. */
function cleanSourceInput(value) {
  const text = String(value).replace(/&amp;/g, '&').replace(/[\u200b-\u200f\u202a-\u202e]/g, '');
  const match = text.match(/https?:\/\/[^\s<>"'\[\]()]+/i) || text.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'()]*)?/i);
  if (!match) throw Error('لم أجد رابط موقع صالحًا في النص.');
  let raw = match[0].replace(/[)،,.؛]+$/, '').split(/(?<=.)https?:\/\//i)[0];
  const nested = raw.search(/https?:\/\//i);
  if (nested < 0) raw = 'https://' + raw;
  const url = new URL(raw); url.protocol = 'https:';
  if (url.username || url.password || url.port) throw Error('استخدم رابط موقع عامًا.');
  return url.href;
}
const smartPreviousParser = parseManga;
parseManga = function(data) {
  let content = data.content;
  if (/^\s*\[/.test(content)) {
    try { const entries = JSON.parse(content); content = '<div>' + entries.map(item => `<article class="manga-card"><h3><a href="${esc(safeLink(item.link,data.url))}">${esc(item.title?.rendered?.replace(/<[^>]+>/g,''))}</a></h3></article>`).join('') + '</div>'; } catch {}
  }
  const feed = new DOMParser().parseFromString(content,'application/xml');
  const entries = [...feed.querySelectorAll('rss channel item,feed > entry')];
  if (entries.length) content = '<div>' + entries.map(item => {
    const link = item.querySelector('link')?.getAttribute('href') || item.querySelector('link')?.textContent;
    return `<article class="manga-card"><h3><a href="${esc(safeLink(link,data.url))}">${esc(item.querySelector('title')?.textContent || 'عمل من الخلاصة')}</a></h3></article>`;
  }).join('') + '</div>';
  if (data.method === 'jina' && !/<html|<a\s/i.test(content)) content = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)].map(([,title,url])=>`<article class="manga-card"><h3><a href="${esc(safeLink(url,data.url))}">${esc(title)}</a></h3></article>`).join('');
  return smartPreviousParser({...data,content});
};
const smartSiteForm = siteForm;
siteForm = function() {
  smartSiteForm();
  $('#siteForm').insertAdjacentHTML('afterend', `<details id="smartImport"><summary>استيراد بديل · HTML / RSS / عمل سريع</summary><p class="note">للصفحات المتاحة لك: الصق المصدر أو ارفع ملف HTML دون تشغيل سكربتاته. الحماية الكاملة قد تتطلب الاستيراد المحلي.</p><form id="smartForm" class="form"><label>رفع صفحة HTML<input name="htmlFile" type="file" accept=".html,.htm,text/html"></label><label>HTML الصفحة<textarea name="html" rows="7" maxlength="4000000" placeholder="الصق HTML هنا"></textarea></label><label>أو رابط RSS<input name="rss" type="url" dir="ltr"></label><label>عنوان العمل للإضافة السريعة<input name="title"></label><label>رابط الغلاف<input name="cover" type="url" dir="ltr"></label><label>رفع صور فصل محلي<input name="pageFiles" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><label>روابط صور الفصل، رابط في كل سطر<textarea name="images" rows="4" dir="ltr"></textarea></label><button class="primary">حفظ الاستيراد البديل</button></form><p id="smartError" role="status"></p></details>`);
};
const smartAddSite = addSite;
addSite = async function(value) {
  try { const url=cleanSourceInput(value); await fetchSource(url); return await smartAddSite(url); }
  catch(error) { if ($('#smartImport')) $('#smartImport').open = true; throw error; }
};
document.addEventListener('submit', async event => {
  if (event.target.id !== 'smartForm') return;
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try {
    const form = new FormData(event.target), url = cleanSourceInput($('#sourceURL').value);
    const site = state.sites.find(site=>site.url===new URL(url).origin+'/') || {id:'s'+crypto.randomUUID(),url:new URL(url).origin+'/',entryUrl:url,name:new URL(url).hostname,contentType:$('#sourceType').value === 'auto'?'manga':$('#sourceType').value,queue:[],seen:[],done:0,failed:[],status:'partial'};
    let parsed, html=form.get('html').trim();
    const htmlFile=form.get('htmlFile');
    if(htmlFile?.size){if(htmlFile.size>4000000)throw Error('حجم HTML الأقصى 4 ميغابايت.');html=await htmlFile.text();}
    if (html || form.get('rss').trim()) parsed = parseManga(html ? {url,content:html} : await fetchSource(cleanSourceInput(form.get('rss'))));
    else {
      if (!form.get('title').trim()) throw Error('أدخل HTML أو RSS أو عنوان عمل.');
      const images = form.get('images').split(/\r?\n/).map(value=>safeLink(value,url)).filter(Boolean);
      const files=form.getAll('pageFiles').filter(file=>file.size);
      if(files.reduce((sum,file)=>sum+file.size,0)>12*1024*1024)throw Error('حجم صور الفصل الأقصى 12 ميغابايت.');
      for(const file of files){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('استخدم صور PNG أو JPEG أو WebP.');images.push(await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('تعذرت قراءة الصورة'));reader.readAsDataURL(file);}));}
      parsed = {url,isWork:true,title:form.get('title').trim(),cover:safeLink(form.get('cover'),url),kind:'مانجا',genres:[],chapters:images.length?[{url:url+'#local-chapter',title:'فصل مستورد محليًا',number:1,images}]:[],works:[],pages:[],description:'إضافة محلية من المستخدم'};
    }
    if (!parsed.isWork && !parsed.works?.length && !parsed.chapters?.length) throw Error('لم أجد عملًا أو فصولًا في المحتوى؛ جرّب HTML صفحة تفاصيل العمل.');
    if (!state.sites.includes(site)) state.sites.push(site);
    if (parsed.isWork || parsed.chapters.length) upsertWork(parsed,site.id); else applyCatalog(site,parsed);
    if (!await save()) throw Error('تعذر حفظ المكتبة.');
    $('#modal').close(); go('sites'); toast('حُفظ المحتوى المستورد؛ افحص الروابط المتاحة من مصادرك.');
  } catch(error) { $('#smartError').textContent = error.message; } finally {button.disabled=false;}
});
const smartRender = render;
render = function() {
 if (state.preferences?.mangaSamplesVersion !== 2) {
  state.preferences ??= {};
  const hadSamples=state.books.some(book=>book.siteId==='local-samples');
  if(hadSamples||!state.books.some(book=>mediaOf(book)==='manga')){
   for(const sample of LuxMangaSamples.books(location.origin)){const existing=state.books.find(book=>book.id===sample.id);if(existing)Object.assign(existing,sample);else state.books.push(sample);}
  }
  state.preferences.mangaSamplesInitialized=true;state.preferences.mangaSamplesVersion=2;
  save();
 }
 return smartRender();
};
