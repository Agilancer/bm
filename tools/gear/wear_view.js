// Puts a suit's gauntlets on the arms in the review pages (swings.html?gauntlet=knight, spells.html?gauntlet=knight), the way src/gfx/renderer.js
// does in the game: on the arms' own skeleton, with the skin under the plates not drawn.
export async function wear(THREE, GLTFLoader, root, rigName, suit) {
  const gltf = await new GLTFLoader().loadAsync(`assets/fp/gauntlets_${suit}.glb`);
  const meshNode = gltf.scene.getObjectByName(rigName);
  const src = meshNode.isMesh ? meshNode : meshNode.children.find((c) => c.isMesh);
  const cut = (src.userData.cut || meshNode.userData.cut);
  let arms = null;
  root.traverse((o) => { if (o.isSkinnedMesh && !arms && o.name !== 'fist') arms = o; });
  const skinned = new THREE.SkinnedMesh(src.geometry, src.material);
  skinned.frustumCulled = false;
  skinned.name = 'gauntlet';
  // (Roughness off the map, as in the game. Three has no sky here for metal to reflect, so it's kept low.)
  src.material.metalness = 0.25; src.material.roughness = 1;
  arms.parent.add(skinned);
  skinned.bind(arms.skeleton, arms.bindMatrix);
  // The skin past the cut, drawn as the leather under the armour. (A spell rig's fist is a mesh of its own, with a cut of its own.)
  // (Behind the plates in depth, as in the game: a plate's shape doesn't follow the skin, and it's always the plate you see. Only a gap shows this.)
  // (With the arm's own normal map: the creases of a knuckle, where a flat colour reads as rubber.)
  const leatherOf = (m) => new THREE.MeshStandardMaterial({ color: 0x221c17, roughness: 0.9, metalness: 0, normalMap: m.material.normalMap || null, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 100000 });
  const skins = [];
  root.traverse((m) => { if (m.isSkinnedMesh && m !== skinned) skins.push(m); });
  for (const m of skins) {
    const c = m.name === 'fist' ? cut.fist : cut;
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    const side = (v) => {
      let best = 0, w = -1;
      for (let k = 0; k < 4; k++) { const x = sw.getComponent(v, k); if (x > w) { w = x; best = si.getComponent(v, k); } }
      return m.skeleton.bones[best].name.endsWith('_L') ? 'L' : 'R';
    };
    const past = (v) => {
      const p = c[side(v)];
      if (!p) return false;
      return (pos.getX(v) - p[0]) * p[3] + (pos.getY(v) - p[1]) * p[4] + (pos.getZ(v) - p[2]) * p[5] > 0;
    };
    const old = m.geometry.index.array, keep = [], under = [];
    for (let i = 0; i < old.length; i += 3) (past(old[i]) && past(old[i + 1]) && past(old[i + 2]) ? under : keep).push(old[i], old[i + 1], old[i + 2]);
    const g = m.geometry.clone();
    m.geometry.setIndex(keep);
    g.setIndex(under);
    const u = new THREE.SkinnedMesh(g, leatherOf(m));
    u.frustumCulled = false;
    u.name = 'under';
    m.parent.add(u);
    u.bind(m.skeleton, m.bindMatrix);
  }
  return skinned;
}
