(function () {
  "use strict";
  var S = window.SITE || {};
  var MD = window.MD;
  var esc = MD.esc, safe = MD.safe;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isExternal = function (u) { return /^https?:\/\//i.test(u || ""); };
  var linkAttrs = function (u) {
    return 'href="' + esc(safe(u || "#")) + '"' + (isExternal(u) ? ' target="_blank" rel="noopener noreferrer"' : "");
  };
  var chips = function (arr) {
    return (arr || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
  };
  var initial = (S.name || "J").charAt(0);
  var gradients = [
    "linear-gradient(135deg,#7c5cff,#22d3ee)",
    "linear-gradient(135deg,#ff6bcb,#7c5cff)",
    "linear-gradient(135deg,#22d3ee,#34d399)",
    "linear-gradient(135deg,#f59e0b,#ff6bcb)"
  ];
  var catEmoji = { "Education": "🎓", "Book Reviews": "📚", "Movie Reviews": "🎬", "Game Reviews": "🎮", "Thoughts": "💭" };

  /* ---------- Visitor counting (GoatCounter: free, no cookies) ----------
     Off until a code is set in Admin → Visitors. Counts each visit, plus each blog post
     opened (as /post/<id>) so the admin can show views per post. */
  var gcCode = String((S.analytics && S.analytics.goatcounter) || "").trim().toLowerCase();
  var gcQueue = [], gcSeen = {};
  function gcReady() { return !!(window.goatcounter && window.goatcounter.count); }
  if (/^[a-z0-9][a-z0-9-]*$/.test(gcCode)) {
    var gs = document.createElement("script");
    gs.async = true; gs.src = "https://gc.zgo.at/count.js";
    gs.setAttribute("data-goatcounter", "https://" + gcCode + ".goatcounter.com/count");
    gs.onload = function () { var q = gcQueue; gcQueue = []; if (gcReady()) q.forEach(function (v) { window.goatcounter.count(v); }); };
    document.head.appendChild(gs);
  } else gcCode = "";
  /* ---------- Announcement bar (scrolling notices above the menu) ----------
     Edited in Admin → Announcement. A visitor who closes it won't see it again
     until the notices change. */
  (function () {
    var AN = S.announce || {};
    var items = (AN.items || []).filter(function (x) { return x && String(x.text || "").trim(); });
    if (!AN.enabled || !items.length) return;
    var sig = items.map(function (x) { return x.text + "|" + (x.link || ""); }).join("~"), hsh = 0;
    for (var k = 0; k < sig.length; k++) hsh = (hsh * 31 + sig.charCodeAt(k)) | 0;
    try { if (localStorage.getItem("annHidden") === String(hsh)) return; } catch (e) {}
    var dot = '<i class="ann-dot" aria-hidden="true">✦</i>';
    var one = items.map(function (x) {
      var inner = (x.isNew ? '<em class="ann-new">NEW</em>' : "") + "<span>" + esc(x.text) + "</span>";
      return x.link ? '<a class="ann-i" ' + linkAttrs(x.link) + ">" + inner + "</a>" : '<span class="ann-i">' + inner + "</span>";
    }).join(dot) + dot;
    var bar = document.createElement("div");
    bar.className = "ann"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Announcements");
    bar.innerHTML = '<div class="ann-track"><div class="ann-run">' + one + "</div></div>" +
      '<button class="ann-x" type="button" aria-label="Hide announcements" title="Hide">✕</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.documentElement.classList.add("has-ann");
    var track = bar.querySelector(".ann-track"), run = bar.querySelector(".ann-run");
    if (!reduce) {
      // Repeat the notices until one copy is wider than the screen, then add a second copy
      // so the loop is seamless (the animation slides exactly one copy's width).
      var reps = 1;
      while (run.scrollWidth < innerWidth + 40 && reps < 12) { run.innerHTML += one; reps++; }
      var copy = run.cloneNode(true); copy.setAttribute("aria-hidden", "true");
      copy.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
      track.appendChild(copy);
      track.style.setProperty("--ann-dur", Math.max(14, run.scrollWidth / 70) + "s");
      track.classList.add("go");
      bar.addEventListener("touchstart", function () { track.classList.toggle("hold"); }, { passive: true });
    }
    bar.querySelector(".ann-x").addEventListener("click", function () {
      try { localStorage.setItem("annHidden", String(hsh)); } catch (e) {}
      bar.remove(); document.documentElement.classList.remove("has-ann");
    });
  })();

  function trackPost(p) {
    if (!gcCode || gcSeen[p.id]) return;   // once per post per visit
    gcSeen[p.id] = 1;
    var v = { path: "/post/" + p.id, title: p.title, event: false };
    if (gcReady()) window.goatcounter.count(v); else gcQueue.push(v);
  }
  function img(src, alt) { return src ? '<img src="' + esc(safe(src)) + '" alt="' + esc(alt || "") + '" loading="lazy">' : ""; }
  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(+n || 0)));
    return '<span class="stars" aria-label="' + n + ' out of 5">' + "★".repeat(n) + "☆".repeat(5 - n) + "</span>";
  }
  function fmtDate(d) {
    var t = new Date(d);
    return isNaN(t) ? esc(d || "") : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Static content ---------- */
  document.title = S.siteTitle || document.title;
  $("heroName").textContent = S.name || "";
  $("heroName").dataset.final = S.name || "";
  $("heroIntro").textContent = S.intro || "";
  $("footName").textContent = S.name || "";
  $("year").textContent = "© " + new Date().getFullYear();
  $("brand").innerHTML = esc(initial) + "<span>.</span>";
  $("portrait").innerHTML = S.heroImage ? img(S.heroImage, S.name) : esc(initial);

  var A = S.about || {};
  $("aboutText").innerHTML = (A.paragraphs || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  $("facts").innerHTML = (A.facts || []).map(function (f) {
    return "<li><small>" + esc(f.label) + "</small>" + esc(f.value) + "</li>";
  }).join("");
  $("skills").innerHTML = chips(A.skills);
  $("avatar").innerHTML = A.photo ? img(A.photo, S.name) : esc(initial);

  /* ---------- Cards ---------- */
  $("booksGrid").innerHTML = (S.books || []).map(function (b, i) {
    var cover = b.image
      ? '<div class="cover">' + img(b.image, b.title) + "</div>"
      : '<div class="cover" style="background:' + gradients[i % gradients.length] + '">' + esc(b.title) + "</div>";
    return '<article class="card reveal" style="--d:' + (i * 0.08) + 's">' + cover +
      '<span class="meta">' + esc(b.year) + "</span><h3>" + esc(b.title) + "</h3>" +
      "<p>" + esc(b.blurb) + "</p>" +
      '<div class="chips">' + chips(b.tags) + "</div>" +
      '<a class="link" ' + linkAttrs(b.link) + ">" + esc(b.linkText || "Read more") + " <span>→</span></a></article>";
  }).join("");

  $("researchList").innerHTML = (S.research || []).map(function (r, i) {
    return '<article class="t-item reveal' + (r.image ? " has-img" : "") + '" style="--d:' + (i * 0.08) + 's">' +
      (r.image ? '<div class="t-img">' + img(r.image, r.title) + "</div>" : "") +
      '<span class="meta">' + esc(r.year) + " · " + esc(r.venue) + "</span><h3>" + esc(r.title) + "</h3>" +
      "<p>" + esc(r.summary) + "</p>" +
      '<div class="chips">' + chips(r.tags) + "</div>" +
      '<a class="link" ' + linkAttrs(r.link) + ">" + esc(r.linkText || "View") + " →</a></article>";
  }).join("");

  $("coursesGrid").innerHTML = (S.courses || []).map(function (c, i) {
    return '<article class="card reveal" style="--d:' + (i * 0.08) + 's">' +
      (c.image ? '<div class="cover">' + img(c.image, c.title) + "</div>" : "") +
      '<span class="meta">' + esc(c.level) + " · " + esc(c.platform) + "</span><h3>" + esc(c.title) + "</h3>" +
      "<p>" + esc(c.description) + "</p>" +
      '<a class="link" ' + linkAttrs(c.link) + ">" + esc(c.linkText || "Open") + " <span>↗</span></a></article>";
  }).join("");

  /* ---------- Education ---------- */
  var E = S.education || {};
  var FB = '<svg class="fb" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>';
  $("eduLead").textContent = E.intro || "";
  $("eduList").innerHTML = (E.schooling || []).map(function (e, i) {
    var now = /now|present|pursuing/i.test(e.year + " " + (e.status || ""));
    return '<article class="t-item reveal' + (now ? " now" : "") + '" style="--d:' + (i * 0.08) + 's">' +
      '<span class="meta">' + esc(e.year) + " · " + esc(e.institution) + "</span><h3>" + esc(e.title) + "</h3>" +
      (e.note ? "<p>" + esc(e.note) + "</p>" : "") +
      (e.status ? '<span class="badge' + (now ? " live" : "") + '">' + esc(e.status) + "</span>" : "") + "</article>";
  }).join("");
  $("eduHl").innerHTML = (E.highlights || []).map(function (x, i) {
    return '<div class="hl reveal" style="--d:' + (i * 0.08) + 's"><b>' + esc(x.n) + "</b><span>" + esc(x.l) + "</span></div>";
  }).join("");
  $("achGrid").innerHTML = (E.achievements || []).map(function (a, i) {
    return '<article class="card ach reveal" style="--d:' + ((i % 3) * 0.08) + 's"><span class="ach-ic" aria-hidden="true">' + esc(a.icon || "★") + "</span>" +
      '<div class="ach-tx"><span class="meta">' + esc(a.year) + "</span><h3>" + esc(a.title) + "</h3><p>" + esc(a.org) + "</p></div></article>";
  }).join("");
  $("commGrid").innerHTML = (E.communities || []).map(function (c, i) {
    var short = c.short || (c.name || "").split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 5);
    var logo = c.logo ? '<span class="logo-badge"><img src="' + esc(safe(c.logo)) + '" alt="' + esc(c.name) + ' logo" loading="lazy"></span>'
                      : '<span class="logo-badge mono" aria-hidden="true">' + esc(short) + "</span>";
    return '<article class="card comm reveal" style="--d:' + (i * 0.1) + 's">' +
      '<div class="comm-head">' + logo + '<div><span class="meta">' + esc(short) + "</span><h3>" + esc(c.name) + "</h3></div></div>" +
      '<ul class="roles">' + (c.roles || []).map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" +
      (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
      '<div class="comm-links">' +
      (c.facebook ? '<a class="btn ghost small fbbtn" ' + linkAttrs(c.facebook) + ">" + FB + " Facebook</a>" : "") +
      (c.website ? '<a class="btn ghost small" ' + linkAttrs(c.website) + ">Website ↗</a>" : "") +
      "</div></article>";
  }).join("");

  /* ---------- Contact icons (hero row + contact section) ---------- */
  var ICONS = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.22.69.82.57A12 12 0 0 0 12 .3"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.26h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>'
  };
  function iconFor(s) {
    var t = ((s.label || "") + " " + (s.url || "")).toLowerCase();
    if (/^mailto:/.test(s.url || "") || /\bmail\b|email/.test(t)) return "mail";
    var keys = ["github", "linkedin", "youtube", "facebook"];
    for (var i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) >= 0) return keys[i];
    return "link";
  }
  // A link like "https://facebook.com/" is a placeholder (no profile yet), so it is not shown up top.
  function isReal(u) { var m = String(u || "").match(/^https?:\/\/[^\/]+\/?(.*)$/i); return !m || m[1].replace(/[\/?#]/g, "").length > 0; }
  var heroOrder = { mail: 0, github: 1, linkedin: 2 };
  var links = (S.email ? [{ label: "Email", url: "mailto:" + S.email, tip: "Email me" }] : [])
    .concat((S.socials || []).filter(function (s) { return s.url && isReal(s.url); }))
    .map(function (s, i) { var k = iconFor(s); return { s: s, k: k, o: k in heroOrder ? heroOrder[k] : 10 + i }; })
    .sort(function (a, b) { return a.o - b.o; });
  $("heroLinks").innerHTML = links.map(function (x) {
    var tip = x.s.tip || x.s.label;
    return '<a class="sl" ' + linkAttrs(x.s.url) + ' aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '">' + ICONS[x.k] + "</a>";
  }).join("");

  $("mailBtn").href = "mailto:" + (S.email || "");
  $("socials").innerHTML = (S.socials || []).map(function (s) {
    return "<a " + linkAttrs(s.url) + ">" + ICONS[iconFor(s)] + esc(s.label) + "</a>";
  }).join("");

  /* ---------- Public visitor counter ---------- */
  (function () {
    var A = S.analytics || {};
    if (!gcCode || A.showCounter === false) return;
    fetch("https://" + gcCode + ".goatcounter.com/counter/TOTAL.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var n = j ? parseInt(String(j.count || "").replace(/\D/g, ""), 10) : 0;
        if (!n) return;   // nothing to show yet, or counts not public
        var out = $("visitCount"), badge = $("visitBadge");
        badge.hidden = false;
        if (reduce) { out.textContent = n.toLocaleString(); return; }
        var t0 = performance.now(), dur = 1400;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          out.textContent = Math.round(n * e).toLocaleString();
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      })
      .catch(function () {});
  })();

  /* ---------- Blog ---------- */
  var posts = (S.posts || []).filter(function (p) { return !p.draft; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  var cats = (S.blog && S.blog.categories) || [];
  var current = "All";

  function renderFilters() {
    var all = ["All"].concat(cats);
    $("filters").innerHTML = all.map(function (c) {
      var n = c === "All" ? posts.length : posts.filter(function (p) { return p.category === c; }).length;
      return '<button class="pill' + (c === current ? " on" : "") + '" data-cat="' + esc(c) + '" role="tab">' +
        (catEmoji[c] ? catEmoji[c] + " " : "") + esc(c) + " <small>" + n + "</small></button>";
    }).join("");
  }
  function renderPosts() {
    var list = posts.filter(function (p) { return current === "All" || p.category === current; });
    $("postsGrid").innerHTML = list.map(function (p, i) {
      var cover = p.cover
        ? '<div class="cover">' + img(p.cover, p.title) + "</div>"
        : '<div class="cover" style="background:' + gradients[i % gradients.length] + '"><span style="font-size:3rem;font-style:normal">' + (catEmoji[p.category] || "✨") + "</span></div>";
      return '<a class="card post reveal in" href="#post/' + encodeURIComponent(p.id) + '" style="--d:' + (i * 0.05) + 's">' + cover +
        '<span class="badge">' + esc(p.category) + "</span>" +
        "<h3>" + esc(p.title) + "</h3>" +
        '<span class="meta">' + fmtDate(p.date) + (p.rating !== "" && p.rating != null ? " · " + stars(p.rating) : "") + "</span>" +
        "<p>" + esc(p.excerpt) + "</p>" +
        '<span class="link">Read post <span>→</span></span></a>';
    }).join("");
    $("postsEmpty").hidden = list.length > 0;
  }
  $("filters").addEventListener("click", function (e) {
    var b = e.target.closest(".pill");
    if (!b) return;
    current = b.dataset.cat;
    renderFilters(); renderPosts();
  });
  renderFilters(); renderPosts();

  /* ---------- Post reader (hash routing: #post/<id>) ---------- */
  var reader = $("reader"), readerBody = $("readerBody");
  function openPost(id) {
    var p = posts.filter(function (x) { return x.id === id; })[0];
    if (!p) { closeReader(true); return; }
    var words = String(p.body || "").split(/\s+/).filter(Boolean).length;
    var mins = Math.max(1, Math.round(words / 200));
    readerBody.innerHTML =
      (p.cover ? '<div class="r-cover">' + img(p.cover, p.title) + "</div>" : "") +
      '<span class="badge">' + (catEmoji[p.category] || "") + " " + esc(p.category) + "</span>" +
      "<h1>" + esc(p.title) + "</h1>" +
      (p.subject ? '<div class="r-subject">' + esc(p.subject) + "</div>" : "") +
      '<div class="r-meta"><span>' + fmtDate(p.date) + "</span><span>" + mins + " min read</span>" +
      (p.rating !== "" && p.rating != null ? stars(p.rating) : "") + "</div>" +
      '<div class="chips">' + chips(p.tags) + "</div>" +
      '<div class="prose">' + MD.render(p.body) + "</div>";
    document.title = p.title + " — " + (S.name || "");
    reader.hidden = false; reader.scrollTop = 0;
    document.body.classList.add("lock");
    trackPost(p);
  }
  function closeReader(silent) {
    reader.hidden = true;
    document.body.classList.remove("lock");
    document.title = S.siteTitle || document.title;
    if (!silent && /^#post\//.test(location.hash)) location.hash = "#blog";
  }
  function route() {
    var m = location.hash.match(/^#post\/(.+)$/);
    if (m) openPost(decodeURIComponent(m[1])); else if (!reader.hidden) closeReader(true);
  }
  addEventListener("hashchange", route);
  $("readerClose").addEventListener("click", function () { closeReader(); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && !reader.hidden) closeReader(); });
  $("readerShare").addEventListener("click", function () {
    var btn = this, url = location.href;
    var done = function () { btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = "Copy link"; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
  });

  /* ---------- Stats ---------- */
  var stats = [
    { n: (S.books || []).length, l: "Books" },
    { n: (S.research || []).length, l: "Research" },
    { n: (S.courses || []).length, l: "Courses" },
    { n: posts.length, l: "Posts" }
  ];
  $("stats").innerHTML = stats.map(function (s) {
    return '<div class="stat"><b data-n="' + s.n + '">0</b><span>' + esc(s.l) + "</span></div>";
  }).join("");

  /* ---------- Ticker ---------- */
  var words = (S.ticker && S.ticker.length ? S.ticker : ["Code", "Write", "Build"]);
  var one = words.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("");
  $("track").innerHTML = one + one + one + one;

  /* ---------- Typing effect ---------- */
  var roles = S.roles && S.roles.length ? S.roles : [""];
  var ri = 0, ci = 0, del = false, typed = $("typed");
  (function tick() {
    var word = roles[ri];
    ci += del ? -1 : 1;
    typed.textContent = word.slice(0, ci);
    var wait = del ? 40 : 90;
    if (!del && ci === word.length) { del = true; wait = 1400; }
    else if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; wait = 350; }
    setTimeout(tick, wait);
  })();

  /* ---------- Text scramble (hover on [data-scr]) ---------- */
  var chars = "!<>-_\\/[]{}=+*^?#abcdefghijklmnopqrstuvwxyz";
  function scramble(el) {
    if (reduce || el._busy) return;
    var final = el.dataset.final || (el.dataset.final = el.textContent);
    var frame = 0, total = 18;
    el._busy = true;
    var t = setInterval(function () {
      var out = "";
      for (var i = 0; i < final.length; i++) {
        out += (final[i] === " " || i < (frame / total) * final.length) ? final[i] : chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      if (++frame > total) { clearInterval(t); el.textContent = final; el._busy = false; }
    }, 32);
  }
  document.querySelectorAll("[data-scr]").forEach(function (el) {
    el.dataset.final = el.textContent;
    var host = el.closest(".tile") || el;
    host.addEventListener("mouseenter", function () { scramble(el); });
  });
  setTimeout(function () { scramble($("heroName")); }, 500);

  /* ---------- Scroll reveal + counters ---------- */
  function countUp(el) {
    var target = +el.dataset.n, cur = 0;
    if (!target) { el.textContent = "0"; return; }
    var step = setInterval(function () {
      cur++; el.textContent = cur;
      if (cur >= target) clearInterval(step);
    }, 110);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-n]").forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    if (!el.style.getPropertyValue("--d") && el.closest("#home")) el.style.setProperty("--d", (i % 8) * 0.08 + "s");
    io.observe(el);
  });

  /* ---------- Nav ---------- */
  var nav = $("nav"), prog = $("progress"), toTop = $("toTop");
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-link]"));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle("scrolled", y > 30);
    prog.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    toTop.classList.toggle("show", y > 600);
    var idx = 0;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) idx = i; });
    links.forEach(function (a, i) { a.classList.toggle("active", i === idx); });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  toTop.addEventListener("click", function () { scrollTo({ top: 0, behavior: "smooth" }); });

  var menu = $("menu"), burger = $("burger");
  burger.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  links.forEach(function (a) { a.addEventListener("click", function () { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); }); });

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  try { var saved = localStorage.getItem("theme"); if (saved) root.dataset.theme = saved; } catch (e) {}
  $("theme").addEventListener("click", function () {
    var next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- Cursor glow, ring, card tilt, magnetic buttons, sticker parallax ---------- */
  var glow = $("glow"), ring = $("ring"), rx = 0, ry = 0, tx = 0, ty = 0;
  var fine = window.matchMedia("(pointer:fine)").matches;
  addEventListener("pointermove", function (e) {
    glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px";
    tx = e.clientX; ty = e.clientY;
    if (fine) ring.classList.add("on");
    ring.classList.toggle("big", !!(e.target.closest && e.target.closest("a,button,.card,.pill")));
  }, { passive: true });
  if (fine && !reduce) (function loop() {
    rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
    ring.style.left = rx + "px"; ring.style.top = ry + "px";
    requestAnimationFrame(loop);
  })();

  document.addEventListener("pointermove", function (e) {
    if (reduce) return;
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    var card = t.closest(".card");
    if (card) {
      var r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px"); card.style.setProperty("--my", y + "px");
      card.style.transform = "perspective(800px) rotateX(" + ((y / r.height - 0.5) * -6) + "deg) rotateY(" + ((x / r.width - 0.5) * 6) + "deg) translateY(-4px)";
    }
    var m = t.closest(".mag");
    if (m) {
      var b = m.getBoundingClientRect();
      m.style.transform = "translate(" + ((e.clientX - (b.left + b.width / 2)) * 0.25) + "px," + ((e.clientY - (b.top + b.height / 2)) * 0.35) + "px)";
    }
  });
  document.addEventListener("pointerout", function (e) {
    var from = e.target.closest ? e.target : null;
    if (!from) return;
    var card = from.closest(".card");
    if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
    var m = from.closest(".mag");
    if (m && !m.contains(e.relatedTarget)) m.style.transform = "";
  });

  var art = $("heroArt"), stickers = art.querySelectorAll(".sticker");
  $("home").addEventListener("pointermove", function (e) {
    if (reduce) return;
    var cx = (e.clientX / innerWidth - 0.5), cy = (e.clientY / innerHeight - 0.5);
    stickers.forEach(function (s) {
      var d = +s.dataset.depth;
      s.style.transform = "translate(" + (cx * d) + "px," + (cy * d) + "px)";
    });
    art.firstElementChild.style.transform = "translate(" + (cx * -10) + "px," + (cy * -10) + "px)";
  }, { passive: true });

  route();
})();
