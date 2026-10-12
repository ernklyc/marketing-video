/** Platform safe zone for 1080x1920 (conservative union of Reels / TikTok / Shorts UI overlays). Text & CTAs stay inside. */
export const SAFE = { top: 290, bottom: 1250, left: 70, right: 150 };
export const SAFE_W = 1080 - SAFE.left - SAFE.right;
/** Text is always optically centred: symmetric side margins (the right-rail inset is folded into both sides). */
export const SIDE = 100;
/**
 * Fixed vertical zones of a feature frame — nothing ever overlaps across zones:
 *   chip   284…354   section label
 *   title  360…560   two kinetic lines (fitSize keeps them single-line)
 *   band   590…720   callout caption / widget slot; arrows start here and point down into the stage
 *   stage  ≥ 760     the phone. Anything of the phone above `stage` is masked (zoomed UI never runs under text)
 */
export const LAYOUT = { chip: SAFE.top - 6, title: SAFE.top + 70, band: 590, bandBottom: 720, stage: 760, restK: 1.24, restY: 1318, hookCenter: 860 };
