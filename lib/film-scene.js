import * as THREE from '../vendor/three/three.module.min.js';
import {RoomEnvironment} from '../vendor/three/RoomEnvironment.js';

// A curved projection surface and its reflection share geometry, texture and motion.
// No reference-site assets or shaders are used.
const vertex=`
varying vec2 vUv;uniform float bend;uniform float velocity;
void main(){vUv=uv;vec3 p=position;p.z+=pow(p.x/3.8,2.)*bend;p.z+=sin(uv.x*3.14159265)*velocity*.09;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragment=`
uniform sampler2D artwork;uniform vec2 crop;uniform float focus;uniform float speed;uniform float reflected;uniform float time;varying vec2 vUv;
float rounded(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){
 float edge=1.-smoothstep(-.006,.006,rounded((vUv-.5)*vec2(1.77778,1.),vec2(.88889,.5),.018));
 if(edge<.01)discard;
 vec2 uv=(vUv-.5)*crop+.5;float blur=min(speed*.0015,.008);
 vec3 col=texture2D(artwork,uv).rgb;
 if(blur>.0002){col*=.4;
 col+=texture2D(artwork,uv+vec2(blur,0.)).rgb*.24;
 col+=texture2D(artwork,uv-vec2(blur,0.)).rgb*.24;
 col+=texture2D(artwork,uv+vec2(blur*2.,0.)).rgb*.06;
 col+=texture2D(artwork,uv-vec2(blur*2.,0.)).rgb*.06;}
 col*=mix(.34,1.,focus);
 float vignette=1.-.10*pow(length((vUv-.5)*vec2(.8,1.)),2.);
 col*=vignette;
 float rim=pow(abs(vUv.x-.5)*2.,12.);
 col+=vec3(.10,.085,.055)*rim*.28*focus;
 float alpha=edge;
 if(reflected>.5){alpha*=pow(1.-vUv.y,2.)*.25*pow(focus,2.);col*=vec3(.68,.77,.72);}
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
}`;

export async function createFilmScene(host,items){
 const parent=host.closest('.film-gallery');let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{parent.dataset.renderer='css';return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x0c120f,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,70);
 const envGen=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=envGen.fromScene(room,.04);scene.environment=env.texture;room.dispose();envGen.dispose();
 let textures;try{textures=await Promise.all(items.map(item=>new THREE.TextureLoader().loadAsync(new URL('../'+(item.id==='longnight'?'assets/longnight-art.jpg':item.poster),import.meta.url).href)));}catch{env.dispose();renderer.dispose();parent.dataset.renderer='css';return null;}
 const geometry=new THREE.PlaneGeometry(7.6,4.275,48,1),backGeometry=geometry.clone();
 const pos=backGeometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.pow(pos.getX(i)/3.8,2)*.43-.04);backGeometry.computeVertexNormals();
 const frames=textures.map(texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const aspect=texture.image.width/texture.image.height;
  const uniforms={artwork:{value:texture},crop:{value:new THREE.Vector2(Math.min(1,(16/9)/aspect),Math.min(1,aspect/(16/9)))},bend:{value:.43},velocity:{value:0},focus:{value:1},speed:{value:0},reflected:{value:0},time:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,side:THREE.DoubleSide,toneMapped:false});
  const group=new THREE.Group(),screen=new THREE.Mesh(geometry,material);group.add(screen);
  const backing=new THREE.Mesh(backGeometry,new THREE.MeshPhysicalMaterial({color:0x131d19,roughness:.28,metalness:.65,clearcoat:.7,side:THREE.DoubleSide}));backing.scale.set(1.008,1.008,1);group.add(backing);scene.add(group);
  const reflectionMaterial=material.clone();reflectionMaterial.uniforms.reflected.value=1;reflectionMaterial.depthWrite=false;
  const reflection=new THREE.Mesh(geometry,reflectionMaterial);reflection.scale.y=-1;scene.add(reflection);
  return {group,material,reflection,reflectionMaterial};
 });
 // Low contrast illumination grounds the images; reflections fade into the same dark floor.
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const ctx=glowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(199,185,135,.28)');gradient.addColorStop(.4,'rgba(112,133,104,.10)');gradient.addColorStop(1,'rgba(25,37,26,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(22,12),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.set(0,-2.18,-1);scene.add(glow);
 scene.add(new THREE.HemisphereLight(0xeaf0dc,0x121912,1.5));
 const key=new THREE.DirectionalLight(0xffecd0,3);key.position.set(-5,9,6);scene.add(key);const rim=new THREE.DirectionalLight(0xaec9c1,2);rim.position.set(7,3,-3);scene.add(rim);
 let lost=false,px=0,py=0,tx=0,ty=0,lastOffset=0,velocity=0;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 host.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const r=host.getBoundingClientRect();tx=((event.clientX-r.left)/r.width-.5)*2;ty=((event.clientY-r.top)/r.height-.5)*2;});host.addEventListener('pointerleave',()=>{tx=ty=0;});
 function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;const mobile=width<650;camera.position.set(0,1.1,mobile?14.4:9.6);camera.fov=mobile?42:38;camera.updateProjectionMatrix();}
 resize();renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;parent.dataset.renderer='css';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;resize();});
 return {resize,render(offsets,time,moving){
  if(lost)return;const mobile=host.clientWidth<650;
  let delta=offsets[0]-lastOffset;if(Math.abs(delta)>items.length/2)delta=0;lastOffset=offsets[0];velocity+=(delta*45-velocity)*.12;
  px+=(tx-px)*.045;py+=(ty-py)*.045;
  frames.forEach(({group,material,reflection,reflectionMaterial},i)=>{
   const d=offsets[i],a=Math.abs(d);group.visible=a<2.6;reflection.visible=a<1.75;
   group.position.set(Math.sin(d*.78)*(mobile?8.7:9.4),.3-a*.12,-a*4.6+.8);group.rotation.set(0,-d*.45,0);
   const u=material.uniforms;u.focus.value=1-Math.min(a/2.8,.92);u.speed.value=moving?Math.abs(velocity):0;u.velocity.value=moving?velocity:0;u.bend.value=.43+Math.min(Math.abs(velocity)*.12,.4);
   reflection.position.set(group.position.x,-4.35-group.position.y,group.position.z);reflection.rotation.y=group.rotation.y;
   const ru=reflectionMaterial.uniforms;ru.focus.value=u.focus.value;ru.speed.value=u.speed.value;ru.velocity.value=u.velocity.value;ru.bend.value=u.bend.value;
  });
  camera.position.x=moving?px*.32+Math.sin(time*.22)*.12:0;camera.position.y=1.1+(moving?py*.12:0);camera.lookAt(0,-.35,-.5);renderer.render(scene,camera);parent.dataset.renderer='webgl';parent.dataset.presentation='projection';
 }};
}
