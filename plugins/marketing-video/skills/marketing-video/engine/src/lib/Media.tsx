import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile} from 'remotion';
import { useFrame, useSub } from './time';
import { easeInCubic, easeInOut, easeOutCubic, hexRgb, range, seeded, springy } from './anim';
import { useBrand } from './brand';
import { Aurora, FloorGrid, Rays, Symbols } from './Backdrop';
import { SW } from './Phone';

export const Clip: React.FC<{ src: string; from: number; rate?: number; fps: number }> = ({ src, from, rate = 1, fps }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * fps * useSub())} playbackRate={rate} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </AbsoluteFill>
);

export type Screen = { src: string; at: number; scroll?: [number, number][]; tr?: 'push' | 'fade' | 'up'; nav?: string };
const yAt = (keys: [number, number][] | undefined, f: number) => {
  if (!keys || !keys.length) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (f <= keys[i + 1][0]) return keys[i][1] + (keys[i + 1][1] - keys[i][1]) * easeInOut((f - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  return keys[keys.length - 1][1];
};
const Shot: React.FC<{ s: Screen; f: number; style?: React.CSSProperties }> = ({ s, f, style }) => {
  const y = yAt(s.scroll, f);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <Img src={staticFile(s.src)} style={{ position: 'absolute', left: 0, top: -y, width: SW }} />
      {y > 0 && <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: 54, overflow: 'hidden' }}><Img src={staticFile(s.src)} style={{ width: SW }} /></div>}
      {s.nav && <Img src={staticFile(s.nav)} style={{ position: 'absolute', left: 0, bottom: 0, width: SW }} />}
    </AbsoluteFill>
  );
};
/** Static screenshots (e.g. stitched tall captures) with scroll keys and push/fade transitions. */
export const Screens: React.FC<{ screens: Screen[] }> = ({ screens }) => {
  const f = useFrame();
  let cur = 0; screens.forEach((s, i) => { if (f >= s.at) cur = i; });
  const s = screens[cur], tr = s.tr ?? 'push';
  const p = easeOutCubic(range(f, s.at, tr === 'fade' ? 8 : 12));
  const prev = cur > 0 && p < 1 ? screens[cur - 1] : null;
  return (
    <AbsoluteFill>
      {prev && <Shot s={prev} f={f} style={tr === 'push' ? { transform: `translateX(${-p * 30}%)`, filter: `brightness(${1 - 0.45 * p})` } : {}} />}
      <Shot s={s} f={f} style={!prev ? {} : tr === 'push' ? { transform: `translateX(${(1 - p) * 100}%)`, boxShadow: '-20px 0 50px rgba(0,0,0,0.4)' } : tr === 'up' ? { transform: `translateY(${(1 - p) * 100}%)` } : { opacity: p }} />
    </AbsoluteFill>
  );
};

/** A crop of the phone screen (image or video) lifted out as a floating card. Crop in logical screen px. */
export const Lift: React.FC<{ src: string; video?: { from: number; rate: number; fps: number }; sx: number; sy: number; sw: number; sh: number; x: number; y: number; k: number; at: number; out: number; rot?: number; glow?: boolean; scrollY?: number }> = ({ src, video, sx, sy, sw, sh, x, y, k, at, out, rot = 0, glow, scrollY = 0 }) => {
  const f = useFrame();
  const S = useSub();
  const B = useBrand();
  if (f < at || f > out + 12) return null;
  const p = springy((f - at) / 22, 0.3), o = easeInCubic(range(f, out, 10));
  const bob = Math.sin((f - at) / 18) * 8;
  const acc = hexRgb(B.colors.accent);
  return (
    <div style={{ position: 'absolute', left: x - (sw * k) / 2, top: y - (sh * k) / 2 + bob, width: sw * k, height: sh * k, zIndex: 55, opacity: Math.min(1, (f - at) / 5) * (1 - o) }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 18 * k, overflow: 'hidden', position: 'relative', transform: `scale(${0.6 + 0.4 * p - o * 0.2}) rotate(${rot * (2 - p)}deg) translateY(${(1 - p) * 60}px)`, boxShadow: `0 ${30 * k}px ${60 * k}px rgba(${hexRgb(B.colors.shadow)},0.3), 0 0 0 ${1.5 * k}px rgba(${acc},${glow ? 0.9 : 0.25})${glow ? `, 0 0 ${40 * k}px rgba(${acc},0.5)` : ''}` }}>
        <div style={{ position: 'absolute', left: -sx * k, top: -(sy + scrollY) * k, width: SW * k }}>
          {video ? <OffthreadVideo src={staticFile(src)} startFrom={Math.round(video.from * video.fps * S)} playbackRate={video.rate} muted style={{ width: SW * k }} /> : <Img src={staticFile(src)} style={{ width: SW * k }} />}
        </div>
      </div>
    </div>
  );
};

type Obj = { x: number; y: number; z: number; kind: number; rot: number; spin: number; ph: number };
const OBJS: Obj[] = (() => { const r = seeded(21); return Array.from({ length: 22 }, () => ({ x: r() * 1080, y: r() * 1920, z: r(), kind: Math.floor(r() * 4), rot: r() * 360, spin: (r() - 0.5) * 0.5, ph: r() * 6.28 })); })();
const Pin: React.FC<{ s: number; c: string }> = ({ s, c }) => (<svg width={s} height={s * 1.3} viewBox="0 0 24 31"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 31 12 31s12-10.6 12-19.3C24 5.2 18.6 0 12 0z" fill={c} /><circle cx="12" cy="11.5" r="4.6" fill="#fff" /></svg>);

/** Soft branded background with drifting depth-of-field decor. */
export const World: React.FC<{ glow?: number }> = ({ glow = 0 }) => {
  const f = useFrame();
  const B = useBrand();
  const C = B.colors, acc = hexRgb(C.accent), sh = hexRgb(C.shadow);
  const kind = B.world?.kind ?? 'dots';
  const cols = B.world?.colors ?? [C.accent, C.squiggle];
  const look = B.look ?? 'soft';
  const syms = B.world?.symbols;
  const deco = (
    <>
      {B.world?.rays && <Rays color={C.accent} />}
      {B.world?.floor && <FloorGrid color={C.accent} />}
      {syms?.length ? <Symbols names={syms} color={B.world?.symbolColor ?? (look === 'keynote' || look === 'flood' ? '#ffffff' : C.accent)} opacity={look === 'keynote' ? 0.32 : 0.45} /> : null}
    </>
  );
  if (B.world?.kind === 'aurora') {
    const dark = look === 'keynote' || look === 'flood';
    return (
      <AbsoluteFill>
        <Aurora base={dark ? C.dark : C.bg} colors={B.world?.colors ?? [C.accent, C.accent2, C.squiggle, C.inkSoft]} strength={dark ? 0.9 : 0.6} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 85% at 50% 50%, transparent 55%, rgba(0,0,0,${dark ? 0.45 : 0.08}))` }} />
        {deco}
      </AbsoluteFill>
    );
  }
  if (look === 'flood') return (
    <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${40 + 20 * Math.sin(f / 80)}% ${30 + 10 * Math.cos(f / 60)}%, rgba(255,255,255,0.22), transparent 55%)` }} />
      {[0, 1, 2].map((i) => <div key={i} style={{ position: 'absolute', width: 900 + i * 300, height: 900 + i * 300, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)', left: 540 - (450 + i * 150) + Math.sin(f / 90 + i) * 40, top: 1300 - (450 + i * 150) + Math.cos(f / 70 + i) * 40 }} />)}
    </AbsoluteFill>
  );
  if (look === 'editorial') return (
    <AbsoluteFill style={{ background: C.bg }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        {Array.from({ length: 13 }, (_, i) => <line key={'v' + i} x1={i * 90} y1={0} x2={i * 90} y2={1920} stroke={C.bg2} strokeWidth={2} />)}
        {Array.from({ length: 22 }, (_, i) => <line key={'h' + i} x1={0} y1={i * 90 - ((f * 0.4) % 90)} x2={1080} y2={i * 90 - ((f * 0.4) % 90)} stroke={C.bg2} strokeWidth={2} />)}
      </svg>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 1830, height: 2, background: C.ink, opacity: 0.25 }} />
    </AbsoluteFill>
  );
  if (look === 'keynote') return (
    <AbsoluteFill style={{ background: C.dark }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 50% at 50% ${62 + 6 * Math.sin(f / 70)}%, rgba(${acc},${0.28 + glow * 0.2}) 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.45))' }} />
      {deco}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 120% 80% at 50% 25%, ${C.card} 0%, ${C.bg} 50%, ${C.bg2} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${50 + 22 * Math.sin(f / 90)}% ${72 + 8 * Math.cos(f / 70)}%, rgba(${acc},${0.13 + glow * 0.2}) 0%, transparent 50%)` }} />
      {kind !== 'none' && OBJS.map((o, i) => {
        const d = 0.35 + o.z * 1.1;
        const blur = o.z > 0.72 ? (o.z - 0.72) * 36 : o.z < 0.22 ? (0.22 - o.z) * 14 : 0;
        const y = ((o.y - f * (0.6 + o.z * 1.5)) % 2100 + 2100) % 2100 - 90;
        const x = o.x + Math.sin(f / 50 + o.ph) * 16 * d;
        const s = 46 * d, c = cols[i % cols.length];
        const el = kind === 'pins' && o.kind === 0 ? <Pin s={s} c={c} />
          : o.kind === 1 ? <div style={{ width: s, height: s, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #fff, ${c})`, opacity: 0.55, boxShadow: `0 ${s * 0.12}px ${s * 0.3}px rgba(${sh},0.15)` }} />
          : o.kind === 2 ? <svg width={s * 0.8} height={s * 0.8} viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" fill={c} opacity={0.6} /></svg>
          : <div style={{ width: s * 1.5, height: s * 0.6, borderRadius: s, background: `linear-gradient(180deg, #fff, ${C.bg2})`, boxShadow: `0 ${s * 0.1}px ${s * 0.3}px rgba(${sh},0.12)` }} />;
        return <div key={i} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, transform: `rotate(${o.kind === 0 ? Math.sin(f / 30 + o.ph) * 12 : o.rot + f * o.spin}deg)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: 0.85 }}>{el}</div>;
      })}
    </AbsoluteFill>
  );
};

export const Swoosh: React.FC<{ at: number; dir: 1 | -1; y: number; color: string }> = ({ at, dir, y, color }) => {
  const f = useFrame();
  const p = range(f, at, 16);
  if (p <= 0 || p >= 1) return null;
  const e = easeInOut(p), x = dir > 0 ? -1400 + e * 3200 : 2480 - e * 3200, st = 1 + Math.sin(p * Math.PI) * 1.6;
  return <div style={{ position: 'absolute', left: x - 300 * st, top: y - 80, width: 600 * st, height: 160, borderRadius: 80, zIndex: 70, transform: `rotate(${-16 * dir}deg)`, background: `linear-gradient(${dir > 0 ? 90 : 270}deg, rgba(255,255,255,0), ${color})`, boxShadow: '0 30px 80px rgba(0,0,0,0.12)' }} />;
};
