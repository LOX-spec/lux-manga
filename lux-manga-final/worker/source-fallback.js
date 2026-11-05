export function alternatives(input) {
  const url = new URL(input), encoded = encodeURIComponent(url.href);
  const routes = [];
  if (process.env.CORSPROXY_KEY) routes.push({url: 'https://corsproxy.io/?key=' + encodeURIComponent(process.env.CORSPROXY_KEY) + '&url=' + encoded, method: 'corsproxy'});
  routes.push({url: 'https://api.allorigins.win/raw?url=' + encoded, method: 'allorigins'},
    {url: 'https://r.jina.ai/' + url.href, method: 'jina'});
  if (url.pathname === '/') for (const path of ['/wp-json/wp/v2/manga?per_page=100&_embed=1', '/feed/']) routes.push({url: url.origin + path, method: 'feed'});
  return routes;
}
export function challenge(content) {
  return /<title[^>]*>\s*(?:just a moment|attention required|access denied)/i.test(content) || (/cf-chl-|challenge-platform/.test(content) && content.length < 20000);
}
