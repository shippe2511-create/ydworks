/* YD Works backend client (Supabase). Shared by the customer and driver apps.
 * Exposes window.YDB. If the backend can't be reached (no network, or a sandbox
 * that blocks outside requests) init() resolves false and the apps run their demo mode.
 * The publishable key is safe to ship in apps: every table is protected by RLS and
 * all writes go through server functions that check who is calling.
 */
(function () {
  "use strict";
  const CFG = window.YD_CONFIG || {};
  const URL = CFG.supabaseUrl || "__SUPABASE_URL__";
  const KEY = CFG.supabaseKey || "__SUPABASE_PUBLISHABLE_KEY__";

  const Y = { live: false, sb: null, user: null, profile: null, url: URL, key: KEY };

  const initials = n => (n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join("") || "YD";
  Y.initials = initials;

  Y.init = async function () {
    if (!window.supabase || URL.indexOf("__") === 0) return false;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(URL + "/auth/v1/health", { headers: { apikey: KEY }, signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) return false;
    } catch (e) { return false; }
    // a password-reset email link lands here with #...type=recovery; let supabase-js read it
    const recovering = /type=recovery/.test(location.hash);
    Y.sb = window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: recovering, storageKey: "ydworks-auth" }
    });
    Y.recovery = recovering;
    Y.sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") { Y.recovery = true; window.dispatchEvent(new CustomEvent("yd-recovery")); } });
    Y.live = true;
    const { data } = await Y.sb.auth.getSession();
    if (data.session) { Y.user = data.session.user; await Y.loadProfile(); }
    return true;
  };

  Y.loadProfile = async function () {
    const { data, error } = await Y.sb.from("profiles").select("*").eq("id", Y.user.id).single();
    if (error) throw error;
    Y.profile = data;
    return data;
  };

  Y.signIn = async function (email, password) {
    const { data, error } = await Y.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    Y.user = data.user;
    await Y.loadProfile();
    return Y.profile;
  };

  // returns "signed-in" or "confirm-email"
  Y.signUp = async function (email, password, fullName, phone) {
    const { data, error } = await Y.sb.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
    if (error) throw error;
    if (!data.session) return "confirm-email";
    Y.user = data.user;
    await Y.loadProfile();
    return "signed-in";
  };

  /* ── forgot password ── */
  Y.resetPassword = async function (email) {
    const { error } = await Y.sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  };
  Y.setNewPassword = async function (password) {
    const { data, error } = await Y.sb.auth.updateUser({ password });
    if (error) throw error;
    Y.recovery = false; Y.user = data.user;
    history.replaceState(null, "", location.pathname + location.search);
    await Y.loadProfile();
    return Y.profile;
  };

  /* ── account ── */
  Y.deleteAccount = async function () {
    await Y.rpc("delete_my_account", {});
    try { await Y.sb.auth.signOut(); } catch (e) {}
    Y.user = null; Y.profile = null;
  };
  Y.rateOrder = (orderUuid, stars, comment) => Y.rpc("rate_order", { p_order: orderUuid, p_stars: stars, p_comment: comment || "" });
  Y.reschedule = (orderUuid, startIso) => Y.rpc("reschedule_order", { p_order: orderUuid, p_start: startIso });

  Y.signOut = async function () {
    await Y.sb.auth.signOut();
    Y.user = null; Y.profile = null;
  };

  Y.catalog = async function () {
    const [m, t] = await Promise.all([
      Y.sb.from("machines").select("*").order("sort"),
      Y.sb.from("materials").select("*").order("sort")
    ]);
    if (m.error) throw m.error;
    if (t.error) throw t.error;
    return {
      machines: m.data.map(r => ({
        id: r.id, code: r.code, name: r.name, icon: r.icon, cat: r.category, specs: r.specs || {},
        rate: { hr: +r.rate_hr, day: +r.rate_day, mo: +r.rate_mo },
        busy: !!(r.busy_until && Date.parse(r.busy_until) > Date.now())
      })),
      materials: t.data.map(r => ({ id: r.id, name: r.name, unit: r.unit, price: +r.price, cat: r.category, icon: r.icon, step: r.step }))
    };
  };

  // admin-managed settings: contact, announcement, pricing, ordering (readable without signing in)
  Y.settings = async function () {
    const { data, error } = await Y.sb.from("app_settings").select("key,value");
    if (error) throw error;
    const s = {}; data.forEach(r => { s[r.key] = r.value; });
    return s;
  };

  /* ── phone sign-in (SMS one-time code) ── */
  Y.normPhone = p => { const d = String(p || "").replace(/\D/g, ""); return d.length === 7 ? "+960" + d : d ? "+" + d : ""; };
  Y.sendCode = async function (phone) {
    const { error } = await Y.sb.auth.signInWithOtp({ phone: Y.normPhone(phone) });
    if (error) throw error;
  };
  Y.verifyCode = async function (phone, code, fullName) {
    const { data, error } = await Y.sb.auth.verifyOtp({ phone: Y.normPhone(phone), token: String(code).trim(), type: "sms" });
    if (error) throw error;
    Y.user = data.user;
    await Y.loadProfile();
    if (fullName && !Y.profile.full_name) { await Y.sb.from("profiles").update({ full_name: fullName }).eq("id", Y.user.id); Y.profile.full_name = fullName; }
    return Y.profile;
  };
  Y.updateProfile = async function (patch) {
    const { data, error } = await Y.sb.from("profiles").update(patch).eq("id", Y.user.id).select().single();
    if (error) throw error;
    Y.profile = data; return data;
  };

  /* ── notifications ── */
  Y.notifications = async function (limit = 50) {
    const { data, error } = await Y.sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error; return data;
  };
  Y.markRead = async function (ids) {
    if (!ids.length) return;
    await Y.sb.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };
  Y.watchTable = function (table, cb, filter) {
    let t = null; const fire = p => { clearTimeout(t); t = setTimeout(() => cb(p), 200); };
    const opts = { event: "*", schema: "public", table }; if (filter) opts.filter = filter;
    const chan = Y.sb.channel("yd-" + table + "-" + Math.random().toString(36).slice(2)).on("postgres_changes", opts, fire).subscribe();
    return () => Y.sb.removeChannel(chan);
  };
  // native push (Capacitor). Only when YD_CONFIG.push is on (needs Firebase/APNs set up in the app projects).
  Y.registerPush = async function (onMessage) {
    const C = window.Capacitor, cfg = window.YD_CONFIG || {};
    if (!cfg.push || !C || !C.isNativePlatform || !C.isNativePlatform() || !Y.user) return false;
    const PN = C.registerPlugin("PushNotifications");
    const perm = await PN.requestPermissions();
    if (perm.receive !== "granted") return false;
    PN.addListener("registration", async t => {
      await Y.sb.from("device_tokens").upsert({ token: t.value, user_id: Y.user.id, platform: C.getPlatform(), updated_at: new Date().toISOString() });
    });
    if (onMessage) { PN.addListener("pushNotificationReceived", onMessage); PN.addListener("pushNotificationActionPerformed", a => onMessage(a.notification, true)); }
    await PN.register();
    return true;
  };

  /* ── sites ── */
  Y.sites = async function () { const { data, error } = await Y.sb.from("sites").select("*").order("is_default", { ascending: false }).order("created_at"); if (error) throw error; return data; };
  Y.saveSite = async function (site) {
    if (site.is_default) await Y.sb.from("sites").update({ is_default: false }).eq("customer_id", Y.user.id);
    const q = site.id ? Y.sb.from("sites").update(site).eq("id", site.id) : Y.sb.from("sites").insert(site);
    const { data, error } = await q.select().single(); if (error) throw error; return data;
  };
  Y.deleteSite = async function (id) { const { error } = await Y.sb.from("sites").delete().eq("id", id); if (error) throw error; };

  /* ── booking calendar ── */
  Y.machineBusy = async function (from, to, machineId) {
    const { data, error } = await Y.sb.rpc("machine_busy", { p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_machine: machineId || null });
    if (error) throw error;
    return data.map(b => ({ machine_id: b.machine_id, start: Date.parse(b.starts_at), end: Date.parse(b.ends_at) }));
  };

  /* ── payments ── */
  Y.payTransfer = async function (orderUuid, file, reference) {
    const ext = (file.type || "").includes("pdf") ? "pdf" : "jpg";
    const blob = ext === "jpg" ? await Y.compressImage(file) : file;
    const path = `${orderUuid}/${Date.now()}-slip.${ext}`;
    const up = await Y.sb.storage.from("slips").upload(path, blob, { contentType: ext === "pdf" ? "application/pdf" : "image/jpeg" });
    if (up.error) throw new Error(up.error.message);
    return Y.rpc("submit_transfer", { p_order: orderUuid, p_slip_path: path, p_reference: reference || "" });
  };
  Y.payCard = async function (orderUuid) {
    const { data, error } = await Y.sb.functions.invoke("payments/checkout", { body: { order_id: orderUuid } });
    if (error || !data || !data.url) throw new Error((data && data.error) || (error && error.message) || "Card payment is not available");
    return data.url;
  };
  Y.signedUrl = async function (bucket, path, seconds = 3600) {
    const { data, error } = await Y.sb.storage.from(bucket).createSignedUrl(path, seconds);
    if (error) throw error; return data.signedUrl;
  };

  /* ── projects (house building) ── */
  Y.projects = async function () {
    const { data, error } = await Y.sb.from("projects").select("*, project_milestones(*), project_updates(*)").order("created_at", { ascending: false });
    if (error) throw error;
    for (const p of data) {
      p.project_milestones.sort((a, b) => a.sort - b.sort);
      p.project_updates.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      for (const u of p.project_updates) u.photo_urls = await Promise.all((u.photos || []).map(x => Y.signedUrl("projects", x).catch(() => null)));
    }
    return data;
  };

  /* ── driver ── */
  Y.reportLocation = (lat, lng) => Y.sb.rpc("report_location", { p_lat: lat, p_lng: lng });
  Y.logFuel = (litres, cost, odometer) => Y.rpc("driver_log_fuel", { p_litres: litres, p_cost: cost || 0, p_odometer: odometer || null });
  Y.submitInspection = (items, passed, defects, photoPath) => Y.rpc("driver_submit_inspection", { p_items: items, p_passed: passed, p_defects: defects || "", p_photo: photoPath || null });

  Y.fuelLogs = async function (days = 30) {
    const { data, error } = await Y.sb.from("fuel_logs").select("*").gte("created_at", new Date(Date.now() - days * 864e5).toISOString()).order("created_at", { ascending: false });
    if (error) throw error; return data;
  };
  Y.inspections = async function (limit = 20) {
    const { data, error } = await Y.sb.from("inspections").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error; return data;
  };
  // defect photo → storage bucket 'defects' at {driverId}/..., then pass the path to submitInspection
  Y.uploadDefectPhoto = async function (file) {
    const blob = await Y.compressImage(file);
    const path = `${Y.user.id}/${Date.now()}-defect.jpg`;
    const { error } = await Y.sb.storage.from("defects").upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw new Error(error.message); return path;
  };

  Y.toJob = function (r) {
    const history = {};
    (r.order_events || []).forEach(e => { history[e.status] = Date.parse(e.at); });
    return {
      id: r.ref, uuid: r.id, kind: r.kind, title: r.title, icon: r.icon,
      lines: (r.order_lines || []).slice().sort((a, b) => a.sort - b.sort).map(l => [l.label, +l.qty, +l.unit_price]),
      site: r.site, when: r.scheduled_label, note: r.note, total: +r.total,
      status: r.status, progress: r.progress || 0,
      driver: r.driver_id ? { id: r.driver_id, name: r.driver_name || "Driver", unit: r.driver_unit || "", init: initials(r.driver_name) } : null,
      customer: { name: r.customer_name || "", phone: r.customer_phone || "" },
      createdAt: Date.parse(r.created_at), history,
      pod: r.pod_name || null,
      earned: r.driver_earning != null ? +r.driver_earning : null,
      doneAt: r.completed_at ? Date.parse(r.completed_at) : null,
      source: r.source || "app", paymentMethod: r.payment_method || "cod", paymentStatus: r.payment_status || "unpaid",
      invoiceNo: r.invoice_no || null, gst: r.gst_amount != null ? +r.gst_amount : null,
      siteLat: r.site_lat, siteLng: r.site_lng, driverLat: r.driver_lat, driverLng: r.driver_lng,
      startsAt: r.starts_at ? Date.parse(r.starts_at) : null, endsAt: r.ends_at ? Date.parse(r.ends_at) : null,
      live: true
    };
  };

  Y.fetchOrders = async function () {
    const { data, error } = await Y.sb.from("orders")
      .select("*, order_lines(*), order_events(*)")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data.map(Y.toJob);
  };

  Y.rpc = async function (fn, args) {
    const { data, error } = await Y.sb.rpc(fn, args);
    if (error) throw new Error(error.message || "Something went wrong");
    return data;
  };

  // call cb (debounced) whenever an order this user can see changes
  Y.watch = function (cb) {
    let t = null;
    const fire = () => { clearTimeout(t); t = setTimeout(cb, 250); };
    const chan = Y.sb.channel("yd-orders-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fire)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_events" }, fire)
      .subscribe();
    return () => Y.sb.removeChannel(chan);
  };

  Y.uploadPod = async function (orderUuid, name, blob, contentType) {
    const path = `${orderUuid}/${Date.now()}-${name}`;
    const { error } = await Y.sb.storage.from("pod").upload(path, blob, { contentType, upsert: false });
    if (error) throw new Error(error.message || "Upload failed");
    return path;
  };

  // shrink a camera photo to ~1600px JPEG before upload
  Y.compressImage = async function (file, max = 1600) {
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, "image/jpeg", 0.8));
    } catch (e) { return file; }
  };

  window.YDB = Y;
})();
