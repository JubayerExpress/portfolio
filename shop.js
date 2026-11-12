/* Book shop: price + Buy button on book cards, checkout (bKash / cash on delivery), reviews.
   Settings live in content.js → "shop" and each book's forSale / price / oldPrice / soldOut.
   Orders and reviews are stored in your Google Sheet through shop-backend.gs. */
(function () {
  "use strict";
  var S = window.SITE || {}, SH = S.shop || {};
  var MD = window.MD, esc = MD.esc, safe = MD.safe;
  var $ = function (id) { return document.getElementById(id); };
  var books = S.books || [];
  var grid = $("booksGrid");
  if (!grid || SH.enabled === false || !/^https:\/\//.test(SH.endpoint || "")) return;

  var CUR = SH.currency || "৳";
  var AREAS = (SH.delivery && SH.delivery.length) ? SH.delivery : [{ label: "BRAC University campus", fee: 0 }];
  var REV = {};          // bookId -> [reviews]
  var revLoaded = false, curRev = null;

  function money(n) { return CUR + (Number(n) || 0).toLocaleString("en-IN"); }
  /* coupon maths (the Google Sheet checks it again when the order is placed) */
  function discOf(c, sub, fee) {
    if (!c || (c.min && sub < c.min)) return 0;
    var d = c.type === "flat" ? c.value : c.type === "freeship" ? fee : Math.round(sub * c.value / 100);
    if (c.type === "percent" && c.max) d = Math.min(d, c.max);
    return Math.max(0, Math.min(d, c.type === "freeship" ? fee : sub));
  }
  function offer(c) { return c.type === "percent" ? c.value + "% OFF" : c.type === "flat" ? money(c.value) + " OFF" : "FREE DELIVERY"; }
  function bookTitle(id) { var t = ""; books.forEach(function (b, i) { if (bid(b, i) === id) t = b.title; }); return t; }
  function terms(c) {
    var t = [];
    if (c.min) t.push("on orders " + money(c.min) + "+");
    if (c.type === "percent" && c.max) t.push("up to " + money(c.max));
    if (c.book && bookTitle(c.book)) t.push("for “" + bookTitle(c.book) + "”");
    if (c.expires) { var d = new Date(c.expires + "T23:59:59"); if (!isNaN(d)) t.push("till " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })); }
    return t.join(" · ");
  }
  var pendingCoupon = "";
  try { pendingCoupon = sessionStorage.getItem("coupon") || ""; } catch (e) {}
  function bid(b, i) { return String(b.id || "book-" + (i + 1)); }
  function isOn(v) { return v === true || v === "true"; }
  function onSale(b) { return isOn(b.forSale) && Number(b.price) > 0; }
  function soldOut(b) { return isOn(b.soldOut); }
  function starRow(n) {
    n = Math.max(0, Math.min(5, Math.round(n)));
    return '<span class="rs" aria-hidden="true">' + "★".repeat(n) + '<i>' + "☆".repeat(5 - n) + "</i></span>";
  }
  function api(body) {
    return fetch(SH.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }, function () { throw new Error("Couldn't reach the shop. Check your internet and try again."); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "Something went wrong. Please try again."); return j; });
  }

  /* ---------- book cards ---------- */
  var cards = grid.querySelectorAll(":scope > article");
  books.forEach(function (b, i) {
    var el = cards[i]; if (!el) return;
    var id = bid(b, i), box = document.createElement("div");
    box.className = "shop-box";
    var html = "";
    if (onSale(b)) {
      html += '<div class="buy-row"><div class="price">' + money(b.price) +
        (Number(b.oldPrice) > Number(b.price) ? "<s>" + money(b.oldPrice) + "</s>" : "") + "</div>" +
        (soldOut(b) ? '<span class="sold">Sold out</span>'
                   : '<button class="btn primary small buy-btn" type="button" data-buy="' + i + '">Buy now</button>') + "</div>";
    }
    html += '<button class="rev-line" type="button" data-rev="' + i + '"><span data-stars="' + esc(id) + '">' + starRow(0) +
      '</span><span class="rn" data-revn="' + esc(id) + '">Reviews</span></button>';
    box.innerHTML = html;
    var link = el.querySelector(".link");
    // An empty or "#" link was only a placeholder for buying; the Buy button replaces it.
    if (link && onSale(b) && (!b.link || b.link === "#")) link.remove();
    // A link of just "#buy" means "buy this book": open its order form.
    else if (link && /^#buy\/?$/.test(String(b.link || "").trim())) { link.setAttribute("href", "#buy/" + encodeURIComponent(id)); link.removeAttribute("target"); }
    var cov = el.querySelector(".bk-stage") || el.querySelector(".cover");
    if (cov && onSale(b)) {
      var off = Number(b.oldPrice) > Number(b.price) ? Math.round((1 - Number(b.price) / Number(b.oldPrice)) * 100) : 0;
      cov.insertAdjacentHTML("beforeend",
        (off ? '<span class="cover-off">−' + off + "%</span>" : "") +
        (soldOut(b) ? '<span class="cover-buy sold-tag">Sold out</span>'
                   : '<button class="cover-buy" type="button" data-buy="' + i + '" aria-label="Buy ' + esc(b.title) + '">🛒 Buy · ' + money(b.price) + "</button>"));
      if (!soldOut(b)) { cov.classList.add("can-buy"); cov.setAttribute("data-buy", i); }
    }
    var after = el.querySelector(".chips");
    if (after) after.parentNode.insertBefore(box, after.nextSibling); else (el.querySelector(".bk-body") || el).appendChild(box);
  });
  /* ---------- store look: perks strip under the heading ---------- */
  if (books.some(onSale)) {
    var sec = $("books"); if (sec) sec.classList.add("store");
    var free = AREAS.filter(function (a) { return !(Number(a.fee) > 0); })[0];
    var perks = [];
    if (free) perks.push('<span><i>🚚</i><b>Free delivery</b> · ' + esc(free.label) + "</span>");
    if (String(SH.bkashNumber || "").trim()) perks.push('<span><i>📲</i><b>bKash</b>' + (SH.cod !== false ? " or <b>cash on delivery</b>" : "") + "</span>");
    else if (SH.cod !== false) perks.push('<span><i>💵</i><b>Cash on delivery</b></span>');
    perks.push('<span><i>⭐</i>Real <b>reader reviews</b></span>');
    var strip = document.createElement("div");
    strip.className = "perks reveal in"; strip.innerHTML = perks.join("");
    grid.parentNode.insertBefore(strip, grid);
  }
  grid.addEventListener("click", function (e) {
    if (e.target.closest(".more")) return;
    var t = e.target.closest("[data-buy],[data-rev]"); if (!t) return;
    e.preventDefault();
    if (t.hasAttribute("data-buy")) openBuy(+t.getAttribute("data-buy")); else openReviews(+t.getAttribute("data-rev"));
  });

  function paintRatings() {
    books.forEach(function (b, i) {
      var id = bid(b, i), list = REV[id] || [], n = list.length;
      var avg = n ? list.reduce(function (s, r) { return s + r.rating; }, 0) / n : 0;
      grid.querySelectorAll('[data-stars="' + CSS.escape(id) + '"]').forEach(function (s) { s.innerHTML = starRow(avg); });
      grid.querySelectorAll('[data-revn="' + CSS.escape(id) + '"]').forEach(function (s) {
        s.textContent = n ? avg.toFixed(1) + " · " + n + (n === 1 ? " review" : " reviews") : "No reviews yet · Write one";
      });
    });
  }
  /* ---------- coupon tickets above the books (only coupons marked "Show on site") ---------- */
  fetch(SH.endpoint + "?action=coupons").then(function (r) { return r.json(); }).then(function (j) {
    var list = (j && j.coupons) || [];
    if (!list.length) return;
    var strip = document.createElement("div");
    strip.className = "cp-strip";
    strip.innerHTML = list.map(function (c) {
      return '<div class="cp-card"><div class="cp-left"><span>' + esc(offer(c)) + "</span>" + (c.note ? "<small>" + esc(c.note) + "</small>" : "") + "</div>" +
        '<div class="cp-right"><small>Use code</small><b class="mono">' + esc(c.code) + "</b>" +
        '<button type="button" class="cp-use" data-code="' + esc(c.code) + '">Copy & use</button>' +
        (terms(c) ? '<em>' + esc(terms(c)) + "</em>" : "") + "</div></div>";
    }).join("");
    grid.parentNode.insertBefore(strip, grid);
    strip.addEventListener("click", function (e) {
      var b = e.target.closest(".cp-use"); if (!b) return;
      var code = b.getAttribute("data-code");
      pendingCoupon = code;
      try { sessionStorage.setItem("coupon", code); } catch (x) {}
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(function () {});
      b.textContent = "✓ Added to your order";
      setTimeout(function () { b.textContent = "Copy & use"; }, 2200);
    });
  }).catch(function () {});

  function loadReviews() {
    return fetch(SH.endpoint + "?action=reviews").then(function (r) { return r.json(); }).then(function (j) {
      REV = {};
      (j && j.reviews || []).forEach(function (r) { (REV[r.book] = REV[r.book] || []).push(r); });
      done();
    }).catch(done);
    function done() {
      revLoaded = true; paintRatings();
      // If the reviews popup was opened while loading and nothing is typed yet, show the real list.
      var f = $("revForm");
      if (curRev != null && !modal.hidden && body.querySelector(".rv-list .none") && f && !f.elements.name.value && !f.elements.text.value) openReviews(curRev);
    }
  }
  loadReviews();

  /* ---------- modal ---------- */
  var modal = document.createElement("div");
  modal.className = "sm"; modal.hidden = true;
  modal.innerHTML = '<div class="sm-back" data-close></div><div class="sm-box" role="dialog" aria-modal="true" aria-labelledby="smTitle">' +
    '<button class="sm-x" type="button" data-close aria-label="Close">✕</button><div class="sm-body" id="smBody"></div></div>';
  document.body.appendChild(modal);
  var body = $("smBody"), lastFocus = null;
  function open(html) {
    lastFocus = document.activeElement;
    body.innerHTML = html; modal.hidden = false;
    document.body.classList.add("lock");
    modal.querySelector(".sm-box").scrollTop = 0;
    setTimeout(function () { var f = body.querySelector("input:not([type=radio]):not(.hp),textarea,button"); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    if (modal.hidden) return;
    modal.hidden = true; body.innerHTML = ""; curRev = null;
    if ($("reader") && $("reader").hidden) document.body.classList.remove("lock");
    if (/^#(buy|reviews)\//.test(location.hash)) history.replaceState(null, "", "#books");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  modal.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) close(); });
  addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  function head(b, sub) {
    return '<div class="sm-head">' + (b.image ? '<div class="sm-cover"><img src="' + esc(safe(b.image)) + '" alt=""></div>' : "") +
      '<div><span class="meta">' + esc(sub) + '</span><h3 id="smTitle">' + esc(b.title) + "</h3></div></div>";
  }
  function copyBtn(text, label) {
    return '<button class="copy" type="button" data-copy="' + esc(text) + '">' + esc(label || "Copy") + "</button>";
  }
  body.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]"); if (!c) return;
    var txt = c.getAttribute("data-copy"), old = c.textContent;
    var done = function () { c.textContent = "Copied ✓"; setTimeout(function () { c.textContent = old; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
  });

  /* ---------- checkout ---------- */
  function openBuy(i) {
    var b = books[i]; if (!b || !onSale(b) || soldOut(b)) return;
    curRev = null;
    var hasBk = !!String(SH.bkashNumber || "").trim(), hasCod = SH.cod !== false;
    var areas = AREAS.map(function (a, k) {
      var fee = Number(a.fee) || 0;
      return '<label class="opt"><input type="radio" name="area" value="' + k + '"' + (k === 0 ? " checked" : "") + '>' +
        "<span><b>" + esc(a.label) + "</b><small" + (fee ? "" : ' class="free"') + ">" + (fee ? money(fee) + " delivery" : "Free delivery") + "</small></span></label>";
    }).join("");
    var pays = (hasBk ? '<label class="opt"><input type="radio" name="pay" value="bkash" checked><span><b><em class="bk-logo">bKash</em> Pay now</b><small>Send money, then type the TrxID</small></span></label>' : "") +
      (hasCod ? '<label class="opt"><input type="radio" name="pay" value="cod"' + (hasBk ? "" : " checked") + "><span><b>💵 Cash on delivery</b><small>Pay when you get the book</small></span></label>" : "");
    open(head(b, "Order this book") +
      (SH.freeNote ? '<div class="sm-free">' + esc(SH.freeNote) + "</div>" : "") +
      '<form id="buyForm" novalidate autocomplete="on">' +
      '<div class="sm-row"><span class="sm-l">Price</span><span><b>' + money(b.price) + "</b>" + (Number(b.oldPrice) > Number(b.price) ? " <s>" + money(b.oldPrice) + "</s>" : "") + "</span></div>" +
      '<div class="sm-row"><span class="sm-l">Copies</span><span class="qty"><button type="button" data-q="-1" aria-label="One less">−</button>' +
      '<input name="qty" value="1" inputmode="numeric" aria-label="Copies"><button type="button" data-q="1" aria-label="One more">+</button></span></div>' +
      '<fieldset><legend>Delivery</legend><div class="opts">' + areas + "</div></fieldset>" +
      '<fieldset><legend>Your details</legend><div class="sm-grid">' +
      '<label class="fl"><span>Name</span><input name="name" autocomplete="name" required maxlength="80"></label>' +
      '<label class="fl"><span>Phone</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="01XXXXXXXXX" required maxlength="16"></label>' +
      '<label class="fl wide"><span id="addrL">Address</span><textarea name="address" rows="2" autocomplete="street-address" required maxlength="400"></textarea></label>' +
      '<label class="fl wide"><span>Email <small>(optional)</small></span><input name="email" type="email" autocomplete="email" maxlength="120"></label>' +
      "</div></fieldset>" +
      '<fieldset><legend>Payment</legend><div class="opts">' + pays + "</div>" +
      (hasBk ? '<div class="bk" id="bkBox"><ol>' +
        "<li>Open bKash → <b>Send Money</b></li>" +
        '<li>Number: <b class="mono">' + esc(SH.bkashNumber) + "</b>" + (SH.bkashType ? " <small>(" + esc(SH.bkashType) + ")</small>" : "") + " " + copyBtn(String(SH.bkashNumber).replace(/\s/g, "")) + "</li>" +
        '<li>Amount: <b id="bkAmt" class="mono"></b></li>' +
        "<li>Copy the <b>TrxID</b> from the bKash message and write it below</li></ol>" +
        '<div class="sm-grid"><label class="fl"><span>bKash number you paid from</span><input name="bkashSender" type="tel" inputmode="tel" placeholder="01XXXXXXXXX" maxlength="16"></label>' +
        '<label class="fl"><span>TrxID</span><input name="trxid" class="mono" placeholder="e.g. 9A7B6C5D4E" autocapitalize="characters" maxlength="20"></label></div></div>' : "") +
      "</fieldset>" +
      '<label class="fl"><span>Note <small>(optional)</small></span><textarea name="note" rows="2" maxlength="400" placeholder="Anything we should know?"></textarea></label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="cp" id="cpBox"></div>' +
      '<div class="sum"><div><span>Book × <b id="sQty">1</b></span><b id="sSub"></b></div><div><span>Delivery</span><b id="sFee"></b></div>' +
      '<div id="sDiscRow" class="disc" hidden><span>Coupon <b id="sCode" class="mono"></b></span><b id="sDisc"></b></div>' +
      '<div class="tot"><span>Total</span><b id="sTot"></b></div></div>' +
      '<p class="sm-err" id="buyErr" role="alert" hidden></p>' +
      '<button class="btn primary sm-go" type="submit" id="buyGo">Place order</button>' +
      "</form>");

    var f = $("buyForm");
    function val(n) { var x = f.elements[n]; return x ? String(x.value || "").trim() : ""; }
    function qty() { var q = parseInt(f.elements.qty.value, 10); return Math.max(1, Math.min(20, isFinite(q) ? q : 1)); }
    function area() { var r = f.querySelector('input[name=area]:checked'); return AREAS[r ? +r.value : 0]; }
    function pay() { var r = f.querySelector('input[name=pay]:checked'); return r ? r.value : ""; }
    var coupon = null, cpBusy = false;
    function drawCoupon(msg, bad) {
      var box = $("cpBox"), q = qty(), fee = Number(area().fee) || 0, sub = q * Number(b.price);
      if (coupon) {
        var d = discOf(coupon, sub, fee), short = coupon.min && sub < coupon.min;
        box.innerHTML = '<div class="cp-ticket on"><span class="cp-ico" aria-hidden="true">' + (short ? "⚠️" : "🎉") + "</span>" +
          '<div class="cp-txt"><b class="mono">' + esc(coupon.code) + "</b><small>" +
          (short ? "Needs an order of " + money(coupon.min) + "+ (add a copy)" : esc(offer(coupon)) + (d ? " · you save " + money(d) : "")) +
          '</small></div><button type="button" class="cp-btn ghost" id="cpRemove">Remove</button></div>';
      } else {
        box.innerHTML = '<div class="cp-ticket"><span class="cp-ico" aria-hidden="true">🎟️</span>' +
          '<input name="coupon" class="mono" placeholder="Have a coupon? Type it here" autocapitalize="characters" autocomplete="off" maxlength="24" aria-label="Coupon code">' +
          '<button type="button" class="cp-btn" id="cpApply">' + (cpBusy ? "…" : "Apply") + "</button></div>" +
          (msg ? '<p class="cp-msg' + (bad ? " bad" : "") + '">' + esc(msg) + "</p>" : "");
      }
    }
    function applyCoupon(code) {
      code = String(code || "").trim().toUpperCase();
      if (!code) return drawCoupon("Type a coupon code first.", true);
      var q = qty(), fee = Number(area().fee) || 0;
      cpBusy = true; drawCoupon(); f.elements.coupon.value = code;
      api({ action: "coupon", code: code, bookId: bid(b, i), subtotal: q * Number(b.price), deliveryFee: fee })
        .then(function (j) { coupon = j.coupon; cpBusy = false; drawCoupon(); update(); })
        .catch(function (x) { cpBusy = false; drawCoupon(x.message, true); if (f.elements.coupon) f.elements.coupon.value = code; update(); });
    }
    f.addEventListener("click", function (e) {
      if (e.target.closest("#cpApply")) applyCoupon(f.elements.coupon && f.elements.coupon.value);
      if (e.target.closest("#cpRemove")) { coupon = null; try { sessionStorage.removeItem("coupon"); } catch (x) {} drawCoupon(); update(); }
    });
    f.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.name === "coupon") { e.preventDefault(); applyCoupon(e.target.value); }
    });
    drawCoupon();
    function update() {
      var q = qty(), fee = Number(area().fee) || 0, sub = q * Number(b.price), disc = discOf(coupon, sub, fee), tot = sub + fee - disc;
      $("sQty").textContent = q; $("sSub").textContent = money(sub); $("sFee").textContent = fee ? money(fee) : "Free";
      $("sDiscRow").hidden = !disc; $("sCode").textContent = coupon ? coupon.code : ""; $("sDisc").textContent = "−" + money(disc);
      if (coupon) drawCoupon();
      $("sTot").textContent = money(tot);
      if ($("bkAmt")) $("bkAmt").textContent = money(tot);
      if ($("bkBox")) $("bkBox").hidden = pay() !== "bkash";
      $("addrL").textContent = fee ? "Full address" : "Where to deliver on campus (department, ID or a place to meet)";
      $("buyGo").textContent = "Place order · " + money(tot);
    }
    f.addEventListener("click", function (e) {
      var q = e.target.closest("[data-q]"); if (!q) return;
      f.elements.qty.value = Math.max(1, Math.min(20, qty() + (+q.getAttribute("data-q")))); update();
    });
    f.addEventListener("input", function (e) { $("buyErr").hidden = true; if (e.target.name !== "coupon") update(); });
    f.addEventListener("change", function (e) { if (e.target.name !== "coupon") update(); });
    f.elements.qty.addEventListener("blur", function () { f.elements.qty.value = qty(); update(); });
    update();
    if (pendingCoupon) applyCoupon(pendingCoupon);   // picked on a coupon ticket

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("buyErr"), go = $("buyGo");
      function fail(m, field) { err.textContent = m; err.hidden = false; if (field && f.elements[field]) f.elements[field].focus(); }
      err.hidden = true;
      var phoneDigits = val("phone").replace(/\D/g, "");
      if (!val("name")) return fail("Please write your name.", "name");
      if (phoneDigits.length < 10) return fail("Please write a valid phone number.", "phone");
      if (!val("address")) return fail("Please write where to deliver.", "address");
      if (!pay()) return fail("Please choose how you'll pay.");
      if (pay() === "bkash") {
        if (val("bkashSender").replace(/\D/g, "").length < 10) return fail("Please write the bKash number you paid from.", "bkashSender");
        if (val("trxid").replace(/[^a-z0-9]/gi, "").length < 6) return fail("Please write the TrxID from your bKash message.", "trxid");
      }
      if (coupon && coupon.min && qty() * Number(b.price) < coupon.min) return fail("Your coupon needs an order of " + money(coupon.min) + "+. Add a copy or remove the coupon.");
      if (!coupon && f.elements.coupon && f.elements.coupon.value.trim()) return fail("Press Apply to use your coupon, or clear the coupon box.");
      var a = area();
      go.disabled = true; go.textContent = "Placing order…";
      api({
        action: "order", bookId: bid(b, i), bookTitle: b.title, qty: qty(), price: Number(b.price),
        deliveryArea: a.label, deliveryFee: Number(a.fee) || 0,
        name: val("name"), phone: val("phone"), email: val("email"), address: val("address"),
        payment: pay(), bkashSender: val("bkashSender"), trxid: val("trxid"), note: val("note"), website: val("website"),
        coupon: coupon ? coupon.code : ""
      }).then(function (r) {
        var bk = pay() === "bkash";
        try { sessionStorage.removeItem("coupon"); } catch (x) {} pendingCoupon = "";
        body.innerHTML = '<div class="sm-done"><div class="tick">✓</div><h3 id="smTitle">Order placed!</h3>' +
          "<p>Thank you, " + esc(val("name")) + ". Your order ID is</p>" +
          '<div class="oid"><b class="mono">' + esc(r.id) + "</b>" + copyBtn(r.id) + "</div>" +
          "<p class=\"small\">Please keep this ID. " + (bk ? "We'll check your bKash payment and " : "We'll ") +
          "call you at <b>" + esc(val("phone")) + "</b> to confirm.</p>" +
          '<div class="sum">' + (r.discount ? '<div class="disc"><span>Coupon ' + esc(coupon ? coupon.code : "") + "</span><b>−" + money(r.discount) + "</b></div>" : "") +
          '<div class="tot"><span>' + esc(b.title) + " × " + qty() + "</span><b>" + money(r.total) + "</b></div></div>" +
          '<button class="btn primary sm-go" type="button" data-close>Done</button></div>';
        body.querySelector(".sm-go").focus();
      }).catch(function (x) { go.disabled = false; update(); fail(x.message); });
    });
  }

  /* ---------- reviews ---------- */
  function openReviews(i) {
    var b = books[i]; if (!b) return;
    curRev = i;
    var id = bid(b, i), list = REV[id] || [], n = list.length;
    var avg = n ? list.reduce(function (s, r) { return s + r.rating; }, 0) / n : 0;
    var items = n ? list.map(function (r) {
      var d = r.time ? new Date(r.time) : null;
      return '<li><div class="rv-top"><b>' + esc(r.name) + "</b>" + starRow(r.rating) +
        (d && !isNaN(d) ? "<time>" + d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + "</time>" : "") +
        "</div><p>" + esc(r.text) + "</p></li>";
    }).join("") : '<li class="none">' + (revLoaded ? "No reviews yet. Be the first to write one!" : "Loading reviews…") + "</li>";
    open(head(b, "Reviews") +
      (n ? '<div class="rv-sum"><b>' + avg.toFixed(1) + "</b>" + starRow(avg) + "<span>" + n + (n === 1 ? " review" : " reviews") + "</span></div>" : "") +
      '<ul class="rv-list">' + items + "</ul>" +
      '<form id="revForm" class="rv-form" novalidate><h4>Write a review</h4>' +
      '<div class="pick" role="radiogroup" aria-label="Your rating">' + [1, 2, 3, 4, 5].map(function (k) {
        return '<button type="button" role="radio" aria-checked="false" data-r="' + k + '" aria-label="' + k + ' star' + (k > 1 ? "s" : "") + '">★</button>';
      }).join("") + "</div>" +
      '<div class="sm-grid"><label class="fl wide"><span>Your name</span><input name="name" autocomplete="name" maxlength="60"></label>' +
      '<label class="fl wide"><span>Your review</span><textarea name="text" rows="3" maxlength="1000" placeholder="What did you think of the book?"></textarea></label></div>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="sm-err" id="revErr" role="alert" hidden></p>' +
      '<button class="btn primary sm-go" type="submit">Send review</button>' +
      '<p class="small muted">Reviews appear after a quick check.</p></form>');
    var f = $("revForm"), rating = 0;
    f.addEventListener("input", function () { $("revErr").hidden = true; });
    f.querySelector(".pick").addEventListener("click", function (e) {
      var s = e.target.closest("[data-r]"); if (!s) return;
      rating = +s.getAttribute("data-r");
      f.querySelectorAll(".pick button").forEach(function (x) {
        var on = +x.getAttribute("data-r") <= rating; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(+x.getAttribute("data-r") === rating));
      });
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("revErr"), go = f.querySelector(".sm-go"), name = f.elements.name.value.trim(), text = f.elements.text.value.trim();
      function fail(m) { err.textContent = m; err.hidden = false; }
      err.hidden = true;
      if (!rating) return fail("Please tap the stars to rate the book.");
      if (!name) return fail("Please write your name.");
      if (text.length < 3) return fail("Please write a few words.");
      go.disabled = true; go.textContent = "Sending…";
      api({ action: "review", bookId: id, bookTitle: b.title, name: name, rating: rating, text: text, website: f.elements.website.value })
        .then(function () {
          f.innerHTML = '<div class="sm-done small-done"><div class="tick">✓</div><h4>Thank you!</h4><p>Your review will show here after a quick check.</p></div>';
        })
        .catch(function (x) { go.disabled = false; go.textContent = "Send review"; fail(x.message); });
    });
  }

  /* ---------- links like #buy/<book-id> or #reviews/<book-id> (for announcements) ---------- */
  function route() {
    var m = location.hash.match(/^#(buy|reviews)\/(.+)$/); if (!m) return;
    var want = decodeURIComponent(m[2]), i = -1;
    // If two books ever share an ID, prefer the one that is for sale.
    books.forEach(function (b, k) { if (bid(b, k) === want && (i < 0 || (onSale(b) && !onSale(books[i])))) i = k; });
    if (i < 0) return;
    var sec = $("books"); if (sec) sec.scrollIntoView({ block: "start" });
    if (m[1] === "buy" && onSale(books[i]) && !soldOut(books[i])) openBuy(i); else openReviews(i);
  }
  addEventListener("hashchange", route);
  // Clicking the same #buy/… link twice doesn't change the address, so open the form directly then.
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#buy/"],a[href^="#reviews/"]');
    if (a && a.getAttribute("href") === location.hash) { e.preventDefault(); route(); }
  });
  route();
})();
