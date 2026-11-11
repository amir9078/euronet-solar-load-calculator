/*
 * Euronet Solar Load Calculator - product catalogue
 *
 * Figures come from the published EURONET product records and datasheets on euronetworld.com.
 * pvPublished false means the solar input limit is derived (charge current x charge voltage,
 * or 1.5 x rating when no charge current is published), not printed on a datasheet.
 * match = patterns for the Odoo product names, used only by scripts/build-stock.mjs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EURONET_CATALOG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var SITE = 'https://www.euronetworld.com';
  var MEDIA = 'https://heahnqdtjwoqfbbfwvrn.storage.supabase.co/storage/v1/object/public/media/';
  function media(f) { return MEDIA + encodeURI(f); }
  var INV = SITE + '/products/solar-energy/solar-inverters/';
  var BAT = SITE + '/products/solar-energy/batteries/';
  var PAN = SITE + '/products/solar-energy/solar-panels/';
  var ACC = SITE + '/products/power-electrical/dc-accessories';

  function vc(busV) { return busV * 1.2; } // charge voltage used for derived solar limits
  function approxPv(ratedW, busV, chargeA) {
    var byRating = 1.5 * ratedW;
    return Math.round(chargeA ? Math.min(chargeA * vc(busV), byRating) : byRating);
  }

  /* kind  hybrid   battery inverter with built-in MPPT, works with or without grid
   *       offgrid  battery inverter with MPPT, grid used only as a charger
   *       lf       low-frequency transformer inverter for backup, solar only by optional PWM
   *       ongrid   grid-tied solar inverter, no battery
   *       pump     solar pump drive, no battery
   */
  var INVERTERS = [
    // A series off-grid
    { id: 'a10', kind: 'offgrid', series: 'A Series', name: 'A 12V 1.0kW Off Grid Inverter', ratedW: 1000, busV: 12, chargeA: 40, mppt: '20-150 V DC', ip: 'IP21', path: 'a-12v-10kw-off-grid-inverter-ip21', img: 'A Series 1k-1-768x1024.webp', match: ['^GEN 5 A 12V 1\\.0KW'], points: ['Inverter, MPPT solar charger and AC charger in one box', 'Pure sine wave 230 V'] },
    { id: 'a22', kind: 'offgrid', series: 'A Series', name: 'A 12V 2.2kW Off Grid Inverter', ratedW: 2200, busV: 12, chargeA: 80, mppt: '55-450 V DC', ip: 'IP21', path: 'a-12v-22kw-off-grid-inverter-ip21', img: 'A Series 2-768x1024.webp', match: ['^GEN 5 A 12V 2\\.2KW'], points: ['Inverter, MPPT solar charger and AC charger in one box', 'Solar charging up to 80 A'] },
    { id: 'a32', kind: 'offgrid', series: 'A Series', name: 'A 24V 3.2kW Off Grid Inverter', ratedW: 3200, busV: 24, chargeA: 80, mppt: '55-450 V DC', ip: 'IP21', path: 'a-24v-32kw-off-grid-inverter-ip21', img: 'A Series 3-768x1024.webp', match: ['^GEN 5 A 24V 3\\.2KW'], points: ['Inverter, MPPT solar charger and AC charger in one box', 'Solar charging up to 80 A'] },
    // Shark
    { id: 'shark32', kind: 'hybrid', series: 'Shark Series', name: 'Shark Series Hybrid Inverter 3.2kW 24V', ratedW: 3000, busV: 24, surgeW: 6000, chargeA: 100, mppt: 'up to 450 V DC open circuit', ip: 'IP21', path: 'shark-series-hybrid-inverter-32kw-24v', img: 'Shark Series Hybrid Inverter 3.2KW 24V.webp', match: ['^SHARK SERIES HYBRID INVERTER 3\\.2KW'], points: ['Surge power 6,000 VA for motor starts', 'Solar charging up to 100 A', 'Pure sine wave'] },
    // Onyx
    { id: 'onyx42', kind: 'hybrid', series: 'Onyx Series', name: 'Onyx Series Hybrid Inverter 4.2kW 24V', ratedW: 4200, busV: 24, chargeA: 110, mppt: 'built-in MPPT', ip: 'IP21', path: 'onyx-series-hybrid-inverter-42kw-24v', img: '24VDC 4200W-768x1024.webp', match: ['^ONYX SERIES HYBRID INVERTER 4\\.2KW'], points: ['Built-in MPPT, solar charging up to 110 A', 'Battery, solar and grid or generator charging'] },
    { id: 'onyx62', kind: 'hybrid', series: 'Onyx Series', name: 'Onyx Series Hybrid Inverter 6.2kW 48V', ratedW: 6200, busV: 48, chargeA: 110, mppt: 'built-in MPPT', ip: 'IP21', path: 'onyx-series-hybrid-inverter-62kw-48v', img: '48VDC 6200W-768x1024.webp', match: ['^ONYX SERIES HYBRID INVERTER 6\\.2KW'], points: ['Built-in MPPT, solar charging up to 110 A', 'Battery, solar and grid or generator charging'] },
    { id: 'onyx102', kind: 'hybrid', series: 'Onyx Series', name: 'Onyx Series Hybrid Inverter 10.2kW 48V', ratedW: 10200, busV: 48, chargeA: 160, mppt: 'built-in MPPT', ip: 'IP21', path: 'onyx-series-hybrid-inverter-102kw-48v', img: '60VDC 10200W-768x1024.webp', match: ['^ONYX SERIES HYBRID INVERTER 10\\.2KW'], points: ['Built-in MPPT, solar charging up to 160 A', 'Battery, solar and grid or generator charging'] },
    // RS and S
    { id: 'rs42', kind: 'hybrid', series: 'RS Series', name: 'RS 24V 4.2kW Hybrid Inverter', ratedW: 4200, busV: 24, chargeA: 120, mppt: '60-450 V DC', ip: 'IP21', path: 'rs-24v-42kw-hybrid-inverter-ip21', img: 'RS SERIES 4.2.webp', match: ['^GEN 5 RS 24V 4\\.2KW'], points: ['Two AC load outputs', 'Runs from solar alone when the battery is empty'] },
    { id: 'rs62', kind: 'hybrid', series: 'RS Series', name: 'RS 48V 6.2kW Hybrid Inverter', ratedW: 6200, busV: 48, chargeA: 120, mppt: '60-450 V DC', ip: 'IP21', path: 'rs-48v-62kw-hybrid-inverter-ip21', img: 'RS SERIES 6.2.webp', match: ['^GEN 5 RS 48V 6\\.2KW'], points: ['Two AC load outputs', 'Runs from solar alone when the battery is empty'] },
    { id: 's42', kind: 'hybrid', series: 'S Series', name: 'S 24V 4.2kW Hybrid Inverter', ratedW: 4200, busV: 24, chargeA: 120, pvMaxW: 6200, pvPublished: true, mppt: '60-450 V DC', ip: 'IP21', path: 's-24v-42kw-hybrid-inverter-ip21', img: 'S SERIES 4.2-768x1024.webp', match: ['^GEN 5 S 24V 4\\.2KW'], points: ['Two AC outputs, critical and general loads apart', 'Up to 98% efficiency, Wi-Fi and lithium BMS link'] },
    { id: 's62', kind: 'hybrid', series: 'S Series', name: 'S 48V 6.2kW Hybrid Inverter', ratedW: 6200, busV: 48, chargeA: 120, mppt: '60-450 V DC', ip: 'IP21', path: 's-48v-62kw-hybrid-inverter-ip21', img: 'S SERIES 6.2-768x1024.webp', match: ['^GEN 5 S 48V 6\\.2KW'], points: ['Two AC outputs, critical and general loads apart', 'Up to 98% efficiency, Wi-Fi and lithium BMS link'] },
    { id: 's102', kind: 'hybrid', series: 'S Series', name: 'S 48V 10.2kW Hybrid Inverter', ratedW: 10200, busV: 48, chargeA: 160, pvMaxW: 10800, pvPublished: true, trackers: 2, mppt: '90-450 V DC, dual MPPT', ip: 'IP21', path: 's-48v-102kw-hybrid-inverter-ip21', img: 'S SERIES 10.2-768x1024.webp', match: ['^GEN 5 S 48V 10\\.2KW'], points: ['Dual MPPT, 5.4 kW on each input', 'Up to 98% efficiency, Wi-Fi and lithium BMS link'] },
    // RSZ
    { id: 'rsz65', kind: 'hybrid', series: 'RSZ Series', name: 'RSZ 48V 6.5kW Hybrid Inverter', ratedW: 6500, busV: 48, surgeW: 13000, chargeA: 140, pvMaxW: 10000, pvPublished: true, parallelMax: 9, trackers: 2, mppt: '120-480 V DC, dual MPPT', ip: 'IP20', path: 'rsz-48v-65kw-hybrid-inverter-ip21', img: 'RSZ SERIES 6.5-768x1024.webp', match: ['^GEN 5 RSZ 48V 6\\.5KW'], points: ['Surge power 13,000 VA for ACs and pumps', 'Up to 10 kW of solar, parallel up to 9 units'] },
    { id: 'rsz12', kind: 'hybrid', series: 'RSZ Series', name: 'RSZ 48V 12kW Hybrid Inverter', ratedW: 12000, busV: 48, surgeW: 18000, chargeA: 230, pvMaxW: 14500, pvPublished: true, parallelMax: 9, trackers: 2, mppt: '120-480 V DC, dual MPPT', ip: 'IP20', path: 'rsz-48v-12kw-hybrid-inverter-ip21', img: 'RSZ SERIES 12-768x1024.webp', match: ['^GEN 5 RSZ 48V 12KW'], points: ['Surge power 18,000 VA for ACs and pumps', 'Up to 14.5 kW of solar, parallel up to 9 units'] },
    // Pro IP65
    { id: 'pro3', kind: 'hybrid', series: 'Pro IP65', name: 'Hybrid Inverter 3kW Pro IP65', ratedW: 3000, busV: 24, chargeA: 100, mppt: '60-450 V DC', ip: 'IP65', path: 'hybrid-inverter-3kw-pro-ip65', img: 'Hybrid Inverter 3KW-6KW Pro IP65-768x1024.webp', match: ['^GEN 5 PRO HYBRID INVERTER 3KW'], points: ['IP65, mounts outdoors', 'Wi-Fi monitoring and app built in'] },
    { id: 'pro6', kind: 'hybrid', series: 'Pro IP65', name: 'Hybrid Inverter 6kW Pro IP65', ratedW: 6000, busV: 48, mppt: '50-500 V DC, 2 MPPT', trackers: 2, ip: 'IP65', path: 'hybrid-inverter-6kw-pro-ip65', img: 'Hybrid Inverter 3KW-6KW Pro IP65-768x1024.webp', match: ['^GEN 5 PRO HYBRID INVERTER 6KW'], points: ['IP65, mounts outdoors', 'Two MPPT inputs, Wi-Fi app built in'] },
    { id: 'pro10', kind: 'hybrid', series: 'Pro IP65', name: 'Hybrid Inverter 10kW Pro IP65', ratedW: 10000, busV: 48, chargeA: 220, parallelMax: 6, trackers: 2, mppt: '50-450 V DC, 2 MPPT', ip: 'IP65', path: 'hybrid-inverter-10kw-pro-ip65', img: 'Hybrid Inverter 10KW-16KW Pro IP65-1.webp', match: ['^GEN 5 PRO HYBRID INVERTER 10KW'], points: ['IP65, mounts outdoors', 'Parallel up to 6 units'] },
    { id: 'pro16', kind: 'hybrid', series: 'Pro IP65', name: 'Hybrid Inverter 16kW Pro IP65', ratedW: 16000, busV: 48, chargeA: 250, parallelMax: 6, trackers: 3, mppt: '50-450 V DC, 3 MPPT', ip: 'IP65', path: 'hybrid-inverter-16kw-pro-ip65', img: 'Hybrid Inverter 10KW-16KW Pro IP65-1.webp', match: ['^GEN 5 PRO HYBRID INVERTER 16KW'], points: ['IP65, mounts outdoors', 'Three MPPT inputs, parallel up to 6 units'] },
    // LF backup inverters (datasheet, peak load ratio 3 to 1, solar only by optional PWM)
    { id: 'lf900', kind: 'lf', series: 'LF Series', name: 'LF Inverter 900VA 12V', ratedW: 640, busV: 12, surgeX: 3, ip: 'IP21', path: 'lf-inverter-900va-12v', img: 'LF Inverter 900VA 12V.webp', match: ['^LF (HYBRID )?INVERTER 900VA'], points: ['Toroidal transformer, takes 3 times its rating for motor starts', 'Pure sine wave, about 10 ms changeover'] },
    { id: 'lf1100', kind: 'lf', series: 'LF Series', name: 'LF Hybrid Inverter 1100VA 12V', ratedW: 800, busV: 12, surgeX: 3, ip: 'IP21', path: null, img: 'LF Hybrid Inverter 1250VA 12V.webp', match: ['^LF (HYBRID )?INVERTER 1100VA'], points: ['Toroidal transformer, takes 3 times its rating for motor starts', 'Pure sine wave, about 10 ms changeover'] },
    { id: 'lf1250', kind: 'lf', series: 'LF Series', name: 'LF Hybrid Inverter 1250VA 12V', ratedW: 1000, busV: 12, surgeX: 3, ip: 'IP21', path: 'lf-hybrid-inverter-1250va-12v', img: 'LF Hybrid Inverter 1250VA 12V.webp', match: ['^LF HYBRID INVERTER 1250VA'], points: ['Toroidal transformer, takes 3 times its rating for motor starts', 'Pure sine wave, about 10 ms changeover'] },
    { id: 'lf2000', kind: 'lf', series: 'LF Series', name: 'LF Hybrid Inverter 2000VA 24V', ratedW: 1600, busV: 24, surgeX: 3, ip: 'IP21', path: 'lf-hybrid-inverter-2050va-24v', img: 'LF Hybrid Inverter 2050VA 24V.webp', match: ['^LF HYBRID INVERTER 2050VA'], points: ['Toroidal transformer, takes 3 times its rating for motor starts', 'Pure sine wave, about 10 ms changeover'] },
    { id: 'lf3500', kind: 'lf', series: 'LF Series', name: 'LF Hybrid Inverter 3500VA 24V', ratedW: 2400, busV: 24, surgeX: 3, ip: 'IP21', path: 'lf-hybrid-inverter-3500va-24v', img: 'LF Hybrid Inverter 3500VA 24V.webp', match: ['^LF HYBRID INVERTER 3500VA'], points: ['Toroidal transformer, takes 3 times its rating for motor starts', 'Pure sine wave, about 10 ms changeover'] },
    // Grid-tied
    { id: 'pv5', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 5kW', ratedW: 5000, phase: 1, trackers: 2, ip: 'IP65', path: 'pv-inverter-5kw', img: 'PV Inverter 5k.webp', match: ['^PV INVERTER 5KW$'], points: ['Single-phase 230 V, 2 MPPT', 'Max efficiency 98.3%'] },
    { id: 'pv10', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 10kW', ratedW: 10000, phase: 3, trackers: 2, ip: 'IP66', path: 'pv-inverter-10kw', img: 'PV Inverter 10k.webp', match: ['^PV INVERTER 10KW$'], points: ['Three-phase 400 V, 2 MPPT', 'Max efficiency 98.6%'] },
    { id: 'pv15', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 15kW', ratedW: 15000, phase: 3, trackers: 2, ip: 'IP66', path: 'pv-inverter-15kw', img: 'PV Inverter 15k.webp', match: ['^PV INVERTER 15KW$'], points: ['Three-phase 400 V, 2 MPPT', 'Max efficiency 98.6%'] },
    { id: 'pv20', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 20kW', ratedW: 20000, phase: 3, trackers: 2, ip: 'IP66', path: 'pv-inverter-20kw', img: 'PV Inverter 20k.webp', match: ['^PV INVERTER 20KW$'], points: ['Three-phase 400 V, 2 MPPT', 'Max efficiency 98.6%'] },
    { id: 'pv30', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 30kW', ratedW: 30000, phase: 3, trackers: 3, ip: 'IP66', path: 'pv-inverter-30kw', img: 'PV Inverter 30k.webp', match: ['^PV INVERTER 30KW$'], points: ['Three-phase 400 V, 3 MPPT', 'Max efficiency 98.7%'] },
    { id: 'pv50', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 50kW', ratedW: 50000, phase: 3, trackers: 4, ip: 'IP66', path: 'pv-inverter-50kw', img: 'ON GRID INVERTER 50 80KW.webp', match: ['^PV INVERTER 50KW$'], points: ['Three-phase 400 V, 4 MPPT', 'Max efficiency 98.5%'] },
    { id: 'pv80', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 80kW', ratedW: 80000, phase: 3, trackers: 4, ip: 'IP66', path: 'pv-inverter-80kw', img: 'on-grid-inverter-50-80kw.webp', match: ['^PV INVERTER 80KW$'], points: ['Three-phase 400 V, 4 MPPT', 'Max efficiency 98.6%'] },
    { id: 'pv120', kind: 'ongrid', series: 'PV Inverter', name: 'PV Inverter 120kW', ratedW: 120000, phase: 3, trackers: 10, ip: 'IP66', path: 'pv-inverter-120kw', img: 'PV Inverter 120k.webp', match: ['^PV INVERTER 120KW$'], points: ['Three-phase, 10 MPPT', 'Max efficiency 98.7%'] },
    // Pump drives
    { id: 'pm15', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 1.5kW Single Phase', ratedW: 1500, phase: 1, ip: 'IP65', path: 'pump-inverter-15kw-single-phase', img: 'Pump Inverter 1.webp', match: ['^PUMP INVERTER 1\\.5KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm22', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 2.2kW Single Phase', ratedW: 2200, phase: 1, ip: 'IP65', path: 'pump-inverter-22kw-single-phase', img: 'Pump Inverter 2.webp', match: ['^PUMP INVERTER 2\\.2KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm55', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 5.5kW 3-Phase', ratedW: 5500, phase: 3, ip: 'IP65', path: 'pump-inverter-55kw-3-phase', img: 'Pump Inverter 5.webp', match: ['^PUMP INVERTER 5\\.5KW 3 PHASE'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm75', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 7.5kW 3-Phase', ratedW: 7500, phase: 3, ip: 'IP65', path: 'pump-inverter-75kw-3-phase', img: 'Pump Inverter 7.webp', match: ['^PUMP INVERTER 7\\.5KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm11', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 11kW 3-Phase', ratedW: 11000, phase: 3, ip: 'IP65', path: 'pump-inverter-11kw-3-phase', img: 'Pump Inverter 11k.webp', match: ['^PUMP INVERTER 11KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm15t', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 15kW 3-Phase', ratedW: 15000, phase: 3, ip: 'IP65', path: 'pump-inverter-15kw-3-phase', img: 'Pump Inverter 15k.webp', match: ['^PUMP INVERTER 15KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm185', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 18.5kW 3-Phase', ratedW: 18500, phase: 3, ip: 'IP65', path: 'pump-inverter-185kw-3-phase', img: 'Pump Inverter 18.webp', match: ['^PUMP INVERTER 18\\.5KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm22t', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 22kW 3-Phase', ratedW: 22000, phase: 3, ip: 'IP65', path: 'pump-inverter-22kw-3-phase', img: 'Pump Inverter 22k.webp', match: ['^PUMP INVERTER 22KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] },
    { id: 'pm30', kind: 'pump', series: 'Pump Inverter', name: 'Pump Inverter 30kW 3-Phase', ratedW: 30000, phase: 3, ip: 'IP65', path: 'pump-inverter-30kw-3-phase', img: 'solar-pump-inverter.webp', match: ['^PUMP INVERTER 30KW'], points: ['Runs the pump straight from solar, built-in MPPT', 'Dry-run and overload protection'] }
  ];
  INVERTERS.forEach(function (i) {
    i.url = i.path ? INV + i.path : SITE + '/products/solar-energy/solar-inverters';
    i.img = media(i.img);
    i.parallelMax = i.parallelMax || 1;
    i.trackers = i.trackers || 1;
    if (i.surgeX) i.surgeW = i.surgeX * i.ratedW;
    if (!i.surgeW) i.surgeW = null;
    if (i.kind === 'hybrid' || i.kind === 'offgrid') {
      if (!i.pvMaxW) { i.pvMaxW = approxPv(i.ratedW, i.busV, i.chargeA); i.pvPublished = false; }
    }
    i.solar = i.kind !== 'lf';
  });

  /* Batteries. ah is the rating used for energy. maxW is continuous power per unit
   * (datasheet current where published, else 0.5C lithium, 0.25C gel, 0.2C tubular). */
  function bat(o) {
    o.url = BAT + o.path;
    o.img = media(o.img);
    if (!o.maxW) o.maxW = o.v * o.ah * (o.chem === 'lfp' ? 0.5 : o.chem === 'gel' ? 0.25 : 0.2);
    o.maxPar = o.maxPar || 4;
    o.dod = o.chem === 'lfp' ? 0.9 : 0.5;
    return o;
  }
  var LFP = '6,000 cycles at 80% depth';
  var BATTERIES = [
    bat({ id: 'l128_100', chem: 'lfp', name: 'Lithium Battery 12.8V 100Ah', v: 12.8, ah: 100, maxW: 12.8 * 50, life: LFP, path: 'lithium-battery-128v-100ah', img: '12.8V 100AH-7-768x1024.webp', match: ['^LITHIUM BATTERY 12\\.8V 100AH'] }),
    bat({ id: 'l128_150', chem: 'lfp', name: 'Lithium Battery 12.8V 150Ah', v: 12.8, ah: 150, maxW: 12.8 * 50, life: LFP, path: 'lithium-battery-128v-150ah', img: '12.8V150AH  (2)-768x1024.webp', match: ['^LITHIUM BATTERY 12\\.8V 150AH'] }),
    bat({ id: 'l128_205', chem: 'lfp', name: 'Lithium Battery 12.8V 205Ah', v: 12.8, ah: 205, life: LFP, path: 'lithium-battery-128v-205ah', img: '12.8V - 205-1-768x1024.webp', match: ['^LITHIUM BATTERY 12\\.8V 205AH'] }),
    bat({ id: 'l128_300', chem: 'lfp', name: 'Lithium Battery 12.8V 300Ah', v: 12.8, ah: 300, life: LFP, path: 'lithium-battery-128v-300ah', img: '12.8V - 300-768x1024.webp', match: ['^LITHIUM BATTERY 12\\.8V 300AH'] }),
    bat({ id: 'l256_100', chem: 'lfp', name: 'Lithium Battery 25.6V 100Ah', v: 25.6, ah: 100, maxW: 25.6 * 100, life: LFP, path: 'lithium-battery-256v-100ah', img: '25.6V 100AH-768x1024.webp', match: ['^LITHIUM BATTERY 25\\.6V 100AH'] }),
    bat({ id: 'l256_205', chem: 'lfp', name: 'Lithium Battery 25.6V 205Ah', v: 25.6, ah: 205, life: LFP, path: 'lithium-battery-256v-205ah', img: '25.6V 205AH-768x1024.webp', match: ['^LITHIUM BATTERY 25\\.6V 205AH'] }),
    bat({ id: 'l512_100', chem: 'lfp', name: 'Lithium Battery 51.2V 100Ah', v: 51.2, ah: 100, maxW: 51.2 * 100, life: LFP, path: 'lithium-battery-512v-100ah', img: '51.2V 100AH-768x1024.webp', match: ['^LITHIUM BATTERY 51\\.2V 100AH'] }),
    bat({ id: 'l512_205', chem: 'lfp', name: 'Lithium Battery 51.2V 205Ah', v: 51.2, ah: 205, life: LFP, path: 'lithium-battery-512v-205ah', img: '51.2V 205AH-768x1024.webp', match: ['^LITHIUM BATTERY 51\\.2V 205AH'] }),
    bat({ id: 'l512_300', chem: 'lfp', name: 'Lithium Battery 51.2V 300Ah', v: 51.2, ah: 300, life: LFP, path: 'lithium-battery-512v-300ah', img: '51.2V 300AH-768x1024.webp', match: ['^LITHIUM BATTERY 51\\.2V 300AH'] }),
    bat({ id: 'l512_314', chem: 'lfp', name: 'Lithium Battery 51.2V 314Ah', v: 51.2, ah: 314, maxW: 10240, maxPar: 15, life: LFP, path: 'lithium-battery-512v-314ah', img: '51.2V314AH-768x1024.webp', match: ['^LITHIUM BATTERY 51\\.2V 314AH$'] }),
    bat({ id: 'l512_314ip', chem: 'lfp', name: 'Lithium Battery 51.2V 314Ah IP65', v: 51.2, ah: 314, maxW: 10000, maxPar: 8, ip: 'IP65', life: '8,000 cycles design life', path: 'lithium-battery-512v-314ah-ip65', img: 'Lithium Battery 51.2V 314Ah IP65 FRONT-768x1024.webp', match: ['^LITHIUM BATTERY 51\\.2V 314AH IP65'] }),
    bat({ id: 'l512_410', chem: 'lfp', name: 'Lithium Battery 51.2V 410Ah', v: 51.2, ah: 410, life: LFP, path: 'lithium-battery-512v-400ah', img: '51.2V410AH.webp', match: ['^LITHIUM BATTERY 51\\.2V 4[01]0AH'] }),
    bat({ id: 'l512_628', chem: 'lfp', name: 'Lithium Battery 51.2V 628Ah', v: 51.2, ah: 628, life: LFP, path: 'lithium-battery-512v-600ah', img: '51.2V628AH.webp', match: ['^LITHIUM BATTERY 51\\.2V 6[02][08]?AH'] }),

    bat({ id: 'g55', chem: 'gel', name: 'Gel Battery 12V 55Ah', v: 12, ah: 55, path: 'gel-battery-12v-55ah', img: 'Gel Battery 12V 55AH.webp', match: ['^GEL BATTERY 12V 55AH'] }),
    bat({ id: 'g65', chem: 'gel', name: 'Gel Battery 12V 65Ah', v: 12, ah: 65, path: 'gel-battery-12v-65ah', img: 'Gel Battery 12V 65AH.webp', match: ['^GEL BATTERY 12V 65AH'] }),
    bat({ id: 'g75', chem: 'gel', name: 'Gel Battery 12V 75Ah', v: 12, ah: 75, path: 'gel-battery-12v-75ah', img: 'Gel Battery 12V 75AH.webp', match: ['^GEL BATTERY 12V 75AH'] }),
    bat({ id: 'g100', chem: 'gel', name: 'Gel Battery 12V 100Ah Blue', v: 12, ah: 100, path: 'gel-battery-12v-100ah-blue', img: '12V 100AH-768x1024.webp', match: ['^GEL BATTERY 12V 100AH BLUE'] }),
    bat({ id: 'g100e', chem: 'gel', name: 'Gel Battery 12V 100Ah Eco Series', v: 12, ah: 100, path: 'gel-battery-12v-100ah-eco-series', img: 'GEL BATTERY 100AH.webp', match: ['^GEL BATTERY 12V 100AH ECO'] }),
    bat({ id: 'g100f', chem: 'gel', name: 'Gel Battery 12V 100Ah FT', v: 12, ah: 100, path: 'gel-battery-12v-100ah-ft', img: 'Gel Battery 12V 100AH FT.webp', match: ['^GEL BATTERY 12V 100AH FT'] }),
    bat({ id: 'g150', chem: 'gel', name: 'Gel Battery 12V 150Ah Blue', v: 12, ah: 150, path: 'gel-battery-12v-150ah-blue', img: '12V 150AH-768x1024.webp', match: ['^GEL BATTERY 12V 150AH BLUE'] }),
    bat({ id: 'g150e', chem: 'gel', name: 'Gel Battery 12V 150Ah Eco Series', v: 12, ah: 150, path: 'gel-battery-12v-150ah-eco-series', img: 'GEL BATTERY 150AH.webp', match: ['^GEL BATTERY 12V 150AH ECO'] }),
    bat({ id: 'g150f', chem: 'gel', name: 'Gel Battery 12V 150Ah FT', v: 12, ah: 150, path: 'gel-battery-12v-150ah-ft', img: 'Gel Battery 12V 150AH FT.webp', match: ['^GEL BATTERY 12V 150AH FT'] }),
    bat({ id: 'g200', chem: 'gel', name: 'Gel Battery 12V 200Ah Blue', v: 12, ah: 200, path: 'gel-battery-12v-200ah-blue', img: '12V 200AH-768x1024.webp', match: ['^GEL BATTERY 12V 200AH BLUE'] }),
    bat({ id: 'g200e', chem: 'gel', name: 'Gel Battery 12V 200Ah Eco Series', v: 12, ah: 200, path: 'gel-battery-12v-200ah-eco-series', img: 'GEL BATTERY 200-3.webp', match: ['^GEL BATTERY 12V 200AH ECO'] }),
    bat({ id: 'g200f', chem: 'gel', name: 'Gel Battery 12V 200Ah FT', v: 12, ah: 200, path: 'gel-battery-12v-200ah-ft', img: 'Gel Battery 12V 200AH FT.webp', match: ['^GEL BATTERY 12V 200AH FT'] }),
    bat({ id: 'g250', chem: 'gel', name: 'Gel Battery 12V 250Ah Blue', v: 12, ah: 250, path: 'gel-battery-12v-250ah-blue', img: '12V 250AH-768x1024.webp', match: ['^GEL BATTERY 12V 250AH BLUE'] }),
    // C10 capacity used for sizing (192 Ah on the datasheet)
    bat({ id: 't220', chem: 'tubular', name: 'Tubular Battery 12V 220Ah C20', v: 12, ah: 192, path: 'tubular-battery-12v-220ah-c20', img: 'tubular-battery-c20.webp', match: ['^TUBULAR BATTERY 12V 220AH'] })
  ];

  function pan(o) {
    o.url = PAN + o.path;
    o.img = media(o.img);
    o.areaM2 = o.areaM2 || o.wp / (0.2318 * 1000); // series efficiency up to 23.18% where size is not published
    return o;
  }
  var PANELS = [
    pan({ id: 'p350', name: 'Solar Panel 350W', model: 'EU-350W-HV', wp: 350, areaM2: 1.995 * 0.992, path: 'solar-panel-350w', img: '350w.webp', match: ['^SOLAR PANEL 350W'] }),
    pan({ id: 'p450', name: 'Solar Panel 450W Bifacial', model: 'EU-450-BMA-HV', wp: 450, areaM2: 2.094 * 1.038, path: 'solar-panel-450w-bifacial', img: '450w-768x1024.webp', match: ['^SOLAR PANEL 450W'] }),
    pan({ id: 'p540', name: '540 Watt Bifacial Solar Panel', model: 'EU-540W', wp: 540, areaM2: 2.256 * 1.133, path: '540w', img: '540w-768x1024.webp', match: ['^SOLAR PANEL 540W'] }),
    pan({ id: 'p590', name: 'Solar Panel 590W Bifacial', model: 'EU-590W', wp: 590, path: 'solar-panel-590w-bifacial', img: 'Solar Panel 590W Bifacial-768x1024.webp', match: ['^SOLAR PANEL 590W'] }),
    pan({ id: 'p640', name: 'Solar Panel 640W Bifacial', model: 'EU-640W', wp: 640, path: 'solar-panel-640w-bifacial', img: 'Solar Panel 640W Bifacial-768x1024.webp', match: ['^SOLAR PANEL 640W'] }),
    pan({ id: 'p720', name: 'Solar Panel 720W Bifacial', model: 'EU-720W', wp: 720, path: 'solar-panel-720w-bifacial', img: 'Solar Panel 720W Bifacial-768x1024.webp', match: ['^SOLAR PANEL 720W'] })
  ];

  /* Fitting kit. amps = rating, poles noted in the name. */
  var ACCESSORIES = [
    { id: 'dcb32', role: 'pv-breaker', name: 'DC MCB Breaker 2P 32A', amps: 32, match: ['^DC MCB BREAKER 2P 32A'] },
    { id: 'dcb63', role: 'bat-breaker', name: 'DC MCB Breaker 2P 63A', amps: 63, match: ['^DC MCB BREAKER 2P 63A'] },
    { id: 'dcm125', role: 'bat-breaker', name: 'DC MCCB Breaker 2P 125A', amps: 125, match: ['^DC MCCB BREAKER 2P 125A'] },
    { id: 'dcm160', role: 'bat-breaker', name: 'DC MCCB Breaker 2P 160A', amps: 160, match: ['^DC MCCB BREAKER 2P 160A'] },
    { id: 'dcm250', role: 'bat-breaker', name: 'DC MCCB Breaker 2P 250A', amps: 250, match: ['^DC MCCB BREAKER 2P 250A'] },
    { id: 'acb16', role: 'ac-breaker', name: 'AC MCB Breaker 1P 16A', amps: 16, match: ['^AC MCB BREAKER 1P 16A'] },
    { id: 'acb32', role: 'ac-breaker', name: 'AC MCB Breaker 1P 32A', amps: 32, match: ['^AC MCB BREAKER 1P 32A'] },
    { id: 'acb60', role: 'ac-breaker', name: 'AC MCB Breaker 1P 60A', amps: 60, match: ['^AC MCB BREAKER 1P 60A'] },
    { id: 'spd2', role: 'spd', name: 'DC Surge Protector 2P 40kA', match: ['^DC SURGE PROTECTOR 2P 40KA'] },
    { id: 'mc4', role: 'mc4', name: 'DC MC4 Connector 1 Way', match: ['^DC MC4 CONNECTOR 1 WAY$'] },
    { id: 'cable6', role: 'cable', name: 'Solar Cable 6mm 2 Core, 100 m roll', match: ['^SOLAR CABLE 6MM 100M 2 CORE', '^SOLAR CABLE 6MM 50M 2 CORE'] },
    { id: 'cb3', role: 'combiner', strings: 3, name: 'DC Combiner Box PV 3/1', match: ['^DC COMBINER BOX PV 3/1'] },
    { id: 'cb4', role: 'combiner', strings: 4, name: 'DC Combiner Box PV 4/1', match: ['^DC COMBINER BOX PV 4/1'] },
    { id: 'cb8', role: 'combiner', strings: 8, name: 'DC Combiner Box PV 8/1', match: ['^DC COMBINER BOX PV 8/1'] }
  ];
  ACCESSORIES.forEach(function (a) { a.url = ACC; });

  return { INVERTERS: INVERTERS, BATTERIES: BATTERIES, PANELS: PANELS, ACCESSORIES: ACCESSORIES };
});
