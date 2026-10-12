// Usage: node mockgen.mjs <template.json> <out.json> [--seed 42] [--locale tr]
// Generates realistic, reproducible demo data for capture injection. Template: any JSON where strings like
//   "{{person.fullName}}", "{{location.city}}", "{{number.int:100:900}}", "{{date.recent}}", "{{pick:Racket|Ball|Bag}}"
// are filled by faker (fakerTR by default). Arrays written as { "$repeat": 8, "item": {...} } expand to 8 items.
// Hand-write the hero records (first visible row) and generate only the filler. Disclose demo data in the delivery note.
import fs from 'fs';
import { allFakers } from '@faker-js/faker';
const [tpl, outFile] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const faker = allFakers[arg('locale', 'tr')] ?? allFakers.tr;
faker.seed(+arg('seed', 42));
const call = (expr) => {
  if (expr.startsWith('pick:')) return faker.helpers.arrayElement(expr.slice(5).split('|'));
  const [p, ...args] = expr.split(':');
  const fn = p.split('.').reduce((o, k) => o?.[k], faker);
  if (typeof fn !== 'function') throw new Error('unknown faker path ' + p);
  if (p === 'number.int' && args.length) return fn({ min: +args[0], max: +args[1] });
  if (p === 'number.float' && args.length) return fn({ min: +args[0], max: +args[1], fractionDigits: +(args[2] ?? 1) });
  const v = fn(...args);
  return v instanceof Date ? v.toISOString() : v;
};
const fill = (x) => {
  if (Array.isArray(x)) return x.map(fill);
  if (x && typeof x === 'object') {
    if ('$repeat' in x) return Array.from({ length: x.$repeat }, () => fill(x.item));
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fill(v)]));
  }
  if (typeof x === 'string') {
    const whole = x.match(/^\{\{([^}]+)\}\}$/);
    if (whole) return call(whole[1]);
    return x.replace(/\{\{([^}]+)\}\}/g, (_, e) => call(e));
  }
  return x;
};
fs.writeFileSync(outFile, JSON.stringify(fill(JSON.parse(fs.readFileSync(tpl, 'utf8'))), null, 1));
console.log('wrote', outFile);
