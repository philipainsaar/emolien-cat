"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const LOGO_ORB_IMAGE_URL = "/almostmadeinjapan.png";

function drawImageCover(ctx, img, x, y, w, h) {
  const imageRatio = img.width / img.height;
  const boxRatio = w / h;

  let drawW = w;
  let drawH = h;

  if (imageRatio > boxRatio) {
    drawH = h;
    drawW = h * imageRatio;
  } else {
    drawW = w;
    drawH = w / imageRatio;
  }

  ctx.drawImage(
    img,
    x + (w - drawW) / 2,
    y + (h - drawH) / 2,
    drawW,
    drawH
  );
}

function makeTwoSidedLogoTexture(img) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#fff7fb");
  gradient.addColorStop(0.42, "#ffd7eb");
  gradient.addColorStop(1, "#e8ddff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawCircleLogo = (cx, cy, size) => {
    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();

    drawImageCover(ctx, img, cx - size / 2, cy - size / 2, size, size);

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 18;
    ctx.stroke();
  };

  // Front logo
  drawCircleLogo(canvas.width * 0.25, canvas.height * 0.5, 700);

  // Back logo, opposite side of globe
  drawCircleLogo(canvas.width * 0.75, canvas.height * 0.5, 700);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

export default function MissionLogoOrb() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let frame = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0, 5.7);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9ef, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
    keyLight.position.set(3.2, 4.2, 5.4);
    scene.add(keyLight);

    const pinkLight = new THREE.PointLight(0xff9fce, 4.2, 10);
    pinkLight.position.set(-3, 1.2, 3.8);
    scene.add(pinkLight);

    const blueLight = new THREE.PointLight(0xb7dcff, 3.2, 10);
    blueLight.position.set(3, -1.2, 4);
    scene.add(blueLight);

    const orbGroup = new THREE.Group();
    orbGroup.rotation.set(-0.08, -0.28, 0.04);
    scene.add(orbGroup);

    const globeGeometry = new THREE.SphereGeometry(1.72, 96, 64);

    const globeMaterial = new THREE.MeshPhysicalMaterial({
      color: "#fff2fa",
      roughness: 0.22,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });

    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    orbGroup.add(globe);

    const glassGeometry = new THREE.SphereGeometry(1.765, 96, 64);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.22,
      roughness: 0.02,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transmission: 0.22,
      thickness: 0.45,
      depthWrite: false,
    });

    const glassShell = new THREE.Mesh(glassGeometry, glassMaterial);
    orbGroup.add(glassShell);

    const loader = new THREE.ImageLoader();

    loader.load(
      LOGO_ORB_IMAGE_URL,
      (img) => {
        if (disposed) return;

        const texture = makeTwoSidedLogoTexture(img);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        globeMaterial.map = texture;
        globeMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn(`Could not load ${LOGO_ORB_IMAGE_URL}`);
      }
    );

    const resize = () => {
      const size = Math.max(1, Math.floor(canvas.clientWidth || 260));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);

      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      // Slow soft rotation
      orbGroup.rotation.y += delta * 0.32;
      orbGroup.rotation.x = -0.08 + Math.sin(elapsed * 0.6) * 0.025;
      orbGroup.rotation.z = 0.04 + Math.cos(elapsed * 0.45) * 0.018;
      orbGroup.position.y = Math.sin(elapsed * 0.85) * 0.035;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);

      globeGeometry.dispose();
      globeMaterial.map?.dispose();
      globeMaterial.dispose();

      glassGeometry.dispose();
      glassMaterial.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div className="missionLogoOrbWrap" aria-hidden="true">
      <canvas ref={canvasRef} className="missionLogoOrbCanvas" />
    </div>
  );
      }
