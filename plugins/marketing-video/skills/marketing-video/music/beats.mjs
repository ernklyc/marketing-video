// Usage: node beats.mjs <audioFile> [jobDir]
// Detects tempo (70–180 BPM) and first downbeat; with jobDir, converts the track to <jobDir>/music.wav
// and writes bpm + music.offset into storyboard.json so beats line up with the cut.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const [file, jobArg] = process.argv.slice(2);
const SR = 11025;
const raw = execSync(`ffmpeg -v error -i "${file}" -ac 1 -ar ${SR} -f f32le -`, { maxBuffer: 1 << 30 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const hop = 128, win = 1024, nF = Math.floor((x.length - win) / hop);
const env = new Float32Array(nF);
let prevLow = 0, prevAll = 0;
for (let i = 0; i < nF; i++) {
  let low = 0, all = 0, lp = 0;
  for (let j = 0; j < win; j++) { const v = x[i * hop + j]; lp += 0.05 * (v - lp); low += lp * lp; all += v * v; }
  env[i] = Math.max(0, low - prevLow) * 4 + Math.max(0, all - prevAll); prevLow = low; prevAll = all;
}
const fr = SR / hop;
let best = { bpm: 120, score: -1 };
for (let bpm = 70; bpm <= 180; bpm += 0.25) {
  const lag = (60 / bpm) * fr; let s = 0;
  for (let k = 1; k <= 4; k++) { const L = lag * k; for (let i = Math.ceil(L); i < nF; i++) { const a = i - L, i0 = Math.floor(a), f0 = a - i0; s += env[i] * (env[i0] * (1 - f0) + env[i0 + 1] * f0) / k; } }
  if (s > best.score) best = { bpm, score: s };
}
let bpm = best.bpm; while (bpm < 95) bpm *= 2; while (bpm > 170) bpm /= 2;
const per = (60 / bpm) * fr;
let ph = { o: 0, s: -1 };
for (let o = 0; o < per; o += 0.5) { let s = 0; for (let t = o; t < nF; t += per) s += env[Math.round(t)] || 0; if (s > ph.s) ph = { o, s }; }
let bar = { o: ph.o, s: -1 };
for (let k = 0; k < 4; k++) { let s = 0; const o = ph.o + k * per; for (let t = o; t < nF; t += per * 4) s += env[Math.round(t)] || 0; if (s > bar.s) bar = { o, s }; }
const offset = +(bar.o / fr).toFixed(3);
const dur = x.length / SR;
console.log(JSON.stringify({ bpm: +bpm.toFixed(2), offset, duration: +dur.toFixed(1) }));
if (jobArg) {
  const job = path.resolve(jobArg);
  execSync(`ffmpeg -v error -y -i "${file}" -ar 44100 -ac 2 "${path.join(job, 'music.wav')}"`);
  const p = path.join(job, 'storyboard.json'); const sb = JSON.parse(fs.readFileSync(p, 'utf8'));
  sb.bpm = +bpm.toFixed(2); sb.music = { ...(sb.music ?? {}), src: 'music.wav', offset, licensed: true };
  fs.writeFileSync(p, JSON.stringify(sb, null, 2));
  console.log('storyboard updated: bpm', sb.bpm, 'offset', offset);
}
