// Minimal GLB reader used on every thread. Returns typed arrays that view the file's buffer directly.

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function parseGLB(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen)));
  const binStart = 20 + jsonLen + 8;
  return { json, buffer, binStart };
}

export function accessor(glb, index) {
  const a = glb.json.accessors[index];
  const bv = glb.json.bufferViews[a.bufferView];
  const Type = COMPONENT[a.componentType];
  const n = COUNT[a.type];
  const offset = glb.binStart + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride;
  if (stride && stride !== n * Type.BYTES_PER_ELEMENT) {
    const out = new Type(a.count * n);
    const src = new DataView(glb.buffer);
    const getter = { 5126: 'getFloat32', 5125: 'getUint32', 5123: 'getUint16', 5121: 'getUint8', 5122: 'getInt16', 5120: 'getInt8' }[a.componentType];
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < n; k++) out[i * n + k] = src[getter](offset + i * stride + k * Type.BYTES_PER_ELEMENT, true);
    }
    return out;
  }
  if (offset % Type.BYTES_PER_ELEMENT !== 0) {
    return new Type(glb.buffer.slice(offset, offset + a.count * n * Type.BYTES_PER_ELEMENT));
  }
  return new Type(glb.buffer, offset, a.count * n);
}

export function imageBytes(glb, imageIndex) {
  const img = glb.json.images[imageIndex];
  const bv = glb.json.bufferViews[img.bufferView];
  const off = glb.binStart + (bv.byteOffset || 0);
  return new Blob([new Uint8Array(glb.buffer, off, bv.byteLength)], { type: img.mimeType });
}

// The skeleton and its clips, reading any joint hierarchy (used for the first-person arms).
export function readSkeleton(glb) {
  const { json } = glb;
  const skin = json.skins[0];
  const index = new Map(skin.joints.map((n, i) => [n, i]));
  const parent = new Int32Array(skin.joints.length).fill(-1);
  json.nodes.forEach((n, i) => {
    if (n.children && index.has(i)) for (const c of n.children) if (index.has(c)) parent[index.get(c)] = index.get(i);
  });
  const names = skin.joints.map((n) => json.nodes[n].name);
  const restT = new Float32Array(names.length * 3);
  const restR = new Float32Array(names.length * 4);
  skin.joints.forEach((n, i) => {
    const node = json.nodes[n];
    restT.set(node.translation || [0, 0, 0], i * 3);
    restR.set(node.rotation || [0, 0, 0, 1], i * 4);
  });
  const ibm = accessor(glb, skin.inverseBindMatrices);
  return { names, parent, restT, restR, ibm, nodeToJoint: index };
}

export function readClips(glb, skeleton) {
  const clips = {};
  for (const anim of glb.json.animations || []) {
    let frames = 0, dur = 0;
    const rot = new Map(), trans = new Map();
    for (const c of anim.channels) {
      const j = skeleton.nodeToJoint.get(c.target.node);
      if (j === undefined || c.target.path === 'scale') continue;
      const s = anim.samplers[c.sampler];
      const times = accessor(glb, s.input);
      const values = accessor(glb, s.output);
      frames = Math.max(frames, times.length);
      dur = Math.max(dur, times[times.length - 1]);
      (c.target.path === 'rotation' ? rot : trans).set(j, { times, values });
    }
    clips[anim.name] = { name: anim.name, frames, dur, rot, trans };
  }
  return clips;
}
