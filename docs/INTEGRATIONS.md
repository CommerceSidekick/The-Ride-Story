# Integrations: what's built and how to switch each one on

Every integration is built and ships switched off. Each one turns on when its keys are added in
**Vercel → the-ride-story → Settings → Environment Variables** and the site is redeployed. Until then the
buttons don't appear, so nothing half-works in front of riders.

Callback URLs below use `https://the-ride-story.vercel.app`. When theridestory.com is live, add the same
paths on that domain too (most services let you register several).

Set this once for all connections: `TOKEN_SECRET` = any long random string (e.g. `openssl rand -base64 32`).

## Ride apps (Collect tab → "Ride apps")

Riders connect an app, see their own rides around the trip dates, and click **Add to trip**. The original
FIT/GPX file is imported exactly like a dropped file. Connections live in an encrypted cookie in that
rider's browser; nothing is stored on our side.

| App | Access | Sign up | Redirect / callback URL | Env vars |
|---|---|---|---|---|
| **Strava** | Self-serve, 1 athlete until Strava raises it | strava.com/settings/api | Domain only: `the-ride-story.vercel.app` | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_TOKEN_SECRET` |
| **Wahoo** | Self-serve sandbox app works at once (low rate limit); request production review for launch | developers.wahooligan.com → Applications | `/api/connect/wahoo/callback` | `WAHOO_CLIENT_ID`, `WAHOO_CLIENT_SECRET` |
| **Polar** | Self-serve | admin.polaraccesslink.com (log in with Polar Flow) | `/api/connect/polar/callback` | `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET` |
| **Ride with GPS** | Self-serve | ridewithgps.com/api → API clients | `/api/connect/rwgps/callback` | `RWGPS_CLIENT_ID`, `RWGPS_CLIENT_SECRET`, `RWGPS_API_KEY` |

Limits riders will notice:
- **Strava:** its API terms only allow listing rides, which riders then export as GPX. The 2026 agreement forbids sharing the data with the crew.
- **Polar:** only shares exercises uploaded in the last 30 days, and only those synced after the rider connects.
- **Wahoo:** doesn't share workouts that came into Wahoo from other apps.
- **Ride with GPS:** its docs don't show OAuth tokens being used on the trips endpoints. We send the token both ways; confirm with a real account.

Not built yet, because they need a business application or a database:

| App | Status | What it takes |
|---|---|---|
| **Garmin** | Applications reopened late 2026 in tiers. Starter tier is push-only (Garmin sends rides to us) with no history | Apply at developer.garmin.com/gc-developer-program; needs a privacy policy and Supabase to receive pushed rides. Meanwhile Garmin users can auto-sync to Strava, Ride with GPS or Wahoo, or export FIT |
| **COROS** | Partner-only, company application | support.coros.com → "Submit an API Application" |
| **Suunto** | Company application, about 2 weeks | apizone.suunto.com |
| **Komoot, Zwift, Hammerhead** | Partner-only or closed | Riders export FIT/GPX |
| **Apple Health** | No web API; needs an iOS app | Later |

## Posting (Social tab → "Post to Instagram / Facebook")

Slides are rendered as JPEGs, uploaded to temporary storage (Meta fetches them by URL), posted, then
deleted. Uploads also expire on their own after a day.

1. **File storage:** Vercel → the-ride-story → **Storage → Create → Blob**, connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`.
2. **Meta app:** developers.facebook.com → Create app → type **Business**.
   - **Instagram:**
     - Add the **Instagram** product → *API setup with Instagram login*.
     - Add the redirect URL `https://the-ride-story.vercel.app/api/connect/instagram/callback`.
     - Copy the **Instagram app ID/secret** (not the Meta app ID) into `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`.
     - Only Instagram **professional** accounts (Business or Creator) can be posted to. Switching is free in the Instagram app.
   - **Facebook Pages:**
     - Add **Facebook Login for Business**.
     - Valid OAuth redirect URI: `https://the-ride-story.vercel.app/api/connect/facebook/callback`.
     - Copy the app ID and secret into `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
     - Facebook lets apps post to **Pages only, not personal profiles**. For profiles, riders use **Share**.
3. **Before launch:**
   - While the app is in development, only people with a role on it (you, plus testers you add) can connect.
   - For everyone else, submit **App Review** for `instagram_business_basic`, `instagram_business_content_publish`, `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`, plus **Business Verification**.
   - Meta requires a privacy policy URL and a data-deletion URL.

Instagram story sets aren't posted by the API (Meta posts stories one frame at a time). Riders use Share for those.

## Printed books (Book tab → Print → "Order printed books")

**Vistaprint has no public ordering API for photo books**, so ordering goes through **Lulu**. Lulu prints
hardcover photo books and ships worldwide, with a free sandbox. Vistaprint stays available through the
"Page images for Vistaprint" download.

How an order works:
1. The rider fills in copies, shipping speed and address, and gets a price from Lulu.
2. The browser builds the print PDFs at Lulu's exact cover size, uploads them, and Lulu checks the files.
3. The rider pays on **Stripe Checkout**.
4. Stripe's webhook tells us the payment cleared, and we create the Lulu print job. Lulu charges the card on the Lulu account.

**Product:**
- 8.5 × 8.5 in square or 11 × 8.5 in landscape.
- Premium full colour, hardcover case wrap, 80# coated paper, gloss cover.
- 24–800 pages.
- Lulu's 2026 list price is about $10.98 + $0.215 per page: about $16 at 24 pages, $19.60 at 40, $23.90 at 60. Shipping and tax are extra.

**Price charged:**
- `BOOK_PRICE_CENTS`, default $25 a copy, but never less than Lulu's print cost + 10%. So books over about 55 pages cost more than $25.
- Shipping, handling and tax are passed through at Lulu's cost.

Setup:
1. **File storage:** the same Vercel Blob store as above. PDFs are kept 30 days.
2. **Lulu sandbox:** create an account at developers.sandbox.lulu.com → API Keys. Put them in `LULU_CLIENT_KEY` and `LULU_CLIENT_SECRET`, and leave `LULU_ENV=sandbox`. Sandbox jobs are never printed or charged.
3. **Stripe:**
   - dashboard.stripe.com → Developers → API keys. Use the test mode **secret key** for `STRIPE_SECRET_KEY`.
   - Developers → Webhooks → Add endpoint `https://the-ride-story.vercel.app/api/order/webhook`, with the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   - Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. **Test:** with Stripe test card `4242 4242 4242 4242`, the order should appear in your Lulu sandbox under Print Jobs.
5. **Go live:**
   - Create a production Lulu account, add a card to it, and set `LULU_ENV=production` with its keys.
   - Switch Stripe to live keys and a live webhook.
6. **Before taking real orders:** decide on sales tax. Lulu charges us tax on its side; Stripe Tax can collect it from riders. Also add a refund/reprint policy.

Not built yet: order status emails (Lulu has webhooks for status changes), an orders page, and Prodigi or Gelato as a second printer.

## Testing

`.env.example` lists every variable. Each service's base URL can be overridden (`WAHOO_API_BASE`,
`LULU_API_BASE`, `STRIPE_API_BASE`, etc.), which is how the full flow was tested against fake services:
- connect
- list rides and import them
- Instagram carousel and Facebook Page posting
- Lulu quote, cover size, file check
- Stripe checkout, plus the webhook creating exactly one print job even when Stripe retries
