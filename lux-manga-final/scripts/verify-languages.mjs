import assert from 'node:assert/strict';
import { GET } from '../api/mangadex.js';

const originalFetch = globalThis.fetch;
const id = n => '00000000-0000-0000-0000-' + String(n).padStart(12, '0');
try {
  for (const language of ['ar', 'en']) {
    const calls = [];
    globalThis.fetch = async input => {
      const url = new URL(input);
      calls.push(url);
      if (url.pathname === '/manga') return Response.json({ total: 60, data: [1, 2, 3, 4].map(n => ({
        id: id(n), attributes: { contentRating: 'safe', title: { en: 'Book ' + n }, availableTranslatedLanguages: [language], tags: [] }, relationships: []
      })) });
      const n = Number(url.pathname.split('/')[2].split('-').at(-1));
      return Response.json({ data: [{ id: id(100 + n), attributes: {
        pages: n === 3 ? 0 : 12, translatedLanguage: n === 4 ? 'fr' : language,
        externalUrl: n === 2 ? 'https://external.example/read' : null, chapter: '1'
      }, relationships: [] }] });
    };
    const response = await GET(new Request('https://lux.example/api/mangadex?action=popular&language=' + language));
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.books.length, 1, 'Reject external-only, empty, and wrong-language chapters');
    assert.equal(result.books[0].chapters[0].language, language);
    assert.deepEqual(result.books[0].verifiedLanguages, [language]);
    assert.equal(result.next.offset, 4, 'Pagination must advance past rejected works');
    assert.ok(calls.slice(1).every(url => url.searchParams.get('translatedLanguage[]') === language && url.searchParams.get('includeExternalUrl') === '0'));
  }
  console.log('PASS: strict Arabic/English readability filters and pagination.');
} finally { globalThis.fetch = originalFetch; }
