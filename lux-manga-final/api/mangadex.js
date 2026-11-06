const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const api = 'https://api.mangadex.org';
const languages = [['translatedLanguage[]', 'ar'], ['translatedLanguage[]', 'en']];
const ratings = [['contentRating[]', 'safe'], ['contentRating[]', 'suggestive']];

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
    title: [a.chapter ? 'الفصل ' + a.chapter : 'فصل خاص', a.title, a.translatedLanguage === 'ar' ? 'عربي' : 'English'].filter(Boolean).join(' · '),
    published: a.publishAt, images: []
  };
}
const readable = item => uuid.test(item.id) && item.attributes?.pages > 0 && !item.attributes.externalUrl && !item.attributes.isUnavailable;
const localized = value => value?.ar || value?.en || Object.values(value || {})[0] || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'latest';
  const id = searchParams.get('id') || '';
  if (!['latest', 'chapters', 'pages'].includes(action) || (action !== 'latest' && !uuid.test(id))) {
    return Response.json({ error: 'طلب MangaDex غير صالح.' }, { status: 400 });
  }
  const signal = AbortSignal.timeout(12000);
  try {
    let result;
    if (action === 'pages') {
      const data = await requestDex('/at-home/server/' + id, [['forcePort443', 'true']], signal);
      const base = new URL(data.baseUrl);
      if (base.protocol !== 'https:' || base.username || base.password || base.port) throw Error('Invalid image host');
      const files = data.chapter.dataSaver?.length ? data.chapter.dataSaver : data.chapter.data;
      const folder = data.chapter.dataSaver?.length ? 'data-saver' : 'data';
      result = { images: files.map(file => base.href.replace(/\/$/, '') + '/' + folder + '/' + encodeURIComponent(data.chapter.hash) + '/' + encodeURIComponent(file)) };
    } else if (action === 'chapters') {
      const offset = Number(searchParams.get('offset') || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 9900) return Response.json({ error: 'صفحة غير صالحة.' }, { status: 400 });
      const data = await requestDex('/manga/' + id + '/feed', [...languages, ...ratings, ['limit', 100], ['offset', offset], ['order[chapter]', 'desc']], signal);
      result = { chapters: data.data.filter(readable).map(chapter), next: offset + data.data.length < data.total && data.data.length && offset + data.data.length <= 9900 ? offset + data.data.length : null };
    } else {
      const feeds = await Promise.all(languages.map(language =>
        requestDex('/chapter', [language, ...ratings, ['limit', 24], ['order[publishAt]', 'desc']], signal)));
      const grouped = new Map();
      for (const item of feeds.flatMap(feed => feed.data).filter(readable)) {
        const manga = item.relationships.find(link => link.type === 'manga')?.id;
        if (!uuid.test(manga || '')) continue;
        if (!grouped.has(manga)) grouped.set(manga, []);
        grouped.get(manga).push(chapter(item));
      }
      const ids = [...grouped.keys()].slice(0, 32);
      const works = ids.length ? await requestDex('/manga', [['limit', ids.length], ...ratings, ['includes[]', 'cover_art'], ...ids.map(value => ['ids[]', value])], signal) : { data: [] };
      result = { books: works.data.flatMap(item => {
        const a = item.attributes;
        const chapters = grouped.get(item.id);
        if (!chapters?.length || !['ja', 'ko', 'zh', 'zh-hk'].includes(a.originalLanguage)) return [];
        const cover = item.relationships.find(link => link.type === 'cover_art')?.attributes?.fileName;
        return [{ url: 'https://mangadex.org/title/' + item.id, title: localized(a.title) || 'MangaDex',
          kind: a.originalLanguage === 'ko' ? 'مانهوا' : a.originalLanguage.startsWith('zh') ? 'مانها' : 'مانجا',
          description: localized(a.description), genres: (a.tags || []).map(tag => localized(tag.attributes.name)).filter(Boolean),
          cover: cover ? 'https://uploads.mangadex.org/covers/' + item.id + '/' + encodeURIComponent(cover) + '.256.jpg' : '', chapters }];
      }) };
    }
    return Response.json(result, { headers: { 'Cache-Control': action === 'pages' ? 'no-store' : 'public, max-age=60, s-maxage=300' } });
  } catch (error) {
    return Response.json({ error: 'تعذر الاتصال بـ MangaDex الآن.', upstreamStatus: error.status || 0 }, { status: error.status === 429 ? 429 : 502 });
  }
}
