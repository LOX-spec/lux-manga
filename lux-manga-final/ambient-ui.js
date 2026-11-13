/* Decorative CSS backgrounds never intercept reading or navigation. */
const ambientChoices=[['minimal','سادة · هدوء كامل'],['space','الكون وتعدد الأكوان (Cosmic Multiverse)'],['sky','سماء وسحب'],['forest','غابة حية · ضوء وأوراق'],['ocean','شاطئ ليلي هادئ'],['cave','منجم التنين · الكهف المتوهج'],['neon','مدينة النيون'],['aurora','الشفق القطبي']];
function applyAmbient(value){
  const choice=ambientChoices.some(([key])=>key===value)?value:'minimal';
  document.documentElement.dataset.ambient=choice;
  try{localStorage.setItem('lux.ambient.background',choice)}catch{}
  cosmicEngine?.setEnabled(false);
  landscape?.setEnabled(false);applyScenePalette(choice);
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
let landscape=null,landscapeKind='',landscapeLoading=null;
function syncLandscape(choice){if(!['sky','forest','ocean','cave','neon','aurora'].includes(choice)){landscape?.setEnabled(false);return;}if(landscapeKind===choice){landscape.setEnabled(true);return;}landscape?.setEnabled(false);if(!landscapeLoading)landscapeLoading=new Promise((resolve,reject)=>{if(window.LuxLandscape)return resolve();const s=document.createElement('script');s.src='/landscape-engine.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});landscapeLoading.then(()=>{if(document.documentElement.dataset.ambient!==choice)return;if(!landscape){const c=document.createElement('canvas');c.className='lux-landscape-canvas';c.setAttribute('aria-hidden','true');ambientLayer.append(c);landscape=new window.LuxLandscape(c,choice);}else{landscape.kind=choice;landscape.resize();}landscapeKind=choice;ambientLayer.classList.add('landscape-ready');landscape.setEnabled(true);}).catch(()=>{landscapeLoading=null;});}
function applyScenePalette(choice){const colors={space:'#a598ed',forest:'#82b99a',ocean:'#78b8d1',cave:'#71c8bf',neon:'#db88d8',aurora:'#7acfb9',sky:'#82b5d8'};const root=document.documentElement;let color=colors[choice];if(!color){root.style.removeProperty('--scene-accent');if(typeof prefs==='function'&&typeof accentColors!=='undefined')color=accentColors.find(v=>v[0]===prefs().accent)?.[2];}else root.style.setProperty('--scene-accent',color);if(color)for(const [key,val]of [['--accent',color],['--red',color],['--accent-soft',color+'25'],['--accent-border',color+'70']])root.style.setProperty(key,val);}
if(typeof applyPrefs==='function'){const previousScenePrefs=applyPrefs;applyPrefs=function(){previousScenePrefs();applyScenePalette(document.documentElement.dataset.ambient);};}
applyAmbient(savedAmbient);
if(typeof uxAppearance==='function'){
const originalAmbientAppearance=uxAppearance;
uxAppearance=function(){originalAmbientAppearance();const panel=document.querySelector('#uxAppearance');if(!panel)return;const label=document.createElement('label');label.htmlFor='ambientChoice';label.textContent='خلفية الموقع';const select=document.createElement('select');select.id='ambientChoice';for(const [value,name]of ambientChoices){const option=new Option(name,value);option.selected=value===document.documentElement.dataset.ambient;select.append(option)}const note=document.createElement('p');note.className='note';note.textContent='خلفيات ثابتة بلا حركة أو Canvas للحفاظ على سرعة القراءة.';const end=panel.querySelector('[data-ux-close]');panel.insertBefore(label,end);panel.insertBefore(select,end);panel.insertBefore(note,end)};
document.addEventListener('change',event=>{if(event.target.id==='ambientChoice')applyAmbient(event.target.value)});

}

document.addEventListener('change',event=>{if(event.target.id!=='motionMode')return;window.LuxMotionPreference?.set(event.target.value);if(typeof state!=='undefined'){state.preferences={...prefs(),reducedMotion:event.target.value==='reduced'};applyPrefs();void save();}});
