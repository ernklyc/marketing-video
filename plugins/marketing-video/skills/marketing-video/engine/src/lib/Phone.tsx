import React from 'react';
import {AbsoluteFill} from 'remotion';
import { useAbsFrame, useFrame, useSub } from './time';
import { clamp01, easeInCubic, easeInOut, easeOutCubic, easeOutQuint, hexRgb, range } from './anim';
import { useBrand } from './brand';
import { LAYOUT } from './safe';

export const SW = 402, SH = 874;
export type Cam = { f: number; x: number; y: number; k: number; rx: number; ry: number; rz?: number; z?: boolean; ease?: 'in' | 'out' };

/**
 * Camera = a sum of smootherstep moves: each key starts a move from the previous key's time, so overlapping moves blend
 * with continuous velocity AND acceleration (no jolt when a zoom starts or a cut lands). Zoom runs in log space.
 * Exit keys (`ease: 'in'`) accelerate out; entry keys from off-screen (`ease: 'out'`) arrive already moving and settle.
 */
const CH = ['x', 'y', 'k', 'rx', 'ry', 'rz'] as const;
const val = (c: Cam, ch: (typeof CH)[number]) => (ch === 'k' ? Math.log(c.k) : (c[ch] ?? 0));
const smoother = (t: number) => { const x = clamp01(t); return x * x * x * (x * (x * 6 - 15) + 10); };
export const camAt = (keys: Cam[], f: number): Cam => {
  const out: Record<string, number> = {};
  for (const ch of CH) {
    let v = val(keys[0], ch);
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], c = keys[i];
      const d = val(c, ch) - val(a, ch);
      if (!d) continue;
      const p = range(f, a.f, Math.max(1, c.f - a.f));
      v += d * (c.ease === 'in' ? easeInCubic(p) : c.ease === 'out' ? easeOutQuint(p) : smoother(p));
    }
    out[ch] = ch === 'k' ? Math.exp(v) : v;
  }
  return { f, x: out.x, y: out.y, k: out.k, rx: out.rx, ry: out.ry, rz: out.rz };
};

const rest = (f: number, rx: number, ry: number, k = 1.42, y = 1255, x = 540): Cam => ({ f, x, y, k, rx, ry });
export const focus = (f: number, sx: number, sy: number, k: number, ty = 1200): Cam => ({ f, x: 540 - (sx - 201) * k, y: ty - (sy - 437) * k, k, rx: 0, ry: 0, z: true });
/** Presets are authored for a phone at (540,1255)·1.44; normalise them onto the layout's stage rest. Focus (zoom) keys are absolute. */
const R = LAYOUT.restK / 1.44;
const toStage = (c: Cam): Cam => (c.z ? c : { ...c, k: c.k * R, y: LAYOUT.restY + (c.y - 1255) * R, x: 540 + (c.x - 540) * R });
/** Frames a moving exit takes; the phone is fully gone at `len`, so the next section's phone never shares the frame. */
export const EXIT_LEN: Record<string, number> = { up: 12, whip: 8, flip: 6, drop: 12, push: 14 };

export type Zoom = { at: number; len: number; y: number; x?: number; k?: number; ty?: number };
/** Camera presets — variety between sections; `side` alternates direction. */
export type Exit = 'up' | 'stay' | 'whip' | 'push' | 'hold' | 'flip' | 'drop';
/** world position of a screen point for a phone at rest */
export const screenToWorld = (cam: Cam, sx: number, sy: number) => ({ x: cam.x + (sx - 201) * cam.k, y: cam.y + (sy - 437) * cam.k });
export const REST_CAM: Cam = { f: 0, x: 540, y: LAYOUT.restY, k: LAYOUT.restK, rx: 0, ry: 0 };
export const camPreset = (preset: string, len: number, side: 1 | -1, zoom?: Zoom | Zoom[], exit: Exit = 'up', exitPt?: { x: number; y: number }): Cam[] => {
  const s = side;
  let exitUp: Cam = exit === 'up' ? { ease: 'in', f: len, x: 540, y: -1400, k: 1.3, rx: -20, ry: 8 * s, rz: -4 * s }
    : exit === 'whip' ? { ease: 'in', f: len, x: -610, y: 1255, k: 1.44, rx: 1, ry: 18, rz: -2 }
    : exit === 'flip' ? { ease: 'in', f: len, x: 540, y: 1255, k: 1.36, rx: 0, ry: -90 * s }
    : exit === 'drop' ? { ease: 'in', f: len, x: 540, y: 3300, k: 1.38, rx: 18, ry: 0, rz: 9 * s }
    : exit === 'push' ? { ease: 'in', f: len, x: 540 - ((exitPt?.x ?? 201) - 201) * 6, y: 1220 - ((exitPt?.y ?? 437) - 437) * 6, k: 6, rx: 0, ry: 0 }
    : { f: len + 20, x: 540, y: 1255, k: 1.45, rx: 0, ry: 0 };
  let keys: Cam[];
  switch (preset) {
    case 'slide':
      keys = [{ f: 0, x: 540 + 1300 * s, y: 1300, k: 1.3, rx: 6, ry: -40 * s, rz: 8 * s }, rest(20, 4, -10 * s), rest(len - 8, 2, 8 * s, 1.46), exitUp];
      if (exit === 'up') exitUp = keys[keys.length - 1] = { ease: 'in', f: len, x: 540 - 1400 * s, y: 1250, k: 1.3, rx: 4, ry: 35 * s, rz: -6 * s };
      break;
    case 'push':
      keys = [{ f: 0, x: 540, y: 1180, k: 2.2, rx: 0, ry: 0 }, rest(24, 3, -5 * s, 1.42), rest(len - 8, 2, 6 * s, 1.47), exitUp];
      break;
    case 'orbit':
      keys = [{ f: 0, x: 540, y: 2350, k: 1.3, rx: 30, ry: -12 * s, rz: 5 * s }, rest(18, 6, -18 * s), rest(Math.round(len / 2), 3, 0, 1.44), rest(len - 8, 4, 18 * s, 1.44), exitUp];
      break;
    case 'flipIn':
      keys = [{ f: 0, x: 540, y: 1255, k: 1.36, rx: 0, ry: 90 * s }, { f: 5, x: 540, y: 1255, k: 1.36, rx: 0, ry: 90 * s }, { f: 13, x: 540, y: 1255, k: 1.44, rx: 2, ry: -7 * s }, rest(19, 2, 2 * s, 1.43), rest(len - 8, 1, -4 * s, 1.46), exitUp];
      break;
    case 'dropIn':
      keys = [{ f: 0, x: 540, y: -1300, k: 1.38, rx: -16, ry: 0, rz: -7 * s }, { f: 11, x: 540, y: 1300, k: 1.43, rx: 3, ry: 0, rz: 1.2 * s }, { f: 17, x: 540, y: 1240, k: 1.42, rx: 1, ry: 0, rz: -0.4 * s }, rest(23, 2, -3 * s, 1.42), rest(len - 8, 1, 4 * s, 1.46), exitUp];
      break;
    case 'whipIn':
      keys = [{ f: 0, x: 1115, y: 1255, k: 1.44, rx: 1, ry: 18, rz: 2 }, { f: 8, x: 540, y: 1255, k: 1.42, rx: 3, ry: -4 * s }, rest(len - 8, 2, 6 * s, 1.46), exitUp];
      break;
    case 'pullback':
      keys = [{ f: 0, x: 540, y: 1180, k: 3.4, rx: 0, ry: 0 }, rest(18, 3, -5 * s, 1.42), rest(len - 8, 2, 6 * s, 1.47), exitUp];
      break;
    case 'settled':
      keys = [rest(0, 0, 0, 1.45), rest(len - 8, 0, 0, 1.45), exitUp];
      break;
    case 'flat':
      keys = [{ f: 0, x: 540, y: 2350, k: 1.3, rx: 30, ry: -12 * s, rz: 5 * s }, rest(18, 0, 0, 1.45), rest(len - 8, 0, 0, 1.47), exitUp];
      break;
    default:
      keys = [{ f: 0, x: 540, y: 2350, k: 1.3, rx: 30, ry: -12 * s, rz: 5 * s }, rest(18, 5, -7 * s), rest(Math.round(len / 2), 2, 4 * s, 1.44), rest(len - 8, 3, -5 * s, 1.45), exitUp];
  }
  keys[keys.length - 1] = exitUp;
  const E = EXIT_LEN[exit] ?? 0;
  if (E) {
    const settle = keys.filter((c) => c !== exitUp && c.f <= len - E);
    keys = [...settle, rest(len - E, 0, 0, 1.45), exitUp];
  }
  keys.sort((a, b) => a.f - b.f);
  const zEnd = len - E - 22;
  for (const zm of (Array.isArray(zoom) ? zoom : zoom ? [zoom] : []).sort((a, b) => a.at - b.at)) {
    if (zm.at >= zEnd - 10) continue;
    const zl = Math.min(zm.len, zEnd - zm.at);
    const k = zm.k ?? 1.75, ty = zm.ty ?? 1200;
    const z = [focus(zm.at, zm.x ?? 201, zm.y, k, ty), focus(zm.at + zl, zm.x ?? 201, zm.y + 4, k + 0.02, ty - 3)];
    const before = keys.filter((c) => c.f <= zm.at - 26);
    const after = keys.filter((c) => c.f >= zm.at + zl + 26);
    const hold = before.length ? { ...before[before.length - 1], f: zm.at - 26, ease: undefined } : rest(zm.at - 26, 0, 0, 1.45);
    keys = [...before, hold, ...z, rest(zm.at + zl + 26, 0, 0, 1.45), ...after].sort((a, b) => a.f - b.f);
  }
  if (keys.length > 1 && Math.abs(keys[0].y - keys[1].y) + Math.abs(keys[0].x - keys[1].x) > 400) keys[1] = { ...keys[1], ease: 'out' };
  return keys.map(toStage);
};

/** The phone's stage: everything above LAYOUT.stage fades out, so a zoomed or entering phone never runs under the title or caption band. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const m = `linear-gradient(to bottom, transparent ${LAYOUT.stage - 90}px, #000 ${LAYOUT.stage}px)`;
  return <AbsoluteFill style={{ WebkitMaskImage: m, maskImage: m }}>{children}</AbsoluteFill>;
};

let phoneId = 0;
/** prev = camera one frame earlier → directional motion blur on fast moves; drift = subtle handheld float (seeded, deterministic). */
export const Phone: React.FC<{ cam: Cam; prev?: Cam; children: React.ReactNode; shadow?: number; drift?: number }> = ({ cam: cam0, prev, children, shadow = 1, drift = 1 }) => {
  const B = useBrand();
  const f = useFrame();
  const [id] = React.useState(() => `mb${phoneId++}`);
  const tint = hexRgb(B.colors.shadow);
  const bezel = 12, W = SW + bezel * 2, H = SH + bezel * 2;
  const fa = useAbsFrame();
  const d = drift * (B.handheld ?? 1);
  const cam = { ...cam0, x: cam0.x + d * (Math.sin(fa / 61) * 2.4 + Math.sin(fa / 37 + 1.3) * 0.7), y: cam0.y + d * (Math.cos(fa / 67) * 2.6 + Math.sin(fa / 41) * 0.8), rz: (cam0.rz ?? 0) + d * Math.sin(fa / 79 + 0.7) * 0.18 };
  const sub = useSub();
  const vx = prev && sub === 1 ? cam0.x - prev.x : 0, vy = prev && sub === 1 ? cam0.y - prev.y : 0;
  // only genuinely fast moves (whip / drop / exits) blur; slow drifts and slides stay sharp
  const bx = Math.min(24, Math.max(0, (Math.abs(vx) - 25) * 0.18)), by = Math.min(24, Math.max(0, (Math.abs(vy) - 25) * 0.18));
  const blur = bx + by > 0.3;
  return (
    <div style={{ position: 'absolute', left: cam.x - W / 2, top: cam.y - H / 2, width: W, height: H, perspective: 2600, transform: `scale(${cam.k}) rotate(${cam.rz ?? 0}deg)`, filter: blur ? `url(#${id})` : undefined }}>
      {blur && <svg width={0} height={0} style={{ position: 'absolute' }}><filter id={id} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} /></filter></svg>}
      <div style={{ width: W, height: H, transform: `rotateX(${cam.rx}deg) rotateY(${cam.ry}deg)`, transformStyle: 'preserve-3d' }}>
        {[[-3, 130, 32], [-3, 185, 60], [-3, 258, 60], [W - 1, 210, 94]].map(([x, y, h], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: h, borderRadius: 2, background: 'linear-gradient(to right,#9aa0a6,#e4e7ea,#9aa0a6)' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 66, padding: 3, background: 'linear-gradient(135deg,#f3f4f5 0%,#b9bec4 25%,#e9ebed 50%,#a4aab1 78%,#eef0f2 100%)', boxShadow: `0 ${70 * shadow}px ${120 * shadow}px rgba(${tint},${0.3 * shadow}), 0 ${20 * shadow}px ${40 * shadow}px rgba(${tint},${0.22 * shadow})` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 63, background: '#07090a', padding: bezel - 3, boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', width: SW, height: SH, borderRadius: 54, overflow: 'hidden', transform: 'translateZ(0)', background: B.colors.bg }}>
              {children}
              <div style={{ position: 'absolute', top: 11, left: (SW - 124) / 2, width: 124, height: 36, borderRadius: 18, background: '#000', zIndex: 100 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%)', pointerEvents: 'none', zIndex: 101 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export type Tap = { f: number; x: number; y: number };
/** iOS-style touch indicator: arrives on a soft arc, presses (shrinks), releases with a ripple. */
export const Touch: React.FC<{ taps: Tap[] }> = ({ taps }) => {
  const f = useFrame();
  const B = useBrand();
  const acc = hexRgb(B.colors.accent);
  return (
    <>
      {taps.map((t, i) => {
        const d = f - t.f;
        if (d < -16 || d > 26) return null;
        const prev = taps[i - 1];
        const fromX = prev && t.f - prev.f < 40 ? prev.x : t.x + 70, fromY = prev && t.f - prev.f < 40 ? prev.y : t.y + 120;
        const a = easeOutCubic(range(f, t.f - 16, 14));
        const x = fromX + (t.x - fromX) * a, y = fromY + (t.y - fromY) * a - Math.sin(a * Math.PI) * 30;
        const press = d >= -2 && d < 5 ? 1 - Math.abs(d - 1) / 4 : 0;
        const vis = Math.min(clamp01((d + 16) / 6), 1 - clamp01((d - 10) / 10));
        const rip = d >= 0 ? easeOutCubic(d / 20) : 0;
        const r = 26 * (1 - 0.22 * clamp01(press));
        return (
          <React.Fragment key={i}>
            {d >= 0 && d < 20 && <div style={{ position: 'absolute', left: t.x - 60 * rip - 14, top: t.y - 60 * rip - 14, width: 120 * rip + 28, height: 120 * rip + 28, borderRadius: '50%', border: `3px solid rgba(${acc},${0.7 * (1 - rip)})`, zIndex: 60 }} />}
            <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', opacity: vis, zIndex: 61, background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.55) 60%, rgba(${acc},0.35))`, boxShadow: `0 8px 22px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.7)` }} />
          </React.Fragment>
        );
      })}
    </>
  );
};
