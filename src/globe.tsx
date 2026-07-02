import * as THREE from "three";
import { useEffect, useRef, useCallback, useState } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useNavigate } from "react-router-dom";

function create_stars() {
  const starCount = 4000;
  const starPosition = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 50 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(theta) * Math.sin(phi);

    starPosition[i * 3] = x;
    starPosition[i * 3 + 1] = y;
    starPosition[i * 3 + 2] = z;
  }

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
  });

  const starGeometry = new THREE.BufferGeometry();

  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPosition, 3),
  );

  const layout = new THREE.Points(starGeometry, starMaterial);

  return { layout, starGeometry, starMaterial };
}
function createEarth() {
  const loader = new THREE.TextureLoader();

  // 1. Create the Core Earth Mesh
  const earthGeometry = new THREE.SphereGeometry(1, 48, 48);
  const earthMaterial = new THREE.MeshBasicMaterial({
    map: loader.load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    ),
  });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);

  // 2. Create the Atmosphere Mesh
  const atmosGeometry = new THREE.SphereGeometry(1.03, 48, 48);
  const atmosMaterial = new THREE.MeshBasicMaterial({
    color: 0x66aaff,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(atmosGeometry, atmosMaterial);

  // 3. Group them together
  const earthGroup = new THREE.Group();
  earthGroup.add(earth);
  earthGroup.add(atmosphere);

  // Return everything so we can animate and clean up memory later
  return {
    earthGroup,
    earth,
    atmosphere,
    earthGeometry,
    earthMaterial,
    atmosGeometry,
    atmosMaterial,
  };
}

export default function Globe() {
  const Refcontainer = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setIsTransitioning(true);
      setTimeout(() => navigate("/explore-world"), 600);
    },
    [navigate, setIsTransitioning],
  );

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const container = Refcontainer.current;

    if (!container) {
      return;
    }

    container.addEventListener("contextmenu", handleContextMenu);

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x060612);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );

    camera.position.set(0, 0.3, 2.8);

    const { layout, starGeometry, starMaterial } = create_stars();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(2);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(layout);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    const {
      earthGroup,
      earth,
      atmosphere,
      earthGeometry,
      earthMaterial,
      atmosGeometry,
      atmosMaterial,
    } = createEarth();
    scene.add(earthGroup);

    let animationID: number;
    const animate = () => {
      animationID = requestAnimationFrame(animate);
      controls.update();

      layout.rotation.y += 0.0002;
      earth.rotation.y += 0.001;
      atmosphere.rotation.y += 0.0001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationID);

      starGeometry.dispose();
      renderer.dispose();
      starMaterial.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosGeometry.dispose();
      atmosMaterial.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      container.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleContextMenu]);

  return (
    <div
      style={{
        overflowY: "scroll",
        height: "100vh",
        scrollSnapType: "y mandatory",
        position: "relative",
      }}
    >
      {/* Arrow bounce keyframes */}
      <style>{`
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }
      `}</style>
      {/* Globe Section — full viewport */}
      <div
        ref={Refcontainer}
        style={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          scrollSnapAlign: "start",
        }}
      >
        {/* Title Overlay */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            fontFamily: "sans-serif",
            pointerEvents: "none",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: "normal",
              letterSpacing: "1px",
              color: "rgba(255, 255, 255, 0.6)",
              textTransform: "uppercase",
            }}
          >
            Earth
          </h1>
          <div
            style={{
              fontSize: "0.9rem",
              letterSpacing: "1px",
              color: "rgba(255, 255, 255, 0.6)",
              marginTop: "4px",
            }}
          >
            Interactive Globe
          </div>
        </div>

        {/* Down Arrow to scroll to About section */}
        <div
          onClick={scrollToAbout}
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "pointer",
            zIndex: 10,
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "1.8rem",
            fontFamily: "sans-serif",
            animation: "arrowBounce 2s ease-in-out infinite",
            userSelect: "none",
            transition: "color 0.3s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")
          }
        >
          ↓
        </div>

        {/* Bottom Hint Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            width: "100%",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.6)",
            fontFamily: "sans-serif",
            fontSize: "0.9rem",
            letterSpacing: "1px",
            pointerEvents: "none",
          }}
        >
          Drag to rotate • Scroll to zoom • Right-click to explore
        </div>

        {/* Transition Overlay — fades to black on right-click */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            pointerEvents: isTransitioning ? "auto" : "none",
            background: "rgba(0,0,0,0.92)",
            opacity: isTransitioning ? 1 : 0,
            transition: "opacity 0.55s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              opacity: isTransitioning ? 1 : 0,
              transition: "opacity 0.35s ease 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "1.6rem",
                marginBottom: "12px",
                letterSpacing: "6px",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 200,
                textTransform: "uppercase",
              }}
            >
              Explore World
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "3px",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Loading experience…
            </div>
          </div>
        </div>
      </div>

      {/* About Me Section — full viewport, snaps into place */}
      <div
        ref={aboutRef}
        style={{
          width: "100%",
          height: "100vh",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          scrollSnapAlign: "start",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{ maxWidth: "700px", textAlign: "center", padding: "0 20px" }}
        >
          <h2
            style={{
              fontSize: "2.5rem",
              fontWeight: 300,
              margin: "0 0 16px",
              color: "#222",
              letterSpacing: "2px",
            }}
          >
            About Me
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: "1.8",
              color: "#666",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            A simple placeholder for my story.
          </p>
        </div>
      </div>
    </div>
  );
}
