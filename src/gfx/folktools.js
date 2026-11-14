// What the townsfolk work with (src/gfx/folk.js): the smith's kit. His hammer, the tongs and the iron in them, the blade, the
// file and his rag; the bellows' board and leather and the pole that works them; the grindstone; the great axe on its rack;
// the coals in his hearth. Three small meshes of rigid pieces (src/folk/smithkit.js), each piece on one joint of a palette
// the town's thread writes after the smith's own joints in his slot (src/folk/folk.worker.js, SmithKit in src/folk/smithy.js):
// a tool in his hand while he's using it, where it lies when he isn't. Drawn whether or not he's there to be seen: it's the
// smithy's as much as his.
//
// After the joints come a few numbers (KD): how the fire's burning, how hot the iron is, how bright the axe's runes are,
// whether the stone's grinding and the tub's steaming. Those light what's lit of itself (materials.js ARMOR_KIT), turn the
// hearth's light and the axe's up and down, and throw the sparks, the steam and the embers.
import { F_PALETTE, FOLK_STRIDE, SLOT_HEAD } from '../folk/layout.js';
import { PEOPLE } from '../folk/people.js';
import { FIRE, FORGE, KD, KIT, STATIONS, TUB, WHEEL, inYard } from '../folk/smithy.js';
import { barMesh, coalMesh, kitMesh, paintStrips } from '../folk/smithkit.js';
import { TORCHES } from '../core/smithyard.js';

const UBO_BYTES = 24 * 64 + 256 + 16;
const MID = [-8.6, 1.2, 28.0], REACH = 7.5;     // the yard's middle, and how far anything of the kit is from it
const JOINTS = KIT.length;
const NUMBERS = (JOINTS - 1) * 8;               // where the numbers start, in what's read from the slot
const PART_LEVEL = [KD.GLOW, KD.HEAT, KD.FIRE]; // which number lights each mesh: the kit (the axe's runes), the iron, the coals

export class FolkTools {
  constructor(renderer) {
    this.r = renderer;
    this.owner = PEOPLE.findIndex((p) => p.id === 'homunculus');
    // The palette as the meshes take it: the world's own frame first (`yard`), then the kit's joints from the slot.
    this.pal = new Float32Array(JOINTS * 8); this.pal[3] = 1;
    this.num = new Float32Array(8);
    this.seen = this.casts = false;
    this.parts = null;
    this.last = 0; this.fresh = false;
    this.coals = inYard(STATIONS.fire, FIRE.coals);
    this.strike = inYard(STATIONS.anvil, FORGE.strike);
    this.stone = inYard(STATIONS.wheel, [0, WHEEL.axle + WHEEL.r, WHEEL.off]);
    this.tub = inYard(STATIONS.tub, [0, TUB.water + 0.05, TUB.off]);
  }

  // Made the first time they're wanted: the three meshes, and their paint as a strip of texels (colour; roughness, metal and
  // what's lit of itself).
  make() {
    const r = this.r, d = r.device, P = paintStrips();
    const strip = (format, px) => {
      const tex = d.createTexture({ size: [P.n, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      d.queue.writeTexture({ texture: tex }, new Uint8Array(px), { bytesPerRow: P.n * 4 }, [P.n, 1]);
      return tex;
    };
    const alb = strip('rgba8unorm-srgb', P.color), mr = strip('rgba8unorm', P.mr);
    const flat = r.pixel('rgba8unorm', [128, 128, 255, 255]);
    return [kitMesh(), barMesh(), coalMesh()].map((mesh) => {
      const ubo = d.createBuffer({ size: UBO_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      // (As the bodies have it, src/gfx/folk.js `info`; its first number is how lit this mesh's glowing paint is.)
      const info = new Float32Array([0, 1, 0, 1]);
      d.queue.writeBuffer(ubo, UBO_BYTES - 16, info);
      const matBG = d.createBindGroup({ layout: r.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: flat.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      const sk = r.makeSkinned([mesh], JOINTS);
      const pu = new Uint32Array(8); pu[0] = sk.count;
      d.queue.writeBuffer(sk.params, 0, pu);
      return { ...sk, matBG, ubo, info, level: -1 };
    });
  }

  // Where everything is in this slot, and whether it or its shadow could be on screen. joints: how many of its owner's own
  // come before it.
  cull(slot, joints, cam, planes) {
    this.seen = this.casts = this.fresh = false;
    if (!slot || this.owner < 0 || !joints) return;
    const o = SLOT_HEAD + this.owner * FOLK_STRIDE + F_PALETTE + joints * 8;
    // (Nothing written there yet: a slot from before the town knew its smith.)
    if (!(slot[o] || slot[o + 1] || slot[o + 2] || slot[o + 3])) return;
    const near = Math.hypot(MID[0] - cam.x, MID[2] - cam.z);
    if (near > 90) return;
    let inside = 1e9;
    for (let k = 0; k < 5; k++) inside = Math.min(inside, planes[k * 4] * MID[0] + planes[k * 4 + 1] * MID[1] + planes[k * 4 + 2] * MID[2] + planes[k * 4 + 3]);
    this.seen = inside > -REACH;
    this.casts = inside > -REACH - 4;
    if (!this.casts) return;
    for (let k = 0; k < NUMBERS; k++) this.pal[8 + k] = slot[o + k];
    for (let k = 0; k < 8; k++) this.num[k] = slot[o + NUMBERS + k];
    this.fresh = true;
    if (!this.parts) this.parts = this.make();
    this.live(near);
  }

  // What the numbers do in the world: the hearth's light and the axe's, and what flies.
  live(near) {
    const r = this.r, now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0, now - this.last));
    this.last = now;
    const fire = this.num[KD.FIRE], heat = this.num[KD.HEAT], glow = this.num[KD.GLOW], grind = this.num[KD.GRIND], steam = this.num[KD.STEAM];
    if (!this.lights) {
      const L = r.lights || [];
      this.lights = { hearth: L.find((l) => !l.yard && Math.hypot(l.p[0] - this.coals[0], l.p[2] - this.coals[2]) < 1.6), axe: L.find((l) => l.yard === 2) };
      for (const l of Object.values(this.lights)) if (l) l.i0 = l.i;
    }
    // (The village's light over the hearth: banked low, roaring when the bellows have been at it. The axe's, with its runes.)
    if (this.lights.hearth) this.lights.hearth.i = this.lights.hearth.i0 * (0.35 + 0.95 * fire);
    if (this.lights.axe) this.lights.axe.i = this.lights.axe.i0 * (0.15 + 1.5 * glow * glow);
    if (near > 45 || !dt) return;
    const some = (rate) => { const n = rate * dt; return Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); };
    // Embers up off the coals, by how hard they've been blown; a thread of smoke over them.
    let n = some(1.5 + 26 * Math.max(0, fire - 0.4));
    if (n) r.emit(6, n, this.coals[0] + (Math.random() - 0.5) * 0.3, this.coals[1] + 0.04, this.coals[2] + (Math.random() - 0.5) * 0.3, 0, 1, 0, 0.5, 0.4, 1.6, 0.004, 0.01, 0.5, 1.3);
    if ((n = some(0.6 + fire))) r.emit(4, n, this.coals[0], this.coals[1] + 0.3, this.coals[2], 0, 1, 0, 0.2, 0.2, 0.5, 0.1, 0.26, 1.6, 2.6);
    // The stone: a stream of sparks off the blade, the way it's turning (away from him, and down).
    if (grind > 0.5 && (n = some(70))) {
      const c = Math.cos(STATIONS.wheel.yaw), s = Math.sin(STATIONS.wheel.yaw);
      r.emit(2, n, this.stone[0] + (Math.random() - 0.5) * 0.03, this.stone[1] + 0.01, this.stone[2] + (Math.random() - 0.5) * 0.03, s, -0.25, c, 0.28, 2.2, 5.5, 0.003, 0.007, 0.12, 0.4);
    }
    // The tub: steam off the water while the iron's in it, and a while after.
    if (steam > 0.02 && (n = some(26 * steam))) r.emit(1, n, this.tub[0] + (Math.random() - 0.5) * 0.25, this.tub[1], this.tub[2] + (Math.random() - 0.5) * 0.25, 0, 1, 0, 0.35, 0.5, 1.4, 0.12, 0.34, 0.7, 1.7);
    // A spark or two up off each torch.
    for (const t of TORCHES) if (Math.random() < dt * 0.8) r.emit(6, 1, t[0], t[1] + 2.45, t[2], 0, 1, 0, 0.4, 0.3, 1.0, 0.004, 0.009, 0.5, 1.2);
    void heat;
  }

  // A blow on the anvil (src/main.js townEvent): sparks off the iron, by how hot it was.
  blow(hot) {
    if (!(hot > 0.18)) return;
    const st = STATIONS.anvil, s = Math.sin(st.yaw), c = Math.cos(st.yaw);
    this.r.emit(2, Math.round(10 + 46 * hot), this.strike[0], this.strike[1] + 0.02, this.strike[2], s * 0.25, 0.75, c * 0.25, 1.1, 1.6, 5.2, 0.003, 0.008, 0.18, 0.6);
  }

  upload(q) {
    if (!this.fresh) return;
    this.parts.forEach((p, i) => {
      q.writeBuffer(p.palette, 0, this.pal);
      const level = Math.max(0, Math.min(1, this.num[PART_LEVEL[i]]));
      if (Math.abs(level - p.level) > 0.003) { p.level = level; p.info[0] = level; q.writeBuffer(p.ubo, UBO_BYTES - 16, p.info); }
    });
  }

  compute(cp) {
    if (!this.fresh) return;
    for (const p of this.parts) { cp.setBindGroup(0, p.bg); cp.dispatchWorkgroups(Math.ceil(p.count / 128)); }
  }

  shadow(sp) {
    if (!this.fresh) return;
    // (The coals throw no shadow worth the drawing.)
    for (const p of this.parts.slice(0, 2)) { sp.setVertexBuffer(0, p.outBuf); sp.setIndexBuffer(p.IB, 'uint32'); sp.drawIndexed(p.indices); }
  }

  // With the kit's own shading; whatever was drawing is put back after (the bodies, with the armour's: src/gfx/folk.js draw).
  draw(mp) {
    if (!this.fresh || !this.seen) return;
    mp.setPipeline(this.r.pArmorKit);
    for (const p of this.parts) {
      mp.setBindGroup(1, p.matBG); mp.setVertexBuffer(0, p.outBuf); mp.setVertexBuffer(1, p.sideVB);
      mp.setIndexBuffer(p.IB, 'uint32'); mp.drawIndexed(p.indices);
    }
    mp.setPipeline(this.r.pArmor);
  }
}
