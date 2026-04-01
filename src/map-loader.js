// loads map JSON and builds geometry
export async function loadMap(url, scene){
  const res = await fetch(url);
  const map = await res.json();
  const rows = map.rows;
  const tile = map.tileSize || 2;
  const textures = scene.userData.textures;
  const floorMat = new THREE.MeshStandardMaterial({map:textures.floor});
  const wallMat = new THREE.MeshStandardMaterial({map:textures.wall});
  const ceilMat = new THREE.MeshStandardMaterial({map:textures.ceiling});
  const group = new THREE.Group();
  const h = 3;
  for(let y=0;y<rows.length;y++){
    for(let x=0;x<rows[y].length;x++){
      const t = rows[y][x];
      const wx = (x - rows[y].length/2) * tile;
      const wz = (y - rows.length/2) * tile;
      // floor
      if(t !== "1"){
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(tile,tile), floorMat);
        floor.rotation.x = -Math.PI/2;
        floor.position.set(wx,0,wz);
        group.add(floor);
      }
      // walls
      if(t === "1"){
        const wall = new THREE.Mesh(new THREE.BoxGeometry(tile, h, tile), wallMat);
        wall.position.set(wx, h/2, wz);
        group.add(wall);
      }
      // ceiling lights
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(tile,tile), ceilMat);
      ceil.rotation.x = Math.PI/2;
      ceil.position.set(wx, h, wz);
      group.add(ceil);
      // triggers and special tiles are returned for game logic
    }
  }
  scene.add(group);
  return map;
}
