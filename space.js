/* Space theme engine: starfield, warp, shooting stars, planets, cursor comet, HUD, rocket.
   Pure vanilla JS, no dependencies. Respects prefers-reduced-motion. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer:fine)").matches;
  var root = document.documentElement;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var rnd = Math.random;

  /* ---------------- Starfield canvas ---------------- */
  var cv = $("space"), ctx = cv.getContext("2d");
  var W = 0, H = 0, stars = [], shooters = [];
  var warp = reduce ? 0 : 1;            // 1 = hyperspace, decays to 0 on load
  var scrollY = window.scrollY, vel = 0, lastY = scrollY;
  var mx = 0, my = 0, tmx = 0, tmy = 0; // smoothed mouse offset (-.5..+.5)
  var tints = ["255,255,255", "190,210,255", "255,235,200", "170,230,255", "255,200,235"];

  function build() {
    W = cv.width = Math.floor(innerWidth * DPR);
    H = cv.height = Math.floor(innerHeight * DPR);
    var n = Math.min(260, Math.floor(innerWidth * innerHeight / 5200));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = 0.15 + rnd() * 0.85;
      stars.push({
        x: rnd(), y: rnd(), z: z,
        r: (0.4 + rnd() * 1.1) * z * DPR + 0.3,
        ph: rnd() * 6.28, sp: 0.6 + rnd() * 2.2,
        c: tints[(rnd() * tints.length) | 0],
        flare: rnd() < 0.07
      });
    }
  }
  addEventListener("resize", function () { build(); if (reduce) frame(0); });
  build();

  function spawnShooter() {
    var dir = rnd() < 0.5 ? 1 : -1;               // 1 = travels left→right
    var sp = (9 + rnd() * 7) * DPR, ang = 0.55 + rnd() * 0.35; // radians below horizontal
    shooters.push({
      x: rnd() * W * 0.8 + W * 0.1, y: rnd() * H * 0.4,
      vx: Math.cos(ang) * sp * dir, vy: Math.sin(ang) * sp,
      life: 1, len: 90 + rnd() * 120
    });
  }
  var nextShoot = 1800;

  var t0 = performance.now(), last = t0;
  function frame(now) {
    var raw = now - last, dt = Math.min(48, raw); last = now;
    var t = (now - t0) / 1000;
    var light = root.dataset.theme === "light";

    // physics
    var dScroll = scrollY - lastY; lastY = scrollY;
    vel += (dScroll - vel) * (1 - Math.exp(-raw / 90));
    if (Math.abs(dScroll) < 0.5) vel *= Math.exp(-raw / 120);
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    if (warp > 0) warp = Math.max(0, warp - raw / 2400);
    var w = warp * warp;                  // ease-out deceleration

    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;
    var streakV = (Math.abs(vel) < 1.5 ? 0 : Math.max(-40, Math.min(40, vel))) * DPR;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var px = s.x * W + mx * s.z * 46 * DPR;
      var py = (((s.y * H - scrollY * DPR * s.z * 0.22 + my * s.z * 30 * DPR) % H) + H) % H;
      var tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      var a = (0.35 + 0.65 * s.z) * tw;
      var col = light ? "70,70,150" : s.c;
      ctx.strokeStyle = "rgba(" + col + "," + (a * (light ? 0.55 : 1)) + ")";
      ctx.fillStyle = ctx.strokeStyle;

      var dx = px - cx, dy = py - cy;
      var wl = w * s.z * 0.55;            // warp streak length factor
      var sv = streakV * s.z * 0.9;

      if (wl > 0.01 || Math.abs(sv) > 3) {
        ctx.lineWidth = s.r * (1 + w * 0.6);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - dx * wl, py - dy * wl - sv * 1.1);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, s.r, 0, 6.283); ctx.fill();
      }
      if (s.flare && !light && w < 0.2) {
        var f = s.r * (3.5 + 2 * tw);
        ctx.lineWidth = 0.7 * DPR;
        ctx.beginPath();
        ctx.moveTo(px - f, py); ctx.lineTo(px + f, py);
        ctx.moveTo(px, py - f); ctx.lineTo(px, py + f);
        ctx.stroke();
      }
    }

    // shooting stars
    if (!reduce) {
      nextShoot -= dt;
      if (nextShoot <= 0 && !light) { spawnShooter(); nextShoot = 2800 + rnd() * 5200; }
      for (var k = shooters.length - 1; k >= 0; k--) {
        var m = shooters[k];
        m.x += m.vx; m.y += m.vy; m.life -= 0.012;
        var mag = Math.hypot(m.vx, m.vy);
        var tx = m.x - (m.vx / mag) * m.len * DPR, ty = m.y - (m.vy / mag) * m.len * DPR;
        var g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, "rgba(255,255,255," + Math.max(0, m.life) + ")");
        g.addColorStop(0.3, "rgba(120,220,255," + Math.max(0, m.life) * 0.5 + ")");
        g.addColorStop(1, "rgba(124,92,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.8 * DPR; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
        if (m.life <= 0 || m.x < -200 || m.x > W + 200 || m.y > H + 200) shooters.splice(k, 1);
      }
    }

    updateWorld();
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener("scroll", function () { scrollY = window.scrollY; }, { passive: true });
  addEventListener("pointermove", function (e) {
    tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  /* ---------------- Planets (injected, parallax on scroll) ---------------- */
  var planets = [];
  function planet(sectionId, cls, speed, spin, ringColor) {
    var sec = $(sectionId); if (!sec) return;
    var el = document.createElement("div");
    el.className = "planet " + cls + (spin ? " spin" : "");
    if (ringColor) el.style.setProperty("--rc", ringColor);
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = (ringColor || cls === "pl-gas" ? '<i class="ring back"></i>' : "") + '<b class="globe"></b>' +
                   (ringColor || cls === "pl-gas" ? '<i class="ring front"></i>' : "");
    sec.appendChild(el);
    planets.push({ el: el, sec: sec, speed: speed });
  }
  planet("books", "pl-gas", 0.18, true);
  planet("courses", "pl-ice", -0.14, false, "rgba(160,235,255,.35)");
  planet("about", "pl-moon", 0.1, false);
  planet("blog", "pl-red", -0.2, false);

  var contact = $("contact");
  if (contact) {
    contact.classList.add("contact-sec");
    var hz = document.createElement("div"); hz.className = "horizon"; hz.setAttribute("aria-hidden", "true");
    var as = document.createElement("div"); as.className = "astro"; as.textContent = "🧑‍🚀"; as.setAttribute("aria-hidden", "true");
    contact.appendChild(hz); contact.appendChild(as);
  }

  function updateWorld() {
    if (!reduce) {
      for (var i = 0; i < planets.length; i++) {
        var p = planets[i], r = p.sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        var off = (r.top + r.height / 2 - innerHeight / 2) * p.speed;
        p.el.style.translate = "0 " + off.toFixed(1) + "px";
      }
    }
    hudTick();
  }

  /* ---------------- HUD ---------------- */
  var hudAlt = $("hudAlt"), hudSec = $("hudSec"), hudClock = $("hudClock");
  var secIds = ["home", "about", "books", "research", "courses", "blog", "contact"];
  var secEls = secIds.map($), shownAlt = 0, clockT = 0;
  function hudTick() {
    if (!hudAlt) return;
    var target = Math.round(scrollY * 1.7);
    shownAlt += (target - shownAlt) * 0.15;
    hudAlt.textContent = Math.round(shownAlt).toLocaleString("en-US");
    var idx = 0;
    for (var i = 0; i < secEls.length; i++) {
      if (secEls[i] && secEls[i].getBoundingClientRect().top < innerHeight * 0.45) idx = i;
    }
    var nm = secIds[idx].toUpperCase();
    if (hudSec.textContent !== nm) hudSec.textContent = nm;
    var now = Date.now();
    if (now - clockT > 1000) {
      clockT = now;
      try {
        hudClock.textContent = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " DAC";
      } catch (e) { hudClock.textContent = new Date().toLocaleTimeString("en-GB"); }
    }
  }

  /* ---------------- FX canvas: comet trail + click bursts ---------------- */
  var fx = $("fx"), fctx = fx.getContext("2d"), parts = [], running = false, FW, FH;
  function fxSize() { FW = fx.width = Math.floor(innerWidth * DPR); FH = fx.height = Math.floor(innerHeight * DPR); }
  addEventListener("resize", fxSize); fxSize();
  var palette = ["#7c5cff", "#22d3ee", "#ff6bcb", "#c6ff3d", "#ffffff"];

  function emit(x, y, o) {
    parts.push({
      x: x * DPR, y: y * DPR, vx: (o.vx || 0) * DPR, vy: (o.vy || 0) * DPR,
      life: 1, decay: o.decay || 0.03, size: (o.size || 2) * DPR,
      c: o.c || palette[(rnd() * palette.length) | 0], star: !!o.star, g: o.g || 0
    });
    if (!running) { running = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop() {
    fctx.clearRect(0, 0, FW, FH);
    fctx.globalCompositeOperation = "lighter";
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      fctx.globalAlpha = Math.max(0, p.life);
      fctx.fillStyle = p.c; fctx.strokeStyle = p.c;
      var sz = p.size * (p.star ? 1 : p.life);
      if (p.star) {
        fctx.lineWidth = 1.4 * DPR;
        fctx.beginPath();
        fctx.moveTo(p.x - sz * 2.2, p.y); fctx.lineTo(p.x + sz * 2.2, p.y);
        fctx.moveTo(p.x, p.y - sz * 2.2); fctx.lineTo(p.x, p.y + sz * 2.2);
        fctx.stroke();
      } else {
        fctx.beginPath(); fctx.arc(p.x, p.y, Math.max(0.2, sz), 0, 6.283); fctx.fill();
      }
    }
    fctx.globalAlpha = 1; fctx.globalCompositeOperation = "source-over";
    if (parts.length) requestAnimationFrame(fxLoop); else { running = false; fctx.clearRect(0, 0, FW, FH); }
  }

  if (!reduce) {
    var lx = -1, ly = -1;
    if (fine) addEventListener("pointermove", function (e) {
      if (lx >= 0 && Math.hypot(e.clientX - lx, e.clientY - ly) < 9) return;
      lx = e.clientX; ly = e.clientY;
      emit(lx + (rnd() - 0.5) * 6, ly + (rnd() - 0.5) * 6, { vx: (rnd() - 0.5) * 0.7, vy: (rnd() - 0.5) * 0.7 + 0.2, size: 1.2 + rnd() * 1.6, decay: 0.035 });
    }, { passive: true });

    addEventListener("pointerdown", function (e) {
      for (var i = 0; i < 22; i++) {
        var a = rnd() * 6.283, sp = 1.2 + rnd() * 4.2;
        emit(e.clientX, e.clientY, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 1.4 + rnd() * 1.8, decay: 0.022 + rnd() * 0.015, star: i % 3 === 0 });
      }
    });
  }

  /* ---------------- Brand click = hyperspace jump ---------------- */
  var brand = $("brand");
  if (brand) brand.addEventListener("click", function () { if (!reduce) warp = 1; });

  /* ---------------- Rocket launch on "Say hello" ---------------- */
  var mail = $("mailBtn");
  if (mail && !reduce) mail.addEventListener("click", function () {
    var b = mail.getBoundingClientRect();
    var r = document.createElement("span");
    r.className = "rocket"; r.textContent = "🚀";
    r.style.left = (b.left + b.width / 2) + "px"; r.style.top = (b.top + b.height / 2) + "px";
    document.body.appendChild(r);
    var n = 0, bx = b.left + b.width / 2, by = b.top + b.height / 2;
    var iv = setInterval(function () {
      n++;
      for (var i = 0; i < 4; i++) {
        emit(bx + (rnd() - 0.5) * 16, by + 16 + n * 6 * (n / 8), { vx: (rnd() - 0.5) * 1.6, vy: 1 + rnd() * 2.4, size: 2 + rnd() * 2.4, decay: 0.03, c: ["#ff9a3c", "#ffd166", "#ff6bcb", "#fff"][(rnd() * 4) | 0] });
      }
      if (n > 16) clearInterval(iv);
    }, 40);
    setTimeout(function () { r.remove(); }, 1700);
  });

  /* ---------------- Finish reveals: drop the stagger delay so hover feels snappy ---------------- */
  document.addEventListener("transitionend", function (e) {
    var el = e.target;
    if (e.propertyName === "opacity" && el.classList && el.classList.contains("reveal") && el.classList.contains("in")) {
      el.classList.add("done");
    }
  });

  /* kick off */
  if (reduce) frame(performance.now()); else requestAnimationFrame(frame);
})();
