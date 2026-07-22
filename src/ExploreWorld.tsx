import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/addons/renderers/CSS3DRenderer.js";

/* ── Constants ───────────────────────────────────────────────────── */
const SCREENS = [
  { label: "Cities & Climate", url: "/cities.html", color: "#3b82f6" },
  { label: "The More You Know", url: "/aboutus.html", color: "#10b981" },
  { label: "What Can You Do", url: "/what.html", color: "#f59e0b" },
] as const;

const SENSITIVITY = 0.002;
const SPREAD = 1.6;
const SCREEN_RADIUS = 1150;
const STAR_COUNT = 250;
const STAR_COLORS: readonly [number, number, number][] = [
  [180, 220, 255],
  [140, 180, 255],
  [255, 230, 200],
];

const HL_BORDER = "2px solid rgba(16,185,129,0.8)";
const HL_SHADOW =
  "0 0 50px rgba(16,185,129,0.3),0 0 120px rgba(16,185,129,0.1),0 40px 100px rgba(0,0,0,0.8)";
const NM_BORDER = "2px solid rgba(255,255,255,0.06)";
const NM_SHADOW =
  "0 4px 60px rgba(0,0,0,0.6),0 0 80px rgba(16,185,129,0.03)";

type OverlayInfo = { url: string; label: string; color: string };

/* ── Helper ──────────────────────────────────────────────────────── */
function spherePos(r: number): [number, number, number] {
  const θ = Math.random() * Math.PI * 2;
  const φ = Math.acos(2 * Math.random() - 1);
  return [
    r * Math.sin(φ) * Math.cos(θ),
    r * Math.cos(φ),
    r * Math.sin(θ) * Math.sin(φ),
  ];
}

function makeEl(
  css: string,
  pos: [number, number, number],
  lookAt?: [number, number, number],
) {
  const el = document.createElement("div");
  el.style.cssText = css;
  const obj = new CSS3DObject(el);
  obj.position.set(...pos);
  if (lookAt) obj.lookAt(...lookAt);
  return { el, obj };
}

/* ── Component ───────────────────────────────────────────────────── */
export default function ExploreWorld() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const openOverlay = useRef(setOverlay);
  openOverlay.current = setOverlay;
  const lockRef = useRef(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const W = root.clientWidth;
    const H = root.clientHeight;

    /* ── Scene / Camera / Renderer ──────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 1, 5000);
    camera.position.set(0, 320, 850);

    const renderer = new CSS3DRenderer();
    renderer.setSize(W, H);
    renderer.domElement.style.cssText =
      "position:absolute;top:0;pointer-events:auto;";
    root.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -300, -100);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -SPREAD / 2 - 0.2;
    controls.maxAzimuthAngle = SPREAD / 2 + 0.2;

    /* ── Starfield ──────────────────────────────────────────────── */
    const stars: { el: HTMLDivElement; phase: number; speed: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const size = 4 + Math.random() * 6;
      const alpha = 0.5 + Math.random() * 0.5;
      const [cr, cg, cb] = STAR_COLORS[i % STAR_COLORS.length];
      const el = document.createElement("div");
      el.style.cssText =
        `width:${size}px;height:${size}px;border-radius:50%;` +
        `background:rgba(${cr},${cg},${cb},${alpha});` +
        `box-shadow:0 0 ${size * 2}px rgba(${cr},${cg},${cb},${alpha}),` +
        `0 0 ${size * 6}px rgba(${cr},${cg},${cb},${alpha * 0.6}),` +
        `0 0 ${size * 14}px rgba(${cr},${cg},${cb},${alpha * 0.2});` +
        `pointer-events:none;`;
      const obj = new CSS3DObject(el);
      obj.position.set(...spherePos(900 + Math.random() * 2000));
      scene.add(obj);
      stars.push({
        el,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 0.5,
      });
    }

    /* ── Grid floor ─────────────────────────────────────────────── */
    const F = 4000;
    const GRID_MASK =
      "radial-gradient(circle,rgba(0,0,0,1) 15%,rgba(0,0,0,0.5) 40%,transparent 65%)";
    const { obj: floorObj } = makeEl(
      `width:${F}px;height:${F}px;` +
        `background-image:linear-gradient(rgba(16,185,129,0.06) 1px,transparent 1px),` +
        `linear-gradient(90deg,rgba(16,185,129,0.06) 1px,transparent 1px);` +
        `background-size:80px 80px;` +
        `mask-image:${GRID_MASK};-webkit-mask-image:${GRID_MASK};`,
      [0, -320, 0],
    );
    floorObj.rotation.x = -Math.PI / 2;
    scene.add(floorObj);

    /* ── Ambient glow ───────────────────────────────────────────── */
    const { obj: glowObj } = makeEl(
      `width:2400px;height:800px;border-radius:50%;pointer-events:none;` +
        `background:radial-gradient(ellipse at center,` +
        `rgba(16,185,129,0.04) 0%,rgba(16,185,129,0.01) 40%,transparent 70%);`,
      [0, -50, -400],
    );
    scene.add(glowObj);

    /* ── Screens ────────────────────────────────────────────────── */
    const iframes: HTMLIFrameElement[] = [];
    const screenObjs: CSS3DObject[] = [];
    let activeIdx = -1;

    for (let i = 0; i < SCREENS.length; i++) {
      const s = SCREENS[i];
      const angle = -SPREAD / 2 + (i / (SCREENS.length - 1)) * SPREAD;

      const wrap = document.createElement("div");
      wrap.style.cssText =
        "width:1024px;height:700px;position:relative;pointer-events:auto;display:flex;flex-direction:column;align-items:center;";

      const lbl = document.createElement("div");
      lbl.style.cssText =
        `position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);` +
        `font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;font-weight:600;` +
        `letter-spacing:2px;text-transform:uppercase;color:${s.color};` +
        `opacity:0.7;white-space:nowrap;text-shadow:0 0 20px ${s.color}44;`;
      lbl.textContent = s.label;

      const iframe = document.createElement("iframe");
      iframe.src = s.url;
      iframe.style.cssText =
        `width:1024px;height:640px;border:2px solid rgba(255,255,255,0.06);` +
        `border-radius:20px;background:#06060a;` +
        `box-shadow:0 4px 60px rgba(0,0,0,0.6),0 0 80px ${s.color}08;` +
        `transition:border-color 0.4s,box-shadow 0.4s;`;

      const hit = document.createElement("div");
      hit.style.cssText =
        "position:absolute;top:0;left:0;width:1024px;height:640px;cursor:pointer;z-index:10;pointer-events:auto;border-radius:20px;";
      hit.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (document.pointerLockElement) document.exitPointerLock();
        openOverlay.current({ url: s.url, label: s.label, color: s.color });
      });

      wrap.append(iframe, lbl, hit);
      iframes.push(iframe);

      const obj = new CSS3DObject(wrap);
      obj.position.set(
        Math.sin(angle) * SCREEN_RADIUS,
        0,
        -Math.cos(angle) * SCREEN_RADIUS + 200,
      );
      obj.lookAt(0, 0, 750);
      scene.add(obj);
      screenObjs.push(obj);
    }

    /* ── Pointer lock + mouse ───────────────────────────────────── */
    const listeners: [string, EventListener, EventTarget][] = [];

    const on = (
      target: EventTarget,
      type: string,
      fn: EventListener,
    ) => {
      target.addEventListener(type, fn);
      listeners.push([type, fn, target]);
    };

    const lock = () => {
      if (!document.pointerLockElement) renderer.domElement.requestPointerLock();
    };
    lockRef.current = lock;

    on(renderer.domElement, "click", lock);
    on(document, "pointerlockchange", () => {
      const locked = !!document.pointerLockElement;
      controls.enableRotate = !locked;
      if (hintRef.current) hintRef.current.style.opacity = locked ? "0" : "1";
    });
    on(document, "mousemove", (e: Event) => {
      const me = e as MouseEvent;
      if (document.pointerLockElement) {
        controls.rotateLeft(me.movementX * SENSITIVITY);
        controls.rotateUp(me.movementY * SENSITIVITY);
      }
    });
    on(document, "mousedown", () => {
      if (document.pointerLockElement && activeIdx >= 0) {
        document.exitPointerLock();
        openOverlay.current({
          url: SCREENS[activeIdx].url,
          label: SCREENS[activeIdx].label,
          color: SCREENS[activeIdx].color,
        });
      }
    });

    /* ── Highlight helper ────────────────────────────────────────── */
    const highlight = (idx: number) => {
      if (idx === activeIdx) return;
      if (activeIdx >= 0 && activeIdx < iframes.length) {
        iframes[activeIdx].style.border = NM_BORDER;
        iframes[activeIdx].style.boxShadow = NM_SHADOW;
      }
      activeIdx = idx;
      if (idx >= 0 && idx < iframes.length) {
        iframes[idx].style.border = HL_BORDER;
        iframes[idx].style.boxShadow = HL_SHADOW;
      }
    };

    /* ── Render loop ─────────────────────────────────────────────── */
    let raf: number;
    let t = 0;
    const camDir = new THREE.Vector3();
    const toScr = new THREE.Vector3();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;

      if (t < 3) {
        const d = Math.exp(-2.5 * t);
        const b = Math.cos(t * 4.5) * d;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, b * 150, 0.1);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 750, 0.05);
        controls.target.y = THREE.MathUtils.lerp(controls.target.y, -100 + b * 80, 0.1);
      }

      controls.update();

      for (const s of stars) {
        s.el.style.opacity = String(0.5 + Math.sin(t * s.speed + s.phase) * 0.25 + 0.25);
      }

      camera.getWorldDirection(camDir);
      let best = -2;
      let bestI = -1;
      for (let i = 0; i < screenObjs.length; i++) {
        toScr.subVectors(screenObjs[i].position, camera.position).normalize();
        const dot = camDir.dot(toScr);
        if (dot > best) {
          best = dot;
          bestI = i;
        }
      }
      highlight(bestI);

      renderer.render(scene, camera);
    };
    loop();

    /* ── Resize ─────────────────────────────────────────────────── */
    const onResize = () => {
      camera.aspect = root.clientWidth / root.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(root.clientWidth, root.clientHeight);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      for (const [type, fn, target] of listeners) target.removeEventListener(type, fn);
      controls.dispose();
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement);
    };
  }, []);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div
      ref={rootRef}
      onClick={() => {
        if (!document.pointerLockElement && rootRef.current)
          rootRef.current.requestPointerLock();
      }}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 40%,#0a0f1e 0%,#020208 60%,#000002 100%)",
        position: "relative",
        cursor: "crosshair",
      }}
    >
      {/* Keyframes — injected once */}
      <style>{`@keyframes oFadeIn{from{opacity:0}to{opacity:1}}@keyframes oPopIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 5,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* HUD — branding */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 0,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "'Segoe UI',system-ui,sans-serif",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "rgba(16,185,129,0.5)",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          🌍 Sustainable Future
        </div>
      </div>

      {/* HUD — hint pill */}
      <div
        ref={hintRef}
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "'Segoe UI',system-ui,sans-serif",
          transition: "opacity 0.4s ease",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            padding: "10px 24px",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
            Click to lock mouse · Look around · Click a screen to open it
          </span>
        </div>
      </div>

      {/* Bottom glow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "40%",
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to top,rgba(16,185,129,0.03) 0%,transparent 100%)",
        }}
      />

      {/* ═══ Overlay ═══ */}
            {overlay && (
              <div
                onClick={() => { setOverlay(null); setTimeout(() => lockRef.current(), 50); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            cursor: "pointer",
            animation: "oFadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90vw",
              maxWidth: 1200,
              height: "85vh",
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              border: `2px solid ${overlay.color}88`,
              boxShadow: `0 0 60px ${overlay.color}33,0 20px 80px rgba(0,0,0,0.8)`,
              animation: "oPopIn 0.25s ease",
              cursor: "default",
            }}
          >
            <button
              onClick={() => { setOverlay(null); setTimeout(() => lockRef.current(), 50); }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "1.2rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                padding: "12px 20px",
                background:
                  "linear-gradient(to top,rgba(0,0,0,0.7),transparent)",
                fontFamily: "'Segoe UI',system-ui,sans-serif",
                fontSize: "0.85rem",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: overlay.color,
                textAlign: "center",
              }}
            >
              {overlay.label}
            </div>

            <iframe
              src={overlay.url}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "#06060a",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
