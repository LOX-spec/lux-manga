export function challenge(content) {
  return /<title[^>]*>\s*(?:just a moment|attention required|access denied)/i.test(content) || (/cf-chl-|challenge-platform/.test(content) && content.length < 20000);
}
