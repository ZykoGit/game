// client/src/main.js
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

async function boot() {
  try {
    const canvas = document.getElementById('c');
    const startBtn = document.getElementById('startBtn');
    const overlay = document.getElementById('overlay');

    if (!canvas) throw new Error('Canvas element (#c) not found in DOM.');
    if (!startBtn) throw new Error('Start button (#startBtn) not found in DOM.');

    const { scene, camera, renderer, controls } = initRenderer(canvas);
    const audio = new AudioSystem();
    const ui = createUI();
    const interactions = createInteractionSystem();
    const playerObj = createPlayer(scene, camera, controls, audio);

    // state
    let monsters = [];
    let triggers = null;
    let running = false;
    let loopHandle = null;
    let currentMap = null;

    // helper functions (same as before, trimmed for brevity)
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
            interactions.register({
              id: s.id || `pet-${x}-${z}`,
              position: pet.mesh.position.clone(),
              range: 2.0,
              onInteract: () => {
                playerObj.state.petMeter = Math.min(100, playerObj.state.petMeter + 30);
                ui.showMessage('You pet the creature. It purrs.', 1500);
              }
            });
          }
        }
      }
    }

    function onJumpscareStart({ orientation }) {
      if (!triggers) return;
      triggers.endJumpscare = () => {}; // defensive
      ui.showMessage('Something moves in the dark...', 1200);
      try { audio.playJumpscare(); } catch (e) { console.warn('Audio play failed', e); }
      // quick camera nudge
      const originalPos = camera.position.clone();
      const forward = new THREE.Vector3(0, 0, -0.6).applyQuaternion(camera.quaternion);
      const scarePos = originalPos.clone().add(forward);
      lerpCamera(camera, { position: originalPos, quaternion: camera.quaternion.clone() }, { position: scarePos, quaternion: camera.quaternion.clone() }, 0.12, () => {
        lerpCamera(camera, { position: scarePos, quaternion: camera.quaternion.clone() }, { position: originalPos, quaternion: camera.quaternion.clone() }, 0.18, () => {
          if (triggers && typeof triggers.endJumpscare === 'function') triggers.endJumpscare();
        });
      });
      // spawn a jumper safely
      try {
        const j = new Jumper(scene, camera.position.x + (Math.random() - 0.5) * 2, camera.position.z - 2.2);
        monsters.push(j);
        j.startChase({ camera, state: playerObj.state });
      } catch (e) { console.warn('Failed to spawn jumper', e); }
    }

    async function setupLevel(mapUrl = 'maps/map-editor-sample.json') {
      try {
        monsters.forEach(m => { if (m.mesh && m.scene) m.scene.remove(m.mesh); });
        monsters = [];
        if (triggers && typeof triggers.clearAll === 'function') triggers.clearAll();

        const map = await loadMap(mapUrl, scene);
        currentMap = map;
        spawnMonstersFromMap(map);

        triggers = createTriggerSystem(scene, map, map.tileSize || SETTINGS.tileSize, onJumpscareStart);

        // place player at spawn
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
      } catch (err) {
        console.error('setupLevel failed:', err);
        ui.showMessage('Failed to load level. Check console/network.', 4000);
        throw err;
      }
    }

    function startGameLoop() {
      if (running) return;
      running = true;
      let last = performance.now();
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        try {
          playerObj.update(dt);
          if (triggers) triggers.update(dt, camera.position.clone());
          for (const m of monsters) { try { m.update(dt, { camera, state: playerObj.state, audio }); } catch (e) { console.warn(e); } }
          renderer.render(scene, camera);
          // win check
          if (currentMap) {
            const rows = currentMap.rows || [];
            const tile = currentMap.tileSize || SETTINGS.tileSize;
            for (let y = 0; y < rows.length; y++) {
              for (let x = 0; x < rows[y].length; x++) {
                if (rows[y][x] === 'E') {
                  const wx = (x - rows[y].length / 2) * tile;
                  const wz = (y - rows.length / 2) * tile;
                  const d = Math.hypot(camera.position.x - wx, camera.position.z - wz);
                  if (d < 1.2) { running = false; window.location.href = 'you-win.html'; return; }
                }
              }
            }
          }
          if (playerObj.state.health <= 0) { running = false; window.location.href = 'you-win.html?dead=1'; return; }
        } catch (err) {
          console.error('Game loop error:', err);
          running = false;
        }
        loopHandle = requestAnimationFrame(loop);
      }
      loopHandle = requestAnimationFrame(loop);
    }

    async function startSequence() {
      startBtn.disabled = true;
      try { if (audio && audio.ctx && audio.ctx.state === 'suspended') await audio.ctx.resume(); } catch (e) { console.warn('Audio resume failed', e); }
      if (overlay) overlay.style.display = 'none';
      await setupLevel('maps/map-editor-sample.json');

      playSequence([
        { time: 0.0, action: ({ ui }) => ui.showMessage('You wake up in a humming maze.', 2000) },
        { time: 1.6, action: ({ ui }) => ui.showMessage('Your flashlight buzzes. Stay quiet.', 2000) }
      ], { ui });

      // pointer lock attempt with fallback
      let pointerLocked = false;
      const onLock = () => { pointerLocked = true; controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock); startGameLoop(); };
      const onUnlock = () => { controls.removeEventListener('lock', onLock); controls.removeEventListener('unlock', onUnlock); if (!running) startGameLoop(); };

      if (controls && typeof controls.lock === 'function') {
        controls.addEventListener('lock', onLock);
        controls.addEventListener('unlock', onUnlock);
        try {
          controls.lock();
          // fallback start if lock not granted quickly
          setTimeout(() => {
            if (!pointerLocked && !running) {
              controls.removeEventListener('lock', onLock);
              controls.removeEventListener('unlock', onUnlock);
              startGameLoop();
            }
          }, 900);
        } catch (e) {
          console.warn('Pointer lock request failed:', e);
          controls.removeEventListener('lock', onLock);
          controls.removeEventListener('unlock', onUnlock);
          startGameLoop();
        }
      } else {
        startGameLoop();
      }
    }

    // Attach start button handler (defensive)
    startBtn.addEventListener('click', async (ev) => {
      try {
        console.log('Start button clicked');
        await startSequence();
      } catch (err) {
        console.error('startSequence error:', err);
        startBtn.disabled = false;
      }
    });

    // helpful debug: show console hint if nothing happens
    console.log('Game initialized. Click Start to begin. If nothing happens, open DevTools Console.');

    // resize
    window.addEventListener('resize', () => resizeHandler(renderer, camera));

    // expose for debugging
    window.__lostInStatic = { startSequence, setupLevel, getState: () => ({ running, monstersCount: monsters.length }) };

  } catch (err) {
    console.error('Boot failed:', err);
    alert('Initialization error. See console for details.');
  }
}

// ensure DOM is ready before booting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
