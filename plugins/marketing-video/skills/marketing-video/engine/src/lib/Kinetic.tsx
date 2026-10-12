import React from 'react';
import { useFrame } from './time';
import { backOut, easeInCubic, easeOutCubic, range } from './anim';
import { useBrand } from './brand';
import { SAFE, SAFE_W } from './safe';

export type Word = { t: string; hl?: boolean };
/** "*word" marks a highlighted word. */
export const words = (s: string): Word[] => s.split(' ').filter(Boolean).map((t) => (t.startsWith('*') ? { t: t.slice(1), hl: true } : { t }));
export const plain = (s: string) => s.replace(/\*/g, '');

const Squiggle: React.FC<{ w: number; p: number; color: string }> = ({ w, p, color }) => {
  const h = 24, n = Math.max(3, Math.round(w / 55));
  let d = `M2 ${h / 2}`;
  for (let i = 0; i < n; i++) { const x0 = 2 + (i * (w - 4)) / n, x1 = 2 + ((i + 1) * (w - 4)) / n; d += ` Q ${(x0 + x1) / 2} ${i % 2 ? h - 3 : 3}, ${x1} ${h / 2}`; }
  const len = w * 1.25;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, bottom: -h * 0.55, overflow: 'visible' }}>
      <path d={d} stroke={color} strokeWidth={6.5} fill="none" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
    </svg>
  );
};

export type Entrance = 'pop' | 'rise' | 'mask' | 'type';
export const ENTRANCES: Entrance[] = ['pop', 'rise', 'mask', 'type'];
export const KLine: React.FC<{ text: string; at: number; size: number; out?: number; gap?: number; color?: string; hl?: string; font?: string; weight?: number; italic?: boolean; squiggle?: boolean; tracking?: number; entrance?: Entrance }> = ({ text, at, size, out, gap = 4, color, hl, font, weight, italic, squiggle, tracking = -0.03, entrance = 'pop' }) => {
  const f = useFrame();
  const B = useBrand();
  const o = out !== undefined ? easeInCubic(range(f, out, 10)) : 0;
  const w = words(text);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: `0 ${size * 0.26}px`, fontFamily: font ?? B.fonts.display, fontStyle: italic ? 'italic' : 'normal', fontWeight: weight ?? B.fonts.displayWeight ?? 800, fontSize: size, lineHeight: 1.08, letterSpacing: size * tracking }}>
      {(() => { let chars = 0; return w.map((x, i) => {
        const p = range(f, at + i * gap, 13), e = easeOutCubic(p), s = backOut(p, 2.2);
        const sq = easeOutCubic(range(f, at + i * gap + 8, 16));
        const col = x.hl ? hl ?? B.colors.accent : color ?? B.colors.ink;
        const c0 = chars; chars += x.t.length + 1;
        let style: React.CSSProperties;
        let body: React.ReactNode = x.t;
        if (entrance === 'rise') {
          const r = easeOutCubic(range(f, at + i * 2, 18));
          style = { opacity: r * (1 - o), transform: `translateY(${(1 - r) * size * 0.6 - o * size * 0.3}px)`, filter: o ? `blur(${o * 14}px)` : undefined };
        } else if (entrance === 'mask') {
          const r = easeOutCubic(range(f, at + i * 1.5, 16));
          style = { clipPath: 'inset(-10% -5% -25% -5%)', opacity: 1 - o };
          body = <span style={{ display: 'inline-block', transform: `translateY(${(1 - r) * 110}%)` }}>{x.t}</span>;
        } else if (entrance === 'type') {
          const shown = Math.max(0, Math.floor((f - at) * 1.4) - c0);
          style = { opacity: 1 - o };
          body = <>{x.t.slice(0, Math.min(x.t.length, shown))}<span style={{ opacity: 0 }}>{x.t.slice(Math.min(x.t.length, shown))}</span></>;
        } else {
          style = { opacity: e * (1 - o), transform: `translateY(${(1 - e) * size * 0.45 - o * size * 0.3}px) scale(${0.55 + 0.45 * s}) rotate(${(1 - e) * (i % 2 ? 6 : -6)}deg)`, filter: `blur(${(1 - e) * 10 + o * 14}px)`, transformOrigin: '50% 80%' };
        }
        const sqP = entrance === 'type' ? easeOutCubic(range(f, at + (c0 + x.t.length) / 1.4, 14)) : sq;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre', color: col, isolation: 'isolate', ...style }}>
            {body}
            {x.hl && (squiggle ?? B.hlStyle === 'squiggle') && <Squiggle w={x.t.length * size * 0.5} p={sqP} color={B.colors.squiggle} />}
            {x.hl && (B.hlStyle ?? 'marker') === 'marker' && <span style={{ position: 'absolute', left: '-0.08em', right: '-0.08em', top: '18%', bottom: '4%', zIndex: -1, borderRadius: size * 0.12, background: `rgba(${hex(B.colors.accent)},0.22)`, transformOrigin: '0% 50%', transform: `scaleX(${sqP})` }} />}
          </span>
        );
      }); })()}
    </div>
  );
};

/** Font size that keeps the longest line inside ~960px. */
export const fitSize = (lines: string[], max = 92, min = 60, perChar = 0.5) => {
  const n = Math.max(...lines.map((l) => plain(l).length), 1);
  return Math.max(min, Math.min(max, Math.floor(SAFE_W / (n * perChar))));
};

export const TITLE_SIDE = 90;

export const Title: React.FC<{ l1: string; l2?: string; at: number; out: number; top?: number; dark?: boolean; entrance?: Entrance }> = ({ l1, l2, at, out, top = SAFE.top + 70, dark, entrance }) => {
  const B = useBrand();
  const size = fitSize([l1, l2 ?? '']);
  const isDark = dark ?? (B.look === 'flood' || B.look === 'keynote');
  const color = isDark ? B.colors.darkInk : B.colors.ink;
  const hl = B.look === 'flood' && B.world?.kind !== 'aurora' ? B.colors.dark : undefined;
  return (
    <div style={{ position: 'absolute', top, left: TITLE_SIDE, right: TITLE_SIDE, zIndex: 45 }}>
      <KLine text={l1} at={at} size={size} out={out} color={color} hl={hl} entrance={entrance} font={B.look === 'editorial' ? B.fonts.serif : undefined} weight={B.look === 'editorial' ? 700 : undefined} />
      {l2 && <KLine text={l2} at={at + (entrance === 'type' ? Math.ceil(l1.length / 1.4) : 4)} size={size} out={out} color={color} hl={hl} entrance={entrance} font={B.look === 'editorial' ? B.fonts.serif : undefined} weight={B.look === 'editorial' ? 700 : undefined} />}
    </div>
  );
};

export const Chip: React.FC<{ text: string; at?: number; out: number; top?: number }> = ({ text, at = 0, out, top = SAFE.top - 6 }) => {
  const f = useFrame();
  const B = useBrand();
  const p = easeOutCubic(range(f, at, 14)), o = easeInCubic(range(f, out, 10));
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50, opacity: p * (1 - o), transform: `translateY(${(1 - p) * -40 - o * 30}px) scale(${0.85 + 0.15 * p})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 34px 14px 18px', borderRadius: B.look === 'editorial' ? 8 : 999, background: B.look === 'keynote' ? 'rgba(255,255,255,0.1)' : B.look === 'flood' ? B.colors.dark : B.colors.card, border: B.look === 'editorial' ? `2px solid ${B.colors.ink}` : undefined, boxShadow: B.look === 'editorial' ? undefined : `0 18px 50px rgba(${hex(B.colors.shadow)},0.12)`, fontFamily: B.fonts.display, fontWeight: 700, fontSize: 36, color: B.look === 'keynote' || B.look === 'flood' ? '#fff' : B.colors.ink, letterSpacing: -0.5 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: B.colors.accent, boxShadow: `0 0 0 6px rgba(${hex(B.colors.accent)},0.18)` }} />
        {text}
      </div>
    </div>
  );
};
const hex = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
