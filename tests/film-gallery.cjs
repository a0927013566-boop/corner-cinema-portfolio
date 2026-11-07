const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const mode of ['normal','reduced','fallback']){
  const c=await b.newContext({viewport:{width:mode==='reduced'?390:1440,height:1000},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='fallback')await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return /webgl/.test(type)?null:original.call(this,type,...rest);};});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#film-gallery').scrollIntoViewIfNeeded();
  await p.waitForFunction(()=>document.querySelector('#film-gallery').dataset.renderer);
  const g=p.locator('#film-gallery');assert.equal(await g.getAttribute('data-renderer'),mode==='fallback'?'css':'webgl');
  assert.equal(await p.locator('.film-index button').count(),7);
  if(mode==='normal'){
   await p.mouse.move(0,0);await p.waitForFunction(()=>document.querySelector('#film-gallery').dataset.current!=='longnight',{},{timeout:20000});
   await p.locator('.film-index button').first().click();
  }
  if(mode==='reduced'){
   assert.equal(await g.getAttribute('data-moving'),'false');await g.locator('[data-motion-toggle]').click();await p.waitForFunction(()=>document.querySelector('#film-gallery').dataset.moving==='true');
  }
  await g.locator('[data-film-next]').click();assert.equal(await g.getAttribute('data-current'),'changye');
  await g.locator('[data-film-prev]').click();assert.equal(await g.getAttribute('data-current'),'longnight');
  await p.locator('.film-space').focus();await p.keyboard.press('ArrowRight');assert.equal(await g.getAttribute('data-current'),'changye');await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(650);
  const r=await p.locator('.film-space').boundingBox();await p.mouse.move(r.x+r.width*.75,r.y+r.height*.5);await p.mouse.down();await p.mouse.move(r.x+r.width*.2,r.y+r.height*.5,{steps:14});await p.mouse.up();assert.notEqual(await g.getAttribute('data-current'),'longnight');
  await p.locator('.film-index button').filter({hasText:'越過長夜'}).click();await p.locator('.film-play').click();
  await p.waitForFunction(()=>{const v=document.querySelector('#player-stage video');return v&&v.currentTime>0;});
  await p.locator('#player-stage video').evaluate(v=>{v.currentTime=25;});await p.waitForFunction(()=>document.querySelector('#player-stage video').currentTime>=25);
  await p.locator('.close-player').click();await p.waitForTimeout(200);
  assert.equal(await p.locator('.work-card').count(),7);assert.equal(await p.locator('.track').count(),7);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log(`PASS ${mode}: renderer, seven works, navigation, keyboard, drag, play, seek, close, preserved catalogue`);await c.close();
 }
 await b.close();
})();
