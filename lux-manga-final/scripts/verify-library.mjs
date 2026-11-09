import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const samples=vm.runInNewContext(fs.readFileSync('manga-samples.js','utf8')+'\nLuxMangaSamples.books("https://lux.app");');
assert.equal(samples.length,6);
const paths=new Set();
for(const book of samples){assert.equal(book.chapters.length,3);assert(fs.existsSync('.'+book.cover));for(const chapter of book.chapters){assert.equal(chapter.images.length,3);for(const image of chapter.images){assert(fs.existsSync('.'+image));paths.add(image);}}}
assert.equal(paths.size,54);
const values=new Map();
const localStorage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
const emptyState=()=>({books:[],sites:[],lists:{},progress:{},favorites:[],notifications:[],downloads:{},preferences:{}});
let saves=0,fail=false;
const context={URL,structuredClone,localStorage,db:{},state:emptyState(),syncing:new Set(),emptyState,view:'home',document:{querySelector:()=>null},renderSettings(){},renderNovelAdmin(){},LuxChapterLinks:{repairState(){}},LuxNovelPublications:{backup:()=>({format:'lux-novels',version:1,books:[{id:1,title:'رواية الاختبار'}]}),restoreBackup:async()=>localStorage.setItem('lux-novel-studio:v1:book:1','saved')},save:async()=>{saves++;return !fail;},applyPrefs(){},render(){}};
vm.createContext(context);vm.runInContext(fs.readFileSync('universal-backup.js','utf8')+'\nthis.backup=LuxLibraryBackup;',context);
context.state.books=JSON.parse(JSON.stringify(samples));context.state.progress={'sample-manga-0':{chapter:1,read:[samples[0].chapters[0].url]}};context.state.favorites=['sample-manga-0'];
const data=context.backup.snapshot();assert.equal(data.library.books.length,6);assert.equal(data.novels.books.length,1);
assert.throws(()=>context.backup.parse('{"__proto__":{}}'));
const invalid=structuredClone(data);invalid.library.books[0].chapters[0].images=['javascript:alert(1)'];assert.throws(()=>context.backup.parse(JSON.stringify(invalid)));
context.state=emptyState();await context.backup.restore(data);assert.equal(context.state.books.length,6);assert.equal(context.state.progress['sample-manga-0'].chapter,1);assert.equal(context.state.favorites[0],'sample-manga-0');
// Regression: real engine image links, empty novels, page/font/zoom transfer.
const engine=structuredClone(data);engine.novels.books=[];
engine.library.books[0].cover='/api/suwayomi?action=image&kind=cover&id=1';
engine.library.books[0].chapters[0].images=['/api/suwayomi?action=image&kind=page&id=1&page=0'];
engine.readerSettings={'lux.app.font':'Thmanyah Sans','lux.picture.zoom':'130','lux.picture.position:sample-manga-0':JSON.stringify({chapter:samples[0].chapters[0].url,page:2,mode:'vertical'})};
await context.backup.restore(engine);assert.equal(localStorage.getItem('lux.picture.zoom'),'130');assert.equal(JSON.parse(localStorage.getItem('lux.picture.position:sample-manga-0')).page,2);
assert.equal(context.backup.snapshot().readerSettings['lux.app.font'],'Thmanyah Sans');
const malicious=structuredClone(engine);malicious.readerSettings={'unrelated-secret':'bad'};assert.throws(()=>context.backup.parse(JSON.stringify(malicious)));
const previous=JSON.stringify(context.state);fail=true;await assert.rejects(context.backup.restore(data));assert.equal(JSON.stringify(context.state),previous);assert(saves>=3);
console.log('PASS: six works, 18 chapters, 54 local scene assets; unified backup round-trip and read progress, invalid data rejection, failed-save rollback.');
