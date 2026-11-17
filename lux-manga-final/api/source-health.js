const targets=Object.freeze({toonarab:'https://toonarab.com/',mangaarabia:'https://www.mangaarabia.com/'});
export function createChecker(transport=fetch){return async request=>{
 const key=new URL(request.url).searchParams.get('source'),url=targets[key];
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
 if(request.method!=='GET')return reply({error:'الطريقة غير مدعومة'},405);
 if(!Object.hasOwn(targets,key))return reply({error:'مصدر غير مدعوم'},400);
 try{const r=await transport(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Accept:'text/html','User-Agent':'LUX-Library/7.1 Source availability check'}});await r.body?.cancel();return reply({source:key,status:r.status,reachable:r.ok,mode:'external',checkedAt:new Date().toISOString(),message:r.ok?'الموقع يستجيب. القراءة تتم في موقع المصدر؛ هذا الفحص لا يثبت استيراد الفصول.':[401,403,429].includes(r.status)?'المصدر يمنع الفحص الآلي أو يطلب التريث. افتحه مباشرة؛ لن نحاول تجاوز الحماية.':'تعذر تأكيد الاتصال (HTTP '+r.status+'). افتح المصدر مباشرة.'});}
 catch{return reply({source:key,reachable:false,mode:'external',message:'لم يكتمل فحص الاتصال. جرّب فتح المصدر مباشرة.'});}
};}
export const GET=createChecker();
