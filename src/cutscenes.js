// tiny cutscene / camera tween helper
// Exports: playSequence(items, ctx) where items = [{time:0, action:ctx=>{}}...]
// ctx typically contains { camera, audio, ui, controls, scene }
export function playSequence(items = [], ctx = {}) {
  const start = performance.now();
  let i = 0;
  let stopped = false;

  function tick() {
    if (stopped) return;
    const t = (performance.now() - start) / 1000;
    while (i < items.length && items[i].time <= t) {
      try { items[i].action(ctx); } catch (e) { console.warn('cutscene action error', e); }
      i++;
    }
    if (i < items.length) requestAnimationFrame(tick);
  }

  tick();

  return {
    stop() { stopped = true; }
  };
}

// simple camera lerp helper
export function lerpCamera(camera, from, to, duration = 1.0, onComplete = () => {}) {
  const start = performance.now();
  function step() {
    const now = performance.now();
    const t = Math.min(1, (now - start) / (duration * 1000));
    camera.position.lerpVectors(from.position, to.position, t);
    camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, t);
    if (t < 1) requestAnimationFrame(step);
    else onComplete();
  }
  step();
}
