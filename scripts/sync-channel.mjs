#!/usr/bin/env node
// 每天去看 YouTube 頻道，把新上的影片自動加進網站。
//   node scripts/sync-channel.mjs            照做並寫入
//   node scripts/sync-channel.mjs --試跑     只列出會做什麼，不寫入
//
// 規則（設定在 data/channel.json）：
// - 標題有《劇名》的是影集：網站已經有那一部就加成一集（一部作品一面銀幕），沒有就開一部新的。
//   「囚光5」這種「劇名＋數字」也算那一部的一集。
// - 其他影片各算一部作品，照標題裡的字分到哪一廳；都對不上就進「其他作品」。
// - 網站已經有的作品（標題對得上）不重複加。拿掉過的（skip）不會再加回來。
// - 放映廳誰留誰走，照 lib/catalog.mjs 的 hallSelection：滿了最舊的讓位，固定的不動，下架的不進。
// 抓不到頻道或一支影片都讀不到時什麼都不改，直接結束。
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hallsFor, hallSelection} from '../lib/catalog.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const at = (...p) => path.join(root, ...p);
const dry = process.argv.includes('--試跑') || process.argv.includes('--dry');
const readJSON = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
const works = readJSON(at('data', 'works.json'), null);
const config = readJSON(at('data', 'channel.json'), null);
if (!works || !config?.channelId) { console.error('沒做：讀不到 data/works.json 或 data/channel.json'); process.exit(1); }
const capacity = readJSON(at('data', 'hall.json'), {}).capacity || 12;
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// ---- 讀頻道：影片頁和短片頁，不用金鑰
function collect(node, key, out) {
  if (Array.isArray(node)) node.forEach(v => collect(v, key, out));
  else if (node && typeof node === 'object') { if (key in node) out.push(node[key]); Object.values(node).forEach(v => collect(v, key, out)); }
  return out;
}
async function page(tab) {
  const r = await fetch(`https://www.youtube.com/channel/${config.channelId}/${tab}`, {headers: {'Accept-Language': 'zh-TW', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Cookie': 'CONSENT=YES+1'}});
  if (!r.ok) return null;
  const m = (await r.text()).match(/var ytInitialData = (\{.*?\});<\/script>/s);
  return m ? JSON.parse(m[1]) : null;
}
const text = node => { const found = collect(node, 'text', []).find(t => typeof t === 'string' && /^\d+:\d{2}(:\d{2})?$/.test(t)); return found || ''; };
async function channelVideos() {
  const list = [];
  const videos = await page('videos');
  if (videos) for (const v of collect(videos, 'lockupViewModel', [])) {
    if (v.contentType && v.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue;
    const title = v.metadata?.lockupMetadataViewModel?.title?.content;
    if (v.contentId && title) list.push({id: v.contentId, title, length: text(v.contentImage)});
  }
  if (videos) for (const v of collect(videos, 'videoRenderer', [])) if (v.videoId && v.title?.runs?.[0]?.text) list.push({id: v.videoId, title: v.title.runs[0].text, length: v.lengthText?.simpleText || ''});
  const shorts = await page('shorts');
  if (shorts) for (const v of collect(shorts, 'shortsLockupViewModel', [])) {
    const id = v.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId, title = v.overlayMetadata?.primaryText?.content;
    if (id && title) list.push({id, title, length: '', short: true});
  }
  const seen = new Set();
  return list.filter(v => /^[\w-]{11}$/.test(v.id) && !seen.has(v.id) && seen.add(v.id));
}

const videos = await channelVideos();
if (!videos.length) { console.error('沒做：讀不到頻道上的影片（YouTube 沒回應，或頁面格式變了）。網站沒有改。'); process.exit(dry ? 0 : 2); }

// ---- 比對
const flat = s => String(s || '').normalize('NFKC').replace(/[\s·・:：]/g, '').toLowerCase();
const known = new Set([...(config.seen || []), ...(config.skip || [])]);
works.forEach(w => { if (w.youtubeId) known.add(w.youtubeId); (w.episodes || []).forEach(e => e.youtubeId && known.add(e.youtubeId)); });
const iso = length => { const p = String(length).split(':').map(Number); if (p.length < 2 || p.some(isNaN)) return undefined; const [h, m, s] = p.length === 3 ? p : [0, ...p]; return `PT${h ? h + 'H' : ''}${m}M${s}S`; };
const human = length => { const p = String(length).split(':').map(Number); if (p.length !== 2 || p.some(isNaN)) return ''; return `${p[0] ? p[0] + ' 分 ' : ''}${p[1]} 秒`; };
function seriesOf(title) {
  const quoted = title.match(/《(.+?)》/)?.[1];
  const series = works.filter(w => w.episodes);
  if (quoted) return {name: quoted, work: series.find(w => flat(w.title) === flat(quoted))};
  const numbered = series.find(w => new RegExp(`^(ai)?${flat(w.title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d+$`).test(flat(title)));
  return numbered ? {name: numbered.title, work: numbered} : null;
}
const sameWork = title => works.find(w => !w.episodes && flat(w.title).length >= 2 && flat(title).startsWith(flat(w.title)));
function hallFor(title) {
  const rule = (config.halls || []).find(r => r.has.every(word => title.includes(word)));
  const id = rule?.hall || config.fallback?.id || 'other';
  const existing = hallsFor(works).find(h => h.id === id);
  return {id, name: existing?.name || rule?.name || config.fallback?.name || '其他作品', isNew: !existing};
}
async function poster(id, file) {
  for (const name of ['maxresdefault', 'sddefault', 'hqdefault']) {
    try { const r = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`); if (!r.ok) continue; const data = Buffer.from(await r.arrayBuffer()); if (data.length < 5000) continue; if (!dry) fs.writeFileSync(file, data); return true; } catch {}
  }
  return false;
}

const before = hallSelection(works, capacity).shown.slice();
const log = [], fresh = videos.filter(v => !known.has(v.id)).reverse(); // 頁面是新到舊，倒過來照先後加
for (const v of fresh) {
  const series = seriesOf(v.title);
  if (series?.work) {
    const episode = {title: v.title, youtubeId: v.id}; const d = iso(v.length); if (d) episode.duration = d;
    series.work.episodes.push(episode); series.work.updated = today;
    log.push(`《${series.work.title}》加一集：${v.title}（現在 ${series.work.episodes.length} 集）`);
  } else if (!series && sameWork(v.title)) {
    log.push(`已經有這部作品，不重複加：${v.title}`);
  } else {
    const [head, ...rest] = v.title.split('｜');
    const title = series ? series.name : head.trim();
    const tail = rest.join('｜').trim(), note = tail.match(/（([^（）]*(?:虛構|AI 生成|AI生成)[^（）]*)）/)?.[1];
    const hall = series ? {id: 'series', name: hallsFor(works).find(h => h.id === 'series')?.name || '故事影集'} : hallFor(v.title);
    const id = `yt-${v.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`, file = `assets/${id}.jpg`;
    if (!(await poster(v.id, at(file)))) { log.push(`抓不到封面，這次先不加，下次再試：${v.title}`); continue; }
    const work = {id, title, subtitle: [hall.name, human(v.length)].filter(Boolean).join('・'), category: hall.id, label: hall.name, poster: file, description: tail.replace(/（[^（）]*）/g, '').trim(), added: today};
    if (human(v.length) && !series) work.duration = human(v.length);
    if (note) work.disclosure = note;
    if (series) { const episode = {title: v.title, youtubeId: v.id}; const d = iso(v.length); if (d) episode.duration = d; work.episodes = [episode]; work.updated = today; } else work.youtubeId = v.id;
    const same = works.map((w, i) => w.category === hall.id ? i : -1).filter(i => i >= 0);
    works.splice(same.length ? same.at(-1) + 1 : works.length, 0, work);
    log.push(`新作品：${title}，進「${hall.name}」廳${hall.isNew && !same.length ? '（新開的廳）' : ''}`);
  }
  known.add(v.id);
}

const after = hallSelection(works, capacity);
const pushed = before.filter(w => !after.shown.includes(w));
const added = log.filter(l => !l.startsWith('已經有') && !l.startsWith('抓不到')).length;
config.seen = [...new Set([...(config.seen || []), ...fresh.filter(v => known.has(v.id)).map(v => v.id)])];
console.log([
  dry ? '【試跑，沒有寫入】' : '',
  `頻道讀到 ${videos.length} 支，沒看過的 ${fresh.length} 支`,
  ...log,
  pushed.length ? `這次被擠出放映廳、作品清單還在：${pushed.map(w => w.title).join('、')}` : '',
  `放映廳現在 ${after.shown.length} 面銀幕（最多 ${after.capacity}）：${after.shown.map(w => w.title).join('、')}`
].filter(Boolean).join('\n'));
if (!dry && fresh.length) {
  fs.writeFileSync(at('data', 'channel.json'), JSON.stringify(config, null, 2) + '\n');
  if (added) { fs.writeFileSync(at('data', 'works.json'), JSON.stringify(works, null, 2) + '\n'); execFileSync(process.execPath, [at('scripts', 'build-catalog.mjs')], {stdio: 'inherit'}); }
}
