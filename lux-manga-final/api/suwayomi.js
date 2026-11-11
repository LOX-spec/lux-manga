const mangaFields = 'id title author description genre thumbnailUrl realUrl source { id name lang isNsfw }';
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const integer = value => /^\d+$/.test(String(value || '')) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const blocked = manga => manga.source?.isNsfw || (manga.genre || []).some(tag => /^(hentai|erotica|pornographic)$/i.test(tag.trim()));
const removedSources = new Set(['917436262447415426','335499577904379512']);

function configuration() {
  if (!process.env.SUWAYOMI_URL) return null;
  const url = new URL(process.env.SUWAYOMI_URL);
  const local = !process.env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Invalid engine configuration');
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (process.env.SUWAYOMI_AUTH) headers.Authorization = process.env.SUWAYOMI_AUTH;
  return { origin: url.origin, headers };
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const action = params.get('action') || 'sources';
  if (!['sources', 'browse', 'details', 'pages', 'image'].includes(action)) return json({ error: 'طلب محرك غير صالح.' }, 400);
  try {
    const config = configuration();
    if (!config) return action === 'sources' ? json({ configured: false, sources: [], message: 'محرك Suwayomi غير متصل. يلزم إعداد خادم وتشغيل إضافاته أولًا.' }) : json({ error: 'لم يُضبط خادم Suwayomi بعد.' }, 503);
    const signal = AbortSignal.timeout(25000);
    const allowAdult = params.get('adult') === '1';
    async function graphql(query, variables = {}) {
      const response = await fetch(config.origin + '/api/graphql', { method: 'POST', redirect: 'error', headers: config.headers, body: JSON.stringify({ query, variables }), signal });
      if (!response.ok) {const error=Error('Engine HTTP');error.code=[401,403].includes(response.status)?'ENGINE_AUTH':'ENGINE_UNAVAILABLE';throw error;}
      const result = await response.json();
      if (result.errors?.length || !result.data) {const error=Error('Engine GraphQL failed');const description=(result.errors||[]).map(item=>item.message||'').join(' ');error.code=/cloudflare|403|captcha/i.test(description)?'SOURCE_BLOCKED':['browse','details','pages'].includes(action)?'SOURCE_UNAVAILABLE':'ENGINE_GRAPHQL';throw error;}
      return result.data;
    }
    const permitted = manga => allowAdult || !blocked(manga);
    const fields = '{ ' + mangaFields + ' }';
    if (action === 'sources') {
      const data = await graphql('query { sources { nodes { id name lang isNsfw supportsLatest } } }');
      const sources = data.sources.nodes.filter(source => !removedSources.has(String(source.id)) && source.id !== '0' && source.lang !== 'localsourcelang' && (allowAdult || !source.isNsfw))
        .sort((a, b) => a.name.localeCompare(b.name, 'en'));
      return json({ configured: true, sources });
    }
    if (action === 'browse') {
      const source = params.get('source') || '';
      if(removedSources.has(source))return json({error:'أُزيل هذا المصدر من المكتبة. اختر مصدرًا متاحًا.',code:'SOURCE_REMOVED'},410);
      const page = Number(params.get('page') || 1);
      const type = params.get('type') || 'POPULAR';
      if (!/^-?\d{1,19}$/.test(source) || !Number.isSafeInteger(page) || page < 1 || page > 10000 || !['SEARCH', 'POPULAR', 'LATEST'].includes(type)) return json({ error: 'معاملات المصدر غير صالحة.' }, 400);
      const info = await graphql('query($id:LongString!){ source(id:$id){ id name lang isNsfw } }', { id: source });
      if (!info.source || (!allowAdult && info.source.isNsfw)) return json({ error: 'المصدر محجوب بفلتر المحتوى.' }, 403);
      const data = await graphql('mutation($input:FetchSourceMangaInput!){ fetchSourceManga(input:$input){ hasNextPage mangas ' + fields + ' } }', { input: { source, type, page, query: (params.get('q') || '').trim().slice(0, 150) } });
      return json({ books: data.fetchSourceManga.mangas.filter(permitted).map(mapBook), hasNextPage: data.fetchSourceManga.hasNextPage });
    }
    const id = params.get('id');
    if (!integer(id)) return json({ error: 'معرّف غير صالح.' }, 400);
    if (action === 'details') {
      const data = await graphql('mutation($input:FetchMangaAndChaptersInput!){ fetchMangaAndChapters(input:$input){ manga ' + fields + ' chapters { id name chapterNumber realUrl } } }', { input: { id: Number(id), fetchManga: true, fetchChapters: true } });
      const result = data.fetchMangaAndChapters;
      if (!permitted(result.manga)) return json({ error: 'العمل محجوب بفلتر المحتوى.' }, 403);
      const book = mapBook(result.manga);
      book.chapters = result.chapters.map(chapter => ({ url: safeLink(chapter.realUrl) || new URL('/?view=catalog&suwayomi=' + id + '&chapter=' + chapter.id, request.url).href,
        engine: 'suwayomi', engineId: chapter.id, number: chapter.chapterNumber, title: chapter.name, language: result.manga.source.lang, images: [] }));
      book.verifiedLanguages = book.chapters.length ? [result.manga.source.lang] : [];
      return json({ book });
    }
    const cover = action === 'image' && params.get('kind') === 'cover';
    const info = cover
      ? await graphql('query($id:Int!){ manga(id:$id)' + fields + ' }', { id: Number(id) })
      : await graphql('query($id:Int!){ chapter(id:$id){ mangaId sourceOrder pageCount manga ' + fields + ' } }', { id: Number(id) });
    const manga = cover ? info.manga : info.chapter?.manga;
    if (!manga || !permitted(manga)) return json({ error: 'العمل غير متاح أو محجوب بفلتر المحتوى.' }, 403);
    if (action === 'pages') {
      const data = await graphql('mutation($input:FetchChapterPagesInput!){ fetchChapterPages(input:$input){ pages } }', { input: { chapterId: Number(id) } });
      return json({ images: data.fetchChapterPages.pages.map((_, index) => imageUrl('page', id, index, allowAdult)) });
    }
    const page = Number(params.get('page'));
    if (!cover && (!Number.isInteger(page) || page < 0 || page >= info.chapter.pageCount)) return json({ error: 'صفحة غير صالحة.' }, 400);
    const path = cover ? '/api/v1/manga/' + id + '/thumbnail' : '/api/v1/manga/' + info.chapter.mangaId + '/chapter/' + info.chapter.sourceOrder + '/page/' + page;
    const image = await fetch(config.origin + path, { headers: config.headers, signal, redirect: 'error' });
    if (!image.ok || !/^image\//i.test(image.headers.get('content-type') || '')) { await image.body?.cancel();const error=Error('Image unavailable');error.code='IMAGE_UNAVAILABLE';throw error; }
    return new Response(image.body, { headers: { 'Content-Type': image.headers.get('content-type'), 'Cache-Control': 'private,max-age=300', 'X-Content-Type-Options': 'nosniff' } });
    function mapBook(item) {
      return { engine: 'suwayomi', engineId: item.id, engineSource: String(item.source.id), isNsfw: !!item.source.isNsfw,
        url: safeLink(item.realUrl) || new URL('/?view=catalog&suwayomi=' + item.id, request.url).href, title: item.title, author: item.author || '', description: item.description || '',
        genres: item.genre || [], kind: (item.genre || []).some(tag => /webtoon|manhwa|long strip/i.test(tag)) ? 'مانهوا' : 'مانجا',
        cover: imageUrl('cover', item.id, 0, allowAdult), chapters: [] };
    }
  } catch(error) {const code=error.name==='TimeoutError'?'ENGINE_TIMEOUT':error.code||'ENGINE_UNAVAILABLE';const messages={SOURCE_BLOCKED:'المصدر يطلب تحقق حماية Cloudflare. جرّب مصدرًا آخر أو الاستيراد من كود الصفحة؛ خادم المكتبة يعمل.',SOURCE_UNAVAILABLE:'تعذر جلب بيانات هذا المصدر. قد يكون متوقفًا أو يحتاج تحديث إضافته. جرّب مصدرًا آخر.',ENGINE_AUTH:'تعذر توثيق اتصال خادم المكتبة. يلزم مراجعة إعدادات الاتصال.',ENGINE_GRAPHQL:'إصدار خادم المكتبة لا يدعم هذا الطلب.',ENGINE_TIMEOUT:'انتهت مهلة الاتصال. أعد المحاولة أو اختر مصدرًا آخر.',IMAGE_UNAVAILABLE:'تعذر تحميل هذه الصورة من المصدر. أعد المحاولة.',ENGINE_UNAVAILABLE:'خادم المكتبة غير متاح مؤقتًا. أعد المحاولة لاحقًا.'};return json({error:messages[code]||messages.ENGINE_UNAVAILABLE,code},code==='ENGINE_TIMEOUT'?504:502); }
}
function safeLink(value) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } }
const imageUrl = (kind, id, page, adult) => '/api/suwayomi?' + new URLSearchParams({ action: 'image', kind, id, page, adult: adult ? '1' : '0' });
