/*
 * Builds data/stock.json from a private Odoo export (_data/odoo-stock.json, never committed).
 * Publishes free stock (on hand minus reserved) per selling company for catalogue items only,
 * capped, with no costs, prices or locations.
 *
 *   node scripts/build-stock.mjs [path-to-odoo-export]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cat = require(path.join(root, 'js/catalog.js'));
const data = require(path.join(root, 'js/data.js'));
const src = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(root, '_data/odoo-stock.json');
const odoo = JSON.parse(fs.readFileSync(src, 'utf8'));
const CAP = data.ASSUMPTIONS.stockCap;

// stock comes from the company that sells in each country: EURONET UAE (8), EURONET KSA (14), EURONET NIGERIA (7)
const COMPANY = { 8: 'ae', 14: 'sa', 7: 'ng' };
const region = (loc, companyId) => (/^Physical Locations/.test(loc) ? null : COMPANY[companyId] || null);
const norm = (s) => s.replace(/^\[[^\]]*\]\s*/, '').toUpperCase().replace(/\s+/g, ' ').trim();

const items = [...cat.INVERTERS, ...cat.BATTERIES, ...cat.PANELS, ...cat.ACCESSORIES, ...cat.CONTROLLERS, ...cat.DC_PUMPS];
const rules = items.map((i) => ({ id: i.id, res: i.match.map((m) => new RegExp(m)) }));

const products = new Map();
for (const p of odoo.products) if (p[6]) products.set(p[0], norm(p[2]));

const out = {};
const matchedNames = new Set();
const unmatched = new Map();
for (const q of odoo.quants) {
  const name = products.get(q[0]);
  const r = region(q[1], q[2]);
  if (!name || !r) continue;
  const free = q[3] - q[4];
  const rule = rules.find((x) => x.res.some((re) => re.test(name)));
  if (!rule) { if (free > 0) unmatched.set(name, (unmatched.get(name) || 0) + free); continue; }
  matchedNames.add(name);
  out[rule.id] = out[rule.id] || { ae: 0, sa: 0, ng: 0 };
  out[rule.id][r] += free;
}
for (const id of Object.keys(out)) for (const r of ['ae', 'sa', 'ng']) out[id][r] = Math.max(0, Math.min(CAP, Math.floor(out[id][r])));

const stock = { generatedAt: odoo.pulledAt, cap: CAP, items: out };
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/stock.json'), JSON.stringify(stock, null, 1));

const inStockItems = Object.values(out).filter((v) => v.ae + v.sa + v.ng > 0).length;
console.log(`stock.json written, ${Object.keys(out).length} catalogue items found in Odoo, ${inStockItems} in stock somewhere`);
console.log(`catalogue items with no Odoo match: ${items.filter((i) => !out[i.id]).map((i) => i.id).join(', ') || 'none'}`);
console.log(`Odoo names matched: ${matchedNames.size}. In-stock Odoo names not in the catalogue: ${unmatched.size}`);
if (process.argv.includes('--unmatched')) for (const [n, q] of [...unmatched].sort((a, b) => b[1] - a[1])) console.log('  ' + Math.floor(q) + '  ' + n);
