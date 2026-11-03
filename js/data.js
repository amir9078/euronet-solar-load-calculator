/*
 * Euronet Solar Load Calculator - data
 *
 * Product figures come from the published Euronet CMS records and datasheets
 * (euronetworld.com). Anything marked "approx" is derived, not published.
 * To add a product, add one object to the matching list below. No other file changes.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EURONET_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var SITE = 'https://www.euronetworld.com';
  var MEDIA = 'https://heahnqdtjwoqfbbfwvrn.storage.supabase.co/storage/v1/object/public/media/';
  function media(file) { return MEDIA + encodeURI(file); }

  /* ---------- Appliances ----------
   * w      running watts
   * surge  starting multiplier (motors and compressors draw more for a moment)
   * duty   share of time the appliance really draws w while it is on
   * hrs    typical hours of use per day (drives daily energy and solar size)
   * heavy  shown under "Heavy" filter
   */
  var CATEGORIES = [
    { id: 'lights', label: 'Lights' },
    { id: 'cooling', label: 'Fans and cooling' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'home', label: 'Home appliances' },
    { id: 'it', label: 'TV, Wi-Fi and computers' },
    { id: 'motors', label: 'Pumps and motors' },
    { id: 'shop', label: 'Shop and office' }
  ];

  var APPLIANCES = [
    { id: 'led9', cat: 'lights', name: 'LED bulb', note: '9 W', w: 9, surge: 1, duty: 1, hrs: 6 },
    { id: 'tube', cat: 'lights', name: 'LED tube light', note: '20 W', w: 20, surge: 1, duty: 1, hrs: 5 },
    { id: 'deco', cat: 'lights', name: 'Decorative or chandelier light', note: '60 W', w: 60, surge: 1, duty: 1, hrs: 4 },
    { id: 'flood', cat: 'lights', name: 'Outdoor flood light', note: '30 W', w: 30, surge: 1, duty: 1, hrs: 8 },

    { id: 'fan', cat: 'cooling', name: 'Ceiling fan', note: '75 W', w: 75, surge: 2, duty: 1, hrs: 10 },
    { id: 'tfan', cat: 'cooling', name: 'Table or pedestal fan', note: '50 W', w: 50, surge: 2, duty: 1, hrs: 8 },
    { id: 'exh', cat: 'cooling', name: 'Exhaust fan', note: '40 W', w: 40, surge: 2, duty: 1, hrs: 4 },
    { id: 'cooler', cat: 'cooling', name: 'Air cooler', note: '200 W', w: 200, surge: 2, duty: 1, hrs: 8 },
    { id: 'ac1', cat: 'cooling', name: 'Split AC 1 ton', note: '1,100 W', w: 1100, surge: 2.5, duty: 0.7, hrs: 8, heavy: true },
    { id: 'ac15', cat: 'cooling', name: 'Split AC 1.5 ton', note: '1,600 W', w: 1600, surge: 2.5, duty: 0.7, hrs: 8, heavy: true },
    { id: 'ac2', cat: 'cooling', name: 'Split AC 2 ton', note: '2,200 W', w: 2200, surge: 2.5, duty: 0.7, hrs: 8, heavy: true },

    { id: 'fridge', cat: 'kitchen', name: 'Refrigerator', note: 'double door', w: 200, surge: 3, duty: 0.4, hrs: 24 },
    { id: 'freezer', cat: 'kitchen', name: 'Deep freezer', note: '', w: 180, surge: 3, duty: 0.5, hrs: 24 },
    { id: 'micro', cat: 'kitchen', name: 'Microwave oven', note: '', w: 1200, surge: 1, duty: 1, hrs: 0.5, heavy: true },
    { id: 'kettle', cat: 'kitchen', name: 'Electric kettle', note: '', w: 1500, surge: 1, duty: 1, hrs: 0.4, heavy: true },
    { id: 'induct', cat: 'kitchen', name: 'Induction cooktop', note: '', w: 1800, surge: 1, duty: 0.7, hrs: 1.5, heavy: true },
    { id: 'mixer', cat: 'kitchen', name: 'Mixer or blender', note: '', w: 500, surge: 2, duty: 1, hrs: 0.3 },

    { id: 'wm', cat: 'home', name: 'Washing machine', note: '', w: 500, surge: 2, duty: 1, hrs: 1, heavy: true },
    { id: 'iron', cat: 'home', name: 'Clothes iron', note: '', w: 1000, surge: 1, duty: 1, hrs: 0.5, heavy: true },
    { id: 'vac', cat: 'home', name: 'Vacuum cleaner', note: '', w: 800, surge: 2, duty: 1, hrs: 0.4, heavy: true },
    { id: 'geyser', cat: 'home', name: 'Water heater (geyser)', note: '', w: 2000, surge: 1, duty: 0.5, hrs: 2, heavy: true },

    { id: 'tv', cat: 'it', name: 'LED TV', note: '', w: 100, surge: 1, duty: 1, hrs: 5 },
    { id: 'router', cat: 'it', name: 'Wi-Fi router', note: '', w: 15, surge: 1, duty: 1, hrs: 24 },
    { id: 'laptop', cat: 'it', name: 'Laptop', note: '', w: 65, surge: 1, duty: 1, hrs: 6 },
    { id: 'pc', cat: 'it', name: 'Desktop PC with monitor', note: '', w: 250, surge: 1, duty: 1, hrs: 6 },
    { id: 'printer', cat: 'it', name: 'Printer or scanner', note: '', w: 300, surge: 1, duty: 1, hrs: 0.5 },
    { id: 'cctv', cat: 'it', name: 'CCTV recorder with 4 cameras', note: '', w: 60, surge: 1, duty: 1, hrs: 24 },

    { id: 'pump05', cat: 'motors', name: 'Water pump 0.5 HP', note: '', w: 400, surge: 3, duty: 1, hrs: 1, heavy: true },
    { id: 'pump1', cat: 'motors', name: 'Water pump 1 HP', note: '', w: 750, surge: 3, duty: 1, hrs: 1, heavy: true },
    { id: 'subm', cat: 'motors', name: 'Submersible pump 1 HP', note: '', w: 1100, surge: 3, duty: 1, hrs: 1, heavy: true },

    { id: 'chiller', cat: 'shop', name: 'Display chiller or showcase fridge', note: '', w: 350, surge: 3, duty: 0.5, hrs: 24 },
    { id: 'pos', cat: 'shop', name: 'POS terminal with scanner', note: '', w: 50, surge: 1, duty: 1, hrs: 10 },
    { id: 'sign', cat: 'shop', name: 'LED signboard', note: '', w: 100, surge: 1, duty: 1, hrs: 10 }
  ];

  // extra words people type when they search
  var KEYWORDS = {
    ac1: 'air conditioner aircon', ac15: 'air conditioner aircon', ac2: 'air conditioner aircon',
    fridge: 'refrigerator', freezer: 'fridge', geyser: 'boiler', kettle: 'water boiler',
    induct: 'stove cooker hob', micro: 'oven', laptop: 'computer notebook', pc: 'computer desktop',
    tv: 'television', router: 'internet wifi', cctv: 'camera security', mixer: 'grinder',
    pump05: 'motor', pump1: 'motor', subm: 'motor borehole', wm: 'laundry', vac: 'hoover',
    chiller: 'refrigerator display', led9: 'light lamp', tube: 'light lamp', deco: 'light lamp', flood: 'light lamp'
  };
  APPLIANCES.forEach(function (a) { a.kw = KEYWORDS[a.id] || ''; });

  var PRESETS = [
    { id: 'p1', label: '1 BHK', hint: 'Small flat', qty: { led9: 4, tube: 1, fan: 2, fridge: 1, tv: 1, router: 1, laptop: 1 } },
    { id: 'p2', label: '2 BHK', hint: 'Flat with 1 AC', qty: { led9: 6, tube: 2, fan: 3, ac1: 1, fridge: 1, wm: 1, tv: 1, router: 1, laptop: 1 } },
    { id: 'p3', label: '3 BHK', hint: 'Family home', qty: { led9: 10, tube: 3, fan: 5, ac1: 2, fridge: 1, wm: 1, micro: 1, tv: 2, router: 1, laptop: 2, pump05: 1, cctv: 1 } },
    { id: 'p4', label: 'Villa', hint: '4 BHK and above', qty: { led9: 14, tube: 4, deco: 2, flood: 2, fan: 6, ac15: 3, ac1: 1, fridge: 1, freezer: 1, wm: 1, micro: 1, kettle: 1, tv: 3, router: 2, laptop: 2, pc: 1, pump1: 1, cctv: 1 } },
    { id: 'p5', label: 'Shop or office', hint: 'Small business', qty: { led9: 4, tube: 6, fan: 3, ac15: 1, chiller: 1, pos: 2, pc: 1, printer: 1, router: 1, cctv: 1, sign: 1 } },
    { id: 'p0', label: 'Start from zero', hint: 'Pick everything yourself', qty: {} }
  ];

  /* ---------- Countries: office contact and planning sunshine ----------
   * psh = peak sun hours per day on a tilted panel. Planning values, editable on screen.
   * Office numbers are the public ones listed on euronetworld.com.
   */
  var REGIONS = [
    { id: 'ae', label: 'United Arab Emirates', psh: 5.5, phone: '+971 55 552 7791', wa: '971555527791', office: 'Dubai' },
    { id: 'sa', label: 'Saudi Arabia', psh: 5.8, phone: '+966 58 133 0529', wa: '966581330529', office: 'Riyadh' },
    { id: 'sd', label: 'Sudan', psh: 5.8, phone: '+971 55 552 7791', wa: '971555527791', office: 'Dubai' },
    { id: 'ng', label: 'Nigeria', psh: 4.8, phone: '+234 916 304 1000', wa: '2349163041000', office: 'Lagos' },
    { id: 'xx', label: 'Another country', psh: 5.0, phone: '+971 55 552 7791', wa: '971555527791', office: 'Dubai' }
  ];

  var GRID_SITUATIONS = [
    { id: 'short', label: 'Short power cuts', hint: 'The grid is mostly steady', hours: 3, coverage: 0.4, offgrid: false },
    { id: 'long', label: 'Long or frequent cuts', hint: 'Outages that last hours', hours: 8, coverage: 0.7, offgrid: false },
    { id: 'off', label: 'No grid at all', hint: 'Solar and battery run everything', hours: 14, coverage: 1, offgrid: true }
  ];

  /* ---------- Inverters ----------
   * ratedW   continuous output
   * busV     battery bus voltage the unit needs
   * surgeW   published surge power. null = not published, so peak load must fit in ratedW.
   * pvMaxW   max PV input. pvPublished false = approx, min(charge current x charge voltage, 1.5 x rated).
   */
  var INVERTERS = [
    {
      id: 'a10', series: 'A Series', name: 'A 12V 1.0kW Off Grid Inverter', model: 'GEN-5 A 1K',
      ratedW: 1000, busV: 12, surgeW: null, chargeA: 40, pvMaxW: 576, pvPublished: false, mppt: '20-150 V DC', ip: 'IP21',
      kind: 'Off-grid inverter with MPPT charger',
      points: ['Inverter, MPPT solar charger and AC charger in one box', 'Pure sine wave 230 V output', 'Solar charging up to 40 A'],
      path: 'a-12v-10kw-off-grid-inverter-ip21', img: media('A Series 1k-1-768x1024.webp')
    },
    {
      id: 'a22', series: 'A Series', name: 'A 12V 2.2kW Off Grid Inverter', model: 'GEN-5 A 2.2K',
      ratedW: 2200, busV: 12, surgeW: null, chargeA: 80, pvMaxW: 1152, pvPublished: false, mppt: '55-450 V DC', ip: 'IP21',
      kind: 'Off-grid inverter with MPPT charger',
      points: ['Inverter, MPPT solar charger and AC charger in one box', 'Pure sine wave 230 V output', 'Solar charging up to 80 A'],
      path: 'a-12v-22kw-off-grid-inverter-ip21', img: media('A Series 2-768x1024.webp')
    },
    {
      id: 'a32', series: 'A Series', name: 'A 24V 3.2kW Off Grid Inverter', model: 'GEN-5 A 3.2K',
      ratedW: 3200, busV: 24, surgeW: null, chargeA: 80, pvMaxW: 2304, pvPublished: false, mppt: '55-450 V DC', ip: 'IP21',
      kind: 'Off-grid inverter with MPPT charger',
      points: ['Inverter, MPPT solar charger and AC charger in one box', 'Pure sine wave 230 V output', 'Solar charging up to 80 A'],
      path: 'a-24v-32kw-off-grid-inverter-ip21', img: media('A Series 3-768x1024.webp')
    },
    {
      id: 's42', series: 'S Series', name: 'S 24V 4.2kW Hybrid Inverter', model: 'GEN-5 S 4.2K',
      ratedW: 4200, busV: 24, surgeW: null, chargeA: 120, pvMaxW: 6200, pvPublished: true, mppt: '60-450 V DC', ip: 'IP21',
      kind: 'Hybrid solar inverter',
      points: ['Two AC outputs, so critical and general loads stay separate', 'Runs from solar alone when the battery is empty', 'Up to 98% peak efficiency, lithium BMS link, Wi-Fi'],
      path: 's-24v-42kw-hybrid-inverter-ip21', img: media('S SERIES 4.2-768x1024.webp')
    },
    {
      id: 's62', series: 'S Series', name: 'S 48V 6.2kW Hybrid Inverter', model: 'GEN-5 S 6.2K',
      ratedW: 6200, busV: 48, surgeW: null, chargeA: 120, pvMaxW: 6912, pvPublished: false, mppt: '60-450 V DC', ip: 'IP21',
      kind: 'Hybrid solar inverter',
      points: ['Two AC outputs, so critical and general loads stay separate', 'Runs from solar alone when the battery is empty', 'Up to 98% peak efficiency, lithium BMS link, Wi-Fi'],
      path: 's-48v-62kw-hybrid-inverter-ip21', img: media('S SERIES 6.2-768x1024.webp')
    },
    {
      id: 's102', series: 'S Series', name: 'S 48V 10.2kW Hybrid Inverter', model: 'GEN-5 S 10.2K',
      ratedW: 10200, busV: 48, surgeW: null, chargeA: 160, pvMaxW: 10800, pvPublished: true, mppt: '90-450 V DC, dual MPPT', ip: 'IP21',
      kind: 'Hybrid solar inverter',
      points: ['Dual MPPT, 5.4 kW on each input', 'Two AC outputs, so critical and general loads stay separate', 'Up to 98% peak efficiency, lithium BMS link, Wi-Fi'],
      path: 's-48v-102kw-hybrid-inverter-ip21', img: media('S SERIES 10.2-768x1024.webp')
    },
    {
      id: 'rsz12', series: 'RSZ Series', name: 'RSZ 48V 12kW Hybrid Inverter', model: 'GEN-5 RSZ 12K',
      ratedW: 12000, busV: 48, surgeW: 18000, chargeA: 230, pvMaxW: 14500, pvPublished: true, mppt: '120-480 V DC, dual MPPT', ip: 'IP20',
      kind: 'Hybrid solar inverter',
      points: ['Surge power 18,000 VA for pumps, compressors and ACs starting together', 'Dual independent MPPT, up to 14.5 kW of solar', 'Parallel up to 9 units'],
      path: 'rsz-48v-12kw-hybrid-inverter-ip21', img: media('RSZ SERIES 12-768x1024.webp')
    },
    {
      id: 'pro3', series: 'Pro IP65', name: 'Hybrid Inverter 3kW Pro IP65', model: 'E-PRO3KW230V-IP65',
      ratedW: 3000, busV: 24, surgeW: null, chargeA: 100, pvMaxW: 2880, pvPublished: false, mppt: '60-450 V DC', ip: 'IP65',
      kind: 'Hybrid solar inverter, outdoor rated',
      points: ['IP65, so it can be mounted outdoors', 'Wi-Fi monitoring and remote app built in', 'Solar charging up to 100 A'],
      path: 'hybrid-inverter-3kw-pro-ip65', img: media('Hybrid Inverter 3KW-6KW Pro IP65-768x1024.webp')
    },
    {
      id: 'pro6', series: 'Pro IP65', name: 'Hybrid Inverter 6kW Pro IP65', model: 'E-PRO6KW230V-IP65',
      ratedW: 6000, busV: 48, surgeW: null, chargeA: null, pvMaxW: 9000, pvPublished: false, mppt: '50-500 V DC, 2 MPPT', ip: 'IP65',
      kind: 'Hybrid solar inverter, outdoor rated',
      points: ['IP65, so it can be mounted outdoors', 'Two MPPT trackers', 'Wi-Fi monitoring and remote app built in'],
      path: 'hybrid-inverter-6kw-pro-ip65', img: media('Hybrid Inverter 3KW-6KW Pro IP65-768x1024.webp')
    },
    {
      id: 'pro10', series: 'Pro IP65', name: 'Hybrid Inverter 10kW Pro IP65', model: 'E-PRO10KW230V-IP65',
      ratedW: 10000, busV: 48, surgeW: null, chargeA: 220, pvMaxW: 12672, pvPublished: false, mppt: '50-450 V DC, 2 MPPT', ip: 'IP65',
      kind: 'Hybrid solar inverter, outdoor rated',
      points: ['IP65, so it can be mounted outdoors', 'Two MPPT trackers, solar charging up to 220 A', 'Parallel up to 6 units single-phase'],
      path: 'hybrid-inverter-10kw-pro-ip65', img: media('Hybrid Inverter 10KW-16KW Pro IP65-1.webp')
    },
    {
      id: 'pro16', series: 'Pro IP65', name: 'Hybrid Inverter 16kW Pro IP65', model: 'E-PRO16KW230V-IP65',
      ratedW: 16000, busV: 48, surgeW: null, chargeA: 250, pvMaxW: 14400, pvPublished: false, mppt: '50-450 V DC, 3 MPPT', ip: 'IP65',
      kind: 'Hybrid solar inverter, outdoor rated',
      points: ['IP65, so it can be mounted outdoors', 'Three MPPT trackers, solar charging up to 250 A', 'Parallel up to 6 units single-phase'],
      path: 'hybrid-inverter-16kw-pro-ip65', img: media('Hybrid Inverter 10KW-16KW Pro IP65-1.webp')
    }
  ];
  INVERTERS.forEach(function (i) { i.url = SITE + '/products/solar-energy/solar-inverters/' + i.path; });

  /* ---------- Batteries ----------
   * v / ah     nominal volts and amp-hours of one unit
   * maxW       continuous discharge power one unit can give
   * maxPar     most units we allow in parallel (datasheet figure where published, else 4)
   */
  var BATTERIES = [
    { id: 'l128_100', chem: 'lfp', name: 'Lithium Battery 12.8V 100Ah', v: 12.8, ah: 100, maxW: 12.8 * 50, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-128v-100ah', img: media('12.8V 100AH-7-768x1024.webp') },
    { id: 'l128_150', chem: 'lfp', name: 'Lithium Battery 12.8V 150Ah', v: 12.8, ah: 150, maxW: 12.8 * 50, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-128v-150ah', img: media('12.8V150AH  (2)-768x1024.webp') },
    { id: 'l128_205', chem: 'lfp', name: 'Lithium Battery 12.8V 205Ah', v: 12.8, ah: 205, maxW: 12.8 * 102.5, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-128v-205ah', img: media('12.8V - 205-1-768x1024.webp') },
    { id: 'l128_300', chem: 'lfp', name: 'Lithium Battery 12.8V 300Ah', v: 12.8, ah: 300, maxW: 12.8 * 150, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-128v-300ah', img: media('12.8V - 300-768x1024.webp') },
    { id: 'l256_100', chem: 'lfp', name: 'Lithium Battery 25.6V 100Ah', v: 25.6, ah: 100, maxW: 25.6 * 100, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-256v-100ah', img: media('25.6V 100AH-768x1024.webp') },
    { id: 'l256_205', chem: 'lfp', name: 'Lithium Battery 25.6V 205Ah', v: 25.6, ah: 205, maxW: 25.6 * 102.5, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-256v-205ah', img: media('25.6V 205AH-768x1024.webp') },
    { id: 'l512_100', chem: 'lfp', name: 'Lithium Battery 51.2V 100Ah', v: 51.2, ah: 100, maxW: 51.2 * 100, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-512v-100ah', img: media('51.2V 100AH-768x1024.webp') },
    { id: 'l512_205', chem: 'lfp', name: 'Lithium Battery 51.2V 205Ah', v: 51.2, ah: 205, maxW: 51.2 * 102.5, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-512v-205ah', img: media('51.2V 205AH-768x1024.webp') },
    { id: 'l512_300', chem: 'lfp', name: 'Lithium Battery 51.2V 300Ah', v: 51.2, ah: 300, maxW: 51.2 * 150, maxPar: 4, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-512v-300ah', img: media('51.2V 300AH-768x1024.webp') },
    { id: 'l512_314', chem: 'lfp', name: 'Lithium Battery 51.2V 314Ah', v: 51.2, ah: 314, maxW: 10240, maxPar: 15, cycles: '6,000 cycles at 80% DoD', path: 'lithium-battery-512v-314ah', img: media('51.2V314AH-768x1024.webp') },
    { id: 'l512_314ip', chem: 'lfp', name: 'Lithium Battery 51.2V 314Ah IP65', v: 51.2, ah: 314, maxW: 10000, maxPar: 8, cycles: '8,000 cycles design life', ip: 'IP65', path: 'lithium-battery-512v-314ah-ip65', img: media('Lithium Battery 51.2V 314Ah IP65 FRONT-768x1024.webp') },

    { id: 'g100', chem: 'gel', name: 'Gel Battery 12V 100Ah Blue', v: 12, ah: 100, maxW: 12 * 25, maxPar: 4, path: 'gel-battery-12v-100ah-blue', img: media('12V 100AH-768x1024.webp') },
    { id: 'g150', chem: 'gel', name: 'Gel Battery 12V 150Ah Blue', v: 12, ah: 150, maxW: 12 * 37.5, maxPar: 4, path: 'gel-battery-12v-150ah-blue', img: media('12V 150AH-768x1024.webp') },
    { id: 'g200', chem: 'gel', name: 'Gel Battery 12V 200Ah Blue', v: 12, ah: 200, maxW: 12 * 50, maxPar: 4, path: 'gel-battery-12v-200ah-blue', img: media('12V 200AH-768x1024.webp') },
    { id: 'g250', chem: 'gel', name: 'Gel Battery 12V 250Ah Blue', v: 12, ah: 250, maxW: 12 * 62.5, maxPar: 4, path: 'gel-battery-12v-250ah-blue', img: media('12V 250AH-768x1024.webp') }
  ];
  BATTERIES.forEach(function (b) { b.url = SITE + '/products/solar-energy/batteries/' + b.path; });

  /* ---------- Solar panels (only models with published voltage and size data) ---------- */
  var PANELS = [
    {
      id: 'p450', name: 'Solar Panel 450W Bifacial', model: 'EU-450-BMA-HV', wp: 450, areaM2: (2.094 * 1.038), eff: '21.1%',
      points: ['Bifacial dual-glass, picks up reflected light', 'IP68 junction box, 1500 V DC system rating', '25-year linear power warranty'],
      path: 'solar-panel-450w-bifacial', img: media('450w-768x1024.webp')
    },
    {
      id: 'p540', name: '540 Watt Bifacial Solar Panel', model: 'EU-540W', wp: 540, areaM2: (2.256 * 1.133), eff: '21.1%',
      points: ['TOPCon bifacial dual-glass, 182 mm half-cell', 'IP68 junction box, 1500 V DC system rating', '25-year linear power warranty'],
      path: '540w', img: media('540w-768x1024.webp')
    }
  ];
  PANELS.forEach(function (p) { p.url = SITE + '/products/solar-energy/solar-panels/' + p.path; });

  /* ---------- The three recommendation levels ---------- */
  var TIERS = [
    {
      key: 'value', label: 'Essential', tag: 'Gel batteries, simple and proven',
      blurb: 'Maintenance-free gel batteries and an inverter sized close to your load. A straightforward way to keep what you picked running.',
      loadFactor: 0.9, reserve: 1.0, pvMargin: 1.0, panel: 'p450',
      inverters: ['a10', 'a22', 'a32', 's42', 's62', 's102', 'rsz12'],
      battery: { chem: 'gel', dod: 0.5, ids: ['g100', 'g150', 'g200', 'g250'] }
    },
    {
      key: 'best', label: 'Best Fit', tag: 'Our pick for most homes',
      blurb: 'Lithium storage that lasts, an inverter with comfortable spare capacity and a little margin on the battery and panels.',
      loadFactor: 0.75, reserve: 1.15, pvMargin: 1.1, panel: 'p540',
      inverters: ['a22', 'a32', 's42', 's62', 's102', 'rsz12'],
      battery: { chem: 'lfp', dod: 0.9, ids: ['l128_100', 'l128_150', 'l128_205', 'l128_300', 'l256_100', 'l256_205', 'l512_100', 'l512_205', 'l512_300', 'l512_314'] }
    },
    {
      key: 'future', label: 'Future-proof', tag: 'Room to grow, built for outdoors',
      blurb: 'Weatherproof IP65 inverter and battery with generous headroom, so you can add loads or panels later.',
      loadFactor: 0.6, reserve: 1.3, pvMargin: 1.25, panel: 'p540',
      inverters: ['pro3', 'pro6', 'pro10', 'pro16'],
      battery: { chem: 'lfp', dod: 0.9, ids: ['l256_100', 'l256_205', 'l512_205', 'l512_314ip'] }
    }
  ];

  return {
    SITE: SITE,
    CATEGORIES: CATEGORIES,
    APPLIANCES: APPLIANCES,
    PRESETS: PRESETS,
    REGIONS: REGIONS,
    GRID_SITUATIONS: GRID_SITUATIONS,
    INVERTERS: INVERTERS,
    BATTERIES: BATTERIES,
    PANELS: PANELS,
    TIERS: TIERS,
    ASSUMPTIONS: {
      invEff: 0.92,        // battery to AC conversion efficiency
      perfRatio: 0.75,     // PV system performance ratio (heat, dust, wiring, conversion)
      panelSpacing: 1.15,  // roof area allowance on top of panel area
      maxConnectedW: 40000 // above this we ask for an engineer
    }
  };
});
