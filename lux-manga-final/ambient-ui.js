/* Decorative CSS backgrounds never intercept reading or navigation. */
const ambientChoices=[['minimal','سادة · هدوء كامل'],['space','الفضاء والنجوم'],['sky','سماء وسحب'],['forest','غابة هادئة']];
function applyAmbient(value){
  const choice=ambientChoices.some(([key])=>key===value)?value:'minimal';
  document.documentElement.dataset.ambient=choice;
  try{localStorage.setItem('lux.ambient.background',choice)}catch{}
}
let savedAmbient='minimal';try{savedAmbient=localStorage.getItem('lux.ambient.background')||savedAmbient}catch{}
applyAmbient(savedAmbient);
const ambientLayer=document.createElement('div');ambientLayer.className='lux-ambient';ambientLayer.setAttribute('aria-hidden','true');
for(let i=0;i<3;i++)ambientLayer.append(document.createElement('i'));
document.body.prepend(ambientLayer);
if(typeof uxAppearance==='function'){
const originalAmbientAppearance=uxAppearance;
uxAppearance=function(){originalAmbientAppearance();const panel=document.querySelector('#uxAppearance');if(!panel)return;const label=document.createElement('label');label.htmlFor='ambientChoice';label.textContent='خلفية الموقع';const select=document.createElement('select');select.id='ambientChoice';for(const [value,name]of ambientChoices){const option=new Option(name,value);option.selected=value===document.documentElement.dataset.ambient;select.append(option)}const note=document.createElement('p');note.className='note';note.textContent='خلفيات خفيفة؛ تبقى صفحات القراءة واضحة وتُحترم إعدادات تقليل الحركة.';const end=panel.querySelector('[data-ux-close]');panel.insertBefore(label,end);panel.insertBefore(select,end);panel.insertBefore(note,end)};
document.addEventListener('change',event=>{if(event.target.id==='ambientChoice')applyAmbient(event.target.value)});

}
