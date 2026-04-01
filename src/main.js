// client/src/main.js
import { initRenderer, resizeHandler } from './renderer.js';
import { loadMap } from './map-loader.js';
import { AudioSystem } from './audio.js';
import { createPlayer } from './player.js';
import { Hider, Jumper, Stare, Pet } from './monsters.js';

const canvas = document.getElementById('c');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

const { scene, camera, renderer, controls } = initRenderer(canvas);
const audio = new AudioSystem();

// create player but do not start update loop yet
const playerObj = createPlayer(scene, camera, controls, audio);

// monster list (populated after map load)
let monsters = [];
let running = false;
let loopHandle = null;

async function setupLevel(mapUrl = 'maps/map1.json') {
  // clear previous monsters if any
  monsters.forEach(m => { if (m.mesh && m.scene) m.scene.remove(m.mesh); });
  monsters = [];

  const map = await loadMap(mapUrl, scene);
  const tile = map.tileSize || 2;
  const rows = map.rows || [];

  // spawn monsters from map.spawns
  for (const [type, list] of Object.entries(map.spawns || {})) {
    for (const s of list) {
      const x = (s.x - (rows[0]?.length || 0) / 2) * tile;
      const z = (s.y - (rows.length || 0) / 2) * tile;
      if (type === 'HIDER') monsters.push(new Hider(scene, x, z));
      if (type === 'JUMPER') monsters.push(new Jumper(scene, x, z));
      if (type === 'STARE') monsters.push(new Stare(scene, x, z));
      if (type === 'PET') monsters.push(new Pet(scene, x, z));
    }
  }

  return map;
}

function startGameLoop() {
  if (running) return;
  running = true;
  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // update player
    playerObj.update(dt);

    // update monsters (pass player camera and state)
    for (const m of monsters) {
      // pass a small API expected by monsters: { camera, state: playerObj.state, audio }
      m.update(dt, { camera: playerObj.camera, state: playerObj.state, audio });
    }

    renderer.render(scene, camera);

    // death check
    if (playerObj.state.health <= 0) {
      running = false;
      // redirect to you-win.html with dead flag
      window.location.href = 'you-win.html?dead=1';
      return;
    }

    loopHandle = requestAnimationFrame(loop);
  }

  loopHandle = requestAnimationFrame(loop);
}

function stopGameLoop() {
  if (loopHandle) cancelAnimationFrame(loopHandle);
  running = false;
}

// Start sequence: resume audio, lock pointer (if available), load map, then start loop
async function startSequence() {
  // prevent double start
  startBtn.disabled = true;

  // resume audio context on user gesture
  try {
    if (audio && audio.ctx && audio.ctx.state === 'suspended') await audio.ctx.resume();
  } catch (e) {
    // ignore
  }

  // hide overlay UI
  if (overlay) overlay.style.display = 'none';

  // load map and spawn monsters
  await setupLevel('maps/map1.json');

  // attempt pointer lock; if not available or user denies, still start
  let pointerLocked = false;
  const onLock = () => {
    pointerLocked = true;
    controls.removeEventListener('lock', onLock);
    controls.removeEventListener('unlock', onUnlock);
    startGameLoop();
  };
  const onUnlock = () => {
    // if user unlocks before we started, still start the loop (useful for mobile)
    controls.removeEventListener('lock', onLock);
    controls.removeEventListener('unlock', onUnlock);
    if (!running) startGameLoop();
  };

  // If PointerLockControls is present and supports lock, use it
  if (controls && typeof controls.lock === 'function') {
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    // request lock; browsers require this to be called from a user gesture (we are in click handler)
    try {
      controls.lock();
      // Some browsers immediately fire lock event; if not, set a fallback timeout
      setTimeout(() => {
        if (!pointerLocked && !running) {
          // fallback: start anyway (useful for mobile or denied pointer lock)
          controls.removeEventListener('lock', onLock);
          controls.removeEventListener('unlock', onUnlock);
          startGameLoop();
        }
      }, 800);
    } catch (e) {
      // pointer lock request failed synchronously; just start
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      startGameLoop();
    }
  } else {
    // no pointer lock support (mobile or minimal environment) — start immediately
    startGameLoop();
  }
}

// Attach start button handler
if (startBtn) {
  startBtn.addEventListener('click', async () => {
    // ensure the audio context is resumed and then start
    await startSequence();
  });
}

// Resize handling
window.addEventListener('resize', () => resizeHandler(renderer, camera));

// Expose for debugging
window.__lostInStatic = {
  startSequence,
  stopGameLoop,
  getState: () => ({ running, monstersCount: monsters.length })
};
