# jubayer.bond — Personal Portfolio

Modern, no-build portfolio: Home · About · Books · Research · Courses · Blog (education + book/movie/game reviews) · Contact, plus an **admin panel** at `/admin.html`.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `script.js` | The public site |
| `content.js` | **All your content** (text, links, blog posts). The admin panel edits this file |
| `md.js` | Markdown renderer for blog posts |
| `admin.html`, `admin.css`, `admin.js` | The admin panel |
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

GitHub Pages is static, so the admin panel talks to the GitHub API directly from your browser and commits your changes to the repo. The site redeploys about a minute after each save.

**One-time setup (2 minutes):**
1. Create a fine-grained token: https://github.com/settings/personal-access-tokens/new
2. Repository access → *Only select repositories* → pick your site repo.
3. Repository permissions → **Contents: Read and write**.
4. Open `admin.html`, enter your GitHub username, repo name, branch, paste the token, click **Connect & load**.

**What you can do:**
- Edit name, intro, home photo, rotating titles, banner words and social links (General)
- Edit bio, About photo, facts, skills (About)
- Add, reorder or delete **Books, Research and Courses**, each with its own image upload
- **Write blog posts**: pick a category (Education, Book Reviews, Movie Reviews, Game Reviews, Thoughts), add a cover image, star rating, "reviewing" subject, and a Markdown body with a toolbar, live preview and inline image upload. Tick *draft* to keep a post hidden.
- Edit blog categories (add your own)
- `Ctrl/Cmd + S` saves

**Security notes:** the token lives only in your browser (session by default; "remember" is optional). The admin page is public but can't change anything without your token. Never share the token, and revoke it on GitHub if a device is lost.

**No token?** Choose "Edit locally", make changes, click **Download content.js**, and replace `content.js` in your repo.

## Editing by hand

`content.js` is plain text. Everything after `window.SITE =` is JSON, so keep the quotes and commas valid. Colors live at the top of `style.css`.

## Test locally

Just open `index.html` in a browser. (The admin panel's GitHub features need the site to be online or any browser with internet access.)
