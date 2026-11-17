/* المعرض: قاعة ثلاثية الأبعاد تتمشى فيها بالتمرير */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { signalReady } from "./haa.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");

/* ---------- البيانات ---------- */
const ALL = (window.WORKS || []).map((w) => ({ ...w }));
if (!ALL.length) {
  ["موشن", "تصميم", "محتوى", "موشن", "تصميم", "تقارير"].forEach((c) =>
    ALL.push({ ghost: true, title: "عمل قادم", category: c })
  );
}
let list = ALL.slice();

/* ---------- المشهد ---------- */
const canvas = $("#gallery");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
}

const SP = 4.6;        // المسافة بين اللوحات
const START = 4.6;     // موقع الكاميرا قبل أول لوحة
const W = 1.7, H = 2.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
const frames = [];
const clickables = [];
let colors = readColors();

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (k) => cs.getPropertyValue(k).trim();
  return { bg: g("--bg"), bg2: g("--bg-2"), bg3: g("--bg-3"), ink: g("--ink"), muted: g("--muted"), accent: g("--accent"), accent2: g("--accent-2"), light: document.documentElement.dataset.theme === "light" };
}

function radialTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const RADIAL = radialTexture();

// لوحة مؤقتة: حرف الحاء بخط كبير مع اسم القسم
function placeholderTexture(i, cat) {
  const c = document.createElement("canvas");
  c.width = 680; c.height = 848;
  const g = c.getContext("2d");
  const swap = i % 2 === 1;
  const a = swap ? colors.accent2 : colors.accent;
  const grd = g.createLinearGradient(0, 0, c.width, c.height);
  grd.addColorStop(0, colors.bg3);
  grd.addColorStop(1, colors.bg);
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);

  const glow = g.createRadialGradient(c.width * 0.3, c.height * 0.35, 0, c.width * 0.3, c.height * 0.35, c.width * 0.9);
  glow.addColorStop(0, a + "55");
  glow.addColorStop(1, a + "00");
  g.fillStyle = glow;
  g.fillRect(0, 0, c.width, c.height);

  g.direction = "rtl";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 640px 'Aref Ruqaa'";
  g.fillStyle = a;
  g.globalAlpha = 0.9;
  g.fillText("ح", c.width / 2 + (swap ? 40 : -40), c.height * 0.4);
  g.globalAlpha = 1;
  g.lineWidth = 2;
  g.strokeStyle = colors.ink + "33";
  g.strokeText("ح", c.width / 2 + (swap ? 10 : -10), c.height * 0.42);

  g.textAlign = "right";
  g.fillStyle = colors.ink;
  g.font = "800 56px 'Noto Kufi Arabic'";
  g.fillText(cat, c.width - 56, c.height - 150);
  g.fillStyle = colors.muted;
  g.font = "400 32px 'Noto Kufi Arabic'";
  g.fillText("يُضاف قريباً", c.width - 56, c.height - 90);
  g.strokeStyle = colors.ink + "22";
  g.lineWidth = 3;
  g.strokeRect(28, 28, c.width - 56, c.height - 56);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return t;
}

const loader = new THREE.TextureLoader();
const frameGeo = new RoundedBoxGeometry(W + 0.16, H + 0.16, 0.12, 3, 0.03);
const artGeo = new THREE.PlaneGeometry(W, H);
const haloGeo = new THREE.PlaneGeometry(W * 2.6, H * 2.1);
const poolGeo = new THREE.PlaneGeometry(W * 2.2, 2.8);
const markGeo = new THREE.BoxGeometry(0.16, 0.16, 0.02);

let floorMat, floor, lineMat, frameMat, haloMat, poolMat, markMat;

function setupScene() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.fog = new THREE.Fog(colors.bg, 7, 24);
  scene.background = new THREE.Color(colors.bg);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(2, 5, 4);
  scene.add(dir);

  floorMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 });
  floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.75, -150);
  scene.add(floor);

  // خطوط إرشادية على الأرض
  lineMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });
  [-3.4, 3.4].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 400), lineMat);
    l.position.set(x, -1.74, -150);
    scene.add(l);
  });

  frameMat = new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.28 });
  haloMat = new THREE.MeshBasicMaterial({ map: RADIAL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 });
  poolMat = new THREE.MeshBasicMaterial({ map: RADIAL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 });
  markMat = new THREE.MeshBasicMaterial();
  applyColors();
}

function applyColors() {
  colors = readColors();
  if (!renderer) return;
  scene.fog.color.set(colors.bg);
  scene.background.set(colors.bg);
  floorMat.color.set(colors.bg2);
  lineMat.color.set(colors.accent2);
  frameMat.color.set(colors.light ? "#FFFFFF" : "#1C2470");
  haloMat.color.set(colors.accent2);
  haloMat.opacity = colors.light ? 0.18 : 0.35;
  poolMat.color.set(colors.accent);
  poolMat.opacity = colors.light ? 0.25 : 0.4;
  markMat.color.set(colors.accent);
  renderer.toneMappingExposure = colors.light ? 1.0 : 1.05;
  frames.forEach((f, i) => {
    if (f.userData.work.ghost) {
      const old = f.userData.art.material.map;
      f.userData.art.material.map = placeholderTexture(i, f.userData.work.category);
      f.userData.art.material.needsUpdate = true;
      if (old) old.dispose();
    }
  });
}

let layout = {};
function measure() {
  const m = innerWidth < 760;
  layout = { X: m ? 0.2 : 1.45, scale: m ? 0.92 : 1, fov: m ? 50 : 42, camShift: m ? 0.15 : 0.42 };
}
measure();

function build() {
  frames.splice(0).forEach((f) => {
    scene.remove(f);
    f.userData.extras.forEach((e) => scene.remove(e));
    const map = f.userData.art.material.map;
    if (map) map.dispose();
    f.userData.art.material.dispose();
  });
  clickables.length = 0;
  list.forEach((w, i) => {
    const side = i % 2 === 0 ? -1 : 1; // RTL: الأولى على اليسار ثم تتبادل
    const grp = new THREE.Group();
    grp.position.set(side * layout.X, 0.12, -i * SP);
    grp.rotation.y = -side * 0.22;
    grp.scale.setScalar(layout.scale);

    const frame = new THREE.Mesh(frameGeo, frameMat);
    const art = new THREE.Mesh(artGeo, new THREE.MeshBasicMaterial({ toneMapped: false }));
    art.position.z = 0.065;
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.z = -0.3;
    grp.add(halo, frame, art);

    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(side * layout.X, -1.73, -i * SP + 0.6);
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    mark.position.set(0, -1.735, -i * SP);
    scene.add(pool, mark);

    grp.userData = { work: w, index: i, art, frame, side, extras: [pool, mark], baseRotY: grp.rotation.y, hover: 0 };
    art.userData.group = grp;
    frame.userData.group = grp;
    clickables.push(art, frame);

    if (w.ghost) art.material.map = placeholderTexture(i, w.category);
    else if (w.cover) {
      art.material.color.set(colors.bg3);
      loader.load(w.cover, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        art.material.map = tex;
        art.material.color.set(0xffffff);
        art.material.needsUpdate = true;
        const r = tex.image.width / tex.image.height, fr = W / H;
        // اللوحات العرضية تكبر بالعرض بدل ما تصغر
        let sx, sy;
        if (r > fr) { sx = Math.min(1.6, r / fr); sy = (sx * fr) / r; }
        else { sx = r / fr; sy = 1; }
        art.scale.set(sx, sy, 1);
        frame.scale.set((W * sx + 0.16) / (W + 0.16), (H * sy + 0.16) / (H + 0.16), 1);
      });
    }
    scene.add(grp);
    frames.push(grp);
  });
  const n = list.length;
  $("[data-gallery-spacer]").style.height = `calc(${Math.max(0, n - 1)} * 85vh + 100vh)`;
  $("[data-empty]").hidden = n > 0;
  current = -1;
  updateUI(0, true);
}


/* ---------- الواجهة ---------- */
const ui = {
  count: $("[data-plaque-count]"), title: $("[data-plaque-title]"), cat: $("[data-plaque-cat]"),
  plaque: $(".plaque"), bar: $("[data-progress]"), prev: $("[data-prev]"), next: $("[data-next]"),
};
let current = -1;
function updateUI(idx, force) {
  if (idx === current && !force) return;
  if (!force && current !== -1 && window.SFX) SFX.play("step", idx);
  current = idx;
  const w = list[idx];
  const n = list.length;
  if (!w) { ui.plaque.classList.add("is-empty"); return; }
  ui.plaque.classList.remove("is-empty");
  ui.plaque.classList.remove("swap");
  void ui.plaque.offsetWidth;
  ui.plaque.classList.add("swap");
  ui.count.textContent = `${pad(idx + 1)} / ${pad(n)}`;
  ui.title.textContent = w.title;
  ui.cat.textContent = w.category || "";
  ui.prev.disabled = idx <= 0;
  ui.next.disabled = idx >= n - 1;
}

function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
function goTo(i) {
  const n = list.length;
  if (n < 2) return;
  i = Math.max(0, Math.min(n - 1, i));
  scrollTo({ top: (i / (n - 1)) * maxScroll(), behavior: reduce ? "auto" : "smooth" });
}
ui.prev.addEventListener("click", () => goTo(current - 1));
ui.next.addEventListener("click", () => goTo(current + 1));
addEventListener("keydown", (e) => {
  if (!$("#modal").hidden) return;
  if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current + 1); }
  if (e.key === "ArrowRight") { e.preventDefault(); goTo(current - 1); }
});

// الفلاتر
const filtersEl = $("[data-filters]");
// الأقسام الفاضية ما تظهر في الفلاتر
const cats = ["الكل", ...(window.CATEGORIES || []).filter((c) => ALL.some((w) => w.category === c))];
cats.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  const count = c === "الكل" ? ALL.length : ALL.filter((w) => w.category === c).length;
  b.innerHTML = `<span></span><small>${count}</small>`;
  b.firstChild.textContent = c;
  b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
  b.addEventListener("click", () => {
    filtersEl.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    list = c === "الكل" ? ALL.slice() : ALL.filter((w) => w.category === c);
    const rebuild = () => { build(); scrollTo({ top: 0 }); camState.z = START + 3; };
    if (window.gsap && !reduce) {
      gsap.to(canvas, { opacity: 0, duration: 0.3, onComplete: () => { rebuild(); gsap.to(canvas, { opacity: 1, duration: 0.6 }); } });
    } else rebuild();
  });
  filtersEl.appendChild(b);
});

// قائمة نصية مخفية لقارئات الشاشة
const srList = $("[data-sr-list]");
ALL.forEach((w) => {
  const li = document.createElement("li");
  li.textContent = `${w.title}، ${w.category || ""}`;
  srList.appendChild(li);
});

/* ---------- نافذة العمل ---------- */
const modal = $("#modal");
const media = $("[data-modal-media]");
// إيقاف كل الفيديوهات وتفريغها فوراً، بدون انتظار أي حركة
function stopMedia() {
  media.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.removeAttribute("src");
    v.load();
  });
  media.innerHTML = "";
}
// فيديو واحد فقط يشتغل في نفس الوقت
media.addEventListener("play", (e) => {
  media.querySelectorAll("video").forEach((v) => { if (v !== e.target) v.pause(); });
}, true);
// إذا اختفت الصفحة أو انقفلت، يوقف الفيديو
document.addEventListener("visibilitychange", () => {
  if (document.hidden) media.querySelectorAll("video").forEach((v) => v.pause());
});
addEventListener("pagehide", stopMedia);

let modalOpen = false;
function openModal(w) {
  stopMedia();
  modalOpen = true;
  $("[data-modal-type]").textContent = w.category || "";
  $("[data-modal-title]").textContent = w.title || "";
  $("[data-modal-desc]").textContent = w.desc || "";
  $("[data-modal-year]").textContent = w.year || "";
  $("[data-modal-tools]").textContent = (w.tools || []).join("، ");
  const videos = w.videos || [];
  const images = w.images || [];
  videos.forEach((src, i) => {
    const fig = document.createElement("figure");
    fig.className = "modal__fig modal__fig--video";
    const v = document.createElement("video");
    Object.assign(v, { src, controls: true, playsInline: true, preload: i === 0 ? "auto" : "metadata" });
    if (i === 0) { v.autoplay = true; if (w.cover) v.poster = w.cover; }
    fig.appendChild(v);
    media.appendChild(fig);
  });
  images.forEach((src, i) => {
    const fig = document.createElement("figure");
    fig.className = "modal__fig";
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${w.title}، صورة ${i + 1} من ${images.length}`;
    img.loading = i < 2 ? "eager" : "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    media.appendChild(fig);
  });
  if (!videos.length && !images.length && w.cover) {
    const img = document.createElement("img");
    img.src = w.cover; img.alt = w.title || "";
    media.appendChild(img);
  }
  // العمل التالي
  const idx = list.indexOf(w);
  const nextW = list[(idx + 1) % list.length];
  const nextBtn = $("[data-modal-next]");
  if (nextW && nextW !== w && !nextW.ghost) {
    nextBtn.hidden = false;
    $("[data-modal-next-title]").textContent = nextW.title;
    nextBtn.onclick = () => {
      window.SFX && SFX.play("whoosh");
      media.querySelectorAll("video").forEach((v) => v.pause());
      const go = () => { modal.scrollTop = 0; openModal(nextW, true); goTo(list.indexOf(nextW)); };
      if (window.gsap && !reduce) gsap.to(".modal__inner", { opacity: 0, y: -30, duration: 0.35, ease: "power2.in", onComplete: () => { go(); gsap.fromTo(".modal__inner", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }); } });
      else go();
    };
  } else nextBtn.hidden = true;
  if (arguments[1]) return;
  modal.scrollTop = 0;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  window.SFX && SFX.play("open");
  if (window.gsap && !reduce) {
    gsap.killTweensOf(modal);
    gsap.fromTo(modal, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)", duration: 1, ease: "expo.inOut" });
    gsap.from(".modal__info > *, .modal__media > :first-child", { y: 30, opacity: 0, stagger: 0.06, duration: 0.8, delay: 0.45, ease: "expo.out" });
  }
  $(".modal__close").focus();
}
function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  window.SFX && SFX.play("close");
  // الصوت والفيديو يقفون فوراً، قبل حركة الإغلاق
  media.querySelectorAll("video").forEach((v) => v.pause());
  const done = () => { stopMedia(); modal.hidden = true; document.body.style.overflow = ""; };
  if (window.gsap && !reduce && !document.hidden) {
    gsap.killTweensOf(modal);
    gsap.to(modal, { clipPath: "circle(0% at 50% 50%)", duration: 0.7, ease: "expo.inOut", onComplete: done });
    setTimeout(() => { if (!modalOpen && !modal.hidden) done(); }, 1000); // احتياط لو توقفت الحركة
  } else done();
}
$(".modal__close").addEventListener("click", closeModal);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

/* ---------- التفاعل ---------- */
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2(-9, -9);
const mouse = { x: 0, y: 0 };
let hovered = null;
addEventListener("pointermove", (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  mouse.x = pointer.x; mouse.y = pointer.y;
});
canvas.addEventListener("click", () => {
  if (!hovered) return;
  const { work, index } = hovered.userData;
  if (index !== current) return goTo(index);
  if (work.ghost) { window.SFX && SFX.play("deny"); window.toast && window.toast("هذا العمل يُضاف قريباً"); }
  else openModal(work);
});

/* ---------- الحلقة ---------- */
const camState = { z: START + 7, y: 1.2, intro: reduce ? 1 : 0 };
function resize() {
  measure();
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = layout.fov;
  camera.updateProjectionMatrix();
  frames.forEach((f) => {
    f.position.x = f.userData.side * layout.X;
    f.scale.setScalar(layout.scale);
    f.userData.extras[0].position.x = f.userData.side * layout.X;
  });
}

const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  const n = list.length;
  const p = n > 1 ? Math.min(1, scrollY / maxScroll()) : 0;
  const pos = p * Math.max(0, n - 1);
  const i0 = Math.floor(pos), i1 = Math.min(n - 1, i0 + 1), fr = pos - i0;
  const xa = frames[i0] ? frames[i0].position.x : 0, xb = frames[i1] ? frames[i1].position.x : 0;
  const focusX = xa + (xb - xa) * fr;

  const targetZ = START - pos * SP;
  const k = camState.intro < 1 ? 0.04 : 0.09;
  camState.z += (targetZ - camState.z) * k;
  camState.y += (0.1 - camState.y) * 0.05;
  camera.position.set(focusX * layout.camShift + mouse.x * 0.15, camState.y + mouse.y * 0.08, camState.z);
  camera.lookAt(focusX * 0.55, 0.05, camState.z - 6);

  updateUI(Math.round(pos));
  if (ui.bar) ui.bar.style.transform = `scaleX(${n > 1 ? p : 1})`;

  // الحوم
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(clickables, false)[0];
  hovered = hit ? hit.object.userData.group : null;
  canvas.style.cursor = hovered ? "pointer" : "";

  frames.forEach((f) => {
    const u = f.userData;
    u.hover += ((f === hovered ? 1 : 0) - u.hover) * 0.1;
    const sway = reduce ? 0 : 1;
    f.rotation.y = u.baseRotY + u.hover * mouse.x * 0.18 + Math.sin(t * 0.5 + u.index) * 0.02 * sway;
    f.rotation.x = -u.hover * mouse.y * 0.12;
    f.position.y = 0.12 + Math.sin(t * 0.7 + u.index * 1.3) * 0.04 * sway + u.hover * 0.05;
    f.scale.setScalar(layout.scale * (1 + u.hover * 0.04));
  });

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

async function start() {
  if (!renderer) { signalReady(); return; }
  try { await document.fonts.load("700 100px 'Aref Ruqaa'", "ح"); await document.fonts.load("700 50px 'Noto Kufi Arabic'"); await document.fonts.load("400 30px 'Noto Kufi Arabic'"); } catch (e) {}
  setupScene();
  build();
  resize();
  addEventListener("resize", resize);
  addEventListener("themechange", () => requestAnimationFrame(applyColors));
  requestAnimationFrame(frame);
  const intro = () => {
    if (window.gsap && !reduce) gsap.to(camState, { intro: 1, duration: 2.4, ease: "power2.out" });
    else camState.intro = 1;
  };
  if (window.__entered) intro(); else addEventListener("page:enter", intro, { once: true });
  signalReady();
}
start();
