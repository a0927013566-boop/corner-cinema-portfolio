// Dependency-free local preview with byte ranges, matching a static media host.
// Bound to loopback; never use this development server as an Internet service.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.webm':'video/webm'};
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(404).end(); return; }
    let file = await realpath(path.join(root, pathname));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(404).end(); return; }
    if ((await stat(file)).isDirectory()) file = await realpath(path.join(file, 'index.html'));
    if (!file.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    let start = 0, end = info.size - 1, status = 200;
    const headers = {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    if (req.headers.range) {
      const match = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, {'Content-Range':`bytes */${info.size}`}).end(); return; }
      if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) { res.writeHead(416, {'Content-Range':`bytes */${info.size}`}).end(); return; }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
    const stream = createReadStream(file, {start, end});
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404).end(); else res.destroy(); }
});
server.listen(Number(process.env.PORT || 8766), '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}/`));
