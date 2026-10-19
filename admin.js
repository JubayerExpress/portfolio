/* Admin panel: edits content.js and uploads images straight to your GitHub repo
   through the GitHub API, using a personal access token that stays in YOUR browser. */
(function () {
  "use strict";
  var MD = window.MD;
  var $ = function (id) { return document.getElementById(id); };
  var CFG_KEY = "jz_admin_cfg", TOKEN_KEY = "jz_admin_token";

  var cfg = { owner: "JubayerExpress", repo: "portfolio", branch: "main", token: "", remember: false };
  var D = null;            // the site data being edited
  var sha = null;          // sha of content.js on GitHub
  var connected = false;   // true once loaded from GitHub
  var local = false;       // true in "edit locally" mode
  var dirty = false;
  var previews = {};       // uploaded image path -> data URL (so thumbnails work before deploy)
  var openItems = typeof WeakSet !== "undefined" ? new WeakSet() : { add: function () {}, has: function () { return false; } };
  var tab = "connect";

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

  /* ---------- config storage ---------- */
  function loadCfg() {
    try {
      var c = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
      Object.keys(c).forEach(function (k) { if (k !== "token") cfg[k] = c[k]; });
    } catch (e) {}
    try { cfg.token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
  }
  function saveCfg() {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, remember: cfg.remember }));
      localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY);
      if (cfg.token) (cfg.remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, cfg.token);
    } catch (e) {}
  }

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
    d.blog = d.blog || {}; d.blog.categories = d.blog.categories || ["Education", "Book Reviews", "Movie Reviews", "Game Reviews", "Thoughts"];
    d.posts = d.posts || [];
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
    if (!connected) { toast("Connect to GitHub first (Connection tab), or use Download content.js.", "err"); return; }
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
    if (!connected) return Promise.reject(new Error("Connect to GitHub first (Connection tab) to upload images."));
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
    s.textContent = (connected ? cfg.owner + "/" + cfg.repo + "@" + cfg.branch : local ? "Local mode (not connected)" : "Not connected") + (dirty ? " · unsaved changes" : "");
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
    return h("div", { class: "grid" }, fields.map(function (f) { return field(o, f, onChange); }));
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
    ["connect", "Connection"], ["general", "General"], ["about", "About"], ["books", "Books"],
    ["research", "Research"], ["courses", "Courses"], ["posts", "Blog posts"]
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
    if (tab !== "connect" && !D) { tab = "connect"; renderTabs(); }
    var kids = [];
    if (tab === "connect") kids = panelConnect();
    else if (tab === "general") kids = panelGeneral();
    else if (tab === "about") kids = panelAbout();
    else if (tab === "books") kids = panelBooks();
    else if (tab === "research") kids = panelResearch();
    else if (tab === "courses") kids = panelCourses();
    else if (tab === "posts") kids = panelPosts();
    kids.forEach(function (k) { p.appendChild(k); });
  }

  function panelConnect() {
    var o = h("input", { type: "text" }), r = h("input", { type: "text" }), b = h("input", { type: "text" }), t = h("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…" });
    var rem = h("input", { type: "checkbox" });
    o.value = cfg.owner; r.value = cfg.repo; b.value = cfg.branch; t.value = cfg.token; rem.checked = !!cfg.remember;
    function lab(txt, el) { return h("label", { class: "f" }, [h("span", { class: "l" }, txt), el]); }
    function readForm() { cfg.owner = o.value.trim(); cfg.repo = r.value.trim(); cfg.branch = b.value.trim() || "main"; cfg.token = t.value.trim(); cfg.remember = rem.checked; saveCfg(); }
    var go = h("button", { class: "btn primary", type: "button" }, connected ? "Reload from GitHub" : "Connect & load");
    go.addEventListener("click", function () {
      readForm();
      if (!cfg.owner || !cfg.repo || !cfg.token) { toast("Fill in owner, repo and token.", "err"); return; }
      if (dirty && !confirm("You have unsaved changes. Reloading will discard them. Continue?")) return;
      go.disabled = true; go.textContent = "Connecting…";
      loadRemote().then(function () { toast("Connected ✓ Content loaded from GitHub.", "ok"); tab = "general"; renderTabs(); renderPanel(); })
        .catch(function (e) { toast(e.message, "err"); go.disabled = false; go.textContent = "Connect & load"; });
    });
    var loc = h("button", { class: "btn", type: "button" }, "Edit locally (no GitHub)");
    loc.addEventListener("click", function () {
      D = normalize(clone(window.SITE || {})); local = true; connected = false; dirty = false; refresh();
      toast("Local mode: edit, then use Download content.js. Image upload needs GitHub.");
      tab = "general"; renderTabs(); renderPanel();
    });
    var out = h("button", { class: "btn danger", type: "button" }, "Forget token on this device");
    out.addEventListener("click", function () { cfg.token = ""; saveCfg(); connected = false; refresh(); t.value = ""; toast("Token removed from this browser."); });

    return head("Connection", "Link this panel to your GitHub repo so Save publishes straight to your site.").concat([
      card("Your repository", h("div", null, [
        h("div", { class: "grid" }, [lab("GitHub username", o), lab("Repository name", r), lab("Branch", b), lab("Personal access token", t)]),
        h("label", { class: "f check", style: "margin-top:12px" }, [rem, h("span", null, "Remember the token on this device (leave off on shared computers)")]),
        h("div", { class: "row", style: "margin-top:16px" }, [go, loc, out])
      ])),
      card("Get a token (one-time, 2 minutes)", h("ol", { class: "steps" }, [
        h("li", null, ["Open ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "GitHub → New fine-grained token"), "."]),
        h("li", null, "Repository access: choose “Only select repositories” and pick this site's repo."),
        h("li", null, "Permissions → Repository permissions → Contents: set to “Read and write”."),
        h("li", null, "Generate, copy the token, paste it above. It is stored only in your browser, never on the website."),
        h("li", null, "This page is public but does nothing without your token. Keep the token private.")
      ]))
    ]);
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
      card("Social links", listEditor(D.socials, SOCIAL, { title: function (s) { return s.label || "Link"; }, blank: function () { return { label: "New", url: "https://" }; }, add: "+ Add link" }))
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
        { k: "image", t: "image", l: "Cover image", wide: true }
      ], { title: function (b) { return b.title || "Untitled book"; }, blank: function () { return { title: "New book", year: today().slice(0, 4), blurb: "", tags: [], link: "", linkText: "Read more", image: "" }; }, add: "+ Add book", addFirst: true }))
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
        { k: "description", t: "textarea", l: "Description", wide: true }, { k: "linkText", t: "text", l: "Button text" },
        { k: "image", t: "image", l: "Course image", wide: true }
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
    if (!D) { toast("Nothing to download yet. Connect or choose local mode first.", "err"); return; }
    download();
  });
  loadCfg();
  renderTabs(); renderPanel(); refresh();
  if (cfg.token && cfg.owner && cfg.repo) {
    loadRemote().then(function () { toast("Connected ✓", "ok"); tab = "general"; renderTabs(); renderPanel(); })
      .catch(function (e) { toast(e.message, "err"); });
  }
})();
