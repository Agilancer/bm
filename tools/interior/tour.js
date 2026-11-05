// Stands a camera at each place a reviewer needs and saves a shot to tools/build/shots. From the page, with ?auto=1&timer=1:
//   const t = await import('/tools/interior/tour.js'); await t.run('cath');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function camera(x, y, z, tx, ty, tz) {
  let fx = tx - x, fy = ty - y, fz = tz - z;
  const l = 1 / Math.hypot(fx, fy, fz);
  fx *= l; fy *= l; fz *= l;
  let rx = -fz, rz = fx;
  const rl = 1 / Math.hypot(rx, rz);
  rx *= rl; rz *= rl;
  return { x, y, z, fx, fy, fz, ux: -rz * fy, uy: rz * fx - rx * fz, uz: rx * fy };
}

const F = 3, Y1 = -16.25, Y2 = -24.25;
export const SPOTS = {
  cath: [
    ['ext_green', 20, 5, 22, 80, 16, 0], ['ext_front', 46, 4.6, -10, 70, 15, 0], ['ext_side', 58, 7, -52, 95, 14, 0],
    ['door_in', 62, F + 1.7, 0, 90, F + 3, 0], ['nave_east', 70, F + 1.7, 0, 108, F + 4, 0], ['nave_west', 106, F + 2.5, 0, 66, F + 11, 0],
    ['aisle_south', 72, F + 1.7, -9, 106, F + 7, 10], ['glass_close', 85, F + 2, 2, 85, F + 9, 13], ['floor_light', 78, F + 3.5, -2, 92, F, -6], ['vault', 90, F + 1.7, 0, 90, F + 18, 0.1],
    ['chancel', 97, F + 1.7, -1, 110, F + 3, 0], ['pulpit_door', 104, F + 2.5, -5, 112, F + 2.5, 0],
  ],
  below: [
    ['office', 114.2, F + 2.3, 3.5, 123, F + 1.3, -2], ['office_door', 116, F + 2.3, -1, 124, F + 2.3, 2], ['stair_top', 126, F + 2.3, 0, 140, F - 2, 0], ['stair_landing', 142, Y1 + 13, 0, 160, Y1 + 5, 0],
    ['crypt_in', 172, Y1 + 1.7, 0, 186, Y1 + 2, 0], ['crypt_up', 186, Y1 + 1.7, 8, 186, Y1 + 8, -10], ['gallery', 186.2, Y1 + 1.7, -14, 186.2, Y1 + 2, -52], ['ossuary', 199, Y1 + 1.7, -33, 212, Y1 + 2.5, -33], ['reliquary', 186.2, Y1 + 1.7, 18, 186.2, Y1 + 2.2, 34],
    ['hall_in', 186.2, Y2 + 2.2, -71, 186.2, Y2 + 3, -100], ['hall_side', 174, Y2 + 2, -80, 200, Y2 + 4, -92], ['abbots', 204, Y2 + 1.7, -86.6, 228, Y2 + 2, -86.6], ['tomb', 231, Y2 + 1.7, -86.6, 256, Y2 + 4, -86.6],
  ],
};

export async function run(which, only = null) {
  const b = window.bm;
  b.renderer.hideVM = true;
  for (const [name, x, y, z, tx, ty, tz] of SPOTS[which]) {
    if (only && !only.includes(name)) continue;
    b.setCam(camera(x, y, z, tx, ty, tz));
    await wait(700);
    await Promise.race([b.shot(`i_${name}`), wait(4000)]);
  }
  b.setCam(null);
  b.renderer.hideVM = false;
  return window.__gpuErrors || 0;
}
