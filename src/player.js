// client/src/player.js
import * as THREE from 'three';

/*
  createPlayer(scene, camera, controls, audio)
  - Adds keyboard + gamepad controls
  - Q toggles flashlight (keyboard)
  - B toggles flashlight (gamepad button index 1)
  - Left stick (axes 0,1) controls look (yaw/pitch)
  - Right stick (axes 2,3) controls movement (walk)
  - Click still toggles flashlight
  - Returns { state, update, camera, controls }
*/

export function createPlayer(scene, camera, controls, audio){
  const state = {
    health: 100,
    petMeter: 100,
    flashlightOn: true,
    pos: camera.position
  };

  // flashlight (spot light attached to camera)
  const spot = new THREE.SpotLight(0xfff8d6, 2, 12, Math.PI/8, 0.6);
  spot.position.set(0, 0, 0);
  camera.add(spot);
  spot.visible = state.flashlightOn;
  scene.add(camera);

  // crosshair
  const ch = document.createElement('div');
  ch.className = 'crosshair';
  document.body.appendChild(ch);

  // keyboard movement
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    // keyboard toggle for flashlight
    if (e.code === 'KeyQ') {
      state.flashlightOn = !state.flashlightOn;
      spot.visible = state.flashlightOn;
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // mouse / click toggle (existing)
  window.addEventListener('click', () => {
    state.flashlightOn = !state.flashlightOn;
    spot.visible = state.flashlightOn;
    // ensure audio context resumed on user gesture
    if (audio && audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  });

  // Gamepad state tracking to detect button presses
  let prevGamepadButtons = [];

  // movement / look parameters
  const walkSpeed = 2.2;           // meters per second
  const keyboardWalkSpeed = 2.2;
  const lookSpeed = 2.6;           // radians per second per axis unit
  const gamepadDeadzone = 0.18;
  const maxPitch = Math.PI / 2 - 0.05;
  const minPitch = -Math.PI / 2 + 0.05;

  // footstep timing
  let lastStep = 0;

  // helper: apply deadzone
  function applyDeadzone(v, dz) {
    if (Math.abs(v) < dz) return 0;
    return (Math.abs(v) - dz) / (1 - dz) * (v > 0 ? 1 : -1);
  }

  // update loop called from main
  function update(dt){
    // --- GAMEPAD INPUT ---
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    let gpAxes = [0,0,0,0];
    let gpButtons = [];
    if (gp) {
      gpAxes = gp.axes.slice(0,4).map(a => (a === undefined ? 0 : a));
      gpButtons = gp.buttons.map(b => (typeof b === 'object' ? b.pressed : !!b));
    }

    // detect B button press (standard mapping: button index 1)
    if (gpButtons.length > 1) {
      const bPressed = gpButtons[1];
      const prevB = prevGamepadButtons[1] || false;
      if (bPressed && !prevB) {
        // toggle flashlight on B press
        state.flashlightOn = !state.flashlightOn;
        spot.visible = state.flashlightOn;
        if (audio && audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
      }
    }
    prevGamepadButtons = gpButtons;

    // --- LOOK (left stick) ---
    // user requested: left stick makes you look around
    const leftX = applyDeadzone(gpAxes[0] || 0, gamepadDeadzone);
    const leftY = applyDeadzone(gpAxes[1] || 0, gamepadDeadzone);

    if (leftX !== 0 || leftY !== 0) {
      // yaw (rotate around Y) from leftX
      camera.rotation.y -= leftX * lookSpeed * dt;
      // pitch (rotate around X) from leftY
      camera.rotation.x -= leftY * lookSpeed * dt;
      // clamp pitch
      camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
    }

    // --- MOVEMENT (right stick + keyboard) ---
    // user requested: right stick makes you walk
    const rightX = applyDeadzone(gpAxes[2] || 0, gamepadDeadzone);
    const rightY = applyDeadzone(gpAxes[3] || 0, gamepadDeadzone);

    // build movement vector from keyboard and right stick
    const moveVec = new THREE.Vector3();

    // keyboard WASD (traditional)
    if (keys['KeyW']) moveVec.z -= 1;
    if (keys['KeyS']) moveVec.z += 1;
    if (keys['KeyA']) moveVec.x -= 1;
    if (keys['KeyD']) moveVec.x += 1;

    // right stick: vertical axis controls forward/back, horizontal controls strafe
    // note: gamepad Y is typically -1 up, +1 down; invert so pushing up moves forward
    if (rightY !== 0) moveVec.z += -rightY;
    if (rightX !== 0) moveVec.x += rightX;

    // normalize and apply speed
    if (moveVec.lengthSq() > 0.0001) {
      moveVec.normalize();
      // movement relative to camera orientation
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      // zero out Y so we stay on ground plane
      forward.y = 0; forward.normalize();
      right.y = 0; right.normalize();

      const worldMove = new THREE.Vector3();
      worldMove.addScaledVector(forward, moveVec.z * walkSpeed * dt);
      worldMove.addScaledVector(right, moveVec.x * walkSpeed * dt);

      camera.position.add(worldMove);

      // footsteps sound
      lastStep += dt;
      if (lastStep > 0.35) {
        if (audio && typeof audio.playFootstep === 'function') audio.playFootstep();
        lastStep = 0;
      }
    } else {
      // not moving: slowly reset step timer so first step plays quickly when moving again
      lastStep = Math.min(lastStep + dt, 0.35);
    }

    // --- PET METER DECAY ---
    state.petMeter = Math.max(0, state.petMeter - dt * 0.5);

    // --- HUD updates ---
    const hudHealth = document.querySelector('#hud #health span');
    const hudPet = document.querySelector('#hud #petMeter span');
    if (hudHealth) hudHealth.textContent = Math.floor(state.health);
    if (hudPet) hudPet.textContent = Math.floor(state.petMeter);

    // ensure HUD visible once started
    const hud = document.querySelector('#hud');
    if (hud) hud.hidden = false;
  }

  return { state, update, camera, controls };
}
