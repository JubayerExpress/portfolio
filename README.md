# jubayer.bond — Personal Portfolio

Modern, no-build portfolio: Home · About · Books · Research · Courses · Blog (education + book/movie/game reviews) · Contact, plus an **admin panel** at `/admin.html`.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `script.js` | The public site |
| `space.css`, `space.js` | The space theme: starfield + warp intro, planets, orbits, HUD, cursor comet, rocket. Delete the two `<link>`/`<script>` lines in `index.html` to turn it off |
| `content.js` | **All your content** (text, links, blog posts). The admin panel edits this file |
| `md.js` | Markdown renderer for blog posts |
| `admin.html`, `admin.css`, `admin.js`, `login.js` | The admin panel and its login gate |
| `vault.js` | Created by the setup: your encrypted login (safe to be public) |
| `assets/` | Your photo (`me.jpg`). Uploaded images go to `assets/uploads/` |
| `CNAME` | Tells GitHub Pages to serve the site at `jubayer.bond` |

## Publish on GitHub Pages with jubayer.bond

1. Create a GitHub repo (e.g. `portfolio`) and upload **everything in this folder** (keep the `assets` folder and `CNAME`).
2. Repo **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. At your domain registrar, add DNS records for `jubayer.bond`:
   - Four **A** records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One **CNAME** for `www` pointing to `YOUR-GITHUB-USERNAME.github.io`
4. In **Settings → Pages**, confirm the custom domain `jubayer.bond` and tick **Enforce HTTPS**.

## Using the admin panel (`jubayer.bond/admin.html`)

The admin panel is protected by a **login ID and password**. GitHub Pages is static (no server), so the login works like this: the GitHub token that can edit your repo is stored **encrypted** in `vault.js` (AES-256-GCM, key derived from ID + password with PBKDF2, 600,000 rounds). Without the right ID *and* password the token cannot be recovered, so nobody can publish anything. `vault.js` is public on purpose and useless without your credentials.

**One-time setup (2 minutes):**
1. Create a fine-grained token: https://github.com/settings/personal-access-tokens/new
   Repository access → *Only select repositories* → your site repo. Permissions → **Contents: Read and write**.
2. Open `jubayer.bond/admin.html`. First visit shows **Set up admin login**.
3. Enter username/repo/branch, paste the token, choose a login ID and a password (10+ characters), click **Create login**.
4. Done. From now on you only type the ID and password. The token is never typed again.

**Daily use:** log in, edit, press **Save to GitHub** (`Ctrl/Cmd + S`). The session ends when you close the tab, on **Log out**, or after 30 idle minutes (never while you have unsaved changes).

**Account tab:** change ID/password, or replace the GitHub token when it expires.

**Forgot the password?** Create a new GitHub token, delete `vault.js` from the repo, then open `admin.html` to run the setup again.

**Security notes:** use a long, unique password, because `vault.js` is public and the password is the only lock. After 5 wrong tries the form slows down. Revoke the token on GitHub if you ever suspect a leak.

**What you can do:** edit the Education tab (academics, achievements, clubs with logos and Facebook links); edit name, intro, photos, links, bio, skills; add/reorder/delete Books, Research and Courses with image upload; write blog posts and reviews (Markdown, cover image, rating, draft mode); edit blog categories.

## Visitor counter (Admin → Visitors)

Visits are counted by [GoatCounter](https://www.goatcounter.com) (free, no cookies, so no cookie banner needed). Counting is off until you set it up:

1. Sign up at https://www.goatcounter.com/signup and pick a code (e.g. `jubayer`).
2. In GoatCounter **Settings**, tick **Allow adding visitor counts on your website** and save.
3. In the admin open **Visitors**, type the code, press **Save to GitHub**.

The home page shows a live visitor count next to the contact icons (turn it off in Visitors → Settings). The Visitors tab shows visitors today / last 7 days / last 30 days / all time, and views per blog post. Use **Don't count my own visits on this browser** so your own checks don't inflate the numbers. Countries, devices and referrers are on your GoatCounter dashboard.

## Contact icons on the home page

Under the hero buttons there is a row of round icons: Email first, then GitHub, LinkedIn and your other links from **General → Social links**. Icons are picked automatically from the link (GitHub, LinkedIn, YouTube, Facebook; anything else gets a link icon). A link with no profile path, like `https://facebook.com/`, is treated as a placeholder and hidden from this row.

## Book shop (Admin → Shop settings, Orders, Reviews)

Visitors can buy your books with **bKash (Send Money + TrxID)** or **cash on delivery**, and anyone can write a review (it shows after you approve it).
Orders and reviews are stored in **your own Google Sheet** through `shop-backend.gs` (Google Apps Script, free).

One-time setup: Admin → **Shop settings** walks you through it (make a Sheet → Extensions → Apps Script → paste the code from the
"Copy backend code" button → Deploy as Web app, access *Anyone* → paste the /exec URL → Test → Save to GitHub).
Then in **Books**, tick "Sell this book" and set a price. New orders also arrive by email.

Only your GitHub account can manage orders: the admin proves who you are with the same GitHub token it already uses.
If you change `shop-backend.gs`, redeploy it in Apps Script (Deploy → Manage deployments → edit → New version).

Link to a book's order form from anywhere with `#buy/BOOK-ID` (IDs are in Admin → Books), or its reviews with `#reviews/BOOK-ID`.

### Coupons (Admin → Coupons)

Make discount codes: **% off** (with an optional biggest discount), **৳ off**, or **free delivery**. Each can have a minimum order,
a last day, a usage limit, and work on all books or one book. Tick "Show it on the website" to show it as a coupon ticket above
your books ("Copy & use" puts it straight into the buyer's order form). Coupons live in the **Coupons** tab of your Google Sheet,
not in the website code, so nobody can dig them out. The Sheet checks every coupon again when an order is placed.

## Announcement bar (Admin → Announcement)

A scrolling notice strip above the menu. Add as many notices as you like, each with an optional link and a glowing NEW badge.
Visitors can close it; it comes back when the notices change.

## Updates never touch your content

Your own stuff lives in three places: `content.js` (all text and settings from the admin), `assets/` (your photos and uploads)
and `vault.js` (your login). Code updates are shipped **without** these files, so uploading an update to GitHub never changes
what you wrote. New settings get sensible defaults automatically the first time you open the admin.
Orders, reviews and coupons live in your Google Sheet, so code updates never touch them either.

## Editing by hand

`content.js` is plain text. Everything after `window.SITE =` is JSON, so keep the quotes and commas valid. Colors live at the top of `style.css`.

## Test locally

Just open `index.html` in a browser. (The admin panel's GitHub features need the site to be online or any browser with internet access.)

## Education tab: adding the BRAC University logo

The BRACU card shows a "BRACU" badge until a logo is set. Save the logo as `assets/logos/bracu.png`, then in the admin open **Education → Clubs & communities → BRAC University** and set **Logo** to `assets/logos/bracu.png` (or upload it there).
