import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = Object.assign({}, require('../js/data.js'), require('../js/catalog.js'));
const engine = require('../js/engine.js');
const stock = JSON.parse(fs.readFileSync(new URL('../data/stock.json', import.meta.url), 'utf8'));

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' got ' + a);
const P = Object.fromEntries(data.PRESETS.map((p) => [p.id, p.qty]));
const have = (id, r) => (stock.items[id] ? stock.items[id][r] : 0);
const LFP_V = { 12: 12.8, 24: 25.6, 48: 51.2 };

test('2 BHK load worked by hand', () => {
  const l = engine.computeLoad(P.p2, data, 0.8);
  near(l.connectedW, 2299, 0.01); near(l.runW, 1839.2, 0.01); near(l.peakW, 3489.2, 0.01);
  near(l.avgW, 1479.2, 0.01); near(l.dailyWh, 12604, 0.5);
});

test('stock file is capped and holds only catalogue ids and the three countries', () => {
  const ids = new Set([...data.INVERTERS, ...data.BATTERIES, ...data.PANELS, ...data.ACCESSORIES].map((i) => i.id));
  for (const [id, v] of Object.entries(stock.items)) {
    assert.ok(ids.has(id), 'unknown id ' + id);
    assert.deepEqual(Object.keys(v).sort(), ['ae', 'ng', 'sa']);
    for (const q of Object.values(v)) assert.ok(Number.isInteger(q) && q >= 0 && q <= stock.cap);
  }
  assert.ok(!/price|cost|standard_price|WHDXB|WHKSA/i.test(JSON.stringify(stock)), 'no prices or locations');
});

test('catalogue integrity', () => {
  for (const list of [data.INVERTERS, data.BATTERIES, data.PANELS]) for (const p of list) {
    assert.ok(p.url.startsWith('https://www.euronetworld.com/products/'), p.url);
    assert.ok(p.img.startsWith('https://heahnqdtjwoqfbbfwvrn.storage.supabase.co/') && !/ /.test(p.img), p.img);
    assert.ok(p.match && p.match.length, p.id + ' match');
  }
  for (const i of data.INVERTERS) if (i.kind === 'hybrid' || i.kind === 'offgrid') assert.ok(i.pvMaxW > 0 && i.busV, i.id);
  for (const p of data.PRESETS) for (const id of Object.keys(p.qty)) assert.ok(engine.byId(data.APPLIANCES, id), id);
});

function checkSystem(s, ctx, res, strict) {
  const { r, o } = ctx;
  const inv = s.inverter.item;
  if (strict) {
    assert.ok(have(inv.id, r) >= s.inverter.units, 'inverter in stock');
    if (s.battery) assert.ok(have(s.battery.model.id, r) >= s.battery.units, 'battery in stock');
  }
  if (o.goal === 'backup' || o.goal === 'off') {
    const L = res.load;
    assert.ok(L.runW <= inv.ratedW * s.inverter.units * 0.95 + 1e-6, 'running load fits');
    assert.ok(L.peakW <= (inv.surgeW || inv.ratedW) * s.inverter.units + 1e-6, 'peak fits');
    const b = s.battery;
    const vBank = b.model.chem === 'lfp' ? b.model.v : b.series * b.model.v;
    near(vBank, b.model.chem === 'lfp' ? LFP_V[inv.busV] : inv.busV, 0.01, 'bank voltage');
    assert.ok(b.runtimeH + 1e-6 >= o.backupHours, 'runtime ' + b.runtimeH.toFixed(2) + ' >= ' + o.backupHours);
    assert.ok(b.units * b.model.maxW + 1e-6 >= L.runW, 'bank power');
    assert.ok(b.parallel <= b.model.maxPar);
    if (o.goal === 'off' || o.solar) {
      assert.ok(s.pv && s.pv.count >= 1, 'panels');
      assert.ok(s.pv.count * s.pv.panel.wp <= inv.pvMaxW * s.inverter.units + s.pv.panel.wp, 'within solar input');
    } else assert.ok(!s.pv);
    if (inv.kind === 'lf') assert.ok(!s.pv, 'LF only without solar');
  }
  if (o.goal === 'grid') {
    assert.equal(inv.kind, 'ongrid');
    assert.ok(s.pv.kWp * 1000 / inv.ratedW <= 1.3 + 1e-6, 'DC to AC ratio');
  }
  if (o.goal === 'pump') {
    assert.equal(inv.kind, 'pump');
    assert.ok(inv.ratedW >= o.pumpKw * 1000);
    assert.ok(s.pv.count * s.pv.panel.wp >= o.pumpKw * 1000 * data.ASSUMPTIONS.pumpArrayRatio - 1e-6, 'pump array size');
  }
  for (const k of s.kit) assert.ok(k.qty >= 1 && k.item, 'kit line');
  assert.ok(Number.isFinite(s.score));
  assert.equal(s.ready, s.toOrder.length === 0);
}

for (const r of ['ae', 'sa', 'ng']) {
  for (const goal of ['backup', 'off', 'grid']) {
    for (const p of data.PRESETS.filter((x) => x.id !== 'p0')) {
      for (const d of data.DURATIONS) {
        for (const solar of goal === 'backup' ? [true, false] : [true]) {
          for (const simult of [0.6, 1]) {
            const o = { goal, region: r, backupHours: d.hours, solar, coverage: goal === 'grid' ? 0.7 : d.coverage, psh: 5.5, simult };
            test(`${r} ${goal} ${p.label} ${d.id} solar ${solar} ${simult}`, () => {
              const res = engine.recommend(p.qty, o, data, stock);
              assert.ok(res.best || res.expert, 'gives an answer');
              if (!res.best) return;
              checkSystem(res.best, { r, o }, res, res.fromStock);
              for (const a of res.alternatives) {
                if (a.label === 'first') { assert.ok(!a.ready, 'first choice is shown only when it needs ordering'); checkSystem(a, { r, o }, res, false); continue; }
                checkSystem(a, { r, o }, res, res.fromStock);
                assert.ok(a.inverter.item.id !== res.best.inverter.item.id || a.inverter.units !== res.best.inverter.units || (a.battery && res.best.battery && a.battery.model.id !== res.best.battery.model.id), 'alternative differs');
              }
              if (res.fromStock) assert.ok(res.best.ready || res.best.toOrder.every((n) => /Panel/.test(n)), 'from-stock answer only waits on panels');
            });
          }
        }
      }
    }
  }
  for (const pm of data.PUMPS) {
    const o = { goal: 'pump', region: r, pumpKw: pm.kw, psh: 5.5 };
    test(`${r} pump ${pm.hp} HP`, () => {
      const res = engine.recommend({}, o, data, stock);
      assert.ok(res.best);
      checkSystem(res.best, { r, o }, res, res.fromStock);
    });
  }
}


for (const r of ['ae', 'sa', 'ng']) for (const [peak, month] of [[15, 3000], [30, 6000], [120, 40000], [600, 200000]]) for (const mode of ['grid', 'hybrid', 'off']) {
  test('biz ' + r + ' ' + peak + ' kW ' + mode, () => {
    const o = { goal: 'biz', bizMode: mode, peakKW: peak, monthlyKWh: month, region: r, backupHours: 4, coverage: mode === 'off' ? 1 : 0.6, psh: 5.5 };
    const res = engine.recommend({}, o, data, stock);
    assert.ok(res.best, 'answer');
    for (const s of [res.best, ...res.alternatives]) {
      const invs = [s.inverter, ...(s.extraInverters || [])];
      for (const x of invs) assert.ok(x.units <= x.item.parallelMax || x.item.kind === 'ongrid', 'parallel limit ' + x.item.id);
      if (mode === 'grid') {
        const ac = invs.reduce((t, x) => t + x.item.ratedW * x.units, 0);
        assert.ok(s.pv.kWp * 1000 / ac <= 1.3 + 0.02, 'dc to ac');
        assert.ok(!s.battery);
      } else {
        const rated = s.inverter.item.ratedW * s.inverter.units;
        assert.ok(peak * 1000 <= rated * 0.95 + 1e-6, 'power ' + s.inverter.item.id);
        assert.ok(s.battery.runtimeH + 1e-6 >= 4, 'runtime');
        assert.ok(s.pv && s.pv.count > 0);
        if (mode === 'off') assert.ok(!(s.inverter.item.kind === 'ess' && !s.inverter.item.offgrid), 'off-grid capable');
      }
    }
  });
}

test('stock decides, AE 2 BHK backup ready from stock', () => {
  const res = engine.recommend(P.p2, { goal: 'backup', region: 'ae', backupHours: 3, solar: true, coverage: 0.4, psh: 5.5, simult: 0.8 }, data, stock);
  assert.ok(res.fromStock && res.best.ready);
});
test('an item with no stock is never chosen while stock alternatives exist', () => {
  const res = engine.recommend(P.p3, { goal: 'backup', region: 'ae', backupHours: 8, solar: false, coverage: 0, psh: 5.5, simult: 0.8 }, data, stock);
  assert.ok(have(res.best.inverter.item.id, 'ae') > 0 && have(res.best.battery.model.id, 'ae') > 0);
});
test('empty selection gives no system, huge load asks for an engineer', () => {
  assert.equal(engine.recommend({}, { goal: 'backup', region: 'ae', backupHours: 3, solar: true, coverage: 0.4, psh: 5.5, simult: 0.8 }, data, stock).best, null);
  assert.equal(engine.recommend({ ac2: 30 }, { goal: 'backup', region: 'ae', backupHours: 3, solar: true, coverage: 0.4, psh: 5.5, simult: 0.8 }, data, stock).expert, true);
});

console.log(passed + ' checks passed' + (process.exitCode ? ', with failures' : ''));
