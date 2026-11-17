// Your party's looks: what their gear does to the body and the hands of a hired hero (src/ui/party.js looks, main.js).
//
// A hero's body (assets/game/heroes/<id>.glb, tools/heroes/build.py) is six groups of armour, helm to boots, each a run of
// pieces in its mesh (the scene's extras.pieces), over mail where the plates part. Party gear changes it two ways:
//   its shape: a piece cut from another body of the same class and sex (partygear.js shape) puts that body's group in
//     place of the wearer's own. Its vertices are brought from its body's bind pose onto the wearer's bones (each moves
//     with the joints it's weighted to, from one skeleton's rest to the other's: the refit build.py does when it mixes
//     groups between the owner's suits), and its pictures come with it: the body's colour, normal and metal maps are laid
//     side by side in one picture, a cell a body, and each piece's UVs moved into its own body's cell.
//   its colours: one of your own gear sets' ramps (src/gfx/recolour.js rampMap) over that group's texels alone. Which
//     texel is whose is found by drawing each group's triangles into the picture's UV space.
// A weapon or shield of their gear is that model, in its palette (paintProp), in the hand or on the back where theirs was.
//
// Nothing is done to a hero who wears nothing: their body is the one the renderer built for them, untouched.
import { accessor, imageBytes, parseGLB } from '../core/glb.js';
import { mipCountFor } from './gpu.js';
import { IVORY, PROP_PALS, bareHead, bodyClass, lookOf, outfitRamps, paleLift, paled, rampFor, shapeShows } from '../items/partygear.js';
import { fillFrom, goldOf, growInto, hsvOf, fromHsv, linesOf, lumOf, lumRange, matchLum, paintProp, polishGold, propMetal, rampMap, trimOf, wideOf } from './recolour.js';

const GROUPS = ['helm', 'chest', 'shoulders', 'arms', 'legs', 'boots'];
const MAX_DONORS = 3;          // bodies borrowed from at once, beside the wearer's own: a picture of 2 x 2 cells at most
const GUTTER = 1 / 64;         // of a cell, round each body's picture in it: its own edge texels drawn out, so a seam or a
                               // far-off mip doesn't take its neighbour's colours (a red hairline down a plum shin)
const RINGS = 8;               // texels the dye's reach is grown round each group, into what no group covers
const CHAR_UBO = 24 * 64 + 256 + 48;   // (as renderer.js)
const kitOf = (k) => [k.main, k.off || (k.style === 'daggers' || k.style === 'boomerang' ? k.main : null), k.back, k.lute || null];
const KIT_KEYS = ['main', 'off', 'back', 'lute'];
const groupOf = (name) => { const g = name.split('_')[0]; return GROUPS.includes(g) ? g : name.startsWith('mail') ? 'mail' : null; };

// 4x4 column-major helpers, for the refit.
function inv4(m) {
  const o = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return o.fill(0);
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}
function mul4(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

// Each group's triangles drawn into a picture's UV space: the group's number (1 up) at every texel it covers, and RINGS more
// round each edge, as the map's own padding is (sampled at a seam, and in its smaller mips: undyed, it shows as a line of
// the old colour). Groups that aren't dyed are drawn too (as 255), so one's padding never grows into another's texels.
// W x H: the picture's size.
function groupMask(prim, tris, W, H) {
  const mask = new Uint8Array(W * H);
  const { uv, idx } = prim;
  for (const [g, t0, tn] of tris) {
    for (let t = t0; t < t0 + tn; t++) {
      const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
      const ax = uv[a * 2] * W, ay = uv[a * 2 + 1] * H, bx = uv[b * 2] * W, by = uv[b * 2 + 1] * H, cx = uv[c * 2] * W, cy = uv[c * 2 + 1] * H;
      if (uv[a * 2] > 1.5 || uv[b * 2] > 1.5 || uv[c * 2] > 1.5) continue;   // (a mail cover's tube coordinates: no texels of its own)
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-9) continue;
      const s = area > 0 ? 1 : -1;
      for (let y = y0; y <= y1; y++) {
        const py = y + 0.5;
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5;
          const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) * s, w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) * s, w2 = ((ax - px) * (by - py) - (ay - py) * (bx - px)) * s;
          // (A little past each edge: a texel the edge only grazes is still the group's.)
          const e = 0.75 * Math.hypot(1, 1) * Math.abs(area) / Math.max(Math.hypot(bx - ax, by - ay), Math.hypot(cx - bx, cy - by), Math.hypot(ax - cx, ay - cy), 1e-6);
          if (w0 >= -e && w1 >= -e && w2 >= -e) mask[y * W + x] = g;
        }
      }
    }
  }
  // RINGS more round every group, into what no group has: the padding the map was painted with. (Ring by ring from the
  // edge in, so it costs the edges, not the picture.)
  let front = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!mask[i] && (mask[i - 1] || mask[i + 1] || mask[i - W] || mask[i + W])) front.push(i);
  }
  for (let ring = 0; ring < RINGS && front.length; ring++) {
    const got = [];
    for (const i of front) {
      if (mask[i]) continue;
      const n = mask[i - 1] || mask[i + 1] || mask[i - W] || mask[i + W];
      if (n) got.push(i, n);
    }
    for (let j = 0; j < got.length; j += 2) mask[got[j]] = got[j + 1];
    const next = [];
    for (let j = 0; j < got.length; j += 2) {
      const i = got[j], x = i % W, y = (i / W) | 0;
      if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
      for (const q of [i - 1, i + 1, i - W, i + W]) if (!mask[q]) next.push(q);
    }
    front = next;
  }
  return mask;
}

// The padded coat under a dyed hero's clothes, in their coat's colour, as a fraction for their look's number (materials.js:
// 0.01 and up, in steps of 0.0015): its hue in 32, colourful or not, and one of four lights by the coat's own. 0 for none.
export function coverCode(ramp) {
  if (!ramp) return 0;
  const [h, s] = hsvOf(ramp[1]), m = ramp[Math.floor(ramp.length / 2)], l = lumOf(m[0], m[1], m[2]);
  const code = (Math.round(h * 32) % 32) * 8 + (s > 0.22 ? 4 : 0) + (l < 0.3 ? 0 : l < 0.45 ? 1 : l < 0.6 ? 2 : 3);
  return 0.01 + code * 0.0015;
}

export class HeroLooks {
  // r: the renderer. base: where the game's files are.
  constructor(r, base) {
    this.r = r; this.base = base;
    this.files = new Map();     // body id -> Promise of { glb, prim, pieces, ib, jc }
    this.state = new Map();     // slot -> { key, char (the one made), orig (the renderer's own) }
    this.turns = new Map();     // slot -> the latest apply's number, so a slow one doesn't land over a later
    this.props = new Map();     // `${id}|${pal}` -> Promise of a prop model
    this.lying = new Map();     // the same, for the ground
  }

  body(id) {
    let p = this.files.get(id);
    if (!p) {
      p = fetch(`${this.base}assets/game/heroes/${id}.glb`).then((res) => { if (!res.ok) throw new Error(`${id}: ${res.status}`); return res.arrayBuffer(); }).then((buf) => {
        const glb = parseGLB(buf), pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
        const prim = {
          pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices),
          joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0), flex: accessor(glb, a._FLEX), piece: accessor(glb, a._PIECE),
        };
        const skin = glb.json.skins[0], ib = accessor(glb, skin.inverseBindMatrices);
        return { glb, prim, pieces: glb.json.scenes[0].extras?.pieces || [], ib, jc: skin.joints.length };
      });
      p.catch(() => this.files.delete(id));
      this.files.set(id, p);
    }
    return p;
  }

  // What a hero in this slot should look like: which body each group comes from, and each group's colours. Null for as they are.
  recipe(slot, entry) {
    const cast = this.r.heroCast?.[slot];
    if (!cast || !entry) return null;
    const me = { cls: cast.cls, sex: cast.sex };
    // (An old companion back in another body than their own, of their class and sex: their own body's shape, still.)
    const own = entry.body && entry.body !== cast.body && shapeShows({ shape: entry.body }, me) ? entry.body : cast.body;
    // (Each piece in its own set's colours, drawn toward their coat's, so it all goes together: partygear.js outfitRamps.)
    const groups = {}, colours = outfitRamps(entry.gear, cast.cls);
    for (const g of GROUPS) {
      const it = entry.gear?.[g];
      groups[g] = it?.shape && shapeShows(it, me) ? it.shape : own;
    }
    // (A bare head under a helm that can't show on it: their hair isn't dyed for it.)
    if (bareHead(groups.helm)) delete colours.helm;
    // (No more bodies than the picture has cells for: past them, a group keeps the wearer's.)
    const donors = [...new Set(Object.values(groups))].filter((b) => b !== cast.body);
    for (const extra of donors.slice(MAX_DONORS)) for (const g of GROUPS) if (groups[g] === extra) groups[g] = cast.body;
    const mail = groups.chest;
    const plain = GROUPS.every((g) => groups[g] === cast.body) && !Object.keys(colours).length;
    if (plain) return null;
    return { wearer: cast.body, groups, mail, colours, lift: paleLift(cast.cls), key: JSON.stringify([cast.body, groups, mail, Object.fromEntries(Object.entries(entry.gear || {}).map(([k, v]) => [k, v?.look || '']))]) };
  }

  // entry: their roster entry (src/ui/party.js), or null when they've gone. kp: { kit, pal } of what they hold.
  async apply(slot, entry, kp) {
    const turn = (this.turns.get(slot) || 0) + 1;
    this.turns.set(slot, turn);
    const cast = this.r.heroCast?.[slot];
    if (!cast) return;
    this.setKit(slot, kp?.kit || cast.kit, kp?.pal || {}, turn).catch((e) => console.warn('hero kit', e));
    const ci = this.r.firstHero + slot, st = this.state.get(slot) || { key: '', orig: this.r.chars[ci] };
    this.state.set(slot, st);
    const rec = this.recipe(slot, entry);
    if (!rec) { if (st.key) { this.put(ci, st.orig, st); st.key = ''; } return; }
    if (rec.key === st.key) return;
    try {
      const made = await this.compose(rec);
      if (this.turns.get(slot) !== turn) { this.free(made); return; }
      const c = { ...st.orig, ...made };
      // (Their padded coat in their coat's colour: materials.js reads it off the fraction of their look's number.)
      if (made.cover && st.orig.heroLook) c.heroLook = Math.trunc(st.orig.heroLook) - made.cover;
      this.put(ci, c, st);
      st.key = rec.key;
    } catch (e) { console.warn('hero look', e); }
  }

  put(ci, c, st) {
    const was = this.r.chars[ci];
    this.r.chars[ci] = c;
    if (was && was !== st.orig) setTimeout(() => this.free(was), 1500);   // (it may still be in a frame on its way)
  }

  free(c) {
    for (const t of c.maps || []) t.destroy?.();
    for (const b of [c.srcBuf, c.outBuf, c.palette, c.params, c.IB, c.sideVB, c.lodIB !== c.IB ? c.lodIB : null, c.ubo]) b?.destroy?.();
  }

  // ---- the body -------------------------------------------------------------------------------------------------------

  async compose(rec) {
    const { r } = this, device = r.device;
    const ids = [rec.wearer, ...[...new Set([...Object.values(rec.groups), rec.mail])].filter((b) => b !== rec.wearer)];
    const files = await Promise.all(ids.map((id) => this.body(id)));
    const A = files[0], cells = ids.length, cols = cells > 1 ? 2 : 1, rows = cells > 2 ? 2 : 1;
    const gut = cells > 1 ? GUTTER : 0, inner = 1 - 2 * gut;
    // Each joint's way from a donor's bind pose to the wearer's: inv(wearer's inverse bind) x donor's inverse bind.
    const fit = files.map((B, k) => {
      if (!k) return null;
      const m = new Float32Array(B.jc * 16);
      for (let j = 0; j < B.jc; j++) m.set(mul4(inv4(A.ib.subarray(j * 16, j * 16 + 16)), B.ib.subarray(j * 16, j * 16 + 16)), j * 16);
      return m;
    });
    // The pieces each body gives, and how many vertices and triangles that comes to.
    const runs = [];
    let nv = 0, nt = 0;
    files.forEach((B, k) => {
      for (const p of B.pieces) {
        const g = groupOf(p.name);
        const from = g === 'mail' ? rec.mail : g ? rec.groups[g] : rec.wearer;
        if (from !== ids[k]) continue;
        runs.push({ k, p, g: g || 'other', v0: nv, t0: nt });
        nv += p.vcount; nt += p.tcount;
      }
    });
    const prim = {
      pos: new Float32Array(nv * 3), nrm: new Float32Array(nv * 3), uv: new Float32Array(nv * 2), idx: new Uint32Array(nt * 3),
      joints: new Uint8Array(nv * 4), weights: new Float32Array(nv * 4), flex: new Float32Array(nv), piece: new Uint32Array(nv),
    };
    for (const run of runs) {
      const B = files[run.k], P = B.prim, M = fit[run.k], { p } = run, cx = run.k % cols, cy = Math.floor(run.k / cols);
      for (let i = 0; i < p.vcount; i++) {
        const s = p.vstart + i, d = run.v0 + i;
        let x = P.pos[s * 3], y = P.pos[s * 3 + 1], z = P.pos[s * 3 + 2], nx = P.nrm[s * 3], ny = P.nrm[s * 3 + 1], nz = P.nrm[s * 3 + 2];
        if (M) {
          let X = 0, Y = 0, Z = 0, NX = 0, NY = 0, NZ = 0;
          for (let q = 0; q < 4; q++) {
            const w = P.weights[s * 4 + q];
            if (!w) continue;
            const o = P.joints[s * 4 + q] * 16;
            X += w * (M[o] * x + M[o + 4] * y + M[o + 8] * z + M[o + 12]);
            Y += w * (M[o + 1] * x + M[o + 5] * y + M[o + 9] * z + M[o + 13]);
            Z += w * (M[o + 2] * x + M[o + 6] * y + M[o + 10] * z + M[o + 14]);
            NX += w * (M[o] * nx + M[o + 4] * ny + M[o + 8] * nz);
            NY += w * (M[o + 1] * nx + M[o + 5] * ny + M[o + 9] * nz);
            NZ += w * (M[o + 2] * nx + M[o + 6] * ny + M[o + 10] * nz);
          }
          const l = 1 / (Math.hypot(NX, NY, NZ) || 1);
          x = X; y = Y; z = Z; nx = NX * l; ny = NY * l; nz = NZ * l;
        }
        prim.pos[d * 3] = x; prim.pos[d * 3 + 1] = y; prim.pos[d * 3 + 2] = z;
        prim.nrm[d * 3] = nx; prim.nrm[d * 3 + 1] = ny; prim.nrm[d * 3 + 2] = nz;
        const u = P.uv[s * 2], v = P.uv[s * 2 + 1];
        // (A mail cover's u past 1.5 is its tube's coordinates, not a place in the picture: left as it is. materials.js isCover.)
        if (u > 1.5) { prim.uv[d * 2] = u; prim.uv[d * 2 + 1] = v; } else { prim.uv[d * 2] = (cx + gut + u * inner) / cols; prim.uv[d * 2 + 1] = (cy + gut + v * inner) / rows; }
        for (let q = 0; q < 4; q++) { prim.joints[d * 4 + q] = P.joints[s * 4 + q]; prim.weights[d * 4 + q] = P.weights[s * 4 + q]; }
        prim.flex[d] = P.flex ? P.flex[s] : 0;
        prim.piece[d] = P.piece ? P.piece[s] : 0;
      }
      for (let t = 0; t < p.tcount * 3; t++) prim.idx[run.t0 * 3 + t] = P.idx[p.tstart * 3 + t] - p.vstart + run.v0;
    }
    // The pictures: each body's in its cell.
    const S = Math.max(256, Math.round(1024 * (r.tier.texScale || 1)));
    const paint = async (img, size, colour) => {
      const W = size * cols, H = size * rows, cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      // (Every texel opaque, as the bodies' own maps are: a picture drawn smaller than its cell has edges half see-through,
      // and a hero's metal map's alpha is where a possessed knight's eyes burn red (materials.js), so a cell's edge glowed.)
      ctx.fillStyle = img === 0 ? 'rgb(40,36,32)' : img === 1 ? 'rgb(128,128,255)' : 'rgb(255,204,0)';
      ctx.fillRect(0, 0, W, H);
      const g = Math.round(size * gut), n = size - 2 * g;
      for (let k = 0; k < files.length; k++) {
        const bmp = await createImageBitmap(imageBytes(files[k].glb, img), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const x0 = (k % cols) * size, y0 = Math.floor(k / cols) * size;
        ctx.drawImage(bmp, x0 + g, y0 + g, n, n);
        bmp.close();
        if (!g) continue;
        // (The gutter: the picture's own edge texels drawn out to the cell's edge, its sides and then its top and bottom.)
        ctx.drawImage(cv, x0 + g, y0 + g, 1, n, x0, y0 + g, g, n);
        ctx.drawImage(cv, x0 + g + n - 1, y0 + g, 1, n, x0 + g + n, y0 + g, g, n);
        ctx.drawImage(cv, x0, y0 + g, size, 1, x0, y0, size, g);
        ctx.drawImage(cv, x0, y0 + g + n - 1, size, 1, x0, y0 + g + n, size, g);
      }
      return { cv, ctx, W, H, colour };
    };
    const [alb, nrm, mr] = await Promise.all([paint(0, S, true), paint(1, S / 2, false), paint(2, S / 2, false)]);
    // The colours, group by group, over the group's own texels.
    const groupNo = Object.fromEntries(GROUPS.map((g, i) => [g, i + 1]));
    const want = GROUPS.filter((g) => rec.colours[g]);
    if (want.length) {
      const tris = runs.map((x) => [want.includes(x.g) ? groupNo[x.g] : 255, x.t0, x.p.tcount]);
      const mask = groupMask(prim, tris, alb.W, alb.H);
      const img = alb.ctx.getImageData(0, 0, alb.W, alb.H), px = img.data;
      const mimg = mr.ctx.getImageData(0, 0, mr.W, mr.H), metal = mimg.data, mw = mr.W, sx = mr.W / alb.W;
      const metalAt = (i) => { const x = i % alb.W, y = (i / alb.W) | 0; return metal[((y * sx | 0) * mw + (x * sx | 0)) * 4 + 2] / 255; };
      const dyed = (i) => mask[i] >= 1 && mask[i] <= GROUPS.length;
      // (A pale outfit's texels: 1 its old gold, made plain; 2 its gold trim, kept.)
      let old = null;
      if (rec.lift) {
        // (A pale outfit's gold is its trim, not its plate: a suit whose plates are brass under the trim, weathered, came out
        // gold and silver in flecks, the brighter brass kept and the darker dyed. Gold wider than a trim line, plate, is made
        // plain first, to be dyed whole as plate is; gold lines stay gold. And only long ones: embroidery's curls and the lit
        // knuckles of brass relief, kept gold among ivory, were leopard spots on his chest and pauldrons. They go plain too,
        // and show as the cloth's or plate's own relief.)
        const n = px.length / 4, g = new Uint8Array(n);
        for (let i = 0, k = 0; i < n; i++, k += 4) g[i] = dyed(i) && goldOf(px[k], px[k + 1], px[k + 2]) > 0.2 ? 1 : 0;
        const wide = wideOf(g, alb.W, alb.H, Math.max(1, Math.round(4 * S / 1024)));
        for (let i = 0, k = 0; i < n; i++, k += 4) g[i] = !wide[i] && dyed(i) && goldOf(px[k], px[k + 1], px[k + 2]) > 0.3 ? 1 : 0;
        const lines = linesOf(g, alb.W, alb.H, Math.max(6, Math.round(28 * S / 1024)));
        // (Its old gold, all of it but the trim kept, made as light as the rest of its piece first: a dull ochre, too dark
        // to be called gold, was dyed by its own light, and a suit drawn half in gold scrollwork came out pale swirls on a
        // darker ivory, a marbling, its thick gold white blocks. Its scrollwork now is in its relief alone.)
        old = new Uint8Array(n);
        const at = (j) => Math.min(n - 1, ((j / mw | 0) / sx | 0) * alb.W + ((j % mw) / sx | 0));
        const brass = (k) => { const [h, s] = hsvOf([px[k], px[k + 1], px[k + 2]]); return h > 0.04 && h < 0.2 && s > 0.2; };
        for (let i = 0, k = 0; i < n; i++, k += 4) {
          if (!dyed(i)) continue;
          if (lines[i] && goldOf(px[k], px[k + 1], px[k + 2]) > 0.3) { old[i] = 2; continue; }
          old[i] = wide[i] || brass(k) ? 1 : 0;
        }
        // (Its trim grown over its own darker gold, a texel a side in a picture of 512: the shading in a line, too dull to be
        // called gold, was dyed ivory, and his pauldrons' and chest's trim came out in broken flecks.)
        const trimmed = growInto(Uint8Array.from(old, (o) => (o === 2 ? 1 : 0)), alb.W, alb.H, (i) => dyed(i) && !wide[i] && brass(i * 4), Math.max(1, Math.round(S / 512)));
        for (let i = 0; i < n; i++) if (trimmed[i]) old[i] = 2;
        for (const gn of want) matchLum(px, (i) => old[i] === 1 && mask[i] === groupNo[gn], (i) => !old[i] && mask[i] === groupNo[gn]);
        // (And its metal and roughness made its piece's: left as they were, the old gold still shone as gold and took the
        // sky's and the ground's light, and below it was dyed as steel, greyer than the cream round it. A paladin's
        // filigree, thick trim and scrollwork were grey shapes over a matte ivory, a camouflage. The piece's own is the
        // middle of the rest of it.)
        const mid = {}, med = (L) => (L.sort((a, b) => a - b), L[L.length >> 1]);
        for (const gn of want) {
          const no = groupNo[gn], M = [], R = [];
          for (let j = 0; j < metal.length / 4; j++) { const i = at(j); if (mask[i] === no && !old[i]) { M.push(metal[j * 4 + 2]); R.push(metal[j * 4 + 1]); } }
          if (M.length) mid[no] = [med(M), med(R)];
        }
        for (let j = 0; j < metal.length / 4; j++) { const i = at(j), m = mid[mask[i]]; if (old[i] === 1 && m) { metal[j * 4 + 2] = m[0]; metal[j * 4 + 1] = m[1]; } }
        // (Its trim kept a polished metal, all of it: its own went from matte to metal along a line, and a trim made a clean
        // gold below was a yellow paint in places.)
        for (let j = 0; j < metal.length / 4; j++) if (old[at(j)] === 2) { metal[j * 4 + 2] = 217; metal[j * 4 + 1] = 110; }
        // (Gold in a field, wide: plate, its colour taken off and its own relief kept. Gold in short bits, a fleck: painted
        // out with the plate or cloth round it, or, its colour taken off, it was darker than the plate, a rust freckle.)
        const gild = new Uint8Array(n);
        for (let i = 0, k = 0; i < n; i++, k += 4) gild[i] = dyed(i) && goldOf(px[k], px[k + 1], px[k + 2]) > 0.08 ? 1 : 0;
        const short = (i) => gild[i] && !wide[i] && !lines[i] && old[i] !== 2;
        fillFrom(px, alb.W, alb.H, short, (j) => dyed(j) && !gild[j], Math.max(2, Math.min(7, Math.round(6 * S / 1024))));
        for (let i = 0, k = 0; i < n; i++, k += 4) {
          if (!wide[i] && !short(i)) continue;
          const [h, s, v] = hsvOf([px[k], px[k + 1], px[k + 2]]), c = fromHsv(h, s * 0.35, v);
          px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
        }
        // (And the trim kept is a clean gold, not the old brass's weathered ochre: left as it was, it was as light as the
        // ivory round it, and in its shading brown, a rust. Not dyed below.)
        polishGold(px, (i) => old[i] === 2);
      }
      // (Its gilt, as it was: kept gold by the dye, and left gold below. And a weak gold on metal, a trim, kept whole: not
      // on a pale outfit, whose trim is sorted out above.)
      const gilt = new Uint8Array(px.length / 4), trim = rec.lift ? null : new Float32Array(px.length / 4);
      for (let i = 0, k = 0; k < px.length; i++, k += 4) {
        if (!dyed(i)) continue;
        if (goldOf(px[k], px[k + 1], px[k + 2]) > 0.3 || (old && old[i] === 2)) gilt[i] = 1;
        if (trim) trim[i] = trimOf(px[k], px[k + 1], px[k + 2], metalAt(i));
      }
      for (const g of want) {
        const n = groupNo[g];
        const range = lumRange(px, (i) => mask[i] === n);
        // (Cloth and leather take the set's colours whole; steel most of them, so it's still steel, coloured.)
        rampMap(px, rec.colours[g], range, (i) => (mask[i] !== n || (old && old[i] === 2) ? 0 : (0.92 - 0.3 * metalAt(i)) * (trim ? 1 - trim[i] : 1)), rec.lift);
      }
      // (Dyed steel is steel with a colour to it, not a gilt or a bronze: in a tan set, a paladin's plate was gold under its
      // gold trim, gold on gold. On metal, the dye's colour half as strong, and a little lighter than the cloth it's over,
      // so an archer in green is green steel on a darker green, not one bottle-green mass; the trim's gold as it is. A pale
      // outfit's is light enough.)
      // (And its cloth a step under it: an archer's emerald skirt was the brightest thing on her, over near-black plate.)
      // (The lift is the darker steel's, and the lightest is drawn down a little: a lift of the whole made the archer's
      // pale breastplate a near-white mint. Cloth a little greyer than the dye: a rogue's lavender pouches were plastic.)
      // (A pale outfit's cloth is a little lighter and leans to ivory, a cream: a pale set's cape was a grey, the light
      // of its own mid-grey cloth. Its plate stays silver.)
      const up = 0.5;
      for (let i = 0, k = 0; k < px.length; i++, k += 4) {
        if (!dyed(i) || gilt[i] || (trim && trim[i] > 0.5)) continue;
        const m = metalAt(i);
        const [h, s, v] = hsvOf([px[k], px[k + 1], px[k + 2]]);
        let c;
        if (rec.lift) {
          // (Cloth to plate by how metal it is, not a switch at a fifth: where a piece's metalness wanders about that,
          // cream and grey steel took turns texel by texel, a camouflage. Plate a little less lifted and less ivory.)
          const t = Math.min(1, Math.max(0, (m - 0.1) / 0.35)), w = t * t * (3 - 2 * t);
          let V = Math.min(1, v * (1.15 - 0.1 * w));
          // (Its dark steel drawn up toward its plate's light, the more the more it's metal: as metal, dark paint takes no
          // light but its reflection's, and a paladin's black gauntlets under silver vambraces stayed black.)
          if (V < 0.7) V += (0.7 - V) * 0.6 * m;
          const a = fromHsv(h, s * (1 - 0.55 * m), V), iv = fromHsv(IVORY[0], Math.min(0.22, Math.max(s, IVORY[1])), V);
          c = a.map((x, j) => x + (iv[j] - x) * (0.55 - 0.25 * w));
        } else if (m <= 0.2) c = fromHsv(h, s * 0.78, v * 0.9);
        else {
          let V = v * (1 + up * m * Math.max(0, 1 - v / 0.8));
          if (V > 0.7) V -= (V - 0.7) * 0.5 * m;
          c = fromHsv(h, s * (1 - 0.55 * m), Math.min(1, V));
        }
        px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
      }
      alb.ctx.putImageData(img, 0, 0);
      if (rec.lift) mr.ctx.putImageData(mimg, 0, 0);
    }
    const tex = (pic, format) => {
      const mips = mipCountFor(pic.W, pic.H);
      const t = device.createTexture({ size: [pic.W, pic.H], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      device.queue.copyExternalImageToTexture({ source: pic.cv }, { texture: t, premultipliedAlpha: false }, [pic.W, pic.H]);
      const enc = device.createCommandEncoder();
      r.mip.generate(t, format, 1, mips, enc);
      device.queue.submit([enc.finish()]);
      return t;
    };
    const maps = [tex(alb, 'rgba8unorm-srgb'), tex(nrm, 'rgba8unorm'), tex(mr, 'rgba8unorm')];
    const sk = r.makeSkinned([prim], A.jc);
    r.addLod(sk, prim, 0.055);
    const ubo = device.createBuffer({ size: CHAR_UBO, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const matBG = device.createBindGroup({ layout: r.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: maps[0].createView() }, { binding: 2, resource: maps[1].createView() }, { binding: 3, resource: maps[2].createView() },
    ] });
    return { ...sk, ubo, matBG, gashData: new Float32Array(CHAR_UBO / 4), maps, cover: coverCode(rec.colours.chest || Object.values(rec.colours)[0]) };
  }

  // ---- what's in their hands -------------------------------------------------------------------------------------------

  // A kit prop's picture, in a palette: its colour picture as a canvas.
  async propPicture(glb, pal, withMetal = false) {
    const mat = glb.json.materials[glb.json.meshes[0].primitives[0].material];
    const img = glb.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source;
    const bmp = await createImageBitmap(imageBytes(glb, img), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const k = this.r.tier.texScale || 1, W = Math.max(64, Math.round(bmp.width * k)), H = Math.max(64, Math.round(bmp.height * k));
    const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, W, H); bmp.close();
    if (pal && pal !== 'own' && PROP_PALS[pal]) {
      const d = ctx.getImageData(0, 0, W, H), metal = withMetal ? propMetal(d.data) : null;
      paintProp(d.data, PROP_PALS[pal]); ctx.putImageData(d, 0, 0);
      if (!metal) return { cv, W, H };
      // (withMetal, px: its painted picture with its own metal in the alpha, for the prop shader (prop below). Not through
      // the canvas, which keeps its colours premultiplied, and would lose them where the alpha's low.)
      for (let i = 0; i < metal.length; i++) d.data[i * 4 + 3] = metal[i];
      return { cv, W, H, px: d.data };
    }
    return { cv, W, H };
  }

  // A piece of a party's armour on the ground: the plain piece it lies as (partygear.js groundModelOf), in its own dye.
  // id: dye/<item model>|<look>|<slot>|<rarity>|<the class of the body it was cut from>.
  async lyingDyed(id, s) {
    const [base, look, slot, rarity, cls] = id.slice(4).split('|');
    const buf = await fetch(`${this.base}assets/game/items/${base}.glb`).then((res) => { if (!res.ok) throw new Error(`${base}: ${res.status}`); return res.arrayBuffer(); });
    const glb = parseGLB(buf), pr = glb.json.meshes[0].primitives[0], a = pr.attributes, mat = glb.json.materials[pr.material];
    const srcOf = (t) => glb.json.textures[t.index].source, k = this.r.tier.texScale;
    const pic = await this.propPicture(glb, null);
    const ramp = paled(rampFor(lookOf(look), slot, rarity === undefined ? 2 : +rarity), cls);
    if (ramp) {
      const ctx = pic.cv.getContext('2d', { willReadFrequently: true }), d = ctx.getImageData(0, 0, pic.W, pic.H), px = d.data;
      // (The old knight's pieces it lies as are banded in gilt: kept gold over a dyed plate, the bands are stripes, and a
      // pair of cuisses a pair of striped socks. On the ground their bands are plain steel.)
      const steel = base.startsWith('knight_') ? new Float32Array(px.length / 4) : null;
      if (steel) for (let i = 0, k = 0; k < px.length; i++, k += 4) steel[i] = goldOf(px[k], px[k + 1], px[k + 2]);
      rampMap(px, ramp, lumRange(px, (i) => px[i * 4 + 3] > 128), (i) => (px[i * 4 + 3] > 8 ? 0.85 : 0), paleLift(cls));
      let sum = 0, n = 0;
      for (let i = 0, k = 0; k < px.length; i++, k += 4) {
        if (px[k + 3] <= 128) continue;
        if (steel && steel[i] > 0.05) {
          const [h, s, v] = hsvOf([px[k], px[k + 1], px[k + 2]]), c = fromHsv(h, s * 0.15, v * 0.82), w = steel[i];
          px[k] += (c[0] - px[k]) * w; px[k + 1] += (c[1] - px[k + 1]) * w; px[k + 2] += (c[2] - px[k + 2]) * w;
        }
        sum += lumOf(px[k], px[k + 1], px[k + 2]); n++;
      }
      // (A dark dye on the ground is lost in the dirt: lifted, as the pack's dark pictures are, to be seen lying there. And
      // a strong one, whole and on its own, is a toy's (a magenta coat, a pair of jeans): only a third of its colour left.)
      const lift = n ? Math.min(1.8, Math.max(1, 0.3 / Math.max(0.02, sum / n))) : 1;
      for (let k = 0; k < px.length; k += 4) {
        if (px[k + 3] <= 8) continue;
        const [h, s, v] = hsvOf([px[k], px[k + 1], px[k + 2]]), c = fromHsv(h, s * 0.35, Math.min(1, v * lift));
        px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
      }
      ctx.putImageData(d, 0, 0);
    }
    const [nrm, mr] = await Promise.all([
      this.r.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', k, true),
      this.r.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', k, true),
    ]);
    const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
    s.lying = this.r.lyingModel(prim, this.canvasTexture(pic, 'rgba8unorm-srgb'), nrm, mr, [0, 0, 0, 0]);
    s.tip = 0;
    s.ready = true;
  }

  canvasTexture(pic, format) {
    const { device } = this.r, mips = mipCountFor(pic.W, pic.H);
    const t = device.createTexture({ size: [pic.W, pic.H], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    if (pic.px) device.queue.writeTexture({ texture: t }, pic.px, { bytesPerRow: pic.W * 4 }, [pic.W, pic.H]);
    else device.queue.copyExternalImageToTexture({ source: pic.cv }, { texture: t, premultipliedAlpha: false }, [pic.W, pic.H]);
    const enc = device.createCommandEncoder();
    this.r.mip.generate(t, format, 1, mips, enc);
    device.queue.submit([enc.finish()]);
    return t;
  }

  async kitGlb(id) { return parseGLB(await fetch(`${this.base}assets/game/heroes/kit/${id}.glb`).then((res) => { if (!res.ok) throw new Error(`kit ${id}: ${res.status}`); return res.arrayBuffer(); })); }

  // A hero prop (renderer.js buildProp's), in a palette.
  prop(id, pal = 'own') {
    const key = `${id}|${pal}`;
    let p = this.props.get(key);
    if (!p) {
      p = (async () => {
        const glb = await this.kitGlb(id);
        if (!pal || pal === 'own') return this.r.buildProp(glb);
        const made = await this.r.buildProp(glb);
        const t = this.canvasTexture(await this.propPicture(glb, pal, true), 'rgba8unorm-srgb');
        made.bg = this.r.device.createBindGroup({ layout: this.r.bglProp, entries: [{ binding: 0, resource: t.createView() }, { binding: 1, resource: { buffer: made.ubo } }] });
        // (Its glint's y: 1, its metal is in its picture's alpha, its own steel's before it was painted.)
        this.r.device.queue.writeBuffer(made.ubo, 0, new Float32Array([0, 1, 0, 0]));
        return made;
      })();
      p.catch(() => this.props.delete(key));
      this.props.set(key, p);
    }
    return p;
  }

  // What the hero in a slot holds, by their kit (party.js kitFor), each in its palette.
  async setKit(slot, kit, pal, turn) {
    const c0 = this.r.chars[this.r.firstHero + slot];
    if (!c0 || c0.propBase === undefined) return;
    const ids = kitOf(kit || {});
    const palOf = (k) => pal?.[KIT_KEYS[k]] || (k === 1 && !kit.off ? pal?.main : null) || 'own';
    const models = await Promise.all(ids.map((id, k) => (id ? this.prop(id, palOf(k)) : null)));
    if (this.turns.get(slot) !== turn) return;
    const owner = this.r.firstHero + slot, base = this.r.chars[owner].propBase;
    models.forEach((m, k) => { this.r.props[base + k] = m ? { ...m, owner } : { empty: true }; });
  }

  // A weapon or shield of the party's lying on the ground (src/items/drops.js, renderer.js sword): id 'kit/<prop>|<palette>'.
  async lyingProp(id, s) {
    const [prop, pal] = id.slice(4).split('|');
    const glb = await this.kitGlb(prop);
    const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
    const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
    const alb = this.canvasTexture(await this.propPicture(glb, pal), 'rgba8unorm-srgb');
    // (Its colour is all a hero's prop has: a flat normal, and a matte, half metal finish.)
    const flat = (rgba) => { const t = this.r.device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }); this.r.device.queue.writeTexture({ texture: t }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]); return t; };
    s.lying = this.r.lyingModel(prim, alb, flat([128, 128, 255, 255]), flat([255, 150, 90, 255]), [0, 0, 0, 0]);
    s.tip = 0;
    s.ready = true;
  }
}

export { bodyClass };
