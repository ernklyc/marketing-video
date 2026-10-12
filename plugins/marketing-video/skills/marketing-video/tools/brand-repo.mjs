// Usage: node brand-repo.mjs <repoDir>  → brand suggestion from the codebase: product name, colour tokens (CSS vars,
// Tailwind, Flutter Color(0x..)), font families (next/font, Google Fonts, Flutter), logo/icon candidates.
// Combine with brand-web.mjs for live sites. Always confirm the palette with the user; use the official logo file.
import fs from 'fs';
import path from 'path';
const root = path.resolve(process.argv[2] ?? '.');
const skip = /^(node_modules|\.claude|\.git|build|\.dart_tool|\.next|out|dist|Pods|\.cache)$/;
const files = [];
const walk = (d, depth = 0) => { if (depth > 7) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (skip.test(e.name)) continue; if (e.isDirectory()) walk(p, depth + 1); else files.push(p); } };
walk(root);
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const out = { name: null, colors: {}, fonts: new Set(), logos: [] };
const depth = (f) => path.relative(root, f).split(path.sep).length;
const pub = files.filter((f) => /pubspec\.yaml$/.test(f)).sort((a, b) => depth(a) - depth(b))[0]; if (pub) out.name = (read(pub).match(/^name:\s*(\S+)/m) || [])[1];
const pkg = files.filter((f) => /package\.json$/.test(f)).sort((a, b) => depth(a) - depth(b))[0]; if (pkg) out.name ??= JSON.parse(read(pkg)).name;
const count = {};
for (const f of files) {
  if (/\.(css|scss)$/.test(f)) for (const m of read(f).matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) out.colors[m[1]] ??= m[2];
  if (/tailwind\.config\.(js|ts|cjs|mjs)$/.test(f)) for (const m of read(f).matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/g)) out.colors['tw-' + m[1]] ??= m[2];
  if (/\.dart$/.test(f)) for (const m of read(f).matchAll(/Color\(0x([0-9A-Fa-f]{8})\)/g)) count['#' + m[1].slice(2)] = (count['#' + m[1].slice(2)] ?? 0) + 1;
  if (/\.(tsx?|jsx?)$/.test(f)) for (const m of read(f).matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)) m[1].split(',').forEach((x) => out.fonts.add(x.trim().replace(/_/g, ' ')));
  if (/\.dart$/.test(f)) for (const m of read(f).matchAll(/GoogleFonts\.(\w+)\(/g)) out.fonts.add(m[1]);
  if (/\.(svg|png)$/i.test(f) && /logo|mark|brand|icon-512|app_launcher|appstore/i.test(path.basename(f))) out.logos.push(path.relative(root, f));
}
const flutter = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(JSON.stringify({ name: out.name, cssColors: out.colors, flutterTopColors: flutter, fonts: [...out.fonts], logos: out.logos.slice(0, 12) }, null, 1));
