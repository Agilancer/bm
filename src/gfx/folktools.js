// What the townsfolk work with (src/gfx/folk.js): the smith's hammer. One small rigid mesh (src/folk/smithy.js), skinned by
// a single joint the town's thread writes after its owner's own in the slot (src/folk/folk.worker.js `tools`): in his hand
// while he works, on the anvil's face when he doesn't. Drawn whether or not he's there to be seen: it's the smithy's as
// much as his.
import { F_PALETTE, FOLK_STRIDE, SLOT_HEAD } from '../folk/layout.js';
import { PEOPLE } from '../folk/people.js';
import { HAMMER_PAINT, dqOrigin, hammerMesh } from '../folk/smithy.js';

const UBO_BYTES = 24 * 64 + 256 + 16;

export class FolkTools {
  constructor(renderer) {
    this.r = renderer;
    this.owner = PEOPLE.findIndex((p) => p.id === 'homunculus');
    this.pal = new Float32Array(8);
    this.at = [0, 0, 0];
    this.seen = this.casts = false;
    this.hammer = null;
  }

  // Made the first time it's wanted: the mesh, and its paint as a strip of four texels (colour; roughness and metal).
  make() {
    const r = this.r, d = r.device, n = HAMMER_PAINT.length;
    const strip = (format, px) => {
      const tex = d.createTexture({ size: [n, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      d.queue.writeTexture({ texture: tex }, new Uint8Array(px), { bytesPerRow: n * 4 }, [n, 1]);
      return tex;
    };
    const alb = strip('rgba8unorm-srgb', HAMMER_PAINT.flatMap((c) => [c[0], c[1], c[2], 255]));
    const mr = strip('rgba8unorm', HAMMER_PAINT.flatMap((c) => [255, c[3], c[4], 255]));
    const flat = r.pixel('rgba8unorm', [128, 128, 255, 255]);
    const ubo = d.createBuffer({ size: UBO_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    // (As the bodies and their blankets have it: src/gfx/folk.js `info`.)
    d.queue.writeBuffer(ubo, UBO_BYTES - 16, new Float32Array([0, 1, 0, 1]));
    const matBG = d.createBindGroup({ layout: r.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: flat.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    const sk = r.makeSkinned([hammerMesh()], 1);
    const pu = new Uint32Array(8); pu[0] = sk.count;
    d.queue.writeBuffer(sk.params, 0, pu);
    return { ...sk, matBG };
  }

  // Where it is in this slot, and whether it or its shadow could be on screen. joints: how many of its owner's own come before it.
  cull(slot, joints, cam, planes) {
    this.seen = this.casts = false;
    if (!slot || this.owner < 0 || !joints) return;
    const o = SLOT_HEAD + this.owner * FOLK_STRIDE + F_PALETTE + joints * 8;
    for (let k = 0; k < 8; k++) this.pal[k] = slot[o + k];
    // (Nothing written there yet: a slot from before the town knew its smith.)
    if (!(this.pal[0] || this.pal[1] || this.pal[2] || this.pal[3])) return;
    const [x, y, z] = dqOrigin(this.pal, 0, this.at);
    if (Math.hypot(x - cam.x, z - cam.z) > 60) return;
    let inside = 1e9;
    for (let k = 0; k < 5; k++) inside = Math.min(inside, planes[k * 4] * x + planes[k * 4 + 1] * y + planes[k * 4 + 2] * z + planes[k * 4 + 3]);
    this.seen = inside > -0.5;
    this.casts = inside > -4;
    if (this.casts && !this.hammer) this.hammer = this.make();
  }

  upload(q) { if (this.casts) q.writeBuffer(this.hammer.palette, 0, this.pal); }

  compute(cp) {
    if (!this.casts) return;
    cp.setBindGroup(0, this.hammer.bg);
    cp.dispatchWorkgroups(Math.ceil(this.hammer.count / 128));
  }

  shadow(sp) {
    if (!this.casts) return;
    const h = this.hammer;
    sp.setVertexBuffer(0, h.outBuf); sp.setIndexBuffer(h.IB, 'uint32'); sp.drawIndexed(h.indices);
  }

  draw(mp) {
    if (!this.seen) return;
    const h = this.hammer;
    mp.setBindGroup(1, h.matBG); mp.setVertexBuffer(0, h.outBuf); mp.setVertexBuffer(1, h.sideVB);
    mp.setIndexBuffer(h.IB, 'uint32'); mp.drawIndexed(h.indices);
  }
}
