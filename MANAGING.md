# Managing YD Works: website, customer app and driver app

Everything is run from one place: the **YD Works Console** (`admin/index.html`).
Host it at a private address such as `https://console.yd-mv.com` and give staff admin access.

## Who does what

| Role | Uses | Can do |
|---|---|---|
| Customer | YD Works app, website | Book machines, order materials, track deliveries, send quote requests |
| Driver | YD Driver app | Accept jobs, run trips, capture photo + signature proof |
| Admin (counter staff, managers) | Console | Everything below |

New sign-ups are always customers. Only an admin can turn an account into a driver or admin.

## Daily work in the console

**Overview**: today's bookings, orders, active jobs and drivers online, a 14-day revenue chart
(switch to *Table* to see the numbers), a live fleet map and a *Needs attention* list
(orders waiting for a driver, new website leads, out-of-stock items, ordering paused).

**Orders & dispatch**: every order with filters (Waiting, In progress, Completed, Cancelled) and search
by order number, customer, phone or site. Click an order to see its items, timeline and proof of delivery,
**assign or reassign a driver**, or **cancel** it (tap twice to confirm).

**Drivers**: who is online, on which job, jobs and earnings today.
- *Add a driver*: the person signs up in the YD Works app, then you enter their email plus vehicle code
  and name (e.g. `TP-05`, `Tipper 10m³`). Their next sign-in to YD Driver works.
- *Team access*: give or remove console (admin) access. You can't remove your own.

**Website leads**: quote requests from the website form, as a board: New → Called → Quoted → Won / Lost.

**Customers**: accounts, order counts, completed spend and last order.

## Changing what the apps and website show

**Fleet & materials**: edit hourly/daily/monthly rates and material prices, the order step
(e.g. blocks in 50s), and switch items off when out of stock. A *Save* button appears on changed rows;
saved changes are live in the customer app immediately. The server always prices orders from this
catalog, so a modified app can't change a total.

**Pricing & settings**
- *Ordering*: pause new app orders (holidays, bad weather); customers are told to call the counter.
- *Pricing rules*: delivery fee, free-delivery threshold, mobilisation fee for hourly hire, driver pay %
  and minimum driver pay. Applies to new orders only. An example calculation updates as you type.
- *Contact & hours*: hotline, email and counter hours used across the website and apps.

**Website & apps** (Managers)
- *Website*: headline, show/hide sections, floating WhatsApp button, Google search text, pause online quotes.
- *Customer app*: home text, service tiles, WhatsApp, promo card, maintenance mode (also stops new orders),
  force update for old versions.
- *Driver app*: message to all drivers, daily vehicle checklist, delivery photo / daily check required,
  fuel log, location interval, force update.
- *Announcement banner*: English + Dhivehi, shown on the website and/or the customer app.

**Content** (Managers) — every text and photo of the website, customer app and driver app.
- Pick a tab, search or filter by section, type the new English and/or Dhivehi text, then *Save changes*.
  *Reset* brings back the original. Keep any `{placeholder}` the original has (the page warns you).
- *Photos*: *Replace* uploads a new photo (resized automatically); *Restore original* undoes it.
- Every save is in the Activity log. Apps pick up changes the next time they are opened.

## Things you still change in code

Layout and new features of the website and apps live in `website/`, `customer-app/` and `driver-app/`.
After changing app texts in code, refresh the Content page's list: `node shared/gen-content.js`, then
`bash shared/sync.sh`. After editing the apps, rebuild them: `cd mobile/customer && npm run sync`
(same for driver), then publish new versions to the stores.

## Before go-live

1. Upgrade Supabase to Pro (or free a project slot) so the backend can be created.
2. Apply the three migrations in `supabase/migrations/` and make the first admin:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@yd-mv.com');`
3. Set up a custom email sender (SMTP) in Supabase Auth so sign-up emails are reliable.
4. Replace sample prices in Fleet & materials and the AI-generated photos.
