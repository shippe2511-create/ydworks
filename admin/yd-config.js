/* YD Works client configuration. Everything here is public (safe to ship in apps).
 * Fill these in when the matching service is set up; until then the apps use their built-in fallbacks.
 */
window.YD_CONFIG = Object.assign({
  // Supabase project (public). Leave the placeholders until the project exists.
  supabaseUrl: "__SUPABASE_URL__",
  supabaseKey: "__SUPABASE_PUBLISHABLE_KEY__",
  // WhatsApp chat: the hotline 992 0202 (international format, digits only)
  whatsapp: "9609920202",
  // Legal pages (hosted with the website)
  legal: { privacy: "privacy.html", terms: "terms.html", refunds: "refunds.html", base: "https://yd-mv.com/" },
  // Send app errors and anonymous usage events (searches, orders placed) to the console's Insights page
  monitoring: true,
  // Map tiles (MapLibre style URL), e.g. https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
  // or a Mapbox style via a MapLibre-compatible URL. Empty = the built-in drawn map of Hulhumalé.
  mapStyleUrl: "",
  // YD Works yard (approximate; adjust to the exact gate position)
  yard: { lat: 4.2167, lng: 73.5405, label: "YD Works yard" },
  // Native push: switch on only after google-services.json (Android) / APNs key (iOS) are added to the app projects
  push: false,
  // Card payments: switch on once BML Connect secrets are set on the `payments` function
  cardPayments: false,
  // Phone sign-in: switch on once an SMS provider is configured in Supabase Auth → Providers → Phone
  phoneLogin: false
}, window.YD_CONFIG || {});
