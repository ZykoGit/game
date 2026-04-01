import * as THREE from 'three';
export class MonsterBase {
  constructor(scene, x,z){ this.scene=scene; this.mesh = this.makeMesh(); this.mesh.position.set(x,1.0,z); scene.add(this.mesh); this.chasing=false; }
  makeMesh(){ const g=new THREE.SphereGeometry(0.6,8,8); const m=new THREE.MeshStandardMaterial({color:0x331111}); return new THREE.Mesh(g,m); }
  startChase(target){ if(this.inJumpscare) return; this.chasing=true; this.chaseTimer=15; }
  update(dt, player){ if(this.chasing){ this.chaseTimer -= dt; if(this.chaseTimer<=0){ this.chasing=false; } else { const dir = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position); dir.y=0; this.mesh.position.addScaledVector(dir.normalize(), dt*1.8); if(this.mesh.position.distanceTo(player.camera.position) < 1.2) player.state.health -= 30*dt; } } }
}
export class Hider extends MonsterBase {
  makeMesh(){ const g=new THREE.BoxGeometry(0.8,1.6,0.4); return new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x222222})); }
  update(dt, player){ /* peek logic: move to corner, hide, peek with small rotation */ super.update(dt, player); }
}
export class Jumper extends MonsterBase {
  makeMesh(){ const p=new THREE.PlaneGeometry(1.6,1.6); const mat=new THREE.MeshBasicMaterial({color:0xffffff}); return new THREE.Mesh(p,mat); }
  triggerJumpscare(player, audio){ audio.playJumpscare(); /* teleport near player and play cutscene */ this.startChase(player); }
}
export class Stare extends MonsterBase {
  constructor(scene,x,z){ super(scene,x,z); this.stareTimer=0; }
  update(dt, player){
    // if player's crosshair is on the monster, accumulate timer; kill when threshold reached
    const dir = new THREE.Vector3(); player.camera.getWorldDirection(dir);
    const toMonster = new THREE.Vector3().subVectors(this.mesh.position, player.camera.position).normalize();
    const dot = dir.dot(toMonster);
    if(dot > 0.98){ this.stareTimer += dt; if(this.stareTimer > 1.2) player.state.health = 0; } else this.stareTimer = Math.max(0, this.stareTimer - dt*2);
    super.update(dt, player);
  }
}
export class Pet extends MonsterBase {
  constructor(scene,x,z){ super(scene,x,z); this.neglectTimer=0; }
  update(dt, player){
    if(player.state.petMeter < 30){ this.neglectTimer += dt; if(this.neglectTimer > 6){ /* grab face kill */ player.state.health = 0; } }
    else this.neglectTimer = 0;
    super.update(dt, player);
  }
}
