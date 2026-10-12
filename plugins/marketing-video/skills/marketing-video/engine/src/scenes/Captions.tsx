import React from 'react';
import {AbsoluteFill} from 'remotion';
import { useFrame } from '../lib/time';
import { backOut, easeOutCubic, range } from '../lib/anim';
import { useBrand } from '../lib/brand';
import { SAFE, SIDE } from '../lib/safe';

export type VoLine = { at: number; dur: number; src: string; words: { w: string; s: number; e: number }[] };

/** Word-synced captions (TikTok style): pages of ≤4 words / ≤22 chars, active word highlighted, inside the safe zone. */
export const VoCaptions: React.FC<{ lines: VoLine[]; beat: number; fps: number; hideFrom?: number }> = ({ lines, beat, fps, hideFrom }) => {
  const f = useFrame();
  if (hideFrom !== undefined && f >= hideFrom) return null;
  const B = useBrand();
  const t = f / fps;
  for (const ln of lines) {
    const t0 = (ln.at * beat) / fps, lt = t - t0;
    if (lt < -0.05 || lt > ln.dur + 0.25) continue;
    const pages: VoLine['words'][] = [];
    let cur: VoLine['words'] = [];
    for (const w of ln.words) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0);
      if (cur.length >= 4 || len + w.w.length > 22) { pages.push(cur); cur = []; }
      cur.push(w);
      if (/[.!?,]$/.test(w.w) && cur.length >= 2) { pages.push(cur); cur = []; }
    }
    if (cur.length) pages.push(cur);
    const page = pages.find((p, i) => lt < (pages[i + 1]?.[0].s ?? Infinity)) ?? pages[pages.length - 1];
    const ps = page[0].s, pin = backOut(range(lt, ps - 0.02, 0.16), 2);
    return (
      <AbsoluteFill style={{ zIndex: 96, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: SIDE, right: SIDE, top: SAFE.bottom - 200, display: 'flex', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '16px 10px 16px 38px', borderRadius: 26, background: 'rgba(10,14,20,0.72)', backdropFilter: 'blur(8px)', transform: `scale(${0.85 + 0.15 * pin})`, opacity: Math.min(1, pin * 1.5), fontFamily: B.fonts.display, fontWeight: 800, fontSize: 62, lineHeight: 1.15, letterSpacing: -0.5 }}>
            {page.map((w, i) => {
              const cur = page.reduce((k, x, j) => (lt >= x.s - 0.03 ? j : k), -1);
              const on = lt >= w.s - 0.03, active = i === cur;
              const p = easeOutCubic(range(lt, w.s - 0.03, 0.12));
              return <span key={i} style={{ color: active ? B.colors.accent2 === '#ffffff' ? B.colors.accent : B.colors.accent2 : '#fff', opacity: 0.45 + 0.55 * p, transform: `translateY(${(1 - p) * 8}px) scale(${active ? 1.04 : 1})`, display: 'inline-block', marginRight: '0.45em', transformOrigin: '50% 70%' }}>{w.w}</span>;
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  return null;
};

/** Music gain: ducked under voiceover lines with 0.2 s ramps. */
export const duckAt = (f: number, lines: VoLine[], beat: number, fps: number, depth = 0.3) => {
  const t = f / fps; let g = 1;
  for (const ln of lines) {
    const a = (ln.at * beat) / fps, b = a + ln.dur;
    const k = t < a - 0.2 || t > b + 0.3 ? 0 : t < a ? (t - (a - 0.2)) / 0.2 : t > b ? 1 - (t - b) / 0.3 : 1;
    g = Math.min(g, 1 - (1 - depth) * Math.max(0, Math.min(1, k)));
  }
  return g;
};

/** Film finish: animated grain + vignette (brand.grain / brand.vignette). */
export const Finish: React.FC<{ grain: number; vignette: number }> = ({ grain, vignette }) => {
  const f = useFrame();
  return (
    <AbsoluteFill style={{ zIndex: 95, pointerEvents: 'none' }}>
      {grain > 0 && (
        <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.09 * grain, mixBlendMode: 'overlay' }}>
          <filter id="pv-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 97} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#pv-grain)" />
        </svg>
      )}
      {vignette > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 85% at 50% 50%, transparent 60%, rgba(0,0,0,${0.35 * vignette}))` }} />}
    </AbsoluteFill>
  );
};
