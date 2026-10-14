import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 430">
<path fill="#000" d="M88 80 C88 57 105 40 128 40 H139 C162 40 179 57 179 80 V142 H365 C382 142 396 148 408 161 L431 185 L408 209 C396 222 382 228 365 228 H179 V310 C179 333 162 350 139 350 H128 C105 350 88 333 88 310 Z"/>
<path fill="#000" d="M320 350 C311 350 307 343 313 334 L490 65 C500 49 513 40 532 40 H580 C596 40 601 49 591 64 L424 326 C414 343 403 350 384 350 Z"/>
<path fill="none" stroke="#000" stroke-width="9" d="M647 58 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"/>
<path fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" d="M691 43 A17 17 0 1 0 691 73"/>
</svg>`;

export default function ThreeHeroCanvas() {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer, frame = 0, observer, disposed = false, scene;
    try {
      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.z = 13.8;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xa9bad4, 1.55));
      const key = new THREE.DirectionalLight(0xeaf6ff, 4.5); key.position.set(-4, 6, 8); scene.add(key);
      const cool = new THREE.PointLight(0x8586ff, 26, 18); cool.position.set(4, 1, 4); scene.add(cool);
      const gold = new THREE.PointLight(0xffbd68, 15, 15); gold.position.set(4, -3, 2); scene.add(gold);
      const blue = new THREE.PointLight(0x7bbdff, 18, 15); blue.position.set(-5, -1, 3); scene.add(blue);

      const data = new SVGLoader().parse(LOGO_SVG);
      const group = new THREE.Group();
      const face = new THREE.MeshPhysicalMaterial({ color: 0xb6c4d8, metalness: 0.84, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.13, side: THREE.DoubleSide });
      const sides = new THREE.MeshPhysicalMaterial({ color: 0x242b3c, metalness: 0.92, roughness: 0.24, clearcoat: 0.9, side: THREE.DoubleSide });
      for (const path of data.paths) {
        for (const shape of SVGLoader.createShapes(path)) {
          const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: 0.09, bevelThickness: 0.09, curveSegments: 24 });
          geometry.scale(1, -1, 1);
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, [face, sides]);
          mesh.position.z = -0.25;
          group.add(mesh);
        }
      }
      const bounds = new THREE.Box3().setFromObject(group);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 8.6 / Math.max(size.x, size.y);
      group.position.set(-center.x * scale, -center.y * scale, 0);
      group.scale.setScalar(scale);
      scene.add(group);

      const resize = () => {
        if (disposed) return;
        const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = w < 420 ? 15.8 : w < 700 ? 14.5 : 13.8;
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize); observer.observe(host); resize();
      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        const t = clock.getElapsedTime();
        group.rotation.y = Math.sin(t * 0.38) * 0.055;
        group.rotation.x = Math.sin(t * 0.48) * 0.012;
        group.position.y = -center.y * scale + Math.sin(t * 0.7) * 0.035;
        cool.intensity = 23 + (Math.sin(t * 0.8) + 1) * 4;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      animate();
    } catch (error) {
      console.error('HX 3D logo initialization failed:', error);
    }
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect();
      scene?.traverse(obj => {
        obj.geometry?.dispose();
        if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
      });
      renderer?.dispose(); renderer?.domElement?.remove();
    };
  }, []);
  return <div className="hx-hero-scene hx-webgl-scene" ref={hostRef} role="img" aria-label="Original HX logo rendered as animated metallic 3D" />;
}
