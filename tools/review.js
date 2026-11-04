// Stages the scenes a reviewer needs and saves them to tools/build/shots. Run in the page, with the server
// from tools/serve.py and ?auto=1&timer=1:
//   const r = await import('/tools/review.js'); await r.run();
import { C, CHARS_START, C_SIZE, H, INPUT } from '/src/core/layout.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function camera(x, y, z, tx, ty, tz) {
  let fx = tx - x, fy = ty - y, fz = tz - z;
  const l = 1 / Math.hypot(fx, fy, fz);
  fx *= l; fy *= l; fz *= l;
  // right = forward x world up, up = right x forward.
  let rx = -fz, rz = fx;
  const rl = 1 / Math.hypot(rx, rz);
  rx *= rl; rz *= rl;
  return { x, y, z, fx, fy, fz, ux: -rz * fy, uy: rz * fx - rx * fz, uz: rx * fy };
}

export function char(b, i) {
  const s = b.snap(), c = CHARS_START + i * C_SIZE;
  return { x: s[c + C.X], y: s[c + C.Y], z: s[c + C.Z], yaw: s[c + C.YAW], state: s[c + C.STATE], hp: s[c + C.HP], gashes: s[c + C.GASH_COUNT], bleeds: s[c + C.N_BLEEDS], stam: s[c + C.STAM] };
}

export function frontCam(b, i, dist, height, side = 0, tHeight = 1.15) {
  const k = char(b, i);
  const a = k.yaw + side;
  return camera(k.x + Math.sin(a) * dist, k.y + height, k.z + Math.cos(a) * dist, k.x, k.y + tHeight, k.z);
}

// A scripted player fights the black knight in real time, so the AI can be read from its log. Returns a
// timeline of states, and how often each answer to a swing came up.
export async function botFight(seconds = 75, style = 'mixed', huntCrabs = false, onFrame = null) {
  const b = window.bm;
  const { STATE_NAMES, TACTICS } = await import('/src/core/layout.js');
  b.cmd(11); await wait(120);
  b.cmd(7, 0, 0, 12); await wait(30);
  const log = [];
  const counts = {};
  let swings = 0;
  const seen = {};
  const t0 = performance.now();
  let last = -1, nextSwing = 0, nextDodge = 0, s_dodges = 0, holdStart = -1, crabDodgeAt = -1, redSwings = 0, aimLast = null;
  const inp = b.input;
  inp.enabled = true;
  while ((performance.now() - t0) / 1000 < seconds) {
    await wait(50);
    const t = (performance.now() - t0) / 1000;
    const k = char(b, 0);
    const s = b.snap();
    // Optionally turns on whatever crab has come close.
    let aim = k;
    if (huntCrabs) for (const i of [2, 3, 4]) { const c = char(b, i); if (c.state !== 10 && Math.hypot(c.x - s[H.PX], c.z - s[H.PZ]) < 7) { aim = c; break; } }
    const dx = aim.x - s[H.PX], dz = aim.z - s[H.PZ];
    const d = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    // Waiting on an open cut, it moves the X over the knight's chest to find one, as a person would.
    const seeking = style === 'wounds' && aim === k && k.gashes > 0;
    b.look(yaw + (seeking ? Math.sin(t * 2.3) * 0.11 : 0), (aim === k ? 0.04 : -0.12) + (seeking ? Math.sin(t * 3.7) * 0.13 : 0));
    // Walk in to sword range, and hang back when the knight comes on hard.
    inp.keys.clear();
    if (d > 2.5) inp.keys.add('KeyW');
    else if (d < 1.5) inp.keys.add('KeyS');
    // The dodging bot reads the blade flash, as the game asks a player to.
    const co = CHARS_START;
    if (style === 'wounds' && aim !== k) {
      // Backs out of a crab's lunge, which has no flash to read, just as it comes.
      if (aim.state === 3 && (aimLast === null || aimLast !== 3)) crabDodgeAt = t + 0.55;
      if (crabDodgeAt > 0 && t > crabDodgeAt && t > nextDodge) { crabDodgeAt = -1; s_dodges++; nextDodge = t + 0.9; inp.keys.clear(); inp.keys.add('KeyS'); b.shared.input[INPUT.DODGE] += 1; }
    }
    aimLast = aim.state;
    if ((style === 'dodge' || style === 'wounds') && s[co + C.GLINT] > 0.05 && s[co + C.GLINT] < 0.6 && aim === k && t > nextDodge) {
      s_dodges++;
      nextDodge = t + 0.9;
      inp.keys.add(Math.random() < 0.5 ? 'KeyA' : 'KeyD');
      b.shared.input[INPUT.DODGE] += 1;
    }
    // Holds its swing until the X turns red, or for a moment and then makes a new cut.
    const red = s[H.AIM_WOUND] > 0.5;
    let hold = false;
    if (seeking && !red) {
      if (holdStart < 0) holdStart = t;
      hold = t - holdStart < 1.6;
    } else holdStart = -1;
    if (t > nextSwing && d < 3.2 && s[H.SWING_T] === 0 && !hold) {
      if (style === 'mixed' && Math.random() < 0.35) b.wide(); else b.attack();
      swings++;
      if (red) redSwings++;
      holdStart = -1;
      nextSwing = t + (style === 'spam' ? 0.1 : 0.9 + Math.random() * 1.2);
    }
    if (onFrame) await onFrame(k, s, d, aim === k);
    const name = STATE_NAMES[k.state];
    counts[name] = (counts[name] || 0) + 1;
    if (k.state !== last) {
      log.push(`${t.toFixed(1)}s ${name} d=${d.toFixed(1)} hp=${k.hp.toFixed(0)} stam=${k.stam.toFixed(0)} cuts=${k.gashes} bleeds=${k.bleeds} tactic=${TACTICS[s[H.TACTIC]]} player=${s[H.HP].toFixed(0)}`);
      last = k.state;
      seen[name] = (seen[name] || 0) + 1;
    }
    if (k.state === 10 || s[H.HP] <= 0) break;
  }
  inp.keys.clear();
  const end = char(b, 0), se = b.snap();
  const crabs = [2, 3, 4].map((i) => { const c = char(b, i), o = CHARS_START + i * C_SIZE; return { state: c.state, cuts: c.gashes, bleeds: c.bleeds, hp: Math.round(c.hp), bites: se[o + C.LANDED], at: [Math.round(c.x), Math.round(c.z)] }; });
  return { swings, redSwings, parried: se[H.PARRIED], dodges: s_dodges, entered: seen, ticksInState: counts, knightHp: end.hp, knightLanded: se[CHARS_START + C.LANDED], cuts: end.gashes, bleeds: end.bleeds, playerHp: se[H.HP], rollouts: se[H.ROLLOUTS], crabs, log };
}

// Fights to the end, repeatedly, and checks what happens after: the win, crabs standing down, restart. The first
// fight also shoots real framing once there are cuts on the knight.
export async function winFights(n = 6, seconds = 120, onResult = () => {}) {
  const b = window.bm, out = [];
  let frames = 0;
  const shoot = async (k, s, d, onKnight) => {
    if (frames < 3 && onKnight && k.gashes >= 3 + frames * 2 && d > 1.9 && d < 3.1 && k.state !== 6) {
      frames++;
      b.cmd(14, 0, 0); await wait(40);
      await Promise.race([b.shot(`e_gash_range_${frames}`), wait(3000)]);
      b.cmd(15); await wait(20);
    }
  };
  for (let i = 0; i < n; i++) {
    const f = await botFight(seconds, 'wounds', true, shoot);
    const row = { fight: i + 1, swings: f.swings, redSwings: f.redSwings, parried: f.parried, dodges: f.dodges, entered: f.entered, knightHp: Math.round(f.knightHp), landed: f.knightLanded, cuts: f.cuts, bleeds: f.bleeds, playerHp: Math.round(f.playerHp), crabs: f.crabs.map((c) => `${c.state === 10 ? 'dead' : Math.round(c.hp)} bites ${c.bites}`), last: f.log[f.log.length - 1] };
    if (f.knightHp <= 0) {
      row.outcome = 'knight died';
      const hp0 = b.snap()[H.HP];
      await wait(300);
      row.slowMoScale = b.snap()[H.TIME_SCALE];
      const t1 = performance.now();
      while (b.snap()[H.GAME] !== 1 && performance.now() - t1 < 8000) await wait(100);
      row.gameAfter = b.snap()[H.GAME];
      row.winShownAfterS = +((performance.now() - t1) / 1000 + 0.3).toFixed(1);
      await Promise.race([b.shot(`e_win_${i + 1}`), wait(3000)]);
      await wait(1500);
      row.hpHeld = b.snap()[H.HP] >= hp0 - 0.01;
      row.crabsStoodDown = [2, 3, 4].every((c) => { const st = char(b, c).state; return st === 0 || st === 10; });
      b.shared.input[INPUT.RESTART] += 1;
      await wait(200);
      row.restartedAfterWin = b.snap()[H.GAME] === 0;
    } else row.outcome = f.playerHp <= 0 ? 'player died' : 'time ran out';
    out.push(row);
    onResult(row);
  }
  return out;
}

// Real cuts from real swings on a knight standing still, seen from the player's own distance. Staged close-ups use a
// drawn gash, so this is the shot that shows what a blow actually leaves.
export async function realCuts() {
  const b = window.bm, r = b.renderer;
  b.setCam(null); r.hideVM = false;
  b.cmd(11); await wait(150);
  b.cmd(7, 1, 18, -22); await wait(40);
  b.cmd(7, 0, 6, 6); await wait(40);
  b.cmd(2); await wait(150);
  b.cmd(1, 0, 2.15); await wait(120);
  for (const fn of ['attack', 'attack', 'wide', 'attack']) {
    const s = b.snap(), k = char(b, 0);
    b.look(Math.atan2(k.x - s[H.PX], k.z - s[H.PZ]), -0.02);
    b[fn]();
    await wait(1650);
  }
  await Promise.race([b.shot('e_real_fp'), wait(3000)]);
  r.hideVM = true;
  let i = 0;
  for (const side of [0, -0.5]) { b.setCam(frontCam(b, 0, 2.5, 1.62, side, 1.3)); await wait(150); await Promise.race([b.shot(`e_real_${i++}`), wait(3000)]); }
  b.setCam(frontCam(b, 0, 1.2, 1.6, 0, 1.5)); await wait(150);
  await Promise.race([b.shot('e_real_close'), wait(3000)]);
  b.cmd(2); await wait(40);
  b.setCam(null); r.hideVM = false;
  return char(b, 0).gashes;
}

// Advance the frozen world by a fixed time, so a strip of frames shows a move evenly however slowly they save.
async function advance(b, seconds) {
  b.cmd(14, 0, Math.round(seconds * 120));
  await wait(Math.max(60, seconds * 1000 / 4 + 40));
}

// Forces every step of quality loss and every resolution step, and reports GPU time and errors at each.
export async function demotionTest() {
  const b = window.bm, r = b.renderer, out = [];
  b.fixScale(1);
  const sample = async (label) => {
    await wait(700);
    out.push(`${label}: ${r.W}x${r.H}, gpu ${r.stats.gpuMs.toFixed(2)} ms, shafts ${r.useShafts}, ao ${r.useAO}, grass ${r.grassN}, far shadow every ${r.farShadowEvery}, errors ${window.__gpuErrors || 0}`);
  };
  await sample('start');
  for (let i = 1; i <= 6; i++) { const more = r.demote(); await sample(`demote ${i} -> ${more}`); await Promise.race([b.shot(`d_demote_${i}`), wait(3000)]); }
  for (const s of [0.88, 0.76, 0.66, 0.55, 1]) { r.scale = s; await sample(`scale ${s}`); }
  return out;
}

// Real TouchEvents through the real handlers: the stick, looking from a button, every button, pause and restart.
// Run in a page loaded at a phone's size and user agent.
export async function touchTest() {
  const b = window.bm;
  const inp = b.shared.input, out = {};
  const root = document.getElementById('touch');
  const el = (id) => document.getElementById(id);
  const fire = (type, target, id, x, y) => {
    const t = new Touch({ identifier: id, target, clientX: x, clientY: y, pageX: x, pageY: y });
    target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, changedTouches: [t], touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t] }));
  };
  const centre = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  b.cmd(11); await wait(120);
  document.getElementById('gate').style.display = 'none';
  // Nothing sits on top of a control.
  out.covered = ['bAttack', 'bWide', 'bJump', 'bDodge', 'bSprint', 'bPause'].filter((id) => { const [x, y] = centre(el(id)); return document.elementFromPoint(x, y) !== el(id); });
  out.freeScreenIsRoot = document.elementFromPoint(150, 250) === root && document.elementFromPoint(500, 150) === root;
  // Stick
  fire('touchstart', root, 1, 150, 250);
  out.stickShown = el('stick').style.display;
  fire('touchmove', root, 1, 150, 190);
  await wait(80);
  out.stickForward = +inp[INPUT.MOVE_Z].toFixed(2);
  const x0 = b.snap()[H.PX], z0 = b.snap()[H.PZ];
  await wait(500);
  out.movedWithStick = +Math.hypot(b.snap()[H.PX] - x0, b.snap()[H.PZ] - z0).toFixed(2);
  fire('touchend', root, 1, 150, 190);
  await wait(60);
  out.stickReleased = inp[INPUT.MOVE_Z] === 0 && el('stick').style.display === 'none';
  // Look with the right thumb, off the buttons
  const yaw0 = b.input.yaw, pitch0 = b.input.pitch;
  fire('touchstart', root, 2, 500, 150); fire('touchmove', root, 2, 560, 170); fire('touchend', root, 2, 560, 170);
  out.lookYaw = +(b.input.yaw - yaw0).toFixed(3); out.lookPitch = +(b.input.pitch - pitch0).toFixed(3);
  // CUT, then the same thumb drags the view
  const a0 = inp[INPUT.ATTACK], yaw1 = b.input.yaw;
  const [cx, cy] = centre(el('bAttack'));
  fire('touchstart', el('bAttack'), 3, cx, cy);
  fire('touchmove', el('bAttack'), 3, cx - 50, cy);
  fire('touchend', el('bAttack'), 3, cx - 50, cy);
  out.cutFired = inp[INPUT.ATTACK] - a0; out.dragLookFromCut = +(b.input.yaw - yaw1).toFixed(3);
  await wait(1400);
  // The rest
  for (const [id, slot] of [['bWide', INPUT.WIDE], ['bJump', INPUT.JUMP], ['bDodge', INPUT.DODGE]]) {
    const v0 = inp[slot], [x, y] = centre(el(id));
    fire('touchstart', el(id), 4, x, y); fire('touchend', el(id), 4, x, y);
    out[id] = inp[slot] - v0;
    await wait(1100);
  }
  const [sx, sy] = centre(el('bSprint'));
  fire('touchstart', el('bSprint'), 5, sx, sy); fire('touchend', el('bSprint'), 5, sx, sy);
  await wait(50);
  out.runOn = inp[INPUT.SPRINT];
  fire('touchstart', el('bSprint'), 5, sx, sy); fire('touchend', el('bSprint'), 5, sx, sy);
  await wait(50);
  out.runOff = inp[INPUT.SPRINT];
  // Three thumbs at once: moving, looking, cutting.
  {
    const a1 = inp[INPUT.ATTACK], y1 = b.input.yaw, [ax, ay] = centre(el('bAttack'));
    fire('touchstart', root, 21, 150, 250);
    fire('touchstart', root, 22, 500, 150);
    fire('touchstart', el('bAttack'), 23, ax, ay);
    fire('touchmove', root, 21, 150, 190);
    fire('touchmove', root, 22, 540, 150);
    await wait(80);
    out.threeThumbs = { forward: +inp[INPUT.MOVE_Z].toFixed(2), yaw: +(b.input.yaw - y1).toFixed(3), cut: inp[INPUT.ATTACK] - a1 };
    fire('touchend', el('bAttack'), 23, ax, ay);
    fire('touchend', root, 22, 540, 150);
    fire('touchend', root, 21, 150, 190);
    out.threeThumbs.released = inp[INPUT.MOVE_Z] === 0 || (await wait(50), inp[INPUT.MOVE_Z] === 0);
    await wait(1200);
  }
  // Pause and resume
  const [px, py] = centre(el('bPause'));
  fire('touchstart', el('bPause'), 6, px, py); fire('touchend', el('bPause'), 6, px, py);
  const tick0 = b.snap()[H.TICK];
  await wait(250);
  out.pauseFlag = inp[INPUT.PAUSE]; out.pauseShown = el('pause').style.display; out.simHeldTicks = b.snap()[H.TICK] - tick0;
  el('resume').click();
  await wait(250);
  out.resumed = inp[INPUT.PAUSE] === 0 && el('pause').style.display === 'none'; out.simRanAfter = b.snap()[H.TICK] - tick0;
  // Restart: a thumb right after the end does nothing, one after a moment restarts
  b.cmd(17); await wait(100);
  out.gameOver = b.snap()[H.GAME];
  fire('touchstart', root, 7, 300, 200); fire('touchend', root, 7, 300, 200);
  await wait(100);
  out.earlyThumbIgnored = b.snap()[H.GAME] === 2;
  await wait(1500);
  fire('touchstart', root, 8, 300, 200); fire('touchend', root, 8, 300, 200);
  await wait(200);
  out.restartedByThumb = b.snap()[H.GAME] === 0 && b.snap()[H.HP] === b.snap()[H.MAX_HP];
  out.errors = window.__gpuErrors || 0;
  return out;
}

async function shot(b, name, settle = 120) {
  await wait(settle);
  await Promise.race([b.shot(name), wait(5000)]);
}

export async function run(which) {
  const b = window.bm;
  const gate = document.getElementById('gate');
  if (gate) gate.style.display = 'none';
  const r = b.renderer;
  const want = (n) => !which || which.includes(n);
  b.fixScale(1);
  r.hideVM = true;

  if (want('village')) {
    b.setCam(camera(-2, 1.65, 33, -1.5, 3.2, 0)); await shot(b, 'v1_road_in');
    b.setCam(camera(-26, 13, 26, 0, 1, -3)); await shot(b, 'v2_over_the_square');
    b.setCam(camera(2, 1.7, 6, 1, 4, -19)); await shot(b, 'v3_inn_from_well');
    b.setCam(camera(-13.4, 1.65, 3.6, -19, 3.4, 0.5)); await shot(b, 'v4_west_house_close');
    b.setCam(camera(13, 1.65, 11, 9.5, 3, 21)); await shot(b, 'v5_south_cottage');
    b.setCam(camera(8, 1.65, -2.5, 18.5, 3, 3.5)); await shot(b, 'v6_east_house');
    b.setCam(camera(-8, 1.5, -6.6, -6.5, 1.2, -10)); await shot(b, 'v7_stall');
    b.setCam(camera(-60, 7, 60, 0, 6, 0)); await shot(b, 'v8_far_view');
  }
  if (want('knights')) {
    b.cmd(2); await wait(40);       // freeze
    b.cmd(7, 0, 0, 2);              // black knight to the square
    await wait(40);
    b.cmd(7, 1, 4, 2);              // silver beside him
    await wait(80);
    b.cmd(2); await wait(300); b.cmd(2); await wait(60);
    for (const i of [0, 1]) {
      const tag = i ? 'silver' : 'black';
      b.setCam(frontCam(b, i, 3.3, 1.45)); await shot(b, `k1_${tag}_front`);
      b.setCam(frontCam(b, i, 3.3, 1.45, Math.PI)); await shot(b, `k2_${tag}_back`);
      b.setCam(frontCam(b, i, 3.0, 1.3, 1.1)); await shot(b, `k3_${tag}_side`);
    }
    b.cmd(2); await wait(40);
  }
  if (want('motion')) {
    // The black knight's guard, a walk, a roll and his blows, as evenly timed strips.
    b.setCam(null);
    b.cmd(11); await wait(100);
    b.cmd(7, 1, 18, -22); await wait(40);      // silver out of the frame
    b.cmd(10, 0, 1); await wait(40);
    b.cmd(7, 0, 2, -3); await wait(40);
    b.cmd(4, 0); await wait(40);
    b.cmd(1, 0, 3.0); await wait(1200);
    const side = (d = 4.6, s = 0.9, h = 1.4, t = 1.1) => b.setCam(frontCam(b, 0, d, h, s, t));
    b.cmd(14, 0, 0); await wait(80);
    side(4.4, 0.5); await shot(b, 'm0_guard');
    b.cmd(15); await wait(1500);
    b.cmd(14, 0, 0); await wait(50);
    for (let i = 0; i < 6; i++) { side(4.6, 0.6); await shot(b, `m1_circle_${i}`, 40); await advance(b, 0.16); }
    b.cmd(5, 0); await wait(80);
    for (let i = 0; i < 8; i++) { await advance(b, 0.13); side(6, 1.2, 1.6); await shot(b, `m2_roll_${i}`, 40); }
    b.cmd(15); await wait(800); b.cmd(14, 0, 0); await wait(50);
    for (const [name, id] of [['a', 0], ['over', 3], ['dash', 4], ['bash', 5]]) {
      b.cmd(6, 0, id); await wait(60);
      for (let i = 0; i < 6; i++) { await advance(b, name === 'a' ? 0.17 : 0.2); side(5.2, 0.9, 1.5); await shot(b, `m3_${name}_${i}`, 40); }
      b.cmd(8); b.cmd(15); await wait(1500); b.cmd(8); b.cmd(14, 0, 0); await wait(50);
    }
    // Bent joints up close, to see plates part over the mail.
    for (const [i, tag] of [[0, 'black'], [1, 'silver']]) {
      const o = i ? 0 : 1;
      b.cmd(7, o, 18, -22); await wait(60);
      b.cmd(7, i, 3, 5); await wait(60);
      b.cmd(10, i); await wait(40);
      for (const [nm, id] of [['c', 2], ['hook', 6], ['over', 3]]) {
        b.cmd(6, i, id); await wait(60);
        await advance(b, 0.28);
        for (let f = 0; f < 3; f++) { await advance(b, 0.16); b.setCam(frontCam(b, i, 1.7, 1.25, nm === 'hook' ? 1.3 : -1.3, 1.1)); await shot(b, `j_${tag}_${nm}_${f}`, 40); }
        b.cmd(8); b.cmd(15); await wait(1700); b.cmd(8); b.cmd(14, 0, 0); await wait(50);
      }
    }
    b.cmd(15); await wait(40);
    b.setCam(null);
  }
  if (want('wounds')) {
    b.input.pitch = 0;
    b.cmd(11); await wait(100);
    b.cmd(7, 0, 0, 0); await wait(50);
    b.cmd(2); await wait(50);
    b.cmd(3, 0, 0); await wait(2500);
    b.setCam(frontCam(b, 0, 1.15, 1.55, 0.25, 1.45)); await shot(b, 'w1_black_gash');
    b.cmd(3, 0, 1); await wait(600);
    b.setCam(frontCam(b, 0, 1.15, 1.55, 0.25, 1.45)); await shot(b, 'w2_black_puncture_fresh');
    await wait(4000);
    b.setCam(frontCam(b, 0, 1.3, 1.5, 0.25, 1.35)); await shot(b, 'w3_black_bleeding_4s');
    b.setCam(frontCam(b, 0, 3.6, 1.4, 0.4)); await shot(b, 'w4_black_bleeding_wide');
    await wait(9000);
    b.setCam(frontCam(b, 0, 2.6, 1.1, 0.5, 0.4)); await shot(b, 'w5_blood_on_ground_13s');
    b.setCam(frontCam(b, 0, 1.3, 1.5, 0.25, 1.2)); await shot(b, 'w6_black_bleeding_13s');
    b.cmd(3, 1, 1); await wait(3500);
    b.setCam(frontCam(b, 1, 1.25, 1.5, -0.25, 1.35)); await shot(b, 'w7_silver_puncture');
    b.cmd(2); await wait(40);
    b.setCam(null);
  }
  if (want('fp')) {
    r.hideVM = false;
    b.setCam(null);
    b.cmd(11); await wait(60);
    b.cmd(7, 0, 0, -2); await wait(60);
    b.cmd(2); await wait(40);
    b.cmd(1, 0, 1.9); await wait(160);
    await shot(b, 'f0_guard_close');
    b.cmd(14, 0, 0); await wait(40);
    b.attack(); await wait(40);
    for (let i = 0; i < 8; i++) { await advance(b, 0.14); await shot(b, `f1_swing_${i}`, 30); }
    await advance(b, 0.5);
    b.wide(); await wait(40);
    for (let i = 0; i < 8; i++) { await advance(b, 0.14); await shot(b, `f2_wide_${i}`, 30); }
    await advance(b, 0.5);
    b.cmd(15); await wait(40);
    b.attack();
    await wait(1000);
    await shot(b, 'f3_after_hits');
    b.cmd(2); await wait(40);
  }
  if (want('crabs')) {
    r.hideVM = true;
    b.cmd(11); await wait(100);
    b.setCam(frontCam(b, 2, 7, 1.7)); await shot(b, 'c1_crab');
    b.cmd(1, 2, 5); await wait(60);
    for (let n = 0; n < 60 && char(b, 2).state !== 3; n++) await wait(60);
    b.cmd(14, 0, 0); await wait(60);
    for (let i = 0; i < 8; i++) { b.setCam(frontCam(b, 2, 7.5, 1.4, 1.45, 0.9)); await shot(b, `c2_attack_${i}`, 30); await advance(b, 0.26); }
    b.cmd(15); await wait(1400);
    // What it looks like from the player's own eyes, when one comes at you.
    r.hideVM = false;
    b.setCam(null);
    b.cmd(1, 2, 5); await wait(60);
    for (let n = 0; n < 80 && char(b, 2).state !== 3; n++) {
      const s = b.snap(), k = char(b, 2);
      b.look(Math.atan2(k.x - s[H.PX], k.z - s[H.PZ]), -0.04);
      await wait(50);
    }
    b.cmd(14, 0, 0); await wait(60);
    for (let i = 0; i < 2; i++) { await advance(b, 0.3); await shot(b, `c3_fp_${i}`, 30); }
    r.hideVM = true;
    b.cmd(15); await wait(40);
    b.setCam(null);
  }
  r.hideVM = false;
  return 'done';
}
