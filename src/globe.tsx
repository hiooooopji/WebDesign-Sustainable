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
    
      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh || (object as THREE.Points).isPoints) {
          const renderable = object as THREE.Mesh | THREE.Points;
    
          renderable.geometry.dispose();
    
          const materials = Array.isArray(renderable.material)
            ? renderable.material
            : [renderable.material];
    
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) {
                value.dispose();
              }
            });
    
            material.dispose();
          });
        }
      });
    
      scene.clear();
      controls.dispose();
      renderer.dispose();
    
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleContextMenu]);
  return (
		<div ref={Refcontainer} style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
			<div style={{
				position: "absolute",
				bottom: "2rem",
				left: "50%",
				transform: "translateX(-50%)",
				color: "#94a3b8",
				fontFamily: "sans-serif",
				fontSize: "0.9rem",
				letterSpacing: "0.05em",
				pointerEvents: "none",
				textTransform: "uppercase",
				opacity: 0.8
			}}>
				Right click anywhere to explore
			</div>
		</div>
	);
}


