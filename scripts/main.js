import { initScene, startLoop } from './scene.js';

const { scene, camera, renderer } = initScene();

// Example: load a model if present
import { loadGLTF } from './loaders/gltfLoader.js';

(async () => {
  try {
    const gltf = await loadGLTF('./assets/models/player.glb');
    if (gltf && gltf.scene) {
      gltf.scene.position.set(0, 0, 0);
      scene.add(gltf.scene);
    }
  } catch (err) {
    // model optional; ignore if missing
    console.warn('No model loaded or load failed', err);
  }

  startLoop();
})();
