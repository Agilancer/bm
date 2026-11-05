// What a limb needs before it can come off. Each vertex learns which part of the body it belongs to, so the skinning can part
// the skin at a cut (see SKIN in shaders.js), and a disc of meat and bone goes inside the limb on either side of each joint that
// can be cut through. The skinning collapses each one to nothing until that joint has been cut.
import { accessor } from '../core/glb.js';
import { mat4Invert } from '../core/math.js';
import { CUTS, partOfJoint } from '../sim/limbs.js';

const SIDES = 14;

export function addStumps(prim, glb, scale) {
  const skin = glb.json.skins[0];
  const names = skin.joints.map((j) => glb.json.nodes[j].name);
  const ibm = accessor(glb, skin.inverseBindMatrices);
  const inv = new Float32Array(16);
  const at = names.map((_, i) => {
    mat4Invert(inv, ibm.subarray(i * 16, i * 16 + 16));
    return [inv[12] * scale, inv[13] * scale, inv[14] * scale];
  });
  const index = new Map(names.map((n, i) => [n, i]));
  const parts = names.map(partOfJoint);
  const n = prim.pos.length / 3, W = prim.weights, J = prim.joints;
  const own = new Uint8Array(n), tags = [];
  const sum = new Float32Array(16);
  for (let i = 0; i < n; i++) {
    sum.fill(0);
    let tag = 0;
    for (let k = 0; k < 4; k++) {
      const part = parts[J[i * 4 + k]];
      sum[part] += W[i * 4 + k];
      tag |= part << (4 + k * 4);
    }
    let best = 0;
    for (let p = 1; p < 16; p++) if (sum[p] > sum[best]) best = p;
    own[i] = best;
    tags.push((tag | best) >>> 0);
  }
  const pos = Array.from(prim.pos), nrm = Array.from(prim.nrm), uv = Array.from(prim.uv), idx = Array.from(prim.idx), joints = Array.from(J), weights = Array.from(W);
  const one = W instanceof Float32Array ? 1 : W instanceof Uint16Array ? 65535 : 255;
  // A triangle lying across a cut would stretch out between the two pieces. It goes wholly with one of them, on its own copies of its
  // corners: the weights are the same, so nothing shows until the cut, and then it comes away cleanly with that side.
  const hasPart = (v, part) => { for (let k = 0; k < 4; k++) if (W[v * 4 + k] > 0 && parts[J[v * 4 + k]] === part) return true; return false; };
  const copies = new Map();
  const corner = (v, part) => {
    const key = v * 16 + part;
    let c = copies.get(key);
    if (c === undefined) {
      c = pos.length / 3;
      copies.set(key, c);
      pos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); nrm.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]); uv.push(uv[v * 2], uv[v * 2 + 1]);
      for (let k = 0; k < 4; k++) { joints.push(J[v * 4 + k]); weights.push(W[v * 4 + k]); }
      tags.push(((tags[v] & ~15) | part) >>> 0);
    }
    return c;
  };
  for (let t = 0; t < prim.idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (own[a] === own[b] && own[b] === own[c]) continue;
    // The part all three corners already follow in some measure, if there is one.
    const part = [own[a], own[b], own[c]].find((q) => hasPart(a, q) && hasPart(b, q) && hasPart(c, q)) ?? own[a];
    if (own[a] !== part) idx[t] = corner(a, part);
    if (own[b] !== part) idx[t + 1] = corner(b, part);
    if (own[c] !== part) idx[t + 2] = corner(c, part);
  }
  const disc = (c, ax, ay, az, radius, joint, part, across) => {
    const t = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = ay * t[2] - az * t[1], uy = az * t[0] - ax * t[2], uz = ax * t[1] - ay * t[0];
    const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
    const first = pos.length / 3;
    const vertex = (x, y, z, rad) => {
      pos.push(x, y, z); nrm.push(ax, ay, az); uv.push(-2 - rad, 0.5);
      joints.push(joint, joint, joint, joint); weights.push(one, 0, 0, 0);
      tags.push((part | (part << 4) | (across << 8) | (part << 12) | (part << 16)) >>> 0);
    };
    vertex(c[0], c[1], c[2], 0);
    for (let s = 0; s < SIDES; s++) {
      const a = s / SIDES * Math.PI * 2, ca = Math.cos(a) * radius, sa = Math.sin(a) * radius;
      vertex(c[0] + ux * ca + vx * sa, c[1] + uy * ca + vy * sa, c[2] + uz * ca + vz * sa, 1);
      idx.push(first, first + 1 + s, first + 1 + (s + 1) % SIDES);
    }
  };
  for (const cut of CUTS) {
    const near = index.get(cut.near), far = index.get(cut.far);
    if (near === undefined || far === undefined) continue;
    const c = at[far], from = at[index.get(cut.along[0])], to = at[index.get(cut.along[1])];
    let ax = to[0] - from[0], ay = to[1] - from[1], az = to[2] - from[2];
    const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
    // How thick the limb is here: the skin of the two parts that meet at this joint, close to the plane through it.
    const ring = [];
    let mx = 0, my = 0, mz = 0;
    for (let i = 0; i < n; i++) {
      if (own[i] !== cut.partFar) continue;
      const dx = prim.pos[i * 3] - c[0], dy = prim.pos[i * 3 + 1] - c[1], dz = prim.pos[i * 3 + 2] - c[2];
      const along = dx * ax + dy * ay + dz * az;
      if (Math.abs(along) > 0.035 * scale) continue;
      ring.push(dx, dy, dz);
      mx += dx; my += dy; mz += dz;
    }
    const count = ring.length / 3;
    if (count < 4) continue;
    mx /= count; my /= count; mz /= count;
    // Measured from the middle of the limb, which a joint often isn't.
    const rs = [];
    for (let i = 0; i < ring.length; i += 3) {
      const dx = ring[i] - mx, dy = ring[i + 1] - my, dz = ring[i + 2] - mz;
      const along = dx * ax + dy * ay + dz * az;
      rs.push(Math.hypot(dx - ax * along, dy - ay * along, dz - az * along));
    }
    rs.sort((a, b) => a - b);
    const radius = rs[Math.floor(rs.length * 0.7)] * 0.95;
    const k = 0.012 * scale;
    const m = [c[0] + mx, c[1] + my, c[2] + mz];
    // One disc rides each side, facing the other, so whichever stays has a face on it.
    disc([m[0] - ax * k, m[1] - ay * k, m[2] - az * k], ax, ay, az, radius, near, cut.partNear, cut.partFar);
    disc([m[0] + ax * k, m[1] + ay * k, m[2] + az * k], -ax, -ay, -az, radius, far, cut.partFar, cut.partNear);
  }
  const WT = W.constructor;
  return {
    pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(idx),
    joints: new (J.constructor)(joints), weights: new WT(weights), skinTag: new Uint32Array(tags),
  };
}
