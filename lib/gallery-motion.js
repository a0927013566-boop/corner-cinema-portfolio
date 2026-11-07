import {motionAllowed} from './motion.js';
export function initGalleryMotion() {
  const grid=document.querySelector('#work-grid');if(!grid)return;
  const bound=new WeakSet(),fine=matchMedia('(hover: hover) and (pointer: fine)');
  const enter=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const card=entry.target;if(motionAllowed())card.classList.add('is-entering');enter.unobserve(card);}},{threshold:.12});
  function reset(frame){frame.classList.remove('is-tilted');for(const name of ['--frame-x','--frame-y','--light-x','--light-y'])frame.style.removeProperty(name);}
  function bind(){enter.disconnect();grid.querySelectorAll('.work-card').forEach(card=>{const frame=card.querySelector('.poster-link');if(!frame||bound.has(frame))return;bound.add(frame);frame.classList.add('spatial-poster');
    const glaze=document.createElement('span');glaze.className='poster-glaze';glaze.setAttribute('aria-hidden','true');frame.append(glaze);
    frame.addEventListener('pointermove',event=>{if(!motionAllowed()||!fine.matches||event.pointerType==='touch')return;const r=card.getBoundingClientRect();const x=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(event.clientY-r.top)/frame.offsetHeight));frame.style.setProperty('--frame-x',`${(0.5-y)*10}deg`);frame.style.setProperty('--frame-y',`${(x-.5)*14}deg`);frame.style.setProperty('--light-x',`${x*100}%`);frame.style.setProperty('--light-y',`${y*100}%`);frame.classList.add('is-tilted');});
    frame.addEventListener('pointerleave',()=>reset(frame));frame.addEventListener('blur',()=>reset(frame));
    frame.addEventListener('animationend',()=>card.classList.remove('is-entering'));
    enter.observe(card);
  });}
  new MutationObserver(bind).observe(grid,{childList:true});bind();
  document.addEventListener('corner:motion',()=>{if(!motionAllowed()){grid.querySelectorAll('.spatial-poster').forEach(reset);grid.querySelectorAll('.is-entering').forEach(card=>card.classList.remove('is-entering'));}});
}
