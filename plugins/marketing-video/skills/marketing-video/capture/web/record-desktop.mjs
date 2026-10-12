// Usage: node record.mjs <jobDir> [clipName ...]
// Reads <jobDir>/capture.json, records each clip from the live site in a phone viewport,
// writes <jobDir>/clips/<name>.mp4 and merges {dur, taps} into <jobDir>/clips/manifest.json.
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const job = path.resolve(process.argv[2]);
const only = process.argv.slice(3);
const cfg = JSON.parse(fs.readFileSync(path.join(job, 'capture.json'), 'utf8'));
const clipsDir = path.join(job, 'clips');
fs.mkdirSync(clipsDir, { recursive: true });
const manifestPath = path.join(clipsDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const vp = cfg.viewport ?? { width: 1440, height: 810, dpr: 1.5 };

const easeJS = `(x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)`;

async function recordClip(name, spec) {
  const tmp = path.join(clipsDir, `.${name}`);
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr,
    locale: cfg.locale ?? 'en-US', timezoneId: cfg.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(cfg.geo ? { geolocation: { latitude: cfg.geo.lat, longitude: cfg.geo.lng }, permissions: ['geolocation'] } : {}),
  });
  if (cfg.clock) await ctx.addInitScript((ms) => { window.__vtClock = ms; }, Date.parse(cfg.clock));
  await ctx.addInitScript({ path: new URL('./vclock.js', import.meta.url).pathname });
  if (cfg.localStorage) await ctx.addInitScript((ls) => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, cfg.localStorage);
  for (const inj of cfg.inject ?? []) {
    const data = inj.data ? JSON.parse(fs.readFileSync(path.join(job, inj.data), 'utf8')) : {};
    const re = new RegExp(inj.url);
    await ctx.route((u) => re.test(u.toString()), async (route) => {
      const resp = await route.fetch();
      let body = await resp.text();
      const find = new RegExp(inj.find);
      if (find.test(body)) {
        const rep = inj.replace.replace(/\{\{(\w+)\}\}/g, (_, k) => JSON.stringify(data[k]));
        body = body.replace(find, rep);
        console.log(`  inject ok (${inj.name ?? inj.url})`);
      }
      const h = { ...resp.headers() }; delete h['content-length'];
      await route.fulfill({ response: resp, body, headers: h });
    });
  }
  await ctx.addInitScript(() => {
    const mk = () => {
      if (document.getElementById('__fc')) return;
      const d = document.createElement('div'); d.id = '__fc';
      d.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 3px 5px rgba(0,0,0,.55))';
      d.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4L9.3 20 4 2z" fill="#fff" stroke="#0b0d11" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(d);
      let cx = -100, cy = -100;
      window.__moveCursor = (x, y, ms) => new Promise((res) => {
        const sx = cx, sy = cy, t0 = performance.now();
        const e = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
        const step = (n) => { const k = Math.min(1, (n - t0) / ms); cx = sx + (x - sx) * e(k); cy = sy + (y - sy) * e(k); d.style.transform = `translate(${cx}px,${cy}px)`; if (k < 1) requestAnimationFrame(step); else res(); };
        requestAnimationFrame(step);
      });
      window.__press = () => { d.firstChild.style.transition = 'transform .12s'; d.firstChild.style.transform = 'scale(.82)'; setTimeout(() => (d.firstChild.style.transform = ''), 140); };
    };
    document.addEventListener('DOMContentLoaded', mk); if (document.readyState !== 'loading') mk();
  });
  const p = await ctx.newPage();
  ctx.on('page', (pg) => { if (pg !== p) pg.close().catch(() => {}); });
  let inflight = 0, lastNet = Date.now();
  p.on('request', () => { inflight++; lastNet = Date.now(); });
  const done = () => { inflight = Math.max(0, inflight - 1); lastNet = Date.now(); };
  p.on('requestfinished', done); p.on('requestfailed', done);

  const cdp = await ctx.newCDPSession(p);
  const FPS = cfg.fps ?? 60, DT = 1000 / FPS;
  let nFrames = 0; const taps = [];
  const vt = () => nFrames / FPS;
  const frame = async () => {
    await p.evaluate((dt) => window.__vt.advance(dt), DT);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
    fs.writeFileSync(path.join(tmp, `f${String(nFrames).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    nFrames++;
  };
  const frames_ = async (ms) => { const n = Math.max(1, Math.round(ms / DT)); for (let i = 0; i < n; i++) await frame(); };
  /** Let virtual time run at real pace without recording (loading gets cut out). */
  const freeRun = async (untilFn, timeout) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      await p.evaluate(() => window.__vt?.on && window.__vt.advance(50)).catch(() => {});
      await p.waitForTimeout(50);
      if (await untilFn()) return;
    }
  };
  const textLen = () => p.evaluate(() => document.body.innerText.length).catch(() => 0);
  const idle = async (timeout = 9000) => {
    const end = Date.now() + timeout;
    let prevLen = -1, stable = 0;
    while (Date.now() < end) {
      await p.evaluate(() => window.__vt?.on && window.__vt.advance(150)).catch(() => {});
      const len = await textLen();
      stable = len === prevLen ? stable + 1 : 0; prevLen = len;
      const quiet = inflight === 0 && Date.now() - lastNet > 450;
      const busy = await p.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
        const sk = [...document.querySelectorAll('[class*="skeleton" i],[class*="shimmer" i],[class*="animate-pulse"],[aria-busy="true"]')].filter(vis).length;
        const img = [...document.images].filter((i) => vis(i) && !i.complete).length;
        return sk + img;
      }).catch(() => 0);
      if (quiet && !busy && stable >= 3) return;
      await p.waitForTimeout(150);
    }
  };

  const scrollerJS = `(el) => { let sc = el ? el.parentElement : null; while (sc && !(sc.scrollHeight > sc.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc || !el) { const c = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 40 && r.width > 300 && r.height > 400 && r.top < 200; }); sc = sc || c[c.length - 1] || document.scrollingElement; }
    return sc; }`;
  const findText = `(text) => { const all = [...document.querySelectorAll('*')].filter((e) => e.textContent.trim() === text && e.getBoundingClientRect().height > 0 && ![...e.children].some((c) => c.textContent.trim() === text)); return all[all.length - 1] || null; }`;

  const scroll = (target, ms) => p.evaluate(([target, ms, scrollerJS, findText, easeJS]) => ((res) => {
    const ease = eval(easeJS), findEl = eval(findText), scroller = eval(scrollerJS);
    const el = target.text ? findEl(target.text) : null;
    if (target.text && !el) return res('notfound:' + target.text);
    const sc = scroller(el);
    const top = sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top;
    const to = target.by != null ? sc.scrollTop + target.by : el ? el.getBoundingClientRect().top - top + sc.scrollTop - (target.offset ?? 160) : (target.y ?? 0);
    const s = sc.scrollTop, d = to - s, t = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t) / ms); sc.scrollTop = s + d * ease(k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); return res('ok');
  })((x) => x), [target, ms, scrollerJS, findText, easeJS]);

  const hscroll = (target, ms) => p.evaluate(([target, ms, findText, easeJS]) => ((res) => {
    const ease = eval(easeJS);
    const a = target.href ? document.querySelector(`a[href="${target.href}"]`) : eval(findText)(target.text);
    if (!a) return res('notfound');
    let el = a.parentElement; while (el && !(el.scrollWidth > el.clientWidth + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowX))) el = el.parentElement;
    if (!el) return res('noscroller');
    const to = a.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft - (target.offset ?? 16);
    const s = el.scrollLeft, d = to - s, t = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t) / ms); el.scrollLeft = s + d * ease(k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); return res('ok');
  })((x) => x), [target, ms, findText, easeJS]);

  const locate = async (t) => {
    let loc = t.selector ? p.locator(t.selector) : t.role ? p.getByRole(t.role, { name: t.name, exact: t.exact ?? true }) : t.href ? p.locator(`a[href="${t.href}"]`) : p.getByText(t.text, { exact: t.exact ?? true });
    const n = await loc.count();
    if (t.nth === 'last') return loc.nth(n - 1);
    if (typeof t.nth === 'number') return loc.nth(t.nth);
    for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return loc.nth(i);
    return loc.first();
  };
  const tap = async (t) => {
    const loc = await locate(t);
    await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    const bb = await loc.boundingBox();
    if (!bb) throw new Error('tap target not found: ' + JSON.stringify(t));
    const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    const label = ((await loc.innerText().catch(() => '')) || t.text || t.name || '').trim().split('\n')[0].slice(0, 28);
    taps.push({ t: +vt().toFixed(3), x: +x.toFixed(1), y: +y.toFixed(1), label });
    await p.evaluate(([x, y]) => window.__moveCursor(x, y, 650), [x, y]); await frames_(680);
    await p.evaluate(() => window.__press()); await frames_(120); await p.mouse.click(x, y);
  };

  await p.goto(new URL(spec.url ?? '/', cfg.baseUrl).toString(), { waitUntil: 'networkidle' });
  await idle();
  await p.waitForTimeout(600);
  let started = false;
  await p.evaluate(() => window.__vt.enable());
  for (const st of spec.setup ?? []) await run(st);
  started = true;

  async function run([op, a, ms]) {
    const rec = nFrames >= 0 && started;
    if (op === 'wait') return rec ? frames_(a) : freeRun(async () => false, a);
    if (op === 'tap') { await tap(a); return; }
    if (op === 'scroll' || op === 'hscroll') { const r = await (op === 'scroll' ? scroll : hscroll)(a, ms ?? 1400); if (r !== 'ok') console.log('  ' + op, r); return rec ? frames_((ms ?? 1400) + DT) : freeRun(async () => false, (ms ?? 1400) + 100); }
    if (op === 'load') { if (rec) await frames_(180); await idle(a ?? 9000); return; }
    if (op === 'hold') return freeRun(async () => false, a);
    if (op === 'key') return p.keyboard.press(a);
    if (op === 'type') { await tap(a.target); for (const ch of a.text) { await p.keyboard.type(ch); await frames_(a.delay ?? 90); } return; }
    if (op === 'move') { await p.evaluate(([x, y, m]) => window.__moveCursor(x, y, m), [a.x, a.y, ms ?? 700]); return frames_((ms ?? 700) + DT); }
    if (op === 'goto') { await p.goto(new URL(a, cfg.baseUrl).toString(), { waitUntil: 'networkidle' }); await idle(); await p.evaluate(() => window.__vt.enable()); return; }
    throw new Error('unknown step ' + op);
  }
  for (const st of spec.steps) await run(st);
  await frames_(400);
  const tEnd = vt();
  await b.close();
  let tapsFx = taps;
  try { tapsFx = JSON.parse(execSync(`python3 "${new URL('./tapfx.py', import.meta.url).pathname}" "${tmp}" ${FPS} '${JSON.stringify(taps).replace(/'/g, "\u0027")}'`).toString()); } catch (e) { console.log('  tapfx failed', e.message); }
  for (const t of tapsFx) { t.nav = t.fx > 22; if (t.fx < 1.5) console.log(`  WARN tap "${t.label}" at ${t.t}s shows no visible change (fx ${t.fx}) — add a visible result (open a sheet, toast/callout in storyboard) or drop the tap`); }
  taps.splice(0, taps.length, ...tapsFx);
  const out = path.join(clipsDir, `${name}.mp4`);
  execSync(`ffmpeg -v error -y -framerate ${FPS} -i "${tmp}/f%05d.jpg" -vf "scale=${vp.width * vp.dpr}:-2,format=yuv420p" -c:v libx264 -crf 14 -preset slow "${out}"`);
  fs.rmSync(tmp, { recursive: true, force: true });
  manifest[name] = { dur: +tEnd.toFixed(3), taps };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log(`${name}: ${tEnd.toFixed(2)}s, ${nFrames} frames, ${taps.length} taps`);
}

for (const [name, spec] of Object.entries(cfg.clips)) {
  if (only.length && !only.includes(name)) continue;
  await recordClip(name, spec);
}
