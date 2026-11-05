import { fetchPublic } from './public-fetch.js';

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

async function remote(input, accept) {
  let url = publicURL(input);
  const signal = AbortSignal.timeout(18000);
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

async function bytes(response, signal) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('الملف أكبر من حد الجلب المسموح (4 ميغابايت).');
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
    const { response, url, signal } = await remote(JSON.parse(body).url,
      'text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.8');
    const type = response.headers.get('content-type') || '';
    if (!/html|xml/i.test(type) && !(new URL(url).pathname === '/robots.txt' && /text\/plain/i.test(type))) {
      await response.body?.cancel();
      throw new Error('المصدر لا يعرض صفحة محتوى قابلة للفحص');
    }
    const content = new TextDecoder().decode(await bytes(response, signal));
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
    const result = await remote(url.searchParams.get('url'), 'image/avif,image/webp,image/png,image/jpeg,image/gif');
    const type = result.response.headers.get('content-type')?.split(';')[0] || '';
    if (!/^image\/(avif|webp|png|jpeg|gif)$/.test(type)) {
      await result.response.body?.cancel();
      throw new Error('المصدر لم يرسل صورة مدعومة');
    }
    const data = await bytes(result.response, result.signal);
    return new Response(data, { headers: {
      'Content-Type': type, 'Content-Length': String(data.length),
      'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff'
    } });
  } catch (error) {
    return json({ error: error.message || 'تعذر تحميل الصورة' }, 400);
  }
}

