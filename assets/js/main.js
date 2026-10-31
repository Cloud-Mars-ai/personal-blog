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
      { t: "隐私与条款", d: "数据收集、本地存储与内容使用边界", h: "privacy.html", k: "privacy 隐私 条款" },
      { t: "项目", d: "AI 应用、本地桌面产品与企业系统案例", h: "projects.html", k: "projects 项目" },
      { t: "获奖与荣誉", d: "竞赛获奖、奖学金与志愿服务荣誉", h: "awards.html", k: "awards 获奖 荣誉 竞赛 奖学金" },
      { t: "兴趣爱好", d: "运动、关注的 UP 主、书籍与音乐", h: "hobby.html", k: "hobby 兴趣 爱好 运动 up主 书籍 歌手" },
      { t: "文档知识问答系统", d: "端到端 RAG 系统", h: "projects.html", k: "RAG 知识问答 document QA" },
      { t: "多轮任务型对话系统", d: "Agent 与 MCP 协同", h: "projects.html", k: "Agent MCP 对话 dialogue" },
      { t: "栖屿 · 桌面个人工作站", d: "本地优先跨平台工作台", h: "projects.html", k: "本地 桌面 Tauri workstation" },
      { t: "轻量 ERP 管理系统", d: "面向中小团队的企业系统", h: "projects.html", k: "ERP 系统" },
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
    /* 招手循环：完整动作（助跑→前滚翻→落地站稳）只播放一遍，
       之后在 4.2s–7.2s 之间无缝循环——该区间恰好 3 个完整挥手周期（1s/次），
       首尾姿态一致（手臂放下），循环无跳变。JS 接管 loop；无 JS 时保持 HTML loop 兜底。 */
    var WAVE_FROM = 5.85, WAVE_TO = 7.85;
    var waveLoop = function () {
      if (entryVideo.currentTime >= WAVE_TO) {
        try { entryVideo.currentTime = WAVE_FROM; } catch (e) {}
      }
    };
    try { entryVideo.loop = false; } catch (e) {}
    if (typeof entryVideo.requestVideoFrameCallback === "function") {
      var onVideoFrame = function () { waveLoop(); entryVideo.requestVideoFrameCallback(onVideoFrame); };
      entryVideo.requestVideoFrameCallback(onVideoFrame);
    } else {
      entryVideo.addEventListener("timeupdate", waveLoop);
    }
    if (entryVideo.readyState >= 2) kick();
    entryVideo.addEventListener("loadeddata", kick);
    entryVideo.addEventListener("canplay", kick);
    /* 浏览器往返（bfcache）恢复时重新播放，保证每次刷新/返回都能看到展示页 */
    window.addEventListener("pageshow", replay);
    /* 严格自动播放策略（如微信内置浏览器）：首次触摸/点击即启动 */
    var onFirstTouch = function () { kick(); window.removeEventListener("touchstart", onFirstTouch); window.removeEventListener("click", onFirstTouch); };
    window.addEventListener("touchstart", onFirstTouch, { passive: true });
    window.addEventListener("click", onFirstTouch);
    /* 卡顿/被策略暂停时自动恢复（进入页无暂停控件）；
       若播放到结尾（循环逻辑未接住），拉回招手段继续循环，绝不重播完整动作 */
    entryVideo.addEventListener("stalled", kick);
    entryVideo.addEventListener("pause", function () {
      if (!entryVideo.ended) { kick(); return; }
      try { entryVideo.currentTime = WAVE_FROM; } catch (e) {}
      kick();
    });
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
    ".index-hero, .listing-section, .award-group, .project-card, .up-card, .about-layout, .resume-layout, .resume-doc, .hobby-group, .editorial-section, .resume-project, .timeline-entry, .post-card"
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
          el.textContent = String(Math.round(target * eased)).padStart(2, "0");
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    countEls.forEach(function (el) { el.textContent = "0"; cio.observe(el); });
  }

  /* ==========================================================================
     第18轮 · 高级特效层（自定义光标 / 磁性 / 视差 / hero 倾斜 / 揭纸 / 逐字进场 / 徽章）
     ========================================================================== */
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* —— 统一 rAF ticker（环跟随 / 磁性 / 视差 / hero 倾斜共用；空闲自停） —— */
  var tickerFns = [];
  var tickerOn = false;
  var runTicker = function () {
    var alive = false;
    for (var i = 0; i < tickerFns.length; i++) { if (tickerFns[i]()) alive = true; }
    if (alive) requestAnimationFrame(runTicker); else tickerOn = false;
  };
  var kickTicker = function () { if (!tickerOn) { tickerOn = true; requestAnimationFrame(runTicker); } };

  /* —— A. 自定义光标（dot 即时 + ring 延迟跟随，hover 可点元素放大） —— */
  var cursorRing = null;
  if (finePointer && !reduced && !document.body.classList.contains("entry-body")) {
    var cursorDot = document.createElement("div");
    cursorDot.className = "cursor-dot";
    cursorDot.setAttribute("aria-hidden", "true");
    cursorRing = document.createElement("div");
    cursorRing.className = "cursor-ring";
    cursorRing.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorRing);
    var curX = -100, curY = -100, ringX = -100, ringY = -100;
    window.addEventListener("pointermove", function (e) {
      curX = e.clientX; curY = e.clientY;
      cursorDot.style.transform = "translate(" + curX + "px," + curY + "px)";
      var hot = e.target && e.target.closest
        ? e.target.closest("a, button, summary, [data-award], input, .tilt-card")
        : null;
      cursorRing.classList.toggle("is-hover", !!hot);
      kickTicker();
    }, { passive: true });
    document.addEventListener("mouseleave", function () {
      cursorDot.style.opacity = "0"; cursorRing.style.opacity = "0";
    });
    document.addEventListener("mouseenter", function () {
      cursorDot.style.opacity = ""; cursorRing.style.opacity = "";
    });
    tickerFns.push(function () {
      var dx = curX - ringX, dy = curY - ringY;
      if (Math.abs(dx) < .12 && Math.abs(dy) < .12) {
        ringX = curX; ringY = curY;
        cursorRing.style.transform = "translate(" + ringX + "px," + ringY + "px)";
        return false;
      }
      ringX += dx * .16; ringY += dy * .16;
      cursorRing.style.transform = "translate(" + ringX.toFixed(1) + "px," + ringY.toFixed(1) + "px)";
      return true;
    });
  }

  /* —— B. 磁性悬停（导航 / 按钮 / 品牌名 / 主题开关等，松手弹回） —— */
  if (finePointer && !reduced) {
    document.querySelectorAll(
      ".desktop-nav a, .mobile-menu nav a, .button, .brand-name, .theme-toggle, .resume-link, .footer-links a, .editorial-actions a, [data-backtop], [data-lang-toggle], [data-open-search]"
    ).forEach(function (el) {
      var st = { tx: 0, ty: 0, cx: 0, cy: 0 };
      el.setAttribute("data-magnetic", "");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
        var py = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
        st.tx = px * 4.5; st.ty = py * 3.5;
        kickTicker();
      });
      el.addEventListener("pointerleave", function () { st.tx = 0; st.ty = 0; kickTicker(); });
      tickerFns.push(function () {
        var dx = st.tx - st.cx, dy = st.ty - st.cy;
        if (Math.abs(dx) < .02 && Math.abs(dy) < .02) {
          if (st.cx === 0 && st.cy === 0) { el.style.transform = ""; return false; }
          st.cx = st.tx; st.cy = st.ty;
        } else {
          st.cx += dx * .2; st.cy += dy * .2;
        }
        el.style.transform = "translate(" + st.cx.toFixed(2) + "px," + st.cy.toFixed(2) + "px)";
        return true;
      });
    });
  }

  /* —— C. 滚动视差（translate 属性实现，不干扰原生 transform） —— */
  if (!reduced) {
    var PX = [
      [".cover-portrait", .06], [".editorial-hero__title", .05], [".about-monogram", .09],
      [".profile-portrait", .05], [".editorial-kicker", .03],
      [".award-thumb", .05], [".resume-doc-frame", .05], [".up-photo", .05]
    ];
    var pxItems = [];
    PX.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        el.setAttribute("data-parallax", "");
        pxItems.push({ el: el, sp: pair[1] });
      });
    });
    if (pxItems.length) {
      var pxFn = function () {
        var vh = window.innerHeight, any = false;
        for (var i = 0; i < pxItems.length; i++) {
          var it = pxItems[i], r = it.el.getBoundingClientRect();
          if (r.bottom < -120 || r.top > vh + 120) continue;
          var off = (r.top + r.height / 2 - vh / 2) * it.sp;
          it.el.style.setProperty("--py", off.toFixed(1) + "px");
          any = true;
        }
        return any;
      };
      tickerFns.push(pxFn);
      window.addEventListener("scroll", function () { kickTicker(); }, { passive: true });
      window.addEventListener("resize", function () { kickTicker(); });
      kickTicker();
    }
  }

  /* —— D. Hero 3D 指针微倾斜（整幅 hero 网格跟随鼠标） —— */
  if (finePointer && !reduced) {
    var heroGrid = document.querySelector(".editorial-hero-grid");
    if (heroGrid) {
      var hero = heroGrid.closest(".editorial-hero") || heroGrid.parentElement;
      var hs = { tx: 0, ty: 0, cx: 0, cy: 0 };
      heroGrid.classList.add("hero-tilt");
      hero.addEventListener("pointermove", function (e) {
        var r = heroGrid.getBoundingClientRect();
        hs.tx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)) * 1.6;
        hs.ty = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1)) * 1.2;
        kickTicker();
      });
      hero.addEventListener("pointerleave", function () { hs.tx = 0; hs.ty = 0; kickTicker(); });
      tickerFns.push(function () {
        var dx = hs.tx - hs.cx, dy = hs.ty - hs.cy;
        if (Math.abs(dx) < .008 && Math.abs(dy) < .008) {
          if (hs.cx === 0 && hs.cy === 0) { heroGrid.style.transform = ""; return false; }
          hs.cx = hs.tx; hs.cy = hs.ty;
        } else {
          hs.cx += dx * .12; hs.cy += dy * .12;
        }
        heroGrid.style.transform = "perspective(1400px) rotateX(" + hs.cy.toFixed(3) + "deg) rotateY(" + hs.cx.toFixed(3) + "deg)";
        return true;
      });
    }
  }

  /* —— E. 揭纸揭示（纸色覆盖层向上收起） —— */
  var wipeTargets = document.querySelectorAll(".award-thumb, .up-photo, .resume-doc-frame, .profile-avatar");
  if (wipeTargets.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      wipeTargets.forEach(function (el) { el.setAttribute("data-wipe", ""); el.classList.add("is-revealed"); });
    } else {
      var wio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-revealed");
          wio.unobserve(en.target);
        });
      }, { threshold: .1, rootMargin: "0px 0px -4% 0px" });
      wipeTargets.forEach(function (el, i) {
        el.setAttribute("data-wipe", "");
        el.style.setProperty("--wipe-delay", (i % 4) * 90 + "ms");
        wio.observe(el);
      });
    }
  }

  /* —— F. Hero 标题逐字进场（中文按字 / 西文按词；语言切换后重拆） —— */
  var WORD_RE = /[A-Za-z0-9@._'’\-]/;
  var splitTargets = document.querySelectorAll(".index-hero h1, #home-title");
  var splitTitle = function (el) {
    var unitIdx = 0;
    var build = function (nodes) {
      var frag = document.createDocumentFragment();
      Array.prototype.forEach.call(nodes, function (cn) {
        if (cn.nodeType === 3) {
          var text = cn.nodeValue, buf = "";
          var flush = function () {
            if (!buf) return;
            var s = document.createElement("span");
            s.className = "split-unit";
            s.textContent = buf;
            s.style.setProperty("--char-delay", (unitIdx++ * 34) + "ms");
            frag.appendChild(s);
            buf = "";
          };
          for (var i = 0; i < text.length; i++) {
            if (WORD_RE.test(text[i])) { buf += text[i]; }
            else { flush();
              var s2 = document.createElement("span");
              s2.className = "split-unit";
              s2.textContent = text[i];
              s2.style.setProperty("--char-delay", (unitIdx++ * 34) + "ms");
              frag.appendChild(s2);
            }
          }
          flush();
        } else if (cn.nodeType === 1) {
          var clone = cn.cloneNode(true);
          if (cn.tagName !== "BR") {
            clone.classList.add("split-unit");
            clone.style.setProperty("--char-delay", (unitIdx++ * 34) + "ms");
          }
          frag.appendChild(clone);
        }
      });
      return frag;
    };
    el.setAttribute("aria-label", el.textContent);
    var frag = build(Array.prototype.slice.call(el.childNodes));
    el.textContent = "";
    el.appendChild(frag);
  };
  if (splitTargets.length && !reduced) {
    splitTargets.forEach(splitTitle);
    var playChars = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          splitTargets.forEach(function (el) { el.classList.add("is-char-in"); });
        });
      });
    };
    playChars();
    /* 语言切换：i18n 的 textContent 替换会清掉拆分节点，切换后重新拆分并重播 */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest || !t.closest("[data-lang-toggle]")) return;
      setTimeout(function () {
        splitTargets.forEach(function (el) {
          el.classList.remove("is-char-in");
          splitTitle(el);
          playChars();
        });
      }, 0);
    });
  }

  /* —— G. Hero 子元素编排（eyebrow → 标题 → 正文 → 数据行依次浮入） —— */
  var staggerTargets = document.querySelectorAll(".profile-intro, .index-hero__title, .index-hero__brief");
  staggerTargets.forEach(function (el) {
    el.classList.add("hero-stagger");
    Array.prototype.forEach.call(el.children, function (ch, i) {
      ch.style.setProperty("--hero-delay", (i * 90) + "ms");
    });
    if (!reduced) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add("is-hero-in"); });
      });
    } else {
      el.classList.add("is-hero-in");
    }
  });

  /* —— H. 滚动徽章（环形文字旋转，fixed 右下角，hero 可见时渐显） —— */
  if (!reduced) {
    var badgeHost = document.querySelector(".editorial-hero") || document.querySelector(".index-hero");
    if (badgeHost && !document.querySelector(".scroll-badge")) {
      var badge = document.createElement("div");
      badge.className = "scroll-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.innerHTML =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs><path id="scroll-badge-path" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0"></path></defs>' +
        '<g class="badge-ring"><text><textPath href="#scroll-badge-path" xlink:href="#scroll-badge-path">SCROLL TO EXPLORE · CHENYU KONG · </textPath></text></g>' +
        '<text class="badge-arrow" x="50" y="55">↓</text>' +
        '</svg>';
      document.body.appendChild(badge);
      if ("IntersectionObserver" in window) {
        var bio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            badge.classList.toggle("is-visible", en.isIntersecting);
          });
        }, { threshold: .05 });
        bio.observe(badgeHost);
      } else {
        badge.classList.add("is-visible");
      }
    }
  }

  /* —— I. Tagline reveal（B11：逐词点亮，按阅读序越过触发线） —— */
  var taglineEl = document.querySelector("[data-tagline]");
  var splitTagline = function (el) {
    var units = (el.textContent || "").match(/[A-Za-z0-9]+|\s+|[^\s]/g) || [];
    var frag = document.createDocumentFragment();
    units.forEach(function (u) {
      var s = document.createElement("span");
      s.className = "tw";
      s.textContent = u;
      frag.appendChild(s);
    });
    el.textContent = "";
    el.appendChild(frag);
  };
  var initTagline = function () {
    /* 减少动画或不支持 Observer 时不拆分，保持完整可读文本 */
    if (!taglineEl || reduced || !("IntersectionObserver" in window)) return;
    if (taglineEl.querySelector(".tw")) return;
    splitTagline(taglineEl);
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-lit"); tio.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -30% 0px" });
    taglineEl.querySelectorAll(".tw").forEach(function (s) { tio.observe(s); });
  };
  initTagline();
  /* 语言切换后 i18n 已替换文本，重新拆分并重新观察 */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest("[data-lang-toggle]")) return;
    setTimeout(initTagline, 0);
  });

  /* ---------- 返回顶部 / 年份 ---------- */
  document.querySelectorAll("[data-backtop]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  });
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
