import React, { createContext, useContext } from 'react';

export type Brand = {
  colors: { bg: string; bg2: string; card: string; ink: string; inkSoft: string; accent: string; accent2: string; squiggle: string; dark: string; darkInk: string; shadow: string; onAccent?: string };
  fonts: { display: string; serif?: string; displayWeight?: number };
  logo?: string; logoBg?: string; logoWord?: string;
  /** background: kind aurora = animated mesh gradient; symbols = floating outline icons (Backdrop.SYMBOLS keys); rays/floor = light rays / perspective grid */
  world?: { kind: 'pins' | 'balls' | 'dots' | 'none' | 'aurora'; colors?: string[]; symbols?: string[]; symbolColor?: string; rays?: boolean; floor?: boolean };
  pointer?: 'touch' | 'capsule';
  /** visual language: soft (light, floating decor) · flood (brand colour fields) · editorial (paper, grid, serif) · keynote (dark, glow) */
  look?: 'soft' | 'flood' | 'editorial' | 'keynote';
  /** 0 = locked-off camera, 1 = subtle handheld float (default) */
  handheld?: number;
  /** how highlighted (*word) words are marked: marker (soft accent band wipes in, default) · color (accent text only) · squiggle (hand-drawn underline) */
  hlStyle?: 'marker' | 'color' | 'squiggle';
  /** zoom (default): the camera pushes into each callout's target; per callout `zoom: false` keeps the phone at rest */
  calloutStyle?: 'zoom' | 'card';
  /** film finish: grain 0–1 (0 off), vignette 0–1 */
  grain?: number; vignette?: number;
};

export const defaultBrand: Brand = {
  colors: { bg: '#F5F6F8', bg2: '#E9ECF1', card: '#FFFFFF', ink: '#111827', inkSoft: '#4B5563', accent: '#2563EB', accent2: '#60A5FA', squiggle: '#2563EB', dark: '#0B1220', darkInk: '#FFFFFF', shadow: '#0B1220' },
  fonts: { display: 'Inter', serif: 'Playfair Display', displayWeight: 800 },
  world: { kind: 'dots' },
  pointer: 'touch',
};

const Ctx = createContext<Brand>(defaultBrand);
export const BrandProvider = Ctx.Provider;
export const useBrand = () => useContext(Ctx);
