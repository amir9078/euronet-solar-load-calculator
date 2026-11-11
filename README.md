# EURONET Solar System Finder

Answer three questions and get the best EURONET solar system **from what is in stock** in your country, with the inverter, batteries, panels and a fitting kit, ready to quote on WhatsApp or email.

Plain HTML, CSS and JavaScript. No build step, so it runs on GitHub Pages as it is.

## What it covers

| Goal | What it builds |
| --- | --- |
| Power backup with solar | Hybrid or off-grid inverter, battery bank on the inverter's voltage, panels. Without panels it can also use LF backup inverters |
| Cut my electricity bill | Grid-tied PV inverter (5 to 120 kW) and panels, no battery |
| No grid at all | Inverter, battery and enough panels for the whole day |
| Solar water pump | Pump drive sized to the motor, panels at 1.5 times the motor power |

The catalogue (`js/catalog.js`) holds 40 inverters across the A, Shark, Onyx, RS, S, RSZ, Pro IP65, LF, PV and pump ranges, 27 batteries (lithium, gel Blue, Eco and FT, tubular), 6 panels and 14 fitting kit parts. Parallel inverters are used where the datasheet allows it (RSZ up to 9, Pro 10 and 16 kW up to 6).

## How it picks

For the chosen country it builds every inverter, battery and panel combination the stock allows, keeps the ones that carry the running load and motor start, hold the backup energy on the right battery voltage and reach the solar goal, then scores them on fit, lithium life, stock depth and part count. The best one is shown first, with up to two alternatives (lead-acid battery version, outdoor IP65 version). If nothing in stock fits, it says so and proposes items to order.

## Stock

`data/stock.json` is public and holds only free stock (on hand minus reserved) per country for catalogue items, capped at 50. No costs, prices or warehouse locations.

To refresh it

1. Export products and stock quants for the solar categories from Odoo into `_data/odoo-stock.json` (git-ignored, never committed). The format is in `scripts/build-stock.mjs`.
2. Run `node scripts/build-stock.mjs`. It prints which catalogue items it found and which in-stock Odoo items are not in the catalogue yet (`--unmatched`).
3. Commit `data/stock.json` and push. GitHub Pages updates in about 30 seconds.

## Test

```
node tests/engine.test.mjs
node tests/show.mjs ae,sa,ng backup,off,grid,pump
```

The first runs about 400 checks across every country, goal, home type, backup length and pump size. The second prints what each case would be sold.

## Notes

- Figures come from the EURONET datasheets and product records. Solar input limits that are not published are estimated from charge current and flagged on screen.
- The LF 5500VA and PV 8 kW are left out because their datasheet figures are missing or unclear.
- The page is `noindex` while it lives on github.io.
