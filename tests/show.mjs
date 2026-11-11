import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const data = Object.assign({}, require('../js/data.js'), require('../js/catalog.js'));
const engine = require('../js/engine.js');
const stock = JSON.parse(fs.readFileSync(new URL('../data/stock.json', import.meta.url), 'utf8'));

const regions = (process.argv[2] || 'ae,sa,ng').split(',');
const goals = (process.argv[3] || 'backup,off,grid').split(',');
function line(s) {
  const inv = `${s.inverter.units > 1 ? s.inverter.units + ' x ' : ''}${s.inverter.item.name}`;
  const b = s.battery ? `${s.battery.units} x ${s.battery.model.name} (${s.battery.totalKWh.toFixed(1)} kWh, ${s.battery.runtimeH.toFixed(1)} h)` : 'no battery';
  const pv = s.pv ? `${s.pv.count} x ${s.pv.panel.wp} W${s.pv.short ? ' (' + s.pv.short + ' to order)' : ''}, ${Math.round(s.pv.coverage * 100)}%` : 'no panels';
  return `${(s.label || '').padEnd(8)} ${inv} | ${b} | ${pv} | ${s.ready ? 'READY' : 'order ' + s.toOrder.join('+')} | score ${s.score.toFixed(1)}`;
}
for (const r of regions) for (const g of goals) for (const p of data.PRESETS.filter((x) => x.id !== 'p0')) {
  const d = data.DURATIONS.find((x) => x.id === (g === 'off' ? 'night' : 'short'));
  const res = engine.recommend(p.qty, { goal: g, region: r, backupHours: d.hours, solar: true, coverage: g === 'grid' ? 0.7 : d.coverage, psh: 5.5, simult: 0.8 }, data, stock);
  console.log(`\n[${r} ${g}] ${p.label}  run ${Math.round(res.load.runW)} W peak ${Math.round(res.load.peakW)} W day ${(res.load.dailyWh / 1000).toFixed(1)} kWh${res.fromStock ? '' : '  (NOT FROM STOCK)'}${res.expert ? ' EXPERT' : ''}`);
  if (res.best) console.log('  ' + line(res.best));
  for (const a of res.alternatives) console.log('  ' + line(a));
}
if (goals.includes('pump')) for (const r of regions) for (const pm of data.PUMPS) {
  const res = engine.recommend({}, { goal: 'pump', region: r, pumpKw: pm.kw, psh: 5.5 }, data, stock);
  console.log(`[${r} pump ${pm.hp} HP] ` + (res.best ? line(res.best) : 'none'));
}
