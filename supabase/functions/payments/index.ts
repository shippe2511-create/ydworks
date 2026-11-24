// payments: card checkout through BML Connect (Bank of Maldives).
//   POST /payments/checkout  { order_id }  (customer's JWT)  -> { url }  open this URL to pay
//   GET  /payments/return?order=<id>                         -> checks status, redirects to the app
//   POST /payments/webhook                                   -> BML callback; status is re-checked with BML, never trusted
//
// Secrets:
//   BML_API_KEY     merchant API key from BML Connect
//   BML_APP_ID      application id from BML Connect
//   BML_API_BASE    https://api.merchants.bankofmaldives.com.mv/public  (UAT: https://api.uat.merchants.bankofmaldives.com.mv/public)
//   APP_RETURN_URL  where to send the customer afterwards, e.g. https://app.yd-mv.com/#orders
// Confirm field names against your BML Connect merchant documentation before going live.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const env = (k: string) => Deno.env.get(k) ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const path = new URL(req.url).pathname.split("/").pop();
  try {
    if (path === "checkout") return await checkout(req);
    if (path === "return") return await back(req);
    if (path === "webhook") return await webhook(req);
    return new Response("not found", { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400, headers: cors });
  }
});

async function checkout(req: Request) {
  if (!env("BML_API_KEY")) throw new Error("Card payments are not switched on yet");
  // act as the signed-in customer so RLS proves they own the order
  const user = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { order_id } = await req.json();
  const { data: o, error } = await user.from("orders").select("id, ref, total, payment_status, customer_id").eq("id", order_id).single();
  if (error || !o) throw new Error("Order not found");
  if (o.payment_status === "paid") throw new Error("This order is already paid");
  const self = `${env("SUPABASE_URL")}/functions/v1/payments`;
  const r = await fetch(`${env("BML_API_BASE")}/transactions`, {
    method: "POST", headers: { Authorization: env("BML_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(Number(o.total) * 100), currency: "MVR", provider: "bml_epos", appVersion: "ydworks-1.0", apiVersion: "2.0",
      deviceId: env("BML_APP_ID"), localId: o.id, customerReference: o.ref, redirectUrl: `${self}/return?order=${o.id}`, webhook: `${self}/webhook` }),
  });
  const t = await r.json();
  if (!r.ok || !t.url) throw new Error(t.message || "The bank could not start the payment");
  await admin.from("payments").insert({ order_id: o.id, method: "card", amount: o.total, status: "pending", provider_ref: t.id, created_by: o.customer_id });
  await admin.from("orders").update({ payment_method: "card", payment_status: "pending" }).eq("id", o.id);
  return Response.json({ url: t.url }, { headers: cors });
}

// ask BML for the real state of a transaction and record it
async function settle(providerRef: string) {
  const r = await fetch(`${env("BML_API_BASE")}/transactions/${providerRef}`, { headers: { Authorization: env("BML_API_KEY") } });
  const t = await r.json();
  const { data: pay } = await admin.from("payments").select("*").eq("provider_ref", providerRef).single();
  if (!pay || pay.status !== "pending") return pay;
  const paid = t.state === "CONFIRMED";
  const failed = ["CANCELLED", "FAILED", "EXPIRED"].includes(t.state);
  if (!paid && !failed) return pay;
  await admin.from("payments").update({ status: paid ? "paid" : "failed", updated_at: new Date().toISOString() }).eq("id", pay.id);
  await admin.from("orders").update({ payment_status: paid ? "paid" : "unpaid" }).eq("id", pay.order_id);
  const { data: o } = await admin.from("orders").select("customer_id, ref").eq("id", pay.order_id).single();
  await admin.from("notifications").insert({ user_id: o!.customer_id, kind: "payment", title: paid ? "Payment received" : "Card payment didn't go through",
    body: paid ? `Thank you. ${o!.ref} is paid.` : `Try again, or choose cash on delivery for ${o!.ref}.`, order_id: pay.order_id });
  return pay;
}

async function back(req: Request) {
  const order = new URL(req.url).searchParams.get("order");
  const { data: pay } = await admin.from("payments").select("provider_ref").eq("order_id", order).eq("method", "card").order("created_at", { ascending: false }).limit(1).single();
  if (pay?.provider_ref) await settle(pay.provider_ref);
  return Response.redirect(env("APP_RETURN_URL") || "https://yd-mv.com", 302);
}

async function webhook(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ref = body.transactionId || body.id;
  if (ref) await settle(String(ref));
  return new Response("ok");
}
