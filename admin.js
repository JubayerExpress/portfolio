/* Admin panel: edits content.js and uploads images straight to your GitHub repo through the
   GitHub API. Access is gated by login.js (login ID + password unlock the encrypted token). */
(function () {
  "use strict";
  var MD = window.MD;
  var $ = function (id) { return document.getElementById(id); };

  var cfg = { owner: "", repo: "", branch: "main", token: "" };
  var D = null;            // the site data being edited
  var sha = null;          // sha of content.js on GitHub
  var connected = false;   // true once loaded from GitHub
  var local = false;       // true in "edit locally" mode
  var dirty = false;
  var previews = {};       // uploaded image path -> data URL (so thumbnails work before deploy)
  var openItems = typeof WeakSet !== "undefined" ? new WeakSet() : { add: function () {}, has: function () { return false; } };
  var tab = "general";

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, "");
      else if (v === false || v == null) { /* skip */ }
      else e.setAttribute(k, v);
    });
    (Array.isArray(kids) ? kids : kids == null ? [] : [kids]).forEach(function (c) {
      e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function toast(msg, kind) {
    var t = h("div", { class: "toast " + (kind || "") }, msg);
    $("toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, kind === "err" ? 7000 : 3500);
  }
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function unb64(s) {
    var bin = atob(s.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "post";
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- GitHub API ---------- */
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + cfg.token,
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    return fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, opts).then(function (r) {
      if (r.ok) return r;
      return r.json().catch(function () { return {}; }).then(function (j) {
        var msg = j.message || ("HTTP " + r.status);
        if (r.status === 401) msg = "GitHub rejected the token (401). Check it is correct and not expired.";
        if (r.status === 404) msg = "Repo, branch or file not found (404). Check owner/repo/branch, and that the token can access this repo.";
        if (r.status === 403) msg = "Access denied (403). The token needs 'Contents: Read and write' on this repo. " + (j.message || "");
        var err = new Error(msg); err.status = r.status; throw err;
      });
    });
  }
  function parseContent(text) {
    var a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b < 0) throw new Error("content.js does not look right (no JSON object found).");
    return JSON.parse(text.slice(a, b + 1));
  }
  function normalize(d) {
    d.roles = d.roles || []; d.ticker = d.ticker || []; d.socials = d.socials || [];
    d.about = d.about || {}; d.about.paragraphs = d.about.paragraphs || []; d.about.facts = d.about.facts || []; d.about.skills = d.about.skills || [];
    d.books = d.books || []; d.research = d.research || []; d.courses = d.courses || [];
    d.education = d.education || {}; ["schooling", "highlights", "achievements", "communities"].forEach(function (k) { d.education[k] = d.education[k] || []; });
    d.blog = d.blog || {}; d.blog.categories = d.blog.categories || ["Education", "Book Reviews", "Movie Reviews", "Game Reviews", "Thoughts"];
    d.posts = d.posts || [];
    d.analytics = d.analytics || {}; if (d.analytics.goatcounter == null) d.analytics.goatcounter = ""; if (d.analytics.showCounter == null) d.analytics.showCounter = true;
    // Every book needs its own ID (orders and reviews use it). Missing or repeated IDs get a fresh one;
    // the first book that has an ID keeps it, so links like #buy/book-1 keep working.
    var seenIds = {};
    d.books.forEach(function (b, i) {
      var id = String(b.id || "").trim();
      if (!id || seenIds[id]) { var n = i + 1; do { id = "book-" + n++; } while (seenIds[id] || d.books.some(function (x) { return x !== b && x.id === id; })); b.id = id; }
      seenIds[id] = true;
    });
    d.shop = d.shop || {};
    var SD = { enabled: true, endpoint: "", currency: "৳", bkashNumber: "", bkashType: "Personal", cod: true, freeNote: "🎓 BRAC University-তে ফ্রি ডেলিভারি!" };
    Object.keys(SD).forEach(function (k) { if (d.shop[k] == null) d.shop[k] = SD[k]; });
    d.shop.delivery = d.shop.delivery || [{ label: "BRAC University (campus)", fee: 0 }, { label: "Inside Dhaka", fee: 60 }, { label: "Outside Dhaka", fee: 120 }];
    d.leads = d.leads || {};
    var LD = { books: "Step inside, slow down, and get lost in a world where every book has a story to tell and every page holds a little piece of magic.", research: "Papers, theses and projects.",
      courses: "Each course lives on its own website. Jump straight in.", blog: "Learning notes, reviews and random thoughts." };
    Object.keys(LD).forEach(function (k) { if (d.leads[k] == null || d.leads[k] === "") d.leads[k] = LD[k]; });
    d.announce = d.announce || {}; if (d.announce.enabled == null) d.announce.enabled = false; d.announce.items = d.announce.items || [];
    return d;
  }
  function loadRemote() {
    var q = "/contents/content.js?ref=" + encodeURIComponent(cfg.branch);
    return api(q).then(function (r) { return r.json(); }).then(function (j) {
      sha = j.sha;
      if (j.content) return unb64(j.content);
      return api(q, { headers: { Accept: "application/vnd.github.raw+json" } }).then(function (r) { return r.text(); });
    }).then(function (text) {
      D = normalize(parseContent(text));
      connected = true; local = false; dirty = false;
      refresh();
    });
  }
  function finalize() {
    var used = {};
    D.posts.forEach(function (p) {
      if (!p.id || /^post-/.test(p.id)) p.id = slug(p.title);
      var base = p.id, n = 2;
      while (used[p.id]) p.id = base + "-" + (n++);
      used[p.id] = 1;
    });
  }
  function build() {
    finalize();
    return "/* Site content. Managed by admin.html (the admin panel), or edit by hand.\n   Keep everything after 'window.SITE =' valid JSON. */\nwindow.SITE = " + JSON.stringify(D, null, 2) + ";\n";
  }
  function put(sendSha) {
    var body = { message: "Update site content via admin panel", content: b64(build()), branch: cfg.branch };
    if (sendSha) body.sha = sendSha;
    return api("/contents/content.js", { method: "PUT", body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function save() {
    if (!connected) { toast("Not connected to GitHub. Log out and log in again, or use Download content.js.", "err"); return; }
    var btn = $("saveBtn"); btn.disabled = true; btn.textContent = "Saving…";
    put(sha).catch(function (e) {
      if (e.status === 409 || e.status === 422) {
        if (!confirm("content.js on GitHub changed since you loaded it. Overwrite it with your version?")) throw new Error("Save cancelled.");
        return api("/contents/content.js?ref=" + encodeURIComponent(cfg.branch)).then(function (r) { return r.json(); }).then(function (j) { return put(j.sha); });
      }
      throw e;
    }).then(function (j) {
      sha = j.content.sha; dirty = false; refresh();
      toast("Saved ✓ The live site updates in about a minute.", "ok");
    }).catch(function (e) { toast(e.message, "err"); })
      .then(function () { btn.textContent = "Save to GitHub"; refresh(); });
  }
  function download() {
    var blob = new Blob([build()], { type: "text/javascript" });
    var a = h("a", { href: URL.createObjectURL(blob), download: "content.js" });
    document.body.appendChild(a); a.click(); a.remove();
    toast("Downloaded. Replace content.js in your repo with it.");
  }

  /* ---------- image upload ---------- */
  function toJpeg(file, maxDim) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, maxDim / Math.max(im.width, im.height));
        var c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL("image/jpeg", 0.86);
        res({ dataUrl: dataUrl, base64: dataUrl.split(",")[1] });
      };
      im.onerror = function () { rej(new Error("Could not read that image file.")); };
      im.src = url;
    });
  }
  function uploadImage(file) {
    if (!connected) return Promise.reject(new Error("Not connected to GitHub. Log out and log in again to upload images."));
    var name = Date.now() + "-" + slug(file.name.replace(/\.[^.]+$/, "")) + ".jpg", path = "assets/uploads/" + name;
    return toJpeg(file, 1600).then(function (img) {
      return api("/contents/" + path, { method: "PUT", body: JSON.stringify({ message: "Upload image " + name, content: img.base64, branch: cfg.branch }) })
        .then(function () { previews[path] = img.dataUrl; return path; });
    });
  }

  /* ---------- status bar ---------- */
  function refresh() {
    var s = $("status");
    s.className = "status" + (dirty ? " dirty" : connected ? " ok" : "");
    s.textContent = (connected ? cfg.owner + "/" + cfg.repo + "@" + cfg.branch : "Not connected") + (dirty ? " · unsaved changes" : "");
    $("saveBtn").disabled = !connected || !dirty;
  }
  function markDirty() { dirty = true; refresh(); }
  addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (connected && dirty) save(); }
  });

  /* ---------- fields ---------- */
  function imageField(o, f, onChange) {
    var thumb = h("div", { class: "thumb" });
    var inp = h("input", { type: "text", placeholder: "assets/uploads/photo.jpg  or  https://…" });
    inp.value = o[f.k] || "";
    var file = h("input", { type: "file", accept: "image/*", hidden: true });
    var up = h("button", { class: "btn s", type: "button" }, "Upload image");
    var clr = h("button", { class: "btn s ghost", type: "button" }, "Clear");
    function show() {
      thumb.textContent = "";
      var v = o[f.k];
      if (!v) { thumb.textContent = "no image"; return; }
      var im = h("img", { src: previews[v] || v, alt: "" });
      im.onerror = function () { thumb.textContent = "can't preview"; };
      thumb.appendChild(im);
    }
    inp.addEventListener("input", function () { o[f.k] = inp.value.trim(); show(); markDirty(); if (onChange) onChange(); });
    up.addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () {
      var fl = file.files[0]; if (!fl) return;
      up.disabled = true; up.textContent = "Uploading…";
      uploadImage(fl).then(function (path) {
        o[f.k] = path; inp.value = path; show(); markDirty(); if (onChange) onChange();
        toast("Image uploaded ✓ (save to publish the change)", "ok");
      }).catch(function (e) { toast(e.message, "err"); })
        .then(function () { up.disabled = false; up.textContent = "Upload image"; file.value = ""; });
    });
    clr.addEventListener("click", function () { o[f.k] = ""; inp.value = ""; show(); markDirty(); if (onChange) onChange(); });
    show();
    return h("div", { class: "f" + (f.wide ? " wide" : "") }, [
      h("span", { class: "l" }, f.l),
      h("div", { class: "imgf" }, [thumb, h("div", { class: "imgc" }, [inp, h("div", { class: "row" }, [up, clr, file])])]),
      f.help ? h("small", null, f.help) : null
    ].filter(Boolean));
  }

  function mdField(o, f, onChange) {
    var ta = h("textarea", { rows: 14, placeholder: "Write in Markdown…" });
    ta.value = o[f.k] || "";
    var prev = h("div", { class: "preview", hidden: true });
    var showing = false;
    function sync() { o[f.k] = ta.value; markDirty(); if (onChange) onChange(); }
    function wrap(before, after, ph) {
      var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph || "";
      ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
      ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; sync();
    }
    function insert(text) {
      var s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length; sync();
    }
    function line(prefix) {
      var s = ta.selectionStart, ls = ta.value.lastIndexOf("\n", s - 1) + 1;
      ta.value = ta.value.slice(0, ls) + prefix + ta.value.slice(ls);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + prefix.length; sync();
    }
    var file = h("input", { type: "file", accept: "image/*", hidden: true });
    file.addEventListener("change", function () {
      var fl = file.files[0]; if (!fl) return;
      toast("Uploading image…");
      uploadImage(fl).then(function (path) { insert("\n\n![" + (fl.name.replace(/\.[^.]+$/, "")) + "](" + path + ")\n\n"); toast("Image added to post ✓", "ok"); })
        .catch(function (e) { toast(e.message, "err"); }).then(function () { file.value = ""; });
    });
    function btn(label, fn, title) { return h("button", { class: "btn s ghost", type: "button", title: title || label, onclick: fn }, label); }
    var pvBtn = btn("Preview", function () {
      showing = !showing;
      ta.hidden = showing; prev.hidden = !showing; pvBtn.textContent = showing ? "Edit" : "Preview";
      if (showing) {
        prev.innerHTML = MD.render(ta.value);
        prev.querySelectorAll("img").forEach(function (im) { var s = im.getAttribute("src"); if (previews[s]) im.src = previews[s]; });
      }
    });
    ta.addEventListener("input", sync);
    return h("div", { class: "f wide mdwrap" }, [
      h("span", { class: "l" }, f.l),
      h("div", { class: "tb" }, [
        btn("H2", function () { line("## "); }, "Heading"), btn("B", function () { wrap("**", "**", "bold"); }, "Bold"),
        btn("I", function () { wrap("*", "*", "italic"); }, "Italic"), btn("Link", function () { wrap("[", "](https://)", "text"); }),
        btn("Quote", function () { line("> "); }), btn("List", function () { line("- "); }),
        btn("Code", function () { wrap("\n```\n", "\n```\n", "code"); }),
        btn("Image", function () { file.click(); }, "Upload and insert an image"), pvBtn, file
      ]),
      ta, prev,
      h("small", null, "Markdown: # headings, **bold**, *italic*, [link](url), ![alt](image), > quote, - list, ``` code.")
    ]);
  }

  function field(o, f, onChange) {
    if (f.t === "image") return imageField(o, f, onChange);
    if (f.t === "md") return mdField(o, f, onChange);
    var input, v = o[f.k];
    function set(val) { o[f.k] = val; markDirty(); if (onChange) onChange(); }
    switch (f.t) {
      case "textarea":
        input = h("textarea", { rows: f.rows || 3 }); input.value = v || "";
        input.addEventListener("input", function () { set(input.value); }); break;
      case "lines":
        input = h("textarea", { rows: f.rows || 4 }); input.value = (v || []).join("\n");
        input.addEventListener("input", function () { set(input.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean)); }); break;
      case "paras":
        input = h("textarea", { rows: f.rows || 6 }); input.value = (v || []).join("\n\n");
        input.addEventListener("input", function () { set(input.value.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean)); }); break;
      case "tags":
        input = h("input", { type: "text", placeholder: "comma, separated, tags" }); input.value = (v || []).join(", ");
        input.addEventListener("input", function () { set(input.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean)); }); break;
      case "select":
        input = h("select"); (typeof f.options === "function" ? f.options() : f.options).forEach(function (op) {
          var val = typeof op === "object" ? op.v : op, lab = typeof op === "object" ? op.l : op;
          var o2 = h("option", { value: val }, lab); if (String(v == null ? "" : v) === String(val)) o2.selected = true; input.appendChild(o2);
        });
        input.addEventListener("change", function () { set(f.num ? (input.value === "" ? "" : +input.value) : input.value); }); break;
      case "bool": {
        input = h("input", { type: "checkbox" }); input.checked = !!v;
        input.addEventListener("change", function () { set(input.checked); });
        return h("label", { class: "f check" + (f.wide ? " wide" : "") }, [input, h("span", null, f.l)]);
      }
      default:
        input = h("input", { type: f.t === "date" ? "date" : "text", placeholder: f.ph || "" }); input.value = v == null ? "" : v;
        input.addEventListener("input", function () { set(input.value); });
    }
    return h("label", { class: "f" + (f.wide ? " wide" : "") }, [h("span", { class: "l" }, f.l), input, f.help ? h("small", null, f.help) : null].filter(Boolean));
  }

  function fieldGrid(o, fields, onChange) {
    // A field with when(o) only shows while that is true (e.g. price only when "Sell this book" is ticked).
    var els = [];
    function sync() { fields.forEach(function (f, i) { if (f.when) els[i].hidden = !f.when(o); }); }
    els = fields.map(function (f) { return field(o, f, function () { sync(); if (onChange) onChange(); }); });
    sync();
    return h("div", { class: "grid" }, els);
  }

  function listEditor(arr, fields, opt) {
    var wrap = h("div");
    function render() {
      wrap.textContent = "";
      if (!arr.length) wrap.appendChild(h("p", { class: "empty" }, "Nothing here yet."));
      arr.forEach(function (item, i) {
        var title = h("span", { class: "t" }, opt.title(item, i));
        function ctl(label, fn, cls, tt) {
          return h("button", { class: "btn s ghost " + (cls || ""), type: "button", title: tt || label, onclick: function (e) { e.preventDefault(); e.stopPropagation(); fn(); } }, label);
        }
        var det = h("details", { class: "item" }, [
          h("summary", null, [title, h("span", { class: "ctl" }, [
            ctl("↑", function () { if (i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); markDirty(); render(); } }, "", "Move up"),
            ctl("↓", function () { if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); markDirty(); render(); } }, "", "Move down"),
            ctl("Delete", function () { if (confirm("Delete this item?")) { arr.splice(i, 1); markDirty(); render(); } }, "danger")
          ])]),
          h("div", { class: "body" }, [fieldGrid(item, fields, function () { title.textContent = opt.title(item, i); })])
        ]);
        if (openItems.has(item)) det.open = true;
        det.addEventListener("toggle", function () { if (det.open) openItems.add(item); });
        wrap.appendChild(det);
      });
    }
    render();
    return h("div", null, [
      h("div", { class: "row", style: "margin-bottom:12px" }, [
        h("button", { class: "btn s", type: "button", onclick: function () {
          var n = opt.blank(); openItems.add(n);
          if (opt.addFirst) arr.unshift(n); else arr.push(n);
          markDirty(); render();
        } }, opt.add || "+ Add")
      ]),
      wrap
    ]);
  }

  /* ---------- tabs ---------- */
  var TABS = [
    ["visitors", "Visitors"], ["orders", "Orders"], ["reviews", "Reviews"], ["coupons", "Coupons"], ["general", "General"], ["announce", "Announcement"], ["about", "About"], ["books", "Books"], ["shop", "Shop settings"],
    ["education", "Education"], ["research", "Research"], ["courses", "Courses"], ["posts", "Blog posts"], ["account", "Account"]
  ];
  function renderTabs() {
    var nav = $("tabs"); nav.textContent = "";
    TABS.forEach(function (t) {
      nav.appendChild(h("button", { class: t[0] === tab ? "on" : "", type: "button", onclick: function () { tab = t[0]; renderTabs(); renderPanel(); } }, t[1]));
    });
  }
  function head(title, hint) { return [h("h2", null, title), h("p", { class: "hint" }, hint)]; }
  function card(title, child) { return h("section", { class: "card" }, [title ? h("h3", null, title) : null, child].filter(Boolean)); }

  function renderPanel() {
    var p = $("panel"); p.textContent = "";
    if (tab !== "account" && !D) { tab = "account"; renderTabs(); }
    var kids = [];
    if (tab === "account") kids = panelAccount();
    else if (tab === "visitors") kids = panelVisitors();
    else if (tab === "orders") kids = panelOrders();
    else if (tab === "reviews") kids = panelReviews();
    else if (tab === "coupons") kids = panelCoupons();
    else if (tab === "shop") kids = panelShop();
    else if (tab === "announce") kids = panelAnnounce();
    else if (tab === "general") kids = panelGeneral();
    else if (tab === "about") kids = panelAbout();
    else if (tab === "books") kids = panelBooks();
    else if (tab === "education") kids = panelEducation();
    else if (tab === "research") kids = panelResearch();
    else if (tab === "courses") kids = panelCourses();
    else if (tab === "posts") kids = panelPosts();
    kids.forEach(function (k) { p.appendChild(k); });
  }

  function panelAccount() {
    function lab(txt, el, help) { return h("label", { class: "f" }, [h("span", { class: "l" }, txt), el, help ? h("small", null, help) : null].filter(Boolean)); }
    var id = h("input", { type: "text", autocomplete: "username", autocapitalize: "none", spellcheck: "false" });
    var pw = h("input", { type: "password", autocomplete: "new-password" });
    var pw2 = h("input", { type: "password", autocomplete: "new-password" });
    var tk = h("input", { type: "password", autocomplete: "off", placeholder: "leave empty to keep the current token" });
    var go = h("button", { class: "btn primary", type: "button" }, "Update login");
    go.addEventListener("click", function () {
      var newId = id.value.trim();
      if (newId.length < 3) { toast("Login ID must be at least 3 characters.", "err"); return; }
      if (pw.value.length < 10) { toast("Password must be at least 10 characters.", "err"); return; }
      if (pw.value !== pw2.value) { toast("The two passwords do not match.", "err"); return; }
      var newToken = tk.value.trim();
      go.disabled = true; go.textContent = "Saving…";
      window.AdminAuth.changeLogin({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, token: cfg.token }, newId, pw.value, newToken)
        .then(function (s) {
          cfg.token = s.token; id.value = pw.value = pw2.value = tk.value = "";
          toast("Login updated ✓ It applies on all devices in about a minute.", "ok");
          if (!D) return loadRemote().then(function () { tab = "general"; renderTabs(); renderPanel(); });
        })
        .catch(function (e) { toast(e.message, "err"); })
        .then(function () { go.disabled = false; go.textContent = "Update login"; });
    });
    var out = h("button", { class: "btn danger", type: "button" }, "Log out");
    out.addEventListener("click", function () {
      if (dirty && !confirm("You have unsaved changes. Log out and discard them?")) return;
      dirty = false; window.AdminAuth.logout();
    });
    return head("Account", "You are logged in. The session ends when you close this tab, or after 30 minutes without activity.").concat([
      card("Session", h("div", null, [
        h("p", { class: "hint", style: "margin-bottom:12px" }, "Publishing to " + cfg.owner + "/" + cfg.repo + " (" + cfg.branch + ")."),
        out
      ])),
      card("Change login ID or password", h("div", null, [
        h("div", { class: "grid" }, [lab("New login ID", id), lab("New password", pw, "At least 10 characters. A long passphrase is best."), lab("Repeat new password", pw2), lab("Replace GitHub token (optional)", tk, "Only needed if your token expired or you made a new one.")]),
        h("div", { class: "row", style: "margin-top:16px" }, [go])
      ])),
      card("Good to know", h("ul", { class: "steps" }, [
        h("li", null, "Your GitHub token is stored encrypted in vault.js. Only your ID and password can unlock it."),
        h("li", null, "Pick a strong, unique password: the encrypted file is public, so the password is the only lock."),
        h("li", null, "Forgot the password? Make a new GitHub token, delete vault.js from the repo, and open admin.html to run the setup again.")
      ]))
    ]);
  }

  /* ---------- visitors (GoatCounter) ---------- */
  function gcCode() { return String((D.analytics && D.analytics.goatcounter) || "").trim().toLowerCase(); }
  function gcValid(c) { return /^[a-z0-9][a-z0-9-]*$/.test(c); }
  function ymd(back) {
    var d = new Date(); d.setDate(d.getDate() - back);
    var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  // Reads GoatCounter's public counter. A path with no visits yet answers 404, which means 0.
  function gcGet(path, query) {
    var url = "https://" + gcCode() + ".goatcounter.com/counter/" + encodeURIComponent(path) + ".json" + (query ? "?" + query : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (r.status === 404) return 0;
      if (!r.ok) { var e = new Error("GoatCounter answered " + r.status); e.status = r.status; throw e; }
      return r.json().then(function (j) { return parseInt(String(j.count || "0").replace(/\D/g, ""), 10) || 0; });
    });
  }
  function skipOwn() { try { return localStorage.getItem("skipgc") === "t"; } catch (e) { return false; } }
  function panelVisitors() {
    var code = gcCode();
    var settings = card("Settings", h("div", null, [
      fieldGrid(D.analytics, [{ k: "goatcounter", t: "text", l: "GoatCounter code", wide: true, help: "Only the code, e.g. jubayer for jubayer.goatcounter.com. Leave empty to turn counting off. Press Save to GitHub after changing it." }, { k: "showCounter", t: "bool", l: "Show the visitor count on the home page", wide: true }]),
      h("div", { class: "row", style: "margin-top:14px" }, [
        h("button", { class: "btn s", type: "button", onclick: function () { renderPanel(); } }, "Apply & refresh"),
        (function () {
          var b = h("button", { class: "btn s ghost", type: "button" }, "");
          function label() { b.textContent = skipOwn() ? "✓ Not counting my visits on this browser" : "Don't count my own visits on this browser"; }
          b.addEventListener("click", function () {
            try { if (skipOwn()) localStorage.removeItem("skipgc"); else localStorage.setItem("skipgc", "t"); } catch (e) {}
            label(); toast(skipOwn() ? "Your visits from this browser won't be counted." : "Your visits from this browser will be counted again.", "ok");
          });
          label(); return b;
        })()
      ])
    ]));
    var setup = card("One-time setup (about 2 minutes)", h("ol", { class: "steps" }, [
      h("li", null, ["Sign up free at ", h("a", { href: "https://www.goatcounter.com/signup", target: "_blank", rel: "noopener" }, "goatcounter.com/signup"), ". Pick a code, e.g. ", h("b", null, "jubayer"), "."]),
      h("li", null, ["In GoatCounter go to ", h("b", null, "Settings"), " and tick ", h("b", null, "“Allow adding visitor counts on your website”"), ", then save. This lets this page read the numbers."]),
      h("li", null, "Type the code in the box below and press Save to GitHub. Counting starts in about a minute."),
      h("li", null, "GoatCounter uses no cookies, so the site does not need a cookie banner.")
    ]));
    if (!code) return head("Visitors", "See how many people visit your site.").concat([setup, settings]);
    if (!gcValid(code)) return head("Visitors", "See how many people visit your site.").concat([
      h("p", { class: "verr" }, "“" + code + "” is not a valid GoatCounter code. Use only letters, numbers and dashes."), settings, setup]);

    var ranges = [["Today", "start=" + ymd(0)], ["Last 7 days", "start=" + ymd(6)], ["Last 30 days", "start=" + ymd(29)], ["All time", ""]];
    var tiles = ranges.map(function (r) { var b = h("b", null, "…"); return { b: b, q: r[1], el: h("div", { class: "vstat" }, [b, h("span", null, r[0])]) }; });
    var msg = h("p", { class: "verr", hidden: true }, "");
    var list = h("ol", { class: "vposts" }, [h("li", { class: "empty" }, "Loading…")]);
    var fmt = function (n) { return n.toLocaleString(); };

    Promise.all(tiles.map(function (t) {
      return gcGet("TOTAL", t.q).then(function (n) { t.b.textContent = fmt(n); });
    })).catch(function (e) {
      tiles.forEach(function (t) { if (t.b.textContent === "…") t.b.textContent = "–"; });
      msg.hidden = false;
      msg.textContent = "Couldn't read the counts (" + (e.status ? e.message : "network error") + "). Check that the code is right and that “Allow adding visitor counts on your website” is ticked in GoatCounter settings.";
    });

    var posts = D.posts.filter(function (p) { return !p.draft && p.id && !/^post-/.test(p.id); });
    Promise.all(posts.map(function (p) {
      return gcGet("/post/" + p.id, "").then(function (n) { return { p: p, n: n }; }, function () { return { p: p, n: -1 }; });
    })).then(function (rows) {
      list.textContent = "";
      if (!rows.length) { list.appendChild(h("li", { class: "empty" }, "No published posts yet.")); return; }
      rows.sort(function (a, b) { return b.n - a.n; });
      var max = Math.max(1, rows[0].n);
      rows.forEach(function (r) {
        var bar = h("i"); bar.style.width = (r.n > 0 ? Math.max(2, r.n / max * 100) : 0) + "%";
        list.appendChild(h("li", null, [
          h("a", { href: "index.html#post/" + encodeURIComponent(r.p.id), target: "_blank", rel: "noopener" }, r.p.title || r.p.id),
          h("span", { class: "vbar" }, [bar]),
          h("b", null, r.n < 0 ? "–" : fmt(r.n))
        ]));
      });
    });

    return head("Visitors", "Visits to your site, counted by GoatCounter. New visits can take a few minutes to show up.").concat([
      h("div", { class: "vstats" }, tiles.map(function (t) { return t.el; })),
      msg,
      card("Most-read posts", h("div", null, [list, h("p", { class: "hint", style: "margin:12px 0 0" }, "Views count each time someone opens a post, once per visit.")])),
      card("More detail", h("p", { class: "hint", style: "margin:0" }, [
        "Countries, devices, where visitors came from and daily charts are on your ",
        h("a", { href: "https://" + code + ".goatcounter.com", target: "_blank", rel: "noopener" }, "GoatCounter dashboard ↗"), "."
      ])),
      settings
    ]);
  }

  /* ---------- shop: orders, reviews, settings (backend = shop-backend.gs in a Google Sheet) ---------- */
  var shopCache = null;   // last admin.list answer
  function shopUrl() { return String((D.shop && D.shop.endpoint) || "").trim(); }
  function shopApi(body) {
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(shopUrl())) return Promise.reject(new Error("Add your Shop backend URL in Shop settings first."));
    body.token = cfg.token;
    return fetch(shopUrl(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }, function () { throw new Error("Couldn't reach the shop backend. Check your internet."); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "The shop backend said no."); return j; });
  }
  function clean(v) { return String(v == null ? "" : v).replace(/^'/, ""); }
  function when(v) { var d = new Date(v); return isNaN(d) ? clean(v) : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
  function taka(n) { return "৳" + (Number(n) || 0).toLocaleString("en-IN"); }
  function loadShop(force) {
    if (shopCache && !force) return Promise.resolve(shopCache);
    return shopApi({ action: "admin.list" }).then(function (j) { shopCache = j; return j; });
  }
  function shopShell(title, hint, build) {
    var box = h("div", null, [h("p", { class: "empty" }, "Loading…")]);
    var bar = h("div", { class: "row", style: "margin:-8px 0 18px" }, [
      h("button", { class: "btn s", type: "button", onclick: function () { shopCache = null; renderPanel(); } }, "↻ Refresh")
    ]);
    loadShop().then(function (j) {
      box.textContent = "";
      if (j.sheetUrl) bar.appendChild(h("a", { class: "btn s ghost", href: j.sheetUrl, target: "_blank", rel: "noopener" }, "Open Google Sheet ↗"));
      build(box, j);
    }).catch(function (e) {
      box.textContent = "";
      box.appendChild(h("p", { class: "verr", style: "margin:0 0 14px" }, e.message));
      if (!shopUrl()) box.appendChild(h("button", { class: "btn s", type: "button", onclick: function () { tab = "shop"; renderTabs(); renderPanel(); } }, "Go to Shop settings →"));
    });
    return head(title, hint).concat([bar, box]);
  }

  var ORDER_STATUS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  var orderFilter = "Pending";
  function panelOrders() {
    return shopShell("Orders", "New orders appear here. Check the bKash TrxID in your bKash app, call the buyer, then move the order along.", function (box, j) {
      var orders = j.orders || [];
      var count = function (st) { return orders.filter(function (o) { return o.Status === st; }).length; };
      var earned = orders.filter(function (o) { return o.Status === "Delivered"; }).reduce(function (s, o) { return s + (Number(o.Total) || 0); }, 0);
      box.appendChild(h("div", { class: "vstats" }, [
        ["New", count("Pending")], ["To deliver", count("Confirmed") + count("Shipped")], ["Delivered", count("Delivered")], ["Earned", taka(earned)]
      ].map(function (t) { return h("div", { class: "vstat" }, [h("b", null, String(t[1])), h("span", null, t[0])]); })));
      var chips = h("div", { class: "fchips" });
      ["All"].concat(ORDER_STATUS).forEach(function (st) {
        var n = st === "All" ? orders.length : count(st);
        chips.appendChild(h("button", { class: "fchip" + (orderFilter === st ? " on" : ""), type: "button", onclick: function () { orderFilter = st; renderPanel(); } }, st + " (" + n + ")"));
      });
      box.appendChild(chips);
      var list = orders.filter(function (o) { return orderFilter === "All" || o.Status === orderFilter; });
      if (!list.length) { box.appendChild(h("p", { class: "empty" }, orders.length ? "No orders with this status." : "No orders yet. They will show up here.")); return; }
      list.forEach(function (o) { box.appendChild(orderCard(o)); });
    });
  }
  function orderCard(o) {
    var id = clean(o["Order ID"]), bk = /bkash/i.test(o.Payment), phone = clean(o.Phone);
    var sel = h("select", { class: "st-sel" });
    ORDER_STATUS.forEach(function (st) { var op = h("option", { value: st }, st); if (st === o.Status) op.selected = true; sel.appendChild(op); });
    var pill = h("span", { class: "pill st-" + String(o.Status).toLowerCase() }, o.Status);
    sel.addEventListener("change", function () {
      var old = o.Status, nv = sel.value; sel.disabled = true;
      shopApi({ action: "admin.order", id: id, status: nv }).then(function () {
        o.Status = nv; pill.textContent = nv; pill.className = "pill st-" + nv.toLowerCase(); toast(id + " → " + nv, "ok");
      }).catch(function (e) { sel.value = old; toast(e.message, "err"); }).then(function () { sel.disabled = false; });
    });
    var note = h("input", { type: "text", placeholder: "Private note (only you see this)", value: clean(o["Admin note"]) });
    note.addEventListener("change", function () {
      shopApi({ action: "admin.order", id: id, adminNote: note.value }).then(function () { o["Admin note"] = note.value; toast("Note saved", "ok"); }).catch(function (e) { toast(e.message, "err"); });
    });
    function copy(txt) { return h("button", { class: "mini", type: "button", onclick: function (e) { var b = e.target; if (navigator.clipboard) navigator.clipboard.writeText(txt); b.textContent = "✓"; setTimeout(function () { b.textContent = "Copy"; }, 1200); } }, "Copy"); }
    var digits = phone.replace(/\D/g, ""), wa = digits.replace(/^0/, "880");
    return h("article", { class: "ord" }, [
      h("div", { class: "ord-top" }, [h("b", { class: "mono" }, id), pill, h("time", null, when(o.Time))]),
      h("div", { class: "ord-main" }, [
        h("div", null, [h("b", null, clean(o.Book)), " × " + o.Qty, h("small", null, taka(o["Unit price"]) + " each · " + clean(o["Delivery area"]) + " (" + (Number(o["Delivery fee"]) ? taka(o["Delivery fee"]) : "free") + ")")]),
        h("div", { class: "ord-total" }, taka(o.Total))
      ]),
      h("div", { class: "ord-pay" + (bk ? " bk" : "") }, bk
        ? [h("b", null, "bKash"), " TrxID ", h("b", { class: "mono" }, clean(o.TrxID)), copy(clean(o.TrxID)), h("span", null, " from " + clean(o["bKash sender"]))]
        : [h("b", null, "💵 Cash on delivery")]),
      h("div", { class: "ord-who" }, [
        h("div", null, [h("span", { class: "k" }, "Name"), clean(o.Name)]),
        h("div", null, [h("span", { class: "k" }, "Phone"), h("a", { href: "tel:" + digits }, phone), " ", h("a", { class: "mini", href: "https://wa.me/" + wa, target: "_blank", rel: "noopener" }, "WhatsApp")]),
        o.Email ? h("div", null, [h("span", { class: "k" }, "Email"), h("a", { href: "mailto:" + clean(o.Email) }, clean(o.Email))]) : null,
        h("div", { class: "wide" }, [h("span", { class: "k" }, "Address"), clean(o.Address)]),
        o.Note ? h("div", { class: "wide" }, [h("span", { class: "k" }, "Note"), clean(o.Note)]) : null
      ].filter(Boolean)),
      h("div", { class: "ord-ctl" }, [h("label", null, ["Status ", sel]), note])
    ]);
  }

  var reviewFilter = "Pending";
  function panelReviews() {
    return shopShell("Reviews", "New reviews wait here until you approve them. Only approved reviews show on the site.", function (box, j) {
      var all = j.reviews || [];
      var count = function (st) { return all.filter(function (r) { return r.Status === st; }).length; };
      var chips = h("div", { class: "fchips" });
      ["Pending", "Approved", "Hidden", "All"].forEach(function (st) {
        chips.appendChild(h("button", { class: "fchip" + (reviewFilter === st ? " on" : ""), type: "button", onclick: function () { reviewFilter = st; renderPanel(); } }, st + " (" + (st === "All" ? all.length : count(st)) + ")"));
      });
      box.appendChild(chips);
      var list = all.filter(function (r) { return reviewFilter === "All" || r.Status === reviewFilter; });
      if (!list.length) { box.appendChild(h("p", { class: "empty" }, all.length ? "Nothing here." : "No reviews yet.")); return; }
      list.forEach(function (r) {
        var id = clean(r["Review ID"]), n = Math.max(0, Math.min(5, Number(r.Rating) || 0));
        var pill = h("span", { class: "pill st-" + String(r.Status).toLowerCase() }, r.Status);
        var el = h("article", { class: "ord rv" });
        function act(label, status, cls) {
          return h("button", { class: "btn s " + (cls || "ghost"), type: "button", onclick: function () {
            if (status === "delete" && !confirm("Delete this review for good?")) return;
            var p = status === "delete" ? shopApi({ action: "admin.reviewDelete", id: id }) : shopApi({ action: "admin.review", id: id, status: status });
            p.then(function () {
              if (status === "delete") { j.reviews = all.filter(function (x) { return x !== r; }); toast("Review deleted", "ok"); }
              else { r.Status = status; toast(status === "Approved" ? "Approved: it's on the site now" : "Hidden from the site", "ok"); }
              renderPanel();
            }).catch(function (e) { toast(e.message, "err"); });
          } }, label);
        }
        el.appendChild(h("div", { class: "ord-top" }, [h("b", null, clean(r.Name)), h("span", { class: "rstars" }, "★".repeat(n) + "☆".repeat(5 - n)), pill, h("time", null, when(r.Time))]));
        el.appendChild(h("p", { class: "rv-book" }, "on " + clean(r.Book)));
        el.appendChild(h("p", { class: "rv-text" }, clean(r.Review)));
        el.appendChild(h("div", { class: "row" }, [
          r.Status !== "Approved" ? act("✓ Approve", "Approved", "") : null,
          r.Status !== "Hidden" ? act("Hide", "Hidden") : null,
          act("Delete", "delete", "ghost danger")
        ].filter(Boolean)));
        box.appendChild(el);
      });
    });
  }

  function panelShop() {
    var S2 = D.shop;
    var test = h("span", { class: "hint", style: "margin:0" }, "");
    var copyCode = h("button", { class: "btn s", type: "button", onclick: function () {
      fetch("shop-backend.gs", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (code) {
        return navigator.clipboard.writeText(code).then(function () { toast("Backend code copied. Paste it into Apps Script.", "ok"); });
      }).catch(function () { window.open("shop-backend.gs", "_blank"); toast("Opened the code in a new tab. Select all and copy it.", "ok"); });
    } }, "📋 Copy backend code");
    return head("Shop settings", "Sell your books with bKash or cash on delivery. Turn on selling for each book in the Books tab.").concat([
      card("1 · Connect your Google Sheet (one time)", h("div", null, [
        h("ol", { class: "steps" }, [
          h("li", null, ["Make a new Google Sheet at ", h("a", { href: "https://sheets.new", target: "_blank", rel: "noopener" }, "sheets.new"), ", name it e.g. “Book orders”."]),
          h("li", null, ["In the Sheet: ", h("b", null, "Extensions → Apps Script"), ". Delete what's there, then paste the backend code: ", copyCode]),
          h("li", null, ["Check line 14 says your GitHub username (", h("b", null, cfg.owner || "JubayerExpress"), "). Click 💾 Save."]),
          h("li", null, [h("b", null, "Deploy → New deployment"), " → ⚙ type ", h("b", null, "Web app"), " → Execute as ", h("b", null, "Me"), ", Who has access ", h("b", null, "Anyone"), " → Deploy → allow the permissions."]),
          h("li", null, "Copy the Web app URL (ends with /exec) and paste it below. Then press Test, and Save to GitHub.")
        ]),
        fieldGrid(S2, [{ k: "endpoint", t: "text", l: "Shop backend URL", wide: true, ph: "https://script.google.com/macros/s/…/exec" }]),
        h("div", { class: "row", style: "margin-top:12px;align-items:center" }, [
          h("button", { class: "btn s", type: "button", onclick: function () {
            test.textContent = "Testing…"; test.style.color = "";
            fetch(shopUrl()).then(function (r) { return r.json(); }).then(function (j) { if (!j.ready) throw 0; return shopApi({ action: "admin.list" }); })
              .then(function (j) { shopCache = j; test.textContent = "✓ Connected. Orders: " + j.orders.length + ", reviews: " + j.reviews.length; test.style.color = "var(--ok)"; })
              .catch(function (e) { test.textContent = "✗ " + ((e && e.message) || "Not working. Check the URL and that access is set to Anyone."); test.style.color = "var(--red)"; });
          } }, "Test connection"), test
        ])
      ])),
      card("2 · Payment", fieldGrid(S2, [
        { k: "bkashNumber", t: "text", l: "Your bKash number", ph: "01XXXXXXXXX", help: "Buyers send money here. Leave empty to turn off bKash." },
        { k: "bkashType", t: "select", l: "bKash account type", options: ["Personal", "Agent", "Merchant"] },
        { k: "cod", t: "bool", l: "Allow cash on delivery", wide: true }
      ])),
      card("3 · Delivery areas", h("div", null, [
        h("p", { class: "hint", style: "margin:0 0 12px" }, "The first area is selected by default. Fee 0 shows as “Free delivery”."),
        listEditor(S2.delivery, [{ k: "label", t: "text", l: "Area name" }, { k: "fee", t: "text", l: "Delivery fee (৳)", ph: "0" }], {
          title: function (a) { return (a.label || "Area") + " · " + (Number(a.fee) ? "৳" + a.fee : "Free"); }, blank: function () { return { label: "New area", fee: 0 }; }, add: "+ Add area"
        }),
        fieldGrid(S2, [{ k: "freeNote", t: "text", l: "Banner in the order form", wide: true, help: "Shown at the top of the order form, e.g. free delivery for BRAC University." }])
      ])),
      card("4 · On / off", fieldGrid(S2, [{ k: "enabled", t: "bool", l: "Shop is open (untick to hide all Buy buttons and reviews)", wide: true }]))
    ]);
  }

  function panelAnnounce() {
    var A2 = D.announce;
    return head("Announcement", "A scrolling notice bar at the very top of the site. Great for new books, offers and news.").concat([
      card(null, fieldGrid(A2, [{ k: "enabled", t: "bool", l: "Show the announcement bar", wide: true }])),
      card("Notices (they scroll one after another)", listEditor(A2.items, [
        { k: "text", t: "text", l: "Text", wide: true },
        { k: "link", t: "text", l: "Link (optional)", wide: true, help: "Any web address, a section like #books, or #buy/BOOK-ID to open a book's order form (book IDs are in the Books tab)." },
        { k: "isNew", t: "bool", l: "Show a glowing NEW badge" }
      ], { title: function (x) { return (x.isNew ? "🆕 " : "") + (x.text || "Empty notice"); }, blank: function () { return { text: "New notice", link: "", isNew: false }; }, add: "+ Add notice", addFirst: true })),
      h("p", { class: "hint" }, "Visitors can close the bar. It comes back for them when you change the notices.")
    ]);
  }

  /* ---------- coupons (stored in the Google Sheet, so they never show in the site's code) ---------- */
  var CP_TYPES = [{ v: "percent", l: "% off" }, { v: "flat", l: "৳ off" }, { v: "freeship", l: "Free delivery" }];
  function cpOffer(c) { return c.type === "percent" ? (c.value || 0) + "% OFF" : c.type === "flat" ? "৳" + (c.value || 0) + " OFF" : "FREE DELIVERY"; }
  function cpState(c) {
    var today = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);   // Dhaka date
    if (!c.active) return ["Off", "cancelled"];
    if (c.expires && today > c.expires) return ["Expired", "cancelled"];
    if (c.uses && c.used >= c.uses) return ["Used up", "cancelled"];
    return ["Active", "approved"];
  }
  function panelCoupons() {
    return shopShell("Coupons", "Make discount codes for your buyers. Codes live in your Google Sheet, so nobody can find them in the website's code.", function (box, j) {
      var list = j.coupons || [];
      box.appendChild(h("div", { class: "row", style: "margin-bottom:16px" }, [
        h("button", { class: "btn s", type: "button", onclick: function () {
          var fresh = { code: "", type: "percent", value: 10, min: 0, max: 0, expires: "", uses: 0, used: 0, active: true, show: false, book: "", note: "", _new: true };
          list.unshift(fresh); renderPanel();
        } }, "+ New coupon")
      ]));
      if (!list.length) { box.appendChild(h("p", { class: "empty" }, "No coupons yet. Press + New coupon to make one, e.g. BRACU10 for 10% off.")); return; }
      list.forEach(function (c) { box.appendChild(couponCard(c, list)); });
    });
  }
  function couponCard(c, list) {
    var orig = c.code, st = cpState(c);
    function inp(k, type, ph, extra) {
      var e = h("input", Object.assign({ type: type || "text", placeholder: ph || "" }, extra || {}));
      e.value = c[k] == null ? "" : c[k];
      e.addEventListener("input", function () { c[k] = type === "number" ? (e.value === "" ? 0 : +e.value) : e.value; paintHead(); });
      return e;
    }
    function lab(text, el, help) { return h("label", { class: "f" }, [h("span", { class: "l" }, text), el, help ? h("small", null, help) : null].filter(Boolean)); }
    function check(k, text) {
      var e = h("input", { type: "checkbox" }); e.checked = !!c[k];
      e.addEventListener("change", function () { c[k] = e.checked; paintHead(); });
      return h("label", { class: "f check" }, [e, h("span", null, text)]);
    }
    var codeIn = inp("code", "text", "e.g. BRACU10", { class: "mono", maxlength: "24" });
    codeIn.addEventListener("input", function () { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""); c.code = codeIn.value; paintHead(); });
    var typeSel = h("select");
    CP_TYPES.forEach(function (t) { var o = h("option", { value: t.v }, t.l); if (t.v === c.type) o.selected = true; typeSel.appendChild(o); });
    var valueWrap, maxWrap;
    typeSel.addEventListener("change", function () { c.type = typeSel.value; showFields(); paintHead(); });
    var bookSel = h("select"); bookSel.appendChild(h("option", { value: "" }, "All books"));
    (D.books || []).forEach(function (b) { var o = h("option", { value: b.id }, b.title); if (b.id === c.book) o.selected = true; bookSel.appendChild(o); });
    bookSel.addEventListener("change", function () { c.book = bookSel.value; });
    var offerEl = h("span", { class: "cpa-offer" }), codeEl = h("b", { class: "mono" }), pill = h("span", { class: "pill" }), usedEl = h("small");
    function paintHead() {
      st = cpState(c);
      offerEl.textContent = cpOffer(c); codeEl.textContent = c.code || "NEW CODE";
      pill.textContent = c._new ? "Not saved" : st[0]; pill.className = "pill st-" + (c._new ? "pending" : st[1]);
      usedEl.textContent = "Used " + (c.used || 0) + (c.uses ? " / " + c.uses : "") + " times";
    }
    function showFields() { valueWrap.hidden = c.type === "freeship"; maxWrap.hidden = c.type !== "percent"; }
    valueWrap = lab("Amount", inp("value", "number", "", { min: "0" }), "Percent for % off, taka for ৳ off.");
    maxWrap = lab("Biggest discount (৳, optional)", inp("max", "number", "0 = no limit", { min: "0" }));
    var saveBtn = h("button", { class: "btn s", type: "button" }, "Save coupon");
    saveBtn.addEventListener("click", function () {
      if ((c.code || "").length < 3) { toast("Give the coupon a code of at least 3 letters or numbers.", "err"); return; }
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      var send = { code: c.code, type: c.type, value: c.value, min: c.min, max: c.max, expires: c.expires, uses: c.uses, active: c.active, show: c.show, book: c.book, note: c.note };
      shopApi({ action: "admin.couponSave", coupon: send, original: c._new ? "" : orig }).then(function (r) {
        delete c._new; c.code = r.code; orig = r.code; delBtn.textContent = "Delete"; toast("Coupon " + r.code + " saved ✓", "ok"); paintHead();
      }).catch(function (e) { toast(e.message, "err"); }).then(function () { saveBtn.disabled = false; saveBtn.textContent = "Save coupon"; });
    });
    var delBtn = h("button", { class: "btn s ghost danger", type: "button", onclick: function () {
      if (c._new) { list.splice(list.indexOf(c), 1); renderPanel(); return; }
      if (!confirm("Delete coupon " + orig + "? Buyers won't be able to use it any more.")) return;
      shopApi({ action: "admin.couponDelete", code: orig }).then(function () { list.splice(list.indexOf(c), 1); toast("Coupon deleted", "ok"); renderPanel(); })
        .catch(function (e) { toast(e.message, "err"); });
    } }, c._new ? "Cancel" : "Delete");
    var el = h("article", { class: "ord cpa" }, [
      h("div", { class: "cpa-head" }, [h("div", { class: "cpa-left" }, [offerEl]), h("div", { class: "cpa-right" }, [codeEl, pill, usedEl])]),
      h("div", { class: "grid" }, [
        lab("Code", codeIn, "Letters and numbers. Buyers type this."),
        lab("Discount type", typeSel),
        valueWrap, maxWrap,
        lab("Minimum order (৳, optional)", inp("min", "number", "0 = any order", { min: "0" })),
        lab("Last day (optional)", inp("expires", "date")),
        lab("How many times it can be used", inp("uses", "number", "0 = no limit", { min: "0" }), "Counted across all buyers."),
        lab("Works on", bookSel),
        h("label", { class: "f wide" }, [h("span", { class: "l" }, "Short note on the coupon (optional)"), inp("note", "text", "e.g. For BRACU students 🎓", { maxlength: "200" })]),
        check("active", "Active (buyers can use it)"),
        check("show", "Show it on the website as a coupon ticket")
      ]),
      h("div", { class: "row" }, [saveBtn, delBtn])
    ]);
    showFields(); paintHead();
    return el;
  }

  var SOCIAL = [{ k: "label", t: "text", l: "Label" }, { k: "url", t: "url", l: "URL" }];
  function panelGeneral() {
    return head("General", "Your name, intro, hero photo and links.").concat([
      card("Basics", fieldGrid(D, [
        { k: "name", t: "text", l: "Display name" }, { k: "fullName", t: "text", l: "Full name" },
        { k: "siteTitle", t: "text", l: "Browser tab title", wide: true },
        { k: "intro", t: "textarea", l: "Intro (under your name)", wide: true },
        { k: "email", t: "text", l: "Contact email" },
        { k: "heroImage", t: "image", l: "Home page photo", wide: true, help: "Shown in the big shape on the home page." },
        { k: "roles", t: "lines", l: "Rotating titles (one per line)" },
        { k: "ticker", t: "lines", l: "Scrolling banner words (one per line)" }
      ])),
      card("Social links", listEditor(D.socials, SOCIAL, { title: function (s) { return s.label || "Link"; }, blank: function () { return { label: "New", url: "https://" }; }, add: "+ Add link" })),
      card("Section descriptions", fieldGrid(D.leads, [
        { k: "books", t: "textarea", l: "Books", wide: true },
        { k: "research", t: "textarea", l: "Research", wide: true },
        { k: "courses", t: "textarea", l: "Courses", wide: true },
        { k: "blog", t: "textarea", l: "Blog", wide: true }
      ]))
    ]);
  }
  function panelAbout() {
    return head("About", "Your story, quick facts and skills.").concat([
      card("Profile", fieldGrid(D.about, [
        { k: "photo", t: "image", l: "About page photo", wide: true },
        { k: "paragraphs", t: "paras", l: "Bio (separate paragraphs with a blank line)", wide: true, rows: 8 },
        { k: "skills", t: "tags", l: "Skills & tools (comma separated)", wide: true }
      ])),
      card("Quick facts", listEditor(D.about.facts, [{ k: "label", t: "text", l: "Label" }, { k: "value", t: "text", l: "Value" }], {
        title: function (f) { return (f.label || "Fact") + ": " + (f.value || ""); }, blank: function () { return { label: "Label", value: "Value" }; }, add: "+ Add fact"
      }))
    ]);
  }
  function panelBooks() {
    return head("Books", "Add your books with cover images.").concat([
      card(null, listEditor(D.books, [
        { k: "title", t: "text", l: "Title" }, { k: "year", t: "text", l: "Year / status" },
        { k: "blurb", t: "textarea", l: "Description", wide: true },
        { k: "tags", t: "tags", l: "Tags" }, { k: "link", t: "text", l: "Link (buy / read / download)" }, { k: "linkText", t: "text", l: "Button text" },
        { k: "image", t: "image", l: "Cover image", wide: true },
        { k: "badge", t: "text", l: "Ribbon on the cover (optional)", ph: "e.g. New arrival, Bestseller, Pre-order" },
        { k: "forSale", t: "bool", l: "🛒 Sell this book on the site (shows price + Buy button)", wide: true },
        { k: "price", t: "text", l: "Price (৳)", ph: "e.g. 350", when: function (b) { return !!b.forSale; } },
        { k: "oldPrice", t: "text", l: "Old price (optional, shown crossed out)", ph: "e.g. 450", when: function (b) { return !!b.forSale; } },
        { k: "soldOut", t: "bool", l: "⛔ Mark as SOLD OUT (only tick this when you have no copies left)", wide: true, when: function (b) { return !!b.forSale; } },
        { k: "id", t: "text", l: "Book ID", help: "Used to link orders and reviews to this book. Don't change it after people start ordering." }
      ], { title: function (b) { return (b.forSale ? (b.soldOut ? "⛔ SOLD OUT · " : "🛒 ") : "") + (b.title || "Untitled book") + (b.forSale && b.price ? "  ·  ৳" + b.price : ""); },
           blank: function () { return { id: "book-" + Date.now().toString(36), title: "New book", year: today().slice(0, 4), blurb: "", tags: [], link: "", linkText: "Read more", image: "", forSale: false, price: "", oldPrice: "", soldOut: false }; }, add: "+ Add book", addFirst: true }))
    ]);
  }
  function panelEducation() {
    var E = D.education;
    return head("Education", "Studies, key achievements and the clubs you belong to. Logos: upload an image, or type a path like assets/logos/bracu.png.").concat([
      card("Intro line", fieldGrid(E, [{ k: "intro", t: "textarea", l: "Short intro under the heading", wide: true }])),
      card("Academics (newest first)", listEditor(E.schooling, [
        { k: "title", t: "text", l: "Degree / certificate" }, { k: "institution", t: "text", l: "Institution" },
        { k: "year", t: "text", l: "Year (type Now if ongoing)" }, { k: "status", t: "text", l: "Badge (e.g. Board scholarship)" },
        { k: "note", t: "textarea", l: "Note", wide: true }
      ], { title: function (x) { return x.title || "Untitled"; }, blank: function () { return { title: "New qualification", institution: "", year: today().slice(0, 4), note: "", status: "" }; }, add: "+ Add qualification", addFirst: true })),
      card("By the numbers (big stat cards)", listEditor(E.highlights, [
        { k: "n", t: "text", l: "Big text (e.g. 600/600)" }, { k: "l", t: "text", l: "Caption" }
      ], { title: function (x) { return (x.n || "") + " " + (x.l || ""); }, blank: function () { return { n: "", l: "" }; }, add: "+ Add stat" })),
      card("Key achievements & roles", listEditor(E.achievements, [
        { k: "icon", t: "text", l: "Emoji icon" }, { k: "year", t: "text", l: "Year" },
        { k: "title", t: "text", l: "Title / role", wide: true }, { k: "org", t: "text", l: "Organization / event", wide: true }
      ], { title: function (x) { return (x.year ? x.year + " · " : "") + (x.title || "Untitled"); }, blank: function () { return { icon: "🏆", title: "New achievement", org: "", year: today().slice(0, 4) }; }, add: "+ Add achievement", addFirst: true })),
      card("Clubs & communities (logo + Facebook)", listEditor(E.communities, [
        { k: "name", t: "text", l: "Full name" }, { k: "short", t: "text", l: "Short name (ROBU, BUCC...)" },
        { k: "roles", t: "lines", l: "Your roles (one per line)", wide: true, rows: 3 },
        { k: "description", t: "textarea", l: "Description", wide: true },
        { k: "facebook", t: "text", l: "Facebook page link" }, { k: "website", t: "text", l: "Website link (optional)" },
        { k: "logo", t: "image", l: "Logo", wide: true }
      ], { title: function (x) { return x.name || "Untitled"; }, blank: function () { return { name: "New club", short: "", roles: [], description: "", facebook: "https://", website: "", logo: "" }; }, add: "+ Add club" }))
    ]);
  }
  function panelResearch() {
    return head("Research", "Papers, theses and projects.").concat([
      card(null, listEditor(D.research, [
        { k: "title", t: "text", l: "Title" }, { k: "venue", t: "text", l: "Venue / type" }, { k: "year", t: "text", l: "Year" },
        { k: "tags", t: "tags", l: "Tags" },
        { k: "summary", t: "textarea", l: "Summary", wide: true },
        { k: "link", t: "text", l: "Link" }, { k: "linkText", t: "text", l: "Button text" },
        { k: "image", t: "image", l: "Image (figure, poster, photo)", wide: true }
      ], { title: function (r) { return r.title || "Untitled"; }, blank: function () { return { title: "New research", venue: "", year: today().slice(0, 4), summary: "", tags: [], link: "", linkText: "View", image: "" }; }, add: "+ Add research", addFirst: true }))
    ]);
  }
  function panelCourses() {
    return head("Courses", "Each course card links to the website where it lives.").concat([
      card(null, listEditor(D.courses, [
        { k: "title", t: "text", l: "Title" }, { k: "platform", t: "text", l: "Platform / website name" }, { k: "level", t: "text", l: "Level" },
        { k: "link", t: "text", l: "Link to the course website" },
        { k: "description", t: "textarea", l: "Description", wide: true, help: "Long text folds behind “See more”. Use **bold** and lines starting with - for a list." },
        { k: "linkText", t: "text", l: "Button text" },
        { k: "badge", t: "text", l: "Ribbon on the card (optional)", ph: "e.g. New, Popular, Free" },
        { k: "image", t: "image", l: "Course image (square works best)", wide: true }
      ], { title: function (c) { return c.title || "Untitled course"; }, blank: function () { return { title: "New course", platform: "", level: "Beginner", description: "", link: "https://", linkText: "Open course", image: "" }; }, add: "+ Add course", addFirst: true }))
    ]);
  }
  function panelPosts() {
    var catsWrap = fieldGrid(D.blog, [{ k: "categories", t: "lines", l: "Categories (one per line)", wide: true, rows: 5, help: "Reviews use the star rating and “Reviewing” fields. After renaming a category, update the posts that used it." }]);
    var postFields = [
      { k: "title", t: "text", l: "Title", wide: true },
      { k: "category", t: "select", l: "Category", options: function () { return D.blog.categories.slice(); } },
      { k: "date", t: "date", l: "Date" },
      { k: "rating", t: "select", l: "Star rating (reviews)", num: true, options: [{ v: "", l: "No rating" }, { v: 1, l: "★☆☆☆☆" }, { v: 2, l: "★★☆☆☆" }, { v: 3, l: "★★★☆☆" }, { v: 4, l: "★★★★☆" }, { v: 5, l: "★★★★★" }] },
      { k: "subject", t: "text", l: "Reviewing (book / movie / game name)" },
      { k: "tags", t: "tags", l: "Tags" },
      { k: "excerpt", t: "textarea", l: "Short summary (shown on the card)", wide: true, rows: 2 },
      { k: "cover", t: "image", l: "Cover image", wide: true },
      { k: "body", t: "md", l: "Post body" },
      { k: "draft", t: "bool", l: "Save as draft (hidden from the site)", wide: true },
      { k: "id", t: "text", l: "URL id", wide: true, help: "Auto-created from the title when you save. Link: jubayer.bond/#post/<id>" }
    ];
    return head("Blog posts", "Write education posts and book, movie or game reviews. Tick “draft” to keep one private.").concat([
      card("Categories", catsWrap),
      card("Posts", listEditor(D.posts, postFields, {
        title: function (p) { return (p.draft ? "[DRAFT] " : "") + (p.title || "Untitled") + (p.category ? "  ·  " + p.category : ""); },
        blank: function () { return { id: "post-" + Date.now(), title: "New post", category: D.blog.categories[0] || "Thoughts", date: today(), rating: "", subject: "", excerpt: "", cover: "", tags: [], draft: true, body: "" }; },
        add: "+ New post", addFirst: true
      }))
    ]);
  }

  /* ---------- boot ---------- */
  $("saveBtn").addEventListener("click", save);
  $("dlBtn").addEventListener("click", function () {
    if (!D) { toast("Nothing to download yet. Content has not loaded.", "err"); return; }
    download();
  });
  renderTabs(); refresh();
  window.AdminAuth.start(function (sess) {
    cfg.owner = sess.owner; cfg.repo = sess.repo; cfg.branch = sess.branch || "main"; cfg.token = sess.token;
    renderTabs(); renderPanel(); refresh();
    loadRemote().then(function () { toast("Logged in ✓", "ok"); tab = "general"; renderTabs(); renderPanel(); })
      .catch(function (e) { toast(e.message, "err"); tab = "account"; renderTabs(); renderPanel(); });
  }, { canLock: function () { return !dirty; } });
  $("logoutBtn").addEventListener("click", function () {
    if (dirty && !confirm("You have unsaved changes. Log out and discard them?")) return;
    dirty = false; window.AdminAuth.logout();
  });
})();
