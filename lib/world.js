import * as THREE from '../vendor/three/three.module.min.js';
import {motionAllowed} from './motion.js';
import {external,hallsFor} from './catalog.mjs';

// 空間放映廳：往下捲就是往裡走。作品是空間裡的銀幕，一類作品一個廳。
// 內容全部來自 data/works.json；沒有 WebGL 或關掉動態時，原本的放映廊與作品清單照常可用。



const screenVertex=`
varying vec2 vUv;uniform float bend;
void main(){vUv=uv;vec3 p=position;p.z+=pow(p.x/3.8,2.)*bend;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const screenFragment=`
uniform sampler2D artwork;uniform vec2 crop;uniform float focus;uniform float reflected;uniform vec2 pointer;uniform float hover;varying vec2 vUv;
float rounded(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){
 float edge=1.-smoothstep(-.006,.006,rounded((vUv-.5)*vec2(1.77778,1.),vec2(.88889,.5),.02));
 if(edge<.01)discard;
 vec2 uv=(vUv-.5)*crop*(1.-.035*hover)+.5;
 vec3 col=texture2D(artwork,uv).rgb;
 col*=mix(.2,1.,focus);
 col*=1.-.12*pow(length((vUv-.5)*vec2(.8,1.)),2.);
 // 滑鼠帶著一道光掃過銀幕
 float sweep=exp(-pow((vUv.x-pointer.x)*3.2,2.))*exp(-pow((vUv.y-pointer.y)*2.2,2.));
 col+=vec3(.16,.14,.10)*sweep*hover*focus;
 float rim=pow(abs(vUv.x-.5)*2.,14.);col+=vec3(.10,.085,.055)*rim*.3*focus;
 float alpha=edge;
 if(reflected>.5){alpha*=pow(1.-vUv.y,2.2)*.34*(.25+.75*focus);col*=vec3(.7,.78,.74);}
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
}`;
const beamVertex=`
varying vec3 vN;varying vec3 vV;varying float vT;
void main(){vT=1.-uv.y;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const beamFragment=`
uniform vec3 tint;uniform float power;uniform float time;varying vec3 vN;varying vec3 vV;varying float vT;
void main(){
 float body=pow(abs(dot(vN,vV)),1.6);
 float along=smoothstep(0.,.12,vT)*(1.-.55*vT);
 float flicker=.92+.08*sin(time*9.+vT*14.);
 gl_FragColor=vec4(tint,body*along*power*flicker*.2);
}`;
const dustVertex=`
attribute float seed;uniform float time;uniform float scale;varying float vFade;
void main(){
 vec3 p=position;p.x+=sin(time*.11+seed*40.)*.5;p.y+=sin(time*.07+seed*71.)*.35;p.z+=cos(time*.09+seed*23.)*.5;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float d=-mv.z;vFade=smoothstep(.4,2.5,d)*(1.-smoothstep(14.,30.,d));
 gl_PointSize=scale*(.6+seed*1.6)/max(d,.6);
}`;
const dustFragment=`
uniform vec3 tint;varying float vFade;
void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,.05,r)*vFade*.5;gl_FragColor=vec4(tint,a);}`;

const smooth=x=>x*x*(3-2*x);
const clamp01=x=>Math.min(1,Math.max(0,x));

function averageColor(image){
 const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d',{willReadFrequently:true});
 g.drawImage(image,0,0,16,16);const d=g.getImageData(0,0,16,16).data;let r=0,gg=0,b=0;
 for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2];}
 const n=d.length/4,col=new THREE.Color(r/n/255,gg/n/255,b/n/255);
 // 太灰的片子也要有一點顏色，太亮的壓下來，整個廳才不會被染白
 const hsl={};col.getHSL(hsl);col.setHSL(hsl.h,Math.min(.75,Math.max(.32,hsl.s*1.5)),.42);
 return col;
}
function textTexture(text,sub,serif){
 const c=document.createElement('canvas');c.width=2048;c.height=640;const g=c.getContext('2d');
 g.textAlign='center';g.textBaseline='middle';
 let size=250;g.font=`500 ${size}px ${serif}`;
 while(g.measureText(text).width>1900&&size>90){size-=10;g.font=`500 ${size}px ${serif}`;}
 g.fillStyle='#efe6d2';g.fillText(text,1024,320);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

export async function initWorld(works){
 const host=document.querySelector('#world');
 if(!host||!works.length||new URLSearchParams(location.search).get('view')==='classic')return false;
 const stage=host.querySelector('.world-stage'),hud=host.querySelector('.world-hud');
 const el=name=>host.querySelector(`[data-world="${name}"]`);
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{return false;}
 if(!renderer.getContext())return false;

 // 走的順序：每個廳先看到廳名，再一面一面走過去
 const stops=[];
 hallsFor(works).map(h=>({id:h.id,name:h.name,line:h.title})).forEach(hall=>{const list=works.filter(w=>w.category===hall.id);if(!list.length)return;stops.push({hall,count:list.length});list.forEach(item=>stops.push({item,hall}));});
 const workStops=stops.filter(s=>s.item);
 let z=0;
 stops.forEach((s,i)=>{
  if(s.item){const n=workStops.indexOf(s);s.side=n%2?1:-1;s.z=z;z-=14;}
  else{z-=i?6:0;s.z=z;z-=14;}
 });
 const endZ=z;
 host.style.setProperty('--world-stops',String(stops.length));

 const base=new THREE.Color(0x0b110e),scene=new THREE.Scene();scene.fog=new THREE.Fog(base.clone(),13,48);
 const camera=new THREE.PerspectiveCamera(42,1,.1,90);
 renderer.setClearColor(base,1);renderer.domElement.setAttribute('aria-hidden','true');stage.prepend(renderer.domElement);
 const serif=getComputedStyle(document.documentElement).getPropertyValue('--serif')||'serif';
 try{await document.fonts.load(`500 200px ${serif}`,'故事影集音樂照片敘事程式動畫');}catch{}

 const loader=new THREE.TextureLoader();
 let textures;
 try{textures=await Promise.all(workStops.map(s=>loader.loadAsync(new URL('../'+(s.item.id==='longnight'?'assets/longnight-art.jpg':s.item.poster),import.meta.url).href)));}
 catch{renderer.dispose();renderer.domElement.remove();return false;}

 const geometry=new THREE.PlaneGeometry(7.6,4.275,40,1);
 const backGeometry=geometry.clone(),bp=backGeometry.attributes.position;
 for(let i=0;i<bp.count;i++)bp.setZ(i,Math.pow(bp.getX(i)/3.8,2)*.4-.05);
 const backMaterial=new THREE.MeshBasicMaterial({color:0x10171a});
 const beamGeometry=new THREE.CylinderGeometry(.12,1,1,40,1,true);beamGeometry.translate(0,-.5,0);
 const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;{const g=poolCanvas.getContext('2d'),gr=g.createRadialGradient(64,64,2,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.45,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}
 const poolTexture=new THREE.CanvasTexture(poolCanvas),poolGeometry=new THREE.PlaneGeometry(15,9);
 const screens=[];
 workStops.forEach((s,i)=>{
  const texture=textures[i];texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const aspect=texture.image.width/texture.image.height;
  const uniforms={artwork:{value:texture},crop:{value:new THREE.Vector2(Math.min(1,(16/9)/aspect),Math.min(1,aspect/(16/9)))},bend:{value:.4},focus:{value:.2},reflected:{value:0},pointer:{value:new THREE.Vector2(.5,.5)},hover:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:screenVertex,fragmentShader:screenFragment,transparent:true});
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,material);mesh.userData.stop=s;group.add(mesh);
  const back=new THREE.Mesh(backGeometry,backMaterial);back.scale.setScalar(1.012);group.add(back);
  const mirrorMaterial=material.clone();mirrorMaterial.uniforms.artwork.value=texture;mirrorMaterial.uniforms.reflected.value=1;mirrorMaterial.depthWrite=false;
  const mirror=new THREE.Mesh(geometry,mirrorMaterial);mirror.scale.y=-1;scene.add(group,mirror);
  const beamMaterial=new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color()},power:{value:0},time:{value:0}},vertexShader:beamVertex,fragmentShader:beamFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(beamGeometry,beamMaterial);scene.add(beam);
  const pool=new THREE.Mesh(poolGeometry,new THREE.MeshBasicMaterial({map:poolTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));pool.rotation.x=-Math.PI/2;pool.renderOrder=3;scene.add(pool);
  Object.assign(s,{pool,group,mesh,material,mirror,mirrorMaterial,beam,beamMaterial,mood:averageColor(texture.image),weight:0});
  screens.push(mesh);
 });
 stops.filter(s=>!s.item).forEach(s=>{
  const material=new THREE.MeshBasicMaterial({map:textTexture(s.hall.line,`${s.hall.name}　${s.count} 部`,serif),transparent:true,depthWrite:false,fog:false});
  s.sign=new THREE.Mesh(new THREE.PlaneGeometry(12,3.75),material);s.sign.position.set(0,3.5,s.z);scene.add(s.sign);
 });
 // 濕地板：鏡像的銀幕壓在一層深色地面下
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,Math.abs(endZ)+80),new THREE.MeshBasicMaterial({color:0x0b110e,transparent:true,opacity:.38,depthWrite:false}));
 floor.rotation.x=-Math.PI/2;floor.position.set(0,-.86,endZ/2);floor.renderOrder=2;scene.add(floor);
 // 灰塵：整條走道都有，被當下那部片的顏色照亮
 const dustCount=Math.round((Math.abs(endZ)+30)*9),dustPos=new Float32Array(dustCount*3),dustSeed=new Float32Array(dustCount);
 for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*16;dustPos[i*3+1]=Math.random()*6.2-.6;dustPos[i*3+2]=12+Math.random()*(endZ-24);dustSeed[i]=Math.random();}
 const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPos,3));dustGeometry.setAttribute('seed',new THREE.BufferAttribute(dustSeed,1));
 const dustMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},scale:{value:60},tint:{value:new THREE.Color(0xd9c9a0)}},vertexShader:dustVertex,fragmentShader:dustFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;scene.add(dust);

 let width=1,height=1,mobile=false;
 function layout(){
  width=stage.clientWidth;height=stage.clientHeight;mobile=width<700;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.fov=mobile?58:42;camera.updateProjectionMatrix();
  dustMaterial.uniforms.scale.value=height*renderer.getPixelRatio()*.05;
  workStops.forEach(s=>{
   const x=s.side*(mobile?.55:3.9),yaw=-s.side*(mobile?.16:.44),scale=mobile?.56:1;
   s.x=x;s.group.position.set(x,1.55,s.z);s.group.rotation.set(0,yaw,0);s.group.scale.setScalar(scale);
   s.mirror.position.set(x,-1.72-1.55,s.z);s.mirror.rotation.set(0,yaw,0);s.mirror.scale.set(scale,-scale,scale);
   s.pool.position.set(x*.8,-.84,s.z+2.6);s.pool.scale.setScalar(scale);
   s.camZ=s.z+(mobile?7:12.4);
   // 放映機在走道另一側的上方，光束打到銀幕中央
   const from=new THREE.Vector3(-s.side*(mobile?2.4:6.4),5.4,s.z+5.2),to=new THREE.Vector3(x,1.55,s.z),dir=to.clone().sub(from),len=dir.length();
   s.beam.position.copy(from);s.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),dir.normalize());s.beam.scale.set(2.3*scale,len,2.3*scale);
  });
  stops.forEach(s=>{if(!s.item){s.camZ=s.z+(mobile?15:13.5);s.sign.scale.setScalar(mobile?.5:1);}});
 }
 layout();

 let progress=0,u=0,current=null,visible=false,frame=0,last=0,time=0,px=0,py=0,tx=0,ty=0,hovered=null,down=null;
 const mood=new THREE.Color(0x56634b),moodNow=mood.clone(),fogNow=base.clone();
 const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const position=k=>k/(stops.length-1);
 function scrollToStop(k,behavior='smooth'){
  const top=host.getBoundingClientRect().top+scrollY,travel=host.offsetHeight-innerHeight;
  scrollTo({top:top+position(k)*travel,behavior:motionAllowed()?behavior:'instant'});
 }
 function readScroll(){
  const r=host.getBoundingClientRect(),travel=host.offsetHeight-innerHeight;
  progress=travel>0?clamp01(-r.top/travel):0;
 }
 function setCurrent(stop){
  if(stop===current)return;current=stop;
  const n=workStops.indexOf(stop);
  el('hall').textContent=stop.hall.name;
  if(stop.item){
   const item=stop.item;el('title').textContent=item.title;el('meta').textContent=item.subtitle||item.duration||'';
   const play=el('play');play.href=item.src||external(item.episodes?.[0]?.youtubeId||item.youtubeId);play.dataset.play=item.id;play.setAttribute('aria-label',`播放${item.title}`);
   el('note').textContent=item.disclosure||'';
   el('count').textContent=`${String(n+1).padStart(2,'0')}／${String(workStops.length).padStart(2,'0')}`;
   hud.dataset.kind='work';hud.dataset.side=stop.side>0?'right':'left';host.dataset.current=item.id;
  }else{hud.dataset.kind='hall';el('count').textContent=`${stop.count} 部`;host.dataset.current='hall-'+stop.hall.id;}
  [...rail.children].forEach((b,i)=>b.setAttribute('aria-current',String(stops[i]===stop)));
 }
 const rail=el('rail');
 rail.replaceChildren(...stops.map((s,i)=>{const b=document.createElement('button');b.type='button';b.dataset.kind=s.item?'work':'hall';b.setAttribute('aria-label',s.item?`走到${s.item.title}`:`走到${s.hall.name}廳`);b.title=s.item?s.item.title:s.hall.name;b.addEventListener('click',()=>scrollToStop(i));return b;}));
 el('prev').addEventListener('click',()=>scrollToStop(Math.max(0,Math.round(u)-1)));
 el('next').addEventListener('click',()=>scrollToStop(Math.min(stops.length-1,Math.round(u)+1)));
 stage.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowDown'){event.preventDefault();scrollToStop(Math.min(stops.length-1,Math.round(u)+1));}
  if(event.key==='ArrowLeft'||event.key==='ArrowUp'){event.preventDefault();scrollToStop(Math.max(0,Math.round(u)-1));}
  if(event.key==='Enter'&&current?.item){event.preventDefault();el('play').click();}
 });
 function pick(event){
  const r=stage.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height*2-1));
  raycaster.setFromCamera(ndc,camera);const hit=raycaster.intersectObjects(screens,false)[0];return hit||null;
 }
 stage.addEventListener('pointermove',event=>{
  const r=stage.getBoundingClientRect();
  if(event.pointerType!=='touch'){tx=((event.clientX-r.left)/r.width-.5)*2;ty=((event.clientY-r.top)/r.height-.5)*2;}
  const hit=pick(event);hovered=hit?hit.object.userData.stop:null;
  if(hit)hovered.material.uniforms.pointer.value.copy(hit.uv);
  stage.style.cursor=hovered?'pointer':'';wake();
 });
 stage.addEventListener('pointerleave',()=>{tx=ty=0;hovered=null;});
 stage.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
 stage.addEventListener('pointerup',event=>{
  if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>8||event.target.closest('.world-hud a,.world-hud button')){down=null;return;}
  down=null;const hit=pick(event);if(!hit)return;const stop=hit.object.userData.stop;
  if(stop===current&&stop.weight>.6)el('play').click();else scrollToStop(stops.indexOf(stop));
 });

 function draw(now){
  frame=0;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const moving=motionAllowed()&&!document.querySelector('dialog[open]');
  readScroll();const target=progress*(stops.length-1);
  u=moving?u+(target-u)*(1-Math.exp(-dt*6)):target;if(Math.abs(target-u)<.0004)u=target;
  if(moving)time+=dt;
  px+=(tx-px)*(1-Math.exp(-dt*4));py+=(ty-py)*(1-Math.exp(-dt*4));
  const i=Math.min(stops.length-2,Math.floor(u)),f=smooth(u-i),a=stops[i],b=stops[i+1];
  const camZ=a.camZ+(b.camZ-a.camZ)*f;
  let sideX=0,lookX=0;mood.setRGB(0,0,0);let total=0;
  workStops.forEach(s=>{
   const k=stops.indexOf(s),w=smooth(clamp01(1-Math.abs(u-k)));s.weight=w;
   const near=clamp01(1-Math.abs(camZ-s.camZ)/34);
   const hot=s===hovered?1:0,un=s.material.uniforms;
   un.focus.value=.16+.84*w;un.hover.value+=(hot-un.hover.value)*.12;
   s.mirrorMaterial.uniforms.focus.value=un.focus.value;
   // 走到面前的那一面會稍微轉過來對著你，也跟著滑鼠偏一點
   const baseYaw=-s.side*(mobile?.16:.44);s.group.rotation.y=baseYaw*(1-.42*w)+px*.05*w;s.group.rotation.x=-py*.03*w;
   s.group.position.y=1.55+Math.sin(time*.5+k)*.035*w;s.mirror.rotation.y=s.group.rotation.y;
   s.beamMaterial.uniforms.power.value=w*near;s.beamMaterial.uniforms.tint.value.copy(s.mood).lerp(new THREE.Color(0xfff2d6),.55);s.beamMaterial.uniforms.time.value=time;
   s.pool.material.opacity=.2*w;s.pool.material.color.copy(s.mood).lerp(new THREE.Color(0xffe9c0),.35);s.pool.visible=w>.01;
   s.group.visible=s.mirror.visible=near>0;s.beam.visible=w>.01;
   sideX+=-s.side*w;lookX+=s.x*w;mood.r+=s.mood.r*w;mood.g+=s.mood.g*w;mood.b+=s.mood.b*w;total+=w;
  });
  stops.forEach(s=>{if(s.item)return;const d=camZ-s.z;s.sign.material.opacity=clamp01((d-2.2)/4)*clamp01((21-d)/6);s.sign.visible=s.sign.material.opacity>.01;});
  if(total<.999){const rest=1-Math.min(1,total);mood.r+=.34*rest;mood.g+=.39*rest;mood.b+=.3*rest;}
  moodNow.lerp(mood,1-Math.exp(-dt*3));
  fogNow.copy(base).lerp(moodNow,.035);scene.fog.color.copy(fogNow);renderer.setClearColor(fogNow,1);
  floor.material.color.copy(base).lerp(moodNow,.1);dustMaterial.uniforms.tint.value.copy(moodNow).lerp(new THREE.Color(0xf3e6c4),.5);dustMaterial.uniforms.time.value=time;
  host.style.setProperty('--world-mood',`#${moodNow.getHexString()}`);
  camera.position.set(sideX*(mobile?.35:1.5)+px*.4,1.95-py*.18+Math.sin(time*.9)*.012,camZ);
  camera.lookAt(lookX*(mobile?.6:.25)+px*.25,1.75-py*.1,camZ-9.5);
  const nearest=stops[Math.round(u)];setCurrent(nearest);
  hud.style.setProperty('--world-focus',String(nearest.item?clamp01((nearest.weight-.35)/.5):clamp01(1-Math.abs(u-Math.round(u))*2.4)));
  renderer.render(scene,camera);host.dataset.renderer='webgl';host.dataset.moving=String(moving);
  if(visible&&!document.hidden&&(moving||Math.abs(target-u)>.0004))frame=requestAnimationFrame(draw);
 }
 function wake(){if(!frame&&visible){last=0;frame=requestAnimationFrame(draw);}}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(host);
 addEventListener('scroll',wake,{passive:true});
 new ResizeObserver(()=>{layout();wake();}).observe(stage);
 document.addEventListener('corner:motion',wake);document.addEventListener('visibilitychange',wake);
 const dialog=document.querySelector('#player-dialog');if(dialog)new MutationObserver(wake).observe(dialog,{attributes:true,attributeFilter:['open']});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.hidden=true;document.documentElement.dataset.world='off';document.dispatchEvent(new CustomEvent('corner:world-lost'));});
 host.hidden=false;document.documentElement.dataset.world='on';
 readScroll();u=progress*(stops.length-1);setCurrent(stops[Math.round(u)]);visible=true;wake();
 if(location.hash==='#world')host.scrollIntoView({block:'start',behavior:'instant'});
 return true;
}
