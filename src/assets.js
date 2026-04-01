export function makeWallTexture(seed=0){
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,size,size);
  for(let i=0;i<1200;i++){
    const x = Math.random()*size, y = Math.random()*size;
    ctx.fillStyle = `rgba(40,40,40,${Math.random()*0.06})`;
    ctx.fillRect(x,y,Math.random()*6,Math.random()*6);
  }
  // subtle vertical streaks
  ctx.globalAlpha = 0.06;
  for(let i=0;i<40;i++){
    ctx.fillStyle = `rgba(80,80,80,0.04)`;
    ctx.fillRect(i*(size/40),0,2,size);
  }
  return new THREE.CanvasTexture(c);
}
export function makeFloorTexture(){
  const size = 1024;
  const c = document.createElement('canvas'); c.width=c.height=size;
  const ctx = c.getContext('2d');
  ctx.fillStyle='#0f0f0f'; ctx.fillRect(0,0,size,size);
  for(let i=0;i<800;i++){
    ctx.fillStyle = `rgba(120,120,120,${Math.random()*0.03})`;
    ctx.fillRect(Math.random()*size, Math.random()*size, Math.random()*3, Math.random()*3);
  }
  return new THREE.CanvasTexture(c);
}
export function makeCeilingTexture(){
  const size = 512;
  const c = document.createElement('canvas'); c.width=c.height=size;
  const ctx = c.getContext('2d');
  ctx.fillStyle='#0b0b0b'; ctx.fillRect(0,0,size,size);
  // grid lights
  ctx.strokeStyle='rgba(200,200,200,0.03)';
  for(let x=0;x<size;x+=64) for(let y=0;y<size;y+=64){
    ctx.fillStyle = `rgba(255,255,220,${Math.random()*0.02})`;
    ctx.fillRect(x+24,y+24,16,16);
  }
  return new THREE.CanvasTexture(c);
}
