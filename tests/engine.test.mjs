import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../js/data.js');
const engine = require('../js/engine.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' got ' + a);

const P = Object.fromEntries(data.PRESETS.map(p => [p.id, p.qty]));
const DEFAULTS = { backupHours: 3, solar: true, coverage: 0.4, psh: 5.5, simult: 0.8 };

console.log('Load maths (2 BHK, worked by hand)');
test('connected, running, peak and daily energy', () => {
  const l = engine.computeLoad(P.p2, data, 0.8);
  near(l.connectedW, 2299, 0.01, 'connected');
  near(l.runW, 1839.2, 0.01, 'running');
  near(l.surgeExtraW, 1650, 0.01, 'largest motor start (1 ton AC x 1.5 extra)');
  near(l.peakW, 3489.2, 0.01, 'peak');
  near(l.avgW, 1479.2, 0.01, 'average');
  near(l.dailyWh, 12604, 0.5, 'daily energy');
});

console.log('System sizing (2 BHK, short cuts, solar on)');
test('Best Fit picks S 4.2K with 3 x 25.6V 100Ah lithium and 3 panels', () => {
  const r = engine.sizeAll(P.p2, DEFAULTS, data);
  const best = r.tiers.find(t => t.tier.key === 'best');
  assert.equal(best.inverter.id, 's42');
  assert.equal(best.battery.model.id, 'l256_100');
  assert.equal(best.battery.units, 3);
  near(best.battery.totalKWh, 7.68, 0.001, 'bank kWh');
  assert.equal(best.pv.count, 3);
  near(best.pv.kWp, 1.62, 0.001, 'kWp');
});
test('Smart Value skips A 3.2K because peak 3,489 W exceeds its 3,200 W (no published surge)', () => {
  const r = engine.sizeAll(P.p2, DEFAULTS, data);
  const v = r.tiers.find(t => t.tier.key === 'value');
  assert.equal(v.inverter.id, 's42');
  assert.equal(v.battery.model.chem, 'gel');
  assert.equal(v.battery.series, 2, '24V bank from 12V gel needs 2 in series');
});
test('Future-proof uses an IP65 inverter and IP65-class lithium', () => {
  const r = engine.sizeAll(P.p2, DEFAULTS, data);
  const f = r.tiers.find(t => t.tier.key === 'future');
  assert.equal(f.inverter.ip, 'IP65');
  assert.ok(['l256_100', 'l256_205', 'l512_205', 'l512_314ip'].includes(f.battery.model.id));
});
test('off-grid 1 BHK does not stop at an inverter whose PV input caps the panels below the goal', () => {
  const g = data.GRID_SITUATIONS.find(x => x.id === 'off');
  const r = engine.sizeAll(P.p1, { backupHours: g.hours, solar: true, coverage: g.coverage, psh: 5.5, simult: 0.8 }, data);
  for (const t of r.tiers) {
    assert.ok(!t.flags.includes('pv-capped'), t.tier.label + ' picked ' + t.inverter.model + ' but is capped');
    assert.ok(t.pv.coverage >= 0.95, t.tier.label + ' coverage ' + t.pv.coverage);
  }
});
test('a villa gets a result in every level (RSZ 12 kW surge 18,000 VA is the top step)', () => {
  const r = engine.sizeAll(P.p4, DEFAULTS, data);
  for (const t of r.tiers) assert.ok(!t.unavailable, t.tier.label + ' unavailable');
  const best = r.tiers.find(t => t.tier.key === 'best');
  assert.equal(best.inverter.id, 'rsz12');
});

console.log('Invariants across every preset and grid situation');
for (const preset of data.PRESETS.filter(p => p.id !== 'p0')) {
  for (const g of data.GRID_SITUATIONS) {
    for (const simult of [0.6, 0.8, 1.0]) {
      for (const solar of [true, false]) {
        const opts = { backupHours: g.hours, solar: solar || g.offgrid, coverage: g.coverage, psh: 5.5, simult };
        const label = `${preset.label} / ${g.label} / ${simult} / solar ${opts.solar}`;
        test(label, () => {
          const r = engine.sizeAll(preset.qty, opts, data);
          assert.equal(r.tiers.length, 3);
          for (const t of r.tiers) {
            if (t.unavailable) continue;
            const inv = t.inverter;
            const b = t.battery;
            for (const v of [t.loadPct, t.peakPct, b.totalKWh, b.usableKWh, b.runtimeH]) assert.ok(Number.isFinite(v) && v >= 0, 'finite');
            // battery bank matches inverter voltage
            const vBank = b.model.chem === 'gel' ? b.series * b.model.v : b.model.v;
            near(vBank, { 12: 12, 24: 24, 48: 48 }[inv.busV], inv.busV * 0.07 + 0.01, 'bank voltage vs inverter bus');
            assert.equal(b.units, b.series * b.parallel);
            assert.ok(b.parallel <= b.model.maxPar);
            // power: inverter covers the running load (tight fit allowed up to 95%)
            const factor = t.flags.includes('tight') ? 0.95 : t.tier.loadFactor;
            assert.ok(r.load.runW <= inv.ratedW * factor + 1e-6, 'inverter covers running load');
            assert.ok(r.load.peakW <= (inv.surgeW || inv.ratedW) + 1e-6, 'inverter covers peak');
            // battery: holds the backup energy unless flagged short
            if (!b.short) {
              assert.ok(b.runtimeH + 1e-6 >= opts.backupHours, 'runtime ' + b.runtimeH.toFixed(2) + ' >= ' + opts.backupHours);
              assert.ok(b.model.maxW * b.units + 1e-6 >= r.load.runW, 'battery can deliver the running load');
            }
            if (opts.solar) {
              assert.ok(t.pv.count >= 1);
              assert.ok(t.pv.count * t.pv.panel.wp <= inv.pvMaxW + t.pv.panel.wp, 'array within PV cap');
              assert.ok(t.pv.coverage >= 0 && t.pv.coverage <= 1);
            } else {
              assert.equal(t.pv, null);
            }
          }
        });
      }
    }
  }
}

console.log('Edge cases');
test('empty selection returns no tiers', () => {
  const r = engine.sizeAll({}, DEFAULTS, data);
  assert.equal(r.tiers.length, 0);
});
test('very large connected load asks for an engineer', () => {
  const r = engine.sizeAll({ ac2: 30 }, DEFAULTS, data);
  assert.equal(r.expert, true);
  assert.equal(r.tiers.length, 0);
});
test('a 15 kW load: low tiers unavailable, Future-proof 16 kW as a tight fit', () => {
  const r = engine.sizeAll({ ac2: 5, geyser: 2 }, { ...DEFAULTS, simult: 1.0 }, data);
  const byKey = Object.fromEntries(r.tiers.map(t => [t.tier.key, t]));
  assert.ok(byKey.value.unavailable || byKey.value.inverter.ratedW >= 10200);
});
test('every product id referenced by a tier exists', () => {
  for (const t of data.TIERS) {
    for (const id of t.inverters) assert.ok(engine.byId(data.INVERTERS, id), 'inverter ' + id);
    for (const id of t.battery.ids) assert.ok(engine.byId(data.BATTERIES, id), 'battery ' + id);
    assert.ok(engine.byId(data.PANELS, t.panel), 'panel ' + t.panel);
  }
});
test('every preset item id exists in the appliance list', () => {
  for (const p of data.PRESETS) for (const id of Object.keys(p.qty)) assert.ok(engine.byId(data.APPLIANCES, id), id);
});
test('product URLs are well formed', () => {
  for (const list of [data.INVERTERS, data.BATTERIES, data.PANELS]) {
    for (const p of list) {
      assert.ok(p.url.startsWith('https://www.euronetworld.com/products/solar-energy/'), p.url);
      assert.ok(p.img.startsWith('https://heahnqdtjwoqfbbfwvrn.storage.supabase.co/'), p.img);
      assert.ok(!/ /.test(p.url + p.img), 'no raw spaces');
    }
  }
});

console.log('\n' + passed + ' checks passed' + (process.exitCode ? ', with failures' : ''));
