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

  /* ---------- 封面转场（data-enter → is-leaving） ---------- */
  var enter = document.querySelector("[data-enter]");
  var cover = document.querySelector("[data-cover]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (enter && cover) {
    enter.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced) return;
      e.preventDefault();
      cover.classList.add("is-leaving");
      window.setTimeout(function () { window.location.assign(enter.href); }, 520);
    });
  }

  /* ---------- 返回顶部 / 年份 ---------- */
  document.querySelectorAll("[data-backtop]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  });
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
