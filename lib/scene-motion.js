import {motionAllowed} from './motion.js';
// A depth/parallax treatment of the original photograph, not a replacement 3D world.
export function initSceneMotion() {
  const hero=document.querySelector('.hero'),image=hero?.querySelector('.hero-image');if(!image)return;
  const canvas=document.createElement('canvas');canvas.className='scene-canvas';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
  const vertex=`#version 300 es
  in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`#version 300 es
  precision highp float;in vec2 uv;out vec4 color;
  uniform sampler2D artwork;uniform vec2 cover;uniform vec2 pointer;uniform float time;uniform float moving;uniform float scrollDepth;
  float hash(float n){return fract(sin(n*127.1)*43758.5453);}
  void main(){
    vec2 base=(uv-.5)*cover+.5; base.y+=.02*(1.-cover.y);
    float y=1.-base.y;
    float ground=smoothstep(.44,1.,y);
    float person=exp(-pow((base.x-.32)/.1,4.)-pow((y-.72)/.28,4.));
    float left=1.-smoothstep(.17,.33,base.x);
    float depth=clamp(max(max(ground,person*.95),left*.82),0.,1.);
    float edge=smoothstep(0.,.06,base.x)*smoothstep(0.,.06,1.-base.x)*smoothstep(0.,.05,base.y)*smoothstep(0.,.05,1.-base.y);
    vec2 offset=pointer*vec2(.018,.011)*depth*edge*moving;
    offset.y+=scrollDepth*.018*depth*edge*moving;
    // Camera drift and light remain anchored to the existing photograph.
    vec2 drift=vec2(sin(time*.12)*.0015,cos(time*.16)*.001)*moving*edge;
    vec2 sampleUV=base+offset+drift*(.3+depth*.7);
    vec3 col=texture(artwork,sampleUV).rgb;
    vec2 lamps[3]=vec2[3](vec2(.25,.868),vec2(.275,.646),vec2(.344,.565));
    for(int i=0;i<3;i++){
      vec2 d=lamps[i]-sampleUV;float down=max(d.y,0.);
      float width=.016+down*.18;
      float cone=exp(-pow((d.x+down*.1)/width,2.))*exp(-down*6.)*smoothstep(0.,.025,d.y);
      float halo=exp(-dot(d*vec2(1.,.8),d*vec2(1.,.8))*1100.);
      float breath=.84+sin(time*.75+float(i))*.16;
      col+=vec3(1.,.64,.26)*(cone*.075+halo*.035)*breath*moving;
    }
    // Two soft mist layers follow the distant valley, behind the foreground silhouette.
    float ridge=.46+sin(sampleUV.x*8.+time*.06)*.018;
    float mist=exp(-pow((sampleUV.y-ridge)/.043,2.));
    float wisps=.5+.26*sin(sampleUV.x*31.+time*.15)+.24*cos(sampleUV.x*17.-time*.11);
    float farMask=smoothstep(.4,.65,sampleUV.x)*(1.-ground)*(1.-person);
    col=mix(col,vec3(.36,.43,.47),mist*wisps*farMask*.15*moving);
    // A separate near layer catches the original road's warm reflections.
    for(int i=0;i<10;i++){
      float n=float(i)+1.;float z=.45+hash(n)*.55;
      vec2 p=vec2(.12+hash(n*2.3)*.36,fract(hash(n*4.1)-time*(.005+z*.005))*.28);
      p+=pointer*vec2(.025,.014)*z;
      vec2 d=sampleUV-p;d.x*=1.2559;
      float size=.0018+z*z*.004;
      float glint=exp(-dot(d,d)/(size*size));
      col+=vec3(1.,.72,.38)*glint*.15*z*moving;
    }
    color=vec4(col,1.);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;}catch{return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['artwork','cover','pointer','time','moving','scrollDepth'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let ready=false,lost=false,visible=true,id=0,last=0,elapsed=0,tx=0,ty=0,px=0,py=0;
  function draw(now=0){id=0;if(!ready||lost)return;const moving=motionAllowed()&&visible&&!document.hidden;if(moving&&now-last<33){id=requestAnimationFrame(draw);return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(moving)elapsed+=dt;px+=(tx-px)*.07;py+=(ty-py)*.07;
    const rect=hero.getBoundingClientRect(),ratio=rect.width/rect.height,sourceRatio=image.naturalWidth/image.naturalHeight;
    gl.uniform2f(uniforms.cover,Math.min(1,ratio/sourceRatio),Math.min(1,sourceRatio/ratio));gl.uniform2f(uniforms.pointer,px,py);gl.uniform1f(uniforms.time,elapsed);gl.uniform1f(uniforms.moving,moving?1:0);gl.uniform1f(uniforms.scrollDepth,Math.max(0,Math.min(1,-rect.top/rect.height)));gl.drawArrays(gl.TRIANGLES,0,6);
    hero.dataset.sceneReady='true';hero.dataset.sceneAnimating=String(moving);if(moving)id=requestAnimationFrame(draw);
  }
  function wake(){if(!id&&!lost)id=requestAnimationFrame(draw);}
  function resize(){const rect=hero.getBoundingClientRect();canvas.width=Math.round(rect.width*Math.min(devicePixelRatio,1.25));canvas.height=Math.round(rect.height*Math.min(devicePixelRatio,1.25));gl.viewport(0,0,canvas.width,canvas.height);wake();}
  async function load(){try{await image.decode();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);ready=true;hero.append(canvas);resize();}catch{canvas.remove();}}
  hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=hero.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=(.5-(e.clientY-r.top)/r.height)*2;});
  hero.addEventListener('pointerleave',()=>{tx=ty=0;});
  new ResizeObserver(resize).observe(hero);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(hero);
  document.addEventListener('corner:motion',wake);document.addEventListener('visibilitychange',wake);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(id);id=0;hero.dataset.sceneReady='false';});
  // A lost decorative context falls back to the unchanged original image.
  hero.addEventListener('animationend',e=>{if(e.target.matches('.hero-content>.button'))hero.dataset.intro='done';});
  load();
}
