// The player's own body, for the third-person view: the owner's Tripo wizard (an FBX with its textures, zipped), made into
// assets/game/player/wizard.glb in the shape the game's skinned bodies take (src/gfx/renderer.js buildCrabs, src/sim/anim.js ArmsRig).
//
//   mkdir -p tools/build/player && cd tools/build/player && npm i three@0.160 sharp
//   unzip <the owner's fantasy_wizard_3d_model.fbx> -d src        (the "fbx" is a zip: the FBX and a .fbm folder of maps)
//   node ../../player/build.mjs src ../../../assets/game/player/wizard.glb
//
// What it does:
//   - bakes the mesh and skeleton into the bind pose's own space (y up, facing +z, left at +x), in metres, sized so the eyes
//     stand at the first-person eye (EYE in src/sim/player.js), and welds the unindexed triangles;
//   - orders the joints parent first, as ArmsRig's solve walks them;
//   - samples the three clips (walk, run, and the fall that is the death) at 30 Hz as joint-local rotations, takes the travel
//     out of the walk and run (the game moves the body) and writes how far a loop went, for the feet to keep to the ground;
//   - packs colour (2048), normal (2048) and roughness/metal (1024, glTF's G and B) into the file.
// Idle, the jump, the shield ride and every arm (carry, casts, guard) are made in the game: src/sim/playerbody.js.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(path.join(process.cwd(), 'x.js'));
const THREE = require('three');
const sharp = require('sharp');
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {} }) };
const { FBXLoader } = await import(require.resolve('three/examples/jsm/loaders/FBXLoader.js'));

const EYE = 1.62;
const FPS = 30;
const CLIPS = { walk: 'walk', run: 'run', fall: 'death' };   // the file's names (they come as walk.001 ...) to the game's
const LOOPS = new Set(['walk', 'run']);

const [srcDir, outPath] = process.argv.slice(2);
if (!srcDir || !outPath) { console.error('usage: node build.mjs <unzipped folder> <out.glb>'); process.exit(1); }
const find = (dir, test) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? find(path.join(dir, e.name), test) : test(e.name) ? [path.join(dir, e.name)] : []));
const fbxPath = find(srcDir, (n) => /\.fbx$/i.test(n))[0];
const mapPath = (re) => find(srcDir, (n) => re.test(n))[0];

const warn = console.warn; console.warn = () => {};
const buf = fs.readFileSync(fbxPath);
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
console.warn = warn;
root.updateMatrixWorld(true);
let mesh; root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
const bones = mesh.skeleton.bones;
const bindWorld = mesh.skeleton.boneInverses.map((m) => m.clone().invert());

// Parent first.
const order = [];
const visit = (b) => { order.push(bones.indexOf(b)); for (const c of b.children) if (bones.includes(c)) visit(c); };
for (const b of bones) if (!bones.includes(b.parent)) visit(b);
const slot = new Map(order.map((bi, j) => [bi, j]));
const parentOf = order.map((bi) => (bones.includes(bones[bi].parent) ? slot.get(bones.indexOf(bones[bi].parent)) : -1));
const names = order.map((bi) => bones[bi].name);

const eye = new THREE.Vector3().setFromMatrixPosition(bindWorld[bones.findIndex((b) => b.name === 'L_Eye')]);
const S = EYE / eye.y;

// Rest: each joint's bind, local to its parent's, in metres.
const local = (world, parentWorld) => {
  const m = parentWorld ? parentWorld.clone().invert().multiply(world) : world.clone();
  const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(t, q, s);
  return { t: t.multiplyScalar(S), q };
};
const rest = order.map((bi, j) => local(bindWorld[bi], parentOf[j] < 0 ? null : bindWorld[order[parentOf[j]]]));
const ibm = new Float32Array(order.length * 16);
order.forEach((bi, j) => {
  const m = bindWorld[bi].clone(); m.elements[12] *= S; m.elements[13] *= S; m.elements[14] *= S;
  ibm.set(m.invert().elements, j * 16);
});

// The mesh in its bind pose, welded.
const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
const nm = new THREE.Matrix3().getNormalMatrix(mesh.bindMatrix);
const seen = new Map(), pos = [], nrm = [], uv = [], joints = [], weights = [], idx = [];
const v = new THREE.Vector3(), n = new THREE.Vector3();
const count = g.index ? g.index.count : P.count;
for (let k = 0; k < count; k++) {
  const i = g.index ? g.index.getX(k) : k;
  v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).multiplyScalar(S);
  n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
  const jw = [0, 1, 2, 3].map((c) => [slot.get(SI.getComponent(i, c)), SW.getComponent(i, c)]).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
  const total = jw.reduce((a, e) => a + e[1], 0) || 1;
  while (jw.length < 4) jw.push([0, 0]);
  const u = UV.getX(i), w = 1 - UV.getY(i);
  const key = `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)},${n.x.toFixed(3)},${n.y.toFixed(3)},${n.z.toFixed(3)},${u.toFixed(5)},${w.toFixed(5)}`;
  let at = seen.get(key);
  if (at === undefined) {
    at = pos.length / 3; seen.set(key, at);
    pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); uv.push(u, w);
    for (const [j, wt] of jw) { joints.push(j); weights.push(wt / total); }
  }
  idx.push(at);
}

// The clips, as each joint's turn (and the hip's place) local to its parent, frame by frame.
const mixer = new THREE.AnimationMixer(root);
const armature = bones[order[0]].parent;
const clips = [], info = {};
const hip = names.indexOf('Hip');
for (const clip of root.animations) {
  const name = CLIPS[clip.name.replace(/\.\d+$/, '')];
  if (!name) continue;
  const action = mixer.clipAction(clip);
  action.play();
  const frames = Math.round(clip.duration * FPS) + 1;
  const times = new Float32Array(frames), rot = order.map(() => new Float32Array(frames * 4)), hipT = new Float32Array(frames * 3);
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration * f / (frames - 1), clip.duration - 1e-5);
    times[f] = clip.duration * f / (frames - 1);
    action.time = t; mixer.update(0); root.updateMatrixWorld(true);
    order.forEach((bi, j) => {
      const { q, t: tr } = local(bones[bi].matrixWorld, parentOf[j] < 0 ? null : bones[order[parentOf[j]]].matrixWorld);
      rot[j].set([q.x, q.y, q.z, q.w], f * 4);
      if (j === hip) hipT.set([tr.x, tr.y, tr.z], f * 3);
    });
  }
  action.stop();
  // The hip's travel is in its parent's frame: take the walk's and run's out (the game moves the body), and stand each loop
  // over the body's own middle, wherever along its way the clip began.
  if (LOOPS.has(name)) {
    const last = (frames - 1) * 3, d = [0, 1, 2].map((c) => hipT[last + c] - hipT[c]);
    for (let f = 0; f < frames; f++) for (let c = 0; c < 3; c++) hipT[f * 3 + c] -= d[c] * f / (frames - 1);
    const mean = [0, 1, 2].map((c) => { let a = 0; for (let f = 0; f < frames - 1; f++) a += hipT[f * 3 + c]; return a / (frames - 1); });
    // (Sideways and along only: its height above the ground is the clip's own. Up is the parent's z in this rig's rest.)
    const pq = rest[parentOf[hip]].q.clone();
    for (let k = parentOf[parentOf[hip]]; k >= 0; k = parentOf[k]) pq.premultiply(rest[k].q);
    const off = new THREE.Vector3(mean[0] - rest[hip].t.x, mean[1] - rest[hip].t.y, mean[2] - rest[hip].t.z).applyQuaternion(pq);
    off.y = 0;
    off.applyQuaternion(pq.clone().invert());
    for (let f = 0; f < frames; f++) { hipT[f * 3] -= off.x; hipT[f * 3 + 1] -= off.y; hipT[f * 3 + 2] -= off.z; }
    info[name] = { loop: true, travel: +(new THREE.Vector3(...d).length()).toFixed(4) };
  } else info[name] = { loop: false };
  clips.push({ name, times, rot, hipT, dur: clip.duration });
  console.log(name, clip.duration.toFixed(3) + ' s', frames + ' frames', info[name].travel ? `travel ${info[name].travel} m (${(info[name].travel / clip.duration).toFixed(2)} m/s)` : '');
}

// The maps.
const color = await sharp(mapPath(/color\.jpe?g$/i), { limitInputPixels: false }).resize(2048, 2048).jpeg({ quality: 88 }).toBuffer();
const normal = await sharp(mapPath(/normal\.png$/i)).resize(2048, 2048).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
const rough = await sharp(mapPath(/roughness\.jpe?g$/i)).resize(1024, 1024).greyscale().raw().toBuffer();
const metal = await sharp(mapPath(/metallic\.jpe?g$/i)).resize(1024, 1024).greyscale().raw().toBuffer();
const mrRaw = Buffer.alloc(1024 * 1024 * 3);
for (let i = 0; i < 1024 * 1024; i++) { mrRaw[i * 3] = 255; mrRaw[i * 3 + 1] = rough[i]; mrRaw[i * 3 + 2] = metal[i]; }
const mr = await sharp(mrRaw, { raw: { width: 1024, height: 1024, channels: 3 } }).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toBuffer();

// The GLB.
const chunks = [], views = [], accessors = [];
let length = 0;
const view = (bytes, target) => {
  const pad = (4 - length % 4) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
  chunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)); length += bytes.byteLength;
  return views.length - 1;
};
const acc = (arr, type, componentType, extra = {}, target) => {
  const per = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
  accessors.push({ bufferView: view(arr, target), componentType, count: arr.length / per, type, ...extra });
  return accessors.length - 1;
};
const P32 = new Float32Array(pos), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < P32.length; i++) { lo[i % 3] = Math.min(lo[i % 3], P32[i]); hi[i % 3] = Math.max(hi[i % 3], P32[i]); }
const attributes = {
  POSITION: acc(P32, 'VEC3', 5126, { min: lo, max: hi }, 34962),
  NORMAL: acc(new Float32Array(nrm), 'VEC3', 5126, {}, 34962),
  TEXCOORD_0: acc(new Float32Array(uv), 'VEC2', 5126, {}, 34962),
  JOINTS_0: acc(new Uint8Array(joints), 'VEC4', 5121, {}, 34962),
  WEIGHTS_0: acc(new Float32Array(weights), 'VEC4', 5126, {}, 34962),
};
const indices = acc(new Uint32Array(idx), 'SCALAR', 5125, {}, 34963);
const ibmAcc = acc(ibm, 'MAT4', 5126);
const nodes = names.map((name, j) => ({
  name, translation: rest[j].t.toArray(), rotation: [rest[j].q.x, rest[j].q.y, rest[j].q.z, rest[j].q.w],
  ...(parentOf.includes(j) ? { children: parentOf.flatMap((p, c) => (p === j ? [c] : [])) } : {}),
}));
const animations = clips.map((c) => {
  const input = acc(c.times, 'SCALAR', 5126, { min: [0], max: [c.dur] });
  const samplers = [], channels = [];
  c.rot.forEach((r, j) => { samplers.push({ input, output: acc(r, 'VEC4', 5126), interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: j, path: 'rotation' } }); });
  samplers.push({ input, output: acc(c.hipT, 'VEC3', 5126), interpolation: 'LINEAR' });
  channels.push({ sampler: samplers.length - 1, target: { node: hip, path: 'translation' } });
  return { name: c.name, samplers, channels };
});
const images = [['color', color], ['normal', normal], ['rm', mr]].map(([name, bytes]) => ({ name, mimeType: 'image/jpeg', bufferView: view(bytes) }));
nodes.push({ name: 'wizard', mesh: 0, skin: 0 }, { name: 'Armature', children: [0] });
const json = {
  asset: { version: '2.0', generator: 'tools/player/build.mjs' },
  scene: 0,
  scenes: [{ name: 'Scene', nodes: [nodes.length - 2, nodes.length - 1], extras: { clips: info, eye: EYE, scale: +S.toFixed(5) } }],
  nodes,
  meshes: [{ name: 'wizard', primitives: [{ attributes, indices, material: 0 }] }],
  skins: [{ joints: names.map((_, j) => j), inverseBindMatrices: ibmAcc, skeleton: 0 }],
  animations,
  materials: [{ name: 'wizard', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 } }, normalTexture: { index: 1 } }],
  textures: [{ sampler: 0, source: 0 }, { sampler: 0, source: 1 }, { sampler: 0, source: 2 }],
  samplers: [{ magFilter: 9729, minFilter: 9987 }],
  images, accessors, bufferViews: views,
  buffers: [{ byteLength: length + (4 - length % 4) % 4 }],
};
let text = Buffer.from(JSON.stringify(json));
text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
const bin = Buffer.concat([...chunks, Buffer.alloc((4 - length % 4) % 4)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + text.length + 8 + bin.length, 8);
const h1 = Buffer.alloc(8); h1.writeUInt32LE(text.length, 0); h1.writeUInt32LE(0x4e4f534a, 4);
const h2 = Buffer.alloc(8); h2.writeUInt32LE(bin.length, 0); h2.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.concat([head, h1, text, h2, bin]));
console.log(`${outPath}: ${names.length} joints, ${pos.length / 3} points, ${idx.length / 3} triangles, scale ${S.toFixed(4)}, ${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB`);
