// Start a local HTTP server first; no third-party streaming assertions here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://127.0.0.1:8766/';
const works=JSON.parse(fs.readFileSync('data/works.json'));
const tracks=JSON.parse(fs.readFileSync('data/music.json'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\//,r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const mediaRequests=[];page.on('request',r=>{if(/\.(mp4|mp3)(\?|$)|youtube/.test(r.url()))mediaRequests.push(r.url());});
 await page.goto(base);await page.waitForSelector('#work-filters:visible');
 assert.equal(await page.locator('.work-card').count(),11);
 assert.equal(mediaRequests.length,0,'no media or YouTube on initial load');
 for(const width of [1920,1440,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`overflow at ${width}`);}
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-filter="photo"]').click();assert.equal(await page.locator('.work-card').count(),3);
 await page.locator('[data-filter="mv"]').click();assert.equal(await page.locator('.work-card').count(),2);
 await page.locator('[data-filter="all"]').click();
 const closeFilm=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!location.hash.startsWith('#watch='));assert.equal(await page.locator('dialog[open]').count(),0);};
 for(const work of works.filter(w=>w.src)){
   const trigger=page.locator(`.poster-link[data-play="${work.id}"]`);await trigger.click();
   await page.waitForFunction(()=>{const v=document.querySelector('dialog video');return v&&!v.paused&&v.currentTime>.1;});
   assert((await page.locator('video').evaluate(v=>v.duration))>60);
   const target=await page.locator('video').evaluate(v=>{const target=v.duration/2;v.currentTime=target;return target;});
   await page.waitForFunction(target=>{const v=document.querySelector('video');return v&&!v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-target)<3;},target);
   await closeFilm();assert.equal(await page.locator('video,iframe,audio[src]').count(),0,'closing unloads media');
   assert(await trigger.evaluate(n=>n===document.activeElement),'focus restored');
   console.log('video play / seek / stop',work.id);
 }
 await page.locator('.poster-link[data-play="qiuguang"]').click();assert.equal(await page.locator('[data-episode]').count(),17);
 await page.locator('[data-episode="16"]').click();assert((await page.locator('iframe').getAttribute('src')).includes('iVBZpIGpQ0U'));assert(await page.locator('#next-episode').isHidden());await closeFilm();
 await page.locator('.poster-link[data-play="changye"]').click();assert.equal(await page.locator('[data-episode]').count(),2);await page.locator('#next-episode').click();assert((await page.locator('iframe').getAttribute('src')).includes('nFohx8ILt2Y'));await closeFilm();
 await page.locator('[data-music-filter="all"]').click();assert.equal(await page.locator('.track').count(),41);
 await page.locator('#music-search').fill('完全不存在的曲名');assert.equal(await page.locator('.track').count(),0);assert(await page.locator('#play-queue').isDisabled());await page.locator('#music-search').fill('');
 for(const track of tracks){
   await page.locator(`.track[data-play="${track.id}"]`).click();
   await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.currentTime>.05&&!a.paused;});
   assert((await page.locator('audio').evaluate(a=>a.duration))>20);
   assert.equal(await page.locator('dialog[open]').count(),0);
   await page.locator('#close-listening').click();assert.equal(await page.locator('audio[src]').count(),0);
 }
 console.log('persistent audio playback / close',tracks.length,'tracks');
 await page.locator('[data-music-filter="song"]').click();await page.locator('#play-queue').click();
 assert(await page.locator('#continuous-play').isChecked());
 const originalSrc=await page.locator('audio').getAttribute('src');
 await page.locator('[data-music-filter="score"]').click();assert.equal(await page.locator('audio').getAttribute('src'),originalSrc);
 await page.locator('#next-track').click();assert.equal(await page.locator('#listening-title').textContent(),tracks.filter(t=>t.group==='song')[1].title);
 await page.locator('#previous-track').click();assert.equal(await page.locator('audio').getAttribute('src'),originalSrc);
 // Real media end, not dispatchEvent: queue advances without changing the filter.
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=3&&!a.paused&&a.currentTime>.05;});
 await page.locator('audio').evaluate(a=>{a.currentTime=a.duration-.25;});
 await page.waitForFunction(src=>document.querySelector('audio').getAttribute('src')!==src,originalSrc);
 assert.equal(await page.locator('#listening-position').textContent(),'清單 2 / 7');
 await page.locator('#continuous-play').uncheck();
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=3&&!a.paused&&a.currentTime>.05;});
 const secondSrc=await page.locator('audio').getAttribute('src');
 await page.locator('audio').evaluate(a=>{a.currentTime=a.duration-.25;});
 await page.waitForFunction(()=>document.querySelector('audio').ended);
 assert.equal(await page.locator('audio').getAttribute('src'),secondSrc);
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert(await page.locator('#close-listening').isVisible());}
 await page.setViewportSize({width:320,height:740});
 await page.locator('#listening-seek').focus();
 await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.seeking&&a.currentTime<2;});
 assert(await page.locator('#listening-seek').isVisible());
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.hero [data-play]').click();assert(await page.locator('#listening-bar').isHidden());assert.equal(await page.locator('audio[src]').count(),0);
 await page.goBack();await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await page.locator('video').count(),0);
 await page.goForward();await page.waitForSelector('dialog[open]');assert(await page.locator('video').evaluate(v=>v.paused));await closeFilm();
 await page.goto(base+'#watch=qiuguang&episode=5');await page.waitForSelector('dialog[open]');assert((await page.locator('iframe').getAttribute('src')).includes('7XWq5nO9Ilc'));
 // Simulate browser clipboard refusal: manual select/copy must stay reachable.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('blocked'))},configurable:true}));
 await page.locator('#share-work').click();await page.waitForFunction(()=>document.activeElement.id==='work-address');assert((await page.locator('#work-address').inputValue()).endsWith('#watch=qiuguang&episode=5'));await closeFilm();
 await page.locator('[data-copy-site]').click();await page.waitForFunction(()=>document.activeElement.id==='site-address');assert((await page.locator('#site-address').inputValue()).startsWith('https://'));
 await page.goto(base+'#watch=track-01');await page.waitForSelector('#listening-bar:visible');assert(await page.locator('audio').evaluate(a=>a.paused));await page.locator('#close-listening').click();
 await page.locator('.hero [data-play]').click();for(let i=0;i<14;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));}await closeFilm();
 console.log('PASS queue snapshot / natural end / mutual exclusion / Back / share fallback / keyboard');
 await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto(base);assert.equal(await p.locator('.work-card').count(),11);assert.equal(await p.locator('.track').count(),7);assert(await p.locator('[data-copy-site]').isHidden());await p.goto(base+'catalog.html');assert.equal(await p.locator('a[href$=".mp3"]').count(),41);assert.equal(await p.locator('a[href*="watch?v="]').count(),23);await nojs.close();
 const failed=await browser.newContext();await failed.route('**/data/*.json',r=>r.fulfill({status:503,body:'unavailable'}));const fp=await failed.newPage();await fp.goto(base);await fp.waitForFunction(()=>document.querySelector('#works-status').textContent.includes('未載入'));assert.equal(await fp.locator('.work-card').count(),11);assert.equal(await fp.locator('.track').count(),7);assert(await fp.locator('#work-filters').isHidden());await failed.close();
 const broken=await browser.newContext();await broken.route(/\.(mp3|mp4)$/,r=>r.fulfill({status:404,body:'not found'}));const bp=await broken.newPage();await bp.goto(base);await bp.waitForSelector('#work-filters:visible');await bp.locator('.hero [data-play]').click();await bp.waitForFunction(()=>document.querySelector('#player-status').textContent.includes('載入失敗'));assert((await bp.locator('#player-fallback').getAttribute('href')).endsWith('.mp4'));await bp.keyboard.press('Escape');await bp.waitForFunction(()=>!location.hash.startsWith('#watch='));await bp.locator('.track').first().click();await bp.waitForFunction(()=>document.querySelector('#listening-status').textContent.includes('未能載入'));assert((await bp.locator('#listening-source').getAttribute('href')).endsWith('.mp3'));await broken.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(base);assert.equal(await rp.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');await reduced.close();
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS responsive, all native playback, static fallback, 503 / 404, reduced motion; YouTube streams NOT tested');
})().catch(e=>{console.error(e);process.exit(1)});
