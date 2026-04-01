import { initRenderer, resizeHandler } from './renderer.js';
import { loadMap } from './map-loader.js';
import { AudioSystem } from './audio.js';
import { createPlayer } from './player.js';
import { Hider, Jumper, Stare, Pet } from './monsters.js';

const canvas = document.getElementById('c');
const { scene, camera, renderer, controls } = initRenderer(canvas);
const audio = new AudioSystem();
const player = createPlayer(scene, camera, controls, audio);

let monsters = [];
async function start(){
  const map = await loadMap('maps/map1.json', scene);
  // spawn monsters from map.spawns
  const tile = map.tileSize || 2;
  const rows = map.rows;
  for(const [type, list] of Object.entries(map.spawns || {})){
    for(const s of list){
      const x = (s.x - rows[0].length/2)*tile;
      const z = (s.y - rows.length/2)*tile;
      if(type === 'HIDER') monsters.push(new Hider(scene,x,z));
      if(type === 'JUMPER') monsters.push(new Jumper(scene,x,z));
      if(type === 'STARE') monsters.push(new Stare(scene,x,z));
      if(type === 'PET') monsters.push(new Pet(scene,x,z));
    }
  }
  // start loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now-last)/1000); last = now;
    player.update(dt);
    for(const m of monsters) m.update(dt, {camera, state:player.state, audio});
    renderer.render(scene, camera);
    if(player.state.health <= 0){ window.location.href = 'you-win.html?dead=1'; return; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

document.getElementById('startBtn').addEventListener('click', ()=>{
  document.getElementById('overlay').style.display = 'none';
  controls.lock();
  start();
});

window.addEventListener('resize', ()=>resizeHandler(renderer, camera));
