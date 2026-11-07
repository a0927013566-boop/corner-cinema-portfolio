import * as THREE from '../vendor/three/three.module.min.js';
import {RoomEnvironment} from '../vendor/three/RoomEnvironment.js';
import {motionAllowed} from './motion.js';
// An original ribbon of 80 metal fins. Its resting silhouette comes from the track's RMS envelope.
export async function createSculpture(host,{peaks:initialPeaks,sample}) {
  let renderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'}); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x111814,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.93;
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(36,1,.1,100);
  camera.position.set(0,3.5,10.8); camera.lookAt(0,.1,0);
  const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.05);scene.environment=env.texture;room.dispose();pmrem.dispose();
  const sculpture=new THREE.Group();scene.add(sculpture);sculpture.rotation.set(.08,-.32,.12);
  const geometry=new THREE.BoxGeometry(.037,1,.42);
  const gold=new THREE.Color('#bd934e'), cream=new THREE.Color('#e5ce90');
  const fins=[];let peaks=initialPeaks.length?initialPeaks:Array(64).fill(.4);
  for(let i=0;i<80;i++) {
    const t=i/79;
    const material=new THREE.MeshStandardMaterial({color:gold.clone().lerp(cream,Math.sin(t*Math.PI)*.55),metalness:.94,roughness:.21});
    const fin=new THREE.Mesh(geometry,material);
    fin.position.set((t-.5)*7.2, Math.sin(t*Math.PI*2)*.72, Math.sin(t*Math.PI*2)*1.45);
    fin.rotation.y=Math.cos(t*Math.PI*2)*.8;
    fin.rotation.z=Math.sin(t*Math.PI*2)*.4;
    sculpture.add(fin);fins.push(fin);
  }
  scene.add(new THREE.HemisphereLight(0xf0e9d2,0x344934,.8));
  const key=new THREE.DirectionalLight(0xffe4a6,1.8);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0xcadcd1,2);rim.position.set(5,1,-2);scene.add(rim);
  host.append(renderer.domElement);
  let visible=true,lost=false,frame=0,last=0,elapsed=0,px=0,py=0,tx=0,ty=0;
  function draw(time=0) {
    frame=0;if(lost)return;
    const moving=motionAllowed() && visible && !document.hidden;
    if(moving && time-last<32) { frame=requestAnimationFrame(draw);return; }
    const delta=last?Math.min((time-last)/1000,.05):0;last=time;if(moving)elapsed+=delta;
    const freq=moving?sample():null;
    host.dataset.audioReactive=String(Boolean(freq?.some(v=>v>0)));
    host.dataset.animating=String(moving);
    px+=(tx-px)*.06;py+=(ty-py)*.06;
    sculpture.rotation.y=-.32+(moving?Math.sin(elapsed*.19)*.1+px*.17:0);
    sculpture.rotation.x=.08+(moving?py*.1:0);
    sculpture.position.y=moving?Math.sin(elapsed*.55)*.055:0;
    fins.forEach((fin,i)=>{
      const p=peaks[Math.floor(i/80*peaks.length)] || 0;
      const energy=freq?freq[2+Math.floor(i/80*65)]/255:0;
      const taper=.25+Math.sin(i/79*Math.PI)*.85;
      const target=(.25+p*p*3.5+energy*1.25)*taper;
      fin.scale.y=moving?THREE.MathUtils.lerp(fin.scale.y,target,.16):target;
    });
    renderer.render(scene,camera);host.dataset.ready='true';
    if(moving)frame=requestAnimationFrame(draw);
  }
  function wake() { if(!frame&&!lost)frame=requestAnimationFrame(draw); }
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=camera.aspect<1.3?13.3:10.8;camera.updateProjectionMatrix();wake();}
  new ResizeObserver(resize).observe(host);resize();
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2;});
  host.addEventListener('pointerleave',()=>{tx=ty=0;});
  document.addEventListener('visibilitychange',wake);document.addEventListener('corner:motion',wake);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.dataset.ready='false';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;wake();});
  return {setPeaks(value){if(value.length)peaks=value;wake();},setVisible(value){visible=value;wake();}};
}
