import { fetchPublic } from './public-fetch.js';
import { alternatives, challenge } from './source-fallback.js';

const limit = 4 * 1024 * 1024;
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: jsonHeaders });

export function publicURL(input) {
  const url = new URL(input);
  url.hostname = url.hostname.replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(':') ||
      /\.(localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname)) {
    throw new Error('استخدم رابط HTTPS عامًا صالحًا.');
  }
  url.hash = '';
  return url;
}

async function remote(input, accept, timeout = 18000) {
  let url = publicURL(input);
  const signal = AbortSignal.timeout(timeout);
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetchPublic(url, { accept, signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('إعادة توجيه غير صالحة.');
      const next = new URL(location, url);
      if (next.protocol === 'http:' && next.hostname === url.hostname) next.protocol = 'https:';
      url = publicURL(next.href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      const error = new Error('المصدر أعاد حالة ' + response.status);
      error.upstreamStatus = response.status;
      error.retryAfter = response.headers.get('retry-after');
      throw error;
    }
    return { response, url: url.href, signal };
  }
  throw new Error('إعادة توجيه متكررة.');
}

async function bytes(response, signal, maxBytes = limit) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('الملف أكبر من حد الجلب المسموح ('+(maxBytes/1048576)+' ميغابايت).');
      parts.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw signal.aborted ? signal.reason : error;
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts, size);
}

function sitemapContent(content) {
  if (!/<(?:sitemapindex|urlset)[\s>]/i.test(content)) return content;
  const index = /<sitemapindex[\s>]/i.test(content);
  const root = index ? 'sitemapindex' : 'urlset';
  const child = index ? 'sitemap' : 'url';
  const links = [...content.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(([, value]) =>
    value.replace('<![CDATA[', '').replace(']]>', '').trim()
      .replace(/&amp;/g, '&').replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  return '<' + root + '>' + links.map(link =>
    '<' + child + '><loc>' + link + '</loc></' + child + '>').join('') + '</' + root + '>';
}

export async function source(request) {
  if (request.method !== 'POST') return json({ error: 'الطريقة غير مدعومة' }, 405);
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error('الرابط طويل جدًا');
    const options = JSON.parse(body);
    const input = publicURL(options.url).href;
    let result;
    try { result = await remote(input,
      'text/html,application/xhtml+xml,application/xml,application/json,text/xml,text/plain;q=0.8');
      const content = new TextDecoder().decode(await bytes(result.response, result.signal));
      if (challenge(content)) { const error = new Error('المصدر يعرض صفحة حماية'); error.upstreamStatus = 403; throw error; }
      result.response = new Response(content, {headers: result.response.headers});
    } catch (error) {
      if (options.feedOnly || ![403,503].includes(error.upstreamStatus)) throw error;
      const deadline = Date.now() + 24000;
      for (const candidate of alternatives(input)) {
        if (Date.now() >= deadline) break;
        try {
          const fetched = await remote(candidate.url, 'text/html,application/xml,application/json,text/plain', Math.min(4500, deadline - Date.now()));
          const content = new TextDecoder().decode(await bytes(fetched.response, fetched.signal));
          if (challenge(content) || content.length < 80) continue;
          const type = candidate.method === 'jina' ? 'text/plain' : fetched.response.headers.get('content-type');
          if (candidate.method === 'jina' && !/https?:\/\/|<html/i.test(content)) continue;
          return json({url: candidate.method === 'feed' ? candidate.url : input, type, content, method: candidate.method});
        } catch { /* Try the next public transport, preserving the original failure. */ }
      }
      error.message = 'تعذّر الوصول إلى المصدر المحمي. استخدم استيراد HTML أو RSS أو إضافة عمل سريعة.';
      throw error;
    }
    const {response, url, signal} = result;
    const type = response.headers.get('content-type') || '';
    if (!/html|xml|application\/(?:[a-z.+-]*\+)?json\b/i.test(type) && !(new URL(url).pathname === '/robots.txt' && /text\/plain/i.test(type))) {
      await response.body?.cancel();
      throw new Error('المصدر لا يعرض صفحة محتوى قابلة للفحص');
    }
    const content = new TextDecoder().decode(await bytes(response, signal));
    if (/application\/(?:[a-z.+-]*\+)?json\b/i.test(type)) JSON.parse(content);
    if (/<title[^>]*>\s*(?:just a moment|attention required|access denied)/i.test(content) ||
        (/cf-chl-|challenge-platform/.test(content) && content.length < 20000)) {
      const error = new Error('المصدر يعرض صفحة حماية بدل المحتوى');
      error.upstreamStatus = 403;
      throw error;
    }
    const payload = JSON.stringify({ url, type, content: sitemapContent(content) });
    if (Buffer.byteLength(payload) > limit) throw new Error('محتوى الصفحة أكبر من حد الجلب المسموح (4 ميغابايت).');
    return new Response(payload, { headers: jsonHeaders });
  } catch (error) {
    return json({
      error: error.name === 'TimeoutError' ? 'انتهت مهلة الموقع؛ حاول مرة أخرى.' : error.message || 'تعذر الاتصال بالمصدر',
      upstreamStatus: error.upstreamStatus || 0,
      retryAfter: error.retryAfter || null,
      temporary: error.name === 'TimeoutError' || [408, 425, 429, 500, 502, 503, 504].includes(error.upstreamStatus)
    }, 400);
  }
}

export async function image(request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const url = new URL(request.url);
    const input=publicURL(url.searchParams.get('url')).href;
    let result;
    const target = new URL(input);
    if (target.hostname === 'uploads.mangadex.org' && target.pathname.startsWith('/covers/')) {
      const signal = AbortSignal.timeout(12000);
      const response = await fetch(target, { signal, redirect: 'error' });
      if (!response.ok) { await response.body?.cancel(); throw Error('تعذر تحميل غلاف MangaDex.'); }
      result = { response, signal };
    }
    try {result ??= await remote(input,'image/avif,image/webp,image/png,image/jpeg,image/gif');}
    catch(error){
      if(![403,503].includes(error.upstreamStatus))throw error;
      for(const candidate of alternatives(input).filter(route=>['corsproxy','allorigins'].includes(route.method))){
        try{const next=await remote(candidate.url,'image/avif,image/webp,image/png,image/jpeg,image/gif',4500);
          if(!/^image\/(avif|webp|png|jpeg|gif)(?:;|$)/.test(next.response.headers.get('content-type')||'')){await next.response.body?.cancel();continue;}result=next;break;
        }catch{ /* Leave a useful source-link error if all image transports fail. */ }
      }
      if(!result)throw error;
    }
    const type = result.response.headers.get('content-type')?.split(';')[0] || '';
    if (!/^image\/(avif|webp|png|jpeg|gif)$/.test(type)) {
      await result.response.body?.cancel();
      throw new Error('المصدر لم يرسل صورة مدعومة');
    }
    const data = await bytes(result.response, result.signal, 20 * 1024 * 1024);
    return new Response(data, { headers: {
      'Content-Type': type, 'Content-Length': String(data.length),
      'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff'
    } });
  } catch (error) {
    return json({ error: error.message || 'تعذر تحميل الصورة' }, 400);
  }
}

