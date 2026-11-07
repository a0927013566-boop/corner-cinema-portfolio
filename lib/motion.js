const preference=matchMedia('(prefers-reduced-motion: reduce)');
let choice=null;
try {const saved=sessionStorage.getItem('corner-motion');if(saved==='running'||saved==='paused')choice=saved;}catch{}
// Respect the system initially. An explicit visitor choice can enable or pause effects.
export const motionAllowed=()=>choice===null?!preference.matches:choice==='running';
function sync(){
  const allowed=motionAllowed();
  document.documentElement.dataset.motion=allowed?'running':'paused';
  document.documentElement.dataset.motionChoice=choice||'system';
  document.querySelectorAll('[data-motion-toggle],#motion-toggle').forEach(button=>{
    button.hidden=false;button.disabled=false;
    button.setAttribute('aria-pressed',String(allowed));button.setAttribute('aria-label','動態效果');
    button.textContent=allowed?'暫停動態 Ⅱ':'開啟動態 ▷';
    button.title=choice===null&&preference.matches?'依系統設定預設暫停，可手動開啟':'';
  });
  document.dispatchEvent(new CustomEvent('corner:motion',{detail:{allowed}}));
}
document.addEventListener('click',event=>{
  if(!event.target.closest('[data-motion-toggle],#motion-toggle'))return;
  choice=motionAllowed()?'paused':'running';
  try{sessionStorage.setItem('corner-motion',choice);}catch{}
  sync();
});
preference.addEventListener('change',sync);
export function initMotion(){sync();}
