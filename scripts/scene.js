import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, player;

export function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20232a);

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(3, 3, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // Ground using a placeholder texture in assets/textures
  const texUrl = './assets/textures/placeholder.jpg';
  const loader = new THREE.TextureLoader();
  loader.load(texUrl, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: tex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }, undefined, () => {
    // fallback ground if texture missing
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
  });

  // Simple player cube placeholder
  player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x66ccff, metalness: 0.1, roughness: 0.6 })
  );
  player.position.y = 0.8;
  scene.add(player);

  // Resize handling
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { scene, camera, renderer, player };
}

let rafId;
export function startLoop() {
  const animate = (t = 0) => {
    rafId = requestAnimationFrame(animate);
    if (player) player.rotation.y = Math.sin(t / 1000) * 0.2;
    renderer.render(scene, camera);
  };
  animate();
}

export function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
}
