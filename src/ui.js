// UI helpers: overlays, messages, controller/keyboard overlays
export function createUI() {
  // message box
  const msg = document.createElement('div');
  msg.id = 'gameMessage';
  Object.assign(msg.style, {
    position: 'fixed',
    left: '50%',
    top: '8%',
    transform: 'translateX(-50%)',
    padding: '10px 16px',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    borderRadius: '8px',
    display: 'none',
    zIndex: 60,
    fontFamily: 'system-ui,Segoe UI,Roboto'
  });
  document.body.appendChild(msg);

  function showMessage(text, ms = 2500) {
    msg.textContent = text;
    msg.style.display = 'block';
    if (ms > 0) setTimeout(() => { msg.style.display = 'none'; }, ms);
  }

  // key overlay (re-usable)
  const keyOverlay = document.createElement('div');
  keyOverlay.id = 'keyOverlay';
  Object.assign(keyOverlay.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    zIndex: 50,
    padding: '10px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    borderRadius: '8px',
    display: 'none',
    fontFamily: 'system-ui,Segoe UI,Roboto',
    fontSize: '13px'
  });
  keyOverlay.innerHTML = `<strong>Keyboard</strong><div style="margin-top:6px;line-height:1.4">
    W/A/S/D or Arrows: Move<br/>
    Mouse / Left Stick: Look<br/>
    Right Stick: Walk (gamepad)<br/>
    Q: Toggle flashlight<br/>
    E: Interact / Pet<br/>
    Click: Toggle flashlight
  </div>`;
  document.body.appendChild(keyOverlay);

  // controller overlay
  const controllerOverlay = document.createElement('div');
  controllerOverlay.id = 'controllerOverlay';
  Object.assign(controllerOverlay.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: 50,
    padding: '10px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    borderRadius: '8px',
    display: 'none',
    fontFamily: 'system-ui,Segoe UI,Roboto',
    fontSize: '13px'
  });
  controllerOverlay.innerHTML = `<strong>Controller</strong><div style="margin-top:6px;line-height:1.4">
    Left stick: Look<br/>
    Right stick: Move<br/>
    B: Toggle flashlight<br/>
    A: Interact / Pet
  </div>`;
  document.body.appendChild(controllerOverlay);

  let overlayTimer = null;
  function showKeyOverlay(timeout = 2500) {
    keyOverlay.style.display = 'block';
    controllerOverlay.style.display = 'none';
    if (overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => { keyOverlay.style.display = 'none'; overlayTimer = null; }, timeout);
  }
  function showControllerOverlay(timeout = 2500) {
    controllerOverlay.style.display = 'block';
    keyOverlay.style.display = 'none';
    if (overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => { controllerOverlay.style.display = 'none'; overlayTimer = null; }, timeout);
  }

  return {
    showMessage,
    showKeyOverlay,
    showControllerOverlay
  };
}
