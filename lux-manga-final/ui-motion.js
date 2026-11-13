/* Atomic two-panel route transitions and persistent navigation indicators. */
(()=>{
const page=document.getElementById('page'),seen=new WeakSet(),pendingCards=new WeakSet(),awaitingCards=new Set(),markers=new Map();let scheduled=0,incoming=null,outgoing=null,currentGhost=null;
const reduced=()=>window.LuxMotionPreference?.reduced()??(matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('reduce-motion'));
const duration=560,easing='cubic-bezier(.2,.75,.2,1)';
function clear(){page.dataset.motionPhase='idle';incoming?.cancel();outgoing?.cancel();incoming=outgoing=null;currentGhost?.remove();currentGhost=null;}
function snapshot(){
 if(reduced()||!page.childElementCount||document.hidden||document.querySelector('#modal[open]'))return null;
 const rect=page.getBoundingClientRect(),top=Math.max(72,rect.top),height=Math.min(rect.bottom,innerHeight-64)-top;if(height<40)return null;
 const ghost=document.createElement('div');ghost.className='lux-route-ghost';ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.style.cssText='left:'+rect.left+'px;top:'+top+'px;width:'+rect.width+'px;height:'+height+'px;';
 const copy=page.cloneNode(true);copy.removeAttribute('id');copy.style.marginTop=(rect.top-top)+'px';copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.querySelectorAll('script,iframe,video,audio').forEach(n=>n.remove());ghost.append(copy);return ghost;
}
function play(ghost,previous,next){
 schedule();if(previous===next||reduced()){ghost?.remove();return;}
 const order=['home','catalog','comics','novels','favorites','later','downloads','settings'];const sign=order.indexOf(next)>=order.indexOf(previous)?1:-1,travel=Math.min(144,innerWidth*.24);
 if(ghost){currentGhost=ghost;document.body.append(ghost);outgoing=ghost.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX('+(-sign*travel)+'px) scale(.985)'}],{duration:duration-60,easing,fill:'both'});outgoing.finished.then(()=>{ghost.remove();if(currentGhost===ghost)currentGhost=null;}).catch(()=>ghost.remove());}
 page.dataset.motionPhase='moving';incoming=page.animate([{opacity:0,transform:'translateX('+(sign*travel)+'px) scale(.985)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration,easing,fill:'backwards'});const active=incoming;active.finished.then(()=>{if(incoming===active)page.dataset.motionPhase='idle';}).catch(()=>{});
}
function navigate(previous,next,commit){if(previous===next){commit();schedule();return;}clear();const ghost=snapshot();try{commit();play(ghost,previous,next);}catch(error){ghost?.remove();throw error;}}
function transition(previous,next){clear();play(null,previous,next);}
const entrance=entries=>{let index=0;for(const entry of entries){if(!entry.isIntersecting)continue;const card=entry.target;observer?.unobserve(card);pendingCards.delete(card);awaitingCards.delete(card);if(seen.has(card))continue;seen.add(card);if(!reduced())card.animate([{opacity:0,transform:'translateY(32px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:570,delay:Math.min(index++*65,325),easing,fill:'backwards'});}};
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entrance,{threshold:.035}):null;
function indicators(){for(const [key,selector]of [['main','#nav button.active'],['mobile','#mobileNav button.active'],['discover','.ux-sections button[aria-current="page"]'],['publisher','.comic-publishers button[aria-pressed="true"],.publisher-tabs button.active'],['kind','[data-visual-kind][aria-pressed="true"]']]){
 const target=document.querySelector(selector);let item=markers.get(key);
 const container=target?.closest('#nav,#mobileNav,.ux-sections,.comic-publishers,.publisher-tabs,.visual-kind-tabs');
 if(!target||!container||!target.offsetWidth||!target.offsetHeight){if(item)item.node.hidden=true;continue;}
 container.classList.add('lux-morph-container');
 if(!item){const node=document.createElement('i');node.className='lux-morph-indicator';node.setAttribute('aria-hidden','true');item={node,rect:null,animation:null};markers.set(key,item);}
 const inset=3,r={left:target.offsetLeft+inset,top:target.offsetTop+inset,width:Math.max(0,target.offsetWidth-inset*2),height:Math.max(0,target.offsetHeight-inset*2)},old=item.rect,node=item.node;
 if(node.parentElement!==container)container.append(node);node.hidden=false;node.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;';
 if(old&&!reduced()&&(Math.abs(old.left-r.left)>1||Math.abs(old.top-r.top)>1||Math.abs(old.width-r.width)>1)){item.animation?.cancel();item.animation=node.animate([{transform:'translate('+(old.left-r.left)+'px,'+(old.top-r.top)+'px) scale('+(old.width/r.width)+','+(old.height/r.height)+')'},{transform:'translate(0,0) scale(1)'}],{duration:440,easing,fill:'backwards'});}item.rect=r;
}}
function decorate(){scheduled=0;for(const card of awaitingCards){if(!card.isConnected){observer?.unobserve(card);pendingCards.delete(card);awaitingCards.delete(card);}}for(const card of page.querySelectorAll('.studio-card,.comic-series-card,.novel-sample-card')){if(seen.has(card)||pendingCards.has(card))continue;if(observer){pendingCards.add(card);awaitingCards.add(card);observer.observe(card);}else seen.add(card);}indicators();}
function schedule(){if(!scheduled)scheduled=requestAnimationFrame(decorate);}
const subtab='.publisher-tabs button,.comic-publishers button,[data-studio-media],[data-genre],[data-comic-publisher],[data-visual-kind]';
document.addEventListener('click',event=>{const target=event.target.closest(subtab);if(!target||target.closest('[data-view]')||target.disabled)return;clear();const ghost=snapshot();queueMicrotask(()=>play(ghost,'subtab-old','subtab-new'));},true);
window.LuxMotion={navigate,transition};new MutationObserver(schedule).observe(page,{childList:true,subtree:true});addEventListener('resize',schedule,{passive:true});addEventListener('scroll',schedule,{passive:true,capture:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});schedule();
})();
