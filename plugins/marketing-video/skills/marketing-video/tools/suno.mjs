// Usage: node suno.mjs <jobDir> [--style app|warm|bold|premium|calm|playful|technical|cinematic] [--mood "free text"] [--colour "instrument"] [--bpm 124] [--seconds 50]
// Prints a ready-to-paste Suno v6 Custom-mode prompt whose structure follows the storyboard (bars per section),
// so the generated track's drop/break/ending land where the cut needs them. Generate 2–4 takes, send the best one back.
import fs from 'fs';
import path from 'path';
const job = path.resolve(process.argv[2] ?? '.');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const sb = fs.existsSync(path.join(job, 'storyboard.json')) ? JSON.parse(fs.readFileSync(path.join(job, 'storyboard.json'), 'utf8')) : { bpm: 128, sections: [] };
const bpm = +arg('bpm', sb.bpm ?? 128);
const tone = sb.brief?.tone ?? 'warm';
const MOODS = {
  app: 'upbeat modern electronic pop, fresh mobile app launch, new feature reveal, bright catchy synth plucks, punchy claps and snaps, bouncy bassline, crisp hi-hats, positive and confident',
  warm: 'uplifting cinematic electronic pop, warm plucked synths, airy pads, bright arpeggios',
  bold: 'energetic electronic, punchy synth stabs, driving bass, big confident hits',
  premium: 'sleek minimal electronic, deep sub bass, glassy bells, restrained and confident, keynote feel',
  calm: 'calm ambient electronica, soft piano, gentle pulse',
  playful: 'playful modern tech pop, marimba and glassy plucks, finger snaps, funky bassline, cheerful',
  technical: 'precise minimal techno, clicks, tight hats, analog arpeggio',
  cinematic: 'cinematic hybrid trailer, big drums, rising strings, epic but modern',
};
const style = arg('style', Object.keys(MOODS).find((k) => tone.includes(k)) ?? (/app|feature|launch|fresh|sport/i.test(tone) ? 'app' : 'app'));
const mood = arg('mood', MOODS[style] ?? MOODS.app);
const colour = arg('colour', sb.music?.colour ?? '');
const bars = (beats) => Math.max(1, Math.round(beats / 4));
const cue = [];
const secs = sb.sections ?? [];
const outroAt = secs.findIndex((s) => s.type === 'outro');
secs.forEach((s, i) => {
  const b = bars(s.beats);
  if (s.type === 'hook') cue.push(`[Intro | filtered, rising, tension, ${b} bar${b > 1 ? "s" : ""}]`, `[Build | snare roll, riser, 1 bar]`);
  else if (s.type === 'wall') cue.push(`[Break | drums stop, one stab per bar, ${b} bar${b > 1 ? "s" : ""}]`);
  else if (s.type === 'outro') cue.push(`[Outro | big final hit, sustained warm chord, fade, ${b} bar${b > 1 ? "s" : ""}]`);
  else if (i === 1 || secs[i - 1]?.type === 'wall') cue.push(`[Drop | full beat, main hook, confident, ${b} bar${b > 1 ? "s" : ""}]`);
  else cue.push(`[Groove | keep energy, small variation, ${b} bar${b > 1 ? "s" : ""}]`);
});
if (outroAt > 0) cue.splice(cue.length - 1, 0, '[Build | riser into the ending, 1 bar]');
const total = +arg('seconds', ((secs.reduce((a, s) => a + s.beats, 0) * 60) / bpm).toFixed(0)) || 45;
const styles = [`instrumental`, mood, `${Math.round(bpm)} BPM`, colour && `subtle ${colour} motif`, `clean modern mix, punchy, sidechained, short punchy hits, big drop`].filter(Boolean).join(', ');
console.log(`\n=== Suno v6 · Create → Custom ===\n\nStyles:\n${styles}\n\nLyrics:\n[Instrumental]\n\n${cue.join('\n\n')}\n\n[End]\n\nMore Options → Exclude Styles:\nvocals, singing, voice, choir, vocal chops, rap, spoken word, heavy distortion, lo-fi, sad, slow\n\nWeirdness 20–25 % · Style Influence 70–75 % · Title: ${sb.name ?? 'Promo'} bed\n\nNote: the cut is ~${total} s; Suno usually returns 2–3 min — generate 2–4 takes and send the best one back: it gets measured and spliced on its bars (drop on the first feature, final hit on the logo). Commercial use needs a paid Suno plan.\n`);
