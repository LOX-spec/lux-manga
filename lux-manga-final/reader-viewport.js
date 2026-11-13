/* Pure fit geometry and the real document Fullscreen API, shared by picture readers. */
(()=>{
function fitDimensions(naturalWidth,naturalHeight,availableWidth,availableHeight,fit='page',zoom=100){
 if(!(naturalWidth>0&&naturalHeight>0&&availableWidth>0&&availableHeight>0))return null;
 const widthScale=availableWidth/naturalWidth,heightScale=availableHeight/naturalHeight;
 const scale=(fit==='width'?widthScale:fit==='height'?heightScale:Math.min(widthScale,heightScale))*Math.max(.1,Math.min(4,zoom/100));
 return {width:naturalWidth*scale,height:naturalHeight*scale,scale};
}
let pending=null,ownsFullscreen=false;
const active=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFullscreenButtons(){for(const button of document.querySelectorAll('[data-lux-fullscreen]')){button.textContent=active()?'الخروج من ملء الشاشة':'ملء الشاشة';button.setAttribute('aria-pressed',String(!!active()));button.disabled=!!pending;}}
function status(message){const target=document.getElementById('readerViewportStatus');if(target)target.textContent=message;else if(typeof toast==='function')toast(message);}
function toggleFullscreen(){
 if(pending)return pending;
 const exiting=!!active(),root=document.documentElement;
 const operation=exiting?(document.exitFullscreen||document.webkitExitFullscreen):(root.requestFullscreen||root.webkitRequestFullscreen);
 if(!operation){status('هذا المتصفح لا يتيح ملء الشاشة. افتح الموقع في متصفح يدعم Fullscreen API.');return Promise.resolve(false);}
 // Invoke synchronously inside the trusted button click; awaiting first loses user activation.
 try{const result=operation.call(exiting?document:root);pending=Promise.resolve(result).then(()=>{ownsFullscreen=!exiting;status(exiting?'تم الخروج من ملء الشاشة.':'تم تفعيل ملء الشاشة.');return true;}).catch(()=>{status('منع المتصفح ملء الشاشة. جرّب فتح رابط الموقع مباشرة في Chrome أو Edge.');return false;}).finally(()=>{pending=null;updateFullscreenButtons();window.dispatchEvent(new Event('lux:reader-resize'));});updateFullscreenButtons();return pending;}
 catch{status('تعذّر تفعيل ملء الشاشة في هذا السياق. افتح الموقع مباشرة في متصفحك.');return Promise.resolve(false);}
}
document.addEventListener('fullscreenchange',()=>{if(!active())ownsFullscreen=false;updateFullscreenButtons();window.dispatchEvent(new Event('lux:reader-resize'));});
document.addEventListener('webkitfullscreenchange',updateFullscreenButtons);
function attach(modal,reader,images,getPosition){
 reader.classList.add('reader-sized');reader.style.zoom='1';reader.style.maxWidth='none';reader.style.width='100%';let fit='width',zoom=100,frame=0;
 function apply(){
  if(!reader.isConnected)return;
  const css=getComputedStyle(modal),width=Math.max(80,modal.clientWidth-parseFloat(css.paddingLeft||0)-parseFloat(css.paddingRight||0)-4);
  let reserved=28;for(const selector of ['.reader-heading','.reader-tools','.comfort-reader-tools','#readerReturnIndex']){const el=modal.querySelector(selector);if(el&&!el.hidden&&getComputedStyle(el).display!=='none')reserved+=el.getBoundingClientRect().height+8;}
  const height=Math.max(120,Math.min(modal.clientHeight,window.visualViewport?.height||innerHeight)-reserved);
  for(const image of images){const size=fitDimensions(image.naturalWidth,image.naturalHeight,width,height,fit,zoom);if(!size)continue;image.style.setProperty('--page-render-width',size.width.toFixed(2)+'px');image.style.setProperty('--page-render-height',size.height.toFixed(2)+'px');}
  reader.dataset.fit=fit;reader.dataset.zoom=String(zoom);reader.dataset.availableWidth=String(Math.round(width));reader.dataset.availableHeight=String(Math.round(height));
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply();});};
 images.forEach(image=>image.addEventListener('load',schedule));addEventListener('resize',schedule,{passive:true});addEventListener('lux:reader-resize',schedule);const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;resize?.observe(modal);
 updateFullscreenButtons();
 return {set(options={}){if(['page','width','height'].includes(options.fit))fit=options.fit;if(Number.isFinite(options.zoom))zoom=options.zoom;apply();},apply,focus(){const page=images[getPosition()]?.closest('.manga-page');page?.scrollIntoView({block:'start',behavior:'instant'});},destroy(){cancelAnimationFrame(frame);resize?.disconnect();images.forEach(image=>image.removeEventListener('load',schedule));removeEventListener('resize',schedule);removeEventListener('lux:reader-resize',schedule);if(ownsFullscreen&&active()&&!modal.classList.contains('reader-modal'))void toggleFullscreen();}};
}
window.LuxReaderViewport={fitDimensions,toggleFullscreen,attach};
})();
