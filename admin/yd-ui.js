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
  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) ?? DICT.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return s;
  }
  function ensureThaana() {
    if (document.getElementById("yd-thaana")) return;
    const l = document.createElement("link"); l.id = "yd-thaana"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Thaana:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
    const st = document.createElement("style");
    st.textContent = 'html[lang="dv"] body,html[lang="dv"] button,html[lang="dv"] input,html[lang="dv"] select,html[lang="dv"] textarea{font-family:"Noto Sans Thaana","MV Faseyha","MV Boli",var(--body),sans-serif;letter-spacing:0}' +
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
    t, get: () => lang, set: setLang, apply: applyLang, isRTL: () => lang === "dv",
    segment(cls) { return `<div class="${cls || "seg"}" role="group" aria-label="Language"><button type="button" data-yd-lang-set="en" aria-pressed="${lang === "en"}">English</button><button type="button" data-yd-lang-set="dv" aria-pressed="${lang === "dv"}" lang="dv" style="font-family:'Noto Sans Thaana',var(--body)">ދިވެހި</button></div>`; }
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
  const SURFACE = /\/driver/.test(location.pathname) ? "driver" : /\/(console|admin)/.test(location.pathname) ? "console"
                : /\/(app|customer-app)/.test(location.pathname) ? "customer" : "website";
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
