/* YD Works shared UI helpers: product imagery + stylised Hulhumalé map.
 * Used by the customer and driver apps. Exposes window.YDUI.
 */
(function () {
  "use strict";
  /* one icon set for the website, both apps and the console (24px grid, 1.7 stroke) + the YD logo */
  const SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs><symbol id="logo" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#1f4bff"/><path d="M24 22h52v30c0 20-12 31-26 37C36 83 24 72 24 52z" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M36 33l14 18 14-18M50 51v22" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></symbol><symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2zM12 10v5M12 18h.01"/></symbol><symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></symbol><symbol id="i-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></symbol><symbol id="i-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></symbol><symbol id="i-box" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></symbol><symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/></symbol><symbol id="i-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.5 11h11L21 7H6.2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></symbol><symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 12l3 3 5-6"/></symbol><symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol><symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></symbol><symbol id="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></symbol><symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></symbol><symbol id="i-house" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></symbol><symbol id="i-inbox" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"/></symbol><symbol id="i-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol><symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></symbol><symbol id="i-ne" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></symbol><symbol id="i-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5M10 16l4-4-4-4M14 12H4"/></symbol><symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h4l2 5-3 2a11 11 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2"/></symbol><symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol><symbol id="i-power" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3v9M6.3 7a8 8 0 1011.4 0"/></symbol><symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol><symbol id="i-ship" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h18l-2.5 4.5h-13z"/><path d="M6 15V9h7v6M15 15v-4h3v4"/><path d="M2 21.5c2-1 4 1 6 0s4 1 6 0 4 1 6 0"/></symbol><symbol id="i-steer" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V21M9.6 11.2L3.3 9.5M14.4 11.2l6.3-1.7"/></symbol><symbol id="i-truck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></symbol><symbol id="i-turn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V11a4 4 0 014-4h8M14 3l4 4-4 4"/></symbol><symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></symbol><symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M16 3.5a4 4 0 010 8M22 21c-.6-2.6-2-4.4-4-5.3"/></symbol><symbol id="i-wallet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/></symbol><symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>'+'<symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol><symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></symbol><symbol id="i-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 000-17z" fill="currentColor"/></symbol></defs></svg>';
  function injectSprite() {
    if (document.getElementById("yd-sprite")) return;
    const wrap = document.createElement("div");
    wrap.id = "yd-sprite"; wrap.innerHTML = SPRITE;
    (document.body || document.documentElement).prepend(wrap);
  }
  injectSprite();
  if (!document.body) document.addEventListener("DOMContentLoaded", () => {
    const w = document.getElementById("yd-sprite"); if (w && w.parentNode !== document.body) document.body.prepend(w);
  });
  /* ── light / dark / auto theme, shared by every surface ── */
  const THEME_KEY = "yd-theme", ORDER = ["system", "light", "dark"];
  const LABEL = { system: "Auto", light: "Light", dark: "Dark", appearance: "Appearance" }, ICON = { system: "i-auto", light: "i-sun", dark: "i-moon" };
  function getTheme() { try { const t = localStorage.getItem(THEME_KEY); return ORDER.includes(t) ? t : "system"; } catch (e) { return "system"; } }
  function isDark(t) { return t === "dark" || (t === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); }
  function syncThemeUI() {
    const t = getTheme();
    // translated labels when the language module is ready (it loads after the theme code)
    const L = k => { try { const v = window.YDUI && window.YDUI.i18n && window.YDUI.i18n.t("theme." + k); return v && v !== "theme." + k ? v : LABEL[k]; } catch (e) { return LABEL[k]; } };
    document.querySelectorAll("[data-yd-theme-cycle]").forEach(b => {
      b.innerHTML = `<svg aria-hidden="true" width="18" height="18"><use href="#${ICON[t]}"/></svg>${b.hasAttribute("data-label") ? `<span>${L(t)}</span>` : ""}`;
      b.setAttribute("aria-label", `${L("appearance")}: ${L(t)}`); b.title = `${L("appearance")}: ${L(t)}`;
    });
    document.querySelectorAll("[data-yd-theme-set]").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.ydThemeSet === t)); const sp = b.querySelector("[data-tl]"); if (sp) sp.textContent = L(b.dataset.ydThemeSet); });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && !meta.dataset.fixed) meta.content = isDark(t) ? "#070b16" : (meta.dataset.light || meta.content);
  }
  function applyTheme(t) {
    const r = document.documentElement;
    if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme");
    syncThemeUI();
  }
  function setTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    applyTheme(t);
    window.dispatchEvent(new CustomEvent("yd-theme", { detail: t }));
  }
  applyTheme(getTheme());
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-yd-theme-cycle]");
    if (c) { setTheme(ORDER[(ORDER.indexOf(getTheme()) + 1) % 3]); return; }
    const s = e.target.closest("[data-yd-theme-set]");
    if (s) setTheme(s.dataset.ydThemeSet);
  });
  window.addEventListener("storage", e => { if (e.key === THEME_KEY) applyTheme(getTheme()); });
  document.addEventListener("DOMContentLoaded", syncThemeUI);
  // segmented Auto / Light / Dark control; the host page styles .seg
  function themeSegment(cls) {
    return `<div class="${cls || "seg"}" role="group" aria-label="Appearance">${ORDER.map(t => `<button type="button" data-yd-theme-set="${t}" aria-pressed="${t === getTheme()}"><svg aria-hidden="true" width="15" height="15"><use href="#${ICON[t]}"/></svg><span data-tl>${LABEL[t]}</span></button>`).join("")}</div>`;
  }

  const CATALOG = ["exc20","exc5","wl","tip","lorry","crane","fork","mixer","roller","cem","agg","sand","y12","y16","blk","ply","roof","pvc"];
  const BY_ICON = { excavator:"exc20", loader:"wl", tipper:"tip", lorry:"lorry", crane:"crane", forklift:"fork",
                    mixer:"mixer", roller:"roller", bag:"cem", pile:"sand", rebar:"y12", bricks:"blk", plank:"ply", pipe:"pvc" };

  function file(key) { return CATALOG.includes(key) ? key : (BY_ICON[key] || null); }
  // photos uploaded in the console for new machines/materials (id -> public URL)
  const IMAGES = {};
  function setImages(map) { Object.assign(IMAGES, map || {}); }

  // <img> product shot for a catalog id or an icon name; falls back to the line icon
  function thumb(key, alt) {
    if (IMAGES[key]) return `<img class="pimg" src="${IMAGES[key]}" alt="${alt ? String(alt).replace(/"/g, "&quot;") : ""}" loading="lazy" decoding="async">`;
    const f = file(key);
    if (!f) return `<svg aria-hidden="true"><use href="#i-box"/></svg>`;
    return `<img class="pimg" src="catalog/${f}.jpg" alt="${alt ? String(alt).replace(/"/g, "&quot;") : ""}" loading="lazy" decoding="async">`;
  }

  // deterministic pseudo-random so the city looks the same every render
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  /* Stylised map of Hulhumalé. viewBox 400x560.
   * opts: { id: prefix for element ids, route: [[x,y],...], from:[x,y], to:[x,y], fromLabel, toLabel }
   * Produces paths #<id>Route, #<id>Done and group #<id>Truck for the app to animate. */
  function map(opts) {
    const o = Object.assign({ id: "", route: [[132,150],[132,262],[214,262],[214,376],[296,376],[296,432]], fromLabel: "YD YARD", toLabel: "SITE" }, opts || {});
    const id = o.id, R = o.route, from = o.from || R[0], to = o.to || R[R.length - 1];
    const rand = rng(7);
    // island outline (Hulhumalé runs NNE–SSW; drawn upright here)
    const island = "M92 34 C150 18 248 22 300 44 C336 60 344 104 340 160 L330 470 C326 516 300 536 254 540 L130 540 C90 536 66 512 64 470 L56 110 C54 70 64 44 92 34Z";
    const cols = [74, 132, 214, 296, 338], rows = [60, 150, 262, 376, 486, 532];
    let blocks = "", bldgs = "";
    for (let r = 0; r < rows.length - 1; r++) {
      for (let c = 0; c < cols.length - 1; c++) {
        const x = cols[c] + 9, y = rows[r] + 9, w = cols[c + 1] - cols[c] - 18, h = rows[r + 1] - rows[r] - 18;
        if (w < 10 || h < 10) continue;
        const park = (r === 1 && c === 2);
        blocks += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="var(--map-${park ? "park" : "block"})"/>`;
        if (park) {
          for (let i = 0; i < 9; i++) bldgs += `<circle cx="${(x + 10 + rand() * (w - 20)).toFixed(1)}" cy="${(y + 10 + rand() * (h - 20)).toFixed(1)}" r="${(3 + rand() * 4).toFixed(1)}" fill="var(--map-tree)"/>`;
          continue;
        }
        // building footprints laid in a loose grid inside the block
        const nx = Math.max(1, Math.floor(w / 22)), ny = Math.max(1, Math.floor(h / 22));
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          if (rand() < 0.18) continue;
          const bw = (w / nx) - 5 - rand() * 4, bh = (h / ny) - 5 - rand() * 4;
          bldgs += `<rect x="${(x + i * (w / nx) + 2.5).toFixed(1)}" y="${(y + j * (h / ny) + 2.5).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="var(--map-bldg)"/>`;
        }
      }
    }
    const roads = cols.slice(1, 4).map(x => `M${x} 40V534`).concat(rows.slice(1, 5).map(y => `M66 ${y}H338`)).join("");
    const d = "M" + R.map(p => p.join(" ")).join(" L");
    const lbl = (x, y, t, a = 0, anchor = "middle") => `<text x="${x}" y="${y}" transform="rotate(${a} ${x} ${y})" text-anchor="${anchor}" font-family="var(--mono)" font-size="7.5" letter-spacing="1.2" fill="var(--map-label)">${t}</text>`;
    return `<svg viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map of Hulhumalé showing the route from the YD Works yard to the site">
  <defs>
    <linearGradient id="${id}sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--map-sea)"/><stop offset="1" stop-color="var(--map-sea2)"/></linearGradient>
    <pattern id="${id}wv" width="26" height="14" patternUnits="userSpaceOnUse"><path d="M0 7q6.5-5 13 0t13 0" fill="none" stroke="var(--map-wave)" stroke-width="1"/></pattern>
    <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="400" height="560" fill="url(#${id}sea)"/>
  <rect width="400" height="560" fill="url(#${id}wv)"/>
  <path d="${island}" fill="none" stroke="var(--map-reef)" stroke-width="22" stroke-linejoin="round" opacity=".55"/>
  <path d="${island}" fill="var(--map-sand)"/>
  <path d="${island}" transform="translate(200 287) scale(.965) translate(-200 -287)" fill="var(--map-land)"/>
  ${blocks}${bldgs}
  <path d="${roads}" stroke="var(--map-road)" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M214 40V534" stroke="var(--map-main)" stroke-width="11" stroke-linecap="round" fill="none"/>
  ${lbl(222, 120, "NIROLHU MAGU", 90, "start")}${lbl(100, 82, "PHASE 1", 0, "start")}${lbl(244, 520, "PHASE 2")}${lbl(30, 300, "TO MALÉ · SINAMALÉ BRIDGE", -90)}${lbl(372, 250, "INDIAN OCEAN", 90)}
  <path d="${d}" fill="none" stroke="var(--brand)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".28" filter="url(#${id}glow)"/>
  <path id="${id}Route" d="${d}" fill="none" stroke="var(--map-route-todo)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="${id}Done" d="${d}" fill="none" stroke="var(--brand)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="0 100"/>
  <g transform="translate(${from[0]} ${from[1]})">
    <rect x="-30" y="-30" width="60" height="17" rx="8.5" fill="var(--map-chip)"/>
    <text y="-18.5" text-anchor="middle" font-family="var(--mono)" font-size="7.5" font-weight="600" letter-spacing="1" fill="var(--map-chip-ink)">${o.fromLabel}</text>
    <circle r="8" fill="var(--map-chip)"/><circle r="3.2" fill="var(--map-chip-ink)"/>
  </g>
  <g transform="translate(${to[0]} ${to[1]})">
    <ellipse cy="2" rx="9" ry="3.5" fill="#000" opacity=".18"/>
    <path d="M0 0c-11-13-15-19-15-26a15 15 0 0130 0c0 7-4 13-15 26z" fill="var(--busy)"/><circle cy="-26" r="5.5" fill="#fff"/>
  </g>
  <g id="${id}Truck">
    <circle r="22" fill="var(--brand)" opacity=".16"><animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite"/></circle>
    <circle r="13" fill="var(--brand)" stroke="#fff" stroke-width="3"/>
    <g transform="translate(-7 -7) scale(.58)" stroke="#fff" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></g>
  </g>
</svg>`;
  }

  // place the truck at progress p (0..1) along the route and fill the travelled part
  function place(id, p) {
    const r = document.getElementById(id + "Route"), t = document.getElementById(id + "Truck"), dn = document.getElementById(id + "Done");
    if (!r || !t) return;
    const L = r.getTotalLength(), pt = r.getPointAtLength(L * Math.max(0, Math.min(1, p)));
    t.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    if (dn) dn.setAttribute("stroke-dasharray", `${(p * 100).toFixed(2)} 100`);
  }

  /* ── language: English / Dhivehi (Thaana, right-to-left) ── */
  const LANG_KEY = "yd-lang", DICT = { en: {}, dv: {} };
  function getLang() { try { return localStorage.getItem(LANG_KEY) === "dv" ? "dv" : "en"; } catch (e) { return "en"; } }
  let lang = getLang();
  /* Text edited in the console (Content page) wins over the built-in wording. Order: edited text in this
     language, built-in text in this language, edited English, built-in English. < and > are neutralised so
     edited text can never inject markup (some strings are placed with innerHTML). */
  const OVR = { en: {}, dv: {} };
  const clean = v => String(v).replace(/</g, "‹").replace(/>/g, "›");
  function t(key, vars) {
    let s = OVR[lang][key] ?? (DICT[lang] && DICT[lang][key]) ?? OVR.en[key] ?? DICT.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return s;
  }
  /* Dhivehi font: Faruma (A_Faruma), the standard Maldivian text face. Embedded so it works offline, in the
     native apps and in previews. unicode-range limits it to Thaana, so Latin, digits and codes stay in Geist. */
  const FARUMA = "data:font/woff2;base64,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";
  const DV_STACK = '"Faruma","A_Faruma","MV Faseyha","Noto Sans Thaana","MV Boli"';
  function installFaruma() {
    if (document.getElementById("yd-faruma")) return;
    const st = document.createElement("style"); st.id = "yd-faruma";
    st.textContent = '@font-face{font-family:"Faruma";font-style:normal;font-weight:100 900;font-display:swap;' +
      'src:url(' + FARUMA + ') format("woff2");unicode-range:U+0780-07BF,U+060C,U+061B,U+061F,U+FDF2,U+200C-200F}' +
      /* put Faruma ahead of any other Thaana face in every surface's font variables */
      'html:root{--display:"Geist",' + DV_STACK + ',ui-sans-serif,system-ui,-apple-system,sans-serif;' +
      '--body:"Geist",' + DV_STACK + ',ui-sans-serif,system-ui,-apple-system,sans-serif;' +
      '--mono:"Geist Mono",' + DV_STACK + ',ui-monospace,Menlo,monospace}' +
      '[lang="dv"]{font-family:"Geist",' + DV_STACK + ',sans-serif}';
    (document.head || document.documentElement).appendChild(st);
  }
  installFaruma();
  function ensureThaana() {
    installFaruma();
    if (document.getElementById("yd-thaana")) return;
    const st = document.createElement("style"); st.id = "yd-thaana";
    st.textContent = 'html[lang="dv"] body,html[lang="dv"] button,html[lang="dv"] input,html[lang="dv"] select,html[lang="dv"] textarea{font-family:var(--body),' + DV_STACK + ',sans-serif;letter-spacing:0}' +
      'html[lang="dv"] [data-ltr]{direction:ltr;unicode-bidi:isolate}';
    document.head.appendChild(st);
  }
  function applyLang(root) {
    const r = document.documentElement;
    r.lang = lang === "dv" ? "dv" : "en"; r.dir = lang === "dv" ? "rtl" : "ltr";
    if (lang === "dv") ensureThaana();
    (root || document).querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    (root || document).querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.querySelectorAll("[data-yd-lang-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ydLangSet === lang)));
  }
  function setLang(l) {
    lang = l === "dv" ? "dv" : "en";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang();
    window.dispatchEvent(new CustomEvent("yd-lang", { detail: lang }));
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-yd-lang-set]"); if (b) setLang(b.dataset.ydLangSet); });
  window.addEventListener("storage", e => { if (e.key === LANG_KEY) { lang = getLang(); applyLang(); window.dispatchEvent(new CustomEvent("yd-lang", { detail: lang })); } });
  document.addEventListener("DOMContentLoaded", () => applyLang());
  if (lang === "dv") { document.documentElement.lang = "dv"; document.documentElement.dir = "rtl"; }
  Object.assign(DICT.en, { "theme.system": "Auto", "theme.light": "Light", "theme.dark": "Dark", "theme.appearance": "Appearance" });
  Object.assign(DICT.dv, { "theme.system": "އޮޓޯ", "theme.light": "ލައިޓް", "theme.dark": "ޑާކް", "theme.appearance": "ފެނުން" });
  window.addEventListener("yd-lang", () => syncThemeUI());
  const i18n = {
    add(d) { for (const l of ["en", "dv"]) Object.assign(DICT[l], d[l] || {}); },
    // map = { key: { en: "…", dv: "…" } } (empty strings ignored). Re-renders when the edits changed.
    override(map) {
      const next = { en: {}, dv: {} };
      Object.keys(map || {}).forEach(k => { const v = map[k] || {}; if (v.en) next.en[k] = clean(v.en); if (v.dv) next.dv[k] = clean(v.dv); });
      if (JSON.stringify(next) === JSON.stringify(OVR)) return false;
      OVR.en = next.en; OVR.dv = next.dv;
      if (document.readyState !== "loading") { applyLang(); window.dispatchEvent(new CustomEvent("yd-lang", { detail: lang, bubbles: false })); }
      return true;
    },
    // every built-in string of this page, for the console's Content editor
    dump: () => ({ en: Object.assign({}, DICT.en), dv: Object.assign({}, DICT.dv) }),
    t, get: () => lang, set: setLang, apply: applyLang, isRTL: () => lang === "dv",
    segment(cls) { return `<div class="${cls || "seg"}" role="group" aria-label="Language"><button type="button" data-yd-lang-set="en" aria-pressed="${lang === "en"}">English</button><button type="button" data-yd-lang-set="dv" aria-pressed="${lang === "dv"}" lang="dv" style="font-family:Faruma,var(--body)">ދިވެހި</button></div>`; }
  };

  /* ── real map (MapLibre GL) when YD_CONFIG.mapStyleUrl is set; callers fall back to YDUI.map() ── */
  let mlLoading = null;
  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (mlLoading) return mlLoading;
    mlLoading = new Promise((res, rej) => {
      const base = window.YD_VENDOR_BASE || "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/";
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = base + "maplibre-gl.css"; document.head.appendChild(css);
      const js = document.createElement("script"); js.src = base + "maplibre-gl.js"; js.onload = () => res(window.maplibregl); js.onerror = rej; document.head.appendChild(js);
    });
    return mlLoading;
  }
  // opts: { center:[lat,lng], zoom, markers:[{id,lat,lng,color,label}], route:[[lat,lng],...] }
  async function liveMap(el, opts) {
    const cfg = window.YD_CONFIG || {};
    if (!cfg.mapStyleUrl || !el) return null;
    try {
      const ml = await loadMapLibre();
      const c = opts.center || [cfg.yard.lat, cfg.yard.lng];
      const m = new ml.Map({ container: el, style: cfg.mapStyleUrl, center: [c[1], c[0]], zoom: opts.zoom || 14.5, attributionControl: { compact: true } });
      const markers = {};
      const api = {
        map: m,
        setMarker(id, lat, lng, o = {}) {
          if (lat == null || lng == null) return;
          if (!markers[id]) {
            const d = document.createElement("div");
            d.style.cssText = `width:${o.size || 22}px;height:${o.size || 22}px;border-radius:50%;background:${o.color || "#1f4bff"};border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.35)`;
            if (o.label) d.title = o.label;
            markers[id] = new ml.Marker({ element: d }).setLngLat([lng, lat]).addTo(m);
          } else markers[id].setLngLat([lng, lat]);
        },
        setRoute(points) {
          const data = { type: "Feature", geometry: { type: "LineString", coordinates: points.map(p => [p[1], p[0]]) } };
          const go = () => { if (m.getSource("yd-route")) m.getSource("yd-route").setData(data); else { m.addSource("yd-route", { type: "geojson", data }); m.addLayer({ id: "yd-route", type: "line", source: "yd-route", paint: { "line-color": "#1f4bff", "line-width": 5, "line-opacity": .85 } }); } };
          m.loaded() ? go() : m.once("load", go);
        },
        fit(points, pad = 60) { if (!points.length) return; const b = new ml.LngLatBounds(); points.forEach(p => b.extend([p[1], p[0]])); m.fitBounds(b, { padding: pad, maxZoom: 16 }); },
        remove() { m.remove(); }
      };
      (opts.markers || []).forEach(mk => api.setMarker(mk.id, mk.lat, mk.lng, mk));
      if (opts.route) api.setRoute(opts.route);
      return api;
    } catch (e) { return null; }
  }
  const navUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  /* ── error & usage reporting → console Insights (anonymous; only when the backend is configured) ── */
  const SURFACE = window.YD_SURFACE || (/\/driver/.test(location.pathname) ? "driver" : /\/(console|admin)/.test(location.pathname) ? "console"
                : /\/(app|customer-app)/.test(location.pathname) ? "customer" : "website");
  /* console Content edits for this page (from yd-settings.js: content_website / content_customer_app / content_driver_app) */
  const CONTENT_KEY = { website: "content_website", customer: "content_customer_app", driver: "content_driver_app" }[SURFACE];
  function applyContent() { if (CONTENT_KEY && window.YDSET) i18n.override((YDSET.get() || {})[CONTENT_KEY] || {}); }
  applyContent();
  window.addEventListener("yd-settings", applyContent);
  const SESSION = (() => { try { let s = sessionStorage.getItem("yd-sid"); if (!s) { s = Math.random().toString(36).slice(2, 14); sessionStorage.setItem("yd-sid", s); } return s; } catch (e) { return Math.random().toString(36).slice(2, 14); } })();
  let queue = [], timer = null, sentErrors = 0;
  function flush() {
    timer = null;
    const cfg = window.YD_CONFIG || {};
    if (!cfg.monitoring || !cfg.supabaseUrl || cfg.supabaseUrl.indexOf("__") === 0 || !queue.length) { queue = []; return; }
    const rows = queue.splice(0, 20);
    try {
      fetch(cfg.supabaseUrl + "/rest/v1/client_events", { method: "POST", keepalive: true,
        headers: { apikey: cfg.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(rows) }).catch(() => {});
    } catch (e) {}
  }
  function report(kind, name, message, detail) {
    queue.push({ kind, surface: SURFACE, name: String(name).slice(0, 80), message: String(message || "").slice(0, 1000),
      detail: detail || {}, url: (location.pathname + location.hash).slice(0, 300), session_id: SESSION, app_version: "1.0.0" });
    if (!timer) timer = setTimeout(flush, kind === "error" ? 500 : 4000);
  }
  window.addEventListener("error", e => { if (sentErrors++ < 10) report("error", (e.error && e.error.name) || "Error", e.message, { src: e.filename, line: e.lineno, stack: e.error && String(e.error.stack).slice(0, 1500) }); });
  window.addEventListener("unhandledrejection", e => { if (sentErrors++ < 10) report("error", "UnhandledRejection", (e.reason && (e.reason.message || e.reason)) || "", { stack: e.reason && String(e.reason.stack || "").slice(0, 1500) }); });
  window.addEventListener("pagehide", flush);
  const track = (name, detail) => report("event", name, "", detail);

  /* ── desktop preview: show the phone apps inside a realistic iPhone frame ──
     Only on wide screens in a normal browser tab; real phones and installed apps are untouched. */
  function deviceFrame() {
    const app = document.querySelector(".app");
    const C = window.Capacitor;
    if (!app || (C && C.isNativePlatform && C.isNativePlatform()) || matchMedia("(display-mode: standalone)").matches) return;
    if (document.getElementById("yd-device-css")) return;
    const css = document.createElement("style"); css.id = "yd-device-css";
    css.textContent = `@media (min-width:600px){
      html body .app{width:393px;max-width:393px;height:min(852px,calc(100vh - 56px));margin:28px auto 0;border-radius:56px;border:0;
        box-shadow:0 0 0 10px #0d0e11,0 0 0 12px #4a4d55,0 0 0 13px #24262b,0 50px 120px -30px rgba(0,0,0,.85)}
      .yd-sb{position:relative;flex:none;height:54px;display:flex;align-items:center;justify-content:space-between;padding:6px 34px 0 46px;
        font:600 16px/1 -apple-system,"SF Pro Text","Geist",system-ui,sans-serif;letter-spacing:-.01em;z-index:60;transition:background .3s,color .3s}
      .yd-sb .isl{position:absolute;left:50%;top:11px;width:124px;height:36px;margin-left:-62px;border-radius:20px;background:#000}
      .yd-sb .ic{display:flex;gap:6px;align-items:center}
      .yd-sb svg{display:block}
      .yd-home{position:absolute;left:50%;bottom:8px;width:136px;height:5px;margin-left:-68px;border-radius:3px;z-index:80;pointer-events:none;transition:background .3s}
      .yd-btn{position:fixed;width:4px;border-radius:2px;background:#3a3d44;z-index:0}
    }
    @media (max-width:599px){.yd-sb,.yd-home,.yd-btn{display:none!important}}`;
    document.head.appendChild(css);
    const sb = document.createElement("div"); sb.className = "yd-sb"; sb.setAttribute("aria-hidden", "true");
    sb.innerHTML = `<span class="t"></span><span class="isl"></span><span class="ic">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.2-2.6a3.3 3.3 0 00-4.4 0z" fill="currentColor"/><path d="M3.3 6.6a6.8 6.8 0 019.4 0l-1.3 1.5a4.8 4.8 0 00-6.8 0z" fill="currentColor"/><path d="M.8 3.8a10.6 10.6 0 0114.4 0l-1.3 1.5a8.6 8.6 0 00-11.8 0z" fill="currentColor"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2.4" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg></span>`;
    app.prepend(sb);
    const home = document.createElement("div"); home.className = "yd-home"; home.setAttribute("aria-hidden", "true"); app.appendChild(home);
    const btns = [["l", 120, 30], ["l", 175, 62], ["l", 250, 62], ["r", 200, 96]].map(([side, top, h]) => {
      const b = document.createElement("div"); b.className = "yd-btn"; b.dataset.side = side; b.dataset.top = top; b.style.height = h + "px"; document.body.appendChild(b); return b; });
    const lum = c => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b, a] = m.map(Number); if (a === 0) return null; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    const tick = () => {
      sb.querySelector(".t").textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }).replace(/^0/, "");
      // status bar takes the colour of whatever sits at the top of the screen
      let el = sb.nextElementSibling; while (el && (el.hidden || getComputedStyle(el).display === "none")) el = el.nextElementSibling;
      let bg = el ? getComputedStyle(el).backgroundColor : "", L = lum(bg);
      if (L == null) { bg = getComputedStyle(app).backgroundColor; L = lum(bg); }
      sb.style.background = bg; sb.style.color = L > .55 ? "#000" : "#fff";
      home.style.background = lum(getComputedStyle(app).backgroundColor) > .55 ? "rgba(0,0,0,.85)" : "rgba(255,255,255,.85)";
      const r = app.getBoundingClientRect();
      btns.forEach(b => { b.style.left = (b.dataset.side === "l" ? r.left - 16 : r.right + 12) + "px"; b.style.top = (r.top + +b.dataset.top) + "px"; });
    };
    tick(); setInterval(tick, 1000); addEventListener("resize", tick); addEventListener("yd-theme", () => setTimeout(tick, 50));
    new MutationObserver(() => requestAnimationFrame(tick)).observe(app, { attributes: true, subtree: true, attributeFilter: ["hidden", "class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", deviceFrame); else setTimeout(deviceFrame, 0);

  async function loadLiveCatalog() {
    const cfg = window.YD_CONFIG || {}, CAT = window.YDCAT;
    if (!CAT || !cfg.supabaseUrl || cfg.supabaseUrl.indexOf("__") === 0) return false;
    try {
      const h = { headers: { apikey: cfg.supabaseKey } };
      const [m, t] = await Promise.all([
        fetch(cfg.supabaseUrl + "/rest/v1/machines?select=*&order=sort", h).then(r => r.ok ? r.json() : null),
        fetch(cfg.supabaseUrl + "/rest/v1/materials?select=*&order=sort", h).then(r => r.ok ? r.json() : null)]);
      if (!m || !t || !m.length || !t.length) return false;   // keep the built-in list if the live one is empty or unreachable
      const img = {};
      CAT.machines.splice(0, CAT.machines.length, ...m.map(r => { if (r.image_url) img[r.id] = r.image_url;
        return { id: r.id, code: r.code, name: r.name, category: r.category, specs: r.specs || {}, rate_hr: +r.rate_hr, rate_day: +r.rate_day, rate_mo: +r.rate_mo,
          icon: r.id, sort: r.sort, active: r.active, nextFree: null }; }));
      CAT.materials.splice(0, CAT.materials.length, ...t.map(r => { if (r.image_url) img[r.id] = r.image_url;
        return { id: r.id, name: r.name, category: r.category, unit: r.unit, price: +r.price, step: r.step, icon: r.id, sort: r.sort, active: r.active,
          stock: r.stock_qty == null ? null : +r.stock_qty }; }));
      setImages(img);
      window.dispatchEvent(new CustomEvent("yd-catalog"));
      return true;
    } catch (e) { return false; }
  }

  window.YDUI = { thumb, file, setImages, loadLiveCatalog, map, place, i18n, liveMap, navUrl, track, surface: SURFACE, theme: { get: getTheme, set: setTheme, isDark: () => isDark(getTheme()), sync: syncThemeUI, segment: themeSegment } };
})();
