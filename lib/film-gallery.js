import {motionAllowed} from './motion.js';
import {external} from './catalog.mjs';

// All labels and textures come from the existing public catalogue.
export function initFilmGallery(works) {
  const host=document.querySelector('#film-gallery');
  if(!host||!works.length)return;
  const items=[...works].sort((a,b)=>(a.id==='longnight'?-1:b.id==='longnight'?1:0));
  const stage=host.querySelector('.film-space'), fallback=host.querySelector('.film-fallback');
  const title=host.querySelector('.film-title'),meta=host.querySelector('.film-meta'),play=host.querySelector('.film-play'),count=host.querySelector('.film-count');
  const tabs=host.querySelector('.film-index');
  let index=0,position=0,visible=false,hover=false,focused=false,drag=null,frame=0,last=0,elapsed=0,autoTime=2.6,auto=true,scene=null;
  const wrap=n=>(n%items.length+items.length)%items.length;
  const distance=(i,p)=>{let d=wrap(i-p);if(d>items.length/2)d-=items.length;return d;};
  const href=item=>item.src||external(item.episodes?.[0]?.youtubeId||item.youtubeId);
  fallback.replaceChildren(...items.map((item,i)=>{
    const card=document.createElement('button');card.type='button';card.className='film-panel';card.tabIndex=-1;card.setAttribute('aria-hidden','true');card.dataset.select=i;
    const img=document.createElement('img');img.src=item.id==='longnight'?'assets/longnight-art.jpg':item.poster;img.alt='';img.draggable=false;card.append(img);return card;
  }));
  tabs.replaceChildren(...items.map((item,i)=>{
    const button=document.createElement('button');button.type='button';const image=document.createElement('img');image.src=item.poster;image.alt='';image.loading='lazy';const label=document.createElement('span');label.textContent=item.title;button.append(image,label);button.dataset.select=i;button.setAttribute('aria-label',`選擇${item.title}`);return button;
  }));
  function update(){
    const item=items[wrap(index)];title.textContent=item.title;meta.textContent=`${item.label} / ${item.subtitle||item.duration||''}`;
    play.href=href(item);play.dataset.play=item.id;play.setAttribute('aria-label',`播放${item.title}`);
    count.textContent=`${String(wrap(index)+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    host.dataset.current=item.id;
    [...tabs.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===wrap(index))));
  }
  function select(next,user=true){index=next;if(user){auto=false;host.dataset.auto='false';}autoTime=0;update();if(!motionAllowed())position=index;wake();}
  function step(n){select(index+n);}
  host.querySelector('[data-film-prev]').addEventListener('click',()=>step(-1));
  host.querySelector('[data-film-next]').addEventListener('click',()=>step(1));
  host.addEventListener('click',event=>{const b=event.target.closest('[data-select]');if(!b)return;const n=Number(b.dataset.select);select(index+distance(n,index));});
  stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}if(event.key==='Enter'){event.preventDefault();play.click();}});
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:position,moved:false,vertical:false};auto=false;host.dataset.auto='false';stage.setPointerCapture(event.pointerId);stage.dataset.dragging='true';wake();
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>10){drag.vertical=true;return;}
    if(drag.vertical)return;
    if(Math.abs(dx)>8)drag.moved=true;
    if(drag.moved){position=drag.start-dx/(stage.clientWidth*.36);wake();}
  });
  function end(event){
    if(!drag||event.pointerId!==drag.id)return;
    const old=drag;drag=null;stage.dataset.dragging='false';
    if(event.type==='pointercancel'||old.vertical){select(index);return;}
    if(old.moved){select(Math.round(position));return;}
    // Click the centre to play, either outer third to bring that frame forward.
    const x=(event.clientX-stage.getBoundingClientRect().left)/stage.clientWidth;
    if(x<.28)step(-1);else if(x>.72)step(1);else play.click();
  }
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  // Selection is handled on pointerup; suppress the synthetic button click after a drag.
  stage.addEventListener('click',e=>e.preventDefault(),true);
  host.addEventListener('pointerenter',()=>{hover=true;autoTime=0;});host.addEventListener('pointerleave',()=>{hover=false;});
  host.addEventListener('focusin',()=>{focused=true;autoTime=0;});host.addEventListener('focusout',()=>{focused=host.contains(document.activeElement);queueMicrotask(()=>{focused=host.contains(document.activeElement);});});
  function draw(now){
    frame=0;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    const moving=motionAllowed()&&visible&&!document.hidden&&!document.querySelector('dialog[open]');
    if(moving){elapsed+=dt;if(auto&&!hover&&!focused&&!drag){autoTime+=dt;if(autoTime>5.8)select(index+1,false);}}
    if(!drag){position=motionAllowed()?position+(index-position)*(1-Math.exp(-dt*7)):index;if(Math.abs(index-position)<.0002)position=index;}
    const offsets=items.map((_,i)=>distance(i,position));
    [...fallback.children].forEach((card,i)=>{
      const d=offsets[i],a=Math.abs(d);card.style.setProperty('--x',`${d*76}%`);card.style.setProperty('--z',`${-a*165}px`);card.style.setProperty('--yaw',`${-d*32}deg`);card.style.opacity=a>2.4?'0':'1';card.firstElementChild.style.filter=`brightness(${1-Math.min(a,2)*.2})`; card.style.zIndex=String(10-Math.round(a*2));
    });
    scene?.render(offsets,elapsed,moving);
    host.dataset.moving=String(moving);host.dataset.auto=String(auto&&moving&&!hover&&!focused);
    if(visible&&!document.hidden&&(moving||Math.abs(position-index)>.0002||drag))frame=requestAnimationFrame(draw);
  }
  function wake(){if(!frame){last=0;frame=requestAnimationFrame(draw);}}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();},{threshold:.1}).observe(host);
  document.addEventListener('corner:motion',()=>{autoTime=0;if(!motionAllowed())position=index;wake();});
  document.addEventListener('visibilitychange',wake);
  new MutationObserver(wake).observe(document.querySelector('#player-dialog'),{attributes:true,attributeFilter:['open']});
  new ResizeObserver(()=>{scene?.resize();wake();}).observe(stage);
  update();host.hidden=false;if(location.hash==='#film-gallery')host.scrollIntoView({block:'start',behavior:'instant'});wake();
  // Keep the equivalent DOM perspective view until every texture and the renderer are ready.
  const loader=new IntersectionObserver(async entries=>{
    if(!entries[0].isIntersecting)return;loader.disconnect();
    try{const {createFilmScene}=await import('./film-scene.js?v=cinematic-1');scene=await createFilmScene(stage,items);wake();}catch{host.dataset.renderer='css';}
  },{rootMargin:'250px'});loader.observe(host);
}
