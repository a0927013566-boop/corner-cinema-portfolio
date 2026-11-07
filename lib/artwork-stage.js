import * as THREE from '../vendor/three/three.module.min.js';
import {motionAllowed} from './motion.js';
// Original film above a landscape drawn from this collection's real audio.
export async function createArtworkStage(host,{peaks:initialPeaks,sample,audio,current}) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch {return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x111814,0);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,60);
  const texture=await new THREE.TextureLoader().loadAsync(new URL('../assets/longnight-art.jpg',import.meta.url).href);
  texture.colorSpace=THREE.SRGBColorSpace;
  // Cover the 16:9 projection without stretching the original 1600 × 1274 still.
  texture.repeat.y=(texture.image.width/texture.image.height)/(16/9);texture.offset.y=(1-texture.repeat.y)/2;
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const display=new THREE.Group();display.position.set(.3,.9,-1.4);display.rotation.y=-.09;scene.add(display);
  const geometry=new THREE.PlaneGeometry(7.3,4.106,48,1),vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)vertices.setZ(i,Math.pow(vertices.getX(i)/3.65,2)*.32);
  vertices.needsUpdate=true;
  const art=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));display.add(art);
  const reflection=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false,transparent:true,opacity:.065,depthWrite:false}));
  reflection.scale.y=-1;reflection.position.y=-4.75;display.add(reflection);
  // Contours share a single surface. Their depth, occlusion and amplitudes are real geometry.
  const rows=36,columns=100,positions=new Float32Array(rows*columns*3),lines=[];
  for(let row=0;row<rows;row++){
    const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(columns*3),3));
    const mix=row/(rows-1),colour=new THREE.Color(0x6a9c91).lerp(new THREE.Color(0xe6c382),mix);
    const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:colour,transparent:true,opacity:.12+mix*.34,depthWrite:false}));scene.add(line);lines.push(line);
  }
  const surfaceGeometry=new THREE.BufferGeometry();surfaceGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const indices=[];
  for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++){const a=j*columns+i;indices.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);}
  surfaceGeometry.setIndex(indices);
  scene.add(new THREE.Mesh(surfaceGeometry,new THREE.MeshBasicMaterial({color:0x598e7a,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false})));
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(151,181,141,.24)');gradient.addColorStop(1,'rgba(151,181,141,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=-1.85;scene.add(glow);
  let film,filmTexture,filmWanted=false,filmFailed=false;
  function setImage(map){for(const m of [art,reflection])if(m.material.map!==map){m.material.map=map;m.material.needsUpdate=true;}}
  function syncFilm(wanted){
    if(wanted&&!filmFailed){
      if(!film){film=document.createElement('video');film.muted=true;film.playsInline=true;film.preload='metadata';film.src=new URL('../media/longnight-web.mp4',import.meta.url).href;filmTexture=new THREE.VideoTexture(film);filmTexture.colorSpace=THREE.SRGBColorSpace;
        film.addEventListener('loadedmetadata',()=>{film.currentTime=Math.min(audio.currentTime,film.duration-.1);});
        film.addEventListener('error',()=>{filmFailed=true;setImage(texture);});}
      if(!filmWanted)film.play().catch(()=>{filmFailed=true;setImage(texture);});
      if(film.readyState>=2)setImage(filmTexture);
    }else if(film){film.pause();setImage(texture);}
    filmWanted=wanted;host.dataset.filmPlaying=String(Boolean(wanted&&film&&!film.paused&&film.currentTime>0));
  }
  audio.addEventListener('timeupdate',()=>{if(filmWanted&&film?.readyState>=1&&Math.abs(film.currentTime-audio.currentTime)>.5)film.currentTime=Math.min(audio.currentTime,film.duration-.1);});
  audio.addEventListener('pause',()=>{film?.pause();filmWanted=false;wake();});
  host.append(renderer.domElement);
  let visible=true,lost=false,frameId=0,last=0,time=0,px=0,py=0,tx=0,ty=0,energy=0,peaks=initialPeaks;
  const bands=new Float32Array(columns);
  function draw(now=0){frameId=0;if(lost)return;const moving=motionAllowed()&&visible&&!document.hidden;
    if(moving&&now-last<32){frameId=requestAnimationFrame(draw);return;}const dt=last?Math.min((now-last)/1000,.08):0;last=now;
    if(moving&&!audio.paused)time+=dt;
    syncFilm(moving&&!audio.paused&&current()?.id==='track-07');
    const freq=moving?sample():null;host.dataset.audioReactive=String(Boolean(freq?.some(v=>v>0)));host.dataset.animating=String(moving);
    const level=freq?freq.slice(2,32).reduce((a,b)=>a+b,0)/(30*255):0;energy+=(level-energy)*.14;
    px+=(tx-px)*.055;py+=(ty-py)*.055;
    camera.position.x=moving?px*.42:0;camera.position.y=3.1+(moving?py*.2:0);camera.lookAt(0,-.15,0);
    for(let i=0;i<columns;i++){
      const t=i/(columns-1),peak=peaks[Math.floor(t*(peaks.length-1))]||.15;
      const target=freq?freq[2+Math.floor(t*85)]/255:peak*.3;
      bands[i]+=(target-bands[i])*.15;
      for(let row=0;row<rows;row++){
        const z=row/(rows-1),x=(t-.5)*13,edge=Math.pow(Math.sin(t*Math.PI),1.3);
        const ridge=Math.sin(t*9+z*3-time*.55)*.35+Math.cos(t*15-z*4+time*.22)*.16;
        const y=-1.72+edge*(.32+ridge+bands[i]*(.45+Math.sin(z*Math.PI)*1.35));
        const k=(row*columns+i)*3;positions[k]=x;positions[k+1]=y;positions[k+2]=-3.4+z*8;
        lines[row].geometry.attributes.position.setXYZ(i,x,y,positions[k+2]);
      }
    }
    lines.forEach((line,i)=>{line.geometry.attributes.position.needsUpdate=true;line.material.opacity=(.12+i/(rows-1)*.34)+energy*.1;});
    surfaceGeometry.attributes.position.needsUpdate=true;glow.material.opacity=.65+energy*.35;
    renderer.render(scene,camera);host.dataset.ready='true';if(moving)frameId=requestAnimationFrame(draw);
  }
  function wake(){if(!frameId&&!lost)frameId=requestAnimationFrame(draw);}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=camera.aspect<1.3?12.8:10.4;camera.updateProjectionMatrix();wake();}
  new ResizeObserver(resize).observe(host);resize();
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2;});host.addEventListener('pointerleave',()=>{tx=ty=0;});
  document.addEventListener('visibilitychange',wake);document.addEventListener('corner:motion',wake);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;film?.pause();filmWanted=false;cancelAnimationFrame(frameId);frameId=0;host.dataset.ready='false';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;wake();});
  return {setPeaks(value){peaks=value;wake();},setVisible(value){visible=value;wake();}};
}
