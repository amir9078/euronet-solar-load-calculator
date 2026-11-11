/*
 * Euronet Solar Load Calculator - sizing engine
 * Pure functions, no DOM. Runs in the browser and in Node (tests/engine.test.mjs).
 *
 * recommend() builds every system the stock in the chosen country allows, keeps the ones that
 * meet the need, scores them and returns the best one plus up to two clear alternatives.
 * If nothing fits from stock it repeats the search allowing items to be ordered.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EuronetEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- load ---------- */
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
      count: count, items: items, simult: s, connectedW: connectedW, runW: runW, avgW: avgBase * s,
      heavyW: heavyW, surgeExtraW: surgeExtraW, surgeFrom: surgeFrom, peakW: runW + surgeExtraW, dailyWh: dailyWh
    };
  }

  /* ---------- stock ---------- */
  function stockFn(stock, region) {
    return function (id) {
      var it = stock && stock.items && stock.items[id];
      return it ? (it[region] || 0) : 0;
    };
  }

  /* ---------- parts ---------- */
  var LFP_V = { 12: 12.8, 24: 25.6, 48: 51.2 };

  // smallest bank of one model that holds needWh (nominal) and can deliver runW
  function bankFor(model, busV, needWh, runW) {
    var series;
    if (model.chem === 'lfp') { if (Math.abs(model.v - LFP_V[busV]) > 0.01) return null; series = 1; }
    else { series = busV / model.v; if (series !== Math.floor(series)) return null; }
    for (var p = 1; p <= model.maxPar; p++) {
      var units = p * series;
      var totalWh = units * model.v * model.ah;
      if (totalWh >= needWh && units * model.maxW >= runW) {
        return { model: model, series: series, parallel: p, units: units, totalWh: totalWh };
      }
    }
    return null;
  }

  // panels for a target array size, capped by what the inverter takes
  function panelsFor(data, have, needW, maxW, strict) {
    var best = null;
    data.PANELS.forEach(function (p) {
      var avail = have(p.id);
      if (strict && avail <= 0) return;
      var want = Math.max(1, Math.ceil(needW / p.wp));
      var maxN = maxW ? Math.max(1, Math.floor(maxW / p.wp)) : Infinity;
      var n = Math.min(want, maxN);
      var short = Math.max(0, n - avail);
      var cand = { panel: p, count: n, capped: want > maxN, short: short, kWp: n * p.wp / 1000, over: n * p.wp - needW };
      if (!best) { best = cand; return; }
      var a = cand, b = best;
      // fully stocked first, then fewer missing, then closest above the target, then bigger panels
      var better = (a.short === 0) !== (b.short === 0) ? a.short === 0
        : a.short !== b.short ? a.short < b.short
        : Math.abs(a.over) !== Math.abs(b.over) ? (a.over >= 0) !== (b.over >= 0) ? a.over >= 0 : Math.abs(a.over) < Math.abs(b.over)
        : a.panel.wp > b.panel.wp;
      if (better) best = cand;
    });
    if (!best) {
      // nothing in stock at all, so propose the standard panel to order
      var p = byId(data.PANELS, 'p540');
      var n = Math.max(1, Math.ceil(needW / p.wp));
      if (maxW) n = Math.min(n, Math.max(1, Math.floor(maxW / p.wp)));
      best = { panel: p, count: n, capped: false, short: n, kWp: n * p.wp / 1000, over: n * p.wp - needW };
    }
    return best;
  }

  /* When panels are short, list what stock can stand in for them. Each string stays one panel
   * model, so a second model may only go on a separate solar input. */
  function fillFor(pv, data, have, needW, maxW, inputs, dailyWh, psh, A) {
    if (!pv.short) return null;
    var main = pv.panel, inStock = pv.count - pv.short;
    var shortW = pv.short * main.wp;
    var room = maxW ? Math.max(0, maxW - inStock * main.wp) : Infinity;
    var options = [];
    data.PANELS.forEach(function (p) {
      if (p.id === main.id) return;
      var avail = have(p.id);
      if (avail <= 0) return;
      var n = Math.min(avail, Math.ceil(shortW / p.wp), Math.floor(room / p.wp));
      if (n < 1) return;
      options.push({ panel: p, count: n, avail: avail, kWp: n * p.wp / 1000, covers: n * p.wp >= shortW });
    });
    options.sort(function (a, b) { return (b.covers - a.covers) || (b.kWp - a.kWp); });
    var readyNow = null;
    if (inputs >= 2 && inStock > 0) {
      var second = options.filter(function (o) { return o.count >= 2; })[0];
      if (second) {
        var kWp = inStock * main.wp / 1000 + second.kWp;
        var y = kWp * psh * A.perfRatio;
        readyNow = { mix: [{ panel: main, count: inStock }, { panel: second.panel, count: second.count }], kWp: kWp, yieldKWh: y, coverage: dailyWh > 0 ? Math.min(1, y / (dailyWh / 1000)) : 0 };
      }
    }
    // a whole array of one in-stock model, for inverters with one solar input
    var swap = data.PANELS.filter(function (p) { return p.id !== main.id && have(p.id) >= Math.ceil(needW / p.wp) && (!maxW || Math.ceil(needW / p.wp) * p.wp <= maxW + p.wp); })
      .map(function (p) { var n = Math.ceil(needW / p.wp); return { panel: p, count: n, kWp: n * p.wp / 1000 }; })[0] || null;
    return { inStock: inStock, short: pv.short, inputs: inputs, options: options, readyNow: readyNow, swap: swap };
  }

  function pvSummary(pick, dailyWh, psh, A) {
    var yieldKWh = pick.kWp * psh * A.perfRatio;
    return {
      panel: pick.panel, count: pick.count, kWp: pick.kWp, capped: pick.capped, short: pick.short,
      yieldKWh: yieldKWh, monthlyKWh: yieldKWh * 30,
      coverage: dailyWh > 0 ? Math.min(1, yieldKWh / (dailyWh / 1000)) : 0,
      areaM2: pick.count * pick.panel.areaM2 * A.panelSpacing
    };
  }

  function pickAccessory(data, have, role, minAmps) {
    var list = data.ACCESSORIES.filter(function (a) { return a.role === role && (!minAmps || a.amps >= minAmps); });
    list.sort(function (a, b) { return (a.amps || 0) - (b.amps || 0); });
    for (var i = 0; i < list.length; i++) if (have(list[i].id) > 0) return list[i];
    return list[0] || null;
  }

  function kit(sys, data, have, A) {
    var out = [];
    function add(item, qty, why) { if (item && qty > 0) out.push({ item: item, qty: qty, why: why, short: Math.max(0, qty - have(item.id)) }); }
    var inv = sys.inverter.item, u = sys.inverter.units;
    if (sys.battery) {
      var iDc = 1.25 * inv.ratedW / (inv.busV * 0.9);
      add(pickAccessory(data, have, 'bat-breaker', iDc), u, 'Battery to inverter, sized for ' + Math.round(iDc) + ' A');
    }
    if (inv.phase !== 3) {
      var iAc = 1.25 * inv.ratedW / 230;
      if (iAc <= 60) add(pickAccessory(data, have, 'ac-breaker', iAc), u, 'Inverter output, sized for ' + Math.round(iAc) + ' A');
    }
    if (sys.pv) {
      var strings = Math.max(1, Math.ceil(sys.pv.count / A.panelsPerString));
      var inputs = Math.min(strings, inv.trackers * u);
      add(byId(data.ACCESSORIES, 'dcb32'), inputs, 'Panel side isolation, one per solar input');
      add(byId(data.ACCESSORIES, 'spd2'), inputs, 'Lightning and surge protection, one per solar input');
      add(byId(data.ACCESSORIES, 'mc4'), strings * 2, 'Two per panel string');
      add(byId(data.ACCESSORIES, 'cable6'), Math.max(1, Math.ceil(sys.pv.count / 20)), 'Panel wiring');
      if (strings > inputs) {
        var per = Math.ceil(strings / inputs);
        var cb = data.ACCESSORIES.filter(function (a) { return a.role === 'combiner' && a.strings >= per; }).sort(function (a, b) { return a.strings - b.strings; })[0];
        add(cb, inputs, 'Joins ' + per + ' strings into each solar input');
      }
    }
    return out;
  }

  /* ---------- scoring ---------- */
  function depth(n) { return Math.min(4, Math.log10(n + 1) * 2); }

  function finish(sys, data, have, A, extra) {
    sys.kit = kit(sys, data, have, A);
    var shortMain = [];
    if (sys.inverter.short) shortMain.push(sys.inverter.item.name);
    if (sys.battery && sys.battery.short) shortMain.push(sys.battery.model.name);
    if (sys.pv && sys.pv.short) shortMain.push(sys.pv.panel.name);
    sys.toOrder = shortMain;
    sys.kitShort = sys.kit.filter(function (k) { return k.short > 0; }).map(function (k) { return k.item.name; });
    sys.ready = !shortMain.length;
    var s = 100 + (extra || 0);
    if (sys.inverter.short) s -= 30;
    if (sys.battery && sys.battery.short) s -= 30;
    if (sys.pv && sys.pv.short) s -= 8 + 15 * sys.pv.short / sys.pv.count;
    s -= sys.kitShort.length;
    s += depth(have(sys.inverter.item.id));
    if (sys.battery) s += depth(have(sys.battery.model.id) / sys.battery.units);
    sys.score = s;
    return sys;
  }

  /* ---------- goals ---------- */
  function batterySystems(load, o, data, have, A, strict) {
    var solar = o.goal === 'off' ? true : !!o.solar;
    var out = [];
    var needUse = load.avgW * o.backupHours / A.invEff;
    data.INVERTERS.forEach(function (inv) {
      if (!(inv.kind === 'hybrid' || inv.kind === 'offgrid' || (inv.kind === 'lf' && !solar))) return;
      var units = 0, tight = false;
      for (var u = 1; u <= inv.parallelMax && !units; u++) {
        var rated = inv.ratedW * u, surge = (inv.surgeW || inv.ratedW) * u;
        if (load.peakW > surge) continue;
        if (load.runW <= rated * 0.8) units = u;
      }
      if (!units) {
        for (u = 1; u <= inv.parallelMax && !units; u++) {
          if (load.peakW <= (inv.surgeW || inv.ratedW) * u && load.runW <= inv.ratedW * u * 0.95) { units = u; tight = true; }
        }
      }
      if (!units) return;
      var invShort = Math.max(0, units - have(inv.id));
      if (strict && invShort) return;

      data.BATTERIES.forEach(function (m) {
        var nominal = needUse / m.dod * 1.15;
        var bank = bankFor(m, inv.busV, nominal, load.runW);
        if (!bank) return;
        var batShort = Math.max(0, bank.units - have(m.id));
        if (strict && batShort) return;
        var usableWh = bank.totalWh * m.dod;
        var runtimeH = load.avgW > 0 ? usableWh * A.invEff / load.avgW : 0;
        var pv = null;
        if (solar && inv.solar) {
          var needW = o.coverage * load.dailyWh / (o.psh * A.perfRatio);
          pv = pvSummary(panelsFor(data, have, needW, inv.pvMaxW * units, strict), load.dailyWh, o.psh, A);
          pv.target = o.coverage;
          pv.fill = fillFor(pv, data, have, needW, inv.pvMaxW * units, inv.trackers * units, load.dailyWh, o.psh, A);
        }
        var L = load.runW / (inv.ratedW * units);
        var r = runtimeH / o.backupHours;
        var x = 0;
        if (L > 0.75) x -= (L - 0.75) * 80;
        if (L < 0.3) x -= (0.3 - L) * 40;
        if (r > 1.5) x -= Math.min(15, (r - 1.5) * 8);
        if (m.chem === 'lfp') x += 8;
        if (m.chem === 'tubular') x -= 2;
        if (inv.kind === 'lf') x -= 2;
        x -= 6 * (units - 1);
        if (bank.units > 4) x -= 1.5 * (bank.units - 4);
        if (pv) x -= Math.max(0, pv.target - pv.coverage) * 40;
        if (tight) x -= 5;
        out.push(finish({
          goal: o.goal,
          inverter: { item: inv, units: units, short: invShort },
          battery: {
            model: m, units: bank.units, series: bank.series, parallel: bank.parallel, busV: inv.busV,
            totalKWh: bank.totalWh / 1000, usableKWh: usableWh / 1000, needKWh: nominal / 1000, runtimeH: runtimeH, short: batShort
          },
          pv: pv,
          loadPct: L,
          peakPct: load.peakW / ((inv.surgeW || inv.ratedW) * units),
          tight: tight
        }, data, have, A, x));
      });
    });
    return out;
  }

  function gridSystems(load, o, data, have, A, strict) {
    var out = [];
    var needW = Math.max(1000, o.coverage * load.dailyWh / (o.psh * A.perfRatio));
    data.INVERTERS.forEach(function (inv) {
      if (inv.kind !== 'ongrid') return;
      var ratio = needW / inv.ratedW;
      if (ratio > 1.3) return;
      // a much bigger inverter than the array is allowed only when it is the smallest one we have
      if (ratio < 0.5 && inv.ratedW > 5000) return;
      var invShort = Math.max(0, 1 - have(inv.id));
      if (strict && invShort) return;
      var pick = panelsFor(data, have, needW, inv.ratedW * 1.3, strict);
      var pv = pvSummary(pick, load.dailyWh, o.psh, A);
      pv.target = o.coverage;
      pv.fill = fillFor(pv, data, have, needW, inv.ratedW * 1.3, inv.trackers, load.dailyWh, o.psh, A);
      var x = -Math.abs(pick.kWp * 1000 / inv.ratedW - A.gridDcAc) * 20;
      out.push(finish({ goal: 'grid', inverter: { item: inv, units: 1, short: invShort }, battery: null, pv: pv, dcAc: pick.kWp * 1000 / inv.ratedW }, data, have, A, x));
    });
    return out;
  }

  function pumpSystems(o, data, have, A, strict) {
    var out = [];
    var motorW = o.pumpKw * 1000;
    data.INVERTERS.forEach(function (inv) {
      if (inv.kind !== 'pump' || inv.ratedW < motorW) return;
      var invShort = Math.max(0, 1 - have(inv.id));
      if (strict && invShort) return;
      var pick = panelsFor(data, have, motorW * A.pumpArrayRatio, null, strict);
      var pv = pvSummary(pick, 0, o.psh, A);
      pv.fill = fillFor(pv, data, have, motorW * A.pumpArrayRatio, null, 1, 0, o.psh, A);
      var x = -(inv.ratedW / motorW - 1) * 30;
      out.push(finish({ goal: 'pump', inverter: { item: inv, units: 1, short: invShort }, battery: null, pv: pv, motorW: motorW }, data, have, A, x));
    });
    return out;
  }

  function search(load, o, data, have, A, strict) {
    if (o.goal === 'pump') return pumpSystems(o, data, have, A, strict);
    if (o.goal === 'grid') return gridSystems(load, o, data, have, A, strict);
    return batterySystems(load, o, data, have, A, strict);
  }

  function sameSystem(a, b) {
    return a && b && a.inverter.item.id === b.inverter.item.id && (a.battery ? a.battery.model.id : '') === (b.battery ? b.battery.model.id : '');
  }

  function recommend(qty, opts, data, stock) {
    var A = data.ASSUMPTIONS;
    var have = stockFn(stock, opts.region || 'ae');
    var o = {
      goal: opts.goal || 'backup', backupHours: opts.backupHours, solar: opts.solar, coverage: opts.coverage,
      psh: opts.psh, pumpKw: opts.pumpKw
    };
    var load = computeLoad(qty, data, opts.simult);
    var res = { load: load, goal: o.goal, opts: o, best: null, alternatives: [], expert: false, fromStock: true };
    if (o.goal !== 'pump') {
      if (!load.count) return res;
      if (load.connectedW > A.maxConnectedW) { res.expert = true; return res; }
    }
    var all = search(load, o, data, have, A, true);
    if (!all.length) { all = search(load, o, data, have, A, false); res.fromStock = false; }
    if (!all.length) { res.expert = true; return res; }
    all.sort(function (a, b) { return b.score - a.score; });
    res.best = all[0];
    res.best.label = 'best';
    if (o.goal === 'backup' || o.goal === 'off') {
      var lead = all.filter(function (s) { return s.battery.model.chem !== 'lfp'; })[0];
      var outdoor = all.filter(function (s) { return s.inverter.item.ip === 'IP65' && s.battery.model.chem === 'lfp'; })[0];
      var lfpAlt = all.filter(function (s) { return s.battery.model.chem === 'lfp'; })[0];
      var cands = res.best.battery.model.chem === 'lfp' ? [lead, outdoor] : [lfpAlt, outdoor];
      cands.forEach(function (c, i) {
        if (c && !sameSystem(c, res.best) && !res.alternatives.some(function (x) { return sameSystem(x, c); })) {
          c.label = c.battery.model.chem === 'lfp' ? (c.inverter.item.ip === 'IP65' && i === 1 ? 'outdoor' : 'lithium') : 'lead';
          res.alternatives.push(c);
        }
      });
    } else {
      var other = all.filter(function (s) { return s.inverter.item.id !== res.best.inverter.item.id; })[0];
      if (other) { other.label = 'other'; res.alternatives.push(other); }
    }
    return res;
  }

  return { computeLoad: computeLoad, recommend: recommend, byId: byId, bankFor: bankFor };
});
