import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('../js/data.js');
const engine = require('../js/engine.js');

const only = process.argv[2];
for (const preset of data.PRESETS.filter(p => p.id !== 'p0')) {
  for (const g of data.GRID_SITUATIONS) {
    if (only && !(preset.id === only || g.id === only)) continue;
    const opts = { backupHours: g.hours, solar: true, coverage: g.coverage, psh: 5.5, simult: 0.8 };
    const r = engine.sizeAll(preset.qty, opts, data);
    const L = r.load;
    console.log(`\n${preset.label} / ${g.label} (${g.hours} h, solar ${Math.round(g.coverage * 100)}%)  connected ${L.connectedW} W, running ${Math.round(L.runW)} W, peak ${Math.round(L.peakW)} W, daily ${(L.dailyWh / 1000).toFixed(1)} kWh`);
    for (const t of r.tiers) {
      if (t.unavailable) { console.log(`  ${t.tier.label.padEnd(13)} UNAVAILABLE (${t.reason})`); continue; }
      const b = t.battery;
      const bank = `${b.units} x ${b.model.v}V ${b.model.ah}Ah ${b.model.chem}`;
      console.log(`  ${t.tier.label.padEnd(13)} ${t.inverter.model.padEnd(20)} ${String(t.inverter.ratedW).padStart(5)} W ${String(t.inverter.busV).padStart(2)}V load ${Math.round(t.loadPct * 100)}% | ${bank.padEnd(24)} ${b.totalKWh.toFixed(1)} kWh -> ${b.runtimeH.toFixed(1)} h | ${t.pv ? t.pv.count + ' x ' + t.pv.panel.wp + ' W = ' + t.pv.kWp.toFixed(2) + ' kWp, covers ' + Math.round(t.pv.coverage * 100) + '%, ' + t.pv.areaM2.toFixed(0) + ' m2' : 'no solar'} ${t.flags.join(',')}`);
    }
  }
}
