import assert from 'node:assert/strict';
import{parseOnmaList,parseOnmaDetails,parseOnmaPages,onmaRequest}from '../worker/onma-source.js';
const list='<a href="https://onma.me/manga/test"><img src="https://www.onma.me/uploads/manga/test/cover/a.jpg" alt="Test &amp; Story"></a>';
assert.equal(parseOnmaList(list)[0].title,'Test & Story');
const html='<div class="panel-heading">Test</div>'+list+'<a href="https://onma.me/manga/test/2">الفصل 2</a><a href="https://onma.me/manga/test/1">الفصل 1</a><a href="https://evil.example/manga/test/3">bad</a>';
const detail=parseOnmaDetails(html,'/manga/test');assert.equal(detail.chapters.length,2);assert.equal(detail.chapters[0].number,1);
const page='<img src="data:image/gif;base64,AAAA" data-src=" https://www.onma.me/uploads/manga/test/chapters/1/01.jpg "><img src="https://www.onma.me/uploads/manga/test/chapters/1/02.jpg"><img src="https://www.onma.me/uploads/manga/test/chapters/1/01.jpg"><img src="http://127.0.0.1/private">';
assert.equal(parseOnmaPages(page).length,2);assert.equal((await onmaRequest(new URLSearchParams('action=details&id=onma_'+Buffer.from('https://evil.example/private').toString('base64url')))).status,400);
console.log('PASS: Onma lazy images, page deduplication/order, chapter sorting, entities and SSRF ID rejection.');
