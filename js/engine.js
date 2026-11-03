/*
 * Euronet Solar Load Calculator - sizing engine
 * Pure functions, no DOM. Runs in the browser and in Node (tests/engine.test.mjs).
 *
 * Steps
 *  1. Load        connected watts, running watts (share running together), largest motor start, daily energy
 *  2. Inverter    smallest unit whose rating covers the running load with tier headroom and the peak load
 *  3. Battery     bank on the inverter's voltage that holds the backup energy and can deliver the power
 *  4. Solar       panels that make the daily energy you want solar to cover, capped by the inverter's PV input
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EuronetEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function computeLoad(qty, data, simult) {
    var s = simult > 0 ? simult : 1;
    var connectedW = 0, avgBase = 0, dailyWh = 0, surgeExtraW = 0, surgeFrom = null, count = 0, heavyW = 0;
    var items = [];
    data.APPLIANCES.forEach(function (a) {
      var q = Math.max(0, Math.floor(qty[a.id] || 0));
      if (!q) return;
      var wq = a.w * q;
      connectedW += wq;
      avgBase += wq * a.duty;
      dailyWh += wq * a.duty * a.hrs;
      count += q;
      if (a.heavy) heavyW += wq;
      var extra = a.w * (a.surge - 1);
      if (extra > surgeExtraW) { surgeExtraW = extra; surgeFrom = a; }
      items.push({ id: a.id, name: a.name, qty: q, w: a.w, totalW: wq, dailyWh: wq * a.duty * a.hrs, heavy: !!a.heavy });
    });
    var runW = connectedW * s;
    return {
      count: count,
      items: items,
      simult: s,
      connectedW: connectedW,
      runW: runW,
      avgW: avgBase * s,
      heavyW: heavyW,
      surgeExtraW: surgeExtraW,
      surgeFrom: surgeFrom,
      peakW: runW + surgeExtraW,
      dailyWh: dailyWh
    };
  }

  /* Pick the battery bank for one inverter. Returns null when no allowed bank fits. */
  function pickBattery(tier, inv, load, opts, A) {
    var dod = tier.battery.dod;
    var needWh = (load.avgW * opts.backupHours) / A.invEff / dod * tier.reserve;
    var lfpMatch = { 12: 12.8, 24: 25.6, 48: 51.2 }[inv.busV];
    var best = null;
    tier.battery.ids.forEach(function (id) {
      var m = opts._batteries.byId[id];
      if (!m) return;
      var series;
      if (m.chem === 'lfp') {
        if (Math.abs(m.v - lfpMatch) > 0.01) return;
        series = 1;
      } else {
        series = inv.busV / m.v;
        if (series !== Math.floor(series)) return;
      }
      for (var p = 1; p <= m.maxPar; p++) {
        var units = p * series;
        var totalWh = units * m.v * m.ah;
        var powerW = units * m.maxW;
        if (totalWh < needWh || powerW < load.runW) continue;
        var cand = { model: m, series: series, parallel: p, units: units, totalWh: totalWh, powerW: powerW };
        if (!best || totalWh < best.totalWh - 1e-6 || (Math.abs(totalWh - best.totalWh) < 1e-6 && units < best.units)) best = cand;
        break; // more parallel strings of this model only adds cost
      }
    });
    if (best) {
      best.needWh = needWh;
      best.short = false;
    }
    return best;
  }

  /* Largest allowed bank for an inverter, used when nothing meets the need. */
  function largestBattery(tier, inv, load, opts, A) {
    var dod = tier.battery.dod;
    var needWh = (load.avgW * opts.backupHours) / A.invEff / dod * tier.reserve;
    var lfpMatch = { 12: 12.8, 24: 25.6, 48: 51.2 }[inv.busV];
    var best = null;
    tier.battery.ids.forEach(function (id) {
      var m = opts._batteries.byId[id];
      if (!m) return;
      var series = m.chem === 'lfp' ? (Math.abs(m.v - lfpMatch) > 0.01 ? 0 : 1) : inv.busV / m.v;
      if (!series || series !== Math.floor(series)) return;
      var units = m.maxPar * series;
      var totalWh = units * m.v * m.ah;
      if (!best || totalWh > best.totalWh) best = { model: m, series: series, parallel: m.maxPar, units: units, totalWh: totalWh, powerW: units * m.maxW };
    });
    if (best) { best.needWh = needWh; best.short = true; }
    return best;
  }

  function sizePV(load, opts, tier, inv, data) {
    if (!opts.solar) return null;
    var A = data.ASSUMPTIONS;
    var panel = byId(data.PANELS, tier.panel);
    var dailyKWh = load.dailyWh / 1000;
    var targetKWh = opts.coverage * dailyKWh;
    var neededKWp = (targetKWh / (opts.psh * A.perfRatio)) * tier.pvMargin;
    var n = Math.max(1, Math.ceil((neededKWp * 1000) / panel.wp));
    var maxN = Math.max(1, Math.floor(inv.pvMaxW / panel.wp));
    var capped = n > maxN;
    n = Math.min(n, maxN);
    var kWp = (n * panel.wp) / 1000;
    var yieldKWh = kWp * opts.psh * A.perfRatio;
    return {
      panel: panel,
      count: n,
      kWp: kWp,
      neededKWp: neededKWp,
      capped: capped,
      yieldKWh: yieldKWh,
      monthlyKWh: yieldKWh * 30,
      coverage: dailyKWh > 0 ? Math.min(1, yieldKWh / dailyKWh) : 0,
      areaM2: n * panel.areaM2 * A.panelSpacing
    };
  }

  function sizeTier(load, opts, tier, data) {
    var A = data.ASSUMPTIONS;
    var ladder = tier.inverters.map(function (id) { return byId(data.INVERTERS, id); });
    var powerOk = function (inv, factor) {
      return load.runW <= inv.ratedW * factor && load.peakW <= (inv.surgeW || inv.ratedW);
    };

    // Walk the ladder from the smallest inverter. Take the first one whose power fits, whose
    // voltage can hold the backup energy, and whose PV input can take the panels the goal needs.
    var chosen = null;
    [tier.loadFactor, 0.95].forEach(function (factor, pass) {
      if (chosen) return;
      var capped = null;
      for (var i = 0; i < ladder.length; i++) {
        var inv = ladder[i];
        if (!powerOk(inv, factor)) continue;
        var bank = pickBattery(tier, inv, load, opts, A);
        if (!bank) continue;
        var pv = sizePV(load, opts, tier, inv, data);
        var cand = { inv: inv, tight: pass === 1, bank: bank, pv: pv };
        if (!pv || !pv.capped) { chosen = cand; return; }
        capped = cand; // bigger inverters later in the ladder can take more PV, so keep the last
      }
      if (capped) chosen = capped;
    });

    // Nothing holds the full backup energy. Take the power-fit inverter with the biggest bank.
    if (!chosen) {
      ladder.forEach(function (inv) {
        var tight = !powerOk(inv, tier.loadFactor);
        if (!powerOk(inv, 0.95)) return;
        var bank = largestBattery(tier, inv, load, opts, A);
        if (bank && (!chosen || bank.totalWh > chosen.bank.totalWh)) {
          chosen = { inv: inv, tight: tight, bank: bank, pv: sizePV(load, opts, tier, inv, data) };
        }
      });
    }
    if (!chosen) {
      return { tier: tier, unavailable: true, reason: load.runW > ladder[ladder.length - 1].ratedW ? 'load' : 'peak' };
    }

    var inv = chosen.inv, bank = chosen.bank;
    var usableWh = bank.totalWh * tier.battery.dod;
    var runtimeH = load.avgW > 0 ? (usableWh * A.invEff) / load.avgW : 0;
    var pv = chosen.pv;
    var flags = [];
    if (chosen.tight) flags.push('tight');
    if (bank.short) flags.push('bank-short');
    if (pv && pv.capped) flags.push('pv-capped');

    return {
      tier: tier,
      unavailable: false,
      inverter: inv,
      loadPct: load.runW / inv.ratedW,
      peakPct: load.peakW / (inv.surgeW || inv.ratedW),
      battery: {
        model: bank.model,
        units: bank.units,
        series: bank.series,
        parallel: bank.parallel,
        totalKWh: bank.totalWh / 1000,
        usableKWh: usableWh / 1000,
        needKWh: bank.needWh / 1000,
        runtimeH: runtimeH,
        busV: inv.busV,
        short: !!bank.short
      },
      pv: pv,
      flags: flags
    };
  }

  function sizeAll(qty, opts, data) {
    var o = {
      backupHours: opts.backupHours,
      solar: !!opts.solar,
      coverage: opts.coverage,
      psh: opts.psh,
      _batteries: { byId: {} }
    };
    data.BATTERIES.forEach(function (b) { o._batteries.byId[b.id] = b; });
    var load = computeLoad(qty, data, opts.simult);
    var expert = load.connectedW > data.ASSUMPTIONS.maxConnectedW;
    var tiers = expert || !load.count ? [] : data.TIERS.map(function (t) { return sizeTier(load, o, t, data); });
    return { load: load, tiers: tiers, expert: expert, opts: { backupHours: o.backupHours, solar: o.solar, coverage: o.coverage, psh: o.psh, simult: opts.simult } };
  }

  return { computeLoad: computeLoad, sizeTier: sizeTier, sizeAll: sizeAll, byId: byId };
});
