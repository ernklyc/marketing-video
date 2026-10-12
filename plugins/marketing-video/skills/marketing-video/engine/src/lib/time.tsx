import React from 'react';
import { Freeze, Sequence, useCurrentFrame } from 'remotion';

/** Subframes per storyboard frame. 1 = drafts; 8 = 240 fps master that render.sh blends to 60 fps with real motion blur. */
export const SubCtx = React.createContext(1);
export const useSub = () => React.useContext(SubCtx);
/** Current frame in storyboard units (sb.fps), fractional between subframes. Use this, never useCurrentFrame. */
export const useFrame = () => useCurrentFrame() / useSub();
/** Film frame where the current section starts; anything that must stay continuous across cuts (handheld drift) uses useAbsFrame. */
export const OriginCtx = React.createContext(0);
export const useAbsFrame = () => useFrame() + React.useContext(OriginCtx);

export const Seq: React.FC<{ from?: number; dur?: number; layout?: 'none'; children?: React.ReactNode }> = ({ from = 0, dur, layout, children }) => {
  const S = useSub();
  return React.createElement(Sequence, { from: Math.round(from * S), durationInFrames: dur === undefined ? undefined : Math.max(1, Math.round(dur * S)), layout }, children);
};
export const Hold: React.FC<{ frame: number; children?: React.ReactNode }> = ({ frame, children }) => React.createElement(Freeze, { frame: Math.round(frame * useSub()) }, children);

/** Closed-form spring step 0→1 at time t (s). zeta < 1 overshoots slightly; settles in ≈ 6/(zeta·w) s. */
export const springStep = (t: number, w: number, zeta = 1) => {
  if (t <= 0) return 0;
  if (zeta >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
};
