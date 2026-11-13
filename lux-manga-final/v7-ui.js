/* Small, persistent appearance controls with no page-wide animation. */
(()=>{
let radius=16;try{const n=Number(localStorage.getItem('lux.corner.radius'));if(localStorage.getItem('lux.corner.radius')!==null&&Number.isFinite(n))radius=Math.max(0,Math.min(28,n));}catch{}
const applyRadius=()=>{document.documentElement.style.setProperty('--lux-radius',radius+'px');const slider=document.getElementById('cornerRadius');if(slider)slider.value=radius;const label=document.getElementById('radiusValue');if(label&&label.textContent!==radius+'px')label.textContent=radius+'px';};applyRadius();
document.addEventListener('input',event=>{if(event.target.id!=='cornerRadius')return;radius=Number(event.target.value);applyRadius();try{localStorage.setItem('lux.corner.radius',String(radius));}catch{}});
const panelObserver=new MutationObserver(applyRadius);panelObserver.observe(document.getElementById('modal'),{childList:true,subtree:true});
const brand=document.querySelector('.brand'),aside=document.querySelector('aside'),header=document.querySelector('.topbar');let dock=null;
function dockBrand(){const collapsed=innerWidth>760&&document.body.classList.contains('desktop-collapsed');if(!dock){dock=document.createElement('div');dock.className='v7-brand-dock';header.prepend(dock);}if(collapsed&&brand.parentElement!==dock)dock.append(brand);if(!collapsed&&brand.parentElement!==aside)aside.prepend(brand);dock.hidden=!collapsed;}
new MutationObserver(dockBrand).observe(document.body,{attributes:true,attributeFilter:['class']});addEventListener('resize',dockBrand,{passive:true});dockBrand();
})();