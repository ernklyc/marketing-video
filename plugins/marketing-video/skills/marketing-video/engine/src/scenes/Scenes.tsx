import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import { Hold, Seq, useFrame } from '../lib/time';
import { backOut, easeInCubic, easeInOut, easeInOutQuint, easeOutCubic, hexRgb, range, seeded, springy } from '../lib/anim';
import { useBrand } from '../lib/brand';
import { Chip, KLine, Title, fitSize } from '../lib/Kinetic';
import { Clip, Lift, Screens } from '../lib/Media';
import { camAt, camPreset, EXIT_LEN, focus, Phone, Stage, Touch, type Cam } from '../lib/Phone';
import type { ClipInfo, Feature, MontagePart, ScreenDef, Section } from '../types';
import { punch, RouteCard, Smear, Statement, STATEMENT_LEN, TapLabel } from './Motion';
import { entryCam } from './Transitions';
import { CalloutCaption, Pointer, Spotlight, Widget } from './Callouts';
import { LAYOUT, SIDE } from '../lib/safe';
import { ENTRANCES, type Entrance } from '../lib/Kinetic';

export type Ctx = { fps: number; beat: number; clips: Record<string, ClipInfo>; index: number; afterWall?: boolean; tin: string; exit: 'up' | 'stay' | 'whip' | 'push' | 'hold' | 'flip' | 'drop'; entranceSeed: number };
const B2F = (c: Ctx, beats: number) => Math.round(beats * c.beat);

/** Clip time (s) → section frame, including `clip.holds` ([clipTime, seconds] freezes that let a callout be read while the app waits). */
export const clipToF = (c: { fps: number }, clip: NonNullable<Feature['clip']>, t: number) => {
  const from = clip.from ?? 0, rate = clip.rate ?? 1;
  const held = (clip.holds ?? []).filter(([h]) => h < t).reduce((a, [, d]) => a + d, 0);
  return Math.round(((t - from) / rate + held) * c.fps);
};
const tapsFor = (c: Ctx, clip: Feature['clip'], extra?: { t: number; x: number; y: number }[]) => {
  if (!clip) return [];
  const info = c.clips[clip.name];
  return [...(info?.taps ?? []), ...(extra ?? [])].map((t: any) => ({ f: clipToF(c, clip, t.t), x: t.x, y: t.y, label: t.label as string | undefined, nav: !!t.nav && (t.fx ?? 0) > 40 }));
};
const screensF = (c: Ctx, s: ScreenDef[]) => s.map((x) => ({ ...x, at: B2F(c, x.at), scroll: x.scroll?.map(([b, y]) => [B2F(c, b), y] as [number, number]) }));

const ScreenContent: React.FC<{ c: Ctx; clip?: Feature['clip']; screens?: ScreenDef[] }> = ({ c, clip, screens }) => {
  if (!clip) return screens ? <Screens screens={screensF(c, screens)} /> : null;
  const src = `clips/${clip.name}.mp4`, rate = clip.rate ?? 1;
  const holds = [...(clip.holds ?? [])].sort((a, b) => a[0] - b[0]);
  if (!holds.length) return <Clip src={src} from={clip.from ?? 0} rate={rate} fps={c.fps} />;
  // play → freeze → play … : each piece is its own sequence so the app video pauses exactly at the hold
  const parts: React.ReactNode[] = [];
  let t = clip.from ?? 0, fr = 0;
  holds.forEach(([h, d], i) => {
    const play = Math.round(((h - t) / rate) * c.fps), hold = Math.round(d * c.fps);
    parts.push(<Seq key={'p' + i} from={fr} dur={play} layout="none"><Clip src={src} from={t} rate={rate} fps={c.fps} /></Seq>);
    parts.push(<Seq key={'h' + i} from={fr + play} dur={hold} layout="none"><Hold frame={0}><Clip src={src} from={h} rate={rate} fps={c.fps} /></Hold></Seq>);
    fr += play + hold; t = h;
  });
  parts.push(<Seq key="last" from={fr} layout="none"><Clip src={src} from={t} rate={rate} fps={c.fps} /></Seq>);
  return <>{parts}</>;
};

export const Hook: React.FC<{ s: Extract<Section, { type: 'hook' }>; c: Ctx; len: number }> = ({ s, c, len }) => {
  const f = useFrame();
  const B = useBrand();
  const out = len - 10;
  const pos = [[250, 1150, -9], [820, 1050, 8], [330, 1560, 6], [760, 1520, -5], [540, 1330, 2]];
  const sizes = s.lines.map((l) => l.size ?? (l.serif ? 150 : fitSize([l.text], 110)));
  const blockH = sizes.reduce((acc, z) => acc + z * 1.08, 0);
  return (
    <AbsoluteFill>
      {(s.photos ?? []).slice(0, 5).map((src, i) => {
        const [x, y, r] = pos[i];
        const p = springy((f - 6 - i * 4) / 24, 0.35), o = easeInCubic(range(f, out + i * 1.5, 12));
        return (
          <div key={src} style={{ position: 'absolute', left: x - 190, top: y - 220 + (1 - p) * 500 - o * 1400, width: 380, padding: 18, paddingBottom: 64, background: '#fff', borderRadius: 14, boxShadow: `0 40px 80px rgba(${hexRgb(B.colors.shadow)},0.25)`, transform: `rotate(${r + Math.sin(f / 25 + i) * 2}deg) scale(${0.7 + 0.3 * p})`, opacity: Math.min(1, (f - 6 - i * 4) / 6) }}>
            <Img src={staticFile(src)} style={{ width: 344, height: 344, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', top: s.photos?.length ? 330 : LAYOUT.hookCenter - blockH / 2, left: SIDE, right: SIDE, textAlign: 'center' }}>
        {s.lines.map((l, i) => (
          <KLine key={i} text={l.text} at={2 + i * 8} size={sizes[i]} out={out} font={l.serif ? B.fonts.serif : undefined} italic={l.serif} weight={l.serif ? 700 : undefined} tracking={l.serif ? -0.02 : -0.03} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const FeatureScene: React.FC<{ s: Feature; c: Ctx; len: number }> = ({ s, c, len }) => {
  const f = useFrame();
  const B = useBrand();
  const side = c.index % 2 ? -1 : 1;
  const st = c.tin === 'statement' && s.titles.length > 0;
  const off = st ? 20 : 0;
  const zoom = s.zoom ? { at: B2F(c, s.zoom.at), len: B2F(c, s.zoom.len), y: s.zoom.y, k: s.zoom.k, ty: s.zoom.ty } : undefined;
  const taps = tapsFor(c, s.clip, s.taps);
  // page changes are the app's own motion: no extra camera punch or smear (read as a jolt)
  const navAt: number[] = [];
  const lastTap = taps.filter((t) => t.f < len - off).slice(-1)[0];
  const exitAt0 = len - off - (EXIT_LEN[c.exit] ?? 0);
  const coWin = (s.callouts ?? []).map((co) => {
    const tp = co.tap !== undefined ? taps[co.tap] : undefined;
    const a = tp ? tp.f - 4 : co.t !== undefined && s.clip ? clipToF(c, s.clip, co.t) : B2F(c, co.at ?? 0) - off;
    // `until`: the callout explains a group of taps on the same control (e.g. 3 segment taps) and stays up through them
    const last = co.until !== undefined && taps[co.until] ? taps[co.until].f + 10 : a + 6;
    const next = taps.filter((t, i) => i !== co.tap && i !== co.until && t.f > last).map((t) => t.f)[0];
    const end = Math.min(a + B2F(c, co.beats ?? 5), next !== undefined ? next - 18 : Infinity, exitAt0 - 10);
    return { co, a, len: Math.max(8, end - a), sx: co.x ?? tp?.x ?? 201, sy: co.y ?? tp?.y ?? 437 };
  });
  const zoomOn = (co: { zoom?: boolean }) => co.zoom ?? (B.calloutStyle ?? 'zoom') === 'zoom';
  const coZooms = coWin.filter((w) => zoomOn(w.co)).map((w) => ({ at: w.a - 2, len: w.len, y: w.sy, x: 201 + (w.sx - 201) * 0.5, k: w.co.k ?? 1.9, ty: 1260 }));
  const keys = camPreset(entryCam(c.tin, s.cam), len - off, side as 1 | -1, [...(zoom ? [{ ...zoom, at: zoom.at - off }] : []), ...coZooms], c.exit, lastTap);
  const cam0 = camAt(keys, f - off), camPrev = camAt(keys, f - off - 1);
  const holdAt = len - off - 8;
  const cam1 = { ...cam0, k: cam0.k * punch(f - off, navAt) };
  const titles = s.titles.map((t, i) => ({ ...t, at: i === 0 && st ? Math.max(B2F(c, t.at), STATEMENT_LEN - 6) : B2F(c, t.at) }));
  const vid = s.clip ? { from: s.clip.from ?? 0, rate: s.clip.rate ?? 1, fps: c.fps } : undefined;
  const popAt = (p: { tap?: number; at?: number }) => (p.tap !== undefined && taps[p.tap] ? taps[p.tap].f + off : B2F(c, p.at ?? 0));
  const exitAt = len - (EXIT_LEN[c.exit] ?? 0);
  const callouts = coWin.map((w) => ({ ...w.co, atF: w.a + off, sx: w.sx, sy: w.sy, lenF: w.len }));
  // make room: while a widget is up the phone sinks and shrinks, freeing the band for it
  const wspans = (s.widgets ?? []).map((w) => ({ a: B2F(c, w.at), b: B2F(c, w.at) + B2F(c, w.beats ?? 5) }));
  const roomAt = (fr: number) => Math.min(1, wspans.reduce((acc, sp) => acc + easeInOut(range(fr, sp.a - 8, 16)) * (1 - easeInOut(range(fr, sp.b, 16))), 0));
  const shift = (cm: typeof cam1, r: number) => ({ ...cm, y: cm.y + 230 * r, k: cm.k * (1 - 0.1 * r) });
  const cam = shift(cam1, roomAt(f));
  const camPrevS = shift({ ...camPrev, k: camPrev.k * punch(f - off - 1, navAt) }, roomAt(f - 1));
  const overridden = new Set((s.popups ?? []).filter((p) => p.type === 'label' && p.tap !== undefined).map((p) => p.tap));
  return (
    <>
      {(!st || f >= 13) && <Stage><Phone cam={cam} prev={camPrevS}>
        <Seq from={off} layout="none">
          {c.exit === 'hold' && f - off >= holdAt ? <Hold frame={holdAt}><ScreenContent c={c} clip={s.clip} screens={s.screens} /></Hold> : <ScreenContent c={c} clip={s.clip} screens={s.screens} />}
          <Smear at={navAt} />
          <Touch taps={taps} />
          {s.tapLabels === true && taps.map((t, i) => (t.label && !overridden.has(i) ? <TapLabel key={i} x={t.x} y={t.y} at={t.f} text={t.label} /> : null))}
          {(s.popups ?? []).filter((p) => p.type === 'label' && p.tap !== undefined && taps[p.tap]).map((p, i) => <TapLabel key={'l' + i} x={taps[p.tap!].x} y={taps[p.tap!].y} at={taps[p.tap!].f} text={p.text} />)}
        </Seq>
        {callouts.map((co, i) => <Spotlight key={'sp' + i} x={co.sx} y={co.sy} at={co.atF} len={co.lenF} r={co.r} dim={0.3} />)}
      </Phone></Stage>}
      {callouts.map((co, i) => <CalloutCaption key={'co' + i} at={co.atF + 4} len={co.lenF} text={co.text} sub={co.sub} icon={co.icon} />)}
      {callouts.map((co, i) => co.arrow !== false && <Pointer key={'pt' + i} cam={cam} sx={co.sx} sy={co.sy} at={co.atF + 4} len={co.lenF} r={co.r} />)}
      {(s.widgets ?? []).map((w, i) => <Widget key={'w' + i} w={w} at={B2F(c, w.at)} len={Math.min(B2F(c, w.beats ?? 5), exitAt - B2F(c, w.at) - 10)} />)}
      <Chip text={s.chip} at={st ? STATEMENT_LEN - 12 : 0} out={len - 8} />
      {titles.map((t, i) => <Title key={i} l1={t.l1} l2={t.l2} entrance={(t as any).entrance ?? ENTRANCES[(c.entranceSeed + i) % ENTRANCES.length] as Entrance} at={t.at + 2} out={i < titles.length - 1 ? titles[i + 1].at - 6 : len - 8} />)}
      {(s.lifts ?? []).map((l, i) => <Lift key={i} src={s.clip ? `clips/${s.clip.name}.mp4` : s.screens![0].src} video={vid} {...l} at={B2F(c, l.at)} out={l.out !== undefined ? B2F(c, l.out) : len - 10} k={l.k ?? 1.6} />)}
      {(s.toasts ?? []).map((t, i) => <Toast key={i} {...t} at={B2F(c, t.at)} out={t.out !== undefined ? B2F(c, t.out) : len - 12} />)}
      {(s.bubbles ?? []).map((t, i) => <Bubble key={i} {...t} at={B2F(c, t.at)} out={t.out !== undefined ? B2F(c, t.out) : len - 10} />)}
      {(s.popups ?? []).filter((p) => p.type !== 'label').map((p, i) => {
        const at = popAt(p) + 2, out = at + B2F(c, p.beats ?? 4);
        return p.type === 'route' ? <RouteCard key={i} at={at} out={out} text={p.text} sub={p.sub} y={p.y} /> : <Toast key={i} at={at} out={out} text={p.text} sub={p.sub} y={p.y} />;
      })}
      {st && <Statement l1={s.titles[0].l1} l2={s.titles[0].l2} seed={c.index} from={c.index % 2 ? [120, 1700] : [960, 1650]} />}
    </>
  );
};

export const Montage: React.FC<{ s: Extract<Section, { type: 'montage' }>; c: Ctx; len: number }> = ({ s, c, len }) => {
  const f = useFrame();
  let acc = 0;
  const parts = s.parts.map((p) => { const at = B2F(c, acc); acc += p.beats; return { ...p, at, end: B2F(c, acc) }; });
  // focus montage: the camera locks onto each part's tapped control (hold + slow push), then snaps to the next on the cut
  const mkeys: Cam[] = s.focus
    ? parts.flatMap((p, i) => {
        const t = tapsFor(c, p.clip, p.taps).find((x) => x.f >= 0 && x.f <= p.end - p.at);
        const sx = p.fx ?? t?.x ?? 201, sy = p.fy ?? t?.y ?? 437, k = p.k ?? (i % 2 ? 1.62 : 1.78);
        // lean toward the target (not full-centre) so the phone never leaves the frame
        const at = (fr: number, kk: number): Cam => ({ f: fr, x: 540 - (sx - 201) * kk * 0.4, y: 1300 - (sy - 437) * kk * 0.5, k: kk, rx: 0, ry: 0, z: true });
        const a = at(p.at + Math.min(7, (p.end - p.at) / 3), k);
        const b = at(p.end - 1, k * 1.05);
        return i === 0 ? [{ ...a, f: 0, x: a.x + 900, k: k * 0.8, ry: 16 }, a, b] : [a, b];
      })
    : camPreset(entryCam(c.tin === 'statement' ? 'cut' : c.tin, s.cam ?? 'flat'), len, (c.index % 2 ? -1 : 1) as 1 | -1, undefined, c.exit);
  const cam = camAt(mkeys, f), camPrev = camAt(mkeys, f - 1);
  let cur = 0; parts.forEach((p, i) => { if (f >= p.at) cur = i; });
  const pt = parts[cur];
  const blink = cur > 0 ? 1 - easeOutCubic(range(f, pt.at, 10)) : 0;
  const switches = parts.slice(1).map((p) => p.at - 3);
  return (
    <>
      <Stage><Phone cam={{ ...cam, k: cam.k * punch(f, switches) }} prev={camPrev}>
        {parts.map((p, i) => (
          <Seq key={i} from={p.at} dur={(i < parts.length - 1 ? p.end : len + 10) - p.at} layout="none">
            <ScreenContent c={c} clip={p.clip} screens={p.screens} />
            <Touch taps={tapsFor(c, p.clip, p.taps)} />
          </Seq>
        ))}
        <Smear at={switches} />
      </Phone></Stage>
      {parts.map((p, i) => (
        <Seq key={i} from={p.at} dur={p.end - p.at + 4} layout="none">
          <Chip text={p.chip} out={p.end - p.at - 7} />
          <Title l1={p.l1} l2={p.l2} entrance={ENTRANCES[(c.entranceSeed + i) % ENTRANCES.length]} at={1} out={p.end - p.at - 7} />
        </Seq>
      ))}
    </>
  );
};

/** Dark curtain: rises from the bottom, holds the word pills, leaves through the top while the next scene is already in place. */
export const Wall: React.FC<{ s: Extract<Section, { type: 'wall' }>; len: number }> = ({ s, len }) => {
  const f = useFrame();
  const B = useBrand();
  const inn = easeInOutQuint(range(f, -4, 14)), out = easeInOutQuint(range(f, len - 2, 12));
  const y = (1 - inn) * 110 - out * 110;
  const r = seeded(3);
  const rows = Array.from({ length: 18 }, (_, i) => ({ y: i * 112 - 40, sp: 6 + r() * 10, dir: i % 2 ? 1 : -1, ofs: r() * 400, w: Array.from({ length: 6 }, () => 120 + r() * 320) }));
  return (
    <AbsoluteFill style={{ zIndex: 80, transform: `translateY(${y}%)` }}>
      <AbsoluteFill style={{ background: B.colors.dark, borderRadius: `${(1 - inn) * 140 + out * 0}px ${(1 - inn) * 140}px ${out * 140}px ${out * 140}px`, boxShadow: '0 -30px 80px rgba(0,0,0,0.25), 0 30px 80px rgba(0,0,0,0.25)' }}>
        {rows.map((row, i) => {
          let x = -600 + row.ofs + row.dir * f * row.sp;
          return (
            <div key={i} style={{ position: 'absolute', top: row.y, left: 0, height: 80, width: 1080, overflow: 'hidden' }}>
              {row.w.map((w, j) => { const el = <div key={j} style={{ position: 'absolute', left: x, width: w, height: 80, borderRadius: 40, background: '#fff', opacity: j % 3 === 1 ? 0.07 : 0.04 }} />; x += w + 40; return el; })}
            </div>
          );
        })}
        <div style={{ position: 'absolute', top: 960 - s.words.length * 66, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          {s.words.map((w, k) => {
            const p = backOut(range(f, 6 + k * 5, 14), 1.8);
            return <div key={k} style={{ padding: '6px 40px 14px', borderRadius: 999, background: B.colors.accent, color: B.colors.onAccent ?? '#fff', fontFamily: B.fonts.display, fontWeight: 800, fontSize: 92, letterSpacing: -3, transform: `scale(${p}) rotate(${(1 - p) * (k % 2 ? 8 : -8)}deg)`, opacity: easeOutCubic(range(f, 6 + k * 5, 6)) }}>{w}</div>;
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{ s: Extract<Section, { type: 'outro' }>; c: Ctx; len: number }> = ({ s, c, len }) => {
  const f = useFrame();
  const B = useBrand();
  const acc = hexRgb(B.colors.accent);
  const cover = easeInOutQuint(range(f, 0, 12));
  const logo = springy((f - 4) / 26, 0.3);
  const w1 = easeOutCubic(range(f, 16, 18));
  const end = easeInOut(range(f, len - c.beat * 1.5, c.beat * 1.2));
  const breathe = 1 + 0.03 * easeInOut(range(f, 12, len));
  const ring = Math.max(0, 1 - ((f - 6) % Math.round(c.beat * 2)) / 24) * (f > 6 ? 1 : 0);
  const pop = (at: number) => backOut(range(f, at, 14), 1.8);
  return (
    <AbsoluteFill style={{ zIndex: 90 }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}><circle cx={540} cy={1920} r={cover * 2300} fill={B.colors.dark} /></svg>
      <AbsoluteFill style={{ opacity: cover, background: `radial-gradient(circle at 50% 40%, rgba(${acc},0.35) 0%, rgba(0,0,0,0) 50%)` }} />
      <div style={{ position: 'absolute', left: SIDE, right: SIDE, top: 0, height: LAYOUT.hookCenter * 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, transform: `scale(${breathe})` }}>
        {B.logo && (
          <div style={{ position: 'relative', width: 380, height: 380, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', left: -70, top: -70, width: 520, height: 520, borderRadius: '50%', border: `4px solid rgba(${acc},${0.5 * ring})`, transform: `scale(${1.35 - ring * 0.35})` }} />
            <div style={{ width: 380, height: 380, borderRadius: '50%', background: B.logoBg ?? 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)`, boxShadow: B.logoBg ? `0 30px 90px rgba(${acc},0.45)` : undefined }}>
              <Img src={staticFile(B.logo)} style={{ width: B.logoBg ? 270 : 380 }} />
            </div>
          </div>
        )}
        {s.wordmark && <div style={{ fontFamily: B.fonts.serif ?? B.fonts.display, fontStyle: B.fonts.serif ? 'italic' : 'normal', fontWeight: 700, fontSize: 128, lineHeight: 1, color: B.colors.darkInk, letterSpacing: -2, opacity: w1, transform: `translateY(${(1 - w1) * 40}px)`, filter: `blur(${(1 - w1) * 12}px)` }}>{s.wordmark}</div>}
        {s.sub && <div style={{ fontFamily: B.fonts.display, fontWeight: 700, fontSize: 40, letterSpacing: 18, marginRight: -18, color: B.colors.accent2, opacity: easeOutCubic(range(f, 24, 14)) }}>{s.sub}</div>}
        {s.tagline && <div style={{ alignSelf: 'stretch' }}><KLine text={s.tagline} at={30} size={fitSize([s.tagline], 70)} color={B.colors.darkInk} hl={B.colors.accent2} /></div>}
        {s.pills && <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {s.pills.map((l, i) => { const q = pop(38 + i * 4); return <div key={l} style={{ padding: '10px 26px', borderRadius: 999, border: '2px solid rgba(255,255,255,0.35)', color: B.colors.darkInk, fontFamily: B.fonts.display, fontWeight: 600, fontSize: 34, transform: `scale(${q})`, opacity: Math.min(1, q * 2) }}>{l}</div>; })}
        </div>}
        {s.cta && <div style={{ marginTop: 14, padding: '22px 52px', borderRadius: 999, background: B.colors.accent, color: B.colors.onAccent ?? '#fff', fontFamily: B.fonts.display, fontWeight: 800, fontSize: 52, transform: `scale(${pop(52)})`, boxShadow: `0 20px 60px rgba(${acc},0.5)` }}>{s.cta}</div>}
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: end }} />
    </AbsoluteFill>
  );
};

export const Toast: React.FC<{ at: number; out: number; text: string; sub?: string; y?: number }> = ({ at, out, text, sub, y = 1120 }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at || f > out + 12) return null;
  const p = springy((f - at) / 20, 0.4), o = easeInCubic(range(f, out, 10)), chk = easeOutCubic(range(f, at + 6, 12));
  return (
    <div style={{ position: 'absolute', left: 540, top: y, transform: `translate(-50%,-50%) scale(${(0.5 + 0.5 * p) * (1 - o * 0.3)})`, opacity: 1 - o, zIndex: 65 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '22px 44px 22px 22px', borderRadius: 999, background: '#fff', boxShadow: `0 30px 80px rgba(${hexRgb(B.colors.shadow)},0.3)`, fontFamily: B.fonts.display, whiteSpace: 'nowrap' }}>
        <div style={{ width: 76, height: 76, borderRadius: 38, background: B.colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" stroke={B.colors.onAccent ?? '#fff'} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={24 * (1 - chk)} /></svg>
        </div>
        <div><div style={{ fontSize: 44, fontWeight: 800, color: B.colors.ink }}>{text}</div>{sub && <div style={{ fontSize: 30, fontWeight: 600, color: B.colors.inkSoft }}>{sub}</div>}</div>
      </div>
    </div>
  );
};

export const Bubble: React.FC<{ at: number; out: number; text: string; me?: boolean; x: number; y: number; name?: string }> = ({ at, out, text, me, x, y, name }) => {
  const f = useFrame();
  const B = useBrand();
  if (f < at || f > out + 12) return null;
  const p = springy((f - at) / 18, 0.45), o = easeInCubic(range(f, out, 10));
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${me ? '-100%' : '0'},0) scale(${0.4 + 0.6 * p})`, transformOrigin: me ? '100% 100%' : '0% 100%', opacity: Math.min(1, (f - at) / 4) * (1 - o), zIndex: 66, fontFamily: B.fonts.display }}>
      {name && <div style={{ fontSize: 26, fontWeight: 700, color: B.colors.accent, margin: '0 0 6px 18px' }}>{name}</div>}
      <div style={{ padding: '22px 32px', borderRadius: 40, borderBottomLeftRadius: me ? 40 : 10, borderBottomRightRadius: me ? 10 : 40, background: me ? B.colors.accent : '#fff', color: me ? '#fff' : B.colors.ink, fontSize: 40, fontWeight: 700, boxShadow: `0 20px 50px rgba(${hexRgb(B.colors.shadow)},0.2)`, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
};
