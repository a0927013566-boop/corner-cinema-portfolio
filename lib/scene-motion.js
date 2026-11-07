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
  uniform sampler2D artwork;uniform vec2 cover;uniform vec2 pointer;uniform vec2 cursor;uniform float time;uniform float moving;uniform float hover;uniform float scrollDepth;uniform float aspect;
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
    vec2 dist=uv-cursor;dist.x*=aspect;
    float radius=length(dist),lens=exp(-radius*radius*90.)*hover*moving;
    float sphereMask=(1.-smoothstep(.105,.12,radius))*hover*moving;
    vec2 normalXY=dist/.12;
    vec3 normal=normalize(vec3(normalXY,sqrt(max(0.,1.-dot(normalXY,normalXY)))));
    vec2 refractOffset=normal.xy*.015*sphereMask+normalize(dist+vec2(.0001))*.002*lens*sin(radius*34.-time*.6);
    vec2 sampleUV=base+offset+refractOffset;
    vec3 col=texture(artwork,sampleUV).rgb;
    float split=lens*.0012;
    col.r=texture(artwork,sampleUV+vec2(split,0.)).r;
    col.b=texture(artwork,sampleUV-vec2(split,0.)).b;
    // Moving warm highlights stay tied to the existing lamplight palette.
    float fresnel=pow(1.-max(normal.z,0.),3.);
    float specular=pow(max(dot(normal,normalize(vec3(-.45,.55,1.))),0.),48.);
    col+=vec3(1.,.86,.62)*sphereMask*(specular*.22+fresnel*.08);
    col+=vec3(1.,.68,.28)*lens*.012;
    for(int i=0;i<16;i++){
      float n=float(i)+1.;float z=.3+hash(n)*.7;
      vec2 p=vec2(hash(n*2.3),fract(hash(n*4.1)+time*(.006+z*.009)));
      p.x+=sin(time*.25+n)*.012+pointer.x*z*.012;
      vec2 d=uv-p;d.x*=aspect;
      float size=.0015+z*z*.005;
      float glow=exp(-dot(d,d)/(size*size));
      col+=vec3(1.,.73,.4)*glow*.12*z*moving*smoothstep(.22,.55,uv.x);
    }
    color=vec4(col,1.);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;}catch{return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['artwork','cover','pointer','cursor','time','moving','hover','scrollDepth','aspect'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let ready=false,lost=false,visible=true,id=0,last=0,elapsed=0,tx=0,ty=0,px=0,py=0,cx=.7,cy=.5,hover=0,targetHover=0;
  function draw(now=0){id=0;if(!ready||lost)return;const moving=motionAllowed()&&visible&&!document.hidden;if(moving&&now-last<33){id=requestAnimationFrame(draw);return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(moving)elapsed+=dt;px+=(tx-px)*.07;py+=(ty-py)*.07;hover+=(targetHover-hover)*.07;
    const rect=hero.getBoundingClientRect(),ratio=rect.width/rect.height,sourceRatio=image.naturalWidth/image.naturalHeight;
    gl.uniform2f(uniforms.cover,Math.min(1,ratio/sourceRatio),Math.min(1,sourceRatio/ratio));gl.uniform2f(uniforms.pointer,px,py);gl.uniform2f(uniforms.cursor,cx,cy);gl.uniform1f(uniforms.time,elapsed);gl.uniform1f(uniforms.moving,moving?1:0);gl.uniform1f(uniforms.hover,hover);gl.uniform1f(uniforms.aspect,ratio);gl.uniform1f(uniforms.scrollDepth,Math.max(0,Math.min(1,-rect.top/rect.height)));gl.drawArrays(gl.TRIANGLES,0,6);
    hero.dataset.sceneReady='true';hero.dataset.sceneAnimating=String(moving);if(moving)id=requestAnimationFrame(draw);
  }
  function wake(){if(!id&&!lost)id=requestAnimationFrame(draw);}
  function resize(){const rect=hero.getBoundingClientRect();canvas.width=Math.round(rect.width*Math.min(devicePixelRatio,1.25));canvas.height=Math.round(rect.height*Math.min(devicePixelRatio,1.25));gl.viewport(0,0,canvas.width,canvas.height);wake();}
  async function load(){try{await image.decode();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);ready=true;hero.append(canvas);resize();}catch{canvas.remove();}}
  hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=hero.getBoundingClientRect();cx=(e.clientX-r.left)/r.width;cy=1-(e.clientY-r.top)/r.height;tx=(cx-.5)*2;ty=(cy-.5)*2;targetHover=1;});
  hero.addEventListener('pointerleave',()=>{tx=ty=0;targetHover=0;});
  new ResizeObserver(resize).observe(hero);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(hero);
  document.addEventListener('corner:motion',wake);document.addEventListener('visibilitychange',wake);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(id);id=0;hero.dataset.sceneReady='false';});
  // A lost decorative context falls back to the unchanged original image.
  hero.addEventListener('animationend',e=>{if(e.target.matches('.hero-content>.button'))hero.dataset.intro='done';});
  load();
}
