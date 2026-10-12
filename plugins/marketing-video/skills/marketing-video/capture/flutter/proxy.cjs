// Capture proxy: forwards the app's API calls to your staging server, logs them, and applies <workDir>/rules.js
// (fixture = answer locally, e.g. every write call; patch = edit real responses into clearly fake demo data).
// Usage: node proxy.cjs <workDir> [--upstream https://api.staging.example.com] [--port 8099]
//   --upstream  reverse-proxy mode: point the app's API base URL at http://127.0.0.1:<port> (no app code change if
//               the base URL is configurable). Without it, the app sends each request with an x-target header
//               (see zz_video_main.dart for a Flutter http.Client override).
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path');
const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const UP = opt('--upstream')?.replace(/\/$/, ''), PORT = +(opt('--port') ?? 8099);
const WORK = path.resolve(process.argv[2] || '.');
const LOG = path.join(WORK, 'log');
fs.mkdirSync(LOG, { recursive: true });
let n = 0;
const rules = () => { const r = path.join(WORK, 'rules.js'); delete require.cache[require.resolve(r)]; return require(r); };
http.createServer((req, res) => {
  if (req.url.startsWith('/img/')) {
    const f = path.join(WORK, 'img', decodeURIComponent(req.url.slice(5).split('?')[0]));
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': f.endsWith('.png') ? 'image/png' : 'image/jpeg' });
    return fs.createReadStream(f).pipe(res);
  }
  const target = req.headers['x-target'] || (UP ? UP + req.url : undefined);
  if (!target) { res.writeHead(400); return res.end('no target'); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const R = rules();
    const id = String(++n).padStart(4, '0');
    const short = target.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 80);
    const fixed = R.fixture && R.fixture(req.method, target, body.toString());
    const finish = (status, headers, buf) => {
      let out = buf;
      try {
        if ((headers['content-type'] || '').includes('json') || /^[\[{]/.test(buf.toString().trim())) {
          const j = JSON.parse(buf.toString());
          fs.writeFileSync(`${LOG}/${id}_${req.method}${short}.json`, JSON.stringify({ url: target, status, req: body.toString().slice(0, 2000), res: j }, null, 1));
          const p = R.patch ? R.patch(req.method, target, j) : j;
          out = Buffer.from(JSON.stringify(p));
        }
      } catch (e) { console.log('patch err', target, e.message); }
      const h = { ...headers }; delete h['content-length']; delete h['transfer-encoding']; delete h['content-encoding'];
      h['content-type'] = h['content-type'] || 'application/json; charset=utf-8';
      res.writeHead(status, h); res.end(out);
      console.log(id, req.method, status, target.slice(0, 120));
    };
    if (fixed !== undefined && fixed !== null) return finish(200, { 'content-type': 'application/json; charset=utf-8' }, Buffer.from(JSON.stringify(fixed)));
    const u = new URL(target); const lib = u.protocol === 'http:' ? http : https;
    const hdr = { ...req.headers }; delete hdr['x-target']; delete hdr.host; delete hdr['content-length']; delete hdr['accept-encoding'];
    const up = lib.request({ hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method: req.method, headers: { ...hdr, host: u.hostname, 'content-length': body.length } }, (r) => {
      const rc = []; r.on('data', (c) => rc.push(c)); r.on('end', () => finish(r.statusCode, r.headers, Buffer.concat(rc)));
    });
    up.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
    up.end(body);
  });
}).listen(PORT, () => console.log(`capture proxy on ${PORT}${UP ? ' → ' + UP : ' (x-target mode)'}`));
