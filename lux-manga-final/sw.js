const SHELL='lux-shell-v40',PAGES='lux-pages-v1',COVERS='lux-novel-covers-v1';
const ART='lux-published-art-v1';
let artWrites=Promise.resolve();
const SAMPLE_PAGE_URLS = [];
const SAMPLE_COVER_URLS = [];
const COVER_FALLBACK='/novel-cover-fallback.svg';
const FILES=['/',COVER_FALLBACK,...SAMPLE_COVER_URLS,'/novels-demo.js','/novels-view.js','/novels-view.css','/novel-reader.js','/novel-reader.css','/style.css','/studio.css','/install.css','/app.js','/import.js','/audit.js','/settings.js','/features.js','/experience.js','/media.js','/discovery.js','/scanner.js','/source-delete.js','/collections.js','/studio.js','/install.js','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
const NOVEL_ASSETS = ['/novel-admin.js', '/novel-admin.css', '/novel-publications.js', '/novel-pages.js',
  '/novel-page-runtime.js', '/novel-details-controls.js', '/sample-reader-controls.js',
  '/landscape-engine.js', '/library-refresh.js', '/cosmic-engine.js', '/auto-update.js', '/app-bootstrap.js', '/routing.js', '/manifest.json', '/comicverse-data.js', '/comicverse-source.js', '/comics-model.js', '/comics-hub.js', '/smart-import.js', '/automatic-sources.js', '/manga-hub.js', '/comfort-reader.js', '/manga-samples.js', '/universal-backup.js', ...Array.from({length:6},(_,i)=>['/manga-sample-'+(i+1)+'-cover.svg', ...Array.from({length:3},(_,j)=>Array.from({length:3},(_,k)=>'/manga-sample-'+(i+1)+'-'+(j+1)+'-'+(k+1)+'.svg')).flat()]).flat(), '/comics-view.css', '/polish.css', '/chapter-links.js', '/appearance.css', '/interface-repairs.js', '/font-preferences.js','/ux-shell.js','/ux-shell.css', '/ambient-ui.js', '/ambient-ui.css','/thmanyah-font.css','/thmanyahsans-Bold.otf'];
const NOVEL_SHELLS = ['/?view=novel', '/?view=reader'];
// Cache an entire matching shell. Login pages must never replace the application.
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(SHELL);
  const paths=[...new Set([...FILES, ...NOVEL_ASSETS, ...NOVEL_SHELLS, ...SAMPLE_PAGE_URLS])];
  async function cacheAsset(path){
    const requestPath = path.startsWith('/?view=novel') || path.startsWith('/?view=reader')
      ? '/api/page' + path.slice(1) : path;
    const response = await fetch(new Request(requestPath, { cache: 'reload' }));
    if (!response.ok || response.redirected) throw Error('App shell unavailable');
    if (path === '/' && !(await response.clone().text()).includes('class="studio"')) {
      throw Error('Authentication required');
    }
    if (path.startsWith('/?view=reader&') && !(await response.clone().text()).includes('id="reader-content"')) {
      throw Error('Sample reader page unavailable');
    }
    if (path.startsWith('/?view=novel&') && !(await response.clone().text()).includes('id="novel-details"')) {
      throw Error('Sample novel details unavailable');
    }
    if (NOVEL_SHELLS.includes(path) && !(await response.clone().text()).includes('/novel-page-runtime.js')) {
      throw Error('Novel page shell unavailable');
    }
    await cache.put(path, response);
  }
  let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<paths.length)await cacheAsset(paths[next++]);}));
  if(!self.registration?.active)await self.skipWaiting();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('lux-shell-')&&key!==SHELL)await caches.delete(key);await self.clients.claim()})()));
async function novelCoverResponse(request) {
  const covers = await caches.open(COVERS).catch(() => null);
  const cached = await covers?.match(request).catch(() => null);
  if (cached) return cached;

  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(4500) });
    if (response.ok && /^image\//i.test(response.headers.get('Content-Type') || '')) {
      const size = Number(response.headers.get('Content-Length'));
      if (covers && size > 0 && size <= 1536 * 1024) {
        try {
          await covers.put(request, response.clone());
          const entries = await covers.keys();
          await Promise.all(entries.slice(0, Math.max(0, entries.length - 48)).map(entry => covers.delete(entry)));
        } catch {
          // A full cache must not prevent display of a valid cover.
        }
      }
      return response;
    }
  } catch {
    // Offline, timed out, or source unavailable. Use the bundled artwork.
  }
  const shell = await caches.open(SHELL);
  return await shell.match(COVER_FALLBACK) || Response.error();
}

async function publishedArt(request, event) {
  const cache = await caches.open(ART);
  const saved = await cache.match(request);
  if (saved) return saved;
  try {
    const response = await fetch(request);
    if (!response.ok && response.type !== 'opaque') throw Error('Image unavailable');
    const copy = response.clone();
    const save = artWrites.then(async () => {
      await cache.put(request, copy);
      const entries = await cache.keys();
      await Promise.all(entries.slice(0, Math.max(0, entries.length - 64)).map(entry => cache.delete(entry)));
    }).catch(() => {});
    artWrites = save;
    event.waitUntil(save);
    return response;
  } catch {
    return await (await caches.open(SHELL)).match(COVER_FALLBACK) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    if (event.request.destination === 'image' && /^https?:$/.test(url.protocol)) {
      event.respondWith(publishedArt(event.request, event));
    }
    return;
  }
  const novelView = novelPageView(url);
  if (novelView) {
    const sampleKey = samplePagePath(url);
    const key = SAMPLE_PAGE_URLS.includes(sampleKey) ? sampleKey : '/?view=' + novelView;
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      return await cache.match(key) || fetch(event.request);
    })());
    return;
  }
  if (url.pathname === '/api/image') {
    if (url.searchParams.get('kind') === 'cover') {
      event.respondWith(novelCoverResponse(event.request));
    } else {
      event.respondWith((async () => {
        const cache = await caches.open(PAGES);
        return await cache.match(event.request) || fetch(event.request);
      })());
    }
    return;
  }
  if (FILES.includes(url.pathname) || NOVEL_ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      return await cache.match(url.pathname) || fetch(event.request);
    })());
    return;
  }
  if (event.request.mode === 'navigate' && !url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      return await cache.match('/') || fetch(event.request);
    })());
    return;
  }
  if (event.request.destination === 'image') {
    event.respondWith(publishedArt(event.request, event));
  }
});
