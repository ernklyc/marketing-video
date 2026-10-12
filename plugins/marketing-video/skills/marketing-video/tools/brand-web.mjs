// Usage: node brand-web.mjs <url>  → prints CSS color variables, fonts and logo candidates as a brand suggestion.
import { chromium } from '../capture/web/node_modules/playwright/index.mjs';
const url = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 402, height: 874 } });
await p.goto(url, { waitUntil: 'networkidle' });
const info = await p.evaluate(() => {
  const vars = {};
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
    for (const r of rules) if (r.selectorText === ':root' || r.selectorText === 'html') for (const k of r.style) if (k.startsWith('--')) vars[k] = r.style.getPropertyValue(k).trim(); }
  const font = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily : null; };
  const logos = [...document.querySelectorAll('img')].filter((i) => /logo|brand|mark/i.test(i.src + i.alt + i.className)).map((i) => i.src).slice(0, 5);
  const icons = [...document.querySelectorAll('link[rel*=icon]')].map((l) => l.href);
  return { vars, fonts: { h1: font('h1'), h2: font('h2'), body: font('body') }, logos, icons, bg: getComputedStyle(document.body).backgroundColor, title: document.title };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
