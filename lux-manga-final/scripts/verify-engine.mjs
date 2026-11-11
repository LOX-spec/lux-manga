import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { GET } from '../api/suwayomi.js';

const initial = { url: process.env.SUWAYOMI_URL, auth: process.env.SUWAYOMI_AUTH, fetch: globalThis.fetch };
const request = query => new Request('https://lux.example/api/suwayomi?' + query);
const manga = { id: 7, title: 'عمل عربي', author: '', genre: ['Fantasy'], source: { id: '9223372036854775800', name: 'مصدر عربي', lang: 'ar', isNsfw: false } };
try {
  delete process.env.SUWAYOMI_URL;
  assert.equal((await (await GET(request('action=sources'))).json()).configured, false);
  process.env.SUWAYOMI_URL = 'https://engine.example.com';
  process.env.SUWAYOMI_AUTH = 'Bearer test-fixture';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).origin, 'https://engine.example.com');
    assert.equal(options.headers.Authorization, 'Bearer test-fixture');
    const body = JSON.parse(options.body);
    calls.push(body);
    const query = body.query;
    let data;
    if(query.includes('sources {')) data = {sources:{nodes:[manga.source,{...manga.source,id:'2',isNsfw:true}]}};
    else if(query.includes('source(id:')) data = {source:manga.source};
    else if(query.includes('fetchSourceManga')) data = {fetchSourceManga:{mangas:[manga,{...manga,id:8,genre:['erotica']}],hasNextPage:true}};
    else if(query.includes('fetchMangaAndChapters')) data = {fetchMangaAndChapters:{manga,chapters:[{id:11,name:'الفصل الأول',chapterNumber:1}]}};
    else if(query.includes('chapter(id:')) data = {chapter:{mangaId:7,sourceOrder:1,pageCount:15,manga}};
    else if(query.includes('fetchChapterPages')) data = {fetchChapterPages:{pages:Array.from({length:15},(_,i)=>'/pages/'+i)}};
    else throw Error('Unexpected operation');
    return Response.json({data});
  };
  assert.equal((await (await GET(request('action=sources'))).json()).sources.length,1);
  const browse = await (await GET(request('action=browse&source=9223372036854775800'))).json();
  assert.equal(browse.books.length,1);
  assert.equal(calls.find(call=>call.query.includes('fetchSourceManga')).variables.input.source,'9223372036854775800');
  const details = await (await GET(request('action=details&id=7'))).json();
  assert.equal(details.book.chapters[0].engineId,11);
  assert.equal(details.book.chapters[0].language,'ar');
  const pages = await (await GET(request('action=pages&id=11'))).json();
  assert.equal(pages.images.length,15);
  assert.equal(new URL(pages.images.at(-1),'https://lux.example').searchParams.get('page'),'14');
  assert.equal((await GET(request('action=pages&id=../../private'))).status,400);
  const policy = fs.readFileSync('automatic-sources.js','utf8').split('function storeDexWork')[0];
  const context = {mangaHub:{adult:false}};
  vm.createContext(context);
  vm.runInContext(policy + '\nthis.check=allowedCachedWork;',context);
  for(const rating of ['erotica','pornographic']) assert.equal(context.check({siteId:'custom',contentRating:rating}),false);
  assert.equal(context.check({siteId:'custom',contentRating:'safe'}),true);
  console.log('PASS: unconfigured engine, source filtering, precise source IDs, chapters, all 15 pages, and global adult-content policy.');
} finally {
  globalThis.fetch = initial.fetch;
  for(const [key,value] of [['SUWAYOMI_URL',initial.url],['SUWAYOMI_AUTH',initial.auth]]) {
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
}
