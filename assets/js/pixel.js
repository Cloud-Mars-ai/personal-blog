/* ==========================================================================
   Personal Blog — 插画像素粒子动画
   移植自原站的 canvas 像素化效果：
   - 插画由像素块渲染
   - 鼠标进入 → 像素块从指针位置向外扩散（吹散）
   - 鼠标移动 → 扩散中心跟随
   - 鼠标离开 → 像素聚拢还原，3 秒后触发一次波纹脉冲
   - 仅在桌面（hover+fine pointer）且非 reduced-motion 时启用
   ========================================================================== */
(function () {
  "use strict";

  var portrait = document.querySelector("[data-portrait]");
  if (!portrait) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var source = portrait.querySelector("[data-pixel-source]");
  var canvas = portrait.querySelector("[data-pixel-canvas]");
  var ctx = canvas && canvas.getContext("2d");
  if (!source || !canvas || !ctx) return;

  var off = document.createElement("canvas");
  var octx = off.getContext("2d");

  // 尺寸与状态
  var W = 0, H = 0;          // CSS 尺寸
  var left = 0, top = 0;     // 元素位置
  var mx = 0, my = 0;        // 鼠标中心
  var tile = 7;              // 像素块尺寸
  var g = 156;               // 目标扩散半径
  var cols = 0, rows = 0;    // 块数
  var base = null;           // 每块的颜色差异（过滤透明区）
  var bx, by, bstr;          // 待绘制块的列/行/强度
  var hover = false;         // 是否悬停
  var T = -1;                // 脉冲进度（-1 无脉冲）
  var tE = 0;                // 脉冲开始时间
  var p = 0;                 // 当前半径
  var h = 0;                 // 目标半径
  var vel = 0;               // 弹簧速度
  var last = performance.now();
  var raf = 0;
  var pulseTimer = 0;

  // 确定性伪随机
  function rand(x, y, seed) {
    var r = Math.imul(x + y * 31, 374761393) ^ Math.imul(y + x * 17, 668265263);
    r = Math.imul(r ^ (r >>> 13), 1274126177);
    return ((r ^ (r >>> 16)) >>> 0) / 4294967295;
  }

  function drawFull() {
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, 0, 0, W, H);
  }

  // 脉冲波纹（T 0→1）
  function drawPulse() {
    var e = 0.9, t = 0.44;
    var n = W * e, a = H * t;
    var o = n + a;
    var lo = Math.min(0, n, a, o) - 42, hi = Math.max(0, n, a, o) + 42;
    var eased = T * T * (3 - 2 * T);
    var dist = lo + (hi - lo) * eased;
    var amp = Math.pow(Math.sin(T * Math.PI), 0.32);
    var m = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (base[r * cols + c] < 20) continue;
        var cx = (c + 0.5) * tile, cy = (r + 0.5) * tile;
        var d0 = Math.abs(cx * e + cy * t - dist);
        if (d0 >= 34) continue;
        bx[m] = c; by[m] = r; bstr[m] = Math.cos(d0 / 34 * Math.PI / 2) * amp; m++;
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for (var i = 0; i < m; i++) {
      var x = bx[i] * tile, y = by[i] * tile;
      ctx.rect(x - 0.25, y - 0.25, Math.min(tile, W - x) + 0.5, Math.min(tile, H - y) + 0.5);
    }
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    for (var j = 0; j < m; j++) {
      var cc = bx[j], rr = by[j], s = bstr[j];
      var u = cc * tile, dd = rr * tile;
      var fw = Math.min(tile, W - u), fh = Math.min(tile, H - dd);
      var midx = u + fw / 2, midy = dd + fh / 2;
      var gx = (rand(cc, rr, 8) - 0.5) * 17 * s;
      var gy = (2 + rand(cc, rr, 9) * 7) * s;
      var sc = 1 - s * (0.06 + rand(cc, rr, 10) * 0.13);
      var w2 = fw * sc, h2 = fh * sc;
      var nx = -0.44 * gx + e * gy, ny = 0.9 * gx + t * gy;
      ctx.globalAlpha = 1 - s * rand(cc, rr, 11) * 0.18;
      ctx.drawImage(off, u, dd, fw, fh, midx + nx - w2 / 2, midy + ny - h2 / 2, w2, h2);
      if (rand(cc, rr, 12) > 0.94) {
        var sc2 = 0.38;
        ctx.globalAlpha = s * 0.25;
        ctx.drawImage(off, u, dd, fw, fh, midx + nx - e * 13 - w2 * sc2 / 2, midy + ny - t * 13 - h2 * sc2 / 2, w2 * sc2, h2 * sc2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // 扩散（半径 p 内的块被挖空并随机重绘）
  function drawDisperse() {
    var e = Math.max(0, Math.floor((mx - p) / tile));
    var t2 = Math.min(Math.ceil(W / tile), Math.ceil((mx + p) / tile));
    var n = Math.max(0, Math.floor((my - p) / tile));
    var a = Math.min(Math.ceil(H / tile), Math.ceil((my + p) / tile));
    var m = 0;
    for (var r = n; r < a; r++) {
      for (var c = e; c < t2; c++) {
        var cx = (c + 0.5) * tile, cy = (r + 0.5) * tile;
        var d0 = Math.hypot(cx - mx, cy - my);
        if (d0 >= p) continue;
        bx[m] = c; by[m] = r; bstr[m] = Math.pow(1 - d0 / p, 0.72); m++;
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for (var i = 0; i < m; i++) {
      var x = bx[i] * tile, y = by[i] * tile;
      ctx.rect(x - 0.35, y - 0.35, Math.min(tile, W - x) + 0.7, Math.min(tile, H - y) + 0.7);
    }
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    for (var j = 0; j < m; j++) {
      var cc = bx[j], rr = by[j], s = bstr[j];
      var u = cc * tile, dd = rr * tile;
      var fw = Math.min(tile, W - u), fh = Math.min(tile, H - dd);
      var midx = u + fw / 2, midy = dd + fh / 2;
      var dx = midx - mx, dy = midy - my;
      var dist = Math.max(1, Math.hypot(dx, dy));
      var nx2 = dx / dist, ny2 = dy / dist;
      var offX = (3 + rand(cc, rr, 1) * 17) * s;
      var offY = (rand(cc, rr, 2) - 0.5) * 16 * s;
      var ox = nx2 * offX - ny2 * offY;
      var oy = ny2 * offX + nx2 * offY;
      var sc = 1 - s * (0.16 + rand(cc, rr, 3) * 0.24);
      var w2 = fw * sc, h2 = fh * sc;
      ctx.globalAlpha = 1 - s * rand(cc, rr, 4) * 0.2;
      ctx.drawImage(off, u, dd, fw, fh, midx + ox - w2 / 2, midy + oy - h2 / 2, w2, h2);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    if (p < 0.5) {
      drawFull();
      if (T >= 0) drawPulse();
      return;
    }
    drawDisperse();
  }

  function frame(now) {
    if (portrait.classList.contains("mode-3d")) { raf = 0; return; }
    var dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
    last = now;
    vel += (h - p) * 190 * dt;
    vel *= Math.exp(-27 * dt);
    p += vel * dt;
    if (T >= 0) {
      T = Math.min(1, (now - tE) / 1120);
      if (T >= 1) T = -1;
    }
    var settled = Math.abs(h - p) < 0.35 && Math.abs(vel) < 2;
    if (settled) { p = h; vel = 0; }
    render();
    if (!settled || T >= 0) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function schedulePulse(delay) {
    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(function () {
      if (hover || document.hidden) { schedulePulse(3000); return; }
      T = 0; tE = performance.now(); kick(); schedulePulse(3000);
    }, delay || 3000);
  }

  function resize() {
    var rect = portrait.getBoundingClientRect();
    var dpr = Math.min(1.35, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    left = rect.left; top = rect.top;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    off.width = Math.max(1, Math.round(W)); off.height = Math.max(1, Math.round(H));
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "high";
    octx.drawImage(source, 0, 0, off.width, off.height);
    tile = Math.max(6, Math.min(7, Math.round(W / 126)));
    g = Math.min(165, Math.max(138, Math.min(W, H) * 0.3));
    cols = Math.ceil(W / tile); rows = Math.ceil(H / tile);
    base = new Uint8Array(cols * rows);
    var data = octx.getImageData(0, 0, off.width, off.height).data;
    var pidx = (Math.min(off.height - 1, 8) * off.width + Math.min(off.width - 1, 8)) * 4;
    var br = data[pidx], bg = data[pidx + 1], bb = data[pidx + 2];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var sx = Math.min(off.width - 1, Math.round((c + 0.5) * tile));
        var sy = Math.min(off.height - 1, Math.round((r + 0.5) * tile));
        var idx = (sy * off.width + sx) * 4;
        var diff = Math.max(Math.abs(data[idx] - br), Math.abs(data[idx + 1] - bg), Math.abs(data[idx + 2] - bb));
        base[r * cols + c] = diff;
      }
    }
    var cap = Math.max(Math.ceil(Math.pow(g * 2 / tile + 3, 2)), cols * rows);
    bx = new Uint16Array(cap); by = new Uint16Array(cap); bstr = new Float32Array(cap);
    p = 0; vel = 0;
    render();
  }

  portrait.addEventListener("pointerenter", function (e) {
    var rect = portrait.getBoundingClientRect();
    mx = Math.min(W, Math.max(0, e.clientX - rect.left));
    my = Math.min(H, Math.max(0, e.clientY - rect.top));
    hover = true; T = -1; window.clearTimeout(pulseTimer);
    h = g; kick();
  });
  portrait.addEventListener("pointermove", function (e) {
    var rect = portrait.getBoundingClientRect();
    mx = Math.min(W, Math.max(0, e.clientX - rect.left));
    my = Math.min(H, Math.max(0, e.clientY - rect.top));
    kick();
  });
  portrait.addEventListener("pointerleave", function () {
    hover = false; h = 0; kick(); schedulePulse(3000);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { T = -1; window.clearTimeout(pulseTimer); }
    else if (!hover) schedulePulse(3000);
  });

  (async function init() {
    if (!source.complete) await new Promise(function (res) { source.addEventListener("load", res, { once: true }); });
    try { await source.decode(); } catch (e) {}
    resize();
    portrait.classList.add("is-pixel-ready");
    new ResizeObserver(resize).observe(portrait);
    schedulePulse(3000);
  })();
})();
