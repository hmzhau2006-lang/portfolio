/* =========================================================
   مؤثرات صوتية مولّدة بالكود (Web Audio) — بدون ملفات صوت
   SFX.play("hover" | "click" | "whoosh" | "arrive" | "theme" | "step" | "open" | "close" | "sparkle" | "ok" | "deny")
   ========================================================= */
(function () {
  "use strict";
  let ctx = null, master = null, verb = null, enabled = true, lastHover = 0;
  try { enabled = localStorage.getItem("sound") !== "off"; } catch (e) {}

  // سلّم خماسي: النغمات دائماً متناسقة
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const hz = (semi, base = 392) => base * Math.pow(2, semi / 12);

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);

    // صدى خفيف: استجابة نبضية مولّدة من ضوضاء متلاشية
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    verb.connect(wet).connect(master);
    return ctx;
  }

  function ready() {
    if (!enabled) return false;
    if (!init()) return false;
    if (ctx.state === "suspended") ctx.resume();
    return ctx.state === "running";
  }

  // نغمة بغلاف صوتي
  function tone({ f = 440, f2 = null, type = "sine", t = 0, dur = 0.2, vol = 0.1, attack = 0.005, send = 0 }) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(master);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(verb); }
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  // جرس FM ناعم
  function bell(f, t = 0, vol = 0.07, dur = 1.4) {
    const now = ctx.currentTime + t;
    const car = ctx.createOscillator(), mod = ctx.createOscillator();
    const mg = ctx.createGain(), g = ctx.createGain(), s = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.6, now);
    mg.gain.exponentialRampToValueAtTime(1, now + dur * 0.6);
    mod.connect(mg).connect(car.frequency);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.gain.value = 0.9;
    car.connect(g).connect(master);
    g.connect(s).connect(verb);
    car.start(now); mod.start(now);
    car.stop(now + dur + 0.1); mod.stop(now + dur + 0.1);
  }

  let noiseBuf = null;
  function noise({ t = 0, dur = 0.6, from = 400, to = 4000, q = 1.2, vol = 0.12, send = 0.3 }) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const now = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, now);
    bp.frequency.exponentialRampToValueAtTime(to, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(bp).connect(g).connect(master);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(verb); }
    src.start(now);
    src.stop(now + dur + 0.05);
  }

  const SOUNDS = {
    hover() {
      const n = performance.now();
      if (n - lastHover < 60) return;
      lastHover = n;
      tone({ f: 2600, f2: 1900, type: "sine", dur: 0.05, vol: 0.025 });
    },
    click() {
      tone({ f: hz(12), type: "triangle", dur: 0.09, vol: 0.09 });
      tone({ f: hz(19), type: "sine", t: 0.035, dur: 0.14, vol: 0.06, send: 0.3 });
    },
    whoosh() {
      noise({ dur: 0.75, from: 300, to: 5200, q: 0.9, vol: 0.16 });
      tone({ f: 90, f2: 160, type: "sine", dur: 0.7, vol: 0.08, attack: 0.25 });
    },
    arrive() {
      noise({ dur: 0.9, from: 4200, to: 350, q: 0.8, vol: 0.1 });
      tone({ f: 70, f2: 48, type: "sine", t: 0.05, dur: 0.6, vol: 0.18 });
      bell(hz(12), 0.12, 0.05);
      bell(hz(19), 0.22, 0.035);
    },
    theme(dark) {
      const seq = dark ? [12, 7, 4, 0] : [0, 4, 7, 12];
      seq.forEach((s, i) => tone({ f: hz(s, 523), type: "sine", t: i * 0.055, dur: 0.35, vol: 0.06, send: 0.5 }));
      noise({ dur: 0.6, from: dark ? 3000 : 500, to: dark ? 400 : 4000, q: 1.5, vol: 0.05 });
    },
    step(i = 0) {
      const s = SCALE[i % SCALE.length];
      tone({ f: hz(s, 330), type: "triangle", dur: 0.22, vol: 0.08, send: 0.35 });
      tone({ f: hz(s + 12, 330), type: "sine", dur: 0.12, vol: 0.03 });
    },
    open() {
      noise({ dur: 0.9, from: 250, to: 3600, q: 1, vol: 0.1 });
      [0, 4, 7, 11, 14].forEach((s, i) => bell(hz(s, 523), 0.18 + i * 0.07, 0.035, 1.2));
    },
    close() {
      noise({ dur: 0.6, from: 3200, to: 300, q: 1, vol: 0.08 });
      tone({ f: hz(7), f2: hz(0), type: "sine", dur: 0.35, vol: 0.06, send: 0.3 });
    },
    sparkle() {
      [0, 4, 7, 12, 16, 19].forEach((s, i) => bell(hz(s, 659), i * 0.11, 0.03, 1.6));
      tone({ f: 55, f2: 82, type: "sine", dur: 1.6, vol: 0.09, attack: 0.5 });
    },
    ok() { bell(hz(12), 0, 0.06); bell(hz(19), 0.08, 0.05); },
    deny() {
      tone({ f: hz(4, 220), type: "triangle", dur: 0.12, vol: 0.08 });
      tone({ f: hz(1, 220), type: "triangle", t: 0.1, dur: 0.18, vol: 0.08 });
    },
  };

  window.SFX = {
    play(name, arg) {
      if (!ready() || !SOUNDS[name]) return;
      try { SOUNDS[name](arg); } catch (e) {}
    },
    get enabled() { return enabled; },
    set(on) {
      enabled = on;
      try { localStorage.setItem("sound", on ? "on" : "off"); } catch (e) {}
      document.documentElement.classList.toggle("sound-off", !on);
      if (on) { init(); if (ctx.state === "suspended") ctx.resume(); SOUNDS.ok(); }
    },
  };
  document.documentElement.classList.toggle("sound-off", !enabled);

  // المتصفح لا يسمح بالصوت قبل أول تفاعل
  const unlock = () => { if (enabled) { init(); ctx && ctx.resume(); } };
  addEventListener("pointerdown", unlock, { once: true, capture: true });
  addEventListener("keydown", unlock, { once: true, capture: true });

  // أصوات عامة: الحوم والضغط على العناصر التفاعلية
  const SEL = "a[href], button:not(:disabled), .chip, .door, [role=button]";
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest(SEL);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    window.SFX.play("hover");
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest(SEL);
    if (!el || el.matches(".theme-btn, .sound-btn, .modal__close, [data-prev], [data-next], a[href$='.html']")) return;
    window.SFX.play("click");
  }, true);
})();
