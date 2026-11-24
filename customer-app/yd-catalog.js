/* YD Works catalog: the single source of truth for names, codes, specs and prices.
 * Used by the website, customer app, driver app and console (demo mode), and to
 * generate the database seed (supabase/migrations/*_catalog_seed.sql).
 * PRICES ARE SAMPLE FIGURES (MVR). Once the backend is live, edit prices in the console.
 */
(function (root) {
  "use strict";
  const machines = [
    { id: "exc20",  code: "EX-02", name: "Excavator 20T",       category: "earth", specs: { "Weight": "20 t", "Bucket": "0.9 m³", "Dig depth": "6.6 m", "Crew": "Operator" },        rate_hr: 850,  rate_day: 6200, rate_mo: 120000 },
    { id: "exc5",   code: "EX-05", name: "Mini excavator 5T",   category: "earth", specs: { "Weight": "5.5 t", "Bucket": "0.2 m³", "Dig depth": "3.8 m", "Crew": "Operator" },       rate_hr: 450,  rate_day: 3200, rate_mo: 62000 },
    { id: "wl",     code: "WL-01", name: "Wheel loader",        category: "earth", specs: { "Bucket": "3.0 m³", "Payload": "5 t", "Best for": "Sand, fill", "Crew": "Operator" },    rate_hr: 700,  rate_day: 5200, rate_mo: 98000 },
    { id: "tip",    code: "TP-04", name: "Tipper truck 10m³",   category: "haul",  specs: { "Body": "10 m³", "Payload": "16 t", "Best for": "Sand, rubble", "Crew": "Driver" },     rate_hr: 550,  rate_day: 4000, rate_mo: 76000 },
    { id: "lorry",  code: "LR-02", name: "Flatbed lorry",       category: "haul",  specs: { "Deck": "6.2 m", "Payload": "8 t", "Best for": "Steel, blocks", "Crew": "Driver + helper" }, rate_hr: 400, rate_day: 3000, rate_mo: 58000 },
    { id: "crane",  code: "CR-01", name: "Lorry crane (HIAB)",  category: "lift",  specs: { "Lift": "10 t·m", "Reach": "14 m", "Deck": "6 m", "Crew": "Driver + rigger" },           rate_hr: 950,  rate_day: 7000, rate_mo: 135000 },
    { id: "fork",   code: "FL-03", name: "Forklift 3T",         category: "lift",  specs: { "Capacity": "3 t", "Mast": "4.5 m", "Fuel": "Diesel", "Crew": "Operator" },               rate_hr: 350,  rate_day: 2600, rate_mo: 50000 },
    { id: "mixer",  code: "MX-03", name: "Concrete mixer 6m³",  category: "site",  specs: { "Drum": "6 m³", "Grades": "C20–C35", "Best for": "Slabs, footings", "Crew": "Driver" },   rate_hr: 1200, rate_day: 8500, rate_mo: 160000 },
    { id: "roller", code: "RL-01", name: "Vibratory roller",    category: "site",  specs: { "Drum": "1.2 m", "Weight": "3 t", "Best for": "Compaction", "Crew": "Operator" },         rate_hr: 500,  rate_day: 3600, rate_mo: 68000 }
  ];
  const materials = [
    { id: "cem",  name: "Portland cement",      category: "Cement",    unit: "50 kg bag",  price: 118, step: 10 },
    { id: "agg",  name: "Aggregate 3/4\"",      category: "Aggregate", unit: "m³",         price: 780, step: 1 },
    { id: "sand", name: "River sand",           category: "Sand",      unit: "m³",         price: 650, step: 1 },
    { id: "y12",  name: "Rebar Y12",            category: "Steel",     unit: "12 m bar",   price: 165, step: 10 },
    { id: "y16",  name: "Rebar Y16",            category: "Steel",     unit: "12 m bar",   price: 290, step: 10 },
    { id: "blk",  name: "Cement block 6\"",     category: "Blocks",    unit: "pc",         price: 14,  step: 50 },
    { id: "ply",  name: "Marine plywood 18mm",  category: "Timber",    unit: "sheet",      price: 520, step: 1 },
    { id: "roof", name: "Roofing sheet 0.47mm", category: "Roofing",   unit: "m",          price: 95,  step: 5 },
    { id: "pvc",  name: "PVC pipe 4\"",         category: "Plumbing",  unit: "6 m length", price: 210, step: 1 }
  ];
  const categories = { earth: "Earthmoving", haul: "Haulage", lift: "Lifting", site: "Site & concrete" };
  const pricing = { delivery_fee: 250, free_delivery_over: 15000, mobilisation_fee: 300, driver_share: 0.06, min_driver_pay: 150 };
  // every item's "icon" is its own id, so its photo is the same on every screen
  machines.forEach((m, i) => { m.icon = m.id; m.sort = i + 1; m.active = true; });
  materials.forEach((m, i) => { m.icon = m.id; m.sort = i + 1; m.active = true; });
  // sample availability shown in demo mode (live mode reads machines.busy_until from the database)
  const demoNextFree = { exc20: "15:30", tip: "14:10", crane: "16:00" };
  machines.forEach(m => { m.nextFree = demoNextFree[m.id] || null; });
  const availability = m => m.nextFree ? { busy: true, label: "Next free " + m.nextFree } : { busy: false, label: "Available" };
  const api = { machines, materials, categories, pricing, availability };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.YDCAT = api;
})(typeof window !== "undefined" ? window : globalThis);
