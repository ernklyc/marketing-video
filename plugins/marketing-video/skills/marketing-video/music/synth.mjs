// Usage: node synth.mjs <jobDir>   → <jobDir>/music.wav
// Arrangement is derived from storyboard.json: section starts get impacts/bells, risers lead into them,
// 'wall' sections and the one before a 'montage' get a tape-stop break, taps from clips/manifest.json get ticks.
import fs from 'fs';
import path from 'path';
const job = path.resolve(process.argv[2]);
const sb = JSON.parse(fs.readFileSync(path.join(job, process.env.SB || 'storyboard.json'), 'utf8'));
const man = fs.existsSync(path.join(job, 'clips/manifest.json')) ? JSON.parse(fs.readFileSync(path.join(job, 'clips/manifest.json'), 'utf8')) : {};
const SR = 44100, BT = 60 / sb.bpm, BAR = 4 * BT, B = (n) => n * BT;
const MOODS = {
  dark: { ch: [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 60, 64]], root: [38, 34, 31, 33] },
  warm: { ch: [[65, 69, 72], [60, 64, 67], [62, 65, 69], [58, 62, 65]], root: [41, 36, 38, 34] },
  bright: { ch: [[60, 64, 67], [67, 71, 74], [57, 60, 64], [65, 69, 72]], root: [36, 43, 33, 41] },
};
const mood = MOODS[sb.music?.mood ?? 'warm'];
const CH = mood.ch, ROOT = mood.root;
let acc = 0;
const starts = sb.sections.map((s) => { const a = acc; acc += s.beats; return { s, a, e: acc }; });
const TOTAL = acc;
const outro = starts.find((x) => x.s.type === 'outro');
const FINAL = outro ? outro.a : TOTAL;
const INTRO = starts[0].e;
const HITS = starts.slice(1).filter((x) => x.s.type !== 'outro').map((x) => x.a);
const BREAKS = starts.filter((x, i) => x.s.type === 'wall' || (starts[i + 1] && starts[i + 1].s.type === 'montage')).map((x) => (x.s.type === 'wall' ? [x.a, x.e] : [x.e - 0.5, x.e]));
const inBreak = (t) => BREAKS.some(([a, e]) => t >= B(a) && t < B(e));
const TAPS = [];
const fps = sb.fps;
for (const x of starts) {
  const items = x.s.type === 'montage' ? (() => { let o = x.a; return x.s.parts.map((p) => { const r = { clip: p.clip, a: o }; o += p.beats; return r; }); })() : x.s.clip ? [{ clip: x.s.clip, a: x.a }] : [];
  for (const it of items) for (const t of man[it.clip.name]?.taps ?? []) TAPS.push(it.a + (t.t - (it.clip.from ?? 0)) / (it.clip.rate ?? 1) / BT);
}
const DUR = B(TOTAL) + 0.4, N = Math.floor(SR * DUR);
const chordAt = (t) => Math.floor(t / BAR) % 4;
const on = (t) => t < B(FINAL) && !inBreak(t);
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const drums = bus(), bassB = bus(), synth = bus(), pad = bus(), verb = bus(), fx = bus();
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 9;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
const add = (b, i, l, r = l) => { if (i >= 0 && i < N) { b.L[i] += l; b.R[i] += r; } };
const svf = () => {
  let lp = 0, bp = 0;
  return (x, fc, q) => {
    const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR);
    const hp = x - lp - q * bp; bp += f * hp; lp += f * bp;
    return { lp, bp, hp };
  };
};

function kick(t0, amp = 1) {
  const s = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR; ph += 2 * Math.PI * (44 + 150 * Math.exp(-t * 38)) / SR;
    let v = Math.sin(ph) * Math.exp(-t * 7);
    if (t < 0.004) v += rnd() * 0.5 + Math.sin(t * 2 * Math.PI * 3200) * 0.6;
    add(drums, s + i, Math.tanh(v * 2.6) * amp);
  }
}
function clap(t0, amp = 1) {
  const s = Math.floor(t0 * SR), F = svf(), G = svf();
  for (let i = 0; i < 0.22 * SR; i++) {
    const t = i / SR;
    const bursts = [0, 0.006, 0.013].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 260) : 0), 0);
    const v = (F(rnd(), 1300, 0.9).bp * (Math.min(1, bursts) + Math.exp(-t * 24) * 0.5) + G(rnd(), 6000, 1.2).hp * Math.exp(-t * 40) * 0.3) * amp;
    add(drums, s + i, v, v); add(verb, s + i, v * 0.25, v * 0.25);
  }
}
function hat(t0, amp, dec, pan = 0) {
  const s = Math.floor(t0 * SR), F = svf();
  for (let i = 0; i < 0.25 * SR; i++) {
    const t = i / SR, v = F(rnd(), 11000, 1.3).hp * Math.exp(-t * dec) * amp;
    add(drums, s + i, v * (1 - pan), v * (1 + pan));
  }
}
function metal(t0, amp, pan) {
  const s = Math.floor(t0 * SR); let p1 = 0, p2 = 0;
  for (let i = 0; i < 0.06 * SR; i++) {
    const t = i / SR; p1 += 2 * Math.PI * 3100 / SR; p2 += 2 * Math.PI * 4730 / SR;
    const v = (Math.sin(p1) + Math.sin(p2) * 0.7) * Math.exp(-t * 90) * amp;
    add(drums, s + i, v * (1 - pan), v * (1 + pan)); add(verb, s + i, v * 0.4, v * 0.4);
  }
}
function sub808(t0, m, dur, amp = 1) {
  const s = Math.floor(t0 * SR), f = mtof(m); let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR; ph += 2 * Math.PI * f * (1 + 0.6 * Math.exp(-t * 30)) / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 1.6) * Math.min(1, (dur - t) / 0.05);
    add(bassB, s + i, Math.tanh(Math.sin(ph) * 1.8) * env * amp);
  }
}
function pulse(t0, m, amp, cut) {
  const s = Math.floor(t0 * SR), F = svf(); let p1 = 0, p2 = 0;
  const f = mtof(m), dur = 0.11;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR; p1 = (p1 + f / SR) % 1; p2 = (p2 + (f * 1.006) / SR) % 1;
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 18) * Math.min(1, (dur - t) / 0.01);
    const v = F(p1 + p2 - 1, cut * (0.4 + 0.6 * Math.exp(-t * 30)), 0.5).lp * env * amp;
    add(bassB, s + i, v);
  }
}
function arp(t0, m, amp, cut, pan) {
  const s = Math.floor(t0 * SR), F = svf(); let ph = 0; const f = mtof(m);
  for (let i = 0; i < 0.25 * SR; i++) {
    const t = i / SR; ph = (ph + f / SR) % 1;
    const raw = (ph < 0.3 ? 1 : -1) * 0.6;
    const v = F(raw, cut * (0.5 + 0.5 * Math.exp(-t * 25)), 0.4).lp * Math.exp(-t * 14) * amp;
    add(synth, s + i, v * (1 - pan), v * (1 + pan)); add(verb, s + i, v * 0.35, v * 0.35);
  }
}
function padChord(t0, dur, notes, vol, cutFn) {
  const s = Math.floor(t0 * SR), total = Math.floor((dur + 0.8) * SR);
  notes.forEach((m) => [-0.1, 0.1].forEach((d, k) => {
    const f = mtof(m + d), F = svf(); let ph = Math.abs(rnd());
    for (let i = 0; i < total; i++) {
      const t = i / SR; ph = (ph + f / SR) % 1;
      const env = Math.min(1, t / 0.3) * (t > dur ? Math.exp(-(t - dur) * 5) : 1);
      const v = F(2 * ph - 1, cutFn(t0 + t), 0.8).lp * env * vol;
      const pan = k ? 0.6 : -0.6;
      add(pad, s + i, v * (1 - pan), v * (1 + pan)); add(verb, s + i, v * 0.4, v * 0.4);
    }
  }));
}
function glass(t0, m, amp, len = 2.5) {
  const s = Math.floor(t0 * SR), f = mtof(m); let p1 = 0, p2 = 0;
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR; p2 += 2 * Math.PI * f * 2.76 / SR; p1 += 2 * Math.PI * f / SR;
    const v = Math.sin(p1 + 1.2 * Math.exp(-t * 2.5) * Math.sin(p2)) * Math.exp(-t * 1.4) * amp;
    add(synth, s + i, v * 0.8, v * 1.2); add(verb, s + i, v * 0.9, v * 0.9);
  }
}
function impact(t0, amp = 1) {
  const s = Math.floor(t0 * SR), F = svf(); let ph = 0;
  for (let i = 0; i < 3 * SR; i++) {
    const t = i / SR; ph += 2 * Math.PI * (32 + 60 * Math.exp(-t * 6)) / SR;
    const boom = Math.sin(ph) * Math.exp(-t * 1.5);
    const noise = F(rnd(), 3000 * Math.exp(-t * 2) + 200, 0.9).lp * Math.exp(-t * 3) * 0.4;
    add(fx, s + i, (boom + noise) * amp, (boom + noise * 0.9) * amp); add(verb, s + i, noise * amp * 0.5, noise * amp * 0.5);
  }
}
function riser(t0, t1, amp = 1) {
  const s = Math.floor(t0 * SR), len = Math.floor((t1 - t0) * SR), F = svf();
  for (let i = 0; i < len; i++) {
    const p = i / len, v = F(rnd(), 300 * Math.pow(30, p), 0.5).bp * Math.pow(p, 2.5) * amp;
    add(fx, s + i, v * (1 + 0.3 * Math.sin(p * 30)), v * (1 - 0.3 * Math.sin(p * 30)));
  }
}
function downlifter(t0, amp = 1) {
  const s = Math.floor(t0 * SR), F = svf();
  for (let i = 0; i < 1.5 * SR; i++) {
    const t = i / SR, v = F(rnd(), 8000 * Math.exp(-t * 2.5) + 100, 0.6).bp * Math.exp(-t * 2) * amp;
    add(fx, s + i, v, v);
  }
}
function tick(t0) {
  const s = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < 0.035 * SR; i++) { const t = i / SR; ph += 2 * Math.PI * 2600 / SR; add(fx, s + i, Math.sin(ph) * Math.exp(-t * 140) * 0.28); }
}

// ---------- drums
const S16 = BT / 4;
for (let t = 0; t < B(FINAL); t += S16) {
  if (!on(t)) continue;
  const q = Math.round(t / S16) % 16, bar = Math.floor(t / BAR);
  if (t < B(INTRO)) {
    const p = t / B(INTRO);
    if (q % 2 === 0 && t >= B(0.5)) hat(t, 0.06 + p * 0.14, 70, 0.3);
    if (q === 6 || q === 13) metal(t, 0.12, 0.5);
    if (p > 0.34 && q % 4 === 0) kick(t, 0.75);
    if (p > 0.66 && (q === 4 || q === 12)) clap(t, 0.5);
    continue;
  }
  if (q % 4 === 0) kick(t, 1);
  if (q === 4 || q === 12) clap(t, 1);
  hat(t, q % 4 === 2 ? 0.26 : 0.12, q % 4 === 2 ? 16 : 70, 0.15);
  if (q === 7 || q === 10 || (q === 15 && bar % 2)) metal(t, 0.14, q === 10 ? -0.5 : 0.5);
}
for (const [a, e] of BREAKS) if (e - a <= 1) for (let n = a - 1; n < a; n += 0.125) clap(B(n), 0.2 + (n - a + 1) * 0.5);
for (const x of starts) if (x.s.type === 'wall') x.s.words.forEach((_, i) => { const n = x.a + 0.5 + i * ((x.e - x.a - 1) / Math.max(1, x.s.words.length)); kick(B(n), 1.1); clap(B(n), 0.7); impact(B(n), 0.3); });
for (let n = FINAL - 2; n < FINAL; n += 0.25) clap(B(n), 0.2 + (n - FINAL + 2) * 0.25);
HITS.forEach((h, i) => impact(B(h), i === Math.floor(HITS.length / 2) ? 1.1 : 0.85));
impact(0, 0.7);
riser(B(Math.max(0, INTRO - 3)), B(INTRO), 0.5);
HITS.slice(1).forEach((h) => riser(B(h - 3), B(h), 0.35));
riser(B(FINAL - 4), B(FINAL), 0.7);
HITS.forEach((h) => downlifter(B(h) + 0.05, 0.25));

// ---------- bass
for (let bar = 0; bar < FINAL / 4; bar++) { const t = bar * BAR; if (t >= B(INTRO) && on(t)) sub808(t, ROOT[bar % 4], BAR * 0.95, 0.9); }
for (let t = 0; t < B(FINAL); t += S16) {
  if (!on(t)) continue;
  const q = Math.round(t / S16) % 16;
  const cut = t < B(INTRO) ? 250 + (t / B(INTRO)) * 700 : 1300 + 500 * Math.sin((t / B(16)) * Math.PI);
  const a = q % 4 === 0 ? 0.55 : q % 2 ? 0.85 : 0.7;
  pulse(t, ROOT[chordAt(t)] + 12, (t < B(INTRO) ? 0.4 + (t / B(INTRO)) * 0.4 : 0.8) * a, cut);
}
// ---------- arp
const ARP = [0, 2, 1, 2, 0, 2, 1, 3];
for (let t = B(INTRO); t < B(FINAL); t += S16) {
  if (!on(t)) continue;
  const q = Math.round(t / S16) % 8, ch = CH[chordAt(t)];
  const m = ARP[q] === 3 ? ch[0] + 12 : ch[ARP[q]];
  arp(t, m + 12, 0.1, 1400 + Math.min(1, (t - B(INTRO)) / B(FINAL - INTRO)) * 3500, q % 2 ? 0.4 : -0.4);
}
// ---------- pad
const padCut = (t) => (t < B(INTRO) ? 400 + (t / B(INTRO)) * 600 : 900 + 300 * Math.sin(t));
for (let bar = 0; bar < FINAL / 4; bar++) { const t = bar * BAR; if (!inBreak(t)) padChord(t, BAR, CH[bar % 4].map((m) => m - 12), 0.045, padCut); }
// ---------- bells, ticks
const bellTop = CH[0][2] + 12;
[[INTRO, bellTop], ...HITS.map((h, i) => [h, bellTop + (i % 2 ? 4 : 0)]), [FINAL, bellTop]].forEach(([n, m]) => glass(B(n), m, 0.12));
if (!sb.sfx) TAPS.forEach((n) => tick(B(n)));
// ---------- final (sustains to the end)
const tail = TOTAL - FINAL;
kick(B(FINAL), 1.2); clap(B(FINAL), 0.6); impact(B(FINAL), 1.3);
sub808(B(FINAL), ROOT[0], B(tail + 1), 1);
padChord(B(FINAL), B(tail), [ROOT[0] + 12, ...CH[0], CH[0][2] + 3], 0.06, () => 1700);
glass(B(FINAL) + BT * 2, bellTop + 7, 0.07, 4); glass(B(FINAL + 6), bellTop + 12, 0.05, 4);
for (let t = B(FINAL + 2); t < B(TOTAL - 2); t += BT / 2) hat(t, 0.05 * (1 - (t - B(FINAL + 2)) / B(tail)), 60, 0.4);
for (let n = FINAL + 2; n < TOTAL - 4; n += 2) kick(B(n), 0.5);

// ---------- reverb
function freeverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const out = new Float32Array(N);
  const cb = combs.map((d) => ({ buf: new Float32Array(d + spread), i: 0, store: 0 }));
  const ab = aps.map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015; let y = 0;
    for (const c of cb) { const o = c.buf[c.i]; c.store = o * 0.6 + c.store * 0.4; c.buf[c.i] = x + c.store * 0.84; c.i = (c.i + 1) % c.buf.length; y += o; }
    for (const a of ab) { const o = a.buf[a.i]; const v = -y + o; a.buf[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.buf.length; y = v; }
    out[n] = y;
  }
  return out;
}
const rL = freeverb(verb.L, 0), rR = freeverb(verb.R, 23);

// ---------- mix
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const sc = t >= B(INTRO) && on(t) ? 1 - 0.7 * Math.exp(-((t % BT) / BT) * 8) : 1;
  L[i] = drums.L[i] * 0.8 + bassB.L[i] * 0.5 * (0.4 + 0.6 * sc) + synth.L[i] * 0.6 * sc + pad.L[i] * 0.7 * sc + fx.L[i] * 0.6 + rL[i] * 1.1;
  R[i] = drums.R[i] * 0.8 + bassB.R[i] * 0.5 * (0.4 + 0.6 * sc) + synth.R[i] * 0.6 * sc + pad.R[i] * 0.7 * sc + fx.R[i] * 0.6 + rR[i] * 1.1;
}
// tape stops into short breaks
for (const [a, e] of BREAKS) {
  if (e - a > 1) continue;
  const s0 = Math.floor(B(a - 0.5) * SR), s1 = Math.floor(B(a) * SR), cL = L.slice(), cR = R.slice();
  let pos = s0;
  for (let i = s0; i < s1; i++) { const p = (i - s0) / (s1 - s0); pos += Math.pow(1 - p, 1.5); const j = Math.floor(pos), fr = pos - j; L[i] = (cL[j] * (1 - fr) + cL[j + 1] * fr) * (1 - p * 0.3); R[i] = (cR[j] * (1 - fr) + cR[j + 1] * fr) * (1 - p * 0.3); }
}
// master: simple RMS compressor + soft limiter
let env = 0; const att = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR)), thr = 0.35, ratio = 3;
const mixd = new Float32Array(N * 2); let peak = 0;
for (let i = 0; i < N; i++) {
  const lvl = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  env = lvl > env ? att * env + (1 - att) * lvl : rel * env + (1 - rel) * lvl;
  const g = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1;
  const t = i / SR, fade = t > DUR - 1.2 ? Math.max(0, (DUR - t) / 1.2) : 1;
  mixd[2 * i] = Math.tanh(L[i] * g * 1.1) * fade; mixd[2 * i + 1] = Math.tanh(R[i] * g * 1.1) * fade;
  peak = Math.max(peak, Math.abs(mixd[2 * i]), Math.abs(mixd[2 * i + 1]));
}
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
const g2 = 0.89 / peak;
for (let i = 0; i < N * 2; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mixd[i] * g2)) * 32767), 44 + i * 2);
fs.writeFileSync(path.join(job, sb.music?.src || 'music.wav'), out);
console.log(`music.wav ${DUR.toFixed(1)}s @${sb.bpm}bpm mood=${sb.music?.mood ?? 'warm'} hits=${HITS.length} taps=${TAPS.length} breaks=${BREAKS.length}`);
