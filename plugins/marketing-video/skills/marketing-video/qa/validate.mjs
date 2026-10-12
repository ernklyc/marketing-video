// Usage: node validate.mjs <jobDir> [--append]  — checks the storyboard against recorded clips and runs the
// variety audit (rules adapted from saas-motion-kit, MIT). --append records the film in ~/.promo-ledger.json
// so the next film avoids repeating its look/transitions/components.
import fs from 'fs';
import path from 'path';
const job = path.resolve(process.argv[2]);
const sb = JSON.parse(fs.readFileSync(path.join(job, process.env.SB || 'storyboard.json'), 'utf8'));
const man = fs.existsSync(path.join(job, 'clips/manifest.json')) ? JSON.parse(fs.readFileSync(path.join(job, 'clips/manifest.json'), 'utf8')) : {};
const BT = 60 / sb.bpm;
const errs = [], warns = [];
const plain = (s) => (s ?? '').replace(/\*/g, '');
const checkClip = (where, clip, beats, lead = 0, popups = []) => {
  if (!clip) return;
  const info = man[clip.name];
  if (!info) return errs.push(`${where}: clip "${clip.name}" not recorded`);
  const held = (clip.holds ?? []).reduce((x, [, d]) => x + d, 0);
  const need = (clip.from ?? 0) + (beats * BT - lead - held) * (clip.rate ?? 1);
  if (need > info.dur - 0.05) errs.push(`${where}: clip "${clip.name}" needs ${need.toFixed(2)}s but is ${info.dur}s → freezes. Lower rate/from or shorten beats`);
  if ((clip.rate ?? 1) > 1.35) warns.push(`${where}: rate ${clip.rate} looks sped-up; re-record with slower steps instead`);
  for (const [ti, t] of info.taps.entries()) { if (t.fx !== undefined && t.fx < 1.5 && !popups.some((p) => p.tap === ti && p.type !== 'label')) warns.push(`${where}: tap "${t.label}" has no visible effect — add a popup for it`); const at = (t.t - (clip.from ?? 0)) / (clip.rate ?? 1); if (at < 0 || at > beats * BT - lead) warns.push(`${where}: tap at ${t.t}s falls outside the section (${at.toFixed(2)}s)`); }
};
const checkText = (where, s, max = 24) => { if (plain(s).length > max) warns.push(`${where}: "${plain(s)}" is ${plain(s).length} chars (> ${max}); it will shrink`); };
let acc = 0;
sb.sections.forEach((s, i) => {
  const where = `#${i} ${s.type}`;
  const sec = s.beats * BT;
  if (s.type === 'feature') {
    const tinV = s.transition ?? (sb.sections[i - 1]?.type === 'wall' ? 'cut' : 'statement');
    const lead = tinV === 'statement' && s.titles?.length ? 20 / sb.fps : 0;
    checkClip(where, s.clip, s.beats, lead, s.popups ?? []);
    if (!s.clip && !s.screens) errs.push(`${where}: needs clip or screens`);
    s.titles.forEach((t, k) => {
      const end = k < s.titles.length - 1 ? s.titles[k + 1].at : s.beats;
      if ((end - t.at) * BT < 1.6) warns.push(`${where}: title "${plain(t.l1)}" visible only ${((end - t.at) * BT).toFixed(1)}s (< 1.6s)`);
      checkText(where, t.l1); checkText(where, t.l2);
    });
    if (sec < 3) warns.push(`${where}: only ${sec.toFixed(1)}s`);
  }
  if (s.type === 'montage') s.parts.forEach((p, k) => { checkClip(`${where}.${k}`, p.clip, p.beats); if (p.beats * BT < 2.2) warns.push(`${where}.${k}: ${(p.beats * BT).toFixed(1)}s is very short`); checkText(`${where}.${k}`, p.l1); checkText(`${where}.${k}`, p.l2); });
  if (s.type === 'hook') s.lines.forEach((l) => checkText(where, l.text, 18));
  acc += s.beats;
});
const total = acc * BT;

// ---------- variety audit
const FAMILY = { statement: 'mask', iris: 'mask', split: 'mask', carry: 'carry', whip: 'camera', push: 'camera', flip: 'camera', drop: 'material', flood: 'mask', hold: 'cut', cut: 'cut', wall: 'material', outro: 'mask' };
const audit = [];
const tins = sb.sections.map((s, i) => s.type === 'feature' || s.type === 'montage' ? s.transition ?? (sb.sections[i - 1]?.type === 'wall' || s.type === 'montage' ? 'cut' : 'statement') : s.type === 'wall' ? 'wall' : s.type === 'outro' ? 'outro' : 'hook');
const cuts = tins.slice(1);
const motif = (i) => !!sb.sections[i]?.ledger?.motif;
cuts.forEach((t, k) => { const i = k + 1; if (k > 0 && t === cuts[k - 1] && !motif(i) && t !== 'cut') audit.push(`#${i}: transition "${t}" twice in a row — pick another family (see creative/transition-atlas.md)`); });
const counts = {}; cuts.forEach((t, k) => { if (!motif(k + 1)) counts[t] = (counts[t] ?? 0) + 1; });
for (const [t, n] of Object.entries(counts)) if (t !== 'cut' && n > (total < 60 ? 2 : 3)) audit.push(`transition "${t}" used ${n}× — max ${total < 60 ? 2 : 3} unless ledger.motif`);
for (const t of ['push', 'hold']) if ((counts[t] ?? 0) > 1) audit.push(`"${t}" is high energy — once per film`);
const fams = new Set(cuts.map((t) => FAMILY[t]).filter(Boolean));
if (cuts.length >= 5 && fams.size < 3) audit.push(`only ${fams.size} transition families (${[...fams].join(', ')}) — use ≥3 of cut/carry/camera/mask/material`);
if (!cuts.some((t) => ['carry', 'whip', 'push', 'iris', 'hold', 'flip', 'drop', 'flood'].includes(t))) audit.push('no narrative transition (carry / whip / push / iris / hold) — every cut is a generic reveal');
// the entry camera the engine really uses (Transitions.entryCam): cam only matters after a statement; 'settled' is the quiet continuity base
const ENTRY = { flip: 'flipIn', drop: 'dropIn', whip: 'whipIn', push: 'pullback' };
const cams = sb.sections.map((s, i) => [s, tins[i]]).filter(([s]) => s.type === 'feature').map(([s, t]) => (t === 'statement' ? s.cam ?? 'rise' : ENTRY[t] ?? 'settled')).filter((c) => c !== 'settled');
cams.forEach((c, k) => { if (k >= 2 && c === cams[k - 1] && c === cams[k - 2]) audit.push(`camera "${c}" three features in a row`); });
// surprise every 15 s: wall, hold, push, carry, or ledger.surprise
let last = 0, t0 = 0;
sb.sections.forEach((s, i) => { const marks = []; if (s.type === 'wall' || ['hold', 'push', 'carry'].includes(tins[i]) || s.ledger?.surprise) marks.push(0); for (const b of s.ledger?.surpriseAt ?? []) marks.push(b * BT); for (const m of marks.sort((x, y) => x - y)) { const t = t0 + m; if (t - last > 15) audit.push(`no surprise between ${last.toFixed(0)}s and ${t.toFixed(0)}s (> 15 s) — add a wall / hold / push / carry, ledger.surprise or ledger.surpriseAt [beats]`); last = t; } t0 += s.beats * BT; });
if (total - last > 15 + 6) audit.push(`no surprise in the last ${(total - last).toFixed(0)} s`);
// words
const words = sb.sections.flatMap((s) => [...(s.titles ?? []).flatMap((t) => [t.l1, t.l2]), ...(s.parts ?? []).flatMap((p) => [p.l1, p.l2]), ...(s.lines ?? []).map((l) => l.text)]).filter(Boolean).map(plain).join(' ').split(/\s+/).length;
if (words / total > 1.6) audit.push(`${words} on-screen words in ${total.toFixed(0)} s (${(words / total).toFixed(1)}/s) — fewer words; let the footage carry it`);
if (!sb.brief?.message || !sb.brief?.tone) audit.push('brief missing: add brief.message / brief.tone / brief.feel ("I want to say ___ in a ___ tone, so the viewer feels ___")');
if (!sb.sections.some((s) => s.ledger?.new_component)) audit.push('no ledger.new_component — invent at least one component for this film (creative/component-forge.md)');
// cross-film history
const HIST = path.join(process.env.HOME, '.promo-ledger.json');
const hist = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')) : { films: [] };
const mine = { job, name: sb.name ?? path.basename(job), date: new Date().toISOString().slice(0, 10), look: sb.brand?.look ?? 'soft', transitions: [...new Set(cuts)], components: sb.sections.map((s) => s.ledger?.new_component).filter(Boolean), tone: sb.brief?.tone };
const base = (n) => String(n).replace(/(-(v\d+|cut\w+))+$/, '');
const recent = hist.films.filter((x) => x.job !== job && base(x.name) !== base(mine.name)).slice(-3);
for (const r of recent) {
  if (r.look === mine.look) audit.push(`look "${mine.look}" was used in recent film "${r.name}" — consider another look`);
  const overlap = mine.transitions.filter((t) => r.transitions.includes(t) && t !== 'cut').length;
  if (mine.transitions.length && overlap / mine.transitions.length > 0.7) audit.push(`transition set overlaps ${Math.round((overlap / mine.transitions.length) * 100)}% with "${r.name}"`);
  for (const c of mine.components) if (r.components?.includes(c)) audit.push(`component "${c}" already used in "${r.name}"`);
}

// ---------- marketing rules (platform research, 2026)
const secStart = []; { let a = 0; for (const s of sb.sections) { secStart.push(a * BT); a += s.beats; } }
const first = sb.sections[0];
if (first && first.beats * BT > 3.5 && first.type === 'hook') audit.push(`hook lasts ${(first.beats * BT).toFixed(1)} s — the claim/first product moment must land within ~3 s`);
if (first?.type === 'outro' || (first?.type === 'hook' && /logo/i.test(JSON.stringify(first)))) audit.push('film opens on a logo — no logo/splash in the first 3 s');
const outro = sb.sections.find((s) => s.type === 'outro');
if (!outro?.cta) audit.push('no CTA in the outro (cta: url / "App Store\'da" / "Hemen indir")');
// reading time: chars/12 + 0.5 s per title card
sb.sections.forEach((s, i) => {
  const cards = s.type === 'feature' ? s.titles.map((t, k) => ({ text: plain(t.l1) + ' ' + plain(t.l2 ?? ''), vis: ((k < s.titles.length - 1 ? s.titles[k + 1].at : s.beats) - t.at) * BT })) : s.type === 'montage' ? s.parts.map((p) => ({ text: plain(p.l1) + ' ' + plain(p.l2 ?? ''), vis: p.beats * BT })) : [];
  for (const c of cards) { const need = c.text.trim().length / 12 + 0.5; if (c.vis < need) warns.push(`#${i}: "${c.text.trim()}" needs ~${need.toFixed(1)} s to read, visible ${c.vis.toFixed(1)} s`); if (c.text.trim().split(/\s+/).length > 8) warns.push(`#${i}: "${c.text.trim()}" > 8 words — split it`); }
  for (const p of [...(s.popups ?? []), ...(s.toasts ?? [])]) if (p.y !== undefined && (p.y < 300 || p.y > 1250)) warns.push(`#${i}: popup/toast at y=${p.y} is outside the platform safe zone (300–1250)`);
});
// voiceover
if (sb.vo?.lines?.length) {
  const vr = (process.env.SB || 'storyboard.json').replace(/^storyboard\.?|\.json$/g, '');
  const vf = path.join(job, (vr ? 'vo.' + vr : 'vo') + '/vo.json');
  if (!fs.existsSync(vf)) errs.push('storyboard.vo set but vo/vo.json missing — run node $SK/tools/vo.mjs <job>');
  else {
    const vd = JSON.parse(fs.readFileSync(vf, 'utf8'));
    if (vd.lines.length !== sb.vo.lines.length) errs.push('vo.json is stale (line count differs) — re-run vo.mjs');
    vd.lines.forEach((l, k) => {
      const a = l.at * BT, b = a + l.dur, nx = vd.lines[k + 1];
      if (nx && b > nx.at * BT - 0.15) audit.push(`VO line ${k} (${l.dur.toFixed(1)} s) overlaps line ${k + 1} — move it to beat ≥ ${Math.ceil((b + 0.2) / BT)}`);
      if (b > total - 0.3) audit.push(`VO line ${k} runs past the end`);
      const wps = l.words.length / l.dur; if (wps > 3.6) warns.push(`VO line ${k}: ${wps.toFixed(1)} words/s — too fast for captions (≤ 3.5)`);
    });
    if (vd.engine?.startsWith('say')) warns.push('voiceover is a DRAFT (macOS say) — tell the user; production needs ELEVENLABS_API_KEY + vo.voice');
  }
}
// App Store app preview rules
if (sb.format === 'appstore') {
  if (total < 15 || total > 30) errs.push(`App Store preview must be 15–30 s (is ${total.toFixed(1)} s)`);
  audit.push('App Store preview: no device frame / hands / prices / dates — use cam:"flat" full-screen captures (phone frame is for social cuts only)');
}
if (total > 35 && !sb.cutdowns) warns.push(`${total.toFixed(0)} s master — also offer a 15 s and 30 s cutdown (tools/cutdown.mjs)`);
if (/-cut\w+$/.test(sb.name ?? '') || process.env.SB?.includes('.cut')) { const drop = /no narrative transition|no ledger.new_component|only \d+ transition families/; for (let i = audit.length - 1; i >= 0; i--) if (drop.test(audit[i])) audit.splice(i, 1); }
sb.sections.forEach((s, i) => { if (s.type === 'feature' && s.beats * BT > 6 && !(s.callouts?.length || s.widgets?.length || s.popups?.length || s.lifts?.length)) audit.push(`#${i} "${s.chip}": no callout / widget / popup — point at the UI moment that proves the claim (creative/components.md)`); });
if (!sb.brand?.world?.symbols?.length && (sb.brand?.world?.kind ?? 'dots') !== 'aurora') audit.push('flat background — use brand.world { kind: "aurora", symbols: [...] } (creative/components.md)');
if (sb.brand?.hlStyle === 'squiggle') audit.push('squiggle highlights were judged unnecessary by the user — prefer hlStyle "marker"');
audit.forEach((a) => console.log('AUDIT', a));
if (!audit.length) console.log('variety audit: clean');
if (process.argv.includes('--append')) { hist.films = hist.films.filter((x) => x.name !== mine.name).concat(mine); fs.writeFileSync(HIST, JSON.stringify(hist, null, 1)); console.log('ledger: recorded', mine.name); }
for (const f of [sb.music?.src, sb.sfx?.src, sb.brand?.logo, ...sb.sections.flatMap((s) => s.photos ?? [])].filter(Boolean)) if (!fs.existsSync(path.join(job, f))) errs.push(`missing file ${f}`);
if (sb.music?.src && fs.existsSync(path.join(job, sb.music.src))) {
  const wav = fs.readFileSync(path.join(job, sb.music.src)); const secs = (wav.length - 44) / (wav.readUInt32LE(24) * wav.readUInt16LE(22) * 2) - (sb.music.offset ?? 0);
  if (secs < total - 0.2) errs.push(`music is ${secs.toFixed(1)}s but video is ${total.toFixed(1)}s`);
}
// layout rules (creative/components.md): single-line titles, one band occupant at a time, nothing left mid-exit
const BF = (b) => b * BT;
sb.sections.forEach((s, i) => {
  for (const t of s.titles ?? []) for (const l of [t.l1, t.l2]) if (plain(l).length > 20) warns.push(`#${i} ${s.type}: title line "${plain(l)}" > 20 chars → wraps; shorten`);
  const spans = [...(s.callouts ?? []).map((c) => ({ k: 'callout ' + c.text, a: c.at !== undefined ? BF(c.at) : null, tap: c.tap, b: BF(c.beats ?? 5) })), ...(s.widgets ?? []).map((w) => ({ k: 'widget ' + w.label, a: BF(w.at), b: BF(w.beats ?? 5) }))];
  const info = s.clip ? man[s.clip.name] : null;
  for (const x of spans) if (x.a === null && info && x.tap !== undefined && info.taps[x.tap]) x.a = (info.taps[x.tap].t - (s.clip.from ?? 0)) / (s.clip.rate ?? 1);
  const sp = spans.filter((x) => x.a !== null).sort((p, q) => p.a - q.a);
  for (let k = 1; k < sp.length; k++) if (sp[k].a < sp[k - 1].a + sp[k - 1].b - 0.1) warns.push(`#${i} ${s.type}: ${sp[k].k} starts while ${sp[k - 1].k} is still up — band holds one at a time`);
  for (const x of sp) if (x.a > s.beats * BT - 1) warns.push(`#${i} ${s.type}: ${x.k} starts in the last second of the section — it will be cut short by the exit`);
  for (const c of s.callouts ?? []) { if (plain(c.text).length > 22) warns.push(`#${i}: callout "${c.text}" too long`); if (plain(c.sub).length > 28) warns.push(`#${i}: callout sub "${c.sub}" too long`); }
});
// sync: a callout must be over before the app does the next thing (next tap's touch appears ~0.55 s earlier)
sb.sections.forEach((s, i) => {
  if (s.type !== 'feature' || !s.clip || !man[s.clip.name]) return;
  const taps = man[s.clip.name].taps, from = s.clip.from ?? 0, rate = s.clip.rate ?? 1, holds = s.clip.holds ?? [];
  const toS = (t) => (t - from) / rate + holds.filter(([h]) => h < t).reduce((x, [, d]) => x + d, 0);
  for (const co of s.callouts ?? []) {
    const ct = co.tap !== undefined ? taps[co.tap]?.t : co.t; if (ct === undefined) continue;
    const a = toS(ct) - 0.13, want = Math.min((co.beats ?? 5) * BT, 2.2);
    const lastT = co.until !== undefined && taps[co.until] ? taps[co.until].t + 0.3 : ct + 0.2;
    const nt = taps.filter((t, k) => k !== co.tap && k !== co.until && t.t > lastT).map((t) => t.t)[0];
    if (nt === undefined) continue;
    const room = toS(nt) - 0.6 - a;
    if (room < Math.min(want, 1.4) - 0.05) warns.push(`#${i} sync: "${co.text}" has ${room.toFixed(2)} s before the next tap (${taps.find((t) => t.t === nt)?.label ?? nt}) — add clip.holds [[${(ct + 0.35).toFixed(2)}, ${(Math.min(want, 1.6) - room).toFixed(1)}]] so the app pauses while it's explained`);
  }
});
if (sb.brief?.banned?.length) console.log('banned in this film:', sb.brief.banned.join(' · '));
if (!sb.sfx) warns.push('no sfx layer — run node music/sfx.mjs <job> and set "sfx": { "src": "sfx.wav" }');
console.log(`total ${total.toFixed(1)}s, ${sb.sections.length} sections`);
warns.forEach((w) => console.log('WARN', w));
errs.forEach((e) => console.log('ERROR', e));
process.exit(errs.length ? 1 : 0);
