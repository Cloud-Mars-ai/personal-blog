/* ==========================================================================
   Personal Blog — 交互脚本（对齐原站：vc-theme / dialog 搜索 / 筛选 / 转场）
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 主题切换（vc-theme，跟随系统） ---------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("vc-theme"); } catch (e) {}
  var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.dataset.theme = theme;

  function syncThemeLabel() {
    var cur = root.dataset.theme || "light";
    document.querySelectorAll(".theme-toggle").forEach(function (t) {
      t.setAttribute("aria-label", cur === "dark" ? "切换浅色主题" : "切换深色主题");
    });
  }
  document.querySelectorAll(".theme-toggle").forEach(function (t) {
    t.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("vc-theme", next); } catch (e) {}
      syncThemeLabel();
    });
  });
  syncThemeLabel();

  /* ---------- 标签筛选（data-filter-group） ---------- */
  document.querySelectorAll("[data-filter-group]").forEach(function (group) {
    var buttons = group.querySelectorAll("[data-filter]");
    var targetWrap = group.nextElementSibling || group.parentElement;
    var rows = targetWrap.querySelectorAll("[data-tags]") || [];
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.dataset.filter || "all";
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        rows.forEach(function (row) {
          var tags = (row.dataset.tags || "").split(",");
          row.hidden = tag !== "all" && tags.indexOf(tag) === -1;
        });
      });
    });
  });

  /* ---------- 站内搜索（dialog + 快捷键 / 与 Ctrl/Cmd+K） ---------- */
  var dialog = document.querySelector("#site-search");
  if (dialog) {
    var input = document.querySelector("#search-input");
    var statusEl = document.querySelector("#search-status");
    var results = document.querySelector("#search-results");

    var INDEX = [
      { t: "Chenyu Kong · 首页", d: "AI 应用工程师的个人主页", h: "index.html", k: "首页 cover home" },
      { t: "Profile · 个人档案", d: "编辑杂志风格的个人档案与精选项目", h: "home.html", k: "profile home 档案" },
      { t: "关于我", d: "我在做什么、实践经历、为什么写作", h: "about.html", k: "about 关于" },
      { t: "技术文章", d: "RAG、Agent、MCP、评估与本地优先工程的复盘", h: "writing.html", k: "writing 文章 article" },
      { t: "检索评估不是准确率：一套面向 RAG 的三层指标体系", d: "召回、生成与链路拆开看", h: "writing.html", k: "RAG Retrieval Evaluation 检索 评估" },
      { t: "Agent 的边界感：让模型只在该出手时出手", d: "分层意图召回与确定性路由", h: "writing.html", k: "Agent Function Calling MCP" },
      { t: "从 Excel 到系统：小团队的数据迁移与对账实践", d: "迁移与对账的 checklist", h: "writing.html", k: "SQLite FastAPI Engineering 迁移" },
      { t: "本地优先的代价：桌面应用离线同步的五个取舍", d: "本地优先桌面应用的可信边界", h: "writing.html", k: "Local-first Tauri SQLite 本地" },
      { t: "当向量库说谎：混合检索中的重排与去噪", d: "重排器、查询改写与噪声过滤", h: "writing.html", k: "RAG Retrieval Evaluation 向量" },
      { t: "项目", d: "AI 应用、本地桌面产品与企业系统案例", h: "projects.html", k: "projects 项目" },
      { t: "获奖与荣誉", d: "竞赛获奖、奖学金与志愿服务荣誉", h: "awards.html", k: "awards 获奖 荣誉 竞赛 奖学金" },
      { t: "兴趣爱好", d: "运动、关注的 UP 主、书籍与音乐", h: "hobby.html", k: "hobby 兴趣 爱好 运动 up主 书籍 歌手" },
      { t: "文档知识问答系统", d: "端到端 RAG 系统", h: "projects.html", k: "RAG 知识问答 document QA" },
      { t: "多轮任务型对话系统", d: "Agent 与 MCP 协同", h: "projects.html", k: "Agent MCP 对话 dialogue" },
      { t: "栖屿 · 桌面个人工作站", d: "本地优先跨平台工作台", h: "projects.html", k: "本地 桌面 Tauri workstation" },
      { t: "轻量 ERP 管理系统", d: "面向中小团队的企业系统", h: "projects.html", k: "ERP 系统" },
      { t: "开发记录", d: "构建、学习、发布与复盘的阶段性变化", h: "log.html", k: "log 记录" },
      { t: "简历", d: "AI 应用开发工程师 · Web 版简历", h: "resume.html", k: "resume 简历" }
    ];

    function open() {
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(function () { input && input.focus(); });
    }
    function close() { if (dialog.open) dialog.close(); }

    document.querySelectorAll("[data-open-search]").forEach(function (b) {
      b.addEventListener("click", open);
    });
    document.addEventListener("keydown", function (e) {
      var el = e.target;
      var typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape" && dialog.open) close();
    });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) close(); });
    var closeBtn = dialog.querySelector(".search-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    function render(q) {
      var query = (q || "").trim().toLowerCase();
      results.innerHTML = "";
      if (!query) {
        if (statusEl) statusEl.textContent = "输入关键词开始搜索";
        return;
      }
      var hits = INDEX.filter(function (it) {
        return (it.t + " " + it.d + " " + it.k).toLowerCase().indexOf(query) !== -1;
      }).slice(0, 8);
      if (statusEl) statusEl.textContent = hits.length ? "找到 " + hits.length + " 条结果" : "没有匹配的结果";
      hits.forEach(function (it, i) {
        var li = document.createElement("li");
        li.className = "search-result";
        var a = document.createElement("a");
        a.href = it.h;
        a.innerHTML =
          '<span class="search-result-number">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<span class="search-result-body"><strong>' + it.t + "</strong><p>" + it.d + "</p><small>" + it.h + "</small></span>" +
          '<span class="search-result-arrow">↗</span>';
        a.addEventListener("click", function () { close(); });
        li.appendChild(a);
        results.appendChild(li);
      });
    }
    input.addEventListener("input", function () { render(input.value); });
  }

  /* ---------- 进入页转场（data-enter → 渐变淡出） ---------- */
  var enter = document.querySelector("[data-enter]");
  var cover = document.querySelector("[data-cover]") || document.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (enter) {
    enter.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced) return;
      e.preventDefault();
      cover.classList.add("is-leaving");
      window.setTimeout(function () { window.location.assign(enter.href); }, 520);
    });
  }

  /* ---------- 奖状放大（lightbox） ---------- */
  var lb = document.querySelector(".award-lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    var closeLb = function () { lb.classList.remove("is-open"); };
    document.querySelectorAll("[data-award]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        lbImg.src = btn.getAttribute("data-award");
        lb.classList.add("is-open");
      });
    });
    lb.addEventListener("click", closeLb);
    var closeBtn = lb.querySelector(".award-lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", function (e) { e.stopPropagation(); closeLb(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }

  /* ---------- 进入页视频：强制自动播放 + 刷新/后退重播 ---------- */
  var entryVideo = document.querySelector(".entry-video");
  if (entryVideo) {
    var kick = function () {
      try { entryVideo.muted = true; entryVideo.defaultMuted = true; entryVideo.playsInline = true; } catch (e) {}
      var p = entryVideo.play();
      if (p && typeof p.catch === "function") p.catch(function () { /* 等待交互后重试 */ });
    };
    var replay = function () {
      try { entryVideo.currentTime = 0; } catch (e) {}
      kick();
    };
    if (entryVideo.readyState >= 2) kick();
    entryVideo.addEventListener("loadeddata", kick);
    entryVideo.addEventListener("canplay", kick);
    /* 浏览器往返（bfcache）恢复时重新播放，保证每次刷新/返回都能看到展示页 */
    window.addEventListener("pageshow", replay);
    /* 严格自动播放策略（如微信内置浏览器）：首次触摸/点击即启动 */
    var onFirstTouch = function () { kick(); window.removeEventListener("touchstart", onFirstTouch); window.removeEventListener("click", onFirstTouch); };
    window.addEventListener("touchstart", onFirstTouch, { passive: true });
    window.addEventListener("click", onFirstTouch);
    /* 卡顿/被策略暂停时自动恢复（进入页无暂停控件） */
    entryVideo.addEventListener("stalled", kick);
    entryVideo.addEventListener("pause", function () { if (!entryVideo.ended) kick(); });
  }

  /* ---------- 视觉特效：颗粒 + 进度条（JS 注入，全站生效） ---------- */
  if (!document.querySelector(".grain")) {
    var grain = document.createElement("div");
    grain.className = "grain";
    grain.setAttribute("aria-hidden", "true");
    document.body.appendChild(grain);
  }
  var progress = null;
  if (!document.body.classList.contains("entry-body") && !document.querySelector(".read-progress")) {
    progress = document.createElement("div");
    progress.className = "read-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);
  }
  var updateProgress = function () {
    if (!progress) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    progress.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)).toFixed(4) + ")";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* ---------- 滚动渐显（ IntersectionObserver ） ---------- */
  var revealTargets = document.querySelectorAll(
    ".index-hero, .listing-section, .award-group, .project-card, .up-card, .about-layout, .resume-layout, .resume-doc, .hobby-group, .editorial-section, .marquee-band, .resume-project, .timeline-entry, .post-card"
  );
  if (revealTargets.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      revealTargets.forEach(function (el) { el.setAttribute("data-reveal", ""); el.classList.add("is-revealed"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-revealed"); io.unobserve(en.target); }
        });
      }, { threshold: .08, rootMargin: "0px 0px -6% 0px" });
      revealTargets.forEach(function (el, i) {
        el.setAttribute("data-reveal", "");
        el.style.setProperty("--reveal-delay", (i % 6) * 55 + "ms");
        io.observe(el);
      });
    }
  }

  /* ---------- 卡片 3D 倾斜 + 光标光斑（仅精细指针设备） ---------- */
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".project-card, .award-card, .up-card").forEach(function (card) {
      card.classList.add("tilt-card");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        var ry = (px - .5) * 5;   /* 绕 Y 轴 */
        var rx = (.5 - py) * 4;   /* 绕 X 轴 */
        card.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- 数字计数动画 ---------- */
  var countEls = document.querySelectorAll("[data-count]");
  if (countEls.length && !reduced) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count")) || 0;
        var t0 = null;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 900);
          var eased = 1 - Math.pow(1 - k, 3);
          el.textContent = String(Math.round(target * eased)).padStart(String(target).length, "0");
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    countEls.forEach(function (el) { el.textContent = "0"; cio.observe(el); });
  }

  /* ---------- 返回顶部 / 年份 ---------- */
  document.querySelectorAll("[data-backtop]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  });
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
