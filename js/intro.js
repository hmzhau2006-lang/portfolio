/* دخول الصفحة: الكلمات تطلع ويتغير وزن خطها، ثم بقية العناصر */
(function () {
  if (typeof gsap === "undefined" || window.__reduce) return;
  const words = document.querySelectorAll(".hero__name .w, .page-title .w");
  const rest = document.querySelectorAll("[data-intro]");
  gsap.set(words, { yPercent: 115 });
  gsap.set(rest, { opacity: 0, y: 18 });
  const run = () => {
    gsap.timeline()
      .fromTo(words, { yPercent: 115, fontWeight: 100 }, { yPercent: 0, fontWeight: 800, duration: 1.4, stagger: 0.08, ease: "expo.out" })
      .to(rest, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: "expo.out" }, "-=1.05");
  };
  if (window.__entered) run(); else addEventListener("page:enter", run, { once: true });
})();
