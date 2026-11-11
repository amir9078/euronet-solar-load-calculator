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
    { id: 'ae', stock: 'ae', label: 'United Arab Emirates', psh: 5.5, phone: '+971 55 552 7791', wa: '971555527791', office: 'Dubai' },
    { id: 'sa', stock: 'sa', label: 'Saudi Arabia', psh: 5.8, phone: '+966 58 133 0529', wa: '966581330529', office: 'Riyadh' },
    { id: 'ng', stock: 'ng', label: 'Nigeria', psh: 4.8, phone: '+234 916 304 1000', wa: '2349163041000', office: 'Lagos' },
    { id: 'xx', stock: 'ae', label: 'Another country', psh: 5.0, phone: '+971 55 552 7791', wa: '971555527791', office: 'Dubai' }
  ];

  /* ---------- What the customer wants ---------- */
  var GOALS = [
    { id: 'backup', label: 'Power backup with solar', hint: 'Keeps the lights on in a power cut and trims the bill' },
    { id: 'grid', label: 'Cut my electricity bill', hint: 'Panels feed your home, no battery' },
    { id: 'off', label: 'No grid at all', hint: 'Solar and batteries run everything' },
    { id: 'pump', label: 'Solar water pump', hint: 'The pump runs from the sun, no battery' },
    { id: 'biz', label: 'Business, factory or project', hint: 'Three-phase plants, storage cabinets, any size' }
  ];

  var DURATIONS = [
    { id: 'short', label: 'A few hours', hint: 'Short power cuts', hours: 3, coverage: 0.4 },
    { id: 'evening', label: 'The whole evening', hint: 'Cuts that last hours', hours: 8, coverage: 0.7 },
    { id: 'night', label: 'All night and more', hint: 'Long outages or no grid', hours: 14, coverage: 1 }
  ];

  var PUMPS = [
    { hp: 0.5, kw: 0.37 }, { hp: 1, kw: 0.75 }, { hp: 2, kw: 1.5 }, { hp: 3, kw: 2.2 }, { hp: 5, kw: 3.7 }, { hp: 7.5, kw: 5.5 },
    { hp: 10, kw: 7.5 }, { hp: 15, kw: 11 }, { hp: 20, kw: 15 }, { hp: 25, kw: 18.5 }, { hp: 30, kw: 22 }, { hp: 40, kw: 30 }
  ];

  return {
    SITE: SITE,
    CATEGORIES: CATEGORIES,
    APPLIANCES: APPLIANCES,
    PRESETS: PRESETS,
    REGIONS: REGIONS,
    GOALS: GOALS,
    DURATIONS: DURATIONS,
    PUMPS: PUMPS,
    ASSUMPTIONS: {
      invEff: 0.92,        // battery to AC conversion efficiency
      perfRatio: 0.75,     // PV system performance ratio (heat, dust, wiring, conversion)
      panelSpacing: 1.15,  // roof area allowance on top of panel area
      maxConnectedW: 40000, // above this we ask for an engineer
      gridDcAc: 1.2,        // target solar to inverter ratio for grid-tied systems
      pumpArrayRatio: 1.5,  // solar array watts per pump kW
      panelsPerString: 4,   // typical, used only to estimate connectors and combiner boxes
      stockCap: 50,         // published stock is capped here
      bizAvgShare: 0.6,     // business backup energy uses 60% of the highest load on average
      bizStartAllowance: 1.25 // motor starts on top of the highest load
    }
  };
});
