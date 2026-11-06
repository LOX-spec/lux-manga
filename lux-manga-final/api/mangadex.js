const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const api = 'https://api.mangadex.org';
const ratings = [['contentRating[]', 'safe'], ['contentRating[]', 'suggestive']];
const pageSize = 50;
const windowLimit = 10000;
const languageNames = new Intl.DisplayNames(['ar'], { type: 'language' });

async function requestDex(path, params, signal) {
  const response = await fetch(api + path + (params ? '?' + new URLSearchParams(params) : ''), {
    signal, redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'LuxManga/4.4' }
  });
  if (!response.ok) throw Object.assign(new Error('MangaDex HTTP ' + response.status), { status: response.status });
  return response.json();
}

function chapter(item) {
  const a = item.attributes;
  return {
    url: 'https://mangadex.org/chapter/' + item.id,
    number: Number(a.chapter) || 0,
    title: [a.chapter ? 'الفصل ' + a.chapter : 'فصل خاص', a.title, chapterLanguage(a.translatedLanguage)].filter(Boolean).join(' · '),
    published: a.publishAt, language: a.translatedLanguage, images: []
  };
}
function chapterLanguage(code) {
  if (code === 'ar') return 'عربي';
  try { return code ? languageNames.of(code) : ''; } catch { return code; }
}
const readable = item => uuid.test(item.id) && item.attributes?.pages > 0 && !item.attributes.externalUrl && !item.attributes.isUnavailable;
const localized = value => value?.ar || value?.en || Object.values(value || {})[0] || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'latest';
  const id = searchParams.get('id') || '';
  const arabic = searchParams.get('language') === 'ar';
  const selectedLanguages = arabic ? [['translatedLanguage[]', 'ar']] : [];
  const original = searchParams.get('type');
  const origins = ['ja', 'ko'].includes(original) ? [original] : ['ja', 'ko', 'zh', 'zh-hk'];
  if (!['latest', 'catalog', 'popular', 'rated', 'search', 'chapters', 'pages'].includes(action) || (['chapters','pages'].includes(action) && !uuid.test(id))) {
    return Response.json({ error: 'طلب MangaDex غير صالح.' }, { status: 400 });
  }
  const signal = AbortSignal.timeout(12000);
  try {
    let result;
    if (action === 'pages') {
      const data = await requestDex('/at-home/server/' + id, [['forcePort443', 'true']], signal);
      const base = new URL(data.baseUrl);
      if (base.protocol !== 'https:' || base.username || base.password || base.port) throw Error('Invalid image host');
      const { data: full, dataSaver, hash } = data.chapter;
      const useSaver = searchParams.get('quality') === 'saver' && dataSaver?.length > 0 &&
        (!full?.length || dataSaver.length === full.length);
      const files = useSaver || !full?.length ? dataSaver : full;
      const folder = files === full ? 'data' : 'data-saver';
      if (!files?.length || !hash) throw Error('Chapter has no page manifest');
      result = { images: files.map(file => base.href.replace(/\/$/, '') + '/' + folder + '/' + encodeURIComponent(hash) + '/' + encodeURIComponent(file)) };
    } else if (action === 'chapters') {
      const offset = Number(searchParams.get('offset') || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 9900) return Response.json({ error: 'صفحة غير صالحة.' }, { status: 400 });
      const data = await requestDex('/manga/' + id + '/feed', [...selectedLanguages, ...ratings, ['limit', 100], ['offset', offset], ['order[chapter]', 'desc']], signal);
      result = { chapters: data.data.filter(readable).map(chapter), next: offset + data.data.length < data.total && data.data.length && offset + data.data.length <= 9900 ? offset + data.data.length : null };
    } else if (action !== 'latest') {
      const title = (searchParams.get('q') || '').trim().slice(0, 150);
      const offset = Number(searchParams.get('offset') || 0);
      const since = searchParams.get('since') || '';
      if (!Number.isInteger(offset) || offset < 0 || offset >= windowLimit ||
          (since && (action !== 'catalog' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(since) || !Number.isFinite(Date.parse(since + 'Z'))))) {
        return Response.json({ error: 'صفحة غير صالحة.' }, { status: 400 });
      }
      if (action === 'search' && !title) return Response.json({ books: [], next: null, total: 0 });
      const order = { catalog: 'createdAt', search: 'relevance', popular: 'followedCount', rated: 'rating' }[action];
      const data = await requestDex('/manga', [
        ['limit', Math.min(pageSize, windowLimit - offset)], ['offset', offset], ...ratings, ['includes[]', 'cover_art'],
        ...(arabic ? [['availableTranslatedLanguage[]', 'ar']] : []),
        ...origins.map(lang => ['originalLanguage[]', lang]),
        ['order[' + order + ']', action === 'catalog' ? 'asc' : 'desc'],
        ...(action === 'search' ? [['title', title]] : []),
        ...(since ? [['createdAtSince', since]] : [])
      ], signal);
      const end = offset + data.data.length;
      let next = null;
      if (data.data.length && end < data.total) {
        if (end < windowLimit) next = { offset: end, since };
        else if (action === 'catalog') {
          // Overlap the timestamp boundary so titles sharing the same second remain reachable.
          const last = Date.parse(data.data.at(-1).attributes.createdAt);
          if (Number.isFinite(last)) {
            const boundary = new Date(last - 1000).toISOString().slice(0, 19);
            if (!since || boundary > since) next = { offset: 0, since: boundary };
          }
        }
      }
      result = { books: data.data.map(item => work(item, [])), next, total: data.total };
    } else {
      const feed = await requestDex('/chapter', [...selectedLanguages, ...ratings,
        ...origins.map(lang => ['originalLanguage[]', lang]), ['limit', 50], ['order[publishAt]', 'desc']], signal);
      const grouped = new Map();
      for (const item of feed.data.filter(readable)) {
        const manga = item.relationships.find(link => link.type === 'manga')?.id;
        if (!uuid.test(manga || '')) continue;
        if (!grouped.has(manga)) grouped.set(manga, []);
        grouped.get(manga).push(chapter(item));
      }
      const ids = [...grouped.keys()];
      const works = ids.length ? await requestDex('/manga', [['limit', ids.length], ...ratings, ['includes[]', 'cover_art'], ...ids.map(value => ['ids[]', value])], signal) : { data: [] };
      result = { books: works.data.flatMap(item => {
        const a = item.attributes;
        const chapters = grouped.get(item.id);
        if (!chapters?.length || !origins.includes(a.originalLanguage)) return [];
        return [work(item, chapters)];
      }) };
    }
    return Response.json(result, { headers: { 'Cache-Control': action === 'pages' ? 'no-store' : 'public, max-age=60, s-maxage=300' } });
  } catch (error) {
    return Response.json({ error: 'تعذر الاتصال بـ MangaDex الآن.', upstreamStatus: error.status || 0 }, { status: error.status === 429 ? 429 : 502 });
  }
}

function work(item, chapters) {
  const a = item.attributes;
  const cover = item.relationships.find(link => link.type === 'cover_art')?.attributes?.fileName;
  return {
    url: 'https://mangadex.org/title/' + item.id, title: localized(a.title) || 'MangaDex',
    kind: a.originalLanguage === 'ko' ? 'مانهوا' : a.originalLanguage?.startsWith('zh') ? 'مانها' : 'مانجا',
    description: localized(a.description), genres: (a.tags || []).map(tag => localized(tag.attributes.name)).filter(Boolean),
    cover: cover ? 'https://uploads.mangadex.org/covers/' + item.id + '/' + encodeURIComponent(cover) + '.256.jpg' : '', chapters
  };
}
