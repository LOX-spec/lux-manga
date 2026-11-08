import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { GET as page, HEAD as pageHead } from '../api/page.js';
import { POST as source } from '../api/source.js';
import { GET as image } from '../api/image.js';
import { GET as mangadex } from '../api/mangadex.js';
import { GET as suwayomi } from '../api/suwayomi.js';
import { GET as comick } from '../api/comick.js';
import { normalizeRoute } from '../routing.js';

const port = Number(process.env.PORT || 4173);
const origin = 'http://127.0.0.1:' + port;
const root = resolve('public-build');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.otf': 'font/otf',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8'
};

async function handle(request) {
  const { pathname } = new URL(request.url);
  const normalized = normalizeRoute(request.url);
  if (pathname === '/' || pathname === '/index.html') {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const body = request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(resolve(root, 'index.html')));
    return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
  }
  if (pathname === '/api/page' || normalized.pathname === '/') {
    if (request.method === 'GET') return page(request);
    if (request.method === 'HEAD') return pageHead(request);
    return new Response('Method not allowed', { status: 405 });
  }
  if (pathname === '/api/source') return source(request);
  if (pathname === '/api/image') return image(request);
  if (pathname === '/api/mangadex' && request.method === 'GET') return mangadex(request);
  if (pathname === '/api/suwayomi' && request.method === 'GET') {
    if(process.env.LUX_LIVE_PREVIEW === '1') {
      const response=await fetch('https://lux-manga-4b3b.vercel.app/api/suwayomi' + new URL(request.url).search);
      const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');
      return new Response(response.body,{status:response.status,headers});
    }
    return suwayomi(request);
  }
  if (pathname === '/api/comick' && request.method === 'GET') return comick(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const file = resolve(root, '.' + decodeURIComponent(pathname));
  const info = file.startsWith(root + sep) && await stat(file).catch(() => null);
  if (!info?.isFile()) {
    if (!pathname.startsWith('/api/') && !extname(pathname)) return page(request);
    return new Response('Not found', { status: 404 });
  }
  const body = request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(file));
  return new Response(body, { headers: {
    'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  } });
}

createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method;
    const request = new Request(origin + incoming.url, {
      method, headers: incoming.headers,
      ...(['GET', 'HEAD'].includes(method) ? {} : { body: Readable.toWeb(incoming), duplex: 'half' })
    });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch (error) {
    console.error(error);
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end('Preview request failed');
  }
}).listen(port, '127.0.0.1', () => console.log('Lux: ' + origin));
