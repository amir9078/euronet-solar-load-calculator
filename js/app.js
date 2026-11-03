/* Euronet Solar Load Calculator - interface */
(function () {
  'use strict';

  var D = window.EURONET_DATA;
  var E = window.EuronetEngine;
  var A = D.ASSUMPTIONS;
  var STORE = 'euronet-load-calculator-v1';
  var MAXQ = 30;
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function byId(list, id) { return E.byId(list, id); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  /* ---------- number formats ---------- */
  function nd(x, d) { return Number(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }
  function n0(x) { return nd(Math.round(x), 0); }
  function pw(w) { return w >= 1000 ? nd(w / 1000, 2) + ' kW' : n0(w) + ' W'; }
  function kwh(x) { return nd(x, x < 10 ? 2 : 1) + ' kWh'; }
  function hrs(h) { var r = Math.round(h * 10) / 10; return nd(h, h < 10 ? 1 : 0) + (r === 1 ? ' hour' : ' hours'); }
  function pct(x) { return Math.round(x * 100) + '%'; }

  /* ---------- state ---------- */
  function defaults() {
    return {
      qty: clone(byId(D.PRESETS, 'p2').qty), preset: 'p2', region: 'ae', grid: 'short',
      hours: 3, solar: true, coverage: 0.4, psh: 5.5, simult: 0.8,
      filter: 'all', search: '', step: 1
    };
  }
  var state = defaults();
  var PERSIST = ['qty', 'preset', 'region', 'grid', 'hours', 'solar', 'coverage', 'psh', 'simult'];

  function sanitize(src) {
    var s = defaults();
    if (!src || typeof src !== 'object') return s;
    if (src.qty && typeof src.qty === 'object') {
      s.qty = {};
      D.APPLIANCES.forEach(function (a) {
        var n = Math.floor(Number(src.qty[a.id]));
        if (n > 0) s.qty[a.id] = Math.min(n, MAXQ);
      });
    }
    s.preset = src.preset === 'custom' || byId(D.PRESETS, src.preset) ? src.preset : 'custom';
    if (byId(D.REGIONS, src.region)) s.region = src.region;
    if (byId(D.GRID_SITUATIONS, src.grid)) s.grid = src.grid;
    if (isFinite(Number(src.hours))) s.hours = clamp(Math.round(Number(src.hours)), 1, 24);
    if (typeof src.solar === 'boolean') s.solar = src.solar;
    if (isFinite(Number(src.coverage))) s.coverage = clamp(Number(src.coverage), 0.1, 1);
    if (isFinite(Number(src.psh))) s.psh = clamp(Number(src.psh), 3, 7.5);
    if ([0.6, 0.8, 1].indexOf(Number(src.simult)) > -1) s.simult = Number(src.simult);
    if (s.grid === 'off') s.solar = true;
    return s;
  }
  function persistable() { var o = {}; PERSIST.forEach(function (k) { o[k] = state[k]; }); return o; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(persistable())); } catch (e) { /* storage can be blocked */ } }
  function restore() {
    try { var raw = localStorage.getItem(STORE); if (raw) return sanitize(JSON.parse(raw)); } catch (e) { /* ignore */ }
    return null;
  }
  function encodeShare() {
    try { return btoa(JSON.stringify(persistable())).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; }
  }
  function decodeShare(str) {
    try {
      var b = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return sanitize(JSON.parse(atob(b)));
    } catch (e) { return null; }
  }
  function shareUrl() { return location.origin + location.pathname + '#s=' + encodeShare(); }

  /* ---------- derived ---------- */
  function load() { return E.computeLoad(state.qty, D, state.simult); }
  function region() { return byId(D.REGIONS, state.region); }
  function solarOn() { return state.grid === 'off' ? true : state.solar; }
  function engineOpts() {
    return { backupHours: state.hours, solar: solarOn(), coverage: solarOn() ? state.coverage : 0, psh: state.psh, simult: state.simult };
  }

  /* ---------- step 1 ---------- */
  function matchPreset() {
    var cur = state.qty;
    var curKeys = Object.keys(cur).filter(function (k) { return cur[k] > 0; });
    for (var i = 0; i < D.PRESETS.length; i++) {
      var p = D.PRESETS[i];
      var pk = Object.keys(p.qty);
      if (pk.length !== curKeys.length) continue;
      if (pk.every(function (k) { return cur[k] === p.qty[k]; })) return p.id;
    }
    return 'custom';
  }

  function renderPresets() {
    $('#presets').innerHTML = D.PRESETS.map(function (p) {
      return '<label class="chip"><input type="radio" name="preset" value="' + p.id + '"' + (state.preset === p.id ? ' checked' : '') + '>' +
        '<span class="chip-body"><span class="chip-title">' + esc(p.label) + '</span><span class="chip-hint">' + esc(p.hint) + '</span></span></label>';
    }).join('');
  }

  function matches(a) {
    if (state.filter === 'heavy' && !a.heavy) return false;
    if (state.filter === 'everyday' && a.heavy) return false;
    var q = state.search.trim().toLowerCase();
    if (!q) return true;
    return (a.name + ' ' + a.note + ' ' + a.kw).toLowerCase().indexOf(q) > -1;
  }

  function meta(a) {
    var m = n0(a.w) + ' W';
    if (a.note && !/ W$/.test(a.note)) m += ' · ' + a.note;
    return m;
  }

  function rowHtml(a) {
    var n = state.qty[a.id] || 0;
    return '<li class="row' + (n ? ' on' : '') + '" data-row="' + a.id + '">' +
      '<div><span class="nm">' + esc(a.name) + '</span><span class="meta">' + esc(meta(a)) + '</span></div>' +
      '<div class="qty">' +
      '<button type="button" data-act="dec" data-id="' + a.id + '" aria-label="Fewer ' + esc(a.name) + '"' + (n ? '' : ' disabled') + '>&minus;</button>' +
      '<span class="n" data-n="' + a.id + '">' + n + '</span>' +
      '<button type="button" data-act="inc" data-id="' + a.id + '" aria-label="More ' + esc(a.name) + '"' + (n >= MAXQ ? ' disabled' : '') + '>+</button>' +
      '</div></li>';
  }

  function groupCount(catId) {
    return D.APPLIANCES.reduce(function (t, a) { return t + (a.cat === catId ? (state.qty[a.id] || 0) : 0); }, 0);
  }

  function renderAppliances() {
    var html = '';
    var any = false;
    D.CATEGORIES.forEach(function (c) {
      var items = D.APPLIANCES.filter(function (a) { return a.cat === c.id && matches(a); });
      if (!items.length) return;
      any = true;
      var cnt = groupCount(c.id);
      html += '<section class="group" data-group="' + c.id + '"><h3>' + esc(c.label) +
        '<span class="count" data-count="' + c.id + '"' + (cnt ? '' : ' hidden') + '>' + cnt + '</span></h3>' +
        '<ul class="rows">' + items.map(rowHtml).join('') + '</ul></section>';
    });
    $('#appliances').innerHTML = html;
    $('#no-match').hidden = any;
  }

  function setQty(id, n) {
    var a = byId(D.APPLIANCES, id);
    if (!a) return;
    n = clamp(n, 0, MAXQ);
    if (n) state.qty[id] = n; else delete state.qty[id];
    var row = $('[data-row="' + id + '"]');
    if (row) {
      row.classList.toggle('on', n > 0);
      $('[data-n="' + id + '"]', row).textContent = n;
      $('[data-act="dec"]', row).disabled = n === 0;
      $('[data-act="inc"]', row).disabled = n >= MAXQ;
    }
    var cnt = $('[data-count="' + a.cat + '"]');
    if (cnt) { var c = groupCount(a.cat); cnt.textContent = c; cnt.hidden = !c; }
    var m = matchPreset();
    if (m !== state.preset) { state.preset = m; renderPresets(); }
    onLoadChanged();
  }

  function onLoadChanged() {
    var L = load();
    $('#s-conn').textContent = n0(L.connectedW) + ' W';
    $('#s-run').textContent = n0(L.runW) + ' W';
    $('#s-day').textContent = nd(L.dailyWh / 1000, 1) + ' kWh';
    var none = L.count === 0;
    $('#to2').disabled = none;
    $('#need-one').hidden = !none;
    if (!$('#step2').hidden) updateHoursHint();
    save();
  }

  /* ---------- step 2 ---------- */
  var TOGETHER = [
    { v: 0.6, t: 'A few things at a time', d: 'About 60% of the load' },
    { v: 0.8, t: 'A typical household', d: 'About 80% of the load' },
    { v: 1, t: 'Almost everything together', d: '100% of the load' }
  ];

  function renderStep2() {
    $('#region').innerHTML = D.REGIONS.map(function (r) {
      return '<option value="' + r.id + '"' + (r.id === state.region ? ' selected' : '') + '>' + esc(r.label) + '</option>';
    }).join('');
    $('#together').innerHTML = TOGETHER.map(function (o) {
      return '<label class="radio-item"><input type="radio" name="together" value="' + o.v + '"' + (o.v === state.simult ? ' checked' : '') + '>' +
        '<span class="ri-body"><strong>' + esc(o.t) + '</strong><span>' + esc(o.d) + '</span></span></label>';
    }).join('');
    $('#grid').innerHTML = D.GRID_SITUATIONS.map(function (g) {
      return '<label class="card-radio"><input type="radio" name="grid" value="' + g.id + '"' + (g.id === state.grid ? ' checked' : '') + '>' +
        '<span class="cr-body"><strong>' + esc(g.label) + '</strong><span>' + esc(g.hint) + '</span></span></label>';
    }).join('');
    syncStep2Controls();
  }

  function syncStep2Controls() {
    var r = region();
    $('#region-hint').textContent = 'Planning value of ' + nd(r.psh, 1) + ' peak sun hours a day. Questions go to our ' + r.office + ' office on ' + r.phone + '.';
    $('#hours').value = state.hours;
    $('#hours-out').textContent = state.hours + ' h';
    updateHoursHint();
    var off = state.grid === 'off';
    var sw = $('#solar');
    sw.checked = solarOn();
    sw.disabled = off;
    $('#solar-hint').textContent = off
      ? 'Panels are needed when there is no grid to recharge the battery.'
      : (sw.checked ? 'The panels recharge the battery and carry daytime loads.' : 'No panels. The grid recharges the battery.');
    $('#coverage-wrap').hidden = !solarOn();
    $('#coverage').value = Math.round(state.coverage * 100);
    $('#coverage-out').textContent = Math.round(state.coverage * 100) + '%';
    $('#psh').value = nd(state.psh, 1);
  }

  function updateHoursHint() {
    var L = load();
    var el = $('#hours-hint');
    if (!L.count) { el.textContent = 'Add appliances in the first step to see the energy this needs.'; return; }
    el.textContent = 'Your typical draw is ' + pw(L.avgW) + ', so ' + hrs(state.hours) + ' needs about ' + kwh(L.avgW * state.hours / 1000) + ' from the battery.';
  }

  /* ---------- navigation ---------- */
  function go(step, silent) {
    if (step === 2 && load().count === 0) step = 1;
    state.step = step;
    [1, 2, 3].forEach(function (i) { $('#step' + i).hidden = i !== step; });
    $$('.step-btn').forEach(function (b) {
      if (Number(b.dataset.go) === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    document.body.classList.toggle('on-results', step === 3);
    document.body.setAttribute('data-step', String(step));
    if (step === 2) renderStep2();
    if (step === 3) renderResults();
    if (!silent) {
      $('#step' + step).focus({ preventScroll: true });
      $('#stepper').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------- results ---------- */
  var TIER_NOTES = {
    tight: 'This is the largest unit in this range for your load and it runs close to its limit. Our engineers can suggest units in parallel or moving a heavy load off the battery.',
    'bank-short': 'This is the largest bank we size online and it does not reach the backup time you asked for. Try fewer hours, take out a heavy load, or ask our engineers for a bigger system.',
    'pv-capped': 'The inverter takes at most about {max} of panels, so solar covers {cov} of your daily use instead of {want}. Ask us about a second inverter or more solar inputs.'
  };

  function productRow(role, img, name, url, lines) {
    return '<li class="prod"><div class="ph"><img src="' + esc(img) + '" alt="" loading="lazy" width="76" height="76"></div>' +
      '<div><span class="role">' + esc(role) + '</span>' +
      '<a class="pn" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' +
      '<p class="pq">' + lines + '</p></div></li>';
  }

  function meter(label, value, frac, cls, caption) {
    return '<div class="meter"><div class="mh"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div>' +
      '<div class="track"><i class="' + cls + '" style="width:' + Math.round(clamp(frac, 0, 1) * 100) + '%"></i></div>' +
      '<p class="mc">' + caption + '</p></div>';
  }

  function bankLine(b) {
    var m = b.model;
    if (m.chem === 'gel') {
      var wiring = b.series > 1
        ? b.units + ' batteries in ' + b.parallel + (b.parallel > 1 ? ' strings' : ' string') + ' of ' + b.series + ' for ' + b.busV + ' V'
        : b.units + (b.units > 1 ? ' batteries in parallel' : ' battery') + ' on ' + b.busV + ' V';
      return '<b>' + b.units + ' &times;</b> ' + nd(m.v, 0) + ' V ' + m.ah + ' Ah gel. ' + wiring + '. ' + kwh(b.totalKWh) + ' in total, ' + kwh(b.usableKWh) + ' usable.';
    }
    return '<b>' + b.units + ' &times;</b> ' + nd(m.v, 1) + ' V ' + m.ah + ' Ah lithium. ' + kwh(b.totalKWh) + ' in total, ' + kwh(b.usableKWh) + ' usable.';
  }

  function msgFor(t, res) {
    var L = res.load, inv = t.inverter, b = t.battery, r = region();
    var lines = [
      'Hello EURONET, I used the solar load calculator and would like a quote.',
      '',
      'System ' + t.tier.label,
      'Inverter ' + inv.name,
      'Battery ' + b.units + ' x ' + b.model.name + ' (' + kwh(b.totalKWh) + ')'
    ];
    if (t.pv) lines.push('Panels ' + t.pv.count + ' x ' + t.pv.panel.wp + ' W (' + nd(t.pv.kWp, 2) + ' kWp)');
    lines.push('', 'My load is ' + n0(L.connectedW) + ' W connected, ' + n0(L.runW) + ' W running together, about ' + nd(L.dailyWh / 1000, 1) + ' kWh a day.');
    lines.push('Backup wanted ' + hrs(state.hours) + '. Country ' + r.label + '.');
    lines.push('', 'My results ' + shareUrl());
    return lines.join('\n');
  }

  function tierCard(t, res) {
    var L = res.load;
    if (t.unavailable) {
      return '<article class="tier off"><h3>' + esc(t.tier.label) + '</h3><p class="tag">' + esc(t.tier.tag) + '</p>' +
        '<div class="unavail"><strong>Too big for this level.</strong><br>Your load of ' + pw(L.runW) + ' running and ' + pw(L.peakW) + ' at the biggest start is above what these units are built for. ' +
        'The other levels or our engineers can size it.</div>' + engineerBtn(null) + '</article>';
    }
    var inv = t.inverter, b = t.battery, pv = t.pv;
    var pick = t.tier.key === 'best';
    var hasSurge = !!inv.surgeW;

    var prods = '';
    prods += productRow('Inverter', inv.img, inv.name, inv.url,
      '<b>' + pw(inv.ratedW) + '</b> &middot; ' + inv.busV + ' V battery &middot; ' + esc(inv.ip) + ' &middot; solar input ' + esc(inv.mppt));
    prods += productRow('Battery bank', b.model.img, b.model.name, b.model.url, bankLine(b));
    if (pv) {
      prods += productRow('Solar panels', pv.panel.img, pv.panel.name, pv.panel.url,
        '<b>' + pv.count + ' &times; ' + pv.panel.wp + ' W</b> &middot; ' + nd(pv.kWp, 2) + ' kWp &middot; about ' + n0(pv.areaM2) + ' m&sup2; of roof');
    }

    var loadCls = t.loadPct <= 0.75 ? '' : (t.loadPct <= 0.9 ? 'warn' : 'hot');
    var meters = meter('Inverter load', pct(t.loadPct), t.loadPct, loadCls,
      'Your ' + pw(L.runW) + ' running load on a ' + pw(inv.ratedW) + ' inverter. The biggest motor start takes it to ' + pct(t.peakPct) + ' of ' +
      (hasSurge ? 'its surge rating' : 'its rating') + ' for a moment.');
    var ratio = b.runtimeH / state.hours;
    meters += meter('Backup time', hrs(b.runtimeH), ratio, ratio >= 1 ? '' : (ratio >= 0.8 ? 'warn' : 'hot'),
      'You asked for ' + hrs(state.hours) + '. This bank gives ' + hrs(b.runtimeH) + ' at your typical load.');
    if (pv) {
      meters += meter('Solar share of daily use', pct(pv.coverage), pv.coverage, pv.coverage >= 0.35 ? '' : 'warn',
        'About ' + nd(pv.yieldKWh, 1) + ' kWh a day, ' + n0(pv.monthlyKWh) + ' kWh a month, against the ' + nd(L.dailyWh / 1000, 1) + ' kWh you use.');
    } else {
      meters += '<p class="mc">No panels selected. The grid recharges the battery.</p>';
    }

    var notes = '';
    t.flags.forEach(function (f) {
      var txt = TIER_NOTES[f];
      if (!txt) return;
      if (f === 'pv-capped') {
        txt = txt.replace('{max}', pw(inv.pvMaxW)).replace('{cov}', pct(pv.coverage)).replace('{want}', pct(state.coverage));
      }
      notes += '<li>' + esc(txt) + '</li>';
    });
    if (pv && !inv.pvPublished && pv.count * pv.panel.wp >= 0.75 * inv.pvMaxW) {
      notes += '<li>This array is close to the solar input this inverter can take. We estimate that limit from its charge current, and our engineers confirm it from the datasheet.</li>';
    }

    var r = region();
    var msg = msgFor(t, res);
    var wa = 'https://wa.me/' + r.wa + '?text=' + encodeURIComponent(msg);
    var mail = 'mailto:contact@euronet.co?subject=' + encodeURIComponent('Solar quote request, ' + t.tier.label + ' system') + '&body=' + encodeURIComponent(msg);

    return '<article class="tier' + (pick ? ' pick' : '') + '">' + (pick ? '<span class="badge">Our pick</span>' : '') +
      '<h3>' + esc(t.tier.label) + '</h3><p class="tag">' + esc(t.tier.tag) + '</p><p class="blurb">' + esc(t.tier.blurb) + '</p>' +
      '<ul class="prods">' + prods + '</ul>' +
      '<div class="meters">' + meters + '</div>' +
      (notes ? '<ul class="notes">' + notes + '</ul>' : '') +
      '<div class="cta"><a class="btn btn-wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Get this quote on WhatsApp</a>' +
      '<a class="btn btn-ghost" href="' + esc(mail) + '">Email this system</a></div></article>';
  }

  function engineerBtn(res) {
    var r = region();
    var wa = 'https://wa.me/' + r.wa + '?text=' + encodeURIComponent('Hello EURONET, I need help sizing a solar system. My results ' + shareUrl());
    return '<div class="cta"><a class="btn btn-wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Talk to an engineer on WhatsApp</a></div>';
  }

  function loadCardHtml(res) {
    var L = res.load;
    var total = L.items.reduce(function (t, i) { return t + i.dailyWh; }, 0);
    var top = L.items.slice().sort(function (a, b) { return b.dailyWh - a.dailyWh; }).slice(0, 4);
    var topHtml = top.map(function (i) {
      var share = total ? i.dailyWh / total : 0;
      return '<div class="tu"><span>' + i.qty + ' &times; ' + esc(i.name) + '</span><span class="bar"><i style="width:' + Math.round(share * 100) + '%"></i></span><span class="pc">' + pct(share) + '</span></div>';
    }).join('');
    var tip = L.heavyW > 0.4 * L.connectedW
      ? '<p class="tip">Heavy appliances such as air conditioners, kettles and water heaters are ' + pct(L.heavyW / L.connectedW) + ' of your connected load. Running them in daytime lets solar carry them and keeps the battery for the evening.</p>'
      : '';
    return '<div class="load-card"><div class="load-grid">' +
      '<div class="kpi"><span class="k">Connected load</span><span class="v">' + pw(L.connectedW) + '</span><span class="d">' + L.count + ' appliances</span></div>' +
      '<div class="kpi"><span class="k">Running together</span><span class="v">' + pw(L.runW) + '</span><span class="d">' + pct(L.simult) + ' of the connected load</span></div>' +
      '<div class="kpi"><span class="k">Biggest start</span><span class="v">' + pw(L.peakW) + '</span><span class="d">' + (L.surgeFrom ? 'when the ' + esc(L.surgeFrom.name) + ' starts' : 'no motor loads') + '</span></div>' +
      '<div class="kpi"><span class="k">Daily energy</span><span class="v">' + nd(L.dailyWh / 1000, 1) + ' kWh</span><span class="d">about ' + n0(L.dailyWh / 1000 * 30) + ' kWh a month</span></div>' +
      '</div><div class="top-users"><h3>Where your energy goes</h3>' + topHtml + '</div>' + tip + '</div>';
  }

  function compareHtml(res) {
    var T = res.tiers;
    function cell(t, fn) { return t.unavailable ? '<td class="' + (t.tier.key === 'best' ? 'pickcol' : '') + '">Not available</td>' : '<td class="' + (t.tier.key === 'best' ? 'pickcol' : '') + '">' + fn(t) + '</td>'; }
    var rows = [
      ['Inverter', function (t) { return esc(t.inverter.name); }],
      ['Rating and battery voltage', function (t) { return pw(t.inverter.ratedW) + ' on ' + t.inverter.busV + ' V'; }],
      ['Protection rating', function (t) { return esc(t.inverter.ip); }],
      ['Battery bank', function (t) { return t.battery.units + ' &times; ' + esc(t.battery.model.name); }],
      ['Usable battery energy', function (t) { return kwh(t.battery.usableKWh); }],
      ['Backup at your typical load', function (t) { return hrs(t.battery.runtimeH); }]
    ];
    if (res.opts.solar) {
      rows.push(['Solar panels', function (t) { return t.pv.count + ' &times; ' + t.pv.panel.wp + ' W (' + nd(t.pv.kWp, 2) + ' kWp)'; }]);
      rows.push(['Solar energy a day', function (t) { return kwh(t.pv.yieldKWh); }]);
      rows.push(['Share of your daily use', function (t) { return pct(t.pv.coverage); }]);
      rows.push(['Roof area', function (t) { return 'about ' + n0(t.pv.areaM2) + ' m&sup2;'; }]);
    }
    var head = '<tr><th scope="col"><span class="sr">Item</span></th>' + T.map(function (t) {
      return '<th scope="col" class="' + (t.tier.key === 'best' ? 'pickcol' : '') + '">' + esc(t.tier.label) + '</th>';
    }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr><th scope="row">' + esc(r[0]) + '</th>' + T.map(function (t) { return cell(t, r[1]); }).join('') + '</tr>';
    }).join('');
    return '<section class="compare"><h3>Side by side</h3><div class="tscroll"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></section>';
  }

  function howHtml(res) {
    var L = res.load, o = res.opts;
    var ref = res.tiers.filter(function (t) { return !t.unavailable; });
    var best = ref.filter(function (t) { return t.tier.key === 'best'; })[0] || ref[0];
    var lf = D.TIERS.map(function (t) { return t.label + ' ' + pct(t.loadFactor); }).join(', ');
    var rs = D.TIERS.map(function (t) { return t.label + ' ' + (t.reserve === 1 ? 'none' : '+' + Math.round((t.reserve - 1) * 100) + '%'); }).join(', ');
    var steps = '';
    steps += '<li><b>Your load.</b> The ' + L.count + ' appliances add up to ' + pw(L.connectedW) + ' connected. With ' + pct(L.simult) + ' running together that is ' + pw(L.runW) + '.</li>';
    steps += '<li><b>Motor start.</b> Compressors and pumps pull more for a moment when they start. The largest one here' + (L.surgeFrom ? ' is the ' + esc(L.surgeFrom.name) : '') + ' and adds ' + pw(L.surgeExtraW) + ', so the peak is ' + pw(L.peakW) + '. Only one is assumed to start at a time.</li>';
    steps += '<li><b>Daily energy.</b> Each appliance counts its power, the share of time it really draws that power, and its usual hours a day. Together that is ' + nd(L.dailyWh / 1000, 1) + ' kWh a day.</li>';
    steps += '<li><b>Inverter.</b> We take the smallest unit whose rating carries the running load with room to spare (' + esc(lf) + ' of its rating) and whose surge rating covers the peak. Where a surge rating is not published we require the peak to fit inside the continuous rating.</li>';
    if (best) {
      var b = best.battery;
      steps += '<li><b>Battery.</b> Your typical draw of ' + pw(L.avgW) + ' for ' + hrs(o.backupHours) + ' is ' + kwh(L.avgW * o.backupHours / 1000) + '. For ' + esc(best.tier.label) + ' we divide by ' + pct(A.invEff) + ' inverter efficiency and by ' + pct(best.tier.battery.dod) + ' usable depth' +
        (best.tier.reserve > 1 ? ', then add ' + Math.round((best.tier.reserve - 1) * 100) + '% reserve' : '') + ', which gives ' + kwh(b.needKWh) + ' to install. The bank is the smallest one that reaches it and can also deliver the running power.</li>';
    }
    if (o.solar) {
      steps += '<li><b>Solar.</b> You want solar to cover ' + pct(o.coverage) + ' of ' + nd(L.dailyWh / 1000, 1) + ' kWh. With ' + nd(o.psh, 1) + ' peak sun hours and a ' + pct(A.perfRatio) + ' performance ratio, each kWp makes about ' + nd(o.psh * A.perfRatio, 2) + ' kWh a day. We add a small margin for the upper levels and round up to whole panels, within what the inverter can take.</li>';
    }
    return '<details class="how"><summary>How we worked this out</summary><div class="how-body"><ol>' + steps + '</ol>' +
      '<h4>Assumptions</h4><ul>' +
      '<li>Inverter efficiency from battery to AC is ' + pct(A.invEff) + '.</li>' +
      '<li>Gel batteries are used to 50% depth and lithium to 90% to keep them healthy. Gel therefore needs more nominal energy for the same usable energy.</li>' +
      '<li>Battery reserve by level, ' + esc(rs) + '.</li>' +
      '<li>Panel yield uses a ' + pct(A.perfRatio) + ' performance ratio for heat, dust, wiring and conversion losses.</li>' +
      '<li>Roof area adds ' + Math.round((A.panelSpacing - 1) * 100) + '% on top of the panel area for spacing.</li>' +
      '<li>Battery banks are limited to the parallel count published on the datasheet, or four units where none is published.</li>' +
      '<li>Specifications come from the published EURONET datasheets. Solar input limits marked as estimates come from charge current.</li>' +
      '</ul></div></details>';
  }

  function ctaBandHtml() {
    var r = region();
    var wa = 'https://wa.me/' + r.wa + '?text=' + encodeURIComponent('Hello EURONET, I used the solar load calculator and need help choosing. My results ' + shareUrl());
    return '<section class="cta-band"><div><h3>Want an engineer to check this on site</h3>' +
      '<p>These sizes are a strong starting point. Final design depends on your roof, wiring and local rules. Our ' + esc(r.office) + ' team can confirm the system and the price.</p></div>' +
      '<div class="cta-actions"><a class="btn btn-sun" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp ' + esc(r.office) + '</a>' +
      '<a class="btn btn-ghost" href="tel:' + esc(r.phone.replace(/\s/g, '')) + '">Call ' + esc(r.phone) + '</a>' +
      '<a class="btn btn-ghost" href="https://www.euronetworld.com/contact" target="_blank" rel="noopener">Contact page</a></div></section>';
  }

  function renderResults() {
    var host = $('#results');
    var res = E.sizeAll(state.qty, engineOpts(), D);
    var L = res.load;
    var r = region();
    $('#results-sub').textContent = L.count
      ? n0(L.runW) + ' W running, ' + hrs(state.hours) + ' of backup' + (solarOn() ? ', solar covering ' + pct(state.coverage) + ' of daily use' : ', no solar') + ', in ' + r.label + '.'
      : '';
    if (!L.count) {
      host.innerHTML = '<div class="expert"><h3>Nothing selected yet</h3><p>Add at least one appliance and we will size the system.</p><div class="cta-actions"><button type="button" class="btn btn-primary" data-go="1">Choose appliances</button></div></div>';
      return;
    }
    var html = loadCardHtml(res);
    if (res.expert || res.tiers.every(function (t) { return t.unavailable; })) {
      html += '<div class="expert"><h3>This is a large system</h3><p>Your connected load of ' + pw(L.connectedW) + ' is beyond what we size online. Our engineers design systems like this from a site survey, often with several inverters in parallel.</p><div class="cta-actions">' +
        engineerBtn(res).replace('<div class="cta">', '').replace(/<\/div>$/, '') + '</div></div>';
      host.innerHTML = html;
      return;
    }
    html += '<div class="tiers">' + res.tiers.map(function (t) { return tierCard(t, res); }).join('') + '</div>';
    html += compareHtml(res);
    html += howHtml(res);
    html += ctaBandHtml();
    html += '<div class="share-row"><button type="button" class="btn btn-small btn-ghost" id="copy-link">Copy a link to these results</button>' +
      '<button type="button" class="btn btn-small btn-ghost" id="print">Print or save as PDF</button></div>';
    html += '<p class="fine">This calculator gives indicative sizes for pre-sales guidance. Real output depends on shading, roof angle, cable runs, temperature and how you use the appliances. Prices are confirmed by our sales team.</p>';
    host.innerHTML = html;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go]');
    if (t && !t.disabled) { go(Number(t.dataset.go)); return; }

    var act = e.target.closest('[data-act]');
    if (act && !act.disabled) {
      var id = act.dataset.id;
      var cur = state.qty[id] || 0;
      setQty(id, act.dataset.act === 'inc' ? cur + 1 : cur - 1);
      return;
    }

    var f = e.target.closest('[data-filter]');
    if (f) {
      state.filter = f.dataset.filter;
      $$('#filter button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === f)); });
      renderAppliances();
      return;
    }

    if (e.target.id === 'copy-link') {
      var url = shareUrl();
      var done = function () { e.target.textContent = 'Link copied'; setTimeout(function () { e.target.textContent = 'Copy a link to these results'; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); });
      else window.prompt('Copy this link', url);
      return;
    }
    if (e.target.id === 'print') { window.print(); }
  });

  $('#presets').addEventListener('change', function (e) {
    var p = byId(D.PRESETS, e.target.value);
    if (!p) return;
    state.preset = p.id;
    state.qty = clone(p.qty);
    renderAppliances();
    onLoadChanged();
  });

  $('#search').addEventListener('input', function (e) { state.search = e.target.value; renderAppliances(); });

  $('#region').addEventListener('change', function (e) {
    state.region = e.target.value;
    state.psh = region().psh;
    syncStep2Controls();
    save();
  });
  $('#together').addEventListener('change', function (e) { state.simult = Number(e.target.value); updateHoursHint(); onLoadChanged(); });
  $('#grid').addEventListener('change', function (e) {
    var g = byId(D.GRID_SITUATIONS, e.target.value);
    if (!g) return;
    state.grid = g.id;
    state.hours = g.hours;
    state.coverage = g.coverage;
    if (g.offgrid) state.solar = true;
    syncStep2Controls();
    save();
  });
  $('#hours').addEventListener('input', function (e) {
    state.hours = Number(e.target.value);
    $('#hours-out').textContent = state.hours + ' h';
    updateHoursHint();
  });
  $('#hours').addEventListener('change', save);
  $('#solar').addEventListener('change', function (e) {
    state.solar = e.target.checked;
    syncStep2Controls();
    save();
  });
  $('#coverage').addEventListener('input', function (e) {
    state.coverage = Number(e.target.value) / 100;
    $('#coverage-out').textContent = e.target.value + '%';
  });
  $('#coverage').addEventListener('change', save);
  $('#psh').addEventListener('change', function (e) {
    var v = Number(e.target.value);
    state.psh = isFinite(v) && v > 0 ? clamp(v, 3, 7.5) : region().psh;
    e.target.value = nd(state.psh, 1);
    save();
  });
  $('#show-results').addEventListener('click', function () { go(3); });

  // product photos come from euronetworld.com. If one is missing, drop it quietly.
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && el.closest('.prod')) el.style.visibility = 'hidden';
  }, true);

  /* ---------- start ---------- */
  function init() {
    var shared = null;
    var m = /[#&]s=([^&]+)/.exec(location.hash);
    if (m) shared = decodeShare(m[1]);
    var saved = shared || restore();
    if (saved) { var keep = { filter: 'all', search: '', step: 1 }; state = saved; state.filter = keep.filter; state.search = keep.search; }
    renderPresets();
    renderAppliances();
    onLoadChanged();
    go(shared ? 3 : 1, true);
  }
  init();
})();
