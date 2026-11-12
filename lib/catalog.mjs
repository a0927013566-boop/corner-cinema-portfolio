// Shared by the browser and static builder. Content stays in data/*.json.
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const duration = seconds => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
export const external = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export const playbackURL = item => item.src || external(item.episodes?.[0]?.youtubeId || item.youtubeId);
export function episodeDuration(iso = '') {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m ? duration((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) : '';
}
const groups = [
  {id:'series', number:'01', title:'故事，還在繼續。', note:'從第一集入座，跟著角色走進下一段故事。'},
  {id:'mv', number:'02', title:'把一首歌，拍成風景。', note:'原創音樂 × 影像，讓一首歌有了自己的畫面。'},
  {id:'photo', number:'03', title:'讓片刻，有了前後。', note:'照片、文字與配樂，編排成可以重看的時光。'},
  {id:'code', number:'04', title:'用程式，把想法算成畫面。', note:'片頭、品牌動態、公司沿革、宣傳短片，一格一格由程式算出來。'}
];
// 廳（作品分組）照 works.json 自己長：出現過的分類就有一個廳，順序照第一次出現的先後。
// 上面四個是寫好標語的；新分類用作品上的 label 當廳名，hallLine／hallNote 當標語與說明。
export function hallsFor(works) {
  const seen = [];
  works.forEach(w => { if (w.category && !seen.includes(w.category)) seen.push(w.category); });
  return seen.map((id, i) => {
    const known = groups.find(g => g.id === id), list = works.filter(w => w.category === id);
    const from = key => list.find(w => w[key])?.[key];
    const name = from('label') || id;
    return {id, name, number: String(i + 1).padStart(2, '0'), title: from('hallLine') || known?.title || `${name}。`, note: from('hallNote') || known?.note || '', count: list.length};
  });
}
// 放映廳放哪幾部。作品清單永遠放全部，這裡只決定走道上有哪些銀幕。
// hall:"off" 下架（不進放映廳）；hall:"pinned" 固定（不會被擠出去）；其他照新舊排，
// 新舊看 updated（影集最近加集的日子）或 added（加入的日子）取比較新的那個。滿了就把最舊的擠出去。
export const HALL_CAPACITY = 12;
const freshness = w => [w.updated, w.added].filter(Boolean).sort().pop() || '';
export function hallSelection(works, capacity = HALL_CAPACITY) {
  const size = Math.max(1, Number(capacity) || HALL_CAPACITY);
  const open = works.filter(w => w.hall !== 'off');
  const pinned = open.filter(w => w.hall === 'pinned');
  const rest = open.filter(w => w.hall !== 'pinned')
    .sort((a, b) => freshness(b).localeCompare(freshness(a)) || works.indexOf(a) - works.indexOf(b))
    .slice(0, Math.max(0, size - pinned.length));
  const shown = works.filter(w => pinned.includes(w) || rest.includes(w));
  return {shown, pushed: open.filter(w => !shown.includes(w)), off: works.filter(w => w.hall === 'off'), pinned, capacity: size};
}
function filmNotes(w) {
  if (!w.notes) return '';
  return `<div class="film-stills" aria-label="${escape(w.title)}成片影格">${w.notes.stills.map(still => `<figure><img src="${escape(still.src)}" alt="${escape(still.alt)}" loading="lazy" width="640" height="360"><figcaption>${escape(still.time)}</figcaption></figure>`).join('')}</div><details class="film-notes"><summary>創作筆記<span class="sr-only">：${escape(w.title)}</span></summary><div><h5>故事</h5><p>${escape(w.notes.story)}</p><h5>影像與聲音</h5><p>${escape(w.notes.craft)}</p></div></details>`;
}
export function workMarkup(works, filter = 'all') {
  return hallsFor(works).filter(g => filter === 'all' || g.id === filter).map(g => {
    const shown = works.filter(w => w.category === g.id);
    if (!shown.length) return '';
    return `<section class="work-group group-${g.id}" aria-labelledby="group-${g.id}"><div class="group-heading"><span class="group-number">${g.number}</span><div><h3 id="group-${escape(g.id)}">${escape(g.title)}</h3><p>${escape(g.note)}</p></div><span class="group-count">${shown.length} 組作品</span></div><div class="group-grid">${shown.map(w => `<article class="work-card ${escape(w.category)}"><a class="poster-link" href="${escape(playbackURL(w))}" data-play="${escape(w.id)}" aria-label="播放${escape(w.title)}，${escape(w.subtitle)}"><img src="${escape(w.poster)}" alt="${escape(w.title)}作品畫面" loading="lazy" width="1280" height="720"><span class="play-circle" aria-hidden="true">▶</span><span class="poster-meta">${w.episodes ? `${w.episodes.length} 集 · 選集播放` : escape(w.duration)}</span></a><div class="work-copy"><p class="work-topline">${escape(w.label)} <span>${String(works.indexOf(w) + 1).padStart(2, '0')}</span></p><h4><a class="work-title-link" href="${escape(playbackURL(w))}" data-play="${escape(w.id)}">${escape(w.title)}<span aria-hidden="true">↗</span></a></h4><p class="subline">${escape(w.subtitle)}</p><p class="work-description">${escape(w.description)}</p>${w.disclosure ? `<p class="disclosure">${escape(w.disclosure)}</p>` : ''}<a class="work-action" href="${escape(playbackURL(w))}" data-play="${escape(w.id)}">${w.episodes ? '選集觀看' : '播放完整作品'} <span aria-hidden="true">→</span><span class="sr-only">：${escape(w.title)}，${escape(w.subtitle)}</span></a>${filmNotes(w)}</div></article>`).join('')}</div></section>`;
  }).join('');
}
export function waveformMarkup(values = []) {
  return `<svg class="track-wave" viewBox="0 0 256 48" preserveAspectRatio="none" aria-hidden="true">${values.map((v,i) => {const h=Math.max(2,Number(v)*44);return `<rect x="${i*4}" y="${24-h/2}" width="2" height="${h}" rx="1"/>`;}).join('')}</svg>`;
}
export function trackMarkup(tracks, activeId) {
  return tracks.length ? tracks.map((t,i) => `<a class="track" href="${escape(t.src)}" data-play="${escape(t.id)}"${t.id === activeId ? ' aria-current="true"' : ''} aria-label="播放${escape(t.title)}${t.version ? '，' + escape(t.version) : ''}"><span class="track-number">${String(i + 1).padStart(2,'0')}</span><span class="track-info"><span class="track-title">${escape(t.title)}</span><span class="track-type">${t.group === 'song' ? '歌曲' : '影像配樂'}${t.version ? ' · ' + escape(t.version) : ''}</span></span>${waveformMarkup(t.waveform)}<span class="track-duration">${duration(t.duration)}</span><span class="track-play" aria-hidden="true">▶</span></a>`).join('') : '<p class="empty">找不到這個曲名，換個關鍵字試試。</p>';
}
