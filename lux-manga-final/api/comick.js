export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') || '').trim().slice(0, 150);
  const url = new URL('https://api.comick.dev/v1.0/search/');
  url.searchParams.set('limit', '24');
  if (query) url.searchParams.set('q', query);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw Error('Source unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw Error('Invalid source response');
    const books = data.filter(item => ['safe','suggestive'].includes(item.content_rating) && /^[a-zA-Z0-9_-]+$/.test(item.slug || ''))
      .map(item => ({ title: String(item.title || ''), url: 'https://comick.dev/comic/' + item.slug }));
    return Response.json({ books }, { headers: { 'Cache-Control': 'public,max-age=60,s-maxage=300' } });
  } catch {
    return Response.json({ error: 'تعذر الاتصال ببحث Comick الآن.' }, { status: 502 });
  }
}
