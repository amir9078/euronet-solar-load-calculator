/* Euronet Solar System Finder - interface */
(function () {
  'use strict';

  var D = Object.assign({}, window.EURONET_DATA, window.EURONET_CATALOG);
  var E = window.EuronetEngine;
  var A = D.ASSUMPTIONS;
  var STORE = 'euronet-finder-v2';
  var MAXQ = 30;
  var STOCK = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function byId(list, id) { return E.byId(list, id); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function nd(x, d) { return Number(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }
  function n0(x) { return nd(Math.round(x), 0); }
  function pw(w) { return w >= 1000 ? nd(w / 1000, 1) + ' kW' : n0(w) + ' W'; }
  function kwh(x) { return nd(x, x < 10 ? 1 : 0) + ' kWh'; }
  function hrs(h) { var r = Math.round(h); return (h < 10 ? nd(h, 1) : n0(h)) + (r === 1 ? ' hour' : ' hours'); }
  function pct(x) { return Math.round(x * 100) + '%'; }

  /* ---------- state ---------- */
  function defaults() {
    return { goal: 'backup', preset: 'p2', qty: clone(byId(D.PRESETS, 'p2').qty), region: 'ae', duration: 'short', hours: 3,
      solar: true, coverage: 0.4, psh: 5.5, simult: 0.8, pumpHp: 3, monthlyKWh: 25000, peakKW: 80, bizMode: 'hybrid', view: 0, filter: 'all', search: '' };
  }
  var state = defaults();
  var KEEP = ['goal', 'preset', 'qty', 'region', 'duration', 'hours', 'solar', 'coverage', 'psh', 'simult', 'pumpHp', 'monthlyKWh', 'peakKW', 'bizMode'];

  function sanitize(src) {
    var s = defaults();
    if (!src || typeof src !== 'object') return s;
    if (byId(D.GOALS, src.goal)) s.goal = src.goal;
    if (src.qty && typeof src.qty === 'object') {
      s.qty = {};
      D.APPLIANCES.forEach(function (a) { var n = Math.floor(Number(src.qty[a.id])); if (n > 0) s.qty[a.id] = Math.min(n, MAXQ); });
    }
    s.preset = src.preset === 'custom' || byId(D.PRESETS, src.preset) ? src.preset : 'custom';
    if (byId(D.REGIONS, src.region)) s.region = src.region;
    if (byId(D.DURATIONS, src.duration) || src.duration === 'custom') s.duration = src.duration;
    if (isFinite(+src.hours)) s.hours = clamp(Math.round(+src.hours), 1, 24);
    if (typeof src.solar === 'boolean') s.solar = src.solar;
    if (isFinite(+src.coverage)) s.coverage = clamp(+src.coverage, 0.1, 1);
    if (isFinite(+src.psh)) s.psh = clamp(+src.psh, 3, 7.5);
    if ([0.6, 0.8, 1].indexOf(+src.simult) > -1) s.simult = +src.simult;
    if (D.PUMPS.some(function (p) { return p.hp === +src.pumpHp; })) s.pumpHp = +src.pumpHp;
    if (+src.monthlyKWh > 0) s.monthlyKWh = clamp(Math.round(+src.monthlyKWh), 100, 5000000);
    if (+src.peakKW > 0) s.peakKW = clamp(+src.peakKW, 1, 5000);
    if (['grid', 'hybrid', 'off'].indexOf(src.bizMode) > -1) s.bizMode = src.bizMode;
    return s;
  }
  function keep() { var o = {}; KEEP.forEach(function (k) { o[k] = state[k]; }); return o; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(keep())); } catch (e) { /* blocked storage */ } }
  function restore() { try { var r = localStorage.getItem(STORE); if (r) return sanitize(JSON.parse(r)); } catch (e) { /* ignore */ } return null; }
  function shareUrl() {
    var code = '';
    try { code = btoa(JSON.stringify(keep())).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { /* ignore */ }
    return location.origin + location.pathname + '#s=' + code;
  }
  function decodeShare(str) {
    try { var b = str.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return sanitize(JSON.parse(atob(b))); } catch (e) { return null; }
  }

  function region() { return byId(D.REGIONS, state.region); }
  function pump() { return D.PUMPS.filter(function (p) { return p.hp === state.pumpHp; })[0]; }
  function goal() { return byId(D.GOALS, state.goal); }
  function result() {
    return E.recommend(state.qty, {
      goal: state.goal, region: region().stock, backupHours: state.hours, solar: state.goal === 'off' ? true : state.solar,
      coverage: state.coverage, psh: state.psh, simult: state.simult, pumpKw: pump().kw,
      monthlyKWh: state.monthlyKWh, peakKW: state.peakKW, bizMode: state.bizMode
    }, D, STOCK);
  }

  /* ---------- questions ---------- */
  var ICONS = {
    backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M10 9l-2 3h4l-2 3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/><circle cx="18" cy="4" r="0"/></svg>',
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
    biz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l6 3V10l6 3V6l6 3v12z"/><path d="M7 17h2M12 17h2M17 17h2"/></svg>',
    pump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/></svg>'
  };

  function renderQuestions() {
    $('#goals').innerHTML = D.GOALS.map(function (g) {
      return '<label class="goal"><input type="radio" name="goal" value="' + g.id + '"' + (g.id === state.goal ? ' checked' : '') + '>' +
        '<span class="goal-body">' + ICONS[g.id] + '<strong>' + esc(g.label) + '</strong><span>' + esc(g.hint) + '</span></span></label>';
    }).join('');
    $('#presets').innerHTML = D.PRESETS.filter(function (p) { return p.id !== 'p0'; }).map(function (p) {
      return '<label class="chip"><input type="radio" name="preset" value="' + p.id + '"' + (state.preset === p.id ? ' checked' : '') + '>' +
        '<span class="chip-body"><span class="chip-title">' + esc(p.label) + '</span><span class="chip-hint">' + esc(p.hint) + '</span></span></label>';
    }).join('');
    $('#pumps').innerHTML = D.PUMPS.map(function (p) {
      return '<label class="chip"><input type="radio" name="pump" value="' + p.hp + '"' + (state.pumpHp === p.hp ? ' checked' : '') + '>' +
        '<span class="chip-body"><span class="chip-title">' + p.hp + ' HP</span></span></label>';
    }).join('');
    $('#region').innerHTML = D.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (r.id === state.region ? ' selected' : '') + '>' + esc(r.label) + '</option>'; }).join('');
    $('#durations').innerHTML = D.DURATIONS.map(function (d) {
      return '<label class="chip"><input type="radio" name="duration" value="' + d.id + '"' + (state.duration === d.id ? ' checked' : '') + '>' +
        '<span class="chip-body"><span class="chip-title">' + esc(d.label) + '</span><span class="chip-hint">' + d.hours + ' hours</span></span></label>';
    }).join('');
    $('#together').innerHTML = [[0.6, 'A few things at a time', 'About 60%'], [0.8, 'A typical household', 'About 80%'], [1, 'Almost everything together', '100%']].map(function (o) {
      return '<label class="radio-item"><input type="radio" name="together" value="' + o[0] + '"' + (o[0] === state.simult ? ' checked' : '') + '>' +
        '<span class="ri-body"><strong>' + o[1] + '</strong><span>' + o[2] + '</span></span></label>';
    }).join('');
    renderAppliances();
    syncControls();
  }

  function syncControls() {
    var g = state.goal;
    var biz = g === 'biz';
    $('#q-home').hidden = g === 'pump' || biz;
    $('#q-biz').hidden = !biz;
    $('#monthly').value = state.monthlyKWh; $('#peak').value = state.peakKW;
    $$('input[name="bizmode"]').forEach(function (r) { r.checked = r.value === state.bizMode; });
    $('#q-pump').hidden = g !== 'pump';
    $('#q-duration').hidden = g === 'grid' || g === 'pump' || (biz && state.bizMode === 'grid');
    $('#solar-row').hidden = g !== 'backup';
    $('#solar').checked = state.solar;
    $('#tune-appliances').hidden = g === 'pump' || biz;
    $('#hours-block').hidden = g === 'grid' || g === 'pump' || (biz && state.bizMode === 'grid');
    $('#coverage-block').hidden = g === 'pump' || (g === 'backup' && !state.solar);
    $('#together-block').hidden = g === 'pump' || biz;
    $('#hours').value = state.hours; $('#hours-out').textContent = state.hours + ' h';
    $('#coverage').value = Math.round(state.coverage * 100); $('#coverage-out').textContent = Math.round(state.coverage * 100) + '%';
    $('#psh').value = nd(state.psh, 1);
    var L = E.computeLoad(state.qty, D, state.simult);
    $('#home-hint').textContent = L.count ? L.count + ' appliances, ' + pw(L.connectedW) + ' connected, about ' + nd(L.dailyWh / 1000, 1) + ' kWh a day. Change them under Fine-tune.' : 'Pick a home type or add appliances under Fine-tune.';
  }

  /* ---------- appliance list (fine-tune) ---------- */
  function matchPreset() {
    var cur = state.qty, keys = Object.keys(cur).filter(function (k) { return cur[k] > 0; });
    for (var i = 0; i < D.PRESETS.length; i++) {
      var pk = Object.keys(D.PRESETS[i].qty);
      if (pk.length === keys.length && pk.every(function (k) { return cur[k] === D.PRESETS[i].qty[k]; })) return D.PRESETS[i].id;
    }
    return 'custom';
  }
  function matches(a) {
    if (state.filter === 'heavy' && !a.heavy) return false;
    if (state.filter === 'everyday' && a.heavy) return false;
    var q = state.search.trim().toLowerCase();
    return !q || (a.name + ' ' + a.note + ' ' + a.kw).toLowerCase().indexOf(q) > -1;
  }
  function renderAppliances() {
    var html = '', any = false;
    D.CATEGORIES.forEach(function (c) {
      var items = D.APPLIANCES.filter(function (a) { return a.cat === c.id && matches(a); });
      if (!items.length) return;
      any = true;
      html += '<section class="group"><h3>' + esc(c.label) + '</h3><ul class="rows">' + items.map(function (a) {
        var n = state.qty[a.id] || 0;
        return '<li class="row' + (n ? ' on' : '') + '" data-row="' + a.id + '"><div><span class="nm">' + esc(a.name) + '</span><span class="meta">' + n0(a.w) + ' W</span></div>' +
          '<div class="qty"><button type="button" data-act="dec" data-id="' + a.id + '" aria-label="Fewer ' + esc(a.name) + '"' + (n ? '' : ' disabled') + '>&minus;</button>' +
          '<span class="n" data-n="' + a.id + '">' + n + '</span><button type="button" data-act="inc" data-id="' + a.id + '" aria-label="More ' + esc(a.name) + '"' + (n >= MAXQ ? ' disabled' : '') + '>+</button></div></li>';
      }).join('') + '</ul></section>';
    });
    $('#appliances').innerHTML = html;
    $('#no-match').hidden = any;
  }
  function setQty(id, n) {
    n = clamp(n, 0, MAXQ);
    if (n) state.qty[id] = n; else delete state.qty[id];
    var row = $('[data-row="' + id + '"]');
    if (row) {
      row.classList.toggle('on', n > 0);
      $('[data-n="' + id + '"]', row).textContent = n;
      $('[data-act="dec"]', row).disabled = n === 0;
      $('[data-act="inc"]', row).disabled = n >= MAXQ;
    }
    var m = matchPreset();
    if (m !== state.preset) { state.preset = m; $$('input[name="preset"]').forEach(function (r) { r.checked = r.value === m; }); }
    changed();
  }

  /* ---------- answer ---------- */
  var HUBS = { ae: 'EURONET UAE, Dubai', sa: 'EURONET KSA, Riyadh', ng: 'EURONET Nigeria, Lagos' };
  function qtyAt(id, r) { var it = STOCK && STOCK.items[id]; return it ? it[r] || 0 : 0; }
  // other Euronet companies that hold enough of an item
  function elsewhere(id, need) {
    var here = region().stock;
    return Object.keys(HUBS).filter(function (r) { return r !== here && qtyAt(id, r) >= need; });
  }
  function stockChip(item, need, short) {
    if (!short) return '<span class="chip-stock">In stock</span>';
    var alt = elsewhere(item.id, short);
    if (alt.length) return '<span class="chip-stock part">' + (need - short > 0 ? (need - short) + ' in stock here, ' : 'Not in stock here, ') + short + ' from ' + esc(alt.map(function (r) { return HUBS[r]; }).join(' or ')) + '</span>';
    if (short < need) return '<span class="chip-stock part">' + (need - short) + ' in stock, ' + short + ' to order</span>';
    return '<span class="chip-stock order">To order</span>';
  }

  function partRow(role, item, qtyLine, need, short) {
    return '<li class="prod"><div class="ph"><img src="' + esc(item.img) + '" alt="" loading="lazy" width="76" height="76"></div><div>' +
      '<span class="role">' + esc(role) + '</span><a class="pn" href="' + esc(item.url) + '" target="_blank" rel="noopener">' + esc(item.name) + '</a>' +
      '<p class="pq">' + qtyLine + '</p>' + stockChip(item, need, short) + '</div></li>';
  }

  function short(name) { return name.replace(/ Hybrid Inverter| Off Grid Inverter| Inverter/i, '').replace(/^Hybrid /, '').replace(/ Series/, ''); }

  function diagram(sys, res) {
    var inv = sys.inverter.item, L = res.load;
    var family = { 'Pump Inverter': 'Pump drive', 'PV Inverter': 'Grid inverter' }[inv.series] || inv.series.replace(' Series', '');
    var invLabel = (sys.inverter.units > 1 ? sys.inverter.units + ' x ' : '') + (inv.kind === 'ess' ? 'Storage ' : family + ' ') + pw(inv.ratedW);
    if (sys.extraInverters && sys.extraInverters.length && !sys.acCoupled) invLabel = [sys.inverter].concat(sys.extraInverters).map(function (x) { return x.units + ' x ' + pw(x.item.ratedW); }).join(' + ');
    var end = sys.goal === 'pump' ? ['Pump', state.pumpHp + ' HP motor'] : sys.goal === 'biz' ? ['Your site', pw(L.runW) + ' highest load'] : ['Your home', pw(L.runW) + ' running'];
    function node(x, y, w, t1, t2) {
      return '<g class="node"><rect x="' + (x - w / 2) + '" y="' + (y - 34) + '" width="' + w + '" height="68" rx="12"/>' +
        '<text class="t1" x="' + x + '" y="' + (y - 4) + '" text-anchor="middle">' + esc(t1) + '</text><text class="t2" x="' + x + '" y="' + (y + 20) + '" text-anchor="middle">' + esc(t2) + '</text></g>';
    }
    var hasBat = !!sys.battery, hasGrid = sys.goal === 'backup' || sys.goal === 'grid' || (sys.goal === 'biz' && sys.bizMode !== 'off');
    var left = sys.pv ? [sys.pv.count + ' x ' + sys.pv.panel.wp + ' W', nd(sys.pv.kWp, 2) + ' kWp of panels'] : ['Grid charging', 'no panels'];
    var mid = [invLabel, inv.busV ? inv.busV + ' V battery bus' : (inv.phase === 3 ? 'three-phase' : 'single-phase')];
    var bat = !hasBat ? null : sys.battery.builtIn ? ['Built-in battery', kwh(sys.battery.totalKWh)] : sys.battery.model.chem === 'hv' ? [sys.battery.units + ' x ' + kwh(sys.battery.model.kWh) + ' pack', kwh(sys.battery.totalKWh) + ' at ' + sys.battery.model.v + ' V'] : [sys.battery.units + ' x ' + nd(sys.battery.model.v, 1) + ' V ' + sys.battery.model.ah + ' Ah', kwh(sys.battery.totalKWh) + ' battery'];
    var grid = hasGrid ? ['Grid', (sys.goal === 'grid' || sys.bizMode === 'grid') ? 'tops up and takes extra' : 'charges when it is on'] : null;
    if ($('#answer').clientWidth < 520) {
      // phone: chain runs top to bottom, battery and grid sit beside it
      var v = '<svg viewBox="0 0 360 320" role="img" aria-label="How the parts connect">';
      if (sys.pv) v += '<path class="flow sun" d="M95 76 L95 120"/>';
      v += '<path class="flow" d="M95 188 L95 232"/>';
      if (hasBat) v += '<path class="flow" d="M182 154 L190 154"/>';
      if (hasGrid) v += '<path class="flow grid" d="M190 266 L182 266"/>';
      v += node(95, 42, 172, left[0], left[1]) + node(95, 154, 172, mid[0], mid[1]) + node(95, 266, 172, end[0], end[1]);
      if (bat) v += node(273, 154, 162, bat[0], bat[1]);
      if (grid) v += node(273, 266, 162, grid[0], grid[1]);
      return '<div class="diagram diagram-v">' + v + '</svg></div>';
    }
    var s = '<svg viewBox="0 0 640 ' + (hasBat || hasGrid ? 250 : 108) + '" role="img" aria-label="How the parts connect">';
    if (sys.pv) s += '<path class="flow sun" d="M178 52 L218 52"/>';
    s += '<path class="flow" d="M422 52 L462 52"/>';
    if (hasBat) s += '<path class="flow" d="M320 86 L320 160"/>';
    if (hasGrid) s += '<path class="flow grid" d="M552 160 L552 86"/>';
    if (sys.pv) s += node(92, 52, 172, sys.pv.count + ' x ' + sys.pv.panel.wp + ' W', nd(sys.pv.kWp, 2) + ' kWp of panels');
    else s += node(92, 52, 172, 'Grid charging', 'no panels');
    s += node(320, 52, 196, mid[0], mid[1]);
    s += node(552, 52, 172, end[0], end[1]);
    if (hasBat) s += node(320, 194, 196, bat[0], bat[1]);
    if (hasGrid) s += node(552, 194, 172, 'Grid', (sys.goal === 'grid' || sys.bizMode === 'grid') ? 'tops up and takes extra' : 'charges when it is on');
    return '<div class="diagram">' + s + '</svg></div>';
  }

  function headline(sys, res) {
    var L = res.load;
    if (sys.goal === 'pump') return 'Runs a ' + state.pumpHp + ' HP pump straight from the sun through the day. No battery needed.';
    if (sys.goal === 'biz' && sys.bizMode === 'grid') return 'A ' + nd(sys.pv.kWp, 0) + ' kWp plant making about ' + kwh(sys.pv.yieldKWh) + ' a day, around ' + pct(sys.pv.coverage) + ' of what the site uses.';
    if (sys.goal === 'biz') return 'Carries your ' + pw(L.runW) + ' site for about ' + hrs(sys.battery.runtimeH) + ' on ' + kwh(sys.battery.totalKWh) + ' of storage, with ' + nd(sys.pv.kWp, 0) + ' kWp of solar making about ' + kwh(sys.pv.yieldKWh) + ' a day.';
    if (sys.goal === 'grid') return 'Makes about ' + kwh(sys.pv.yieldKWh) + ' a day, around ' + pct(sys.pv.coverage) + ' of the electricity you use.';
    var t = 'Keeps your ' + pw(L.runW) + ' load going for about ' + hrs(sys.battery.runtimeH) + ' on battery';
    if (sys.pv) t += ', and the panels make about ' + kwh(sys.pv.yieldKWh) + ' a day';
    return t + '.';
  }

  var ALT_NAMES = { lead: 'Lead-acid battery version', outdoor: 'Outdoor IP65 version', lithium: 'Lithium battery version', other: 'Another inverter mix', first: 'Our first choice, to order', 'fam-lv': 'Low-voltage hybrids in parallel', 'fam-hv': 'Ultra Series with high-voltage battery', 'fam-ess': 'All-in-one storage cabinet' };

  function partsHtml(sys) {
    var inv = sys.inverter.item, html = '';
    var invLine = '<b>' + (sys.inverter.units > 1 ? sys.inverter.units + ' units in parallel' : '1 unit') + '</b> &middot; ' + pw(inv.ratedW) + (inv.busV ? ' &middot; ' + inv.busV + ' V battery' : '') + (inv.phase === 3 ? ' &middot; three-phase supply' : '') + ' &middot; ' + esc(inv.ip);
    if (sys.battery && sys.battery.builtIn) invLine += ' &middot; ' + kwh(sys.battery.totalKWh) + ' battery built in';
    html += partRow(inv.kind === 'pump' ? 'Pump drive' : inv.kind === 'ongrid' ? 'Grid-tied inverter' : inv.kind === 'lf' ? 'Backup inverter' : inv.kind === 'ess' ? 'Storage cabinet' : 'Inverter', inv, invLine, sys.inverter.units, sys.inverter.short);
    (sys.extraInverters || []).forEach(function (x) {
      html += partRow(sys.acCoupled ? 'Solar inverter, AC-coupled' : 'Grid-tied inverter', x.item, '<b>' + x.units + ' &times;</b> ' + pw(x.item.ratedW) + (x.item.phase === 3 ? ' &middot; three-phase' : '') + ' &middot; ' + esc(x.item.ip), x.units, x.short);
    });
    if (sys.battery && !sys.battery.builtIn) {
      var b = sys.battery, m = b.model;
      var wiring = m.chem === 'hv' ? (b.units > 1 ? b.units + ' packs in parallel' : 'single pack') + ' on ' + m.v + ' V' : m.chem === 'lfp' ? (b.units > 1 ? b.units + ' in parallel' : 'single unit') : b.parallel + (b.parallel > 1 ? ' strings' : ' string') + ' of ' + b.series + ' for ' + b.busV + ' V';
      html += partRow('Battery', m, '<b>' + b.units + ' &times;</b> ' + wiring + ' &middot; ' + kwh(b.totalKWh) + ' total, ' + kwh(b.usableKWh) + ' usable', b.units, b.short);
    }
    if (sys.pv) html += partRow('Solar panels', sys.pv.panel, '<b>' + sys.pv.count + ' &times; ' + sys.pv.panel.wp + ' W</b> &middot; ' + nd(sys.pv.kWp, 2) + ' kWp &middot; about ' + n0(sys.pv.areaM2) + ' m&sup2; of roof', sys.pv.count, sys.pv.short);
    return '<ul class="parts">' + html + '</ul>' + fillHtml(sys);
  }

  // what stock can stand in for the panels we are short of
  function fillHtml(sys) {
    var f = sys.pv && sys.pv.fill;
    if (!f) return '';
    var main = sys.pv.panel, rows = [];
    if (f.readyNow) {
      var add = f.readyNow.mix[1];
      rows.push('<li class="fill-best"><strong>Ready now.</strong> Fit the ' + f.inStock + ' &times; ' + main.wp + ' W on the first solar input and ' + add.count + ' &times; ' +
        '<a href="' + esc(add.panel.url) + '" target="_blank" rel="noopener">' + esc(add.panel.name) + '</a> on the second. ' + nd(f.readyNow.kWp, 2) + ' kWp in total, covering ' +
        pct(f.readyNow.coverage) + (sys.pv.target ? ' of your day instead of ' + pct(sys.pv.coverage) : '') + '. All in stock.</li>');
    }
    if (f.swap) {
      rows.push('<li><strong>Or one model throughout.</strong> ' + f.swap.count + ' &times; <a href="' + esc(f.swap.panel.url) + '" target="_blank" rel="noopener">' + esc(f.swap.panel.name) + '</a>, ' + nd(f.swap.kWp, 2) + ' kWp, all in stock.</li>');
    }
    if (!f.readyNow && f.inputs < 2 && !f.swap) {
      rows.push('<li>This inverter has one solar input, so a second panel model cannot be added to the same string.</li>');
    }
    var others = f.options.filter(function (o) { return !f.readyNow || o.panel.id !== f.readyNow.mix[1].panel.id; });
    if (others.length) {
      rows.push('<li>Other panels in stock ' + others.map(function (o) { return o.avail + ' &times; ' + o.panel.wp + ' W'; }).join(', ') + '. Too few of each to make a string on their own.</li>');
    }
    var hubs = elsewhere(main.id, f.short);
    if (hubs.length) rows.push('<li><strong>Or ship them in.</strong> ' + f.short + ' &times; ' + main.wp + ' W are in stock at ' + esc(hubs.map(function (r) { return HUBS[r]; }).join(' and ')) + '.</li>');
    rows.push('<li>Or keep the design and wait for ' + f.short + ' &times; ' + main.wp + ' W from the next shipment.</li>');
    return '<div class="fill"><p class="fill-title">For the ' + f.short + ' panels we are short of</p><ul>' + rows.join('') + '</ul></div>';
  }

  function statsHtml(sys, res) {
    var t = [];
    if (sys.battery) t.push(['Backup', hrs(sys.battery.runtimeH)]);
    if (sys.pv) t.push(['Solar a day', kwh(sys.pv.yieldKWh)]);
    if (sys.goal !== 'pump' && sys.goal !== 'grid' && sys.loadPct) t.push(['Inverter load', pct(sys.loadPct)]);
    if (sys.goal === 'biz' && sys.bizMode === 'grid') { t.push(['Plant size', nd(sys.pv.kWp, 0) + ' kWp']); t.push(['Share of use', pct(sys.pv.coverage)]); }
    if (sys.goal === 'grid') { t.push(['Share of use', pct(sys.pv.coverage)]); t.push(['A month', kwh(sys.pv.monthlyKWh)]); }
    if (sys.goal === 'pump') { t.push(['Drive size', pw(sys.inverter.item.ratedW)]); t.push(['Roof or ground', n0(sys.pv.areaM2) + ' m²']); }
    return '<div class="stats">' + t.slice(0, 3).map(function (x) { return '<div class="stat-tile"><span class="k">' + x[0] + '</span><span class="v">' + x[1] + '</span></div>'; }).join('') + '</div>';
  }

  function kitHtml(sys) {
    if (!sys.kit.length) return '';
    return '<details class="kit"><summary>Fitting kit, ' + sys.kit.length + ' items' + (sys.kitShort.length ? ', ' + sys.kitShort.length + ' to order' : ', all in stock') + '</summary><ul class="kit-list">' +
      sys.kit.map(function (k) {
        return '<li><span class="kq">' + k.qty + ' &times;</span><span>' + esc(k.item.name) + '<span class="why">' + esc(k.why) + '</span></span>' + stockChip(k.item, k.qty, k.short) + '</li>';
      }).join('') + '</ul><p class="hint" style="padding:0 14px 12px">Typical quantities. Your installer confirms cable runs and string layout on site.</p></details>';
  }

  function notesHtml(sys, res) {
    var n = [];
    var shortIds = [];
    if (sys.inverter.short) shortIds.push([sys.inverter.item.id, sys.inverter.units]);
    (sys.extraInverters || []).forEach(function (x) { if (x.short) shortIds.push([x.item.id, x.units]); });
    if (sys.battery && sys.battery.short) shortIds.push([sys.battery.model.id, sys.battery.units]);
    if (sys.pv && sys.pv.short) shortIds.push([sys.pv.panel.id, sys.pv.count]);
    if (shortIds.length) {
      var hub = Object.keys(HUBS).filter(function (r) { return r !== region().stock && shortIds.every(function (x) { return qtyAt(x[0], r) >= x[1]; }); })[0];
      if (hub) n.unshift('Everything missing here is in stock at ' + HUBS[hub] + '. We can ship it from there.');
    }
    if (!res.fromStock) n.push('Nothing in stock in ' + region().label + ' fits this exactly, so this system uses items we would order for you.');
    if (sys.tight) n.push('The inverter runs close to its limit. Moving a heavy appliance off the battery gives it more room.');
    if (sys.pv && sys.pv.capped) n.push('The inverter takes about ' + pw(sys.inverter.item.pvMaxW * sys.inverter.units) + ' of panels at most, so solar covers ' + pct(sys.pv.coverage) + ' instead of ' + pct(state.coverage) + '.');
    if (sys.goal === 'grid') n.push('Grid-tied inverters switch off in a power cut for safety. Choose Power backup if you need power during cuts.');
    if (sys.inverter.item.phase === 3) n.push('This inverter needs a three-phase supply.');
    if (sys.goal === 'pump') n.push('Match the drive to the pump motor phase. Panels are sized at ' + nd(A.pumpArrayRatio, 1) + ' times the motor power so the pump keeps running in weaker sun.');
    if (sys.inverter.item.pvPublished === false && sys.pv && sys.pv.count * sys.pv.panel.wp >= 0.75 * sys.inverter.item.pvMaxW * sys.inverter.units) n.push('The solar input limit for this inverter is our estimate from its charge current. Our engineers confirm it from the datasheet.');
    return n.length ? '<ul class="notes">' + n.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
  }

  function message(sys, res) {
    var r = region(), L = res.load, lines = ['Hello EURONET, I used the solar system finder and would like a quote.', ''];
    lines.push('Goal ' + goal().label + (sys.goal === 'pump' ? ', ' + state.pumpHp + ' HP pump' : ''));
    lines.push((sys.inverter.units > 1 ? sys.inverter.units + ' x ' : '1 x ') + sys.inverter.item.name);
    (sys.extraInverters || []).forEach(function (x) { lines.push(x.units + ' x ' + x.item.name); });
    if (sys.goal === 'biz') lines.push('Site ' + n0(state.peakKW) + ' kW highest load, ' + n0(state.monthlyKWh) + ' kWh a month');
    if (sys.battery && !sys.battery.builtIn) lines.push(sys.battery.units + ' x ' + sys.battery.model.name + ' (' + kwh(sys.battery.totalKWh) + ')');
    if (sys.pv) lines.push(sys.pv.count + ' x ' + sys.pv.panel.name + ' (' + nd(sys.pv.kWp, 2) + ' kWp)');
    if (sys.pv && sys.pv.fill) lines.push('(' + sys.pv.fill.inStock + ' in stock' + (sys.pv.fill.readyNow ? ', ready-now option adds ' + sys.pv.fill.readyNow.mix[1].count + ' x ' + sys.pv.fill.readyNow.mix[1].panel.name + ' on the second solar input' : '') + ')');
    sys.kit.forEach(function (k) { lines.push(k.qty + ' x ' + k.item.name); });
    if (sys.goal !== 'pump' && sys.goal !== 'biz') lines.push('', 'Load ' + n0(L.connectedW) + ' W connected, about ' + nd(L.dailyWh / 1000, 1) + ' kWh a day' + (sys.battery ? ', backup ' + hrs(state.hours) : '') + '.');
    lines.push('Country ' + r.label + '.', '', 'My results ' + shareUrl());
    return lines.join('\n');
  }

  function howHtml(sys, res) {
    var L = res.load, s = [];
    if (sys.goal !== 'pump') s.push('Your appliances add up to ' + pw(L.connectedW) + '. With ' + pct(L.simult) + ' running together that is ' + pw(L.runW) + ', and the biggest motor start takes it to ' + pw(L.peakW) + ' for a moment. In a day they use about ' + kwh(L.dailyWh / 1000) + '.');
    if (sys.battery) {
      s.push('The inverter must carry the running load with room to spare and survive the start. Where a surge rating is published we use it, otherwise the start has to fit inside the rating.');
      var depthTxt = pct(sys.battery.model.dod || 0.9) + ' usable depth, plus 15% reserve';
      if (sys.battery.builtIn) s.push('The cabinets hold ' + pw(L.avgW) + ' for ' + hrs(state.hours) + ', after ' + pct(A.invEff) + ' conversion efficiency and ' + depthTxt + '. Each cabinet has its own converter, so power and storage grow together.');
      else s.push('The battery holds ' + pw(L.avgW) + ' for ' + hrs(state.hours) + ', after ' + pct(A.invEff) + ' inverter efficiency and ' + depthTxt + '. It sits on the inverter\'s own ' + sys.battery.busV + ' V and can deliver the running power.');
      if (sys.goal === 'biz') s.push('For a site we take ' + pct(A.bizAvgShare) + ' of the highest load as the average during a cut, and allow ' + pct(A.bizStartAllowance - 1) + ' on top for motors starting.');
    }
    if (sys.pv && sys.goal !== 'pump') s.push('Each kWp of panels makes about ' + nd(state.psh * A.perfRatio, 2) + ' kWh a day here, from ' + nd(state.psh, 1) + ' peak sun hours and a ' + pct(A.perfRatio) + ' performance ratio.');
    s.push('We build every combination the stock in ' + region().label + ' allows, keep the ones that do the job, and rank them on fit, lithium life, how much stock backs each part and how few parts it needs. Stock checked ' + stockDate() + '.');
    return '<details class="how"><summary>How we picked this</summary><div class="how-body"><ol>' + s.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div></details>';
  }

  function stockDate() {
    var d = STOCK && STOCK.generatedAt ? new Date(STOCK.generatedAt) : null;
    return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'recently';
  }

  var current = null;
  function renderAnswer() {
    var host = $('#answer-body');
    if (!STOCK) return;
    var res = result();
    current = res;
    var r = region();
    if (!res.best) {
      var why = res.expert ? 'This is bigger than we size online. Our engineers design systems like this from a site survey.' : 'Pick a home type or add appliances and the system appears here.';
      host.innerHTML = '<div class="answer-card"><p class="headline">' + esc(why) + '</p><div class="answer-cta"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/' + r.wa + '?text=' + encodeURIComponent('Hello EURONET, I need help sizing a solar system. ' + shareUrl()) + '">Talk to an engineer on WhatsApp</a></div></div>';
      $('#jump-text').textContent = 'Your system';
      return;
    }
    var opts = [res.best].concat(res.alternatives);
    if (state.view >= opts.length) state.view = 0;
    var sys = opts[state.view];
    var stockCls = sys.ready ? '' : (res.fromStock ? ' part' : ' order');
    var stockTxt = sys.ready ? 'Ready now from ' + r.office + ' stock' : (res.fromStock ? 'Mostly in ' + r.office + ' stock, panels to top up' : 'To order for ' + r.label);
    var wa = 'https://wa.me/' + r.wa + '?text=' + encodeURIComponent(message(sys, res));
    var mail = 'mailto:contact@euronet.co?subject=' + encodeURIComponent('Solar quote request') + '&body=' + encodeURIComponent(message(sys, res));

    var alts = opts.map(function (o, i) {
      if (i === state.view) return '';
      var label = i === 0 ? 'Our best match' : ALT_NAMES[o.label] || 'Another option';
      var desc = (o.inverter.units > 1 ? o.inverter.units + ' x ' : '') + o.inverter.item.name + (o.battery ? ' with ' + o.battery.units + ' x ' + o.battery.model.name : '') + (o.battery ? ', ' + hrs(o.battery.runtimeH) + ' backup' : '');
      return '<div class="alt"><div class="ph"><img src="' + esc(o.inverter.item.img) + '" alt="" loading="lazy"></div><div><strong>' + esc(label) + '</strong><p>' + esc(desc) + '. ' + (o.ready ? 'In stock.' : 'Part to order.') + '</p>' +
        '<button type="button" class="btn btn-small btn-ghost" data-view="' + i + '">Show this one</button></div></div>';
    }).join('');

    host.innerHTML = '<div class="answer-card">' +
      '<span class="stockline' + stockCls + '"><i></i>' + esc(stockTxt) + '</span>' +
      '<p class="answer-tag">' + (state.view === 0 ? 'Best match' : esc(ALT_NAMES[sys.label] || 'Option')) + '</p>' +
      '<p class="headline">' + esc(headline(sys, res)) + '</p>' +
      diagram(sys, res) + statsHtml(sys, res) + partsHtml(sys) + kitHtml(sys) + notesHtml(sys, res) +
      '<div class="answer-cta"><a class="btn btn-wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Get this quote on WhatsApp</a><a class="btn btn-ghost" href="' + esc(mail) + '">Email this system</a></div>' +
      (alts ? '<div class="alts"><h3>Other ways from stock</h3>' + alts + '</div>' : '') +
      howHtml(sys, res) +
      '<div class="share-row"><button type="button" class="btn btn-small btn-ghost" id="copy-link">Copy a link to this</button><button type="button" class="btn btn-small btn-ghost" id="print">Print or save as PDF</button></div>' +
      '<p class="fine">Indicative sizing for a quote. Shade, roof angle, cable runs and how you use your appliances change real output. Prices come from our sales team.</p>' +
      '</div>';
    $('#jump-text').textContent = short(sys.inverter.item.name) + (sys.battery ? ' + ' + kwh(sys.battery.totalKWh) : '') + (sys.pv ? ' + ' + sys.pv.count + ' panels' : '');
  }

  var timer = null;
  function changed() {
    save();
    syncControls();
    clearTimeout(timer);
    timer = setTimeout(function () { state.view = 0; renderAnswer(); }, 60);
  }

  /* ---------- events ---------- */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'goal') {
      state.goal = t.value;
      if (state.goal === 'off') { state.duration = 'night'; state.hours = 14; state.coverage = 1; }
      else if (state.goal === 'grid') state.coverage = 0.7;
      else if (state.goal === 'biz') state.coverage = state.bizMode === 'off' ? 1 : 0.6;
      else if (state.goal === 'backup') { var d = byId(D.DURATIONS, state.duration) || D.DURATIONS[0]; state.coverage = d.coverage; state.hours = d.hours; }
      $$('input[name="duration"]').forEach(function (r) { r.checked = r.value === state.duration; });
      changed();
    } else if (t.name === 'preset') {
      state.preset = t.value; state.qty = clone(byId(D.PRESETS, t.value).qty); renderAppliances(); changed();
    } else if (t.name === 'pump') { state.pumpHp = +t.value; changed(); }
    else if (t.name === 'bizmode') { state.bizMode = t.value; state.coverage = t.value === 'off' ? 1 : 0.6; if (t.value === 'off') { state.hours = 14; state.duration = 'night'; } changed(); }
    else if (t.id === 'monthly') { state.monthlyKWh = clamp(Math.round(+t.value || 0), 100, 5000000); changed(); }
    else if (t.id === 'peak') { state.peakKW = clamp(+t.value || 0, 1, 5000); changed(); }
    else if (t.name === 'duration') {
      var du = byId(D.DURATIONS, t.value); state.duration = du.id; state.hours = du.hours; state.coverage = state.goal === 'grid' ? state.coverage : du.coverage; changed();
    } else if (t.name === 'together') { state.simult = +t.value; changed(); }
    else if (t.id === 'region') { state.region = t.value; state.psh = region().psh; changed(); }
    else if (t.id === 'solar') { state.solar = t.checked; changed(); }
    else if (t.id === 'hours') { state.duration = 'custom'; $$('input[name="duration"]').forEach(function (r) { r.checked = false; }); changed(); }
    else if (t.id === 'coverage') changed();
    else if (t.id === 'psh') { var v = +t.value; state.psh = isFinite(v) && v > 0 ? clamp(v, 3, 7.5) : region().psh; changed(); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'hours') { state.hours = +t.value; $('#hours-out').textContent = state.hours + ' h'; }
    if (t.id === 'coverage') { state.coverage = +t.value / 100; $('#coverage-out').textContent = t.value + '%'; }
    if (t.id === 'search') { state.search = t.value; renderAppliances(); }
  });
  document.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (act && !act.disabled) { var id = act.dataset.id; setQty(id, (state.qty[id] || 0) + (act.dataset.act === 'inc' ? 1 : -1)); return; }
    var f = e.target.closest('[data-filter]');
    if (f) { state.filter = f.dataset.filter; $$('#filter button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === f)); }); renderAppliances(); return; }
    var v = e.target.closest('[data-view]');
    if (v) { state.view = +v.dataset.view; renderAnswer(); $('#answer').scrollIntoView({ block: 'start' }); return; }
    if (e.target.id === 'copy-link') {
      var url = shareUrl(), btn = e.target;
      var done = function () { btn.textContent = 'Link copied'; setTimeout(function () { btn.textContent = 'Copy a link to this'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); });
      else window.prompt('Copy this link', url);
    }
    if (e.target.id === 'print') window.print();
  });
  var narrow = null;
  window.addEventListener('resize', function () {
    var now = $('#answer').clientWidth < 520;
    if (narrow !== null && now !== narrow) renderAnswer();
    narrow = now;
  });
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);

  /* ---------- start ---------- */
  var m = /[#&]s=([^&]+)/.exec(location.hash);
  var saved = (m && decodeShare(m[1])) || restore();
  if (saved) { state = saved; state.filter = 'all'; state.search = ''; state.view = 0; }
  renderQuestions();
  fetch('data/stock.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (s) { STOCK = s; renderAnswer(); }).catch(function () {
    STOCK = { items: {} };
    renderAnswer();
  });
})();
