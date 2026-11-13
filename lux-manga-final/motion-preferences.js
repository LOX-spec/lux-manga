/* Explicit full motion can override the device preference only by user choice. */
(()=>{let selected='auto';try{const saved=localStorage.getItem('lux.motion.mode');if(['auto','full','reduced'].includes(saved))selected=saved;}catch{}
function mode(){return selected;}
function reduced(){if(selected==='full')return false;if(selected==='reduced')return true;return matchMedia('(prefers-reduced-motion: reduce)').matches||!!document.body?.classList.contains('reduce-motion');}
function set(value){selected=['auto','full','reduced'].includes(value)?value:'auto';document.documentElement.dataset.motion=selected;try{localStorage.setItem('lux.motion.mode',selected);}catch{}window.dispatchEvent(new Event('lux:motionchange'));}
document.documentElement.dataset.motion=selected;window.LuxMotionPreference={mode,reduced,set};})();
