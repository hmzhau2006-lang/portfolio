/* مشترك بين كل الصفحات: البيانات، الوضع الفاتح/الداكن، الستارة بين الصفحات */
(function () {
  "use strict";

  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  window.__reduce = reduce;

  /* ---------- البيانات ---------- */
  const SITE = window.SITE || {};
  $$("[data-site]").forEach((el) => {
    const k = el.dataset.site;
    if (k === "email-link") el.href = "mailto:" + SITE.email;
    else if (["whatsapp", "linkedin", "cv"].includes(k)) el.href = SITE[k];
    else el.textContent = SITE[k] || "";
  });
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- التنقل ---------- */
  const page = document.body.dataset.page;
  $$(".nav__links a").forEach((a) => {
    if (a.dataset.page === page) a.setAttribute("aria-current", "page");
  });
  const nav = $(".nav");
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", scrollY > 30);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- الوضع ---------- */
  const themeBtn = $(".theme-btn");
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch (e) {}
    dispatchEvent(new Event("themechange"));
  }
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    window.SFX && SFX.play("theme", next === "dark");
    if (!document.startViewTransition || reduce) return setTheme(next);
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 800, easing: "cubic-bezier(0.7, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  });

  /* ---------- الصوت ---------- */
  const soundBtn = $(".sound-btn");
  if (soundBtn && window.SFX) {
    soundBtn.setAttribute("aria-pressed", String(SFX.enabled));
    soundBtn.addEventListener("click", () => {
      SFX.set(!SFX.enabled);
      soundBtn.setAttribute("aria-pressed", String(SFX.enabled));
      window.toast && toast(SFX.enabled ? "الصوت شغّال" : "الصوت مقفل");
    });
  }

  /* ---------- تايم كود ---------- */
  window.formatTC = (frames) => {
    const f = frames % 25, s = Math.floor(frames / 25) % 60, m = Math.floor(frames / 1500) % 60, h = Math.floor(frames / 90000);
    return [h, m, s, f].map((n) => String(n).padStart(2, "0")).join(":");
  };

  /* ---------- الستارة بين الصفحات ---------- */
  const NAMES = { index: "الرئيسية", works: "المعرض", about: "عنّي", contact: "تواصل" };
  const curtain = $("#curtain");
  const label = curtain && $("[data-curtain-label]", curtain);
  const EASE = "cubic-bezier(0.7, 0, 0.2, 1)";

  // الحاء بخط الرقعة: يُرسم حدّها ثم تمتلئ
  const haaText = curtain && $(".haa-draw", curtain);
  function drawHaa(duration) {
    if (!haaText) return Promise.resolve();
    haaText.getAnimations().forEach((a) => a.cancel());
    return haaText.animate(
      [
        { strokeDashoffset: 2400, fillOpacity: 0, offset: 0 },
        { strokeDashoffset: 0, fillOpacity: 0, offset: 0.7 },
        { strokeDashoffset: 0, fillOpacity: 1, offset: 1 },
      ],
      { duration, easing: "ease-in-out", fill: "forwards" }
    ).finished;
  }

  function enter() {
    window.__entered = true;
    dispatchEvent(new Event("page:enter"));
  }

  const waitForScene = document.body.hasAttribute("data-wait-scene");
  const sceneReady = new Promise((res) => {
    if (!waitForScene || window.__pageReady) return res();
    addEventListener("page:ready", res, { once: true });
    setTimeout(res, 3500);
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  let firstVisit = true;
  try { firstVisit = !sessionStorage.getItem("visited"); sessionStorage.setItem("visited", "1"); } catch (e) {}

  if (!curtain || reduce) {
    if (curtain) curtain.hidden = true;
    Promise.all([fontsReady]).then(enter);
  } else {
    label.textContent = firstVisit ? SITE.name : NAMES[page] || "";
    const tc = $("[data-curtain-tc]", curtain);
    const t0 = performance.now();
    const tick = () => {
      if (curtain.hidden) return;
      tc.textContent = window.formatTC(Math.floor((performance.now() - t0) / 40));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const draw = drawHaa(firstVisit ? 1500 : 450);
    Promise.all([draw, sceneReady, fontsReady]).then(() => {
      const a = curtain.animate(
        [{ clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)" }],
        { duration: 950, easing: EASE, fill: "forwards", delay: firstVisit ? 250 : 80 }
      );
      setTimeout(() => { enter(); if (!firstVisit && window.SFX) SFX.play("arrive"); }, (firstVisit ? 250 : 80) + 380);
      a.finished.then(() => { curtain.hidden = true; });
    });
  }

  // الخروج من الصفحة
  function leave(href, targetPage) {
    if (!curtain || reduce) { location.href = href; return; }
    curtain.hidden = false;
    curtain.getAnimations().forEach((a) => a.cancel());
    label.textContent = NAMES[targetPage] || "";
    const a = curtain.animate(
      [{ clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
      { duration: 750, easing: EASE, fill: "forwards" }
    );
    drawHaa(650);
    window.SFX && SFX.play("whoosh");
    a.finished.then(() => setTimeout(() => (location.href = href), 120));
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const m = url.pathname.match(/\/(?:([\w-]+)\.html)?$/);
    if (!m) return;
    const target = m[1] || "index";
    if (target === page && url.hash) return;
    if (url.pathname === location.pathname && !url.hash) { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); return; }
    e.preventDefault();
    leave(url.href, target);
  });

  // الرجوع من ذاكرة المتصفح
  addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) {
      curtain.getAnimations().forEach((a) => a.cancel());
      curtain.hidden = true;
    }
  });

  /* ---------- ظهور العناصر عند التمرير ---------- */
  const io = "IntersectionObserver" in window && !reduce
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }), { rootMargin: "0px 0px -12% 0px" })
    : null;
  $$("[data-reveal]").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  /* ---------- رسالة قصيرة ---------- */
  window.toast = (msg) => {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2200);
  };
})();
