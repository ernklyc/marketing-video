import { continueRender, delayRender } from 'remotion';
import { getAvailableFonts } from '@remotion/google-fonts';

const loaded = new Map<string, string>();
/** Loads Google fonts by family name at runtime; returns the CSS family to use. */
export const useFonts = (families: (string | undefined)[]) => {
  for (const fam of families) {
    if (!fam || loaded.has(fam)) continue;
    const info = getAvailableFonts().find((f) => f.fontFamily === fam);
    if (!info) { loaded.set(fam, fam); continue; }
    loaded.set(fam, fam);
    const h = delayRender(`font ${fam}`);
    info.load().then((m: any) => {
      const res = m.loadFont('normal', { subsets: ['latin', 'latin-ext'] });
      const it = m.getInfo?.().fonts?.italic ? m.loadFont('italic', { subsets: ['latin', 'latin-ext'] }) : null;
      Promise.all([res.waitUntilDone(), it?.waitUntilDone()]).then(() => continueRender(h), () => continueRender(h));
    }, () => continueRender(h));
  }
};
