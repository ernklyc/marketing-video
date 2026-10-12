export type ClipRef = { name: string; from?: number; rate?: number; holds?: [number, number][] };
export type TitleDef = { at: number; l1: string; l2?: string; entrance?: 'pop' | 'rise' | 'mask' | 'type' };
export type LiftDef = { at: number; out?: number; sx: number; sy: number; sw: number; sh: number; x: number; y: number; k?: number; rot?: number; glow?: boolean };
export type ToastDef = { at: number; out?: number; text: string; sub?: string; y?: number };
export type BubbleDef = { at: number; out?: number; text: string; name?: string; me?: boolean; x: number; y: number };
export type PopupDef = { type: 'route' | 'toast' | 'label'; tap?: number; at?: number; beats?: number; text: string; sub?: string; y?: number };
export type ScreenDef = { src: string; at: number; scroll?: [number, number][]; tr?: 'push' | 'fade' | 'up'; nav?: string };
export type Ledger = { tone?: string; new_component?: string; surprise?: string; motif?: string; why?: string };
export type Crop = { sx: number; sy: number; sw: number; sh: number };
export type Feature = {
  type: 'feature'; beats: number; chip: string; titles: TitleDef[];
  transition?: string; carry?: Crop; ledger?: Ledger;
  clip?: ClipRef; screens?: ScreenDef[];
  cam?: 'rise' | 'slide' | 'push' | 'orbit' | 'flat';
  zoom?: { at: number; len: number; y: number; k?: number; ty?: number };
  lifts?: LiftDef[]; toasts?: ToastDef[]; bubbles?: BubbleDef[];
  taps?: { t: number; x: number; y: number }[];
  popups?: PopupDef[]; tapLabels?: boolean; statement?: boolean;
  callouts?: import('./scenes/Callouts').CalloutDef[]; widgets?: import('./scenes/Callouts').WidgetDef[];
};
export type MontagePart = { beats: number; chip: string; l1: string; l2?: string; fx?: number; fy?: number; k?: number; clip?: ClipRef; screens?: ScreenDef[]; taps?: { t: number; x: number; y: number }[] };
export type Section =
  | { type: 'hook'; beats: number; lines: { text: string; serif?: boolean; size?: number }[]; photos?: string[] }
  | Feature
  | { type: 'montage'; beats: number; cam?: Feature['cam']; focus?: boolean; parts: MontagePart[]; transition?: string; carry?: Crop; ledger?: Ledger }
  | { type: 'wall'; beats: number; words: string[]; ledger?: Ledger }
  | { type: 'outro'; beats: number; wordmark?: string; sub?: string; tagline?: string; pills?: string[]; cta?: string };
export type ClipInfo = { dur: number; taps: { t: number; x: number; y: number; label?: string; fx?: number; nav?: boolean }[] };
export type Brief = { message: string; tone: string; feel: string; audience?: string; channel?: string; banned?: string[] };
export type Storyboard = {
  name?: string; brief?: Brief;
  fps: number; bpm: number; width?: number; height?: number; sub?: number;
  sfx?: { src: string; volume?: number };
  music?: { src: string; offset?: number; volume?: number };
  brand: import('./lib/brand').Brand;
  sections: Section[];
  clips?: Record<string, ClipInfo>;
  vo?: { voice?: string; model?: string; rate?: number; duck?: number; volume?: number; captions?: boolean; lines: { at: number; text: string }[] };
  format?: 'reels' | 'appstore';
  cutdowns?: Record<string, number[]>;
};
