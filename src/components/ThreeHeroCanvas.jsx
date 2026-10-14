import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHeroCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 540;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Group for mouse parallax tilt
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Procedural 3D Glass Capsule (Pill)
    // CapsuleGeometry (radius, length, capSubdivisions, radialSegments)
    const capsuleGeo = new THREE.CapsuleGeometry(1.2, 2.2, 16, 32);
    capsuleGeo.rotateZ(Math.PI / 3.2);

    // Outer Glass Material
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.08,
      metalness: 0.1,
      ior: 1.52,
      thickness: 1.8,
      specularIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const capsuleMesh = new THREE.Mesh(capsuleGeo, glassMat);
    mainGroup.add(capsuleMesh);

    // 2. Interior Glowing Amber/Gold Caustic Core
    const coreGeo = new THREE.CapsuleGeometry(0.85, 1.8, 12, 24);
    coreGeo.rotateZ(Math.PI / 3.2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5b041,
      emissive: 0x8a4508,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.8,
      clearcoat: 0.8
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    capsuleMesh.add(coreMesh);

    // 3. Central Metallic Gold Seam Ring
    const ringGeo = new THREE.TorusGeometry(1.24, 0.08, 16, 64);
    ringGeo.rotateY(Math.PI / 2);
    ringGeo.rotateZ(Math.PI / 3.2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    capsuleMesh.add(ringMesh);

    // 4. Orbiting Iridescent Slanted Torus Ring
    const orbitTorusGeo = new THREE.TorusGeometry(2.3, 0.04, 16, 100);
    const orbitTorusMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x3b0764,
      emissiveIntensity: 0.4
    });
    const orbitTorus = new THREE.Mesh(orbitTorusGeo, orbitTorusMat);
    orbitTorus.rotation.x = Math.PI / 2.6;
    orbitTorus.rotation.y = Math.PI / 6;
    mainGroup.add(orbitTorus);

    // 5. Surrounding Volumetric Stardust Particle Cloud
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cGold = new THREE.Color(0xf5b041);
    const cViolet = new THREE.Color(0xa855f7);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mixed = Math.random() > 0.5 ? cGold : (Math.random() > 0.5 ? cViolet : cWhite);
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(245,176,65,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(canvas);
    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    mainGroup.add(particles);

    // Studio Lights Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 3.5);
    keyLight.position.set(5, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xa855f7, 4.5, 20);
    rimLight.position.set(-5, -3, -3);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xf5b041, 4.0, 20);
    warmLight.position.set(4, -4, 3);
    scene.add(warmLight);

    // Smooth Mouse Tracking
    let targetRotX = 0;
    let targetRotY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotY = mouseX * 0.45;
      targetRotX = -mouseY * 0.35;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 540;
      const newH = container.clientHeight || 340;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Idle levitation & gentle rotation
      capsuleMesh.rotation.y += delta * 0.4;
      capsuleMesh.position.y = Math.sin(time * 1.5) * 0.12;

      orbitTorus.rotation.z += delta * 0.25;
      particles.rotation.y += delta * 0.08;

      // Smooth exponential damping to mouse position
      mainGroup.rotation.y += (targetRotY - mainGroup.rotation.y) * 0.06;
      mainGroup.rotation.x += (targetRotX - mainGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      capsuleGeo.dispose();
      glassMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      orbitTorusGeo.dispose();
      orbitTorusMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '340px',
        position: 'relative',
        cursor: 'grab'
      }} 
    />
  );
}
