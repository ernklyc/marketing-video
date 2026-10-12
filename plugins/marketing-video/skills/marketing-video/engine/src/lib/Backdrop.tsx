import React from 'react';
import {AbsoluteFill} from 'remotion';
import { useFrame } from './time';
import { hexRgb, seeded } from './anim';
import { useBrand } from './brand';

/** Outline symbol set (24-unit viewBox). Pick per brand via brand.world.symbols. */
export const SYMBOLS: Record<string, React.ReactNode> = {
  ball: <><circle cx="12" cy="12" r="9" /><path d="M4.6 6.8c3.2 2.2 3.2 8.2 0 10.4M19.4 6.8c-3.2 2.2-3.2 8.2 0 10.4" /></>,
  racket: <><ellipse cx="10" cy="9" rx="6" ry="7" transform="rotate(-35 10 9)" /><path d="M14 13.5l6 6.5" /><circle cx="8.5" cy="7.5" r=".6" /><circle cx="11" cy="9.5" r=".6" /><circle cx="8.5" cy="11" r=".6" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" />,
  bolt: <path d="M13 2L5 13h6l-1 9 8-11h-6z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.8 2.8L16 10" /></>,
  plane: <path d="M2 13l20-8-7 16-3-7z" />,
  map: <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 13.6c2.8.2 5 2 5 4.9" /></>,
  sort: <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />,
  filter: <path d="M4 5h16l-6 7.5V18l-4 2v-7.5z" />,
};

type Sym = { x: number; y: number; z: number; s: string; rot: number; spin: number; ph: number };
const mk = (names: string[], n: number, seed: number): Sym[] => {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => ({ x: r() * 1080, y: r() * 1920, z: r(), s: names[i % names.length], rot: (r() - 0.5) * 40, spin: (r() - 0.5) * 0.25, ph: r() * 6.28 }));
};

/** Animated mesh-gradient "aurora": 4 slow blurred colour blobs. */
export const Aurora: React.FC<{ colors: string[]; base: string; strength?: number }> = ({ colors, base, strength = 1 }) => {
  const f = useFrame();
  const blobs = colors.slice(0, 4).map((c, i) => {
    const t = f / (140 + i * 37) + i * 1.7;
    return { c, x: 50 + 34 * Math.sin(t), y: 30 + i * 18 + 14 * Math.cos(t * 1.3), r: 46 + 10 * Math.sin(t * 0.7 + i) };
  });
  return (
    <AbsoluteFill style={{ background: base, overflow: 'hidden' }}>
      {blobs.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x - b.r}%`, top: `${b.y - b.r * 0.56}%`, width: `${b.r * 2}%`, height: `${b.r * 1.12}%`, borderRadius: '50%', background: `radial-gradient(circle, rgba(${hexRgb(b.c)},${0.42 * strength}) 0%, rgba(${hexRgb(b.c)},0) 70%)`, filter: 'blur(40px)', mixBlendMode: 'screen' }} />
      ))}
    </AbsoluteFill>
  );
};

/** Floating outline symbols with depth-of-field and parallax drift. */
export const Symbols: React.FC<{ names: string[]; color: string; count?: number; opacity?: number; seed?: number }> = ({ names, color, count = 18, opacity = 0.5, seed = 5 }) => {
  const f = useFrame();
  const list = React.useMemo(() => mk(names, count, seed), [names.join(','), count, seed]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {list.map((o, i) => {
        const d = 0.4 + o.z * 1.2, size = 46 * d;
        const blur = o.z > 0.75 ? (o.z - 0.75) * 30 : o.z < 0.2 ? (0.2 - o.z) * 12 : 0;
        const y = (((o.y - f * (0.35 + o.z * 1.1)) % 2100) + 2100) % 2100 - 90;
        const x = o.x + Math.sin(f / 60 + o.ph) * 14 * d;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, transform: `rotate(${o.rot + f * o.spin}deg)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: opacity * (0.35 + o.z * 0.65) }} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            {SYMBOLS[o.s] ?? SYMBOLS.star}
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/** Perspective floor grid that slowly scrolls (depth cue under the phone). */
export const FloorGrid: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 0.18 }) => {
  const f = useFrame();
  const rgb = hexRgb(color);
  return (
    <AbsoluteFill style={{ perspective: 900, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -1080, right: -1080, top: 1180, height: 1600, transform: 'rotateX(72deg)', transformOrigin: '50% 0%', backgroundImage: `linear-gradient(rgba(${rgb},${opacity}) 2px, transparent 2px), linear-gradient(90deg, rgba(${rgb},${opacity}) 2px, transparent 2px)`, backgroundSize: '90px 90px', backgroundPosition: `0 ${(f * 1.4) % 90}px`, maskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)' }} />
    </AbsoluteFill>
  );
};

/** Soft diagonal light rays sweeping slowly. */
export const Rays: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 0.08 }) => {
  const f = useFrame();
  const rgb = hexRgb(color);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', top: -400, left: -300 + i * 420 + Math.sin(f / 90 + i) * 80, width: 160 + i * 40, height: 2800, transform: 'rotate(24deg)', background: `linear-gradient(90deg, transparent, rgba(${rgb},${opacity}), transparent)`, filter: 'blur(18px)' }} />
      ))}
    </AbsoluteFill>
  );
};
