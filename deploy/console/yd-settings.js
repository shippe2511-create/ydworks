/* YD Works — remote control for the website, customer app and driver app.
 *
 * Every value here can be changed by a Manager in the console (Website & apps page). Each surface:
 *   1. includes this file after yd-config.js,
 *   2. reads YDSET.get() right away (defaults, or the last copy saved on this device),
 *   3. listens for the "yd-settings" event (fired once fresh values arrive) and re-applies them.
 *
 * Where the values come from:
 *   LIVE (Supabase configured): the public.app_settings table, keys "website", "customer_app", "driver_app",
 *        plus the existing "announcement", "contact", "ordering". Readable without signing in.
 *   DEMO: localStorage "yd-demo-settings", written by the console in demo mode, so on one host
 *        (yd-mv.com/, /app, /driver, /console) a change in the demo console shows in the other surfaces.
 *
 * Text fields come in pairs: *_en and *_dv. Use YDSET.txt(obj, "field") to pick the right language
 * (falls back to English when the Dhivehi one is empty). Empty English text = keep the built-in wording.
 */
(function () {
  "use strict";
  const DEFAULTS = {
    website: {
      hero_title_en: "", hero_title_dv: "",          // empty = built-in headline
      hero_sub_en: "", hero_sub_dv: "",
      sections: { services: true, fleet: true, materials: true, estimate: true, projects: true, reviews: true, quote: true, contact: true },
      whatsapp_button: true,                          // floating chat button on the website
      seo_title: "", seo_description: "",
      maintenance: { active: false, text_en: "", text_dv: "" }   // shows a notice over the quote form and turns online requests off
    },
    customer_app: {
      home_title_en: "", home_title_dv: "",
      home_sub_en: "", home_sub_dv: "",
      tiles: { hire: true, materials: true, logistics: true, house: true },
      whatsapp: true,                                 // WhatsApp entry points in the app
      promo: { active: false, title_en: "", title_dv: "", text_en: "", text_dv: "", tone: "info" },
      maintenance: { active: false, text_en: "", text_dv: "" },  // full-screen "back soon" message; ordering blocked
      min_version: "", update_url_ios: "", update_url_android: "", update_text_en: "", update_text_dv: ""
    },
    driver_app: {
      message: { active: false, text_en: "", text_dv: "", tone: "info" },   // banner on the Jobs screen for every driver
      checklist: [],                                  // empty = built-in daily vehicle checklist; else [{id,label_en,label_dv}]
      require_pod_photo: true,                        // a delivery photo is needed to complete a job
      require_daily_check: true,                      // the daily vehicle check must be done before accepting jobs
      fuel_logging: true,                             // show the fuel log
      location_every_sec: 15,                         // how often an online driver's location is sent
      min_version: "", update_text_en: "", update_text_dv: ""
    },
    announcement: { active: false, text: "", text_dv: "", tone: "info", where: { website: true, customer_app: true } },
    contact: { hotline: "992 0202", email: "yd@yd-mv.com", hours_am: "07:30 – 12:00", hours_pm: "13:00 – 18:00", friday: "Call to confirm" },
    ordering: { accepting_orders: true, same_day_cutoff: "14:00" },
    // Content page in the console: { "<text key>": { en: "…", dv: "…" } } — only edited texts are stored
    content_website: {}, content_customer_app: {}, content_driver_app: {},
    // photo swaps: { "assets/hero.jpg": "https://…/catalog/site/hero.jpg" } — only replaced photos are stored
    media_website: {}, media_customer_app: {}, media_driver_app: {}
  };
  const KEYS = Object.keys(DEFAULTS);
  const LS_CACHE = "yd-settings-cache", LS_DEMO = "yd-demo-settings";
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  function merge(base, over) {
    if (!isObj(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(k => { out[k] = isObj(base && base[k]) ? merge(base[k], over[k]) : over[k]; });
    return out;
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };

  const CFG = window.YD_CONFIG || {}, real = v => typeof v === "string" && v && v.indexOf("__") !== 0;
  const LIVE = real(CFG.supabaseUrl) && real(CFG.supabaseKey);

  let cur = clone(DEFAULTS);
  function apply(raw) { const next = clone(DEFAULTS); KEYS.forEach(k => { if (raw && raw[k] !== undefined) next[k] = merge(DEFAULTS[k], raw[k]); }); cur = next; }
  apply(LIVE ? read(LS_CACHE) : read(LS_DEMO));

  function fire() { try { window.dispatchEvent(new CustomEvent("yd-settings", { detail: cur })); } catch (_) {} }

  async function load() {
    if (!LIVE) { apply(read(LS_DEMO)); fire(); return cur; }
    try {
      const url = CFG.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/app_settings?select=key,value&key=in.(" + KEYS.join(",") + ")";
      const r = await fetch(url, { headers: { apikey: CFG.supabaseKey } });
      if (!r.ok) throw new Error("settings " + r.status);
      const rows = await r.json(), raw = {};
      rows.forEach(x => { raw[x.key] = x.value; });
      write(LS_CACHE, raw); apply(raw); fire();
    } catch (_) { /* keep defaults / cached copy */ }
    return cur;
  }

  // compare "1.2.10" style versions; true when have < need
  function older(have, need) {
    if (!need) return false;
    const a = String(have || "0").split(".").map(n => +n || 0), b = String(need).split(".").map(n => +n || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0); }
    return false;
  }
  const lang = () => (document.documentElement.lang === "dv" ? "dv" : "en");
  function txt(obj, field) {
    if (!obj) return "";
    if (lang() === "dv" && obj[field + "_dv"]) return obj[field + "_dv"];
    return obj[field + "_en"] != null ? obj[field + "_en"] : (obj[field] || "");
  }

  // refresh when the console saves in another tab (demo) and when the app comes back to the foreground
  window.addEventListener("storage", e => { if (e.key === LS_DEMO && !LIVE) { apply(read(LS_DEMO)); fire(); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });

  window.YDSET = {
    DEFAULTS: clone(DEFAULTS), KEYS, LIVE,
    get: () => cur,
    load, txt, older, merge,
    // console (demo mode only): save the whole settings object so the other surfaces on this host pick it up
    saveDemo(all) { write(LS_DEMO, all); apply(all); fire(); }
  };
  load();
})();
