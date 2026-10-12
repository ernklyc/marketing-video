// Usage: node sfx.mjs <jobDir>   → <jobDir>/sfx.wav (set storyboard "sfx": { "src": "sfx.wav" })
// Sound design from real recorded effects (music/sfx/, Mixkit free licence), never synthesized. Every event comes from
// the storyboard + clip manifest exactly as the engine times it, and each sample is placed by its measured PEAK:
//   tap → tap/toggle click on the touch · "Uygula/Apply/Kaydet" taps → confirm · camera transitions → whoosh peaking on the cut
//   callout → zoom swoosh as the camera pushes + soft pop as the caption lands · widget → pop · outro → logo impact
// storyboard.sfx = { src, gain?: { tap: .35, ... }, off?: ["tap", ...], pick?: { whoosh: 1492, ... } }
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const job = path.resolve(process.argv[2]);
const SFX = path.join(path.dirname(new URL(import.meta.url).pathname), 'sfx');
const sb = JSON.parse(fs.readFileSync(path.join(job, process.env.SB || 'storyboard.json'), 'utf8'));
const man = fs.existsSync(path.join(job, 'clips/manifest.json')) ? JSON.parse(fs.readFileSync(path.join(job, 'clips/manifest.json'), 'utf8')) : {};
const cfg = sb.sfx ?? {};
const SR = 48000, FPS = sb.fps, BEAT = (FPS * 60) / sb.bpm;
const GAIN = { tap: 0.32, toggle: 0.32, confirm: 0.34, whoosh: 0.5, zoom: 0.26, pop: 0.28, impact: 0.62, ...(cfg.gain ?? {}) };
const PRIO = { impact: 6, whoosh: 5, confirm: 4, tap: 3, toggle: 3, zoom: 2, pop: 1 };

const files = fs.readdirSync(SFX).filter((f) => /\.(wav|mp3)$/.test(f));
const byRole = (r) => files.filter((f) => f.startsWith(r + '_'));
const cache = new Map();
const load = (f) => {
  if (cache.has(f)) return cache.get(f);
  const raw = execSync(`ffmpeg -v error -i "${path.join(SFX, f)}" -ac 2 -ar ${SR} -f f32le -`, { maxBuffer: 1 << 28 });
  const a = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  let pk = 0, pi = 0;
  for (let i = 0; i < Math.min(a.length, SR * 2 * 3); i += 2) { const v = Math.abs(a[i]) + Math.abs(a[i + 1]); if (v > pk) { pk = v; pi = i / 2; } }
  const s = { a, peak: pi / SR, norm: pk > 0 ? 1.6 / pk : 1 };
  cache.set(f, s); return s;
};
let rr = 0;
const choose = (role) => {
  const want = cfg.pick?.[role]; const list = byRole(role);
  if (want) return list.find((f) => f.includes('_' + want + '.')) ?? list[0];
  // one consistent sound per role for the whole film (variety comes from the roles, not random swaps); taps alternate two
  return role === 'tap' ? list[(rr++) % Math.min(2, list.length)] : list[0];
};

// ---- timeline, mirrored from engine/src/Promo.tsx + Scenes.tsx
const B2F = (b) => Math.round(b * BEAT);
let acc = 0;
const secs = sb.sections.map((s) => { const start = Math.round(acc * BEAT); acc += s.beats; return { s, start, len: Math.round(acc * BEAT) - start }; });
const total = Math.round(acc * BEAT) / FPS;
const ev = [];
const add = (role, frame, gain = 1) => ev.push({ role, t: frame / FPS, gain });
const MOVING = new Set(['iris', 'whip', 'push', 'flip', 'drop', 'flood', 'split', 'statement', 'carry']);
secs.forEach(({ s, start, len }, i) => {
  if (s.type === 'feature' || s.type === 'montage') {
    const tin = s.transition ?? (i === 1 ? 'statement' : 'cut');
    if (MOVING.has(tin)) add('whoosh', start);
  }
  if (s.type === 'outro') { add('whoosh', start, 0.7); add('impact', start + 6); }
  if (s.type === 'montage') {
    // every part switch is a cut on the beat: a short sweep into it, plus the part's own taps
    let pa = 0;
    for (const [k, p] of s.parts.entries()) {
      const at = start + B2F(pa); pa += p.beats;
      if (k > 0) add('zoom', at - 1, 0.9);
      if (!p.clip) continue;
      const pend = start + B2F(pa), pf = p.clip.from ?? 0, pr = p.clip.rate ?? 1;
      for (const t of man[p.clip.name]?.taps ?? []) { const f = at + Math.round(((t.t - pf) / pr) * FPS); if (f >= at && f < pend - 3) add(/uygula|apply|kaydet|onayla|save|confirm/i.test(t.label ?? '') ? 'confirm' : 'tap', f); }
    }
    return;
  }
  if (s.type !== 'feature' || !s.clip) return;
  const info = man[s.clip.name]; const from = s.clip.from ?? 0, rate = s.clip.rate ?? 1;
  const toF = (t) => Math.round(((t - from) / rate + (s.clip.holds ?? []).filter(([h]) => h < t).reduce((a, [, d]) => a + d, 0)) * FPS);
  const taps = (info?.taps ?? []).map((t) => ({ ...t, f: toF(t.t) }));
  for (const t of taps) if (t.f >= 0 && t.f < len - 4) add(/uygula|apply|kaydet|onayla|save|confirm/i.test(t.label ?? '') ? 'confirm' : 'tap', start + t.f);
  for (const co of s.callouts ?? []) {
    const tp = co.tap !== undefined ? taps[co.tap] : undefined;
    const atF = tp ? tp.f - 4 : co.t !== undefined ? toF(co.t) : B2F(co.at ?? 0);
    if (co.zoom !== false && (sb.brand?.calloutStyle ?? 'zoom') === 'zoom') add('zoom', start + atF + 4);
    add('pop', start + atF + 8);
  }
  for (const w of s.widgets ?? []) add('pop', start + B2F(w.at) + 3, 1.1);
});

// thin collisions: within 90 ms keep the higher-priority event
ev.sort((a, b) => a.t - b.t);
const kept = [];
for (const e of ev) {
  if ((cfg.off ?? []).includes(e.role)) continue;
  const G = (r) => (['tap', 'toggle', 'confirm', 'pop'].includes(r) ? 'click' : r === 'impact' ? 'impact' : 'air');
  const near = kept.find((k) => Math.abs(k.t - e.t) < 0.09 && G(k.role) === G(e.role));
  if (!near) kept.push(e); else if (PRIO[e.role] > PRIO[near.role]) kept.splice(kept.indexOf(near), 1, e);
}

const N = Math.ceil((total + 0.5) * SR), out = new Float32Array(N * 2);
for (const e of kept) {
  const f = choose(e.role); if (!f) continue;
  const s = load(f), g = (GAIN[e.role] ?? 0.3) * e.gain * s.norm;
  const at = Math.round((e.t - s.peak) * SR);
  for (let i = 0; i < s.a.length / 2; i++) { const j = at + i; if (j < 0 || j >= N) continue; out[j * 2] += s.a[i * 2] * g; out[j * 2 + 1] += s.a[i * 2 + 1] * g; }
}
// gentle limiter
let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v));
const lim = pk > 0.89 ? 0.89 / pk : 1;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N * 2; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * lim * 32767))), 44 + i * 2);
fs.writeFileSync(path.join(job, cfg.src || 'sfx.wav'), buf);
const count = kept.reduce((m, e) => ((m[e.role] = (m[e.role] ?? 0) + 1), m), {});
console.log(`sfx.wav ${total.toFixed(1)}s · ${kept.length} events ${JSON.stringify(count)}${sb.sfx?.src ? '' : '  → add "sfx": { "src": "sfx.wav" } to the storyboard'}`);
