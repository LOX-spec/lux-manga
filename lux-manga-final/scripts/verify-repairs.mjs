import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GET} from '../api/suwayomi.js';
const old={fetch:globalThis.fetch,url:process.env.SUWAYOMI_URL};
try{
process.env.SUWAYOMI_URL='https://engine.example';
for(const [status,body,code] of [[401,{},'ENGINE_AUTH'],[200,{errors:[{message:'Cloudflare 403'}]},'SOURCE_BLOCKED'],[200,{errors:[{message:'Failed source extraction'}]},'SOURCE_UNAVAILABLE']]){
globalThis.fetch=async()=>Response.json(body,{status});
const r=await GET(new Request('https://lux.example/api/suwayomi?action=browse&source=1'));assert.equal((await r.json()).code,code);
}
}finally{globalThis.fetch=old.fetch;if(old.url===undefined)delete process.env.SUWAYOMI_URL;else process.env.SUWAYOMI_URL=old.url;}
const events={},calls=[];
const context={URLSearchParams,AbortSignal,location:{search:''},view:'home',mangaHub:{language:'',adult:false},localStorage:{setItem(){}},document:{addEventListener:(name,fn)=>events[name]=fn},$:()=>null,render(){},loadChapter(){},refreshBook(){},fetch:async url=>{calls.push(new URL(url,'https://lux.example'));return Response.json({books:[],hasNextPage:false});},toast(){}};
vm.createContext(context);vm.runInContext(fs.readFileSync('source-engine.js','utf8')+'\nthis.engine=sourceEngine;',context);
context.engine.loaded=true;context.engine.sources=[{id:'1',lang:'en'},{id:'2',lang:'ar'}];context.engine.selected='1';
events.change({target:{id:'engineLanguage',value:'ar'}});await new Promise(resolve=>setImmediate(resolve));assert.equal(context.engine.selected,'2');assert.equal(calls.at(-1).searchParams.get('source'),'2');
events.change({target:{id:'engineLanguage',value:'fr'}});assert.equal(context.engine.selected,'');assert.match(context.engine.message,/لا يوجد مصدر/);
console.log('PASS: structured engine errors, automatic source selection on language change, and missing-language guidance.');
