import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

const SCREENS = [
  { label: "Cities & Climate", url: "/cities.html", color: "#3b82f6" },
  { label: "The More You Know", url: "/aboutus.html", color: "#10b981" },
  { label: "What Can You Do", url: "/what.html", color: "#f59e0b" },
];

const CAM_START = [0, 320, 850] as const;
const CAM_TARGET = [0, -300, -100] as const;
const SENSITIVITY = 0.002;
const SPREAD = 1.6;
const SCREEN_DIST = 1150;
const STAR_COUNT = 250;

type Overlay = { url: string; label: string; color: string } | null;

const STAR_RGB: readonly [number, number, number][] = [
  [180, 220, 255], [140, 180, 255], [255, 230, 200],
];

const spherePos = (r: number): [number, number, number] => {
  const t = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  return [r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(t) * Math.sin(p)];
};

const makeObj = (css: string, pos: [number, number, number], look?: [number, number, number]) => {
  const el = document.createElement("div");
  el.style.cssText = css;
  const obj = new CSS3DObject(el);
  obj.position.set(...pos);
  if (look) obj.lookAt(...look);
  return obj;
};

export default function ExploreWorld() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const openOverlay = useRef(setOverlay);
  openOverlay.current = setOverlay;
  const lockRef = useRef(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const W = root.clientWidth, H = root.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 1, 5000);
    camera.position.set(...CAM_START);

    const renderer = new CSS3DRenderer();
    renderer.setSize(W, H);
    renderer.domElement.style.cssText = "position:absolute;top:0;pointer-events:auto;";
    root.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAM_TARGET);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -SPREAD / 2 - 0.2;
    controls.maxAzimuthAngle = SPREAD / 2 + 0.2;

    const stars: { el: HTMLDivElement; ph: number; sp: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const sz = 4 + Math.random() * 6;
      const a = 0.5 + Math.random() * 0.5;
      const [r, g, b] = STAR_RGB[i % STAR_RGB.length];
      const el = document.createElement("div");
      el.style.cssText = `width:szpx;height:szpx;border-radius:50%;pointer-events:none;background:rgba(r,g,b,a);box-shadow:0 0 ${sz*2}px rgba(r,g,b,a),0 0 ${sz*6}px rgba(r,g,b,${a*.6}),0 0 ${sz*14}px rgba(r,g,b,${a*.2});`;
      const obj = new CSS3DObject(el);
      obj.position.set(...spherePos(900 + Math.random() * 2000));
      scene.add(obj);
      stars.push({ el, ph: Math.random() * 6.28, sp: Math.random() * 2 + 0.5 });
    }

    const GM = "radial-gradient(circle,rgba(0,0,0,1) 15%,rgba(0,0,0,0.5) 40%,transparent 65%)";
    const floor = makeObj(
      `width:4000px;height:4000px;background-image:linear-gradient(rgba(16,185,129,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.06) 1px,transparent 1px);background-size:80px 80px;mask-image:GM;-webkit-mask-image:GM;`,
      [0, -320, 0]
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    scene.add(makeObj(
      "width:2400px;height:800px;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse at center,rgba(16,185,129,0.04) 0%,rgba(16,185,129,0.01) 40%,transparent 70%);",
      [0, -50, -400]
    ));

    const iframes: HTMLIFrameElement[] = [];
    const scrObjs: CSS3DObject[] = [];
    let active = -1;

    for (let i = 0; i < SCREENS.length; i++) {
      const s = SCREENS[i];
      const a = -SPREAD / 2 + (i / (SCREENS.length - 1)) * SPREAD;

      const wrap = document.createElement("div");
      wrap.style.cssText = "width:1024px;height:700px;position:relative;pointer-events:auto;display:flex;flex-direction:column;align-items:center;";

      const lbl = document.createElement("div");
      lbl.style.cssText = `position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);font-family:system-ui;font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${s.color};opacity:0.7;white-space:nowrap;text-shadow:0 0 20px ${s.color}44;`;
      lbl.textContent = s.label;

      const iframe = document.createElement("iframe");
      iframe.src = s.url;
      iframe.style.cssText = `width:1024px;height:640px;border:2px solid rgba(255,255,255,0.06);border-radius:20px;background:#06060a;box-shadow:0 4px 60px rgba(0,0,0,0.6),0 0 80px ${s.color}08;transition:border-color 0.4s,box-shadow 0.4s;`;

      const hit = document.createElement("div");
      hit.style.cssText = "position:absolute;top:0;left:0;width:1024px;height:640px;cursor:pointer;z-index:10;pointer-events:auto;border-radius:20px;";
      hit.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (document.pointerLockElement) document.exitPointerLock();
        openOverlay.current(s);
      });

      wrap.append(iframe, lbl, hit);
      iframes.push(iframe);

      const obj = new CSS3DObject(wrap);
      obj.position.set(Math.sin(a) * SCREEN_DIST, 0, -Math.cos(a) * SCREEN_DIST + 200);
      obj.lookAt(0, 0, 750);
      scene.add(obj);
      scrObjs.push(obj);
    }

    const lock = () => { if (!document.pointerLockElement) renderer.domElement.requestPointerLock(); };
    lockRef.current = lock;

    const listeners: [string, EventListenerOrEventListenerObject, EventTarget][] = [];
    const on = (t: EventTarget, e: string, fn: EventListenerOrEventListenerObject) => {
      t.addEventListener(e, fn); listeners.push([e, fn, t]);
    };

    on(renderer.domElement, "click", lock);
    on(document, "pointerlockchange", () => {
      const locked = !!document.pointerLockElement;
      controls.enableRotate = !locked;
      if (hintRef.current) hintRef.current.style.opacity = locked ? "0" : "1";
    });
    on(document, "mousemove", (e: Event) => {
      if (document.pointerLockElement) {
        controls.rotateLeft((e as MouseEvent).movementX * SENSITIVITY);
        controls.rotateUp((e as MouseEvent).movementY * SENSITIVITY);
      }
    });
    on(document, "mousedown", () => {
      if (document.pointerLockElement && active >= 0) {
        document.exitPointerLock();
        openOverlay.current(SCREENS[active]);
      }
    });

    const hl = (i: number) => {
      if (i === active) return;
      if (active >= 0) {
        iframes[active].style.border = "2px solid rgba(255,255,255,0.06)";
        iframes[active].style.boxShadow = "0 4px 60px rgba(0,0,0,0.6),0 0 80px rgba(16,185,129,0.03)";
      }
      active = i;
      if (i >= 0) {
        iframes[i].style.border = "2px solid rgba(16,185,129,0.8)";
        iframes[i].style.boxShadow = "0 0 50px rgba(16,185,129,0.3),0 0 120px rgba(16,185,129,0.1),0 40px 100px rgba(0,0,0,0.8)";
      }
    };

    let raf: number, t = 0;
    const cd = new THREE.Vector3(), ts = new THREE.Vector3();

    const loop = () => {
      raf = requestAnimationFrame(loop);
        t += 0.016;

      if (t < 3) {
        const d = Math.exp(-2.5 * t), b = Math.cos(t * 4.5) * d;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, b * 150, 0.1);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 750, 0.05);
        controls.target.y = THREE.MathUtils.lerp(controls.target.y, -100 + b * 80, 0.1);
      }

      controls.update();

      for (const s of stars) s.el.style.opacity = String(0.5 + Math.sin(t * s.sp + s.ph) * 0.25 + 0.25);

      camera.getWorldDirection(cd);
      let best = -2, bestI = -1;
      for (let i = 0; i < scrObjs.length; i++) {
        ts.subVectors(scrObjs[i].position, camera.position).normalize();
        const dot = cd.dot(ts);
        if (dot > best) { best = dot; bestI = i; }
      }
      hl(bestI);

      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      camera.aspect = root.clientWidth / root.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(root.clientWidth, root.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      for (const [e, fn, t] of listeners) t.removeEventListener(e, fn);
      controls.dispose();
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement);
    };
  }, []);

  const closeOverlay = () => { setOverlay(null); setTimeout(() => lockRef.current(), 50); };

  return (
    <div
      ref={rootRef}
      onClick={() => { if (!document.pointerLockElement && rootRef.current) rootRef.current.requestPointerLock(); }}
      style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", cursor: "crosshair", background: "radial-gradient(ellipse at 50% 40%,#0a0f1e 0%,#020208 60%,#000002 100%)" }}
    >
      <style>{`@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes pi{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", background: "radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.6) 100%)" }} />
      <div style={{ position: "absolute", top: 28, left: 0, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none", fontFamily: "system-ui" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(16,185,129,0.5)", letterSpacing: "3px", textTransform: "uppercase" }}>🌍 Sustainable Future</div>
      </div>
      <div ref={hintRef} style={{ position: "absolute", bottom: 40, left: 0, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none", fontFamily: "system-ui", transition: "opacity 0.4s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", padding: "10px 24px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>Click to lock · Look around · Click screen to open</span>
        </div>
      </div>
      {overlay && (
        <div onClick={closeOverlay} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", cursor: "pointer", animation: "fi 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "90vw", maxWidth: 1200, height: "85vh", position: "relative", borderRadius: 20, overflow: "hidden", border: `2px solid ${overlay.color}88`, cursor: "default", boxShadow: `0 0 60px ${overlay.color}33,0 20px 80px rgba(0,0,0,0.8)`, animation: "pi 0.25s ease" }}>
            <button onClick={closeOverlay} style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "12px 20px", background: "linear-gradient(to top,rgba(0,0,0,0.7),transparent)", fontFamily: "system-ui", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: overlay.color, textAlign: "center" }}>{overlay.label}</div>
            <iframe src={overlay.url} style={{ width: "100%", height: "100%", border: "none", background: "#06060a" }} />
          </div>
        </div>
      )}
    </div>
  );
}