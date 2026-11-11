import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const data = Object.assign({}, require('../js/data.js'), require('../js/catalog.js'));
const engine = require('../js/engine.js');
const stock = JSON.parse(fs.readFileSync(new URL('../data/stock.json', import.meta.url), 'utf8'));
const inv = (s) => [s.inverter, ...(s.extraInverters || [])].map((x) => x.units + ' x ' + x.item.name.replace(/ Hybrid Inverter| Series/g, '')).join(' + ');
const line = (s) => `${(s.label || '').padEnd(9)} ${inv(s)} | ${s.battery ? (s.battery.builtIn ? 'built-in ' : s.battery.units + ' x ' + s.battery.model.name + ' ') + s.battery.totalKWh.toFixed(0) + ' kWh ' + s.battery.runtimeH.toFixed(1) + ' h' : 'no battery'} | ${s.pv.count} x ${s.pv.panel.wp} W ${s.pv.kWp.toFixed(1)} kWp ${Math.round(s.pv.coverage * 100)}% | ${s.ready ? 'READY' : 'order: ' + s.toOrder.join(', ')}`;
for (const [peak, month] of [[30, 6000], [80, 25000], [250, 90000], [600, 200000]]) for (const mode of ['grid', 'hybrid', 'off']) {
  const r = engine.recommend({}, { goal: 'biz', bizMode: mode, peakKW: peak, monthlyKWh: month, region: process.argv[2] || 'ae', backupHours: 4, coverage: mode === 'off' ? 1 : 0.6, psh: 5.5 }, data, stock);
  console.log(`\n[${peak} kW, ${month} kWh/month, ${mode}]${r.fromStock ? '' : ' NOT FROM STOCK'}${r.expert ? ' EXPERT' : ''}`);
  if (r.best) console.log('  ' + line(r.best));
  for (const a of r.alternatives) console.log('  ' + line(a));
}
