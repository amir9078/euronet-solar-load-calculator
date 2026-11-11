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
| Business, factory or project | From monthly kWh and highest load. Bill saving builds a grid-tied plant from a mix of PV inverters. Backup and off-grid compare paralleled RSZ or Pro or Edge hybrids, Ultra 30 kW with high-voltage packs, and 125 kW or 100 kW storage cabinets, with built-in or AC-coupled solar |

The catalogue (`js/catalog.js`) holds 46 inverters and storage cabinets (A, Shark, Onyx, RS, S, RSZ, Pro IP65, Edge, Ultra, LF, PV, pump, C&I ESS), 30 batteries (lithium, gel Blue, Eco and FT, tubular, high-voltage packs), 6 panels and 14 fitting kit parts. Parallel units follow the datasheets (RSZ up to 9, Pro 10 and 16 kW up to 6, Ultra up to 10, storage cabinets up to 10).

## How it picks

For the chosen country it builds every inverter, battery and panel combination the stock allows, keeps the ones that carry the running load and motor start, hold the backup energy on the right battery voltage and reach the solar goal, then scores them on fit, lithium life, stock depth and part count. The best one is shown first, with up to two alternatives (lead-acid battery version, outdoor IP65 version). If a part is short it says which other EURONET company holds it, and for short panels it offers a ready-now mix on a second solar input, a one-model swap, or shipping from another location. When stock forces a different answer it also shows our first choice, to order. If nothing in stock fits, it proposes items to order.

## Stock

`data/stock.json` is public and holds only free stock (on hand minus reserved) for catalogue items, capped at 50, per selling company. The UAE, Sudan and every other country use EURONET UAE, Saudi Arabia uses EURONET KSA and Nigeria uses EURONET NIGERIA. No costs, prices or warehouse locations.

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
