const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const gl=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:gl});
 for(const size of [{width:1440,height:900},{width:390,height:800}]){
  const p=await b.newPage({viewport:size}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
  await p.waitForFunction(()=>document.documentElement.dataset.world==='on');
  const w=p.locator('#world');assert.equal(await w.getAttribute('data-renderer'),'webgl');
  assert.equal(await p.locator('#film-gallery').isHidden(),true);
  assert.equal(await p.locator('[data-world=rail] button').count(),15);
  // 四個廳、十一部作品：點軌道走到每一站，片名與播放連結跟著換
  await p.locator('[data-world=rail] button').nth(1).click();await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='changye');
  assert.equal(await p.locator('[data-world=title]').textContent(),'長夜同行');
  if(size.width>700){await p.locator('[data-world=next]').click();await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='qiuguang');  await p.locator('[data-world=prev]').click();await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='changye');}
  else assert.equal(await p.locator('[data-world=next]').isHidden(),true); // 手機用滑的，不放上下鍵
  await p.locator('.world-stage').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='qiuguang');
  await p.locator('[data-world=rail] button').nth(13).click();await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='code-chaolan');
  assert.match(await p.locator('[data-world=note]').textContent(),/虛構/);
  await p.locator('[data-world=rail] button').nth(4).click();await p.waitForFunction(()=>document.querySelector('#world').dataset.current==='longnight');
  await p.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.world-hud')).getPropertyValue('--world-focus'))>.9);
  await p.locator('[data-world=play]').click();
  await p.waitForFunction(()=>{const v=document.querySelector('#player-stage video');return v&&v.currentTime>0;});
  await p.locator('.close-player').click();
  assert.equal(await p.locator('.work-card').count(),11);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log(`PASS world ${size.width}: webgl, 15 stops, rail, prev/next, keyboard, disclosure, play, close, catalogue kept`);await p.close();
 }
 // 系統要求減少動態：空間照樣顯示，但畫面靜止（不飄、不緩動），捲動才換位置；可手動開啟動態
 const c=await b.newContext({reducedMotion:'reduce'});const r=await c.newPage();await r.goto(base);await r.waitForFunction(()=>document.documentElement.dataset.world==='on');
 await r.locator('#world').scrollIntoViewIfNeeded();await r.waitForFunction(()=>document.querySelector('#world').dataset.moving==='false');
 await r.locator('[data-world=rail] button').nth(2).click();await r.waitForFunction(()=>document.querySelector('#world').dataset.current==='qiuguang');
 await r.locator('#world [data-motion-toggle]').click();await r.waitForFunction(()=>document.querySelector('#world').dataset.moving==='true');await c.close();
 // 沒有 WebGL 或 ?view=classic 回到原本的放映廊
 const n=await b.newContext();await n.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...a){return /webgl/.test(type)?null:get.call(this,type,...a)}});const f=await n.newPage();await f.goto(base);await f.locator('#film-gallery').scrollIntoViewIfNeeded();await f.waitForFunction(()=>document.querySelector('#film-gallery').dataset.renderer);assert.equal(await f.locator('#world').isHidden(),true);await n.close();
 const q=await b.newPage();await q.goto(base+'?view=classic');await q.locator('#film-gallery').scrollIntoViewIfNeeded();await q.waitForFunction(()=>document.querySelector('#film-gallery').dataset.renderer);assert.equal(await q.locator('#world').isHidden(),true);
 console.log('PASS world: reduced motion shows a still world with opt-in; no WebGL and ?view=classic keep the original gallery');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
