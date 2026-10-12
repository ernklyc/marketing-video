import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { OriginCtx, Seq, SubCtx } from './lib/time';
import { BrandProvider, defaultBrand } from './lib/brand';
import { useFonts } from './lib/fonts';
import { World } from './lib/Media';
import { FeatureScene, Hook, Montage, Outro, Wall } from './scenes/Scenes';
import { exitFor, TransitionFx, TransitionIn, type CarrySpec } from './scenes/Transitions';
import { REST_CAM, screenToWorld } from './lib/Phone';
import { duckAt, Finish, VoCaptions, type VoLine } from './scenes/Captions';
import type { Storyboard } from './types';

export const OV = 10;
const UNDER: Record<string, number> = { iris: 18, split: 10, carry: 6, outro: 14, flood: 10 };
export const timeline = (sb: Storyboard) => {
  const beat = (sb.fps * 60) / sb.bpm;
  let acc = 0;
  const secs = sb.sections.map((s) => { const start = Math.round(acc * beat); acc += s.beats; return { s, start, len: Math.round(acc * beat) - start }; });
  return { beat, secs, total: Math.round(acc * beat) };
};

export const Promo: React.FC<Storyboard> = (sb) => {
  const brand = { ...defaultBrand, ...sb.brand, colors: { ...defaultBrand.colors, ...sb.brand?.colors }, fonts: { ...defaultBrand.fonts, ...sb.brand?.fonts } };
  useFonts([brand.fonts.display, brand.fonts.serif]);
  const { beat, secs } = timeline(sb);
  const clips = sb.clips ?? {};
  const vo: VoLine[] = (sb as any).voData?.lines ?? [];
  const SUB = sb.sub ?? 1;
  return (
    <SubCtx.Provider value={SUB}><BrandProvider value={brand}>
      <AbsoluteFill style={{ background: brand.colors.bg, overflow: 'hidden' }}>
        {sb.music && <Audio src={staticFile(sb.music.src)} startFrom={Math.round((sb.music.offset ?? 0) * sb.fps * SUB)} volume={(fr) => (sb.music!.volume ?? 1) * duckAt(fr / SUB, vo, beat, sb.fps, sb.vo?.duck ?? 0.3)} />}
        {sb.sfx && <Audio src={staticFile(sb.sfx.src)} volume={sb.sfx.volume ?? 1} />}
        {vo.map((ln, i) => <Seq key={'vo' + i} from={Math.round(ln.at * beat)} dur={Math.ceil(ln.dur * sb.fps) + 2} layout="none"><Audio src={staticFile(ln.src)} volume={sb.vo?.volume ?? 1} /></Seq>)}
        <World />
        {secs.map(({ s, start, len }, i) => {
          const prev = secs[i - 1]?.s, next = secs[i + 1]?.s;
          const tinOf = (x: typeof s | undefined, px: typeof s | undefined) => !x ? undefined : x.type === 'feature' || x.type === 'montage' ? x.transition ?? (px?.type === 'wall' ? 'cut' : x.type === 'montage' ? 'cut' : 'statement') : x.type;
          const tin = tinOf(s, prev) ?? 'cut';
          const tnext = tinOf(next, s);
          const exit = s.type === 'feature' || s.type === 'montage' ? exitFor(tnext) : 'up';
          const c = { fps: sb.fps, beat, clips, index: i, afterWall: prev?.type === 'wall', tin, exit, entranceSeed: i };
          // one phone on screen: moving exits finish inside `len`; only mask reveals keep the old frame underneath, for exactly as long as the mask needs
          const extra = s.type === 'outro' ? 0 : s.type === 'wall' ? 14 : exit === 'stay' ? (UNDER[tnext ?? ''] ?? 0) : exit === 'hold' ? 0 : OV;
          // previous section's last visible frame / tap → iris origin & carry crop
          const pc = prev && (prev.type === 'feature' ? prev.clip : prev.type === 'montage' ? prev.parts[prev.parts.length - 1].clip : undefined);
          const plen = secs[i - 1]?.len ?? 0;
          const pFrom = pc ? (pc.from ?? 0) + ((plen - (prev?.type === 'montage' ? Math.round(prev.parts.slice(0, -1).reduce((a, p) => a + p.beats, 0) * beat) : 0)) / sb.fps) * (pc.rate ?? 1) : 0;
          const rest = { x: REST_CAM.x, y: REST_CAM.y, k: REST_CAM.k };
          const pTaps = pc ? (clips[pc.name]?.taps ?? []).filter((t) => t.t <= pFrom) : [];
          const lt = pTaps[pTaps.length - 1];
          const origin = lt ? screenToWorld({ f: 0, ...rest, rx: 0, ry: 0 }, lt.x, lt.y) : undefined;
          const crop = (s as any).carry;
          const carry: CarrySpec | undefined = tin === 'carry' && pc && crop ? { src: `clips/${pc.name}.mp4`, t: pFrom - 0.05, ...crop, from: rest } : undefined;
          return (
            <Seq key={i} from={start} dur={len + extra}><OriginCtx.Provider value={start}>
              <TransitionIn kind={tin} origin={origin}>
                {s.type === 'hook' && <Hook s={s} c={c} len={len} />}
                {s.type === 'feature' && <FeatureScene s={s} c={c} len={len} />}
                {s.type === 'montage' && <Montage s={s} c={c} len={len} />}
                {s.type === 'wall' && <Wall s={s} len={len} />}
                {s.type === 'outro' && <Outro s={s} c={c} len={len} />}
              </TransitionIn>
              <TransitionFx kind={tin} carry={carry} fps={sb.fps} origin={origin} />
            </OriginCtx.Provider></Seq>
          );
        })}
        {vo.length > 0 && sb.vo?.captions !== false && <VoCaptions lines={vo} beat={beat} fps={sb.fps} hideFrom={secs.find((x) => x.s.type === 'outro')?.start} />}
        <Finish grain={brand.grain ?? 0} vignette={brand.vignette ?? 0} />
      </AbsoluteFill>
    </BrandProvider></SubCtx.Provider>
  );
};
