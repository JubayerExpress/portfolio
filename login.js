/* Admin login gate.

   The site is static (GitHub Pages), so there is no server to check a password. Instead the
   GitHub token that can edit the site is stored ENCRYPTED in vault.js (AES-256-GCM, key derived
   from "login ID + password" with PBKDF2, 600k rounds). Without the right ID AND password the
   token cannot be recovered, so the admin panel cannot publish anything.
   vault.js is public by design: it is useless without your credentials. */
(function () {
  "use strict";
  var enc = new TextEncoder();
  var SKEY = "jz_admin_session", FKEY = "jz_admin_fail";
  var IDLE_MS = 30 * 60 * 1000, ITER = 600000;
  var $ = function (id) { return document.getElementById(id); };
  var hooks = { canLock: function () { return true; } };
  var onLogin = null, idleTimer = null, lastTouch = 0;

  /* ---------- helpers ---------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, "");
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    (kids == null ? [] : Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function b64e(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function b64d(s) {
    var bin = atob(s), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  function norm(id) { return String(id || "").trim().toLowerCase(); }
  function needCrypto() {
    if (!window.crypto || !crypto.subtle) throw new Error("Secure login needs HTTPS. Open https://jubayer.bond/admin.html (not http).");
  }

  /* ---------- crypto ---------- */
  function derive(id, pw, salt, iter) {
    needCrypto();
    return crypto.subtle.importKey("raw", enc.encode(norm(id) + "\u0000" + pw), "PBKDF2", false, ["deriveKey"]).then(function (km) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" }, km,
        { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function seal(id, pw, token, meta) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return derive(id, pw, salt, ITER).then(function (key) {
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(token));
    }).then(function (ct) {
      return { v: 1, iter: ITER, salt: b64e(salt), iv: b64e(iv), ct: b64e(ct), owner: meta.owner, repo: meta.repo, branch: meta.branch };
    });
  }
  function open(vault, id, pw) {
    return derive(id, pw, b64d(vault.salt), vault.iter).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(vault.iv) }, key, b64d(vault.ct));
    }).then(function (pt) { return new TextDecoder().decode(pt); });
  }

  /* ---------- vault file on GitHub ---------- */
  function vaultSource(v) {
    return "/* Encrypted admin login. Safe to be public: it cannot be opened without your login ID and password. */\nwindow.ADMIN_VAULT = " +
      JSON.stringify(v, null, 2) + ";\n";
  }
  function gh(s, path, opts) {
    opts = opts || {};
    opts.headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + s.token, "X-GitHub-Api-Version": "2022-11-28" };
    return fetch("https://api.github.com/repos/" + s.owner + "/" + s.repo + path, opts).then(function (r) {
      if (r.ok || (opts.allow404 && r.status === 404)) return r;
      return r.json().catch(function () { return {}; }).then(function (j) {
        var m = j.message || ("HTTP " + r.status);
        if (r.status === 401) m = "GitHub rejected the token (401). Check it is correct and has not expired.";
        if (r.status === 404) m = "Repo or branch not found (404). Check the username, repo name and branch, and that the token can access the repo.";
        if (r.status === 403 || r.status === 422) m = "GitHub refused the change (" + r.status + "). The token needs 'Contents: Read and write' on this repo. " + (j.message || "");
        throw new Error(m);
      });
    });
  }
  function saveVault(s, vault) {
    var path = "/contents/vault.js";
    return gh(s, path + "?ref=" + encodeURIComponent(s.branch), { allow404: true }).then(function (r) {
      return r.status === 404 ? null : r.json();
    }).then(function (cur) {
      var body = { message: "Update admin login", content: btoa(unescape(encodeURIComponent(vaultSource(vault)))), branch: s.branch };
      if (cur && cur.sha) body.sha = cur.sha;
      return gh(s, path, { method: "PUT", body: JSON.stringify(body) });
    });
  }
  function loadVault() {
    return new Promise(function (res) {
      try { delete window.ADMIN_VAULT; } catch (e) { window.ADMIN_VAULT = undefined; }
      var s = document.createElement("script");
      s.src = "vault.js?t=" + Date.now();   // cache-buster so a fresh password always applies
      s.onload = function () { res(window.ADMIN_VAULT && window.ADMIN_VAULT.ct ? window.ADMIN_VAULT : null); };
      s.onerror = function () { res(null); };
      document.head.appendChild(s);
    });
  }

  /* ---------- session ---------- */
  function getSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SKEY) || "null");
      if (s && s.token && Date.now() - s.ts < IDLE_MS) return s;
    } catch (e) {}
    return null;
  }
  function setSession(s) { s.ts = Date.now(); try { sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { sessionStorage.removeItem(SKEY); } catch (e) {} }
  function touch() {
    var now = Date.now();
    if (now - lastTouch < 10000) return;
    lastTouch = now;
    var s = getSession(); if (s) setSession(s);
  }
  function logout() { clearSession(); location.reload(); }
  function startIdle() {
    ["click", "keydown", "pointermove", "scroll"].forEach(function (ev) { addEventListener(ev, touch, { passive: true }); });
    idleTimer = setInterval(function () {
      var s = null; try { s = JSON.parse(sessionStorage.getItem(SKEY) || "null"); } catch (e) {}
      if (!s) { logout(); return; }
      if (Date.now() - s.ts > IDLE_MS) {
        if (hooks.canLock()) logout();   // never discard unsaved work
      }
    }, 20000);
  }

  /* ---------- brute-force slow-down (cosmetic; the real protection is the encryption) ---------- */
  function failState() { try { return JSON.parse(localStorage.getItem(FKEY) || "{}"); } catch (e) { return {}; } }
  function setFail(f) { try { localStorage.setItem(FKEY, JSON.stringify(f)); } catch (e) {} }

  /* ---------- UI ---------- */
  function field(label, input) { return el("label", { class: "f" }, [el("span", { class: "l" }, label), input]); }
  function shell(title, sub, kids) {
    var g = $("gate"); g.textContent = "";
    g.appendChild(el("div", { class: "gate-card" }, [
      el("div", { class: "gate-brand" }, ["Admin", el("span", null, "."), el("small", null, " jubayer.bond")]),
      el("h1", null, title), el("p", { class: "hint" }, sub)
    ].concat(kids)));
  }
  function unlock(s) {
    setSession(s);
    document.body.classList.remove("locked");
    $("gate").textContent = "";
    startIdle();
    onLogin(s);
  }

  function showLogin(vault) {
    var id = el("input", { type: "text", name: "username", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true });
    var pw = el("input", { type: "password", name: "password", autocomplete: "current-password", required: true });
    var msg = el("p", { class: "gate-msg" });
    var btn = el("button", { class: "btn primary wide", type: "submit" }, "Log in");
    var form = el("form", { class: "gate-form" }, [field("Login ID", id), field("Password", pw), msg, btn]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = failState(), now = Date.now();
      if (f.until && now < f.until) { msg.textContent = "Too many wrong attempts. Try again in " + Math.ceil((f.until - now) / 1000) + " seconds."; return; }
      btn.disabled = true; btn.textContent = "Checking…"; msg.textContent = "";
      open(vault, id.value, pw.value).then(function (token) {
        setFail({});
        unlock({ token: token, owner: vault.owner, repo: vault.repo, branch: vault.branch });
      }).catch(function (err) {
        if (err && /HTTPS/.test(err.message)) { msg.textContent = err.message; }
        else {
          var n = (f.n || 0) + 1, wait = n >= 5 ? Math.min(900, 30 * Math.pow(2, n - 5)) : 0;
          setFail({ n: n, until: wait ? Date.now() + wait * 1000 : 0 });
          msg.textContent = "Wrong login ID or password." + (wait ? " Locked for " + wait + " seconds." : "");
        }
        pw.value = "";
      }).then(function () { btn.disabled = false; btn.textContent = "Log in"; });
    });
    shell("Admin login", "Enter your login ID and password to manage the site.", [form]);
    id.focus();
  }

  function showSetup() {
    var o = el("input", { type: "text", value: "JubayerExpress", autocomplete: "off", required: true });
    var r = el("input", { type: "text", value: "portfolio", autocomplete: "off", required: true });
    var b = el("input", { type: "text", value: "main", autocomplete: "off", required: true });
    var t = el("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…", required: true });
    var id = el("input", { type: "text", name: "username", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true });
    var pw = el("input", { type: "password", name: "new-password", autocomplete: "new-password", required: true });
    var pw2 = el("input", { type: "password", autocomplete: "new-password", required: true });
    var msg = el("p", { class: "gate-msg" });
    var btn = el("button", { class: "btn primary wide", type: "submit" }, "Create login");
    var form = el("form", { class: "gate-form" }, [
      el("div", { class: "gate-two" }, [field("GitHub username", o), field("Repository", r)]),
      field("Branch", b),
      field("GitHub token (used once, then stored encrypted)", t),
      el("hr"),
      field("Choose a login ID", id),
      field("Choose a password (10+ characters)", pw),
      field("Repeat password", pw2),
      msg, btn
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.textContent = "";
      if (norm(id.value).length < 3) { msg.textContent = "Login ID must be at least 3 characters."; return; }
      if (pw.value.length < 10) { msg.textContent = "Password must be at least 10 characters."; return; }
      if (pw.value !== pw2.value) { msg.textContent = "The two passwords do not match."; return; }
      var s = { owner: o.value.trim(), repo: r.value.trim(), branch: b.value.trim() || "main", token: t.value.trim() };
      btn.disabled = true; btn.textContent = "Creating…";
      gh(s, "/contents/content.js?ref=" + encodeURIComponent(s.branch)).then(function () {
        return seal(id.value, pw.value, s.token, s);
      }).then(function (vault) { return saveVault(s, vault); }).then(function () {
        setFail({});
        unlock(s);
      }).catch(function (err) {
        msg.textContent = err.message; btn.disabled = false; btn.textContent = "Create login";
      });
    });
    shell("Set up admin login", "One-time setup. Your GitHub token is encrypted with your ID and password and saved in your repo as vault.js. After this, you only ever type the ID and password.", [form]);
    o.focus();
  }

  /* ---------- public API ---------- */
  window.AdminAuth = {
    start: function (cb, opts) {
      onLogin = cb; if (opts && opts.canLock) hooks.canLock = opts.canLock;
      var s = getSession();
      if (s) { unlock(s); return; }
      $("gate").appendChild(el("p", { class: "hint", style: "text-align:center" }, "Loading…"));
      loadVault().then(function (v) { if (v) showLogin(v); else showSetup(); });
    },
    logout: logout,
    /* Change ID/password (and optionally replace the GitHub token). s = current session. */
    changeLogin: function (s, id, pw, newToken) {
      var token = newToken || s.token;
      var cur = { owner: s.owner, repo: s.repo, branch: s.branch, token: token };
      return seal(id, pw, token, cur).then(function (vault) { return saveVault(cur, vault); }).then(function () {
        setSession(cur);
        return cur;
      });
    },
    session: getSession
  };
})();
