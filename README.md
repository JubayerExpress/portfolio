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

**What you can do:** edit name, intro, photos, links, bio, skills; add/reorder/delete Books, Research and Courses with image upload; write blog posts and reviews (Markdown, cover image, rating, draft mode); edit blog categories.

## Editing by hand

`content.js` is plain text. Everything after `window.SITE =` is JSON, so keep the quotes and commas valid. Colors live at the top of `style.css`.

## Test locally

Just open `index.html` in a browser. (The admin panel's GitHub features need the site to be online or any browser with internet access.)
