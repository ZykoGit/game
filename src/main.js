import { initRenderer, resizeHandler } from './renderer.js';
import { loadMap } from './map-loader.js';
import { AudioSystem } from './audio.js';
import { createPlayer } from './player.js';
import { Hider, Jumper, Stare, Pet } from './monsters.js';
import { createTriggerSystem } from './triggers.js';
import { playSequence, lerpCamera } from './cutscenes.js';
import { createUI } from './ui.js';
import { createInteractionSystem } from './interactions.js';
import { SETTINGS } from './settings.js';

const canvas = document.getElementById('c');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

const { scene, camera, renderer, controls } = initRenderer(canvas);
const audio = new AudioSystem();
const ui = createUI();
const interactions = createInteractionSystem();

// create player but do not start update loop yet
const playerObj = createPlayer(scene, camera, controls, audio);

// global state
let monsters = [];
let triggers = null;
let running = false;
let loopHandle = null;
let currentMap = null;

// helper: spawn monsters from map.spawns
function spawnMonstersFromMap(map) {
  monsters.forEach(m => { if (m.mesh && m.scene) m.scene.remove(m.mesh); });
  monsters = [];
  const tile = map.tileSize || SETTINGS.tileSize;
  const rows = map.rows || [];
  for (const [type, list] of Object.entries(map.spawns || {})) {
    for (const s of list) {
      const x = (s.x - (rows[0]?.length || 0) / 2) * tile;
      const z = (s.y - (rows.length || 0) / 2) * tile;
      if (type === 'HIDER') monsters.push(new Hider(scene, x, z));
      if (type === 'JUMPER') monsters.push(new Jumper(scene, x, z));
      if (type === 'STARE') monsters.push(new Stare(scene, x, z));
      if (type === 'PET') {
        const pet = new Pet(scene, x, z);
        monsters.push(pet);
        // register pet for interactions
        interactions.register({
          id: s.id || `pet-${x}-${z}`,
          position: pet.mesh.position.clone(),
          range: 2.0,
          onInteract: () => {
            // petting restores petMeter
            playerObj.state.petMeter = Math.min(100, playerObj.state.petMeter + 30);
            ui.showMessage('You pet the creature. It purrs.', 1500);
          }
        });
      }
    }
  }
}

// schedule jumpscare handler
function onJumpscareStart({ orientation }) {
  // block chases while jumpscare is active
  triggers.isInJumpscare = () => true;
  ui.showMessage('Something moves in the dark...', 1200);
  audio.playJumpscare();
  // simple cutscene: flash camera forward/back quickly
  const originalPos = camera.position.clone();
  const forward = new THREE.Vector3(0, 0, -0.6).applyQuaternion(camera.quaternion);
  const scarePos = originalPos.clone().add(forward);
  // quick lerp to scarePos and back
  lerpCamera(camera, { position: originalPos, quaternion: camera.quaternion.clone() }, { position: scarePos, quaternion: camera.quaternion.clone() }, 0.12, () => {
    lerpCamera(camera, { position: scarePos, quaternion: camera.quaternion.clone() }, { position: originalPos, quaternion: camera.quaternion.clone() }, 0.18, () => {
      // end jumpscare
      triggers.endJumpscare();
    });
  });
  // optionally spawn a Jumper near player to start chase
  const j = new Jumper(scene, camera.position.x + (Math.random() - 0.5) * 2, camera.position.z - 2.2);
  monsters.push(j);
  j.startChase({ camera, state: playerObj.state });
}

// load map and initialize triggers
async function setupLevel(mapUrl = 'maps/map1.json') {
  // clear previous
  monsters.forEach(m => { if (m.mesh && m.scene) m.scene.remove(m.mesh); });
  monsters = [];
  if (triggers) triggers.clearAll();

  const map = await loadMap(mapUrl, scene);
  currentMap = map;
  spawnMonstersFromMap(map);

  // create triggers
  triggers = createTriggerSystem(scene, map, map.tileSize || SETTINGS.tileSize, onJumpscareStart);

  // find spawn tile and position player there
  const rows = map.rows || [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === 'S') {
        const wx = (x - rows[y].length / 2) * (map.tileSize || SETTINGS.tileSize);
        const wz = (y - rows.length / 2) * (map.tileSize || SETTINGS.tileSize);
        camera.position.set(wx, 1.6, wz);
      }
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

    // update triggers (pass player's foot position)
    if (triggers) triggers.update(dt, camera.position.clone());

    // update monsters
    for (const m of monsters) {
      try { m.update(dt, { camera, state: playerObj.state, audio }); } catch (e) { console.warn(e); }
    }

    renderer.render(scene, camera);

    // win check (E tile)
    if (currentMap) {
      const rows = currentMap.rows || [];
      const tile = currentMap.tileSize || SETTINGS.tileSize;
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          if (rows[y][x] === 'E') {
            const wx = (x - rows[y].length / 2) * tile;
            const wz = (y - rows.length / 2) * tile;
            const d = Math.hypot(camera.position.x - wx, camera.position.z - wz);
            if (d < 1.2) {
              running = false;
              window.location.href = 'you-win.html';
              return;
            }
          }
        }
      }
    }

    // death check
    if (playerObj.state.health <= 0) {
      running = false;
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
  startBtn.disabled = true;
  try { if (audio && audio.ctx && audio.ctx.state === 'suspended') await audio.ctx.resume(); } catch (e) {}
  if (overlay) overlay.style.display = 'none';
  await setupLevel('maps/map-editor-sample.json');

  // small intro cutscene
  playSequence([
    { time: 0.0, action: ({ ui }) => ui.showMessage('You wake up in a humming maze.', 2000) },
    { time: 1.6, action: ({ ui }) => ui.showMessage('Your flashlight buzzes. Stay quiet.', 2000) }
  ], { ui });

  // pointer lock attempt and start loop
  let pointerLocked = false;
  const onLock = () => { pointerLocked = true; controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock); startGameLoop(); };
  const onUnlock = () => { controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock); if (!running) startGameLoop(); };

  if (controls && typeof controls.lock === 'function') {
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);
    try {
      controls.lock();
      setTimeout(() => {
        if (!pointerLocked && !running) {
          controls.removeEventListener('lock', onLock);
          controls.removeEventListener('unlock', onUnlock);
          startGameLoop();
        }
      }, 800);
    } catch (e) {
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      startGameLoop();
    }
  } else {
    startGameLoop();
  }
}

// Attach start button handler
if (startBtn) {
  startBtn.addEventListener('click', async () => {
    await startSequence();
  });
}

// wire player-interact to interactions system (pet)
window.addEventListener('player-interact', (e) => {
  // include player position for interactions
  e.detail.playerPos = camera.position.clone();
});

// Resize handling
window.addEventListener('resize', () => resizeHandler(renderer, camera));

// Expose debug helpers
window.__lostInStatic = {
  startSequence,
  stopGameLoop,
  setupLevel,
  getState: () => ({ running, monstersCount: monsters.length, triggersCount: triggers ? triggers.triggers.length : 0 })
};
