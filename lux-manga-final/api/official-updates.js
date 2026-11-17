const origin='https://www.mangaarabia.com';
const decode=value=>String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&');
export function parseUpdates(xml){
 if(!/<rss[\s>]/i.test(xml))throw Error('لم يعد المصدر خلاصة RSS صالحة.');
 const seen=new Set(),items=[];
 for(const match of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)){
 const block=match[1],field=name=>decode(block.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]).trim();
 const title=field('title').replace(/<[^>]*>/g,'').slice(0,200),link=field('link');let u;try{u=new URL(link);}catch{continue;}
 if(u.origin!==origin||!/^\/ar\/node\/\d+$/.test(u.pathname)||!title||seen.has(u.href))continue;
 seen.add(u.href);items.push({title,url:u.href,date:field('pubDate'),reading:'external'});if(items.length>=30)break;
 }return items;
}
export function createUpdates(transport=fetch){return async request=>{
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
 if(request.method!=='GET')return reply({error:'الطريقة غير مدعومة'},405);
 try{const r=await transport(origin+'/rss.xml',{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'application/rss+xml,application/xml'}});if(!r.ok){await r.body?.cancel();return reply({error:'تعذر جلب الخلاصة الرسمية (HTTP '+r.status+'). لم تتم إعادة المحاولة.',upstreamStatus:r.status},502);}
 let size=0,text='';const reader=r.body.getReader(),decoder=new TextDecoder();try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1048576)throw Error('الخلاصة تتجاوز الحجم المسموح.');text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
 const items=parseUpdates(text);if(!items.length)throw Error('لا توجد تحديثات صالحة في الخلاصة.');return reply({source:'مانجا العربية',feed:origin+'/rss.xml',scope:'latest-only',reading:'external',items});
 }catch{return reply({error:'تعذر قراءة الخلاصة الرسمية الآن. يمكنك فتح المصدر مباشرة.'},502);}
};}
export const GET=createUpdates();
