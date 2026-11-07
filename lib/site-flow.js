import {motionAllowed} from './motion.js';
// Native scrolling remains in charge; this only reflects location and reveals content.
export function initSiteFlow(){
  const header=document.querySelector('.header');if(!header)return;
  const links=[...header.querySelectorAll('nav a[href^="#"]')];
  const sections=links.map(link=>({link,section:document.querySelector(link.hash)})).filter(item=>item.section);
  let queued=false;
  function update(){queued=false;let current;
    for(const item of sections)if(item.section.getBoundingClientRect().top<=innerHeight*.4)current=item;
    for(const item of sections){if(item===current)item.link.setAttribute('aria-current','location');else item.link.removeAttribute('aria-current');}
    const total=document.documentElement.scrollHeight-innerHeight;
    header.style.setProperty('--reading-progress',String(total>0?Math.min(1,Math.max(0,scrollY/total)):0));
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(document.body);schedule();
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){
      if(motionAllowed())entry.target.classList.add('is-arriving');
      observer.unobserve(entry.target);
    }
  },{threshold:.12});
  document.querySelectorAll('.intro,.section-heading,.sound-heading,.sound-library-heading,.about-layout,.share-site').forEach(node=>{
    observer.observe(node);node.addEventListener('animationend',()=>node.classList.remove('is-arriving'));
  });
  document.addEventListener('corner:motion',()=>{if(!motionAllowed())document.querySelectorAll('.is-arriving').forEach(node=>node.classList.remove('is-arriving'));});
}
