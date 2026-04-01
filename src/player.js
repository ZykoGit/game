import * as THREE from 'three';
export function createPlayer(scene, camera, controls, audio){
  const state = {health:100, petMeter:100, flashlightOn:true, pos:camera.position};
  // flashlight
  const spot = new THREE.SpotLight(0xfff8d6, 2, 12, Math.PI/8, 0.6);
  spot.position.set(0,0,0);
  camera.add(spot);
  spot.visible = state.flashlightOn;
  scene.add(camera);
  // crosshair
  const ch = document.createElement('div'); ch.className='crosshair'; document.body.appendChild(ch);
  // movement
  const keys = {}; window.addEventListener('keydown', e=>keys[e.code]=true); window.addEventListener('keyup', e=>keys[e.code]=false);
  let lastStep = 0;
  function update(dt){
    const speed = 2.2;
    const dir = new THREE.Vector3();
    if(keys['KeyW']) dir.z -= 1;
    if(keys['KeyS']) dir.z += 1;
    if(keys['KeyA']) dir.x -= 1;
    if(keys['KeyD']) dir.x += 1;
    dir.normalize().multiplyScalar(speed*dt);
    camera.translateX(dir.x); camera.translateZ(dir.z);
    // footsteps sound
    lastStep += dt;
    if(dir.length() > 0.01 && lastStep > 0.35){ audio.playFootstep(); lastStep = 0; }
    // pet meter decay
    state.petMeter = Math.max(0, state.petMeter - dt*0.5);
    // update HUD
    document.querySelector('#hud').hidden = false;
    document.querySelector('#hud #health span').textContent = Math.floor(state.health);
    document.querySelector('#hud #petMeter span').textContent = Math.floor(state.petMeter);
  }
  // toggle flashlight on click
  window.addEventListener('click', ()=>{ state.flashlightOn = !state.flashlightOn; spot.visible = state.flashlightOn; });
  return { state, update, camera, controls };
}
