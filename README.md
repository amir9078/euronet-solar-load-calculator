# EURONET Solar Load Calculator

A load calculator for the [EURONET solar range](https://www.euronetworld.com/products/solar-energy). A customer picks their appliances, says how the power behaves where they live, and gets three complete systems. Each one names the exact inverter, battery bank and solar panels, with quantities, and shows what it will cover.

Plain HTML, CSS and JavaScript. No build step and no server, so it runs on GitHub Pages as it is.

## How it sizes a system

1. **Load.** Connected watts, the share that runs together, the largest motor start (compressors and pumps draw more when they start), and daily energy from each appliance's power, duty cycle and usual hours.
2. **Inverter.** The smallest unit whose rating carries the running load with headroom for the level, and whose surge rating covers the peak. Where a surge rating is not published the peak must fit inside the continuous rating.
3. **Battery.** A bank on the inverter's own voltage that holds the backup energy and can deliver the running power. Gel is used to 50% depth and lithium to 90%.
4. **Solar.** Panels that make the share of daily use the customer wants, at the country's sun hours and a 75% performance ratio, capped by what the inverter's solar input can take. If the cap blocks the goal, it moves up to a larger inverter.

The three levels are Essential (gel batteries), Best Fit (lithium) and Future-proof (IP65 inverter and lithium with more headroom). The full workings and assumptions are shown on the results page under "How we worked this out".

## Where the product data comes from

Figures are taken from the published EURONET product records and datasheets on euronetworld.com (read on 3 November 2026). Panels are limited to the 450 W and 540 W models because those are the ones with published voltage and size data. Prices are deliberately not shown.

Values marked as estimates in `js/data.js` are derived rather than published. For example, a solar input limit worked out from charge current when the datasheet does not state one.

## Change the products

Everything the engine knows about a product is in `js/data.js`. Add or edit an object in `INVERTERS`, `BATTERIES` or `PANELS`, then list its `id` in a tier's ladder under `TIERS`. No other file needs to change.

## Run it

Open `index.html` through any static server, for example

```
python -m http.server 8195
```

## Test it

```
node tests/engine.test.mjs
node tests/show.mjs
```

The first runs the sizing checks, including a 2 BHK worked by hand and invariants across every preset, grid situation and solar choice. The second prints what each preset would be sold.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page structure |
| `css/style.css` | Styles |
| `js/data.js` | Appliances, countries and EURONET products |
| `js/engine.js` | Sizing engine with no DOM code |
| `js/app.js` | Interface |
| `tests/` | Engine tests |

Results can be shared as a link. The link carries the selections in the URL hash, so it works without a server.

## Notes

- The page is set to `noindex` while it lives on github.io. Remove the robots meta tag in `index.html` when it moves to euronetworld.com.
- Indicative sizing for pre-sales guidance. A site survey sets the final design.
