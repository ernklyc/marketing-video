// Usage: node cutdown.mjs <jobDir> <name> <sectionIndices e.g. 0,1,6,7>
// Builds storyboard.<name>.json (e.g. a 15 s cut: hook + hero feature + outro) from the master storyboard.
// Licensed-track films: music edits are remapped so every kept section plays the same part of the song it had in the master.
// Then: node $SK/music/bed.mjs (or synth.mjs) with SB=storyboard.<name>.json, and render.sh --sb storyboard.<name>.json
import fs from 'fs';
import path from 'path';
const [jobArg, name, list] = process.argv.slice(2);
const job = path.resolve(jobArg);
const sb = JSON.parse(fs.readFileSync(path.join(job, 'storyboard.json'), 'utf8'));
const keep = list.split(',').map(Number);
let acc = 0; const starts = sb.sections.map((s) => { const a = acc; acc += s.beats; return a; });
const out = JSON.parse(JSON.stringify(sb));
out.name = `${sb.name ?? path.basename(job)}-${name}`;
out.sections = keep.map((i) => JSON.parse(JSON.stringify(sb.sections[i])));
// a kept section whose original predecessor was a wall/other loses context → fall back to a clean statement/cut
out.sections.forEach((s, k) => { if (k > 0 && (s.type === 'feature' || s.type === 'montage') && ['carry', 'iris'].includes(s.transition) && keep[k] - 1 !== keep[k - 1]) s.transition = k === 1 ? 'statement' : 'cut'; });
if (sb.music?.edit) {
  const BT = 60 / sb.music.bpm;
  const edits = [...sb.music.edit].sort((a, b) => a.at - b.at);
  const trackAt = (beat) => { const e = edits.filter((x) => x.at <= beat).pop(); return e.from + (beat - e.at) * BT; };
  let nb = 0;
  out.music = { ...sb.music, src: `music.${name}.wav`, edit: keep.map((i, k) => { const r = { at: nb, from: +trackAt(starts[i]).toFixed(3) }; nb += sb.sections[i].beats; return r; }) };
} else if (sb.music) out.music = { ...sb.music, src: `music.${name}.wav` };
if (sb.vo?.lines) {
  let nb = 0; const lines = [];
  keep.forEach((i) => { const a = starts[i], b = a + sb.sections[i].beats; for (const l of sb.vo.lines) if (l.at >= a && l.at < b) lines.push({ ...l, at: nb + (l.at - a) }); nb += sb.sections[i].beats; });
  out.vo = { ...sb.vo, lines };
}
const BT = 60 / sb.bpm;
fs.writeFileSync(path.join(job, `storyboard.${name}.json`), JSON.stringify(out, null, 2));
console.log(`storyboard.${name}.json: ${out.sections.map((s) => s.type).join(' → ')} = ${(out.sections.reduce((a, s) => a + s.beats, 0) * BT).toFixed(1)} s`);
