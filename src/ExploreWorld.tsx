import * as THREE from "three";
import { useEffect, useRef } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/addons/renderers/CSS3DRenderer.js";

const screenData = [
  { label: "About Us", url: "/cities.html" },
  { label: "The More You Know", url: "/aboutus.html" },
  { label: "What Can You Do", url: "/what.html" },
];

export default function ExploreWorld() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const [width, height] = [container.clientWidth, container.clientHeight];
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
    camera.position.set(0, 320, 850);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.cssText =
      "position:absolute; top:0; pointer-events:auto;";
    container.appendChild(cssRenderer.domElement);

    const controls = new OrbitControls(camera, cssRenderer.domElement);
    Object.assign(controls, {
      target: new THREE.Vector3(0, -300, -100),
      enableZoom: false,
      enablePan: false,
      enableDamping: true,
      dampingFactor: 0.08,
      minAzimuthAngle: -1.0,
      maxAzimuthAngle: 1.0,
    });

    // ─── CSS3D Grid Floor ────────────────────────────────────────
    const floorSize = 4000;
    const floorGrid = document.createElement("div");
    floorGrid.style.cssText = `
			width: ${floorSize}px;
			height: ${floorSize}px;
			background-image:
				linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
				linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
			background-size: 80px 80px;
			background-position: center;
			mask-image: radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%);
			-webkit-mask-image: radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%);
		`;
    const floorObject = new CSS3DObject(floorGrid);
    floorObject.position.set(0, -320, 0); // Positioned safely below the screens
    floorObject.rotation.x = -Math.PI / 2; // Rotate flat onto the XZ plane
    scene.add(floorObject);

    // ─── Screen Layout ───────────────────────────────────────────
    const spread = 1.6;
    const startAngle = -spread / 2;
    const radius = 1150;

    screenData.forEach((data, index) => {
      const angle = startAngle + (index / (screenData.length - 1)) * spread;
      const frameWrapper = document.createElement("div");
      frameWrapper.style.cssText =
        "width:1024px; height:640px; position:relative; pointer-events:auto;";

      frameWrapper.insertAdjacentHTML(
        "beforeend",
        `
				<iframe src="${data.url}" style="width:1024px; height:640px; border:2px solid rgba(255,255,255,0.05); border-radius:20px; background-color:#06060a; box-shadow:0 40px 100px rgba(0,0,0,0.95);"></iframe>
				<div style="position:absolute; inset:0; cursor:pointer; z-index:10; pointer-events:auto;"></div>
			`,
      );

      frameWrapper.lastElementChild?.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        window.open(data.url, "_blank", "noopener,noreferrer");
      });

      const object3D = new CSS3DObject(frameWrapper);
      object3D.position.set(
        Math.sin(angle) * radius,
        0,
        -Math.cos(angle) * radius + 200,
      );
      object3D.lookAt(0, 0, 750);
      scene.add(object3D);
    });

    // ─── Animation Loop ──────────────────────────────────────────
    let animId: number;
    let time = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.016;

      if (time < 3) {
        const dropIn = Math.exp(-2.5 * time);
        const bounce = Math.cos(time * 4.5) * dropIn;

        camera.position.y = THREE.MathUtils.lerp(
          camera.position.y,
          0 + bounce * 150,
          0.1,
        );
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 750, 0.05);
        controls.target.y = THREE.MathUtils.lerp(
          controls.target.y,
          -100 + bounce * 80,
          0.1,
        );
      }

      controls.update();
      cssRenderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      cssRenderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      if (container.contains(cssRenderer.domElement))
        container.removeChild(cssRenderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#020204",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at center, rgba(25, 25, 40, 0.15) 0%, rgba(2, 2, 4, 0) 70%)",
        }}
      />
    </div>
  );
}
