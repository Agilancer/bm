// Headwear for the palette swaps (tools/folk/hats.py made it; src/gfx/folk.js wears it): each hat is made round a head of
// radius 1 at its origin, Y up, Z the way the face looks, and fitted here to one body's own head, in that body's bind pose,
// hung whole on its Head joint. So it turns and nods with the head and costs a few hundred vertices more, no more.

// Which of a body's joints is its head, and its head's size and where it is: from the vertices that joint moves most.
// names: the skin's joints' node names, in order; prim: { pos, joints, weights }. Null when there's no head to be found.
export function headFit(names, prim) {
  const j = names.findIndex((n) => /(^|[:_])head$/i.test(n));
  if (j < 0) return null;
  // (Some bodies' heads share their weight with the joint at the top of the head: theirs too.)
  const top = names.findIndex((n) => /headtop/i.test(n));
  const { pos, joints, weights } = prim;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
  for (let v = 0; v < pos.length / 3; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) { const q = joints[v * 4 + k]; if (q === j || q === top) w += weights[v * 4 + k]; }
    if (w < 0.6) continue;
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    n++;
  }
  if (n < 30) return null;
  // (Its size from its width, ear to ear: a beard or a nose makes it deeper than it is round. Its middle, a radius under
  // the top of it, and a little back of the front-to-back middle, where the skull is.)
  const r = (x1 - x0) / 2 * 1.02;
  return { joint: j, r, c: [(x0 + x1) / 2, y1 - r, Math.min((z0 + z1) / 2, z1 - r * 1.05)] };
}

// Which of a body's vertices are its head's (as headFit finds it, half their weight or more): HEAD_BIT on those, in a piece
// number for each (src/gfx/materials.js reads it: a dyed swap's hair is left the colour it grew).
export const HEAD_BIT = 0x8000;
export function headPieces(names, prim) {
  const j = names.findIndex((n) => /(^|[:_])head$/i.test(n)), top = names.findIndex((n) => /headtop/i.test(n));
  const { joints, weights } = prim, n = joints.length / 4, out = new Uint32Array(n);
  for (let v = 0; v < n; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) { const q = joints[v * 4 + k]; if (q === j || q === top) w += weights[v * 4 + k]; }
    if (w >= 0.5) out[v] = HEAD_BIT;
  }
  return out;
}

// How far down each sits from where it was made: a hat comes down to the brow, a cap a little less, what's tied on not at all.
const DROP = { flatcap: 0.3, widebrim: 0.42, tallhat: 0.42, straw: 0.4, knitcap: 0.32, coif: 0, kerchief: 0.05, hood: 0 };

// A hat (a mesh of hats.glb: pos, nrm, uv, idx) on a body's head (headFit): its vertices moved into the body's bind pose,
// every one on the head joint alone. A prim as the renderer's makeSkinned takes it.
export function hatPrim(hat, fit, name = '') {
  const { r, c, joint } = fit, n = hat.pos.length / 3, dy = DROP[name] || 0;
  const pos = new Float32Array(n * 3), joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    pos[v * 3] = c[0] + hat.pos[v * 3] * r; pos[v * 3 + 1] = c[1] + (hat.pos[v * 3 + 1] - dy) * r; pos[v * 3 + 2] = c[2] + hat.pos[v * 3 + 2] * r;
    joints[v * 4] = joint; weights[v * 4] = 1;
  }
  return { pos, nrm: hat.nrm, uv: hat.uv, idx: hat.idx, joints, weights };
}

// Who already wears something on their head (the Meshy prompts in tools/phobos/residents.json say so): no hat over it.
export const HEADGEAR = new Set(['acolyte', 'baker', 'beggarwoman', 'cutpurse', 'dyer', 'ferryman', 'fiddler', 'fishwife', 'gravedigger', 'graverobber', 'grinder', 'ladysmaid', 'lamplighter', 'mourner', 'netmender', 'peddler', 'pieseller', 'plaguedoctor', 'ragwoman', 'sweep', 'tollkeeper', 'urchingirl', 'washerwoman', 'watchman',
  // (And under a tied cloth, a skullcap, hair piled high, hair full of bones: left as they are.)
  'bargewoman', 'moneylender', 'noblewoman', 'hedgewitch']);
export const HATS = ['flatcap', 'widebrim', 'tallhat', 'straw', 'hood', 'coif', 'knitcap', 'kerchief'];
// (Which suit whom: a woman's coif or kerchief or hood or straw; a man's cap or felt or knitted or hood.)
export const HATS_OF = { m: ['flatcap', 'widebrim', 'tallhat', 'knitcap', 'hood', 'straw'], f: ['coif', 'kerchief', 'hood', 'straw', 'knitcap'] };
