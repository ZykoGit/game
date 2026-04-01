// simple interaction system: register interactables and handle 'player-interact' events
import * as THREE from 'three';

export function createInteractionSystem() {
  const interactables = [];

  function register(obj) {
    // obj: { id, position: THREE.Vector3, range: number, onInteract: fn }
    interactables.push(obj);
    return obj;
  }

  function unregister(obj) {
    const i = interactables.indexOf(obj);
    if (i >= 0) interactables.splice(i, 1);
  }

  // listen for global player-interact events (fired by player module)
  window.addEventListener('player-interact', (e) => {
    const payload = e.detail || {};
    const playerPos = payload.playerPos || window.__playerPos || new THREE.Vector3();
    let best = null;
    let bestDist = Infinity;
    for (const it of interactables) {
      const d = it.position.distanceTo(playerPos);
      if (d <= (it.range || 1.8) && d < bestDist) {
        best = it; bestDist = d;
      }
    }
    if (best && typeof best.onInteract === 'function') best.onInteract(payload);
  });

  return { register, unregister, list: interactables };
}
