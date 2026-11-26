# Setting up the brand's social accounts with Claude in Chrome

Run these one session at a time in Chrome, with Claude in Chrome. Before each session:

- **Sign in first:** Gmail or whichever inbox receives Info@TheRideBook.com, plus the personal accounts named in that session.
- **Keep the logo files handy:** download them from the live site first.
  - https://the-ride-story.vercel.app/brand/icon-512.png (square, for profile pictures)
  - https://the-ride-story.vercel.app/brand/topo-bg.jpg (wide, for banners and covers)

Each prompt has Claude stop for the steps that must be yours: passwords, phone and CAPTCHA checks, accepting terms, two-factor setup, and anything involving payment.

Check the four values in the box below before pasting. Edit them in every prompt if they change.

```
BRAND NAME:   The Ride Story
HANDLE:       theridebook   (fallbacks, in order: theridebookhq, ridebookhq, theridebook_)
WEBSITE:      https://theridebook.com
EMAIL:        info@theridebook.com
```

Short bio (fits Instagram's 150 characters):
> Every ride has a story. Send us the photos and GPS files — we'll turn them into something worth reading, posting and putting on a shelf.

Long description (Facebook, YouTube, LinkedIn, Pinterest):
> The Ride Story turns a group ride into something worth keeping. Connect Strava or any GPS, add everyone's photos, and get an online story over a 3D map, ready-to-post sets for Instagram and Facebook, and a printed book. For mountain bike, road and moto trips — a Saturday loop or a week away.

---

## Session 1: Meta (Facebook Page, Instagram, Threads, developer app)

Sign in to **your personal Facebook account** first. Meta requires a real person to own a business Page, and you'll be its admin.

```text
Help me set up my brand's Meta accounts. I'm signed in to my personal Facebook. Brand details:
BRAND NAME: The Ride Story | HANDLE: theridebook (fallbacks: theridebookhq, ridebookhq, theridebook_) | WEBSITE: https://theridebook.com | EMAIL: info@theridebook.com
Short bio: "Every ride has a story. Send us the photos and GPS files — we'll turn them into something worth reading, posting and putting on a shelf."
Long description: "The Ride Story turns a group ride into something worth keeping. Connect Strava or any GPS, add everyone's photos, and get an online story over a 3D map, ready-to-post sets for Instagram and Facebook, and a printed book. For mountain bike, road and moto trips — a Saturday loop or a week away."

Rules for this whole task:
- STOP and hand back to me for: creating or typing any password, phone-number or SMS verification, CAPTCHAs, accepting terms or policies, two-factor setup, and anything that asks for a card or payment. Don't buy ads or boosts, and don't invite or follow anyone.
- You may read verification emails sent to info@theridebook.com in my inbox tab and enter the code.
- Never type a password into chat or a notes field, and don't repeat any code back to me.
- Keep a running list of everything you create (name, handle, URL). Show it to me at the end, with no passwords.

1. FACEBOOK PAGE: Go to https://www.facebook.com/pages/create.
   - Page name: The Ride Story. Category: "Product/service" (add "Sports" if offered). Bio: the short bio.
   - Then set: website https://theridebook.com, email info@theridebook.com, profile picture = the square logo I'll upload when you ask, cover = the wide banner I'll upload when you ask.
   - Set the username (facebook.com/theridebook, or the first fallback that's free).
   - Stop and tell me the Page URL.
2. INSTAGRAM: Open https://www.instagram.com/accounts/emailsignup/ in a new tab and sign up with email info@theridebook.com, full name The Ride Story, username theridebook (or a fallback).
   - STOP for me to set the password, birthday and any checks.
   - Then, in Settings → "Account type and tools", switch to a Professional account → Business, category "Product/service". Don't show contact info publicly yet.
   - Set the bio to the short bio, the website to https://theridebook.com, and the profile picture to the square logo.
3. LINK THEM: In Instagram → Settings → Accounts Center, add the Facebook account and connect the Instagram account to The Ride Story Facebook Page. Tell me if it asks me to confirm.
4. THREADS: Go to https://www.threads.net and sign in with the new Instagram account. Create the Threads profile, importing the bio and picture from Instagram. Leave it public.
5. META BUSINESS PORTFOLIO: Go to https://business.facebook.com/overview and create a business portfolio.
   - Business name: The Ride Story. Business email: info@theridebook.com.
   - Add the Facebook Page and the Instagram account to it.
   - STOP before any step asking for legal business details or documents (business verification). I'll do that myself.
6. DEVELOPER APP (this lets our website post for riders): Go to https://developers.facebook.com/apps, then Create app.
   - Use case: "Other", type "Business". App name: The Ride Story. Contact email: info@theridebook.com. Business portfolio: The Ride Story.
   - Add the product "Instagram" → "API setup with Instagram login".
     - Under Business login settings, add the OAuth redirect URI https://the-ride-story.vercel.app/api/connect/instagram/callback
     - Add the same path on https://theridebook.com as well.
   - Add the product "Facebook Login for Business". Valid OAuth Redirect URIs:
     - https://the-ride-story.vercel.app/api/connect/facebook/callback
     - the same path on https://theridebook.com
   - App settings → Basic: Privacy Policy URL https://theridebook.com/privacy, Terms URL https://theridebook.com/terms, app icon = the square logo. Save.
   - Don't submit for App Review.
   - Tell me where the Instagram app ID/secret and the Facebook app ID/secret are shown, but DON'T copy, reveal or type the secrets anywhere. I'll paste them into Vercel myself.
7. Show me the final list of accounts and URLs.
```

---

## Session 2: Google / YouTube and TikTok

```text
Help me set up my brand's YouTube and TikTok. Brand details:
BRAND NAME: The Ride Story | HANDLE: theridebook (fallbacks: theridebookhq, ridebookhq, theridebook_) | WEBSITE: https://theridebook.com | EMAIL: info@theridebook.com
Short bio: "Every ride has a story. Send us the photos and GPS files — we'll turn them into something worth reading, posting and putting on a shelf."
Long description: "The Ride Story turns a group ride into something worth keeping. Connect Strava or any GPS, add everyone's photos, and get an online story over a 3D map, ready-to-post sets for Instagram and Facebook, and a printed book. For mountain bike, road and moto trips — a Saturday loop or a week away."

Same rules as before:
- STOP for passwords, phone or SMS checks, CAPTCHAs, terms, two-factor and anything involving payment. Don't buy anything or enable ads or monetisation.
- You may read verification codes sent to info@theridebook.com in my inbox tab.
- Never put a password or code in chat or notes.
- Keep a list of what you create and show it at the end.

1. GOOGLE ACCOUNT: If info@theridebook.com isn't already a Google account, go to https://accounts.google.com/signup.
   - Choose "To manage my business" if offered, then "Use your existing email" with info@theridebook.com.
   - STOP for me at the password and phone steps.
2. YOUTUBE CHANNEL: Signed in as info@theridebook.com, go to https://www.youtube.com/account and create a channel.
   - Name: The Ride Story. Handle: @theridebook (or a fallback).
   - In YouTube Studio → Customisation:
     - description = the long description
     - links: Website → https://theridebook.com
     - contact email = info@theridebook.com
     - profile picture = the square logo, banner = the wide banner (I'll upload both when you ask)
3. TIKTOK: Go to https://www.tiktok.com/signup and choose "Use phone or email" → email, info@theridebook.com.
   - STOP for me at the birthday, password and verification steps.
   - Then set the username to theridebook (or a fallback) and the name to The Ride Story.
   - Bio: the short bio, trimmed to 80 characters: "Every ride has a story. We turn your photos + GPS into posts and books."
   - Profile photo: the square logo.
   - In Settings → Account, switch to a Business account, category "Sports, Fitness & Outdoors". Add the website if TikTok allows it.
4. Show me the final list of accounts and URLs.
```

---

## Session 3: X, Pinterest, LinkedIn, Strava club

Sign in to **your personal LinkedIn** and **your personal Strava** first. Both require a person to own a company Page or club.

```text
Help me set up my brand on X, Pinterest, LinkedIn and Strava. Brand details:
BRAND NAME: The Ride Story | HANDLE: theridebook (fallbacks: theridebookhq, ridebookhq, theridebook_) | WEBSITE: https://theridebook.com | EMAIL: info@theridebook.com
Short bio: "Every ride has a story. Send us the photos and GPS files — we'll turn them into something worth reading, posting and putting on a shelf."
Long description: "The Ride Story turns a group ride into something worth keeping. Connect Strava or any GPS, add everyone's photos, and get an online story over a 3D map, ready-to-post sets for Instagram and Facebook, and a printed book. For mountain bike, road and moto trips — a Saturday loop or a week away."

Same rules:
- STOP for passwords, phone or SMS checks, CAPTCHAs, terms, two-factor, payment, premium or verified subscriptions.
- You may read codes sent to info@theridebook.com in my inbox tab.
- Never put a password or code in chat or notes.
- Don't follow, invite, post or message anyone.
- Keep a list and show it at the end.

1. X: Go to https://x.com/i/flow/signup and sign up with the email info@theridebook.com, name The Ride Story.
   - STOP for me at the birthday, password and phone steps.
   - Set the username to theridebook (or a fallback).
   - Profile: bio = the short bio (trim to fit 160), website https://theridebook.com, photo = the square logo, header = the wide banner.
   - Decline X Premium.
2. PINTEREST BUSINESS: Go to https://www.pinterest.com/business/create/ and sign up with info@theridebook.com.
   - STOP for the password. Business name: The Ride Story. Website: https://theridebook.com. Type: "Brand", focus "Sports" or "Travel".
   - Set the username to theridebook (or a fallback), about = the long description (trim to 500), and the profile picture = the square logo.
   - Skip "claim website" for now and tell me what verification method it offers. My developer will add the tag.
   - Skip ads.
3. LINKEDIN COMPANY PAGE: Using my signed-in personal LinkedIn, go to https://www.linkedin.com/company/setup/new/ → Company.
   - Name: The Ride Story. URL: linkedin.com/company/theridebook. Website: https://theridebook.com.
   - Industry: "Software Development" (or "Technology, Information and Internet"). Size: 2-10. Type: Privately held.
   - Logo: the square logo. Tagline: "Every ride has a story."
   - STOP before ticking the verification box confirming I'm authorised to act for the company; I'll tick it.
   - Afterwards: About → the long description, cover = the wide banner.
4. STRAVA CLUB: Using my signed-in Strava account, go to https://www.strava.com/clubs/new.
   - Club name: The Ride Story. Sport: Cycling (or Multisport if available). Type: Brand. Location: leave as mine or blank.
   - Description: the long description. Website: https://theridebook.com. Avatar: the square logo, cover: the wide banner.
   - Make it public. Don't invite anyone.
5. Show me the final list of accounts and URLs.
```

---

## After the sessions

- **Passwords and two-factor:** store every password in your password manager, and turn on two-factor for each account (an authenticator app, not SMS, where offered). Save the backup codes.
- **Instagram/Facebook posting from the site:** put the Meta app's IDs and secrets into Vercel (`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`) and redeploy. See `docs/INTEGRATIONS.md`.
- **Privacy and terms pages:** the Meta app review and Pinterest's website claim need https://theridebook.com/privacy and https://theridebook.com/terms to exist. They aren't built yet.
- **The site's footer** can link to all these accounts once they exist. Send the final list.
