#!/usr/bin/env node
// 加一部影片到作品集。加完它會自己出現在：放映廳（照「廳」排進去）、作品清單、完整目錄。
//
//   node scripts/add-work.mjs --youtube <連結或影片代碼> --廳 程式動畫
//   node scripts/add-work.mjs --youtube <連結> --廳 "音樂 MV" --片名 "某某" --說明 "一句話" --片長 "03:04"
//   node scripts/add-work.mjs --youtube <連結> --加到 changye            （影集加一集，不多一面銀幕）
//   node scripts/add-work.mjs --影片檔 路徑.mp4 --廳 照片敘事 --片名 "某某"
//   node scripts/add-work.mjs --youtube <連結> --廳 動畫短片 --廳標語 "新的一廳。"   （沒有的廳會自己開一個）
//   node scripts/add-work.mjs --拿掉 <作品代號>
//
// 其他可加：--副標 --標註（虛構品牌、AI 示範這類要寫給訪客看的話）--封面 圖檔 --代號 英文代號 --放在 前面|後面 --試跑
// 沒給片名會用 YouTube 上的標題；沒給封面會抓 YouTube 的封面，影片檔則用 ffmpeg 取一格。
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hallsFor} from '../lib/catalog.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const at = (...p) => path.join(root, ...p);
const stop = message => { console.error('沒加：' + message); process.exit(1); };

const names = {'廳':'hall','片名':'title','副標':'subtitle','說明':'description','片長':'duration','標註':'disclosure','封面':'poster','代號':'id','加到':'series','集名':'episode','影片檔':'file','廳標語':'hallLine','廳說明':'hallNote','放在':'place','拿掉':'remove','試跑':'dry'};
const arg = {};
for (let i = 2; i < process.argv.length; i++) {
  const raw = process.argv[i]; if (!raw.startsWith('--')) stop(`看不懂「${raw}」`);
  const key = names[raw.slice(2)] || raw.slice(2), next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) arg[key] = true; else { arg[key] = next; i++; }
}

const worksPath = at('data', 'works.json');
const works = JSON.parse(fs.readFileSync(worksPath, 'utf8'));
const save = () => { if (arg.dry) return; fs.writeFileSync(worksPath, JSON.stringify(works, null, 2) + '\n'); execFileSync(process.execPath, [at('scripts', 'build-catalog.mjs')], {stdio: 'inherit'}); };
const report = lines => console.log((arg.dry ? '【試跑，沒有寫入】\n' : '') + lines.join('\n'));

if (arg.remove) {
  const i = works.findIndex(w => w.id === arg.remove); if (i < 0) stop(`找不到代號「${arg.remove}」。現有：${works.map(w => w.id).join('、')}`);
  const [gone] = works.splice(i, 1); save();
  report([`拿掉了：${gone.title}（${gone.label}）`, `封面與影片檔沒有刪，還在 ${gone.poster}${gone.src ? '、' + gone.src : ''}`]); process.exit(0);
}

function youtubeId(value) {
  const text = String(value).trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  try { const u = new URL(text); const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop(); if (/^[\w-]{11}$/.test(id)) return id; } catch {}
  stop(`「${text}」不是 YouTube 連結`);
}
const seconds = text => { const m = String(text).match(/^(\d+):(\d{2})$/); return m ? `${+m[1] ? +m[1] + ' 分 ' : ''}${+m[2]} 秒` : text; };
const iso = text => { const m = String(text || '').match(/^(\d+):(\d{2})$/); return m ? `PT${+m[1]}M${+m[2]}S` : undefined; };

const id = arg.youtube ? youtubeId(arg.youtube) : null;
if (!id && !arg.file) stop('要給 --youtube 連結，或 --影片檔 路徑');
if (id && works.some(w => w.youtubeId === id || w.episodes?.some(e => e.youtubeId === id))) stop('這支影片已經在作品集裡了');

let onlineTitle = '';
if (id && !arg.title && !arg.episode) {
  try { const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`); if (r.ok) onlineTitle = (await r.json()).title || ''; } catch {}
  if (!onlineTitle) stop('抓不到 YouTube 上的標題（影片可能不是公開的，或這裡連不到 YouTube）。請加 --片名');
}

// 影集加一集：不多一面銀幕，進那部影集的選集
if (arg.series) {
  const series = works.find(w => w.id === arg.series && w.episodes); if (!series) stop(`找不到影集「${arg.series}」。現有影集：${works.filter(w => w.episodes).map(w => `${w.id}（${w.title}）`).join('、')}`);
  if (!id) stop('影集的分集要給 --youtube 連結');
  const episode = {title: arg.episode || arg.title || onlineTitle, youtubeId: id}; const d = iso(arg.duration); if (d) episode.duration = d;
  series.episodes.push(episode); save();
  report([`《${series.title}》加了一集：${episode.title}`, `現在共 ${series.episodes.length} 集。放映廳裡還是同一面銀幕，點進去的選集多一集。`]); process.exit(0);
}

if (!arg.hall) stop(`要說放哪一廳：--廳 ${hallsFor(works).map(h => `「${h.name}」`).join(' ')}，或給一個新的廳名`);
const halls = hallsFor(works);
const hall = halls.find(h => h.name === arg.hall || h.id === arg.hall || h.name.replace(/\s/g, '') === String(arg.hall).replace(/\s/g, ''));
const title = arg.title || onlineTitle;
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32).replace(/-$/, '');
const category = hall ? hall.id : (slug(arg.hall) || 'hall-' + (halls.length + 1));
let workId = arg.id ? slug(arg.id) : (slug(title) ? `${category}-${slug(title)}` : `${category}-${(id || path.parse(String(arg.file)).name).toLowerCase().replace(/[^a-z0-9]+/g, '')}`);
if (!workId) stop('代號要用英文或數字：--代號 my-film');
if (works.some(w => w.id === workId)) stop(`代號「${workId}」已經有了，請加 --代號 換一個`);

const work = {id: workId, title, subtitle: arg.subtitle || [hall ? hall.name : arg.hall, arg.duration && seconds(arg.duration)].filter(Boolean).join('・'), category, label: hall ? hall.name : arg.hall, poster: `assets/${workId}.jpg`, description: arg.description || ''};
if (arg.duration) work.duration = seconds(arg.duration);
if (!hall) { if (arg.hallLine) work.hallLine = arg.hallLine; if (arg.hallNote) work.hallNote = arg.hallNote; }
if (arg.disclosure) work.disclosure = arg.disclosure;

// 影片：YouTube 只記代碼；影片檔複製進 media/
if (arg.file) {
  if (!fs.existsSync(arg.file)) stop(`找不到影片檔 ${arg.file}`);
  const size = fs.statSync(arg.file).size; if (size > 95 * 1024 * 1024) stop('影片檔超過 95MB，GitHub 放不下。請先壓小，或改放 YouTube 用連結加');
  work.src = `media/${workId}${path.extname(arg.file).toLowerCase() || '.mp4'}`;
  if (!arg.dry) fs.copyFileSync(arg.file, at(work.src));
}
if (id) work.youtubeId = id;

// 封面：自己給的 > 影片檔取一格 > YouTube 封面
const posterPath = at(work.poster);
if (!arg.dry) {
  if (arg.poster) { if (!fs.existsSync(arg.poster)) stop(`找不到封面 ${arg.poster}`); fs.copyFileSync(arg.poster, posterPath); }
  else if (arg.file) {
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '3', '-i', arg.file, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', posterPath]); }
    catch { stop('沒辦法從影片檔取封面（這台機器沒有 ffmpeg）。請加 --封面 圖檔'); }
  } else {
    let got = false;
    for (const name of ['maxresdefault', 'sddefault', 'hqdefault']) {
      try { const r = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`); if (!r.ok) continue; const data = Buffer.from(await r.arrayBuffer()); if (data.length < 5000) continue; fs.writeFileSync(posterPath, data); got = true; break; } catch {}
    }
    if (!got) stop('抓不到 YouTube 封面。請加 --封面 圖檔');
  }
}

// 放進清單：同一廳的最後面（預設）或最前面；新的廳排在所有廳後面
const same = works.map((w, i) => w.category === category ? i : -1).filter(i => i >= 0);
const where = !same.length ? works.length : arg.place === '前面' ? same[0] : same.at(-1) + 1;
works.splice(where, 0, work); save();
const order = works.filter(w => w.category === category).indexOf(work) + 1;
report([
  `加好了：${work.title}`,
  hall ? `放在「${hall.name}」廳的第 ${order} 面銀幕（這一廳現在 ${hall.count + 1} 部）` : `開了一個新的廳「${arg.hall}」，排在最後一廳`,
  `全站現在 ${works.length} 部、${hallsFor(works).length} 個廳`,
  work.description ? '' : '還沒有說明文字（--說明 "一句話"），作品清單那一格會是空的',
  `代號：${work.id}（要拿掉：node scripts/add-work.mjs --拿掉 ${work.id}）`
].filter(Boolean));
