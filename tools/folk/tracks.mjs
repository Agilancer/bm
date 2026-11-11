// Where the townsfolk walk, drawn from above: a day in the town run without drawing it (as tools/folk/life_test.mjs does), and
// every step anyone takes outdoors put on a map of the town, over its roads, its walls and the ground they can't walk on.
//   node tools/folk/tracks.mjs [out.png] [hours=26] [startHour=5] [px per metre=8]
// Prints how much of their walking was on a road or a lane, and how close they kept to walls.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig } from '../../src/folk/rig.js';
import { Ground } from '../../src/folk/ground.js';
import { Town } from '../../src/folk/town.js';
import { Life, ACT } from '../../src/folk/brain.js';
import { pathAmount } from '../../src/core/terrain.js';

const R = (p) => readFileSync(new URL(`../../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), spots = J('assets/game/folk/spots.json');
const folk = J('assets/game/folk/folk.json');
const bin = R('assets/game/folk/clips.bin');
const clips = new FolkClips(J('assets/game/folk/clips.json'), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const BOUNDS = [-80, -75, 110, 80];
const ground = new Ground(village, interior, BOUNDS);
const town = new Town(village, interior, spots);
const life = new Life({ ground, town, clips, emit: () => {} });
const rigs = new Map();
for (const me of life.folk) {
  let m = me.p.body;
  if (!folk.models[m]) m = folk.swaps?.[m]?.base || folk.swaps?.[m]?.model || (me.child ? 'boy_1' : 'worker');
  if (!rigs.has(m)) { const b = R(`assets/game/folk/${folk.models[m].glb}`); rigs.set(m, new FolkRig(parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), clips)); }
  life.setRig(me.i, rigs.get(m));
}

const out = process.argv[2] || 'tools/build/tracks.png', hours = +(process.argv[3] || 26), start = +(process.argv[4] || 5), S = +(process.argv[5] || 8);
const [x0, z0, x1, z1] = BOUNDS, W = Math.round((x1 - x0) * S), H = Math.round((z1 - z0) * S);
const img = new Uint8Array(W * H * 3);
const put = (i, j, r, g, b, a = 1) => {
  if (i < 0 || j < 0 || i >= W || j >= H) return;
  const k = (j * W + i) * 3;
  img[k] += (r - img[k]) * a; img[k + 1] += (g - img[k + 1]) * a; img[k + 2] += (b - img[k + 2]) * a;
};
// The ground: grass, the worn ways lighter, what can't be walked dark, the houses' floors a warm grey.
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const x = x0 + (i + 0.5) / S, z = z0 + (j + 0.5) / S;
    const road = pathAmount(x, z), free = ground.free(0, x, z), home = ground.houseAt(x, z) > 0;
    let c = [86 + road * 70, 110 + road * 30, 62 + road * 40];
    if (home) c = free ? [150, 140, 128] : [70, 62, 56];
    else if (!free) c = [38, 44, 34];
    put(i, j, ...c);
  }
}
// Whether each step was on a road, and how near a wall: for the numbers at the end.
const near = (x, z, r) => { for (let a = 0; a < 8; a++) if (!ground.free(0, x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r)) return true; return false; };
let hour = start, day = 0, elapsed = 0, walked = 0, onRoad = 0, hugging = 0, turns = 0, sharp = 0;
const dt = 1 / 20;
const last = life.folk.map(() => null);
const hue = (i) => { const h = i * 0.618 % 1, f = (n) => { const k = (n + h * 6) % 6; return 255 * (1 - 0.75 * Math.max(0, Math.min(k, 4 - k, 1))); }; return [f(5), f(3), f(1)]; };
while (elapsed < hours) {
  const dh = dt / (hour >= 6 && hour < 20 ? 180 : 60);
  hour += dh; elapsed += dh;
  if (hour >= 24) { hour -= 24; day++; }
  life.update(dt, { hour, day, player: [-200, 0, -200], dangers: [] });
  life.folk.forEach((me, n) => {
    const p = last[n];
    const outdoors = me.level === 0 && me.house < 0;
    if (p && outdoors && me.act === ACT.WALK) {
      const d = Math.hypot(me.x - p[0], me.z - p[1]);
      if (d > 1e-4 && d < 1) {
        walked += d;
        if (pathAmount(me.x, me.z) > 0.5) onRoad += d;
        if (near(me.x, me.z, 0.55)) hugging += d;
        // A turn of more than 40 degrees within one step of the town's clock: a corner taken on the spot.
        const yaw = Math.atan2(me.x - p[0], me.z - p[1]);
        if (p[2] !== null) { turns++; let dy = Math.abs(yaw - p[2]); if (dy > Math.PI) dy = 2 * Math.PI - dy; if (dy > 0.7) sharp++; }
        p[2] = yaw;
        const [r, g, b] = hue(n), steps = Math.max(1, Math.ceil(d * S));
        for (let k = 0; k <= steps; k++) put(Math.floor((p[0] + (me.x - p[0]) * k / steps - x0) * S), Math.floor((p[1] + (me.z - p[1]) * k / steps - z0) * S), r, g, b, 0.55);
      }
    }
    last[n] = outdoors ? [me.x, me.z, p && outdoors && me.act === ACT.WALK ? p[2] : null] : null;
  });
}

// A PNG, by hand: no library to ask for.
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let j = 0; j < H; j++) Buffer.from(img.buffer, j * W * 3, W * 3).copy(raw, j * (W * 3 + 1) + 1);
const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
const pct = (a) => `${(100 * a / Math.max(walked, 1e-6)).toFixed(0)}%`;
console.log(`${out}: ${W}x${H}. Walked outdoors ${walked.toFixed(0)} m: on a road or lane ${pct(onRoad)}, within 0.55 m of a wall ${pct(hugging)}; sharp turns ${sharp} of ${turns} steps; stuck ${life.stuck || 0}`);
