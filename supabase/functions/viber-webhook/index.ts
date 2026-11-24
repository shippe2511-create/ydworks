// viber-webhook: lets customers receive YD Works updates on Viber.
// The customer opens the YD Works bot in Viber and sends the phone number they use in the app.
// We link that Viber user to their profile and switch their notifications to Viber.
// Register once:  POST https://chatapi.viber.com/pa/set_webhook  { url: "<project>/functions/v1/viber-webhook" }
// Secret: VIBER_TOKEN
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token = Deno.env.get("VIBER_TOKEN") ?? "";

async function reply(to: string, text: string) {
  await fetch("https://chatapi.viber.com/pa/send_message", {
    method: "POST", headers: { "X-Viber-Auth-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ receiver: to, type: "text", sender: { name: "YD Works" }, text }),
  });
}

Deno.serve(async (req) => {
  // verify the request really comes from Viber (HMAC-SHA256 of the body with the bot token)
  const raw = await req.text();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)))).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (sig !== req.headers.get("X-Viber-Content-Signature")) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(raw);
  if (ev.event === "conversation_started") {
    return Response.json({ sender: { name: "YD Works" }, type: "text", text: "Welcome to YD Works. Send the phone number you use in the YD Works app to get order updates here." });
  }
  if (ev.event === "message" && ev.message?.type === "text") {
    const digits = String(ev.message.text).replace(/\D/g, "").replace(/^960/, "");
    if (digits.length < 7) { await reply(ev.sender.id, "Please send your 7-digit phone number."); return new Response("ok"); }
    const { data: profiles } = await sb.from("profiles").select("id, phone");
    const match = profiles?.find((p) => p.phone.replace(/\D/g, "").replace(/^960/, "") === digits);
    if (!match) { await reply(ev.sender.id, "We couldn't find a YD Works account with that number. Sign up in the app first."); return new Response("ok"); }
    await sb.from("profiles").update({ viber_user_id: ev.sender.id, notify_channel: "viber" }).eq("id", match.id);
    await reply(ev.sender.id, "Done. You'll get your YD Works order updates here.");
  }
  return new Response("ok");
});
