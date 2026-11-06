import fs from 'node:fs';
const works=JSON.parse(fs.readFileSync(new URL('../data/works.json',import.meta.url)));
const tracks=JSON.parse(fs.readFileSync(new URL('../data/music.json',import.meta.url)));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,title)=>`<a href="${esc(url)}">${esc(title)}</a>`;
const films=works.map(w=>`<li>${w.episodes?`${esc(w.title)}<ul>${w.episodes.map(e=>`<li>${link('https://www.youtube.com/watch?v='+e.youtubeId,e.title)}</li>`).join('')}</ul>`:link(w.src,`${w.title}・${w.subtitle}`)}${w.disclosure?`<p>${esc(w.disclosure)}</p>`:''}</li>`).join('');
const audio=tracks.map(t=>`<li>${link(t.src,`${t.title}${t.version?'・'+t.version:''}`)}</li>`).join('');
fs.writeFileSync(new URL('../catalog.html',import.meta.url),`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>完整作品目錄｜角落電影院</title><link rel="stylesheet" href="style.css"></head><body><main class="catalog"><p>${link('index.html','← 回作品集')}</p><h1>完整作品目錄</h1><p>點擊作品即可開啟影片或音樂。活動與婚禮作品為 AI 生成的虛構示範。</p><h2>影像</h2><ul>${films}</ul><h2 id="songs">歌曲與影像配樂</h2><ul>${audio}</ul></main></body></html>\n`);
console.log(`${works.length} work groups, ${tracks.length} audio tracks`);
