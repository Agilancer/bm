// Monsters' skins on a phone, A/B on the same body (README "Monsters' skins on a phone"): writes the steps for
// tools/memory/raw.mjs that take each named boss to its door in its delve, then stand it and others one at a time in the
// Test Dungeon's white hall in the dye the game gives it; freeze the world, fix the camera in front of it, and save the
// canvas twice: with the textures it wears (..._B.png), and with ones made in the same page by main's rule before this
// change (dyed: the tier's shrink alone, 1024 from a 4096 picture; plain: texCap; normals and metal not close), swapped
// onto the same body (..._A.png). Each skin's size is logged as it goes.
//   node tools/monsters/skins_ab.mjs steps.json [only] [tag]
//     only: some of the hall's, by name (castellan,knight), and no delves; tag: the shots' first letter(s), S by default
//   PORT=<the server's> PHONE=iphone node tools/memory/raw.mjs steps.json
//   (Packed as an iPhone packs them, ASTC: FLAGS=--enable-unsafe-swiftshader Q='&soft=1&astc=1', and a tag of its own.
//   SwiftShader is slow: give it TIMEOUT=1800.)
//   python tools/monsters/skins_pairs.py tools/build/shots tools/build/shots <out>     (A|B sheets, 2x crops, sharpness)
// Shots go to tools/build/shots/S_<delve|hall>_<who>_<metres>m_<A|B>.png (bm.shot, the canvas alone, as the phone draws it).
// One with a colours cap of its own in the hall's list (the gods) is shot a third time in colours to that cap, its maps
// as it wears them (..._C.png): what it would look like, not what this game gives it.
import fs from 'node:fs';
const out = process.argv[2] || 'skins_ab.json';
const only = process.argv[3] ? process.argv[3].split(',') : null, TAG = process.argv[4] || 'S';

const helpers = `
window.__errs = [];
window.__TAG = __TAG__;
bm.renderer.device.addEventListener('uncapturederror', (e) => window.__errs.push(String(e.error?.message || e).slice(0, 200)));
bm.renderer.hideVM = true;
bm.fixScale(1);
window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.__L = await import('/src/core/layout.js');
window.__cam = (ex, ey, ez, tx, ty, tz) => {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
};
// The body wearing this roster id: its place in the snapshot's chars, and where it stands.
window.__find = (id) => {
  const { C, C_SIZE, CHARS_START } = __L, snap = bm.snap(), ids = bm.renderer.tripo.ids, want = ids.indexOf(id) + 1;
  for (let i = 0; i < 105; i++) {
    const o = CHARS_START + i * C_SIZE;
    if (snap[o + C.ACTIVE] > 0.5 && (snap[o + C.MODEL] | 0) === want) return { i, x: snap[o + C.X], y: snap[o + C.Y], z: snap[o + C.Z], yaw: snap[o + C.YAW], pal: snap[o + C.PAL] | 0 };
  }
  return null;
};
window.__ready = async (id, s = 60) => {
  let b = null;
  for (let t = 0; t < s; t++) {
    await __sleep(1000);
    b = __find(id);
    const ch = b && bm.renderer.chars[b.i];
    if (ch && !ch.pending && ch.tripo && ch.ubo) return b;
  }
  return null;
};
window.__skins = async () => {
  const out = [], T = bm.renderer.tripo;
  for (const [k, p] of T.skins) { try { const t = await p; out.push(k + ' ' + t.width + 'x' + t.height + ' ' + t.format + ' mips' + t.mipLevelCount); } catch (e) { out.push(k + ' failed'); } }
  for (const [k, p] of T.models) { try { const m = await p; out.push('model ' + k + ' nrm ' + m.nrm.width + 'x' + m.nrm.height + ' mr ' + m.mr.width + 'x' + m.mr.height); } catch (e) { out.push('model ' + k + ' failed'); } }
  return out;
};
// Frozen, and shot from in front of it (its own facing, turned by side), at each distance (m), the eye a little under
// its middle, looking at its chest.
// main's textures for this body, made in this page by main's own rule: its colours plain to texCap (256), dyed in the
// bake worker by the tier's shrink alone (no cap: 1024 from a 4096 picture); its normals and metal by bitmapTexture,
// not close (128). The same worker and upload as the branch's, handed main's numbers.
window.__mainMaps = async (b, id) => {
  const r = bm.renderer, T = r.tripo, ch = r.chars[b.i], ts = r.tier.texScale;
  const { decodeScaledBitmap } = await import('/src/gfx/gpu.js');
  const { parseGLB, imageBytes } = await import('/src/core/glb.js');
  const m = await T.model(id), p = T.palettes[b.pal] || {};
  const plain = !p.hue && (p.sat ?? 1) === 1 && (p.val ?? 1) === 1 && !p.tamt;
  const step = r.astc.on ? 4 : 1;
  let bmp;
  if (plain) bmp = await decodeScaledBitmap(m.alb, ts, r.tier.texCap, step);
  else {
    const w = (window.__mainBaker ||= new Worker('/src/gfx/bake.worker.js', { type: 'module' }));
    bmp = await new Promise((ok, no) => { w.onmessage = (e) => (e.data.error ? no(new Error(e.data.error)) : ok(e.data.bmp)); w.postMessage({ id: 1, blob: m.alb, rule: { scale: ts, cap: 0, step }, pal: p }); });
  }
  const alb = await r.pictureTexture(bmp, 'rgba8unorm-srgb');
  const src = T.roster[id].src || id;
  const glb = parseGLB(await (await fetch('/assets/monsters/tripo/' + src + '.glb')).arrayBuffer());
  const mat = glb.json.materials[glb.json.meshes[0].primitives[0].material ?? 0], srcOf = (t) => glb.json.textures[t.index].source;
  const nrm = await r.bitmapTexture(imageBytes(glb, srcOf(mat.normalTexture)), 'rgba8unorm', ts);
  const mr = await r.bitmapTexture(imageBytes(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture)), 'rgba8unorm', ts);
  const bg = r.device.createBindGroup({ layout: r.bglArmor, entries: [
    { binding: 0, resource: { buffer: ch.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
  ] });
  const own = await T.skins.get(id + ':' + b.pal), mo = await T.models.get(id);
  return { bg, own: ch.matBG, maps: [alb, nrm, mr], sizes: 'main ' + alb.width + '/' + nrm.width + '/' + mr.width + ' branch ' + own.width + '/' + mo.nrm.width + '/' + mo.mr.width };
};
// Its colours to a cap of its own (scale 1: the cap decides), dyed as it is, on its own maps.
window.__capped = async (b, id, cap) => {
  const r = bm.renderer, T = r.tripo, ch = r.chars[b.i], step = r.astc.on ? 4 : 1;
  const { decodeScaledBitmap } = await import('/src/gfx/picsize.js');
  const m = await T.model(id), p = T.palettes[b.pal] || {};
  const plain = !p.hue && (p.sat ?? 1) === 1 && (p.val ?? 1) === 1 && !p.tamt;
  let bmp;
  if (plain) bmp = await decodeScaledBitmap(m.alb, 1, cap, step);
  else {
    const w = (window.__mainBaker ||= new Worker('/src/gfx/bake.worker.js', { type: 'module' }));
    bmp = await new Promise((ok, no) => { w.onmessage = (e) => (e.data.error ? no(new Error(e.data.error)) : ok(e.data.bmp)); w.postMessage({ id: 2, blob: m.alb, rule: { scale: 1, cap, step }, pal: p }); });
  }
  const alb = await r.pictureTexture(bmp, 'rgba8unorm-srgb');
  const bg = r.device.createBindGroup({ layout: r.bglArmor, entries: [
    { binding: 0, resource: { buffer: ch.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: m.nrm.createView() }, { binding: 3, resource: m.mr.createView() },
  ] });
  return { bg, alb };
};
window.__shoot = async (where, who, id, b, dists, side, cap = 0) => {
  const r = bm.renderer, h = r.tripo.roster[id].height, a0 = b.yaw + side, got = [];
  const A = await __mainMaps(b, id), ch = r.chars[b.i], C = cap ? await __capped(b, id, cap) : null;
  for (const d of dists) {
    const ex = b.x + Math.sin(a0) * d, ez = b.z + Math.cos(a0) * d;
    bm.setCam(__cam(ex, b.y + Math.min(1.7 + d * 0.06, h * 0.7), ez, b.x, b.y + h * 0.6, b.z));
    await __sleep(1500);
    ch.matBG = A.own;
    await __sleep(400);
    await bm.shot(__TAG + '_' + where + '_' + who + '_' + d + 'm_B');
    ch.matBG = A.bg;
    await __sleep(400);
    await bm.shot(__TAG + '_' + where + '_' + who + '_' + d + 'm_A');
    if (C) { ch.matBG = C.bg; await __sleep(400); await bm.shot(__TAG + '_' + where + '_' + who + '_' + d + 'm_C'); }
    ch.matBG = A.own;
    got.push(d);
  }
  await __sleep(300);
  A.maps.forEach((t) => t.destroy());
  C?.alb.destroy();
  return got.join(',') + ' ' + A.sizes + (C ? ' C ' + C.alb.width : '');
};
window.__delve = async (boss, id, dists, side = 0) => {
  bm.shared.input[__L.INPUT.PAUSE] = 0;
  bm.setCam(null);
  bm.warrens('boss', { boss });
  let b = await __ready(id, 70);
  if (!b) return boss + ': no body';
  await __sleep(2000);
  bm.shared.input[__L.INPUT.PAUSE] = 1;
  await __sleep(800);
  b = __find(id);
  // (On a slow GPU a body can be made again while the world stops: wait for its own buffers.)
  for (let t = 0; t < 30 && !(b && bm.renderer.chars[b.i]?.ubo); t++) { await __sleep(500); b = __find(id); }
  if (!b) return id + ': no body when stopped';
  const got = await __shoot('delve', boss, id, b, dists, side);
  return boss + ' ' + id + ' pal ' + b.pal + ' yaw ' + b.yaw.toFixed(2) + ' shots ' + got;
};
window.__hall = async (who, id, pal, dists, side = 0, cap = 0) => {
  bm.shared.input[__L.INPUT.PAUSE] = 0;
  bm.setCam(null);
  bm.hall('clear');
  await __sleep(1500);
  bm.hall('summon', { list: [{ id: 'tripo:' + id, n: 1, opt: { pal } }] });
  let b = await __ready(id, 60);
  if (!b) return who + ': no body; hall ' + JSON.stringify(bm.hallState());
  await __sleep(1200);
  bm.shared.input[__L.INPUT.PAUSE] = 1;
  await __sleep(800);
  b = __find(id);
  // (On a slow GPU a body can be made again while the world stops: wait for its own buffers.)
  for (let t = 0; t < 30 && !(b && bm.renderer.chars[b.i]?.ubo); t++) { await __sleep(500); b = __find(id); }
  if (!b) return id + ': no body when stopped';
  const got = await __shoot('hall', who, id, b, dists, side, cap);
  return who + ' ' + id + ' pal ' + b.pal + ' shots ' + got;
};
return 'ok ' + bm.renderer.tier.name + ' texCap ' + bm.renderer.tier.texCap + ' near ' + bm.renderer.tier.texCapNear + ' astc ' + bm.renderer.astc.on + ' ' + bm.renderer.W + 'x' + bm.renderer.H;
`;

// [delve boss key, roster id, distances (m), turned (rad)]
const delves = [
  ['castellan', 'bv_castellan', [6, 11], 0.3],
  ['ironmarshal', 'ib_marshal', [7, 12], 0.3],
  ['wyrm', 'kb_wyrm', [11, 18], 0.3],
];
// [name, roster id, the dye the game gives it, distances (m), turned, a colours cap to shoot it in as well]
const hall = [
  ['castellan', 'bv_castellan', 'Infernal', [3, 6], 0.25],
  ['ironmarshal', 'ib_marshal', 'Oxblood', [3.5, 7], 0.25],
  ['ossivar', 'kb_wyrm', 'Bone-white', [7, 13], 0.5],
  ['thyrraxis', 'ed_thyrraxis', 'Base', [12, 20], 0.5, 1024],
  ['tollgiant', 'ma_tollgiant', 'Base', [5.5, 10], 0.25],
  ['knight', 'velscour_knight_1', 'Infernal', [2.2, 4.5], 0.25],
  ['necro', 'necromancer_3', 'Ashen', [2.2, 4.5], 0.25],
];
const steps = [{ wait: 8000 }, { log: helpers.replace('__TAG__', JSON.stringify(TAG)) }, { mem: 'start' }];
const after = () => {
  steps.push({ log: 'return (await __skins()).join(" | ")' });
  steps.push({ log: 'return "GPU textures " + (window.__gpu.tex / 1048576).toFixed(1) + " MB; errors " + __errs.length + (__errs.length ? " " + __errs[0] : "")' });
};
if (!only) for (const [boss, id, d, side] of delves) { steps.push({ log: `return await __delve(${JSON.stringify(boss)}, ${JSON.stringify(id)}, ${JSON.stringify(d)}, ${side})` }); after(); }
steps.push({ eval: 'bm.shared.input[__L.INPUT.PAUSE] = 0; bm.setCam(null); await bm.testDungeon();' }, { wait: 8000 });
for (const [who, id, pal, d, side, cap] of hall) {
  if (only && !only.includes(who)) continue;
  steps.push({ log: `return await __hall(${JSON.stringify(who)}, ${JSON.stringify(id)}, ${JSON.stringify(pal)}, ${JSON.stringify(d)}, ${side}, ${cap || 0})` });
  after();
}
steps.push({ mem: 'end' }, { top: 12 });
fs.writeFileSync(out, JSON.stringify(steps, null, 1));
console.log('wrote', out, steps.length, 'steps');
