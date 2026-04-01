import { makeWallTexture, makeFloorTexture, makeCeilingTexture } from './assets.js';
export function initRenderer(canvas){
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.02);
  const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 200);
  camera.position.set(0,1.6,0);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  const controls = new THREE.PointerLockControls(camera, document.body);
  const amb = new THREE.AmbientLight(0x222222); scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.15); dir.position.set(1,2,1); scene.add(dir);
  // store textures for reuse
  scene.userData.textures = {
    wall: makeWallTexture(),
    floor: makeFloorTexture(),
    ceiling: makeCeilingTexture()
  };
  return { scene, camera, renderer, controls };
}
export function resizeHandler(renderer, camera){
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
