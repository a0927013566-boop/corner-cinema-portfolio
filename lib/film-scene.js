import * as THREE from '../vendor/three/three.module.min.js';
import {RoomEnvironment} from '../vendor/three/RoomEnvironment.js';

export async function createFilmScene(host,items){
  const parent=host.closest('.film-gallery');let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{parent.dataset.renderer='css';return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x121a17,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,70);
  const envGen=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=envGen.fromScene(room,.04);scene.environment=env.texture;room.dispose();envGen.dispose();
  let textures;try{textures=await Promise.all(items.map(item=>new THREE.TextureLoader().loadAsync(new URL('../'+(item.id==='longnight'?'assets/longnight-art.jpg':item.poster),import.meta.url).href)));}catch{env.dispose();renderer.dispose();parent.dataset.renderer='css';return null;}
  const shape=new THREE.Shape(),w=5.9,h=3.4,r=.045;
  shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1});
  const metal=new THREE.MeshPhysicalMaterial({color:0x35423d,metalness:.9,roughness:.23,clearcoat:1});
  const frames=textures.map(texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;const aspect=texture.image.width/texture.image.height;const target=16/9;if(aspect<target){texture.repeat.y=aspect/target;texture.offset.y=(1-texture.repeat.y)/2;}else{texture.repeat.x=target/aspect;texture.offset.x=(1-texture.repeat.x)/2;}texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    const group=new THREE.Group(),body=new THREE.Mesh(geometry,metal);body.castShadow=true;group.add(body);
    const picture=new THREE.Mesh(new THREE.PlaneGeometry(5.78,3.251),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));picture.position.z=.26;group.add(picture);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.88,3.38,.23)),new THREE.LineBasicMaterial({color:0xc9b993,transparent:true,opacity:.45}));edge.position.z=.1;group.add(edge);
    scene.add(group);return group;
  });
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,50),new THREE.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-2.3,-5);floor.receiveShadow=true;scene.add(floor);
  scene.fog=new THREE.Fog(0x121a17,19,40);
  scene.add(new THREE.HemisphereLight(0xeaf0dc,0x121912,2));
  const key=new THREE.DirectionalLight(0xffecd0,4);key.position.set(-5,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-14,right:14,top:10,bottom:-10});key.shadow.normalBias=.045;scene.add(key);
  const rim=new THREE.DirectionalLight(0xc6e7e3,3);rim.position.set(7,3,-3);scene.add(rim);
  let lost=false;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(.4,1.3, camera.aspect<1.35?11.2:8.2);camera.fov=camera.aspect<1.35?40:38;camera.updateProjectionMatrix();}
  resize();
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;parent.dataset.renderer='css';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;resize();});
  return {resize,render(offsets,time,moving){
    if(lost)return;
    const mobile=camera.aspect<1.35;
    frames.forEach((frame,i)=>{const d=offsets[i],a=Math.abs(d);frame.visible=a<2.8;frame.position.set(d*(mobile?4.6:5.2),a*.12,-a*3.7+.5);frame.rotation.set(-.025,-.06-d*.5,0);frame.children[1].material.color.setScalar(1-Math.min(a,2)*.25);});
    camera.position.x=moving?Math.sin(time*.28)*.48:.4;camera.position.y=1.3+(moving?Math.sin(time*.4)*.12:0);camera.lookAt(0,-.1,-.3);
    renderer.render(scene,camera);parent.dataset.renderer='webgl';
  }};
}
