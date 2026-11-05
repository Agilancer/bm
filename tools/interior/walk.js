// Walks the whole route on the player's own legs and through the player's own camera, holding W and steering, the way someone playing
// does: logs where it sticks and where it gets hit, and saves a shot on arriving at each named place. From the page, with ?auto=1&timer=1:
//   const w = await import('/tools/interior/walk.js'); w.go(); then read window.__walk until window.__walk.done
import { H } from '/src/core/layout.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROUTE = [
  [55, 0, 'w00_outside'], [68, 0, 'w01_door'], [98, 0, 'w02_nave'], [104, -3.5], [110, -3.5, 'w03_pulpit_door'], [111.2, 0], [114, 0, 'w04_office'], [123, 0], [126, 0, 'w05_stair_top'],
  [150, 0, 'w06_stair_mid'], [172, 0, 'w07_stair_foot'], [179, 7, 'w08_crypt'], [186.2, 14], [186.2, 28, 'w09_reliquary'], [186.2, 14], [178, 7], [178, -6], [186.2, -11, 'w10_crypt_north'],
  [186.2, -29.5], [181.8, -29.5, 'w10c_cubiculum'], [186.2, -29.5], [186.2, -33, 'w11_gallery'], [197, -33], [205, -33, 'w12_ossuary'], [197, -33], [186.2, -33], [186.2, -43.5], [181.8, -43.5, 'w12c_bone_room'], [186.2, -43.5], [186.2, -53, 'w13_gallery_end'], [186.2, -70, 'w14_sexton'], [186.2, -73, 'w15_hall'],
  [197, -81, 'w16_hall_east'], [203, -86.6], [228, -86.6, 'w17_abbots'], [234, -86.6, 'w18_tomb'], [240, -86.6, 'w19_tomb_mid'],
];

export async function go({ start = 0, keep = true, shots = true, swing = true } = {}) {
  const b = window.bm;
  const log = window.__walk = { legs: [], stuck: [], hits: 0, lowest: 1e9, worstStep: 0, done: false };
  const keys = b.input.keys;
  const [sx, sz] = ROUTE[start];
  b.cmd(19, 0, sx, sz);
  await wait(400);
  let lastHp = b.snap()[H.HP], lastY = b.snap()[H.PY];
  keys.add('KeyW');
  for (let i = start + 1; i < ROUTE.length; i++) {
    const [tx, tz, name] = ROUTE[i];
    const t0 = performance.now();
    let px = 1e9, pz = 1e9, still = 0, ok = false;
    while (performance.now() - t0 < 30000) {
      const s = b.snap();
      const x = s[H.PX], z = s[H.PZ], y = s[H.PY], hp = s[H.HP];
      if (Math.hypot(tx - x, tz - z) < 0.9) { ok = true; break; }
      b.look(Math.atan2(tx - x, tz - z), 0);
      log.worstStep = Math.max(log.worstStep, Math.abs(y - lastY)); lastY = y;
      if (hp < lastHp - 0.01) log.hits++;
      lastHp = hp;
      log.lowest = Math.min(log.lowest, hp);
      if (keep && hp < 60) { b.cmd(8); await wait(30); lastHp = b.snap()[H.HP]; }
      if (swing && hp < s[H.MAX_HP] && Math.random() < 0.1) b.attack();
      still = Math.hypot(x - px, z - pz) < 0.02 ? still + 1 : 0;
      px = x; pz = z;
      if (still === 40) log.stuck.push([+x.toFixed(1), +y.toFixed(1), +z.toFixed(1), `towards ${tx},${tz}`]);
      await wait(50);
    }
    const s = b.snap();
    log.legs.push({ to: [tx, tz], ok, t: +((performance.now() - t0) / 1000).toFixed(1), y: +s[H.PY].toFixed(2), hp: Math.round(s[H.HP]) });
    if (!ok) { log.stuck.push(['gave up', +s[H.PX].toFixed(1), +s[H.PZ].toFixed(1), `towards ${tx},${tz}`]); b.cmd(19, 0, tx, tz); await wait(300); }
    if (name && shots) {
      keys.delete('KeyW');
      // (Everyone holds still and the walker's healed while a hit's flash fades: the shot is of the place, not the walker's health.)
      b.cmd(2); b.cmd(8);
      await wait(1600);
      await Promise.race([b.shot(name), wait(4000)]);
      b.cmd(2);
      keys.add('KeyW');
    }
  }
  keys.delete('KeyW');
  log.done = true;
  return log;
}
