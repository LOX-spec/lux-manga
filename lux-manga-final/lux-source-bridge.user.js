// ==UserScript==
// @name LUX optional public-source bridge
// @namespace lux-library
// @version 1.0
// @match https://lux-manga-4b3b.vercel.app/*
// @grant GM.xmlHttpRequest
// @grant GM.registerMenuCommand
// @connect example.com
// ==/UserScript==
// Replace example.com above AND below with the source domain you explicitly authorize.
(()=>{'use strict';const allowed='example.com';GM.registerMenuCommand('جلب صفحة عامة إلى لوكس',()=>{const value=prompt('رابط HTTPS عام من '+allowed);if(!value)return;let u;try{u=new URL(value)}catch{return alert('رابط غير صالح');}if(u.protocol!=='https:'||u.hostname!==allowed||u.username||u.password||u.port)return alert('النطاق غير مسموح');if(!confirm('قراءة هذه الصفحة العامة دون ملفات ارتباط؟ '+u.href))return;GM.xmlHttpRequest({method:'GET',url:u.href,anonymous:true,timeout:15000,onload:r=>{if(r.status!==200)return alert('توقف الطلب: HTTP '+r.status);if(new URL(r.finalUrl||u.href).hostname!==allowed)return alert('إعادة توجيه إلى نطاق غير مسموح');if(r.responseText.length>2000000)return alert('الصفحة كبيرة');const blob=new Blob([r.responseText],{type:'text/plain'}),link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='lux-source.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);alert('استورد الملف من الاستيراد البديل في لوكس؛ لن تُشغل سكربتاته.');},onerror:()=>alert('تعذر الاتصال'),ontimeout:()=>alert('انتهت المهلة')});});})();
