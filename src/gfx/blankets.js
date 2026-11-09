// Blankets over the townsfolk abed (src/gfx/folk.js). The beds in the houses have a cover on the mattress and no more, and
// there are no clips for sleeping, so whoever's lying down is tucked under a wool blanket shaped over them: from their
// shoulders to past the foot, raised over each body in it, hanging down over the sides and the end, with the linen sheet
// turned down over its top edge. One wool to a house. A blanket's shape is made when a bed's first slept in that way (one
// sleeper on either side, or both, or one in the middle) and kept; it never moves, so it's skinned once.
import { F, FOLK_STRIDE, SLOT_HEAD } from '../folk/layout.js';

const UBO_BYTES = 24 * 64 + 256 + 16;
// Madder, undyed brown, moss, oatmeal, mulberry, walnut, rust, slate. (No blue with gold anywhere: that's Tessariel's.)
const WOOLS = ['#6e2a20', '#5d4a32', '#47552f', '#8b7a5c', '#55293a', '#3e3428', '#7a4a26', '#4f4a44'];
// Some houses' own: the Halloways' woad (its bands grey-white, not cream), the Ashbys' madder.
const HOUSE_WOOL = { halloway: ['#36435a', '#bdbcb6'], reeve: ['#6e2a20'] };
// Two to a bed lie this far either side of its middle (lieDown in src/folk/brain.js).
const LAT = 0.25;
const S = 512;

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Blankets {
  constructor(renderer, count) {
    this.r = renderer; this.count = count;
    this.beds = null;
    this.meshes = new Map();     // bed * 8 + who's in it -> mesh
    this.wools = [];
    this.drawn = [];
    this.masks = new Map();
    this.info = new Float32Array([0, 1, 0, 1]);
  }

  setBeds(beds) { this.beds = beds; }

  // A house's wool, painted on a canvas: uneven dye, two bands near the foot, the sheet along the top, a twill all over.
  wool(k) {
    if (this.wools[k]) return this.wools[k];
    const w = this.wools[k] = { ready: false, bg: null };
    this.paint(k).then((bg) => { w.bg = bg; w.ready = true; }).catch((e) => console.warn('blanket wool', e));
    return w;
  }

  async paint(k) {
    const r = this.r;
    const cv = new OffscreenCanvas(S, S), g = cv.getContext('2d');
    let seed = 1 + k * 7919;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const own = HOUSE_WOOL[this.beds?.find((b) => b.house === k)?.hid] || [];
    g.fillStyle = own[0] || WOOLS[k % WOOLS.length]; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * S, h = 2 + rnd() * 10;
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,220' : '20,10,5'},${0.025 + rnd() * 0.04})`;
      g.fillRect(0, y, S, h);
    }
    const pale = own[1] || '#cbbf9f';
    for (const [y0, h, c] of [[0.8, 0.012, '#2a2018'], [0.815, 0.03, pale], [0.848, 0.012, '#2a2018'], [0.875, 0.012, '#2a2018'], [0.89, 0.018, pale], [0.911, 0.012, '#2a2018']]) {
      g.fillStyle = c; g.fillRect(0, y0 * S, S, h * S);
    }
    g.fillStyle = '#d9d1bd'; g.fillRect(0, 0, S, 0.075 * S);
    g.fillStyle = 'rgba(90,80,60,0.35)'; g.fillRect(0, 0.07 * S, S, 2);
    g.fillStyle = 'rgba(90,80,60,0.18)'; g.fillRect(0, 0.06 * S, S, 1);
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const t = ((x + y) % 16 < 8 ? 0.03 : 0) + (x % 8 === 0 ? -0.015 : 0) + (rnd() - 0.5) * 0.04, o = (y * S + x) * 4;
        for (let c = 0; c < 3; c++) d[o + c] = Math.max(0, Math.min(255, d[o + c] * (1 + t)));
      }
    }
    g.putImageData(img, 0, 0);
    const alb = await r.bitmapTexture(await cv.convertToBlob(), 'rgba8unorm-srgb', 1);
    if (!this.weave) this.weave = this.ribs();
    const weave = await this.weave;
    const ubo = r.device.createBuffer({ size: UBO_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    r.device.queue.writeBuffer(ubo, UBO_BYTES - 16, this.info);
    this.mr = this.mr || r.pixel('rgba8unorm', [0, 236, 0, 255]);
    return r.device.createBindGroup({ layout: r.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: weave.createView() }, { binding: 3, resource: this.mr.createView() },
    ] });
  }

  // The weave's relief, as a normal map: diagonal ribs.
  async ribs() {
    const nv = new OffscreenCanvas(S, S), ng = nv.getContext('2d'), ni = ng.createImageData(S, S), nd = ni.data;
    // (A twill of 16 texels, about 5 cm on a bed: at 6 it shimmered like carbon fibre.)
    const h = (x, y) => Math.sin((x + y) * Math.PI / 8) * 0.6 + Math.sin(x * Math.PI / 4) * 0.25;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (h(x + 1, y) - h(x - 1, y)) * 0.32, dy = (h(x, y + 1) - h(x, y - 1)) * 0.32, l = Math.hypot(dx, dy, 1), o = (y * S + x) * 4;
        nd[o] = (-dx / l * 0.5 + 0.5) * 255; nd[o + 1] = (-dy / l * 0.5 + 0.5) * 255; nd[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd[o + 3] = 255;
      }
    }
    ng.putImageData(ni, 0, 0);
    return this.r.bitmapTexture(await nv.convertToBlob(), 'rgba8unorm', 1);
  }

  // The blanket over bed b with mask's sleepers in it (bit 0 the left of it, 1 the middle, 2 the right), in the world.
  mesh(b, mask) {
    const key = b * 8 + mask;
    if (this.meshes.has(key)) return this.meshes.get(key);
    const bed = this.beds[b], r = this.r;
    const fx = Math.sin(bed.foot), fz = Math.cos(bed.foot), rx = -Math.cos(bed.foot), rz = Math.sin(bed.foot);
    const floor = !!bed.floor, small = !floor && !!bed.small;
    // (Measured off the bodies as they lie, the get_up clip's first frame sunk 0.1 into the mattress (lieDown in brain.js): an
    // adult's head about 0.8 up the bed from its middle, shoulders 0.62, feet 0.9 down; at most 0.3 high, a gown 0.37 over the
    // knees, and 0.37 out either side over the arms. A child's about two thirds of that.)
    const top = floor ? bed.y + 0.1 : bed.y, half = floor ? 0.42 : Math.min(0.6, (bed.width || 1.25) / 2 - 0.02);
    // (The mattress runs to 1.225 down the bed from its middle and the frame to 1.25: the blanket goes over the end of both.)
    const end = floor ? 1.02 : small ? 1.0 : 1.24, drop = floor ? 0.095 : 0.24;
    const u0 = floor ? -0.47 : small ? -0.42 : -0.6, u1 = end + 0.13, v0 = -half - 0.13, v1 = half + 0.13, NU = 40, NV = 28;
    const who = [-1, 0, 1].filter((s, k) => mask & (1 << k)).map((s) => s * LAT);
    // Everything of them but the head is sunk into the mattress (TUCK in src/folk/rig.js), so the blanket only has to look like
    // it's over somebody: a soft rise, highest over the chest, lower over the legs, a little lift where the toes are; round
    // across, as wool lies over a body, not flat-topped.
    const H = floor ? 0.16 : small ? 0.12 : 0.17, sig = (who.length > 1 ? 0.2 : 0.23) * (small ? 0.75 : 1), sc = small ? 0.68 : 1;
    const ALONG = [[-0.62, 0.45], [-0.45, 0.85], [-0.25, 1.0], [0.05, 0.86], [0.4, 0.66], [0.72, 0.56], [0.88, 0.72], [0.98, 0.6], [1.1, 0.0]];
    const along = (u) => {
      const t = u / sc;
      if (t <= ALONG[0][0]) return ALONG[0][1];
      for (let k = 1; k < ALONG.length; k++) {
        const [a, ha] = ALONG[k - 1], [b, hb] = ALONG[k];
        if (t <= b) return ha + (hb - ha) * smoothstep(0, 1, (t - a) / (b - a));
      }
      return 0;
    };
    const lump = (dv, u) => H * along(u) * Math.exp(-(dv * dv) / (sig * sig));
    const n = (NU + 1) * (NV + 1);
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i <= NU; i++) {
      const u = u0 + (u1 - u0) * i / NU;
      for (let j = 0; j <= NV; j++) {
        const v = v0 + (v1 - v0) * j / NV;
        const vc = Math.max(-half, Math.min(half, v)), uc = Math.min(end, u);
        let h = 0;
        for (const a of who) h = Math.max(h, lump(vc - a, uc));
        h += 0.035 + (i === 0 ? 0.012 : 0);
        h -= drop * Math.max(smoothstep(half - 0.02, half + 0.11, Math.abs(v)), smoothstep(end - 0.02, end + 0.12, u));
        const o = i * (NV + 1) + j;
        pos[o * 3] = bed.x + fx * u + rx * v; pos[o * 3 + 1] = top + h; pos[o * 3 + 2] = bed.z + fz * u + rz * v;
        uv[o * 2] = (v - v0) / (v1 - v0); uv[o * 2 + 1] = (u - u0) / (u1 - u0);
      }
    }
    const nrm = new Float32Array(n * 3);
    const P = (i, j) => (Math.min(NU, Math.max(0, i)) * (NV + 1) + Math.min(NV, Math.max(0, j))) * 3;
    for (let i = 0; i <= NU; i++) {
      for (let j = 0; j <= NV; j++) {
        const a = P(i + 1, j), c = P(i - 1, j), d = P(i, j + 1), e = P(i, j - 1);
        const ax = pos[a] - pos[c], ay = pos[a + 1] - pos[c + 1], az = pos[a + 2] - pos[c + 2];
        const bx = pos[d] - pos[e], by = pos[d + 1] - pos[e + 1], bz = pos[d + 2] - pos[e + 2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const l = Math.hypot(nx, ny, nz) || 1, o = P(i, j);
        nrm[o] = nx / l; nrm[o + 1] = ny / l; nrm[o + 2] = nz / l;
      }
    }
    const idx = new Uint32Array(NU * NV * 6);
    let k = 0;
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, c = a + NV + 1;
        idx[k++] = a; idx[k++] = c; idx[k++] = a + 1; idx[k++] = a + 1; idx[k++] = c; idx[k++] = c + 1;
      }
    }
    const sk = r.makeSkinned([{ pos, nrm, uv, idx }], 1);
    r.device.queue.writeBuffer(sk.palette, 0, new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    const pu = new Uint32Array(8); pu[0] = sk.count;
    r.device.queue.writeBuffer(sk.params, 0, pu);
    const m = { ...sk, wool: this.wool(bed.house), fresh: true };
    this.meshes.set(key, m);
    return m;
  }

  // Which beds have someone settled in them in this slot, near enough to see.
  update(slot, cam) {
    const out = this.drawn;
    out.length = 0;
    if (!slot || !this.beds) return;
    const masks = this.masks;
    masks.clear();
    for (let i = 0; i < this.count; i++) {
      const o = SLOT_HEAD + i * FOLK_STRIDE;
      if (slot[o + F.ACTIVE] < 0.5) continue;
      const v = slot[o + F.BED];
      if (!(v >= 0)) continue;
      const b = Math.floor(v / 4), side = (v % 4) | 0;
      masks.set(b, (masks.get(b) || 0) | (1 << side));
    }
    for (const [b, mask] of masks) {
      const bed = this.beds[b];
      if (!bed || Math.hypot(bed.x - cam.x, bed.z - cam.z) > 60) continue;
      const m = this.mesh(b, mask);
      if (m.wool.ready) out.push(m);
    }
  }

  compute(cp) {
    for (const m of this.drawn) if (m.fresh) { m.fresh = false; cp.setBindGroup(0, m.bg); cp.dispatchWorkgroups(Math.ceil(m.count / 128)); }
  }

  shadow(sp) {
    for (const m of this.drawn) { sp.setVertexBuffer(0, m.outBuf); sp.setIndexBuffer(m.IB, 'uint32'); sp.drawIndexed(m.indices); }
  }

  draw(mp) {
    for (const m of this.drawn) {
      mp.setBindGroup(1, m.wool.bg); mp.setVertexBuffer(0, m.outBuf); mp.setVertexBuffer(1, m.sideVB);
      mp.setIndexBuffer(m.IB, 'uint32'); mp.drawIndexed(m.indices);
    }
  }
}
