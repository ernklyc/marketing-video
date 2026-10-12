// Usage: node vo.mjs <jobDir>
// Voiceover from storyboard.vo = { voice?, model?, rate?, lines: [{ at: beat, text, file? }] } (file = user recording, aligned via ElevenLabs forced-alignment) → <job>/vo/line<i>.wav + vo/vo.json
// Engine: ElevenLabs (with-timestamps → exact word timing) when ELEVENLABS_API_KEY is set and vo.voice is an ElevenLabs voice id;
// otherwise macOS `say` (system voice, or `vo.draftVoice` e.g. "Samantha") as a scratch/draft voice with proportional word timing. Say which one was used.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// key: env ELEVENLABS_API_KEY or the file ~/.config/marketing-video/elevenlabs.key (never paste keys into chat)
const KEYFILE = path.join(process.env.HOME, '.config/marketing-video/elevenlabs.key');
const KEY = process.env.ELEVENLABS_API_KEY || (fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, 'utf8').trim() : '');
if (process.argv[2] === '--voices') {
  if (!KEY) { console.log('no key: put it in ' + KEYFILE); process.exit(1); }
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': KEY } });
  if (!r.ok) { console.log('ElevenLabs', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  const { voices } = await r.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name.padEnd(22)} ${[v.labels?.gender, v.labels?.accent, v.labels?.age, v.labels?.use_case ?? v.labels?.description].filter(Boolean).join(' · ')}`);
  const u = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
  if (u.ok) { const s = await u.json(); console.log(`\nplan: ${s.tier} · credits ${s.character_count}/${s.character_limit} used`); }
  process.exit(0);
}
const job = path.resolve(process.argv[2]);
const sb = JSON.parse(fs.readFileSync(path.join(job, process.env.SB || 'storyboard.json'), 'utf8'));
const vo = sb.vo;
if (!vo?.lines?.length) { console.log('no storyboard.vo.lines'); process.exit(0); }
const variant = (process.env.SB || 'storyboard.json').replace(/^storyboard\.?|\.json$/g, '');
const VODIR = variant ? `vo.${variant}` : 'vo';
const dir = path.join(job, VODIR);
fs.mkdirSync(dir, { recursive: true });
const key = KEY;
const useEleven = !!key && vo.voice && !/^[A-Z][a-z]+$/.test(vo.voice);
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

const out = [];
for (const [i, line] of vo.lines.entries()) {
  const wav = path.join(dir, `line${i}.wav`);
  let words;
  if (line.file) {
    // user-supplied recording (e.g. made in the ElevenLabs web app with a library voice) → forced alignment for word timing
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.resolve(job, line.file), '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '48000', '-ac', '2', wav]);
    if (key) {
      const fd = new FormData();
      fd.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), 'line.wav');
      fd.append('text', line.text);
      const r = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
      if (r.ok) words = (await r.json()).words.filter((w) => w.text.trim()).map((w) => ({ w: w.text.trim(), s: w.start, e: w.end }));
      else console.log(`  forced-alignment ${r.status}: ${(await r.text()).slice(0, 160)} → proportional timing`);
    }
    if (!words) { const d = dur(wav), toks = line.text.split(/\s+/).filter(Boolean), tot = toks.reduce((a, t) => a + t.length + 2, 0); let t = 0; words = toks.map((w) => { const s0 = t; t += ((w.length + 2) / tot) * d; return { w, s: +s0.toFixed(3), e: +t.toFixed(3) }; }); }
  } else if (useEleven) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vo.voice}/with-timestamps`, {
      method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text: line.text, model_id: vo.model ?? 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25 } }),
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const mp3 = wav.replace('.wav', '.mp3');
    fs.writeFileSync(mp3, Buffer.from(j.audio_base64, 'base64'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-ar', '48000', '-ac', '2', wav]);
    const a = j.alignment ?? j.normalized_alignment;
    words = []; let cur = null;
    a.characters.forEach((ch, k) => {
      if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
      if (!cur) cur = { w: '', s: a.character_start_times_seconds[k], e: 0 };
      cur.w += ch; cur.e = a.character_end_times_seconds[k];
    });
    if (cur) words.push(cur);
  } else {
    const aiff = wav.replace('.wav', '.aiff');
    execFileSync('say', [...(vo.draftVoice ? ['-v', vo.draftVoice] : []), '-r', String(vo.rate ?? 185), '-o', aiff, line.text]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '48000', '-ac', '2', wav]);
    fs.rmSync(aiff);
    const d = dur(wav), toks = line.text.split(/\s+/).filter(Boolean);
    const weight = toks.map((t) => t.length + 2 + (/[,.!?]$/.test(t) ? 4 : 0)), tot = weight.reduce((x, y) => x + y, 0);
    let t = 0; words = toks.map((w, k) => { const s = t; t += (weight[k] / tot) * d; return { w, s: +s.toFixed(3), e: +(t - (/[,.!?]$/.test(w) ? 0.12 : 0.02)).toFixed(3) }; });
  }
  out.push({ at: line.at, dur: +dur(wav).toFixed(3), src: `${VODIR}/line${i}.wav`, words });
  console.log(`line ${i}: ${out[i].dur}s "${line.text}"`);
}
fs.writeFileSync(path.join(dir, 'vo.json'), JSON.stringify({ engine: useEleven ? 'elevenlabs' : 'say (draft)', lines: out }, null, 1));
console.log(`vo: ${out.length} lines via ${useEleven ? 'ElevenLabs' : 'macOS say (DRAFT voice — tell the user; set ELEVENLABS_API_KEY + vo.voice for production)'}`);
