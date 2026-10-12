// Usage: node bed.mjs <jobDir>
// Builds <jobDir>/music.wav from a licensed track by splicing it on its beat grid to fit the cut.
// storyboard.music = { track, bpm, grid, edit: [{ at: videoBeat, from: trackSeconds }], fadeOut?, sfx?: true }
//   bpm/grid: tempo and time (s) of any beat in the track (find with beats.mjs / grid search).
//   edit: where each video beat range takes its audio from; `from` is snapped to the nearest beat that keeps
//   the same 4/4 bar phase as the first segment, so splices land on bar-consistent beats (30 ms crossfades).
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const job = path.resolve(process.argv[2]);
const sb = JSON.parse(fs.readFileSync(path.join(job, process.env.SB || 'storyboard.json'), 'utf8'));
const man = fs.existsSync(path.join(job, 'clips/manifest.json')) ? JSON.parse(fs.readFileSync(path.join(job, 'clips/manifest.json'), 'utf8')) : {};
const M = sb.music;
const SR = 48000, BT = 60 / M.bpm;
const raw = execSync(`ffmpeg -v error -i "${path.join(job, M.track)}" -ac 2 -ar ${SR} -f f32le -`, { maxBuffer: 1 << 30 });
const src = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const srcN = src.length / 2;

let acc = 0;
const starts = sb.sections.map((s) => { const a = acc; acc += s.beats; return { s, a }; });
const TOTAL = acc, DUR = TOTAL * BT + 0.3, N = Math.floor(DUR * SR);
const out = new Float32Array(N * 2);

const edits = [...M.edit].sort((a, b) => a.at - b.at);
const k0 = Math.round((edits[0].from - M.grid) / BT);
const phase = ((k0 - edits[0].at) % 4 + 4) % 4;
const segs = edits.map((e, i) => {
  let k = Math.round((e.from - M.grid) / BT);
  while ((((k - e.at) % 4) + 4) % 4 !== phase) k += ((((k - e.at) % 4) + 4) % 4) <= 2 ? -1 : 1;
  return { at: e.at, end: i < edits.length - 1 ? edits[i + 1].at : TOTAL + 1, trackT: M.grid + k * BT };
});
const XF = Math.round(0.03 * SR);
for (const g of segs) {
  const v0 = Math.round(g.at * BT * SR), v1 = Math.min(N, Math.round(g.end * BT * SR) + XF);
  const t0 = Math.round(g.trackT * SR);
  for (let i = Math.max(0, v0 - XF); i < v1; i++) {
    const j = t0 + (i - v0);
    if (j < 0 || j >= srcN) continue;
    let w = 1;
    if (i < v0 + XF && g.at > 0) w = Math.sin(((i - (v0 - XF)) / (2 * XF)) * Math.PI / 2);
    if (i > v1 - 2 * XF && v1 < N) w *= Math.cos(((i - (v1 - 2 * XF)) / (2 * XF)) * Math.PI / 2);
    out[2 * i] += src[2 * j] * w; out[2 * i + 1] += src[2 * j + 1] * w;
  }
  console.log(`video beat ${g.at}–${g.end} ← track ${g.trackT.toFixed(2)}s`);
}

// optional UI sfx: soft ticks on recorded taps, whoosh into each section opener
if (M.sfx !== false) {
  const add = (t, fn, len) => { const s0 = Math.floor(t * SR); for (let i = 0; i < len * SR; i++) { const v = fn(i / SR); const k = s0 + i; if (k >= 0 && k < N) { out[2 * k] += v; out[2 * k + 1] += v; } } };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
  const tick = (t) => add(t, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 120) * 0.12, 0.05);
  const whoosh = (t) => { let lp = 0; add(t - 0.35, (x) => { const p = x / 0.5; lp += (0.02 + 0.25 * p) * (rnd() - lp); return lp * Math.sin(Math.PI * Math.min(1, p)) * 0.5; }, 0.5); };
  const fps = sb.fps;
  starts.forEach(({ s, a }, i) => {
    const tin = s.type === 'feature' || s.type === 'montage' ? s.transition ?? (starts[i - 1]?.s.type === 'wall' || s.type === 'montage' ? 'cut' : 'statement') : s.type;
    const st = s.type === 'feature' && tin === 'statement' && s.titles?.length;
    if (['statement', 'whip', 'carry', 'iris', 'split', 'push'].includes(tin)) whoosh(a * BT);
    const lead = st ? 20 / fps : 0;
    const items = s.type === 'montage' ? (() => { let o = a; return s.parts.map((p) => { const r = { clip: p.clip, a: o }; o += p.beats; return r; }); })() : s.clip ? [{ clip: s.clip, a }] : [];
    for (const it of items) for (const t of man[it.clip?.name]?.taps ?? []) tick(it.a * BT + lead + (t.t - (it.clip.from ?? 0)) / (it.clip.rate ?? 1));
  });
}

const fade = M.fadeOut ?? 1.5;
let peak = 0;
for (let i = 0; i < N; i++) { const t = i / SR, g = t > DUR - fade ? Math.max(0, (DUR - t) / fade) : 1; out[2 * i] *= g; out[2 * i + 1] *= g; peak = Math.max(peak, Math.abs(out[2 * i]), Math.abs(out[2 * i + 1])); }
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
const g2 = peak > 0.98 ? 0.98 / peak : 1;
for (let i = 0; i < N * 2; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * g2)) * 32767), 44 + i * 2);
fs.writeFileSync(path.join(job, M.src || 'music.wav'), buf);
console.log(`music.wav ${DUR.toFixed(1)}s from ${M.track} @${M.bpm}bpm, ${segs.length} segments`);
