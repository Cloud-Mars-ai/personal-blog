/* ==========================================================================
   Personal Blog — 伪 3D 头部连续旋转（帧序列 crossfade 插值）
   - 9 帧对称角度（-60° ~ +60°，15° 间隔）
   - 鼠标 X → 目标角度，缓动逼近，相邻帧交叉淡入淡出
   - 叠加轻微 rotateY / translateX 视差，形成连续转身感
   - 2D / 3D 模式切换（2D = 静态图 + 像素动画）
   ========================================================================== */
(function () {
  "use strict";

  var portrait = document.querySelector("[data-portrait]");
  if (!portrait) return;

  var d3 = portrait.querySelector("[data-portrait-3d]");
  var frames = Array.prototype.slice.call(portrait.querySelectorAll("[data-head]"));
  if (!d3 || frames.length < 2) return;

  // 按角度排序
  frames.sort(function (a, b) {
    return (+a.getAttribute("data-head")) - (+b.getAttribute("data-head"));
  });
  var angles = frames.map(function (f) { return +f.getAttribute("data-head"); });
  var MIN = angles[0], MAX = angles[angles.length - 1];

  var btns = portrait.querySelectorAll("[data-mode]");
  var mode = "2d";

  // 状态
  var target = 0;   // 目标角度
  var current = 0;  // 当前（平滑）角度
  var active = false;
  var raf = 0;

  function setMode(m) {
    mode = m;
    portrait.classList.toggle("mode-3d", m === "3d");
    portrait.classList.toggle("mode-2d", m === "2d");
    btns.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === m);
      b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m));
    });
    if (m === "3d") {
      target = 0; current = 0;
      apply(0);
    } else {
      // 切回 2D：让像素动画重采样
      window.dispatchEvent(new Event("resize"));
    }
    try { localStorage.setItem("portrait-mode", m); } catch (e) {}
  }

  // 依据角度设置各帧透明度（相邻两帧 crossfade）
  function apply(a) {
    var t = Math.max(MIN, Math.min(MAX, a));
    var i = 0;
    while (i < angles.length - 1 && t > angles[i + 1]) i++;
    var lo = angles[i], hi = angles[i + 1] || angles[i];
    var w = (hi - lo) === 0 ? 0 : (t - lo) / (hi - lo);
    frames.forEach(function (f, idx) {
      var o = 0;
      if (idx === i) o = 1 - w;
      if (idx === i + 1) o = w;
      f.style.opacity = o.toFixed(3);
      // 轻微透视补偿：越侧脸越窄 + 水平视差
      var ang = angles[idx];
      var k = Math.abs(ang) / 60;
      f.style.transform = "translateX(" + (ang * -0.02) + "px) rotateY(" + (ang * 0.25) + "deg)";
    });
  }

  function loop() {
    current += (target - current) * 0.18;
    if (Math.abs(target - current) < 0.05) current = target;
    apply(current);
    if (Math.abs(target - current) > 0.05 || active) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  }

  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  function toAngle(clientX) {
    var r = d3.getBoundingClientRect();
    var x = (clientX - r.left) / Math.max(1, r.width); // 0..1
    return (x - 0.5) * 2 * MAX; // -MAX .. +MAX
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    portrait.addEventListener("pointermove", function (e) {
      if (mode !== "3d") return;
      active = true;
      target = toAngle(e.clientX);
      kick();
    });
    portrait.addEventListener("pointerleave", function () {
      if (mode !== "3d") return;
      active = false;
      target = 0;
      kick();
    });
  } else {
    portrait.addEventListener("touchmove", function (e) {
      if (mode !== "3d") return;
      active = true;
      target = toAngle(e.touches[0].clientX);
      kick();
    }, { passive: true });
    portrait.addEventListener("touchend", function () {
      active = false; target = 0; kick();
    });
  }

  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      setMode(b.getAttribute("data-mode"));
    });
  });

  // 记忆上次模式（默认 2d）
  var saved = "2d";
  try { saved = localStorage.getItem("portrait-mode") || "2d"; } catch (e) {}
  setMode(saved);
})();
