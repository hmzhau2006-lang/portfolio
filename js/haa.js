/* حرف الحاء ثلاثي الأبعاد، مجسّم من حرف خط الرقعة (Aref Ruqaa) */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import opentype from "https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.module.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT_URL = "assets/fonts/aref-ruqaa-700.woff";

const PALETTE = {
  dark: { color: "#DCE2FF", metal: 0.95, rough: 0.16, irid: 0.9, bits: "#3D5BFF", key: 0xffffff, rim: 0x3d5bff },
  light: { color: "#8BE3FF", metal: 0.45, rough: 0.2, irid: 0.35, bits: "#FFFFFF", key: 0xffffff, rim: 0xd8f6ff },
};

let fontPromise;
function loadFont() {
  fontPromise = fontPromise || new Promise((res, rej) => opentype.load(FONT_URL, (err, f) => (err ? rej(err) : res(f))));
  return fontPromise;
}

// يحوّل مسار الحرف من الخط إلى أشكال three.js
function glyphShapes(font, char) {
  const glyph = font.charToGlyph(char);
  const sp = new THREE.ShapePath();
  for (const c of glyph.path.commands) {
    if (c.type === "M") sp.moveTo(c.x, c.y);
    else if (c.type === "L") sp.lineTo(c.x, c.y);
    else if (c.type === "Q") sp.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    else if (c.type === "C") sp.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
  }
  let shapes = sp.toShapes(true);
  if (!shapes.length) shapes = sp.toShapes(false);
  return shapes;
}

export async function mountHaa(canvas, opts = {}) {
  const o = Object.assign({
    layouts: { mobile: { x: 0, y: 1.25, s: 0.62 }, tablet: { x: -1.2, y: 0.3, s: 0.85 }, desktop: { x: -1.7, y: 0.35, s: 1 } },
    follow: 0.5,
    scrollSpin: 1.2,
    bits: 40,
  }, opts);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    document.documentElement.classList.add("no-webgl");
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(0x3d5bff, 4);
  rim.position.set(4, -1, -3);
  const fill = new THREE.PointLight(0x3d5bff, 12, 12);
  fill.position.set(2.5, -2, 2.5);
  scene.add(key, rim, fill);

  const root = new THREE.Group();
  scene.add(root);

  // الحرف
  let font;
  try { font = await loadFont(); } catch (e) { console.warn("font", e); return null; }
  const shapes = glyphShapes(font, "ح");
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 140, curveSegments: 28,
    bevelEnabled: true, bevelThickness: 34, bevelSize: 16, bevelSegments: 8,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const k = 2.6 / Math.max(size.x, size.y);
  geo.translate(-(bb.min.x + size.x / 2), -(bb.min.y + size.y / 2), -(bb.min.z + size.z / 2));
  geo.scale(k, k, k);
  geo.computeVertexNormals();
  const half = (size.x * k) / 2 + 0.2;

  // كشف الحرف من اليمين لليسار كأنه ينكتب
  const localPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -half);
  const worldPlane = new THREE.Plane();
  const mat = new THREE.MeshPhysicalMaterial({
    clearcoat: 1, clearcoatRoughness: 0.06, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700],
    envMapIntensity: 1.35, clippingPlanes: [worldPlane], side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  // مربعات صغيرة عائمة
  const COUNT = o.bits;
  const bitsMat = new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.7 });
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), bitsMat, COUNT);
  const bitData = Array.from({ length: COUNT }, () => ({
    x: THREE.MathUtils.randFloatSpread(13), y: THREE.MathUtils.randFloatSpread(8),
    z: THREE.MathUtils.randFloat(-6, 1.5), s: THREE.MathUtils.randFloat(0.5, 1.8),
    sp: THREE.MathUtils.randFloat(0.2, 0.7), ph: Math.random() * Math.PI * 2,
  }));
  scene.add(bits);
  const dummy = new THREE.Object3D();

  function applyTheme() {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const p = PALETTE[t];
    mat.color.set(p.color);
    mat.metalness = p.metal;
    mat.roughness = p.rough;
    mat.iridescence = p.irid;
    bitsMat.color.set(p.bits);
    rim.color.setHex(p.rim);
    fill.color.setHex(t === "light" ? 0xffffff : 0x3d5bff);
    renderer.toneMappingExposure = t === "light" ? 1.0 : 1.1;
  }
  applyTheme();
  addEventListener("themechange", applyTheme);

  const state = { reveal: reduce ? 1 : 0, pop: reduce ? 1 : 0 };
  const play = () => {
    window.SFX && SFX.play("sparkle");
    if (reduce || !window.gsap) { state.reveal = 1; state.pop = 1; return; }
    gsap.to(state, { reveal: 1, duration: 1.9, ease: "power3.inOut" });
    gsap.to(state, { pop: 1, duration: 2.4, ease: "expo.out" });
  };
  if (window.__entered) play(); else addEventListener("page:enter", play, { once: true });

  let layout = o.layouts.desktop;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout = w < 760 ? o.layouts.mobile : w < 1100 ? o.layouts.tablet : o.layouts.desktop;
  }
  resize();
  addEventListener("resize", resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / innerHeight) * 2 - 1;
  });

  const clock = new THREE.Clock();
  let smooth = 0;
  const sway = reduce ? 0 : 1;
  function frame() {
    const t = clock.getElapsedTime();
    const hero = Math.min(1, scrollY / innerHeight);
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const page = scrollY / max;
    smooth += (hero - smooth) * 0.08;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    root.position.set(
      layout.x - smooth * (innerWidth < 760 ? 0 : 0.8),
      layout.y + smooth * 0.5 + Math.sin(t * 0.6) * 0.07 * sway,
      -smooth * 1.4
    );
    root.scale.setScalar(layout.s * (0.82 + 0.18 * state.pop) * (1 - smooth * 0.15));
    root.rotation.y = -0.12 + mouse.x * o.follow + smooth * o.scrollSpin + page * 2.4 + Math.sin(t * 0.45) * 0.14 * sway + (1 - state.pop) * 0.9;
    root.rotation.x = 0.08 + mouse.y * o.follow * 0.5 + smooth * 0.2;
    root.rotation.z = Math.sin(t * 0.3) * 0.04 * sway;

    root.updateMatrixWorld();
    localPlane.constant = -(half - state.reveal * half * 2);
    worldPlane.copy(localPlane).applyMatrix4(mesh.matrixWorld);

    for (let i = 0; i < COUNT; i++) {
      const b = bitData[i];
      dummy.position.set(
        b.x + mouse.x * 0.045 * (b.z + 6),
        b.y + Math.sin(t * b.sp + b.ph) * 0.25 * sway - page * 0.4 * (b.z + 6),
        b.z
      );
      dummy.rotation.set(t * b.sp * 0.5 * sway, t * b.sp * sway, 0);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      bits.setMatrixAt(i, dummy.matrix);
    }
    bits.instanceMatrix.needsUpdate = true;
    canvas.style.opacity = String(1 - smooth * 0.55);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { root };
}

export function signalReady() {
  window.__pageReady = true;
  dispatchEvent(new Event("page:ready"));
}
