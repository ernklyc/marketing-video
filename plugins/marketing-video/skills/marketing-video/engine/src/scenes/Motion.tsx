import React from 'react';
import {AbsoluteFill} from 'remotion';
import { useFrame } from '../lib/time';
import { backOut, easeInCubic, easeInOutQuint, easeOutCubic, hexRgb, range, springy } from '../lib/anim';
import { useBrand } from '../lib/brand';
import { KLine, fitSize } from '../lib/Kinetic';

/** Organic blob path (wobbly circle). */
const blobPath = (cx: number, cy: number, r: number, f: number, seed = 0) => {
  let d = '';
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const w = 1 + 0.07 * Math.sin(a * 3 + f / 9 + seed) + 0.05 * Math.sin(a * 5 - f / 7 + seed * 2) + 0.03 * Math.sin(a * 8 + f / 5);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * w).toFixed(1)} ${(cy + Math.sin(a) * r * w).toFixed(1)}`;
  }
  return d + 'Z';
};

export const STATEMENT_LEN = 40;
/** Section opener: accent blob floods the frame, the big statement pops with a ring, then everything collapses to the top chip. */
export const Statement: React.FC<{ l1: string; l2?: string; from?: [number, number]; seed?: number }> = ({ l1, l2, from = [540, 1400], seed = 0 }) => {
  const f = useFrame();
  const B = useBrand();
  if (f > STATEMENT_LEN + 2) return null;
  const grow = easeOutCubic(range(f, 0, 14));
  const shrink = easeInOutQuint(range(f, 24, 16));
  const cx = from[0] + (540 - from[0]) * grow + (540 - 540) * shrink, cy = from[1] + (960 - from[1]) * grow + (130 - 960) * shrink;
  const r = 1500 * grow * (1 - shrink) + 30 * shrink * (1 - range(f, 36, 4));
  const ring = easeOutCubic(range(f, 9, 20));
  const size = fitSize([l1, l2 ?? ''], 124, 80, 0.52);
  const tOut = easeInOutQuint(range(f, 24, 14));
  return (
    <AbsoluteFill style={{ zIndex: 75, pointerEvents: 'none' }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <path d={blobPath(cx, cy, r, f, seed)} fill={B.look === 'flood' ? B.colors.dark : B.colors.accent} />
        <path d={blobPath(cx, cy, r * 0.82, f + 20, seed + 1)} fill={`rgba(255,255,255,0.07)`} />
        {f > 9 && f < 30 && <circle cx={540} cy={960} r={200 + ring * 620} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={6 * (1 - ring) + 1} />}
      </svg>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 960 - size * 1.1 + tOut * (360 - (960 - size * 1.1)), transform: `scale(${1 - tOut * 0.35})`, opacity: 1 - range(f, 32, 6) }}>
        <KLine text={l1} at={5} size={size} color={B.colors.onAccent ?? '#fff'} hl={B.colors.onAccent ?? B.colors.dark} gap={3} />
        {l2 && <KLine text={l2} at={9} size={size} color={B.colors.onAccent ?? '#fff'} hl={B.colors.onAccent ?? B.colors.dark} gap={3} />}
      </div>
    </AbsoluteFill>
  );
};

/** Whip/smear over the phone screen when the app changes page (tap.nav). Rendered inside the phone. */
export const Smear: React.FC<{ at: number[] }> = ({ at }) => {
  const f = useFrame();
  const B = useBrand();
  const a = at.find((t) => f >= t && f < t + 12);
  if (a === undefined) return null;
  const p = (f - a) / 12;
  const o = Math.sin(p * Math.PI);
  return (
    <AbsoluteFill style={{ zIndex: 40, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 9 }, (_, i) => {
        const y = (i * 97 + a * 13) % 874;
        const w = 120 + ((i * 53) % 160);
        const x = -300 + p * 900 + ((i * 71) % 200);
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: 6 + (i % 3) * 4, borderRadius: 8, background: i % 3 ? 'rgba(255,255,255,0.8)' : B.colors.accent, opacity: o * 0.8, filter: 'blur(1px)' }} />;
      })}
      <AbsoluteFill style={{ background: '#fff', opacity: o * 0.18 }} />
    </AbsoluteFill>
  );
};
/** camera punch multiplier for nav taps */
export const punch = (f: number, at: number[]) => at.reduce((k, t) => { const d = f - t; return d >= -2 && d < 16 ? k + 0.045 * Math.sin(((d + 2) / 18) * Math.PI) : k; }, 1);

/** Pill label popping above a tapped element (inside phone coordinates). */
export const TapLabel: React.FC<{ x: number; y: number; at: number; text: string }> = ({ x, y, at, text }) => {
  const f = useFrame();
  const B = useBrand();
  const d = f - at;
  if (d < -10 || d > 30) return null;
  const p = backOut(range(f, at - 10, 10), 2), o = easeInCubic(range(f, at + 22, 8));
  const above = y > 140;
  return (
    <div style={{ position: 'absolute', left: Math.max(70, Math.min(332, x)), top: above ? y - 46 : y + 34, transform: `translate(-50%,0) scale(${p * (1 - o * 0.4)})`, opacity: 1 - o, zIndex: 62, transformOrigin: above ? '50% 100%' : '50% 0%' }}>
      <div style={{ padding: '7px 14px', borderRadius: 999, background: B.colors.dark, color: '#fff', fontFamily: B.fonts.display, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>{text}</div>
    </div>
  );
};

/** "Route ready" motion card: route line draws between two pins. */
export const RouteCard: React.FC<{ at: number; out: number; text: string; sub?: string; y?: number }> = ({ at, out, text, sub, y = 1060 }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at || f > out + 12) return null;
  const p = springy((f - at) / 20, 0.35), o = easeInCubic(range(f, out, 10));
  const draw = easeOutCubic(range(f, at + 6, 26));
  const path = 'M30 120 C 90 120, 90 40, 160 60 S 240 110, 290 30';
  const acc = hexRgb(B.colors.accent);
  return (
    <div style={{ position: 'absolute', left: 540, top: y, transform: `translate(-50%,-50%) scale(${(0.5 + 0.5 * p) * (1 - o * 0.3)}) rotate(${(1 - p) * -6}deg)`, opacity: 1 - o, zIndex: 66 }}>
      <div style={{ width: 620, borderRadius: 40, background: '#fff', boxShadow: `0 40px 90px rgba(${hexRgb(B.colors.shadow)},0.3)`, overflow: 'hidden', fontFamily: B.fonts.display }}>
        <div style={{ height: 190, position: 'relative', background: `linear-gradient(135deg, ${B.colors.bg2}, ${B.colors.bg})` }}>
          <svg width={620} height={190} viewBox="0 0 320 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: 8 }, (_, i) => <line key={i} x1={i * 45} y1={0} x2={i * 45 - 40} y2={150} stroke="rgba(0,0,0,0.05)" strokeWidth={6} />)}
            <path d={path} fill="none" stroke={`rgba(${acc},0.25)`} strokeWidth={9} strokeLinecap="round" />
            <path d={path} fill="none" stroke={B.colors.accent} strokeWidth={6} strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 * (1 - draw)} />
            <circle cx={30} cy={120} r={9} fill="#fff" stroke={B.colors.accent} strokeWidth={4} />
            <g transform={`translate(290 30) scale(${backOut(range(f, at + 26, 10), 2)})`}><circle r={11} fill={B.colors.squiggle} /><circle r={4.5} fill="#fff" /></g>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '24px 30px' }}>
          <div style={{ width: 62, height: 62, borderRadius: 31, background: B.colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" fill="#fff" /></svg>
          </div>
          <div><div style={{ fontSize: 40, fontWeight: 800, color: B.colors.ink }}>{text}</div>{sub && <div style={{ fontSize: 28, fontWeight: 600, color: B.colors.inkSoft }}>{sub}</div>}</div>
        </div>
      </div>
    </div>
  );
};
