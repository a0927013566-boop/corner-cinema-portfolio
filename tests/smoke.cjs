// Run with a local HTTP server. PLAYWRIGHT_MODULE/CHROMIUM_PATH may point to installed tools.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://127.0.0.1:8766/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 // Provider playback is verified separately; isolate UI tests from third-party availability.
 await context.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\//,r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const mediaRequests=[];page.on('request',r=>{if(/\.(mp4|mp3)(\?|$)/.test(r.url()))mediaRequests.push(r.url());});
 await page.goto(base);await page.waitForSelector('.work-card');
 assert.equal(await page.locator('.work-card').count(),7);
 assert.equal(mediaRequests.length,0,'media should not download before a click');
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`overflow at ${width}`);}
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-filter="photo"]').click();assert.equal(await page.locator('.work-card').count(),3);
 await page.locator('[data-filter="all"]').click();
 const works=JSON.parse(fs.readFileSync('data/works.json'));
 for(const work of works.filter(w=>w.src)){
   const trigger=page.locator(`.poster-link[data-play="${work.id}"]`);await trigger.click();
   await page.waitForFunction(()=>{const v=document.querySelector('dialog video');return v&&!v.paused&&v.currentTime>.1;});
   const d=await page.locator('video').evaluate(v=>v.duration);assert(d>60);
   await page.locator('video').evaluate(v=>{v.currentTime=v.duration/2;});
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&v.readyState>=2;});
   await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
   assert.equal(await page.locator('video,audio,iframe').count(),0,'closing must detach media');
   assert.equal(await trigger.evaluate(n=>n===document.activeElement),true,'focus restored');
   console.log('video play / seek / stop',work.id);
 }
 await page.locator('.poster-link[data-play="qiuguang"]').click();assert.equal(await page.locator('[data-episode]').count(),17);
 await page.locator('[data-episode="16"]').click();assert((await page.locator('iframe').getAttribute('src')).includes('iVBZpIGpQ0U'));
 assert(await page.locator('#next-episode').isHidden());await page.keyboard.press('Escape');
 await page.locator('.poster-link[data-play="changye"]').click();assert.equal(await page.locator('[data-episode]').count(),2);await page.locator('#next-episode').click();assert((await page.locator('iframe').getAttribute('src')).includes('nFohx8ILt2Y'));await page.keyboard.press('Escape');
 await page.locator('[data-music-filter="all"]').click();
 const tracks=JSON.parse(fs.readFileSync('data/music.json'));assert.equal(await page.locator('.track').count(),tracks.length);
 await page.locator('#music-search').fill('完全不存在的曲名');assert.equal(await page.locator('.track').count(),0);await page.locator('#music-search').fill('');
 for(const track of tracks){await page.locator(`[data-play="${track.id}"]`).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.currentTime>.05&&!a.paused;});assert((await page.locator('audio').evaluate(a=>a.duration))>20);await page.keyboard.press('Escape');}
 console.log('audio playback',tracks.length,'tracks');
 await page.goto(base+'#watch=qiuguang&episode=5');await page.waitForSelector('dialog[open]');assert((await page.locator('iframe').getAttribute('src')).includes('7XWq5nO9Ilc'));await page.keyboard.press('Escape');
 // Native dialog keeps Tab focus inside the player.
 await page.locator('.hero [data-play]').click();for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));}await page.keyboard.press('Escape');
 await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto(base+'catalog.html');assert.equal(await p.locator('a[href$=".mp3"]').count(),tracks.length);assert.equal(await p.locator('a[href*="watch?v="]').count(),19);await nojs.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(base);assert.equal(await rp.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');await reduced.close();
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS responsive, filtering, all native playback, series, deep links, keyboard, no-JS, reduced motion');
})().catch(e=>{console.error(e);process.exit(1)});
