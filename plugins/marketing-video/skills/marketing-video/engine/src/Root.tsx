import React from 'react';
import { Composition } from 'remotion';
import { Promo, timeline } from './Promo';
import type { Storyboard } from './types';

const fallback: Storyboard = { fps: 30, bpm: 128, brand: {} as any, sections: [{ type: 'hook', beats: 8, lines: [{ text: 'storyboard.json', serif: true }] }] };

export const Root: React.FC = () => (
  <Composition
    id="Promo"
    component={Promo as any}
    defaultProps={fallback as any}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={timeline(fallback).total}
    calculateMetadata={({ props }) => {
      const sb = props as unknown as Storyboard;
      const sub = sb.sub ?? 1;
      return { durationInFrames: timeline(sb).total * sub, fps: sb.fps * sub, width: sb.width ?? 1080, height: sb.height ?? 1920 };
    }}
  />
);
