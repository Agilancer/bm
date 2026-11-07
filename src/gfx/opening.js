import { accessor, parseGLB } from '../core/glb.js';
import { C, C_SIZE, CHARS_START, H } from '../core/layout.js';
import { clamp, damp, lerp, mat4FromQT, quatAxisAngle, quatMul, quatYaw, smoothstep, wrapAngle } from '../core/math.js';
import { CAVE_BACK, CAVE_CENTRE, CAVE_FLOOR, CAVE_MOUTH, OPENING, PORTAL, REVEAL_END } from '../core/opening.js';
import { terrainHeight } from '../core/terrain.js';

const BOOK_ASSET = 'assets/game/lisandra/spellbook.glb';
const BOOK_SCALE = 0.95;
const SPINE = [-0.182, 0.24, -0.167];

function item(model, noShadow = false) {
  return { openingModel: model, mat: new Float32Array(16), noShadow };
}

function part(indices, positions, normals, uv, select, origin) {
  const remap = new Map(), pos = [], nrm = [], tex = [], idx = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    if (!select((positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3)) continue;
    for (const v of [a, b, c]) {
      if (!remap.has(v)) {
        remap.set(v, pos.length / 3);
        for (let axis = 0; axis < 3; axis++) {
          pos.push(positions[v * 3 + axis] - origin[axis]);
          nrm.push(normals[v * 3 + axis]);
        }
        tex.push(uv[v * 2], uv[v * 2 + 1]);
      }
      idx.push(remap.get(v));
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(tex), idx };
}

async function loadBook(renderer, base) {
  const response = await fetch(base + BOOK_ASSET);
  if (!response.ok) throw new Error(`${BOOK_ASSET}: ${response.status}`);
  const glb = parseGLB(await response.arrayBuffer());
  const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
  const geo = [accessor(glb, pr.indices), accessor(glb, a.POSITION), accessor(glb, a.NORMAL), accessor(glb, a.TEXCOORD_0)];
  const mat = glb.json.materials[pr.material], pbr = mat.pbrMetallicRoughness;
  const src = (texture) => glb.json.textures[texture.index].source;
  const texScale = renderer.tier.texScale;
  const [alb, nrm, mr] = await Promise.all([
    renderer.imageTexture(glb, src(pbr.baseColorTexture), 'rgba8unorm-srgb', texScale),
    renderer.imageTexture(glb, src(mat.normalTexture), 'rgba8unorm', texScale),
    renderer.imageTexture(glb, src(pbr.metallicRoughnessTexture), 'rgba8unorm', texScale),
  ]);
  const model = (select, origin) => item(renderer.lyingModel(part(...geo, select, origin), alb, nrm, mr, [0.025, 0.010, 0.045, 0.7]));
  // The source includes two book poses in one mesh. Animate the leaves of the
  // open pose around the spine, then use the sculpted cover when it shuts.
  return {
    left: model((x) => x < SPINE[0], SPINE),
    right: model((x) => x >= SPINE[0] && x < 0.13, SPINE),
    closed: model((x) => x >= 0.13, [0.32, 0.24, 0.045]),
  };
}

function caveMesh() {
  const pos = [], nrm = [], uv = [], idx = [];
  const sides = 11, rows = 13;
  const points = [];
  for (let r = 0; r <= rows; r++) {
    const ring = [];
    for (let i = 0; i <= sides; i++) {
      const angle = i / sides * Math.PI;
      const ripple = 0.21 * Math.sin(i * 9.4 + r * 4.8) + 0.12 * Math.sin(r * 9.3 - i * 5.2);
      const flare = Math.max(0, 2 - r) * 0.28;
      const z = CAVE_MOUTH + (CAVE_BACK - CAVE_MOUTH) * r / rows + 0.19 * Math.cos(i * 2.5 + r * 4.1);
      const x = CAVE_CENTRE + Math.cos(angle) * (2.91 + ripple + flare);
      const y = CAVE_FLOOR - 0.32 + Math.sin(angle) * (3.55 + ripple * 1.5 + flare);
      ring.push([x, y, z]);
    }
    points.push(ring);
  }
  const tri = (a, b, c, ua, ub, uc) => {
    const d = b.map((v, i) => v - a[i]), e = c.map((v, i) => v - a[i]);
    const n = [d[1] * e[2] - d[2] * e[1], d[2] * e[0] - d[0] * e[2], d[0] * e[1] - d[1] * e[0]];
    const l = Math.hypot(...n) || 1, offset = pos.length / 3;
    pos.push(...a, ...b, ...c);
    const unit = n.map((v) => v / l);
    nrm.push(...unit, ...unit, ...unit);
    uv.push(...ua, ...ub, ...uc);
    idx.push(offset, offset + 1, offset + 2);
  };
  for (let r = 0; r < rows; r++) for (let i = 0; i < sides; i++) {
    const a = points[r][i], b = points[r][i + 1], c = points[r + 1][i + 1], d = points[r + 1][i];
    const u = i * 0.42, v = r * 0.36;
    tri(a, b, c, [u, v], [u + 0.42, v], [u + 0.42, v + 0.36]);
    tri(a, c, d, [u, v], [u + 0.42, v + 0.36], [u, v + 0.36]);
  }
  const end = points[rows], centre = [CAVE_CENTRE, CAVE_FLOOR - 0.35, CAVE_BACK + 0.09];
  for (let i = 0; i < sides; i++) {
    const uvOf = (p) => [p[0] * 0.65, p[1] * 0.65];
    tri(centre, end[i], end[i + 1], uvOf(centre), uvOf(end[i]), uvOf(end[i + 1]));
  }
  // The arch face continues out into a broad, irregular rock shoulder. Its
  // flanks and rear edge sink into the shaped hillside, leaving only the mouth.
  const skirt = [];
  const depth = 15;
  for (let r = 0; r <= depth; r++) {
    const t = r / depth;
    skirt.push(Array.from({ length: sides + 1 }, (_, i) => {
      const a = i / sides * Math.PI;
      const ridge = Math.sin(a) ** 0.85;
      const roughness = Math.sin(i * 7.5 + r * 3.8) * 0.38 + Math.cos(i * 3.7 - r * 2.1) * 0.24;
      const x = CAVE_CENTRE + Math.cos(a) * (6.6 + 3.8 * Math.sin(Math.PI * t * 0.84) + roughness) + t * 0.8;
      const z = CAVE_MOUTH - 0.5 + 23 * t + roughness;
      const terrain = terrainHeight(x, z);
      const crest = CAVE_FLOOR + (4.15 + roughness) * ridge + Math.sin(Math.PI * t) * 2.1 * ridge;
      const shell = Math.max(terrain + ridge * 0.7, crest);
      const y = lerp(shell, terrain - 0.38, smoothstep(0.73, 1, t));
      return [x, lerp(terrain - 0.3, y, smoothstep(0, 0.37, ridge)), z];
    }));
  }
  const stoneUV = (p) => [p[0] * 0.46 + p[1] * 0.21, p[2] * 0.44 + p[1] * 0.48];
  const rock = (a, b, c) => tri(a, b, c, stoneUV(a), stoneUV(b), stoneUV(c));
  for (let i = 0; i < sides; i++) {
    rock(skirt[0][i], points[0][i], points[0][i + 1]);
    rock(skirt[0][i], points[0][i + 1], skirt[0][i + 1]);
    for (let r = 0; r < depth; r++) {
      const [a, b, c, d] = [skirt[r][i], skirt[r][i + 1], skirt[r + 1][i + 1], skirt[r + 1][i]];
      rock(a, c, b);
      rock(a, d, c);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx };
}

const portalMesh = {
  pos: new Float32Array([-1.29, -1.65, 0, 1.29, -1.65, 0, 1.29, 1.65, 0, -1.29, 1.65, 0]),
  nrm: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]),
  uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), idx: [0, 1, 2, 0, 2, 3],
};

export async function loadOpeningStage(renderer, base) {
  const normal = renderer.pixel('rgba8unorm', [128, 128, 255, 255]);
  const rough = renderer.pixel('rgba8unorm', [255, 226, 0, 255]);
  const rock = await fetch(base + 'assets/game/interior/wall_rough_c.webp').then((r) => r.blob());
  const stone = await renderer.bitmapTexture(rock, 'rgba8unorm-srgb', renderer.tier.texScale);
  const cave = item(renderer.lyingModel(caveMesh(), stone, normal, rough, [0, 0, 0, 0]));
  const portal = item(renderer.lyingModel(portalMesh, stone, normal, rough, [0, 0, 0, -1]), true);
  mat4FromQT(cave.mat, [0, 0, 0, 1], 0, [0, 0, 0], 0);
  mat4FromQT(portal.mat, [0, 0, 0, 1], 0, PORTAL, 0);
  const book = await loadBook(renderer, base);
  const bookLight = { p: [CAVE_CENTRE, CAVE_FLOOR + 1.2, CAVE_MOUTH + 3.5], r: 2.4, c: [0.55, 0.25, 1], i: 1.7, flicker: 0.4 };
  renderer.lights.push(
    bookLight,
    { p: [CAVE_CENTRE, PORTAL[1], PORTAL[2] - 0.75], r: 7.5, c: [0.48, 0.12, 1], i: 17.5, flicker: 0.65 },
    { p: [CAVE_CENTRE + 1.1, CAVE_FLOOR + 1.7, CAVE_MOUTH + 3.9], r: 4.0, c: [0.95, 0.56, 0.24], i: 5.0, flicker: 0.35 },
  );
  return new OpeningStage(cave, portal, book, bookLight);
}

class OpeningStage {
  constructor(cave, portal, book, bookLight) {
    Object.assign(this, { cave, portal, book, bookLight });
    this.position = new Float32Array(3);
    this.heading = new Float32Array(4);
    this.tilt = new Float32Array(4);
    this.hinge = new Float32Array(4);
    this.rotation = new Float32Array(4);
    this.yaw = 0;
    this.last = null;
  }

  append(items, snap, dt) {
    const stage = snap[H.OPENING];
    if (!stage) return;
    items.push(this.cave, this.portal);
    const guide = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    const time = snap[H.TIME], phase = snap[H.OPENING_TIME];
    const yaw = snap[guide + C.YAW];
    const ritual = stage === OPENING.NAME;
    const side = ritual ? -0.56 : -0.68;
    const forward = ritual ? 0.46 : -0.31;
    const x = snap[guide + C.X] + Math.cos(yaw) * side + Math.sin(yaw) * forward;
    const y = snap[guide + C.Y] + (ritual ? 1.10 : 1.04) + 0.065 * Math.sin(time * 2.85) + 0.018 * Math.sin(time * 5.8);
    const z = snap[guide + C.Z] - Math.sin(yaw) * side + Math.cos(yaw) * forward;
    if (this.last === null || time < this.last || Math.hypot(x - this.position[0], z - this.position[2]) > 5) {
      this.position.set([x, y, z]);
      this.yaw = yaw;
    }
    this.last = time;
    this.position[0] = damp(this.position[0], x, 5, dt);
    this.position[1] = damp(this.position[1], y, 5, dt);
    this.position[2] = damp(this.position[2], z, 5, dt);
    this.yaw += wrapAngle(yaw - this.yaw) * (1 - Math.exp(-4 * dt));
    for (let i = 0; i < 3; i++) this.bookLight.p[i] = this.position[i];
    const shut = ritual ? 1 - smoothstep(0.15, 1.45, phase)
      : stage === OPENING.LEAVE ? smoothstep(0, 0.8, phase)
      : stage === OPENING.REVEAL ? 1 - 0.74 * Math.sin(Math.PI * clamp(phase / REVEAL_END, 0, 1)) : 1;
    quatYaw(this.heading, 0, this.yaw + Math.PI + (ritual ? -0.5 : 0.35));
    quatAxisAngle(this.tilt, 0, 1, 0, 0, -0.92 + shut * 0.68 + Math.sin(time * 1.8) * 0.07);
    quatMul(this.heading, 0, this.heading, 0, this.tilt, 0);
    if (shut > 0.92) {
      this.transform(this.book.closed, 0);
      items.push(this.book.closed);
    } else {
      this.transform(this.book.left, shut * 0.82);
      this.transform(this.book.right, -shut * 0.82);
      items.push(this.book.left, this.book.right);
    }
  }

  transform(part, fold) {
    quatYaw(this.hinge, 0, fold);
    quatMul(this.rotation, 0, this.heading, 0, this.hinge, 0);
    mat4FromQT(part.mat, this.rotation, 0, this.position, 0);
    for (let i = 0; i < 12; i++) part.mat[i] *= BOOK_SCALE;
  }
}
