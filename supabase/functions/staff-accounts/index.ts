// staff-accounts: Managers create driver accounts that sign in with PHONE + PIN (no email, no SMS needed).
//   POST /staff-accounts/create_driver { full_name, phone, unit_code? }  -> { driver_id, phone, pin }
//   POST /staff-accounts/reset_pin     { driver_id }                     -> { pin }
//   POST /staff-accounts/disable       { driver_id }                     -> { ok }   (turns the account back into a customer and signs them out)
// Caller must be signed in to the console as a Manager (role 'admin').
// Behind the scenes each driver gets a private login address  driver-<digits>@login.yd-mv.com  (never emailed)
// and the PIN is its password. The driver app turns "phone + PIN" into that address (YDB.driverLoginEmail).
// The PIN is shown to the Manager once; only a hash is stored by Supabase Auth.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey" };
const LOGIN_DOMAIN = "login.yd-mv.com";

const digits = (p: string) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.length === 7) d = "960" + d;                 // local Maldives number
  return d;
};
const loginEmail = (p: string) => `driver-${digits(p)}@${LOGIN_DOMAIN}`;
const newPin = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1_000_000).padStart(6, "0"); };
const fail = (msg: string, status = 400) => Response.json({ error: msg }, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("POST only", 405);
  try {
    // who is calling?
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: who } = await admin.auth.getUser(jwt);
    if (!who?.user) return fail("Sign in to the console first", 401);
    const { data: me } = await admin.from("profiles").select("role").eq("id", who.user.id).single();
    if (me?.role !== "admin") return fail("Only managers can manage driver accounts", 403);

    const action = new URL(req.url).pathname.split("/").pop();
    const body = await req.json().catch(() => ({}));

    if (action === "create_driver") {
      const name = String(body.full_name ?? "").trim().slice(0, 80);
      const d = digits(body.phone);
      if (!name) return fail("Enter the driver's name");
      if (d.length < 10 || d.length > 15) return fail("Enter a valid phone number, e.g. 7771234");
      const phone = "+" + d;
      const { data: dup } = await admin.from("profiles").select("id, role").eq("phone", phone).limit(1);
      if (dup && dup.length) return fail("Someone already has this phone number. Find them under Staff & roles.");
      let unit_code: string | null = null, unit_name: string | null = null;
      if (body.unit_code) {
        const { data: m } = await admin.from("machines").select("code, name").eq("code", String(body.unit_code)).single();
        if (!m) return fail("That vehicle doesn't exist");
        unit_code = m.code; unit_name = m.name;
        await admin.from("profiles").update({ unit_code: null, unit_name: null }).eq("unit_code", m.code).eq("role", "driver");
      }
      const pin = newPin();
      const { data: created, error } = await admin.auth.admin.createUser({
        email: loginEmail(d), password: pin, email_confirm: true,
        user_metadata: { full_name: name, phone, login: "phone_pin" },
      });
      if (error || !created.user) return fail(error?.message?.includes("already") ? "A driver login already exists for this phone number. Use Reset PIN instead." : (error?.message ?? "Could not create the account"));
      const { error: upErr } = await admin.from("profiles").update({ role: "driver", full_name: name, phone, unit_code, unit_name }).eq("id", created.user.id);
      if (upErr) { await admin.auth.admin.deleteUser(created.user.id); return fail(upErr.message); }
      await admin.from("audit_log").insert({ actor_id: who.user.id, actor_role: "admin", action: "insert", entity: "profiles", entity_id: created.user.id, summary: `Driver account (phone + PIN) created for ${name} ${phone}` }).then(() => {}, () => {});
      return Response.json({ driver_id: created.user.id, phone, pin }, { headers: cors });
    }

    if (action === "reset_pin") {
      const { data: p } = await admin.from("profiles").select("id, role, phone, full_name").eq("id", String(body.driver_id)).single();
      if (!p || p.role !== "driver") return fail("That person is not a driver");
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      if (!u?.user?.email?.endsWith("@" + LOGIN_DOMAIN)) return fail("This driver signs in with email. They can use 'Forgot password' in the app.");
      const pin = newPin();
      const { error } = await admin.auth.admin.updateUserById(p.id, { password: pin });
      if (error) return fail(error.message);
      await admin.from("audit_log").insert({ actor_id: who.user.id, actor_role: "admin", action: "update", entity: "profiles", entity_id: p.id, summary: `PIN reset for ${p.full_name}` }).then(() => {}, () => {});
      return Response.json({ pin, phone: p.phone }, { headers: cors });
    }

    if (action === "disable") {
      const { data: p } = await admin.from("profiles").select("id, role").eq("id", String(body.driver_id)).single();
      if (!p || p.role !== "driver") return fail("That person is not a driver");
      await admin.from("profiles").update({ role: "customer", unit_code: null, unit_name: null, is_online: false }).eq("id", p.id);
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      if (u?.user?.email?.endsWith("@" + LOGIN_DOMAIN)) {
        await admin.auth.admin.updateUserById(p.id, { ban_duration: "876000h" });   // phone+PIN logins are switched off
      }
      return Response.json({ ok: true }, { headers: cors });
    }
    return fail("Unknown action", 404);
  } catch (e) {
    return fail((e as Error).message);
  }
});
