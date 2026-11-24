#!/usr/bin/env python3
"""Build the YD Works customer and driver apps into installable packages.

For each app this writes mobile/<app>/www/, which is:
  * a Progressive Web App you can host (Add to Home Screen on iPhone/Android), and
  * the web folder Capacitor copies into the native Android and iOS projects.

Run:  python3 mobile/build.py   (then `npx cap sync` inside mobile/<app>)
"""
import json, re, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "mobile" / "brand"

APPS = {
    "customer": dict(src="customer-app", name="YD Works", short="YD Works",
                     desc="Hire heavy equipment, order building materials and track deliveries in Hulhumalé.",
                     theme="#070b16", bg="#f5f6f8", top="#070b16", version="1.0.0"),
    "driver": dict(src="driver-app", name="YD Driver", short="YD Driver",
                   desc="Accept YD Works jobs, run trips and capture proof of delivery.",
                   theme="#070b16", bg="#070b16", top="#070b16", version="1.0.0"),
    # installable web apps (PWA) for hosting; not wrapped in native projects
    "website": dict(src="website", name="YD Works · Hulhumalé", short="YD Works",
                    desc="Heavy equipment hire, building materials, house building and logistics in Hulhumalé, Maldives.",
                    theme="#070b16", bg="#f6f7f9", top="#070b16", version="1.0.0", web=True, out="deploy",
                    orientation="any"),
    "admin": dict(src="admin", name="YD Works Console", short="YD Console",
                  desc="Run YD Works: dispatch, drivers, fleet, materials, payments, projects and reports.",
                  theme="#070b16", bg="#f5f6f8", top="#070b16", version="1.0.0", web=True, out="deploy/console",
                  orientation="any"),
}

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="description" content="{desc}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{short}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="format-detection" content="telephone=no">
<script>window.YD_VENDOR_BASE = "vendor/"; window.YD_JSPDF_SRC = "vendor/jspdf.umd.min.js";</script>
<style>
  /* installed-app shell: replaces the artifact host's safe-area padding */
  html{{height:100%;background:{top}}}
  body{{margin:0;height:100%;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}}
  input,textarea,select{{-webkit-user-select:text;user-select:text}}
  img{{max-width:100%}}
  [hidden]{{display:none!important}}
</style>
</head>
<body>
"""

# lighter shell for the website and console: normal page scrolling, selectable text, safe areas like the preview host
WEB_HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{desc}">
<meta name="theme-color" content="{theme}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{short}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
{seo}
<script>window.YD_VENDOR_BASE = "vendor/"; window.YD_JSPDF_SRC = "vendor/jspdf.umd.min.js";</script>
<style>
  :root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
  body{{margin:0}}
  img{{max-width:100%}}
  [hidden]{{display:none!important}}
</style>
</head>
<body>
"""

SITE = "https://yd-mv.com/"

def seo_head():
    """Search & social metadata for the public website (business details for Google, share previews)."""
    ld = {
        "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", "name": "YD Works",
        "description": "Heavy equipment hire with operators, building materials, house building and logistics in Hulhumalé, Maldives.",
        "url": SITE, "telephone": "+960 992 0202", "email": "yd@yd-mv.com", "image": SITE + "assets/og-image.jpg", "logo": SITE + "icons/icon-512.png",
        "address": {"@type": "PostalAddress", "addressLocality": "Hulhumalé", "addressCountry": "MV"},
        "geo": {"@type": "GeoCoordinates", "latitude": 4.2167, "longitude": 73.5405},
        "areaServed": ["Hulhumalé", "Malé", "Villimalé", "Thilafushi", "Maldives"],
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": d, "opens": o, "closes": c}
            for d in ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] for (o, c) in (("07:30", "12:00"), ("13:00", "18:00"))],
        "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.5", "reviewCount": "13"},
        "makesOffer": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in
            ["Excavator hire with operator", "Tipper truck hire", "Lorry crane hire", "Building materials delivery", "House construction", "Logistics and haulage"]],
    }
    title = "YD Works · Equipment hire, building materials & house building in Hulhumalé"
    desc = "Hire excavators, tippers and cranes with operators, order cement, sand and rebar with same-day delivery, and build your house with one team in Hulhumalé, Maldives. Hotline 992 0202."
    return f"""<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}">
<meta property="og:type" content="website"><meta property="og:site_name" content="YD Works">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}"><meta property="og:image" content="{SITE}assets/og-image.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="en_MV">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="{SITE}assets/og-image.jpg">
<link rel="alternate" hreflang="en" href="{SITE}"><link rel="alternate" hreflang="dv" href="{SITE}?lang=dv">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>"""


TAIL = """
<script>
/* offline support for the installed web app (native builds bundle files, so skip there) */
if ("serviceWorker" in navigator && !window.Capacitor && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>
</body>
</html>
"""

SW = """/* YD Works service worker: app shell offline, network-first for the page */
const CACHE = "{cache}";
const SHELL = {shell};
self.addEventListener("install", e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  const r = e.request; if (r.method !== "GET") return;
  if (r.mode === "navigate") {{
    e.respondWith(fetch(r).then(res => {{ caches.open(CACHE).then(c => c.put("./", res.clone())); return res; }}).catch(() => caches.match("./").then(m => m || caches.match("index.html"))));
    return;
  }}
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {{
    if (res.ok && new URL(r.url).origin === location.origin) caches.open(CACHE).then(c => c.put(r, res.clone()));
    return res;
  }})));
}});
"""


def icons(app, out):
    d = out / "icons"; d.mkdir(parents=True, exist_ok=True)
    full = Image.open(BRAND / f"{app}-icon-1024.png").convert("RGB")
    mask = Image.open(BRAND / f"{app}-icon-maskable-1024.png").convert("RGB")
    for s in (192, 512):
        full.resize((s, s), Image.LANCZOS).save(d / f"icon-{s}.png", optimize=True)
        mask.resize((s, s), Image.LANCZOS).save(d / f"maskable-{s}.png", optimize=True)
    full.resize((180, 180), Image.LANCZOS).save(d / "apple-touch-icon.png", optimize=True)


def build(app, cfg):
    src = ROOT / cfg["src"]
    out = ROOT / cfg["out"] if cfg.get("out") else ROOT / "mobile" / app / "www"
    if out.exists():
        if app == "website":   # deploy root also holds the other apps; only clear the website's own files
            for p in out.iterdir():
                if p.name not in ("app", "driver", "console"):
                    shutil.rmtree(p) if p.is_dir() else p.unlink()
        else:
            shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    if (src / "assets").exists():
        shutil.copytree(src / "assets", out / "assets")
    page = (src / "index.html").read_text(encoding="utf-8")
    page = page.replace('<meta charset="utf-8">\n', "", 1)
    # bundle fonts so the installed app keeps its typeface offline
    fonts = out / "fonts"; fonts.mkdir()
    for f in (BRAND / "fonts").glob("*.woff2"):
        shutil.copy(f, fonts / f.name)
    (fonts / "fonts.css").write_text((BRAND / "fonts" / "fonts.css").read_text().replace("url(fonts/", "url("), encoding="utf-8")
    # bundle the backend client so the installed apps don't depend on a CDN
    (out / "vendor").mkdir()
    shutil.copy(ROOT / "shared" / "vendor" / "supabase.js", out / "vendor" / "supabase.js")
    shutil.copy(ROOT / "shared" / "yd-backend.js", out / "yd-backend.js")
    shutil.copy(ROOT / "shared" / "yd-ui.js", out / "yd-ui.js")
    shutil.copy(ROOT / "shared" / "yd-catalog.js", out / "yd-catalog.js")
    shutil.copy(ROOT / "shared" / "yd-config.js", out / "yd-config.js")
    shutil.copy(ROOT / "shared" / "yd-docs.js", out / "yd-docs.js")
    shutil.copy(ROOT / "shared" / "yd-settings.js", out / "yd-settings.js")
    if app == "admin":
        shutil.copy(ROOT / "shared" / "yd-content-catalog.js", out / "yd-content-catalog.js")
    for f in ("jspdf.umd.min.js", "maplibre-gl.js", "maplibre-gl.css"):
        shutil.copy(ROOT / "shared" / "vendor" / f, out / "vendor" / f)
    shutil.copytree(ROOT / "shared" / "catalog", out / "catalog")
    page = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@[^"]*"></script>', '<script src="vendor/supabase.js"></script>', page)
    page = re.sub(r'<link rel="preconnect"[^>]*>\n?', "", page)
    page = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">', '<link rel="stylesheet" href="fonts/fonts.css">', page)
    if app == "website":
        # on the real site the apps live next to it; the preview-only links are switched off
        page = page.replace('href="../customer-app/index.html"', 'href="app/"').replace('href="../driver-app/index.html"', 'href="driver/"')
        page = re.sub(r'if\(!/\^\(localhost[^{]*\{', 'if(false){', page, count=1)
    seo = ""
    if app == "website":
        seo = seo_head()
        page = re.sub(r"<title>.*?</title>\n?", "", page, count=1)
        page = re.sub(r'<meta name="description"[^>]*>\n?', "", page, count=1)
        # legal pages + crawler files
        for f in ("privacy.html", "terms.html", "refunds.html", "legal.css"):
            if (src / f).exists():
                shutil.copy(src / f, out / f)
        urls = ["", "privacy.html", "terms.html", "refunds.html"]
        (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "".join(f"  <url><loc>{SITE}{u}</loc><changefreq>{'weekly' if not u else 'yearly'}</changefreq></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")
        (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /console/\nDisallow: /driver/\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    elif app == "admin" or app == "driver":
        seo = '<meta name="robots" content="noindex, nofollow">'
    cfg = dict(cfg, seo=seo)
    (out / "index.html").write_text((WEB_HEAD if cfg.get("web") else HEAD).format(**cfg) + page + TAIL, encoding="utf-8")
    icons(app, out)
    manifest = {
        "name": cfg["name"], "short_name": cfg["short"], "description": cfg["desc"],
        "id": f"./?app={app}", "start_url": "./", "scope": "./", "display": "standalone",
        "orientation": cfg.get("orientation", "portrait"), "background_color": cfg["bg"], "theme_color": cfg["theme"],
        "categories": ["business", "productivity"],
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (out / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    shell = ["./", "index.html", "manifest.webmanifest"] + sorted(
        str(p.relative_to(out)) for p in out.rglob("*") if p.is_file() and p.suffix in {".jpg", ".png", ".woff2", ".css", ".js"} and p.name != "sw.js")
    (out / "sw.js").write_text(SW.format(cache=f"yd-{app}-{cfg['version']}", shell=json.dumps(shell)), encoding="utf-8")
    print(f"built {app}: {out}  ({sum(p.stat().st_size for p in out.rglob('*') if p.is_file())//1024} KB)")


def assemble():
    """deploy/ = one folder to host: website at /, customer app at /app, driver app at /driver, console at /console."""
    dep = ROOT / "deploy"
    for app, sub in (("customer", "app"), ("driver", "driver")):
        dst = dep / sub
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(ROOT / "mobile" / app / "www", dst)
    print(f"deploy ready: {dep}  (/, /app, /driver, /console)")


if __name__ == "__main__":
    for k, v in APPS.items():
        build(k, v)
    assemble()
