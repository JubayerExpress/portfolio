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

  $("mailBtn").href = "mailto:" + (S.email || "");
  $("socials").innerHTML = (S.socials || []).map(function (s) {
    return "<a " + linkAttrs(s.url) + ">" + esc(s.label) + "</a>";
  }).join("");

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
