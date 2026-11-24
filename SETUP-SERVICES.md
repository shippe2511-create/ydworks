# Switching on the connected services

Everything is built and works in demo mode. Each service below switches on when you add its
account details. None of the keys go in chat. Secrets go into Supabase (Dashboard → Edge Functions → Secrets,
or `supabase secrets set NAME=value`); public switches go into `shared/yd-config.js` (then run `bash shared/sync.sh`
and rebuild the apps with `npm run sync` in `mobile/customer` and `mobile/driver`).

## 0. Backend (required first)
1. Supabase organisation on Pro (or free a project slot), create project `ydworks` in `ap-south-1` (Mumbai).
2. Apply `supabase/migrations/2026112400000{1..5}_*.sql` in order.
3. Make the first admin:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='you@yd-mv.com');`
4. Put the project URL and publishable key into `shared/yd-backend.js` (`__SUPABASE_URL__`, `__SUPABASE_PUBLISHABLE_KEY__`)
   and the same two placeholders in `website/index.html`, then `bash shared/sync.sh`.
5. Deploy functions: `supabase functions deploy notify payments viber-webhook`.
6. Vault secrets `project_url` and `service_role_key` (Dashboard → Project Settings → Vault) so new notifications reach the `notify` function.
7. Auth → SMTP: add a sender (e.g. Resend, Postmark) so sign-up emails arrive reliably.
8. Run the backend test locally any time: see `supabase/tests/backend_test.sql`.

## 1. Phone-number login (SMS code)
- Supabase → Authentication → Providers → Phone: enable and pick Twilio, MessageBird, Vonage or Textlocal; paste its credentials.
  Twilio covers Dhiraagu and Ooredoo numbers.
- Set `phoneLogin: true` in `shared/yd-config.js`.

## 2. Push notifications
- Firebase project → add Android apps `mv.ydworks.app` and `mv.ydworks.driver`; download each `google-services.json`
  into `mobile/<app>/android/app/`.
- Apple Developer → Keys → APNs key; upload it in Firebase → Cloud Messaging (iOS apps `mv.ydworks.app`, `mv.ydworks.driver`),
  and in Xcode enable *Push Notifications* capability for each app.
- Firebase → Service accounts → generate key; save the JSON as secret `FCM_SERVICE_ACCOUNT`.
- Set `push: true` in `shared/yd-config.js`.
- In-app notifications already work without any of this.

## 3. Real map
- Create a free MapTiler (or Mapbox) account; copy a style URL with your public key,
  e.g. `https://api.maptiler.com/maps/streets-v2/style.json?key=…`.
- Set `mapStyleUrl` in `shared/yd-config.js`. Check the yard position (`yard.lat/lng`) too.
- Without it, the apps keep the drawn map of Hulhumalé. GPS tracking and Google Maps navigation work either way.

## 4. Payments
- Bank transfer works now: customers upload a slip, the counter approves it under Console → Payments.
  Set the bank details in Console → Content & pricing → Payments.
- Card (BML Connect): apply for a BML Connect merchant account. Set secrets `BML_API_KEY`, `BML_APP_ID`,
  `BML_API_BASE` (UAT first), `APP_RETURN_URL`. Confirm field names in `supabase/functions/payments/index.ts`
  against BML's merchant documentation, test in UAT, then set `cardPayments: true`.

## 5. GST invoices
- GST rate is in Console → Content & pricing (default 8%, prices include GST). Confirm the rate and your
  TIN/invoice wording with your accountant / MIRA before issuing real invoices.

## 6. WhatsApp / Viber / SMS updates
- WhatsApp: Meta Business → WhatsApp Cloud API. Create an approved template (`yd_update`, two body variables: title, body).
  Secrets `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE`.
- Viber: create a Viber bot (partners.viber.com). Secret `VIBER_TOKEN`; register the webhook URL
  `https://<project>.supabase.co/functions/v1/viber-webhook`. Customers send their phone number to the bot to link.
- SMS: Twilio secrets `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`.
- Turn each on in Console → Content & pricing → Messaging so customers can choose it.

## 7. Dhivehi
- All customer-facing screens have Dhivehi text. Have a native speaker review it before launch.
