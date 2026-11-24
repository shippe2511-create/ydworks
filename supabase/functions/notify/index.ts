// notify: fans a notification out to the user's chosen channel.
// Called by the notifications_dispatch trigger with { notification_id }.
//
// Secrets (supabase secrets set ...). Any channel without its secrets is skipped:
//   FCM_SERVICE_ACCOUNT   Firebase service-account JSON (push to Android + iOS via FCM)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (approved template with 2 body params: title, body)
//   VIBER_TOKEN           Viber bot auth token
//   TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM   (SMS)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`) return new Response("forbidden", { status: 403 });
  const { notification_id } = await req.json();
  const { data: n } = await sb.from("notifications").select("*").eq("id", notification_id).single();
  if (!n) return new Response("not found", { status: 404 });
  const { data: p } = await sb.from("profiles").select("id, phone, notify_channel, viber_user_id").eq("id", n.user_id).single();
  const sent: string[] = [];

  // push is always attempted (it's the in-app experience); other channels follow the user's choice
  const { data: tokens } = await sb.from("device_tokens").select("token").eq("user_id", n.user_id);
  if (tokens?.length && env("FCM_SERVICE_ACCOUNT")) {
    const ok = await sendPush(tokens.map((t) => t.token), n);
    if (ok) sent.push("push");
  }
  const ch = p?.notify_channel ?? "push";
  if (ch === "whatsapp" && p?.phone && env("WHATSAPP_TOKEN")) { if (await sendWhatsApp(p.phone, n)) sent.push("whatsapp"); }
  if (ch === "viber" && p?.viber_user_id && env("VIBER_TOKEN")) { if (await sendViber(p.viber_user_id, n)) sent.push("viber"); }
  if (ch === "sms" && p?.phone && env("TWILIO_SID")) { if (await sendSms(p.phone, n)) sent.push("sms"); }

  if (sent.length) await sb.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", n.id);
  return Response.json({ sent });
});

const intl = (phone: string) => { const d = phone.replace(/\D/g, ""); return d.length === 7 ? "960" + d : d; };

// ── Firebase Cloud Messaging HTTP v1 ──
let fcmToken: { value: string; exp: number } | null = null;
async function fcmAccessToken(sa: { client_email: string; private_key: string }) {
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const jwt = `${unsigned}.${btoa(String.fromCharCode(...sig)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const j = await r.json();
  fcmToken = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return fcmToken.value;
}
async function sendPush(tokens: string[], n: Record<string, unknown>) {
  try {
    const sa = JSON.parse(env("FCM_SERVICE_ACCOUNT"));
    const at = await fcmAccessToken(sa);
    let ok = false;
    for (const token of tokens) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST", headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token, notification: { title: n.title, body: n.body }, data: { kind: String(n.kind), order_id: String(n.order_id ?? ""), project_id: String(n.project_id ?? "") }, apns: { payload: { aps: { sound: "default" } } } } }),
      });
      if (r.ok) ok = true;
      else if (r.status === 404 || r.status === 400) await sb.from("device_tokens").delete().eq("token", token); // stale token
    }
    return ok;
  } catch (e) { console.error("push", e); return false; }
}

async function sendWhatsApp(phone: string, n: Record<string, unknown>) {
  const r = await fetch(`https://graph.facebook.com/v20.0/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: intl(phone), type: "template",
      template: { name: env("WHATSAPP_TEMPLATE") || "yd_update", language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: n.title }, { type: "text", text: n.body }] }] } }),
  });
  if (!r.ok) console.error("whatsapp", await r.text());
  return r.ok;
}

async function sendViber(viberId: string, n: Record<string, unknown>) {
  const r = await fetch("https://chatapi.viber.com/pa/send_message", {
    method: "POST", headers: { "X-Viber-Auth-Token": env("VIBER_TOKEN"), "Content-Type": "application/json" },
    body: JSON.stringify({ receiver: viberId, type: "text", sender: { name: "YD Works" }, text: `${n.title}\n${n.body}` }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok && j.status === 0;
}

async function sendSms(phone: string, n: Record<string, unknown>) {
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env("TWILIO_SID")}/Messages.json`, {
    method: "POST", headers: { Authorization: "Basic " + btoa(`${env("TWILIO_SID")}:${env("TWILIO_TOKEN")}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: "+" + intl(phone), From: env("TWILIO_FROM"), Body: `YD Works: ${n.title}. ${n.body}` }),
  });
  return r.ok;
}
