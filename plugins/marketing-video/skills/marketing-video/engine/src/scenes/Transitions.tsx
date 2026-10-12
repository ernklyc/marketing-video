import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import { Hold, useFrame, useSub } from '../lib/time';
import { easeInCubic, easeInOutQuint, easeOutCubic, hexRgb, range } from '../lib/anim';
import { useBrand } from '../lib/brand';
import { World } from '../lib/Media';
import { REST_CAM, SH, SW } from '../lib/Phone';

/**
 * Narrative transitions (adapted from the saas-motion-kit transition atlas, MIT).
 * A section declares how it ENTERS (`transition`); the previous section adapts its exit:
 *   statement  mask   blob floods, big statement, collapses to the chip (motif — max 2 per film)
 *   iris       mask   focal iris opening from the previous section's last tap
 *   split      mask   three brand strips close over A and open on B (good for topic changes)
 *   carry      carry  a crop of A's last frame (the tapped thing) lifts off and becomes B's chip
 *   whip       camera A whips out left, B whips in from the right, horizontal streaks
 *   push       camera dive into A's last tap, B pulls back out of it (once per film)
 *   hold       cut    A freezes on the downbeat, flash, hard cut to B (needs a real downbeat)
 *   cut        cut    plain hard cut, B already in place (quiet base between busy beats)
 *   flood      mask   the tapped element floods the frame in brand dark, holds a beat, contracts into B's phone screen
 * No crossfades anywhere: scenes are made out of the previous one or cut.
 */
export type TransitionKind = 'statement' | 'iris' | 'split' | 'carry' | 'whip' | 'push' | 'hold' | 'cut' | 'flood';
export const FAMILY: Record<string, string> = { statement: 'mask', iris: 'mask', split: 'mask', carry: 'carry', whip: 'camera', push: 'camera', hold: 'cut', cut: 'cut', curtain: 'material', flip: 'camera', drop: 'material', flood: 'mask' };
export const exitFor = (next?: string): 'up' | 'stay' | 'whip' | 'push' | 'hold' | 'flip' | 'drop' =>
  next === 'outro' ? 'stay' : next === 'flip' ? 'flip' : next === 'drop' ? 'drop' :
  next === 'whip' ? 'whip' : next === 'push' ? 'push' : next === 'hold' ? 'hold' : next === 'iris' || next === 'split' || next === 'carry' || next === 'cut' || next === 'flood' ? 'stay' : 'up';
export const entryCam = (tin: string, cam?: string) => (tin === 'flip' ? 'flipIn' : tin === 'drop' ? 'dropIn' : tin === 'whip' ? 'whipIn' : tin === 'push' ? 'pullback' : tin === 'statement' ? cam ?? 'rise' : 'settled');
export const STAY = 20;
export const FLOOD = { full: 9, contract: 13 };

export type CarrySpec = { src: string; t: number; sx: number; sy: number; sw: number; sh: number; from: { x: number; y: number; k: number } };

/** Wraps an entering section; renders the reveal for its transition. */
export const TransitionIn: React.FC<{ kind: string; origin?: { x: number; y: number }; children: React.ReactNode }> = ({ kind, origin, children }) => {
  const f = useFrame();
  if (kind === 'iris') {
    const p = easeInOutQuint(range(f, 0, 18));
    if (p >= 1) return <>{children}</>;
    const o = origin ?? { x: 540, y: 1200 };
    const r = p * 2300;
    return (
      <>
        <AbsoluteFill style={{ clipPath: `circle(${r}px at ${o.x}px ${o.y}px)` }}><World />{children}</AbsoluteFill>
        <IrisRing o={o} r={r} p={p} />
      </>
    );
  }
  if (kind === 'split' || kind === 'carry') {
    if (f >= (kind === 'split' ? 9 : 6)) return <>{children}</>;
    return null;
  }
  if (kind === 'flood') return f >= FLOOD.full ? <>{children}</> : null;
  return <>{children}</>;
};

const IrisRing: React.FC<{ o: { x: number; y: number }; r: number; p: number }> = ({ o, r, p }) => {
  const B = useBrand();
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, zIndex: 76, pointerEvents: 'none' }}>
      <circle cx={o.x} cy={o.y} r={r} fill="none" stroke={B.colors.accent} strokeWidth={14 * (1 - p) + 2} opacity={1 - p * 0.6} />
    </svg>
  );
};

/** Overlays drawn at the cut (inside the entering section, frame 0 = the cut). */
export const TransitionFx: React.FC<{ kind: string; carry?: CarrySpec; fps: number; origin?: { x: number; y: number } }> = ({ kind, carry, fps, origin }) => {
  const f = useFrame();
  const S = useSub();
  const B = useBrand();
  if (kind === 'split') {
    const cols = [B.colors.accent, B.colors.dark, B.colors.accent2];
    return (
      <AbsoluteFill style={{ zIndex: 78, pointerEvents: 'none' }}>
        {[0, 1, 2].map((i) => {
          const inn = easeInOutQuint(range(f, -10 + i * 2, 9)), out = easeInOutQuint(range(f, 8 + i * 2, 9));
          const y = (1 - inn) * -100 + out * 100;
          if (inn <= 0 || out >= 1) return null;
          return <div key={i} style={{ position: 'absolute', left: i * 360, top: 0, width: 362, height: 1920, background: cols[i], transform: `translateY(${y}%)` }} />;
        })}
      </AbsoluteFill>
    );
  }
  if (kind === 'flood') {
    const o = origin ?? { x: 540, y: 1200 };
    const grow = easeInOutQuint(range(f, 0, FLOOD.full)), shrink = easeInOutQuint(range(f, FLOOD.full + 3, FLOOD.contract)), fade = easeOutCubic(range(f, FLOOD.full + 3 + FLOOD.contract - 4, 6));
    if (fade >= 1) return null;
    const R = REST_CAM, sw = (SW + 0) * R.k, sh = SH * R.k;
    const big = { x: -600, y: -600, w: 2280, h: 3120, r: 0 };
    const dot = { x: o.x - 40, y: o.y - 40, w: 80, h: 80, r: 40 };
    const scr = { x: R.x - sw / 2, y: R.y - sh / 2, w: sw, h: sh, r: 54 * R.k };
    const a = shrink > 0 ? big : dot, b = shrink > 0 ? scr : big, p = shrink > 0 ? shrink : grow;
    const L = (k: 'x' | 'y' | 'w' | 'h' | 'r') => a[k] + (b[k] - a[k]) * p;
    return <div style={{ position: 'absolute', left: L('x'), top: L('y'), width: L('w'), height: L('h'), borderRadius: L('r'), background: B.colors.dark, zIndex: 78, opacity: 1 - fade, pointerEvents: 'none' }} />;
  }
  if (kind === 'whip') {
    const p = range(f, -10, 22);
    if (p <= 0 || p >= 1) return null;
    const o = Math.sin(p * Math.PI);
    return (
      <AbsoluteFill style={{ zIndex: 78, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 16 }, (_, i) => {
          const y = (i * 131) % 1920, w = 300 + ((i * 97) % 500);
          const x = 1300 - p * 2600 + ((i * 173) % 400);
          return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: 10 + (i % 4) * 8, borderRadius: 20, background: i % 3 ? 'rgba(255,255,255,0.75)' : B.colors.accent, opacity: o * 0.85, filter: 'blur(2px)' }} />;
        })}
      </AbsoluteFill>
    );
  }
  if (kind === 'push' || kind === 'hold') {
    const a = kind === 'push' ? 1 - easeOutCubic(range(f, 0, 14)) : 1 - easeOutCubic(range(f, 0, 7));
    if (a <= 0) return null;
    return <AbsoluteFill style={{ zIndex: 78, pointerEvents: 'none', background: kind === 'push' ? B.colors.bg : '#fff', opacity: a * (kind === 'push' ? 1 : 0.8) }} />;
  }
  if (kind === 'carry' && carry) {
    const lift = easeOutCubic(range(f, -2, 6)), fly = easeInOutQuint(range(f, 3, 18)), fade = easeInCubic(range(f, 19, 6));
    if (fade >= 1) return null;
    const k0 = carry.from.k, x0 = carry.from.x + (carry.sx + carry.sw / 2 - 201) * k0, y0 = carry.from.y + (carry.sy + carry.sh / 2 - 437) * k0;
    const x = x0 + (540 - x0) * fly, y = y0 + (300 - y0) * fly;
    const k = k0 * (1 + 0.12 * lift) * (1 - fly * 0.72);
    return (
      <div style={{ position: 'absolute', left: x - (carry.sw * k) / 2, top: y - (carry.sh * k) / 2, width: carry.sw * k, height: carry.sh * k, zIndex: 79, opacity: 1 - fade, borderRadius: 18 * k, overflow: 'hidden', boxShadow: `0 ${30 * lift}px ${70 * lift}px rgba(${hexRgb(B.colors.shadow)},0.35), 0 0 0 ${3 * lift}px ${B.colors.accent}`, transform: `rotate(${Math.sin(fly * Math.PI) * -6}deg)` }}>
        <div style={{ position: 'absolute', left: -carry.sx * k, top: -carry.sy * k, width: SW * k }}>
          <Hold frame={0}><OffthreadVideo src={staticFile(carry.src)} startFrom={Math.max(0, Math.round(carry.t * fps * S))} muted style={{ width: SW * k }} /></Hold>
        </div>
      </div>
    );
  }
  return null;
};
