import React from 'react';
import {AbsoluteFill} from 'remotion';
import { springStep, useFrame } from '../lib/time';
import { clamp01, easeInCubic, easeOutCubic, hexRgb, range } from '../lib/anim';
import { useBrand } from '../lib/brand';
import { SYMBOLS } from '../lib/Backdrop';
import { Cam, screenToWorld } from '../lib/Phone';
import { LAYOUT, SAFE, SIDE } from '../lib/safe';

export type CalloutDef = { tap?: number; until?: number; at?: number; t?: number; x?: number; y?: number; text: string; sub?: string; icon?: string; side?: 'left' | 'right'; beats?: number; r?: number; zoom?: boolean; arrow?: boolean; k?: number };
export type WidgetDef = { type: 'stat' | 'ring' | 'badge' | 'list'; at: number; beats?: number; value?: number; from?: number; suffix?: string; label: string; icon?: string; progress?: number; items?: string[]; x?: number; y?: number; side?: 'left' | 'right' };

const sp = (f: number, fps = 30, damping = 14, mass = 0.7, stiffness = 140) => springStep(f / fps, Math.sqrt(stiffness / mass), damping / (2 * Math.sqrt(stiffness * mass)));

const Icon: React.FC<{ name?: string; size: number; color: string }> = ({ name, size, color }) =>
  name && SYMBOLS[name] ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{SYMBOLS[name]}</svg> : null;

/** Inside the phone (screen coords): dims everything except a soft circle and pulses a ring on the target. */
export const Spotlight: React.FC<{ x: number; y: number; at: number; len: number; r?: number; dim?: number }> = ({ x, y, at, len, r = 46, dim = 0.55 }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at - 2 || f > at + len + 10) return null;
  const p = easeOutCubic(range(f, at - 2, 10)) * (1 - easeInCubic(range(f, at + len, 10)));
  const pulse = (f - at) % 30 / 30;
  const acc = hexRgb(B.colors.accent);
  return (
    <AbsoluteFill style={{ zIndex: 58, pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, rgba(4,8,12,${dim * p}) ${r + 26}px)` }} />
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `3px solid rgba(${acc},${p})`, boxShadow: `0 0 24px rgba(${acc},${0.6 * p})` }} />
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `2px solid rgba(${acc},${(1 - pulse) * 0.7 * p})`, transform: `scale(${1 + pulse * 0.6})` }} />
    </AbsoluteFill>
  );
};

/** Callout caption: centred glass card in the caption band (icon · title · sub on its own line). Never at the frame edge, never over UI. */
export const CalloutCaption: React.FC<{ at: number; len: number; text: string; sub?: string; icon?: string; top?: number }> = ({ at, len, text, sub, icon, top = LAYOUT.band }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at || f > at + len + 12) return null;
  const p = sp(f - at - 2, 30, 16), out = easeInCubic(range(f, at + len, 10));
  const acc = B.colors.accent;
  return (
    <div style={{ position: 'absolute', top, left: SIDE, right: SIDE, height: LAYOUT.bandBottom - top, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 64, pointerEvents: 'none', opacity: clamp01(p * 1.4) * (1 - out), transform: `translateY(${(1 - p) * 26 - out * 16}px) scale(${0.9 + 0.1 * p})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, maxWidth: 1080 - SIDE * 2, padding: sub ? '16px 40px 16px 16px' : '14px 40px 14px 14px', borderRadius: 999, background: 'rgba(12,20,27,0.88)', backdropFilter: 'blur(14px)', border: `1.5px solid rgba(${hexRgb(acc)},0.45)`, boxShadow: '0 22px 60px rgba(0,0,0,0.5)', fontFamily: B.fonts.display, color: '#fff' }}>
        {icon && <div style={{ width: 72, height: 72, borderRadius: 36, background: acc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={38} color={B.colors.onAccent ?? '#0A1821'} /></div>}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: icon ? 'flex-start' : 'center', minWidth: 0 }}>
          <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{text}</span>
          {sub && <span style={{ fontSize: 30, fontWeight: 600, opacity: 0.72, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
};

/** Arrow from the caption band down to the target on the phone (world coords follow the camera). Draws on, then the head settles with a small nudge. */
export const Pointer: React.FC<{ cam: Cam; sx: number; sy: number; at: number; len: number; r?: number }> = ({ cam, sx, sy, at, len, r = 46 }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at + 4 || f > at + len + 12) return null;
  const pt = screenToWorld(cam, sx, sy);
  const gap = r * cam.k + 14;
  const x0 = 540 + Math.max(-140, Math.min(140, (pt.x - 540) * 0.35)), y0 = LAYOUT.bandBottom + 6;
  const dx = pt.x - x0, dy = pt.y - y0, d = Math.hypot(dx, dy);
  if (d < gap + 40) return null;
  const x1 = pt.x - (dx / d) * gap, y1 = pt.y - (dy / d) * gap;
  const bend = Math.sign(dx || 1) * Math.min(90, Math.abs(dx) * 0.5 + 30);
  const cx = (x0 + x1) / 2 - bend * (dy / d), cy = (y0 + y1) / 2 + bend * (dx / d) * 0.4;
  const draw = easeOutCubic(range(f, at + 4, 14)), out = easeInCubic(range(f, at + len, 10));
  const nudge = Math.sin(Math.max(0, f - at - 18) / 7) * 5 * clamp01((f - at - 18) / 6);
  const ang = Math.atan2(y1 - cy, x1 - cx), hx = x1 + Math.cos(ang) * nudge, hy = y1 + Math.sin(ang) * nudge;
  const L = d * 1.3;
  const acc = B.colors.accent;
  const head = (a: number) => `${hx + Math.cos(ang + a) * -26},${hy + Math.sin(ang + a) * -26}`;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, zIndex: 63, pointerEvents: 'none', overflow: 'visible', opacity: 1 - out, filter: `drop-shadow(0 0 10px rgba(${hexRgb(acc)},0.55)) drop-shadow(0 6px 10px rgba(0,0,0,0.5))` }}>
      <path d={`M${x0} ${y0} Q ${cx} ${cy}, ${hx} ${hy}`} fill="none" stroke={acc} strokeWidth={7} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
      {draw > 0.92 && <polyline points={`${head(0.5)} ${hx},${hy} ${head(-0.5)}`} fill="none" stroke={acc} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((draw - 0.92) * 12)} />}
      <circle cx={x0} cy={y0} r={7 * draw} fill={acc} />
    </svg>
  );
};

/** Widgets sit centred in the band, which the phone vacates (it drops lower) while one is up. */
export const WIDGET_Y = LAYOUT.band + 200;

/** Floating info widgets (world coords): stat counter, progress ring, icon badge, check list. Spring-in, gentle float. */
export const Widget: React.FC<{ w: WidgetDef; at: number; len: number }> = ({ w, at, len }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at || f > at + len + 12) return null;
  const p = sp(f - at, 30, 12), out = easeInCubic(range(f, at + len, 10));
  const acc = B.colors.accent, onA = B.colors.onAccent ?? '#0A1821';
  const side = w.side ?? 'right';
  const x = w.x ?? 540, y = (w.y ?? WIDGET_Y) + Math.sin((f - at) / 22) * 6;
  const card: React.CSSProperties = { borderRadius: 32, background: 'rgba(16,24,32,0.84)', backdropFilter: 'blur(14px)', border: `1.5px solid rgba(${hexRgb(acc)},0.45)`, boxShadow: '0 30px 70px rgba(0,0,0,0.45)', fontFamily: B.fonts.display, color: '#fff', padding: '26px 30px' };
  const wrap = (child: React.ReactNode) => (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${(0.6 + 0.4 * p) * (1 - out * 0.2)}) rotate(${(1 - p) * (side === 'right' ? 8 : -8)}deg)`, opacity: clamp01(p * 1.5) * (1 - out), zIndex: 63 }}>{child}</div>
  );
  if (w.type === 'stat') {
    const n = Math.round((w.from ?? 0) + ((w.value ?? 0) - (w.from ?? 0)) * easeOutCubic(range(f, at + 4, 26)));
    return wrap(<div style={{ ...card, minWidth: 260, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}><span style={{ fontSize: 96, fontWeight: 900, color: acc, letterSpacing: -3, lineHeight: 1 }}>{n}</span>{w.suffix && <span style={{ fontSize: 40, fontWeight: 800, color: acc }}>{w.suffix}</span>}</div>
      <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.8, marginTop: 6 }}>{w.label}</div>
    </div>);
  }
  if (w.type === 'ring') {
    const pr = (w.progress ?? 0.7) * easeOutCubic(range(f, at + 4, 30)), R = 70, C = 2 * Math.PI * R;
    return wrap(<div style={{ ...card, display: 'flex', alignItems: 'center', gap: 22 }}>
      <svg width={170} height={170} viewBox="0 0 170 170"><circle cx="85" cy="85" r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="16" fill="none" /><circle cx="85" cy="85" r={R} stroke={acc} strokeWidth="16" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pr)} transform="rotate(-90 85 85)" /><text x="85" y="97" textAnchor="middle" fontSize="38" fontWeight="900" fill="#fff" fontFamily={B.fonts.display}>{Math.round(pr * 100)}%</text></svg>
      <div style={{ fontSize: 34, fontWeight: 800, maxWidth: 220, lineHeight: 1.1 }}>{w.label}</div>
    </div>);
  }
  if (w.type === 'list') {
    return wrap(<div style={{ ...card, minWidth: 330 }}>
      <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.7, marginBottom: 12 }}>{w.label}</div>
      {(w.items ?? []).map((it, i) => { const q = sp(f - at - 8 - i * 6, 30, 14); return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '10px 0', opacity: clamp01(q * 1.5), transform: `translateX(${(1 - q) * 30}px)` }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={28} color={onA} /></div>
          <span style={{ fontSize: 34, fontWeight: 800 }}>{it}</span>
        </div>); })}
    </div>);
  }
  return wrap(<div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18, borderRadius: 999, padding: '18px 34px 18px 18px' }}>
    <div style={{ width: 72, height: 72, borderRadius: 36, background: acc, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${(1 - p) * -90}deg)` }}><Icon name={w.icon ?? 'star'} size={40} color={onA} /></div>
    <span style={{ fontSize: 40, fontWeight: 800, whiteSpace: 'nowrap' }}>{w.label}</span>
  </div>);
};
