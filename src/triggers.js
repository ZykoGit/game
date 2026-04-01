// scans loaded map for '|' and '-' tiles and creates trigger volumes.
// Exports: createTriggerSystem(scene, map, tileSize, onJumpscareStart)
import * as THREE from 'three';

export function createTriggerSystem(scene, map, tileSize = 2, onJumpscareStart = () => {}) {
  const rows = map.rows || [];
  const triggers = [];

  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const t = rows[y][x];
      if (t === '|' || t === '-') {
        const wx = (x - rows[y].length / 2) * tileSize;
        const wz = (y - rows.length / 2) * tileSize;
        const height = 2.6;
        // thin box between walls depending on orientation
        const size = t === '|' ? new THREE.Vector3(0.2, height, tileSize * 1.8) : new THREE.Vector3(tileSize * 1.8, height, 0.2);
        const center = new THREE.Vector3(wx, height / 2, wz);
        const box = new THREE.Box3().setFromCenterAndSize(center, size);
        triggers.push({
          id: `${x}:${y}`,
          box,
          orientation: t,
          active: true,
          lastTriggered: 0
        });
      }
    }
  }

  // schedule and manage jumpscare state
  let inJumpscare = false;
  let jumpscareTimer = 0;

  function scheduleJumpscare(orientation, delayMs = 500 + Math.random() * 3500) {
    // don't schedule if already in jumpscare
    if (inJumpscare) return;
    setTimeout(() => {
      // double-check not in jumpscare
      if (inJumpscare) return;
      inJumpscare = true;
      jumpscareTimer = 0;
      onJumpscareStart({ orientation });
    }, delayMs);
  }

  function update(dt, playerPos) {
    // check triggers
    for (const tr of triggers) {
      if (!tr.active) continue;
      if (tr.box.containsPoint(playerPos)) {
        tr.active = false; // one-shot by default
        tr.lastTriggered = performance.now();
        scheduleJumpscare(tr.orientation);
      }
    }

    // manage jumpscare global timer (external code should set inJumpscare false when done)
    if (inJumpscare) {
      jumpscareTimer += dt;
      // safety: if jumpscare lasts > 6s, auto-clear
      if (jumpscareTimer > 6) {
        inJumpscare = false;
        jumpscareTimer = 0;
      }
    }
  }

  function clearAll() {
    triggers.length = 0;
  }

  function resetTriggers() {
    for (const t of triggers) {
      t.active = true;
      t.lastTriggered = 0;
    }
  }

  return {
    triggers,
    update,
    scheduleJumpscare,
    isInJumpscare: () => inJumpscare,
    endJumpscare: () => { inJumpscare = false; jumpscareTimer = 0; },
    clearAll,
    resetTriggers
  };
}
