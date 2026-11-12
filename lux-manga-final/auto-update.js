/* One updater for the browser, installed PWA, and standalone novel readers. */
(()=>{
  if(window.LuxAutoUpdate)return;
  let registration,starting,checking=false,applying=false,activated=false,pending=false;
  let hooks={ready:()=>!document.body.classList.contains('studio'),busy:()=>false,save:async()=>true};
  const hadController=!!navigator.serviceWorker?.controller;
  const dirtyForms=new Set();
  document.addEventListener('input',event=>{
    const field=event.target,form=field.closest?.('form');
    if(form&&!field.matches('input[type="search"],#search,[data-ux-pref]')&&!form.matches('#azora-search,#settingsForm'))dirtyForms.add(form);
  });
  document.addEventListener('reset',event=>dirtyForms.delete(event.target));
  function editorBusy(){
    for(const form of dirtyForms){
      if(!form.isConnected){dirtyForms.delete(form);continue;}
      if([...form.querySelectorAll('input:not([type="search"]),textarea,[contenteditable="true"]')].some(field=>field.value?field.value!==field.defaultValue:field.isContentEditable&&field.textContent.trim()))return true;
      dirtyForms.delete(form);
    }
    return false;
  }
  function status(message){
    let bar=document.getElementById('luxAutoUpdateStatus');
    if(!bar){bar=document.createElement('div');bar.id='luxAutoUpdateStatus';bar.setAttribute('role','status');bar.style.cssText='position:fixed;inset-inline:16px;bottom:80px;z-index:10000;max-width:440px;margin:auto;padding:12px 18px;border-radius:14px;background:var(--bg-card,#211d24);color:var(--text-main,#fff);box-shadow:0 8px 30px #0004;font:inherit';document.body.append(bar)}
    bar.textContent=message;
  }
  async function apply(){
    if(applying||(!registration?.waiting&&!activated))return false;
    pending=true;
    if(!hooks.ready()||hooks.busy()||editorBusy()){
      status('تحديث جديد جاهز؛ سيُطبّق تلقائيًا بعد حفظ التعديلات وانتهاء العمليات الحالية.');return false;
    }
    applying=true;
    try{
      window.dispatchEvent(new Event('lux:before-update'));
      if(await hooks.save()===false){status('تعذّر حفظ البيانات؛ سيُعاد تطبيق التحديث تلقائيًا بعد نجاح الحفظ.');return false;}
      status('جارٍ تطبيق تحديث لوكس مع حفظ بياناتك…');
      if(registration.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return true;}
      pending=false;location.reload();return true;
    }catch{status('تعذّر إكمال التحديث الآن؛ ستُعاد المحاولة تلقائيًا.');return false;}
    finally{applying=false;}
  }
  function waiting(){if(registration?.waiting){pending=true;void apply();}}
  async function check(){
    if(checking||navigator.onLine===false||document.hidden)return;
    checking=true;
    try{await start();await registration?.update();waiting();}catch{/* Keep the current offline shell and retry on connectivity. */}
    finally{checking=false;}
  }
  function start(){
    if(starting)return starting;
    if(!('serviceWorker'in navigator))return Promise.resolve(null);
    starting=(async()=>{
      registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed')waiting();});
      });
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!hadController)return;
        activated=true;pending=true;void apply();
      });
      waiting();return registration;
    })().catch(error=>{starting=null;throw error;});
    return starting;
  }
  window.LuxAutoUpdate={start,check,apply,configure(options){hooks={...hooks,...options};if(pending)void apply();}};
  setInterval(()=>{if(!document.hidden)void check();},10000);
  setInterval(()=>{if(pending&&!document.hidden)void apply();},2000);
  window.addEventListener('online',()=>void check());
  window.addEventListener('focus',()=>void check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void check(),{once:true});else void check();
})();
