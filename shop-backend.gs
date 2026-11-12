/* =====================================================================
   jubayer.bond — Book shop backend (Google Apps Script)

   Where this goes: open your Google Sheet → Extensions → Apps Script,
   delete everything there, paste this whole file, then Deploy →
   New deployment → Web app (Execute as: Me, Who has access: Anyone).
   Copy the Web app URL into Admin → Shop → "Shop backend URL".

   It keeps two tabs in the Sheet: "Orders" and "Reviews" (made automatically).
   Only the GitHub account below can use the admin actions: the admin panel
   proves who you are with the same GitHub token you already log in with.
   ===================================================================== */

var OWNER = "JubayerExpress";   // your GitHub username
var NOTIFY_EMAIL = "";          // where new-order emails go ("" = this Google account)

var ORDER_HEAD = ["Order ID", "Time", "Status", "Book ID", "Book", "Qty", "Unit price", "Delivery area", "Delivery fee", "Total",
  "Name", "Phone", "Email", "Address", "Payment", "bKash sender", "TrxID", "Note", "Admin note", "Coupon", "Discount"];
var REVIEW_HEAD = ["Review ID", "Time", "Status", "Book ID", "Book", "Name", "Rating", "Review"];
var ORDER_STATUS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
var REVIEW_STATUS = ["Pending", "Approved", "Hidden"];
var COUPON_HEAD = ["Code", "Type", "Value", "Min order", "Max discount", "Expires", "Max uses", "Used", "Active", "Show on site", "Book ID", "Note"];
var COUPON_TYPES = ["percent", "flat", "freeship"];

/* ---------- helpers ---------- */
function sheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight("bold");
  } else if (sh.getLastColumn() < head.length) {
    // Sheet made by an older version of this script: add the new column names at the end.
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold");
  }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// Text a visitor typed: trimmed, length-limited, and never treated as a Sheet formula.
function txt_(v, n) {
  var s = String(v == null ? "" : v).replace(/\s+$/, "").replace(/^\s+/, "").slice(0, n || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function num_(v, min, max) { var n = Math.round(Number(v)); if (!isFinite(n)) n = min; return Math.max(min, Math.min(max, n)); }
function rows_(sh, head) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, head.length).getValues().map(function (r, i) {
    var o = { _row: i + 2 };
    head.forEach(function (k, j) { o[k] = r[j] instanceof Date ? r[j].toISOString() : r[j]; });
    return o;
  });
}
function findRow_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}
function newId_(prefix) {
  var d = Utilities.formatDate(new Date(), "Asia/Dhaka", "yyMMdd");
  return prefix + d + "-" + (1000 + Math.floor(Math.random() * 9000));
}
// Simple spam brake: at most `max` actions per key every 10 minutes.
function throttle_(key, max) {
  var c = CacheService.getScriptCache(), k = "t_" + key, n = Number(c.get(k) || 0);
  if (n >= max) throw new Error("Too many tries. Please wait a few minutes and try again.");
  c.put(k, String(n + 1), 600);
}

/* ---------- admin check: the caller must hold a GitHub token of OWNER ---------- */
function admin_(token) {
  token = String(token || "");
  if (!token) throw new Error("Not logged in.");
  var c = CacheService.getScriptCache();
  var key = "a_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  if (c.get(key) === "1") return;
  var r = UrlFetchApp.fetch("https://api.github.com/user", {
    headers: { Authorization: "Bearer " + token, "User-Agent": "jubayer-bond-shop", Accept: "application/vnd.github+json" },
    muteHttpExceptions: true
  });
  var ok = r.getResponseCode() === 200 && String(JSON.parse(r.getContentText()).login || "").toLowerCase() === OWNER.toLowerCase();
  if (!ok) throw new Error("Admin check failed. Is OWNER at the top of the script your GitHub username?");
  c.put(key, "1", 21600);
}

/* ---------- public: read approved reviews ---------- */
function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || "";
  try {
    if (a === "reviews") {
      var c = CacheService.getScriptCache(), hit = c.get("pub_reviews");
      if (hit) return out_(JSON.parse(hit));
      var list = rows_(sheet_("Reviews", REVIEW_HEAD), REVIEW_HEAD)
        .filter(function (r) { return r.Status === "Approved"; })
        .map(function (r) { return { book: String(r["Book ID"]), name: String(r.Name), rating: Number(r.Rating) || 0, text: String(r.Review), time: r.Time }; })
        .reverse();
      var res = { ok: true, reviews: list };
      try { c.put("pub_reviews", JSON.stringify(res), 60); } catch (ignore) {}
      return out_(res);
    }
    if (a === "coupons") {
      var now = new Date();
      var pub = coupons_().filter(function (c) { return c.active && c.show && couponLive_(c, now) === ""; })
        .map(function (c) { return { code: c.code, type: c.type, value: c.value, min: c.min, max: c.max, book: c.book, expires: c.expires, note: c.note }; });
      return out_({ ok: true, coupons: pub });
    }
    return out_({ ok: true, service: "jubayer.bond shop", ready: true });
  } catch (err) { return out_({ ok: false, error: String(err.message || err) }); }
}

/* ---------- everything else is POST (sent as text/plain JSON) ---------- */
function doPost(e) {
  var b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return out_({ ok: false, error: "Bad request." }); }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var a = String(b.action || "");
    if (a === "order") return out_(order_(b));
    if (a === "review") return out_(review_(b));
    if (a === "coupon") {
      throttle_("coupon", 120);
      var cp = applyCoupon_(b.code, b.bookId, num_(b.subtotal, 0, 10000000), num_(b.deliveryFee, 0, 100000));
      return out_({ ok: true, coupon: cp.pub, discount: cp.discount });
    }
    if (a.indexOf("admin.") === 0) { admin_(b.token); return out_(adminAction_(a, b)); }
    return out_({ ok: false, error: "Unknown action." });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  } finally { try { lock.releaseLock(); } catch (ignore) {} }
}

function order_(b) {
  if (b.website) return { ok: true, id: "OK" };          // bot trap: real people never fill this
  var name = txt_(b.name, 80), phone = String(b.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
  var address = txt_(b.address, 400), pay = b.payment === "bkash" ? "bKash" : "Cash on delivery";
  if (!name) throw new Error("Please write your name.");
  if (phone.replace(/\D/g, "").length < 10) throw new Error("Please write a valid phone number.");
  if (!address) throw new Error("Please write your address.");
  if (!b.bookId || !b.bookTitle) throw new Error("Book is missing.");
  var trx = "", sender = "";
  if (pay === "bKash") {
    trx = String(b.trxid || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    sender = String(b.bkashSender || "").replace(/[^\d+]/g, "").slice(0, 16);
    if (trx.length < 6) throw new Error("Please write the bKash TrxID.");
    if (sender.replace(/\D/g, "").length < 10) throw new Error("Please write the bKash number you paid from.");
  }
  throttle_("o_" + phone, 5);
  var qty = num_(b.qty, 1, 20), price = num_(b.price, 0, 1000000), fee = num_(b.deliveryFee, 0, 100000);
  var sub = qty * price, disc = 0, code = "", cpRow = 0;
  if (String(b.coupon || "").trim()) {
    var cp = applyCoupon_(b.coupon, b.bookId, sub, fee);   // throws a friendly error if it can't be used
    disc = cp.discount; code = cp.pub.code; cpRow = cp.row;
  }
  var total = Math.max(0, sub + fee - disc), id = newId_("JB");
  var sh = sheet_("Orders", ORDER_HEAD);
  sh.appendRow([id, new Date(), "Pending", txt_(b.bookId, 80), txt_(b.bookTitle, 200), qty, price, txt_(b.deliveryArea, 120), fee, total,
    name, phone ? "'" + phone : "", txt_(b.email, 120), address, pay, sender ? "'" + sender : "", trx ? "'" + trx : "", txt_(b.note, 400), "", code, disc]);
  if (cpRow) { var cs = sheet_("Coupons", COUPON_HEAD), uc = COUPON_HEAD.indexOf("Used") + 1; cs.getRange(cpRow, uc).setValue((Number(cs.getRange(cpRow, uc).getValue()) || 0) + 1); }
  // (the ' keeps numbers like 01712… and TrxIDs like 8E4F… as text, so the Sheet doesn't change them)
  try {
    MailApp.sendEmail(NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
      "📚 New order " + id + ": " + b.bookTitle + " × " + qty,
      "Book: " + b.bookTitle + " × " + qty + "\nTotal: ৳" + total + " (delivery ৳" + fee + ", " + b.deliveryArea + ")" +
      (code ? "\nCoupon: " + code + " (−৳" + disc + ")" : "") + "\n" +
      "Payment: " + pay + (trx ? "  |  TrxID " + trx + " from " + sender : "") + "\n\n" +
      "Name: " + name + "\nPhone: " + phone + "\nAddress: " + address + (b.note ? "\nNote: " + b.note : "") +
      "\n\nManage it in your admin → Orders.");
  } catch (ignore) {}
  return { ok: true, id: id, total: total, discount: disc };
}

/* ---------- coupons (kept in the "Coupons" tab, so nobody can read them from the website) ---------- */
function code_(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24); }
function day_(v) {   // a date cell or "2026-12-31" → "2026-12-31" (or "")
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Dhaka", "yyyy-MM-dd");
  var m = String(v || "").replace(/^'/, "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : "";
}
function coupons_() {
  var sh = sheet_("Coupons", COUPON_HEAD), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, COUPON_HEAD.length).getValues().map(function (r, i) {
    var t = String(r[1] || "").toLowerCase();
    return { row: i + 2, code: code_(r[0]), type: COUPON_TYPES.indexOf(t) >= 0 ? t : "percent", value: Number(r[2]) || 0,
      min: Number(r[3]) || 0, max: Number(r[4]) || 0, expires: day_(r[5]), uses: Number(r[6]) || 0, used: Number(r[7]) || 0,
      active: r[8] === true || /^(true|yes|1)$/i.test(String(r[8])), show: r[9] === true || /^(true|yes|1)$/i.test(String(r[9])),
      book: String(r[10] || "").trim(), note: String(r[11] || "") };
  }).filter(function (c) { return c.code; });
}
function couponLive_(c, now) {   // "" when usable today, otherwise the reason
  if (!c.active) return "This coupon is not active.";
  if (c.expires && Utilities.formatDate(now, "Asia/Dhaka", "yyyy-MM-dd") > c.expires) return "This coupon has expired.";
  if (c.uses && c.used >= c.uses) return "This coupon has been used up.";
  return "";
}
function applyCoupon_(raw, bookId, sub, fee) {
  var code = code_(raw);
  if (!code) throw new Error("Please type a coupon code.");
  var c = coupons_().filter(function (x) { return x.code === code; })[0];
  if (!c) throw new Error("This coupon code is not valid.");
  var why = couponLive_(c, new Date()); if (why) throw new Error(why);
  if (c.book && c.book !== String(bookId || "")) throw new Error("This coupon is for a different book.");
  if (c.min && sub < c.min) throw new Error("This coupon needs an order of at least ৳" + c.min + ".");
  var d = c.type === "flat" ? c.value : c.type === "freeship" ? fee : Math.round(sub * c.value / 100);
  if (c.type === "percent" && c.max) d = Math.min(d, c.max);
  d = Math.max(0, Math.min(d, c.type === "freeship" ? fee : sub));
  return { row: c.row, discount: d, pub: { code: c.code, type: c.type, value: c.value, min: c.min, max: c.max, book: c.book } };
}

function review_(b) {
  if (b.website) return { ok: true };
  var name = txt_(b.name, 60), text = txt_(b.text, 1000), rating = num_(b.rating, 1, 5);
  if (!b.bookId) throw new Error("Book is missing.");
  if (!name) throw new Error("Please write your name.");
  if (String(b.text || "").trim().length < 3) throw new Error("Please write a few words.");
  throttle_("reviews", 30);
  var id = newId_("R");
  sheet_("Reviews", REVIEW_HEAD).appendRow([id, new Date(), "Pending", txt_(b.bookId, 80), txt_(b.bookTitle, 200), name, rating, text]);
  return { ok: true, id: id };
}

function adminAction_(a, b) {
  var os = sheet_("Orders", ORDER_HEAD), rs = sheet_("Reviews", REVIEW_HEAD), row;
  if (a === "admin.list") {
    return { ok: true, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      orders: rows_(os, ORDER_HEAD).reverse(), reviews: rows_(rs, REVIEW_HEAD).reverse(),
      coupons: coupons_().map(function (c) { delete c.row; return c; }) };
  }
  if (a === "admin.couponSave") {
    var cs = sheet_("Coupons", COUPON_HEAD), c = b.coupon || {}, code = code_(c.code), orig = code_(b.original);
    if (code.length < 3) throw new Error("Coupon code needs at least 3 letters or numbers.");
    var type = COUPON_TYPES.indexOf(c.type) >= 0 ? c.type : "percent";
    var value = num_(c.value, 0, type === "percent" ? 100 : 1000000);
    if (type !== "freeship" && !value) throw new Error("Please set how much the coupon takes off.");
    var all = coupons_(), same = all.filter(function (x) { return x.code === code; })[0], mine = orig ? all.filter(function (x) { return x.code === orig; })[0] : null;
    if (same && (!mine || same.row !== mine.row)) throw new Error("A coupon called " + code + " already exists.");
    var exp = day_(c.expires);
    var vals = [code, type, value, num_(c.min, 0, 10000000), num_(c.max, 0, 10000000), exp ? "'" + exp : "", num_(c.uses, 0, 1000000),
      mine ? mine.used : 0, !!c.active, !!c.show, txt_(c.book, 80), txt_(c.note, 200)];
    if (mine) cs.getRange(mine.row, 1, 1, COUPON_HEAD.length).setValues([vals]); else cs.appendRow(vals);
    return { ok: true, code: code };
  }
  if (a === "admin.couponDelete") {
    var cs2 = sheet_("Coupons", COUPON_HEAD), hit = coupons_().filter(function (x) { return x.code === code_(b.code); })[0];
    if (!hit) throw new Error("Coupon not found.");
    cs2.deleteRow(hit.row);
    return { ok: true };
  }
  if (a === "admin.order") {
    row = findRow_(os, b.id); if (!row) throw new Error("Order not found.");
    if (b.status != null) {
      if (ORDER_STATUS.indexOf(b.status) < 0) throw new Error("Unknown status.");
      os.getRange(row, 3).setValue(b.status);
    }
    if (b.adminNote != null) os.getRange(row, ORDER_HEAD.indexOf("Admin note") + 1).setValue(txt_(b.adminNote, 400));
    return { ok: true };
  }
  if (a === "admin.review") {
    row = findRow_(rs, b.id); if (!row) throw new Error("Review not found.");
    if (REVIEW_STATUS.indexOf(b.status) < 0) throw new Error("Unknown status.");
    rs.getRange(row, 3).setValue(b.status);
    CacheService.getScriptCache().remove("pub_reviews");
    return { ok: true };
  }
  if (a === "admin.reviewDelete") {
    row = findRow_(rs, b.id); if (!row) throw new Error("Review not found.");
    rs.deleteRow(row);
    CacheService.getScriptCache().remove("pub_reviews");
    return { ok: true };
  }
  throw new Error("Unknown admin action.");
}
