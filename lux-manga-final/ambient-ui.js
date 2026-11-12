/* Decorative CSS backgrounds never intercept reading or navigation. */
const ambientChoices=[['minimal','سادة · هدوء كامل'],['space','الكون وتعدد الأكوان (Cosmic Multiverse)'],['sky','سماء وسحب'],['forest','غابة هادئة']];
function applyAmbient(value){
  const choice=ambientChoices.some(([key])=>key===value)?value:'minimal';
  document.documentElement.dataset.ambient=choice;
  try{localStorage.setItem('lux.ambient.background',choice)}catch{}
  syncCosmicBackground(choice);
}
let savedAmbient='minimal';try{savedAmbient=localStorage.getItem('lux.ambient.background')||savedAmbient}catch{}

const ambientLayer=document.createElement('div');ambientLayer.className='lux-ambient';ambientLayer.setAttribute('aria-hidden','true');
for(let i=0;i<3;i++)ambientLayer.append(document.createElement('i'));
document.body.prepend(ambientLayer);
let cosmicEngine=null,cosmicLoading=null;
function syncCosmicBackground(choice){
  if(choice!=='space'){cosmicEngine?.setEnabled(false);return;}
  if(cosmicEngine){cosmicEngine.setEnabled(true);return;}
  if(!cosmicLoading)cosmicLoading=new Promise((resolve,reject)=>{
    if(window.LuxCosmicMultiverse){resolve();return;}
    const script=document.createElement('script');script.src='/cosmic-engine.js';script.onload=resolve;script.onerror=reject;document.head.append(script);
  });
  cosmicLoading.then(()=>{
    if(document.documentElement.dataset.ambient!=='space')return;
    if(!cosmicEngine){const canvas=document.createElement('canvas');canvas.className='lux-cosmic-canvas';canvas.setAttribute('aria-hidden','true');ambientLayer.append(canvas);cosmicEngine=new window.LuxCosmicMultiverse(canvas);if(cosmicEngine.ctx)ambientLayer.classList.add('cosmic-ready');}
    cosmicEngine.setEnabled(true);
  }).catch(()=>{cosmicLoading=null;});
}
applyAmbient(savedAmbient);
if(typeof uxAppearance==='function'){
const originalAmbientAppearance=uxAppearance;
uxAppearance=function(){originalAmbientAppearance();const panel=document.querySelector('#uxAppearance');if(!panel)return;const label=document.createElement('label');label.htmlFor='ambientChoice';label.textContent='خلفية الموقع';const select=document.createElement('select');select.id='ambientChoice';for(const [value,name]of ambientChoices){const option=new Option(name,value);option.selected=value===document.documentElement.dataset.ambient;select.append(option)}const note=document.createElement('p');note.className='note';note.textContent='خلفيات خفيفة؛ تبقى صفحات القراءة واضحة وتُحترم إعدادات تقليل الحركة.';const end=panel.querySelector('[data-ux-close]');panel.insertBefore(label,end);panel.insertBefore(select,end);panel.insertBefore(note,end)};
document.addEventListener('change',event=>{if(event.target.id==='ambientChoice')applyAmbient(event.target.value)});

}
