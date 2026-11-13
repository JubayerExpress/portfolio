/* A page for every book: jubayer.bond/#book/<link-name> (shared as jubayer.bond/books/<link-name>).
   Shows the 3D cover, price + Buy, Share, the full description, reviews, and a rolling
   "Explore more books" strip. Works with or without the shop (shop.js exposes window.SHOP). */
(function () {
  "use strict";
  var S = window.SITE || {}, books = S.books || [];
  var MD = window.MD, esc = MD.esc, safe = MD.safe;
  var $ = function (id) { return document.getElementById(id); };
  var grid = $("booksGrid");
  if (!grid || !books.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SHOP = function () { return window.SHOP || null; };
  var ORIGIN = (location.origin && location.origin !== "null" && /^https?:/.test(location.origin)) ? location.origin : "https://jubayer.bond";

  function linkName(b, i) { return String(b.slug || b.id || "book-" + (i + 1)); }
  function shareUrl(b, i) { return ORIGIN + "/books/" + encodeURIComponent(linkName(b, i)); }
  function findBook(key) {
    key = decodeURIComponent(String(key || "")).toLowerCase();
    for (var i = 0; i < books.length; i++) {
      var b = books[i];
      if ([b.slug, b.id, "book-" + (i + 1)].some(function (v) { return v && String(v).toLowerCase() === key; })) return i;
    }
    return -1;
  }
  function cover3d(b, i, cls) {
    var grads = ["linear-gradient(135deg,#7c5cff,#22d3ee)", "linear-gradient(135deg,#ff6bcb,#7c5cff)", "linear-gradient(135deg,#22d3ee,#c6ff3d)"];
    return '<div class="bk ' + (cls || "") + '"><div class="cover"' + (b.image ? '><img src="' + esc(safe(b.image)) + '" alt="' + esc(b.title) + '" loading="lazy">'
      : ' style="background:' + grads[i % grads.length] + '"><span class="bk-title">' + esc(b.title) + "</span>") + '</div><i class="bk-pages" aria-hidden="true"></i></div>';
  }
  function stars(n) { n = Math.max(0, Math.min(5, Math.round(n))); return '<span class="rs" aria-hidden="true">' + "★".repeat(n) + "<i>" + "☆".repeat(5 - n) + "</i></span>"; }
  var ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';

  /* ---------- share ---------- */
  var pop = document.createElement("div");
  pop.className = "sharepop"; pop.hidden = true; pop.setAttribute("role", "menu");
  document.body.appendChild(pop);
  function closePop() { pop.hidden = true; }
  var popOpenedAt = 0;
  var shareIdx = 0, shareBtn = null;
  function share(i, btn) {
    popOpenedAt = Date.now(); shareIdx = i; shareBtn = btn;
    var b = books[i], url = shareUrl(b, i), sh = SHOP();
    var text = "📚 " + b.title + (sh && sh.onSale(b) ? " — " + sh.money(b.price) : "") + " by Jubayer";
    var coarse = window.matchMedia("(pointer:coarse)").matches;
    if (navigator.share && coarse) {
      // phone share sheet; if the phone can't share, show our own menu instead
      navigator.share({ title: b.title, text: text, url: url }).catch(function (err) { if (!err || err.name !== "AbortError") showMenu(); });
      return;
    }
    showMenu();
  }
  function showMenu() {
    var i = shareIdx, b = books[i], url = shareUrl(b, i), sh = SHOP(), btn = shareBtn;
    var text = "📚 " + b.title + (sh && sh.onSale(b) ? " — " + sh.money(b.price) : "") + " by Jubayer";
    var enc = encodeURIComponent;
    popOpenedAt = Date.now();
    pop.innerHTML = '<p class="sp-url"><span>' + esc(url.replace(/^https?:\/\//, "")) + "</span></p>" +
      '<button type="button" role="menuitem" data-sp="copy">🔗 Copy link</button>' +
      '<a role="menuitem" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + enc(url) + '">📘 Facebook</a>' +
      '<a role="menuitem" target="_blank" rel="noopener" href="https://wa.me/?text=' + enc(text + " " + url) + '">💬 WhatsApp</a>' +
      '<a role="menuitem" target="_blank" rel="noopener" href="https://www.messenger.com/new">✉️ Messenger <small>(paste the link)</small></a>';
    pop.hidden = false;
    var r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(innerWidth - pw - 10, Math.max(10, r.left + r.width / 2 - pw / 2));
    var top = r.bottom + 8 + ph > innerHeight - 8 ? r.top - ph - 8 : r.bottom + 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
    pop.onclick = function (e) {
      var c = e.target.closest("[data-sp=copy]");
      if (c) {
        var done = function () { c.textContent = "✓ Link copied"; setTimeout(closePop, 900); };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
      } else if (e.target.closest("a")) setTimeout(closePop, 100);
    };
    setTimeout(function () { var f = pop.querySelector("button"); if (f) f.focus({ preventScroll: true }); }, 30);
  }
  document.addEventListener("click", function (e) {
    if (pop.hidden || Date.now() - popOpenedAt < 300) return;   // ignore the click that just opened it
    if (!pop.contains(e.target)) closePop();
  });
  addEventListener("scroll", closePop, { passive: true });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { closePop(); e.stopImmediatePropagation(); } }, true);

  /* ---------- book cards: "View book" + Share, cover and title open the page ---------- */
  grid.querySelectorAll(":scope > article").forEach(function (el, i) {
    var b = books[i]; if (!b) return;
    var body = el.querySelector(".bk-body") || el;
    var foot = document.createElement("div");
    foot.className = "bk-foot";
    foot.innerHTML = '<a class="bk-view" href="#book/' + esc(encodeURIComponent(linkName(b, i))) + '">View book <span>→</span></a>' +
      '<button class="bk-share" type="button" data-share="' + i + '" aria-label="Share ' + esc(b.title) + '" title="Share">' + ICON_SHARE + "</button>";
    body.appendChild(foot);
    var stage = el.querySelector(".bk-stage");
    if (stage) { stage.classList.add("to-page"); stage.setAttribute("data-page", i); stage.setAttribute("title", "Open " + b.title); }
    var h3 = el.querySelector("h3"); if (h3) { h3.classList.add("to-page"); h3.setAttribute("data-page", i); }
  });
  grid.addEventListener("click", function (e) {
    var s = e.target.closest("[data-share]");
    if (s) { e.preventDefault(); share(+s.getAttribute("data-share"), s); return; }
    if (e.target.closest(".bk-view")) { pushed = true; return; }
    if (e.target.closest("[data-buy],[data-rev],.more,a,button")) return;
    var p = e.target.closest("[data-page]");
    if (p) { e.preventDefault(); go(+p.getAttribute("data-page")); }
  });

  /* ---------- the page ---------- */
  var page = document.createElement("div");
  page.className = "bp"; page.id = "bookPage"; page.hidden = true;
  page.setAttribute("role", "dialog"); page.setAttribute("aria-modal", "true"); page.setAttribute("aria-labelledby", "bpTitle");
  page.innerHTML = '<div class="bp-bar"><button class="bp-back" type="button" data-close>← <span>All books</span></button>' +
    '<span class="bp-crumb" id="bpCrumb"></span>' +
    '<div class="bp-bar-r"><button class="bp-ic" type="button" id="bpShare" aria-label="Share this book" title="Share">' + ICON_SHARE + "</button>" +
    '<button class="bp-ic" type="button" data-close aria-label="Close" title="Close">✕</button></div></div>' +
    '<div class="bp-scroll" id="bpScroll"><div class="bp-in" id="bpIn"></div></div>';
  document.body.appendChild(page);
  var inner = $("bpIn"), scroller = $("bpScroll"), cur = -1, pushed = false, oldTitle = document.title;

  function render(i) {
    var b = books[i], sh = SHOP(), sale = sh && sh.onSale(b), sold = sh && sh.soldOut(b);
    var revs = sh ? sh.reviews(b, i) : [], n = revs.length;
    var avg = n ? revs.reduce(function (s, r) { return s + r.rating; }, 0) / n : 0;
    var off = sale && Number(b.oldPrice) > Number(b.price) ? Math.round((1 - Number(b.price) / Number(b.oldPrice)) * 100) : 0;
    var extLink = b.link && !/^#(buy\/?)?$/.test(String(b.link).trim()) && !/^#buy\//.test(b.link);
    var html = '<section class="bp-hero">' +
      '<div class="bp-stage bk-stage">' + (b.badge ? '<span class="bk-ribbon">' + esc(b.badge) + "</span>" : "") + cover3d(b, i, "bp-book") + "</div>" +
      '<div class="bp-info">' +
        (b.year ? '<span class="meta">' + esc(b.year) + "</span>" : "") +
        '<h1 id="bpTitle">' + esc(b.title) + "</h1>" +
        (sh ? '<button class="bp-rating" type="button" data-bp="reviews">' + stars(avg) + "<span>" + (n ? avg.toFixed(1) + " · " + n + (n === 1 ? " review" : " reviews") : (sh.loaded() ? "No reviews yet — be the first" : "Loading reviews…")) + "</span></button>" : "") +
        (sale ? '<div class="bp-price"><b>' + sh.money(b.price) + "</b>" + (off ? "<s>" + sh.money(b.oldPrice) + "</s><em>−" + off + "%</em>" : "") + "</div>" : "") +
        '<div class="bp-actions">' +
          (sale ? (sold ? '<span class="sold">Sold out for now</span>' : '<button class="btn primary bp-buy" type="button" data-bp="buy">🛒 Buy now</button>') : "") +
          '<button class="btn ghost" type="button" data-bp="share">' + ICON_SHARE + " Share</button>" +
          (extLink ? '<a class="btn ghost" href="' + esc(safe(b.link)) + '"' + (/^https?:/.test(b.link) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(b.linkText || "Read more") + " ↗</a>" : "") +
        "</div>" +
        (sale && sh.perks().length ? '<ul class="bp-perks">' + sh.perks().map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
        (b.tags && b.tags.length ? '<div class="chips">' + b.tags.map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + "</div>" : "") +
      "</div></section>";
    if (String(b.blurb || "").trim()) html += '<section class="bp-sec"><h2>About this book</h2><div class="bp-about">' + esc(b.blurb) + "</div></section>";
    if (sh) {
      html += '<section class="bp-sec"><div class="bp-sec-head"><h2>Reader reviews</h2><button class="btn ghost small" type="button" data-bp="reviews">✍️ Write a review</button></div>';
      html += n ? '<div class="bp-revs">' + revs.slice(0, 6).map(function (r) {
        var d = r.time ? new Date(r.time) : null;
        return '<article><div class="rv-top"><b>' + esc(r.name) + "</b>" + stars(r.rating) + (d && !isNaN(d) ? "<time>" + d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + "</time>" : "") + "</div><p>" + esc(r.text) + "</p></article>";
      }).join("") + "</div>" + (n > 6 ? '<button class="bp-all" type="button" data-bp="reviews">See all ' + n + " reviews →</button>" : "")
        : '<p class="bp-none">' + (sh.loaded() ? "No reviews yet. Read it? Tell others what you thought!" : "Loading reviews…") + "</p>";
      html += "</section>";
    }
    var others = books.map(function (x, k) { return k; }).filter(function (k) { return k !== i; });
    if (others.length) {
      var item = function (k) {
        var o = books[k], s2 = SHOP();
        return '<a class="reel-item" href="#book/' + esc(encodeURIComponent(linkName(o, k))) + '" title="' + esc(o.title) + '">' + cover3d(o, k, "reel-book") +
          '<span class="reel-t">' + esc(o.title) + "</span>" + (s2 && s2.onSale(o) ? '<span class="reel-p">' + s2.money(o.price) + "</span>" : "") + "</a>";
      };
      // repeat the other books so the strip is always wider than the screen, then double it for a seamless loop
      var seq = []; while (seq.length < 8) seq = seq.concat(others);
      var run = seq.map(item).join("");
      html += '<section class="bp-sec bp-more"><div class="bp-sec-head"><h2>Explore more books</h2><button class="btn ghost small" type="button" data-close>All books →</button></div>' +
        '<div class="reel' + (reduce ? " still" : "") + '"><div class="reel-track" style="--reel-dur:' + Math.max(18, seq.length * 4) + 's">' +
        '<div class="reel-run">' + run + "</div>" + (reduce ? "" : '<div class="reel-run" aria-hidden="true">' + run + "</div>") + "</div></div></section>";
    }
    inner.innerHTML = html;
    inner.querySelectorAll('.reel-run[aria-hidden] a').forEach(function (a) { a.tabIndex = -1; });
    $("bpCrumb").textContent = b.title;
    document.title = b.title + " — Books by Jubayer";
  }

  function show(i) {
    if (i < 0) return;
    var wasHidden = page.hidden;
    cur = i; render(i);
    page.hidden = false; document.body.classList.add("lock");
    scroller.scrollTop = 0;
    if (wasHidden) setTimeout(function () { var f = page.querySelector(".bp-back"); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  function hide() {
    if (page.hidden) return;
    page.hidden = true; cur = -1; closePop();
    document.title = oldTitle;
    var r = $("reader"), sm = document.querySelector(".sm");
    if ((!r || r.hidden) && (!sm || sm.hidden)) document.body.classList.remove("lock");
    var sec = $("books"); if (sec) sec.scrollIntoView({ block: "start" });
  }
  function go(i) { pushed = true; location.hash = "#book/" + encodeURIComponent(linkName(books[i], i)); }
  function close() {
    if (pushed && history.length > 1) { pushed = false; history.back(); }
    else { history.replaceState(null, "", "#books"); hide(); }
  }
  function route() {
    var m = location.hash.match(/^#book\/(.+)$/);
    if (m) {
      var i = findBook(m[1]);
      if (i >= 0) show(i); else { history.replaceState(null, "", "#books"); hide(); var s = $("books"); if (s) s.scrollIntoView(); }
    } else hide();
  }
  page.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { e.preventDefault(); close(); return; }
    var a = e.target.closest("[data-bp]"), sh = SHOP();
    if (a) {
      var act = a.getAttribute("data-bp");
      if (act === "buy" && sh) sh.openBuy(cur);
      else if (act === "reviews" && sh) sh.openReviews(cur);
      else if (act === "share") share(cur, a);
      return;
    }
    var reel = e.target.closest(".reel-item");
    if (reel) { pushed = true; }   // the link changes the address itself; Back returns to this book
  });
  $("bpShare").addEventListener("click", function (e) { share(cur, e.currentTarget); });
  $("bpShare").setAttribute("data-share", "page");
  // Runs before the shop's own Esc handler (capture), so Esc closes the order/review popup first
  // and only the next Esc closes the book page.
  addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || page.hidden || !pop.hidden) return;
    var sm = document.querySelector(".sm");
    if (sm && !sm.hidden) return;
    close();
  }, true);
  // pause the rolling strip while it's touched or hovered
  page.addEventListener("touchstart", function (e) { var r = e.target.closest(".reel"); if (r) r.classList.add("hold"); }, { passive: true });
  page.addEventListener("touchend", function (e) { var r = e.target.closest(".reel"); if (r) setTimeout(function () { r.classList.remove("hold"); }, 1200); }, { passive: true });
  // reviews arrive after the page may already be open
  var sh0 = SHOP(); if (sh0) sh0.onReviews(function () { if (cur >= 0) { var st = scroller.scrollTop; render(cur); scroller.scrollTop = st; } });

  addEventListener("hashchange", route);
  route();
})();
