/* ==========================================================================
   Personal Blog — 局部圆域像素扩散（轻量、仅鼠标周围生效）
   - 原图始终清晰显示；仅鼠标周围一个小圆域内做像素化扩散
   - 半径较小（~72px），圆域外保持原图不动
   - 性能优化：只绘制圆域内的少量像素块，hover 才启动动画循环
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

  var W = 0, H = 0;
  var mx = 0, my = 0;
  var R = 72;            // 目标半径（较小）
  var r = 0;             // 当前半径（平滑）
  var hover = false;
  var raf = 0;
  var last = performance.now();

  var PAPER = "#eee9df";

  function rand() {
    var r = Math.imul((Math.random() * 0xffffffff) | 0, 1274126177);
    r = Math.imul(r ^ (r >>> 13), 1274126177);
    return ((r ^ (r >>> 16)) >>> 0) / 4294967295;
  }

  function resize() {
    var rect = portrait.getBoundingClientRect();
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    off.width = Math.max(1, Math.round(W)); off.height = Math.max(1, Math.round(H));
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "high";
    octx.drawImage(source, 0, 0, off.width, off.height);
    ctx.clearRect(0, 0, W, H);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (r < 1.5) return;

    var tile = 9;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.clip();
    ctx.imageSmoothingEnabled = false;

    for (var cy = Math.floor((my - r) / tile) * tile; cy < my + r; cy += tile) {
      for (var cx = Math.floor((mx - r) / tile) * tile; cx < mx + r; cx += tile) {
        var dx = cx + tile / 2 - mx, dy = cy + tile / 2 - my;
        var d = Math.hypot(dx, dy);
        if (d > r) continue;
        var f = 1 - d / r;
        var ox = dx * 0.3 * f + (rand() - 0.5) * 7 * f;
        var oy = dy * 0.3 * f + (rand() - 0.5) * 7 * f;
        var s = 1 - f * 0.25;
        var tw = tile * s, th = tile * s;
        ctx.globalAlpha = 0.35 + 0.65 * f;
        ctx.drawImage(off, cx, cy, tile, tile, cx + ox, cy + oy, tw, th);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    r += ((hover ? R : 0) - r) * Math.min(1, dt * 10);
    if (Math.abs((hover ? R : 0) - r) < 0.5) r = hover ? R : 0;
    render();
    if (hover || r > 0.5) { raf = requestAnimationFrame(loop); }
    else { raf = 0; }
  }

  function move(e) {
    var rect = portrait.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }

  portrait.addEventListener("pointerenter", function (e) {
    hover = true; move(e);
  });
  portrait.addEventListener("pointermove", move);
  portrait.addEventListener("pointerleave", function () {
    hover = false;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  });

  (async function init() {
    if (!source.complete) await new Promise(function (res) { source.addEventListener("load", res, { once: true }); });
    try { await source.decode(); } catch (e) {}
    resize();
    portrait.classList.add("is-pixel-ready");
    new ResizeObserver(resize).observe(portrait);
  })();
})();
