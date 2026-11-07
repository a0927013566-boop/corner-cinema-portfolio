import * as THREE from '../vendor/three/three.module.min.js';
import {RoomEnvironment} from '../vendor/three/RoomEnvironment.js';
import {motionAllowed} from './motion.js';
// Original work, presented as a physical image plane. No reference-site assets.
export async function createArtworkStage(host,{peaks:initialPeaks,sample,audio,current}) {
  let renderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'}); } catch {return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x111814,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);
  camera.position.set(.3,1.3,10);camera.lookAt(0,0,0);
  const envGen=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=envGen.fromScene(room,.04);scene.environment=env.texture;room.dispose();envGen.dispose();
  const texture=await new THREE.TextureLoader().loadAsync(new URL('../assets/longnight.jpg',import.meta.url).href);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const display=new THREE.Group();display.rotation.set(-.02,-.23,-.018);scene.add(display);
  // Bevelled outer frame, with a separate image surface so the image keeps its colours.
  const shape=new THREE.Shape();const w=6,h=3.48,r=.08;
  shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1}),new THREE.MeshPhysicalMaterial({color:0x313b36,metalness:.86,roughness:.2,clearcoat:1,clearcoatRoughness:.1}));frame.castShadow=true;display.add(frame);
  const art=new THREE.Mesh(new THREE.PlaneGeometry(5.82,3.274),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));art.position.z=.192;display.add(art);
  // Very thin glazing catches moving studio light without covering the image.
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(5.82,3.274),new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:.05,roughness:.06,transparent:true,opacity:.035,clearcoat:1,clearcoatRoughness:.04,depthWrite:false}));glass.position.z=.2;display.add(glass);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.95,3.43,.17)),new THREE.LineBasicMaterial({color:0xa18d64,transparent:true,opacity:.5}));outline.position.z=.075;display.add(outline);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.06;floor.receiveShadow=true;scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xf5eacf,0x23392b,1.1));
  const key=new THREE.DirectionalLight(0xffe6bb,3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.radius=5;key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.04;scene.add(key);
  const rim=new THREE.DirectionalLight(0xcce5de,2);rim.position.set(4,2,-2);scene.add(rim);
  const glow=new THREE.PointLight(0xf4c775,1.5,8);glow.position.set(0,-1.5,1);scene.add(glow);
  // A spatial trace sits below the image; real audio frequencies move the trace.
  const count=96,points=new Float32Array(count*3),waveGeometry=new THREE.BufferGeometry();waveGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const wave=new THREE.Line(waveGeometry,new THREE.LineBasicMaterial({color:0xd6ba80,transparent:true,opacity:.42}));wave.position.set(0,-1.9,.6);scene.add(wave);
  // The featured work can play on the physical screen. Muted video follows the one audio source.
  let film,filmTexture,filmWanted=false,filmFailed=false;
  function syncFilm(wanted) {
    if(wanted && !filmFailed) {
      if(!film) {
        film=document.createElement('video');film.muted=true;film.playsInline=true;film.preload='metadata';
        film.src=new URL('../media/longnight-web.mp4',import.meta.url).href;
        filmTexture=new THREE.VideoTexture(film);filmTexture.colorSpace=THREE.SRGBColorSpace;
        film.addEventListener('loadedmetadata',()=>{film.currentTime=Math.min(audio.currentTime,film.duration-.1);});
        film.addEventListener('error',()=>{filmFailed=true;art.material.map=texture;art.material.needsUpdate=true;});
      }
      if(!filmWanted) film.play().catch(()=>{filmFailed=true;});
      if(film.readyState>=2&&art.material.map!==filmTexture){art.material.map=filmTexture;art.material.needsUpdate=true;}
    } else if(film) {film.pause();if(art.material.map!==texture){art.material.map=texture;art.material.needsUpdate=true;}}
    filmWanted=wanted;
    host.dataset.filmPlaying=String(Boolean(wanted&&film&&!film.paused&&film.currentTime>0));
  }
  audio.addEventListener('timeupdate',()=>{if(filmWanted&&film?.readyState>=1&&Math.abs(film.currentTime-audio.currentTime)>.5)film.currentTime=Math.min(audio.currentTime,film.duration-.1);});
  audio.addEventListener('pause',()=>{film?.pause();filmWanted=false;});
  host.append(renderer.domElement);
  let visible=true,lost=false,frameId=0,last=0,time=0,px=0,py=0,tx=0,ty=0,energy=0,peaks=initialPeaks;
  function draw(now=0){frameId=0;if(lost)return;const moving=motionAllowed()&&visible&&!document.hidden;if(moving&&now-last<32){frameId=requestAnimationFrame(draw);return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(moving)time+=dt;
    syncFilm(moving&&!audio.paused&&current()?.id==='track-07');
    const freq=moving?sample():null;const response=Boolean(freq?.some(v=>v>0));host.dataset.audioReactive=String(response);host.dataset.animating=String(moving);
    const level=freq?freq.slice(2,20).reduce((a,b)=>a+b,0)/(18*255):0;energy+=(level-energy)*.08;
    px+=(tx-px)*.055;py+=(ty-py)*.055;
    display.rotation.y=-.23+(moving?px*.22+Math.sin(time*.36)*.055:0);display.rotation.x=-.02+(moving?py*.1:0);display.position.y=moving?Math.sin(time*.65)*.065:0;
    glow.intensity=1.5+energy*5;glass.material.opacity=.035+energy*.035;key.position.x=-3+(moving?px*1.5:0);
    for(let i=0;i<count;i++){const t=i/(count-1),amp=freq?freq[2+Math.floor(t*65)]/255:0;points[i*3]=(t-.5)*6.5;points[i*3+1]=Math.sin(t*Math.PI)*(amp*.2+(peaks[Math.floor(t*(peaks.length-1))]||0)*.015);points[i*3+2]=Math.sin(t*Math.PI)*.65;}
    waveGeometry.attributes.position.needsUpdate=true;renderer.render(scene,camera);host.dataset.ready='true';if(moving)frameId=requestAnimationFrame(draw);
  }
  function wake(){if(!frameId&&!lost)frameId=requestAnimationFrame(draw);}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=camera.aspect<1.3?11.2:9.5;camera.updateProjectionMatrix();wake();}
  new ResizeObserver(resize).observe(host);resize();
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2;});host.addEventListener('pointerleave',()=>{tx=ty=0;});
  document.addEventListener('visibilitychange',wake);document.addEventListener('corner:motion',wake);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;film?.pause();filmWanted=false;cancelAnimationFrame(frameId);frameId=0;host.dataset.ready='false';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;wake();});
  return {setPeaks(value){peaks=value;wake();},setVisible(value){visible=value;wake();}};
}
