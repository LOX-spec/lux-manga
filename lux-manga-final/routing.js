export function normalizeRoute(input) {
  const url = new URL(input);
  const decode = part => {
    try { return decodeURIComponent(part); } catch { return part; }
  };
  const path = url.pathname.replace(/\/$/, '') || '/';
  const sections = { '/novels': 'novels', '/admin': 'admin' };
  const novel = /^\/novel\/([^/]+)$/.exec(path);
  const reader = /^\/reader\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (sections[path]) url.searchParams.set('view', sections[path]);
  if (novel) {
    url.searchParams.set('view', 'novel');
    url.searchParams.set('id', decode(novel[1]));
  }
  if (reader) {
    url.searchParams.set('view', 'reader');
    url.searchParams.set('id', decode(reader[1]));
    if (reader[2]) url.searchParams.set('chapter', decode(reader[2]));
  }
  if (sections[path] || novel || reader || path === '/index.html') url.pathname = '/';
  return url;
}
