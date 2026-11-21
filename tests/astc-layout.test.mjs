// The phone's ASTC packing (src/gfx/astc.js) writes its blocks' ends as plain 8-bit values, with no trit or quint packing.
// That's only right if the decoder, which works the ends' precision out for itself from the bits a block leaves over, can
// pick nothing finer than 8 bits. Here the block modes are decoded as the ASTC spec has it (the Khronos Data Format spec;
// astcenc's decode_block_mode_2d), and the decoder's choice worked out from the bits left. (Checked on a GPU against a real
// decoder by tools/astc/check.html.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS } from '../src/gfx/astc.js';

// [levels, bits, trits, quints]: every colour quantisation ASTC has, coarsest to finest.
const COLOUR_RANGES = [[6, 1, 1, 0], [8, 3, 0, 0], [10, 1, 0, 1], [12, 2, 1, 0], [16, 4, 0, 0], [20, 2, 0, 1], [24, 3, 1, 0],
  [32, 5, 0, 0], [40, 3, 0, 1], [48, 4, 1, 0], [64, 6, 0, 0], [80, 4, 0, 1], [96, 5, 1, 0], [128, 7, 0, 0], [160, 5, 0, 1],
  [192, 6, 1, 0], [256, 8, 0, 0]];
// The weights': QUANT_2 .. QUANT_32 by the mode's quant number.
const WEIGHT_RANGES = [[2, 1, 0, 0], [3, 0, 1, 0], [4, 2, 0, 0], [5, 0, 0, 1], [6, 1, 1, 0], [8, 3, 0, 0], [10, 1, 0, 1], [12, 2, 1, 0],
  [16, 4, 0, 0], [20, 2, 0, 1], [24, 3, 1, 0], [32, 5, 0, 0]];
const iseBits = (n, [, bits, trits, quints]) => n * bits + (trits ? Math.ceil(n * 8 / 5) : 0) + (quints ? Math.ceil(n * 7 / 3) : 0);

function decodeMode(m) {
  let base = (m >> 4) & 1;
  const H = (m >> 9) & 1, D = (m >> 10) & 1, A = (m >> 5) & 3;
  let x, y;
  assert.notEqual(m & 3, 0, 'these layouts are of the first kind');
  base |= (m & 3) << 1;
  const B = (m >> 7) & 3;
  switch ((m >> 2) & 3) {
    case 0: x = B + 4; y = A + 2; break;
    case 1: x = B + 8; y = A + 2; break;
    case 2: x = A + 2; y = B + 8; break;
    default: x = (m & 0x100) ? (B & 1) + 2 : A + 2; y = (m & 0x100) ? A + 2 : (B & 1) + 6;
  }
  return { x, y, dual: !!D, quant: base - 2 + 6 * H };
}

for (const [kind, L] of Object.entries(LAYOUTS)) {
  test(`${kind} blocks: a 4x4 grid of ${L.weightBits}-bit weights, one plane, and the decoder reads 8-bit ends`, () => {
    const d = decodeMode(L.mode);
    assert.deepEqual([d.x, d.y, d.dual], [4, 4, false], 'a weight for every texel, one plane');
    const wr = WEIGHT_RANGES[d.quant];
    assert.equal(wr[1], L.weightBits, 'plain bits for each weight');
    assert.equal(wr[2] + wr[3], 0, 'no trits or quints in the weights');
    const weightBits = iseBits(16, wr);
    assert.ok(weightBits >= 24 && weightBits <= 96, 'a weight count the spec allows');
    // One partition: 11 bits of mode, 2 of partition count, 4 of colour endpoint mode, then the ends.
    const left = 128 - 17 - weightBits;
    const picked = COLOUR_RANGES.filter((r) => iseBits(L.values, r) <= left).at(-1);
    assert.equal(picked[0], 256, `the decoder picks ${picked[0]} levels from ${left} bits`);
    assert.equal(L.values, L.cem === 8 ? 6 : L.cem === 12 ? 8 : -1, 'RGB direct has 6 ends, RGBA direct 8');
  });
}

test('the step a weight stands for, as the decoder unquantises it', () => {
  // Bits replicated to six, then 0..63 stretched to 0..64.
  const unq = (v, bits) => { let r = 0; for (let s = 6 - bits; s > -bits; s -= bits) r |= s >= 0 ? v << s : v >> -s; return r > 32 ? r + 1 : r; };
  assert.deepEqual([...Array(8).keys()].map((v) => unq(v, 3)), [0, 9, 18, 27, 37, 46, 55, 64]);
  assert.deepEqual([...Array(4).keys()].map((v) => unq(v, 2)), [0, 21, 43, 64]);
});
