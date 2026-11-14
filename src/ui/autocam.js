// Auto-play's camera: a director's. While it plays (Settings' Camera in auto-play: Directed), the view stands behind him as
// third person does, and now and then it's taken off his shoulder for a shot:
//
//   talk     over his shoulder at whoever he's talking to, for as long as they talk
//   ride     low and close behind the shield, while he rides it somewhere (not in a fight: there the view is his aim)
//   orbit    once round him, slowly, when something big goes down or a level comes (src/ui/autoshow.js asks for it)
//   arrive   up and back over the road as he comes into a new country
//   side     alongside him on a long walk, a little ahead and looking back
//   front    out ahead of him on a long walk, as he comes on
//
// Only the picture moves. His aim is his own look (Input.yaw and pitch) and the sim's own camera (src/core/third.js), which
// this never touches, so a shot can't put a bolt off its mark; and no shot is taken in a fight. A shot is only taken with a
// clean line from his head to where the camera would stand (the nav thread's `sight`, the same a bolt is judged by), is looked
// at again a few times a second, and is let go the moment something's between. Out of doors it's kept off the ground. It
// blends out from the view behind him and back into it, never cut.
import { H, INPUT } from '../core/layout.js';
import { THIRD } from '../core/third.js';
import { terrainHeight } from '../core/terrain.js';
import { floorAt } from '../core/interior.js';
import { inChurch } from '../core/church.js';
import { inDungeon } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

// How long each lasts (0: as long as what it's of), how soon the same again, and whether it wants the open sky.
export const SHOTS = {
  talk: { dur: 0, again: 0, sky: false },
  ride: { dur: 0, again: 2, sky: true },
  orbit: { dur: 7, again: 20, sky: true },
  arrive: { dur: 7, again: 30, sky: true },
  side: { dur: 7, again: 0, sky: true },
  front: { dur: 6, again: 0, sky: true },
};
const TRAVEL_GAP = 10;      // seconds behind him between a long walk's shots
const IN = 1.1, OUT = 0.7;  // seconds to blend out to a shot, and back

/** Where a shot stands and what it looks at: { p: [x, y, z], l: [x, y, z] }. c: { x, y, z: his feet; yaw: the way he's looking;
 * vx, vz: the way he's moving, a unit (his look, standing still); t: seconds into the shot; s: which side, 1 or -1; a0: the
 * angle an orbit began at; ox, oz: who he's talking to }. (Pure: tests/auto-show.test.mjs.) */
export function pose(kind, c) {
  const hx = Math.sin(c.yaw), hz = Math.cos(c.yaw), rx = -hz, rz = hx;
  const chest = [c.x, c.y + 1.25, c.z];
  if (kind === 'orbit') {
    const a = c.a0 + c.s * 0.62 * c.t;
    return { p: [c.x + Math.sin(a) * 5.4, c.y + 2.5, c.z + Math.cos(a) * 5.4], l: [c.x, c.y + 1.35, c.z] };
  }
  if (kind === 'arrive') {
    const k = ease(clamp(c.t / 4, 0, 1));
    return { p: [c.x - c.vx * (5 + 7 * k) + rx * c.s * 2 * k, c.y + 2.2 + 6.5 * k, c.z - c.vz * (5 + 7 * k) + rz * c.s * 2 * k], l: [c.x + c.vx * 16, c.y + 1.2, c.z + c.vz * 16] };
  }
  if (kind === 'ride') {
    const sx = -c.vz, sz = c.vx;
    return { p: [c.x - c.vx * 5 + sx * c.s * 0.9, c.y + 0.85, c.z - c.vz * 5 + sz * c.s * 0.9], l: [c.x + c.vx * 7, c.y + 1.05, c.z + c.vz * 7] };
  }
  if (kind === 'side') {
    const sx = -c.vz, sz = c.vx;
    return { p: [c.x + sx * c.s * 6 + c.vx * 3, c.y + 1.7, c.z + sz * c.s * 6 + c.vz * 3], l: [chest[0] + c.vx * 1.2, chest[1], chest[2] + c.vz * 1.2] };
  }
  if (kind === 'front') {
    const sx = -c.vz, sz = c.vx;
    return { p: [c.x + c.vx * 8.5 + sx * c.s * 2.2, c.y + 1.35, c.z + c.vz * 8.5 + sz * c.s * 2.2], l: chest };
  }
  // talk: behind his shoulder, on the side asked, looking at the other's face.
  const dx = c.ox - c.x, dz = c.oz - c.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  return { p: [c.x - ux * 1.7 - uz * c.s * 1.25, c.y + 1.8, c.z - uz * 1.7 + ux * c.s * 1.25], l: [c.ox, (c.oy ?? c.y) + 1.5, c.oz] };
}

/** Which shot the moment wants, or null: s is what's going on (see AutoCam.frame). The one-offs are taken once, when asked. */
export function wanted(s) {
  if (s.fighting) return null;
  if (s.talking) return 'talk';
  if (!s.sky) return null;
  if (s.riding) return 'ride';
  if (s.orbit) return 'orbit';
  if (s.arrived) return 'arrive';
  if (s.travelling && s.sinceShot >= TRAVEL_GAP) return s.turn % 2 ? 'front' : 'side';
  return null;
}

export class AutoCam {
  // o: { game: the GameView (its cam, its renderer), shared, settings, townUI }
  constructor(o) {
    this.o = o;
    this.shot = null;       // { kind, t, s, a0, ok: the line's been seen clear, ending }
    this.w = 0;             // how far out to the shot the picture is, 0 to 1
    this.last = {};         // kind -> when it last ended
    this.t = 0; this.sinceShot = 0; this.turn = 0; this.askT = 0; this.busy = false;
    this.vx = 0; this.vz = 1;
  }

  /** Auto-play's view: 'third', the one behind him (it is for a shot to be taken at all); 'first', through his eyes; or null,
   * as the player left it. */
  get view() { const c = this.o.settings?.autocam; return c === 'off' ? null : c === 'first' ? 'first' : 'third'; }

  // Every frame, after the game's own camera is set (GameView.updateCamera): ap is the AutoPlay.
  frame(dt, snap, ap) {
    const { game, settings } = this.o, cam = game.cam;
    this.t += dt;
    const brain = ap.brain, on = ap.on && !!brain && (settings?.autocam ?? 'director') === 'director' && snap[H.TP] > 0.5 && !game.overrideCam
      && !ap.o.input.handsOn && !(ap.yieldT > 0) && !this.o.shared.input[INPUT.PAUSE];
    const x = snap[H.PX], y = snap[H.PY], z = snap[H.PZ], yaw = ap.o.input.yaw;
    const sp = Math.hypot(snap[H.VX], snap[H.VZ]);
    // (The way he's going, eased: a shot hung on it doesn't twitch with every step round a pine.)
    const tx = sp > 1.5 ? snap[H.VX] / sp : Math.sin(yaw), tz = sp > 1.5 ? snap[H.VZ] / sp : Math.cos(yaw), k = 1 - Math.exp(-3 * dt);
    this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k;
    { const L = Math.hypot(this.vx, this.vz) || 1; this.vx /= L; this.vz /= L; }
    const show = ap.show;
    let want = null, other = null;
    if (on) {
      const sky = y > -6 && floorAt(x, z) === null && !inChurch(x, y + 1, z) && !inDungeon(x, z) && !inHall(x, z);
      const talk = brain.talk && this.o.townUI.open ? this.o.townUI.whereOf?.(brain.talk.who) : null;
      other = talk && Math.hypot(talk.x - x, talk.z - z) < 6 ? talk : null;
      const g = brain.goal, togo = g && brain.useGoal ? Math.hypot(g.x - x, g.z - z) : 0;
      want = wanted({
        fighting: !!brain.fighting, talking: !!other, sky, riding: snap[H.SURF] > 0.5 && sp > 4.5,
        orbit: !!show?.orbit, arrived: !!show?.arrived, travelling: (brain.hurry || togo > 90) && sp > 2.5, sinceShot: this.sinceShot, turn: this.turn,
      });
      if (want && this.t - (this.last[want] ?? -99) < SHOTS[want].again) want = null;
      // (Asked for in a fight or under a roof, a one-off waits a little, then is forgotten.)
      if (show) for (const f of ['orbit', 'arrived']) {
        if (!show[f]) { show[`${f}T`] = 0; continue; }
        if ((show[`${f}T`] = (show[`${f}T`] || 0) + dt) > 8) show[f] = false;
      }
    }
    const S = this.shot;
    if (!S) {
      this.sinceShot += dt;
      if (want && this.w <= 0) { this.begin(want, x, y, z, yaw, other); if (show && want === 'orbit') show.orbit = false; if (show && want === 'arrive') show.arrived = false; }
    }
    else {
      S.t += dt;
      const D = SHOTS[S.kind];
      // Over: its time's up, what it was of has stopped, or something else is wanted more (a talk, a fight).
      const held = S.kind === 'talk' || S.kind === 'ride';
      if (!on || (D.dur && S.t > D.dur) || (held && want !== S.kind) || (!held && (want === 'talk' || want === 'ride')) || (on && ap.brain.fighting)) S.ending = true;
    }
    const A = this.shot;
    if (A) {
      if (other) { A.ox = other.x; A.oz = other.z; A.oy = other.y; }
      const c = { x, y, z, yaw, vx: this.vx, vz: this.vz, t: A.t, s: A.s, a0: A.a0, ox: A.ox, oz: A.oz, oy: A.oy };
      const P = pose(A.kind, c);
      if (SHOTS[A.kind].sky) P.p[1] = Math.max(P.p[1], terrainHeight(P.p[0], P.p[2]) + 0.6);
      this.look(dt, x, y, z, P, brain);
      this.w = clamp(this.w + (A.ok && !A.ending ? dt / IN : -dt / OUT), 0, 1);
      if (A.ending && this.w <= 0) { this.last[A.kind] = this.t; this.sinceShot = 0; if (A.kind === 'side' || A.kind === 'front') this.turn++; this.shot = null; }
      else if (this.w > 0) this.blend(cam, P, ease(this.w));
    }
    const out = this.w > 0.5;
    if (out !== this.out) { this.out = out; document.body.classList.toggle('auto-shot', out); }
    if (this.w > 0.15) game.renderer.thirdNear = false;
  }

  begin(kind, x, y, z, yaw, other) {
    this.shot = { kind, t: 0, s: Math.random() < 0.5 ? 1 : -1, a0: yaw + Math.PI, ok: false, ending: false, tries: 0, ox: other?.x ?? x, oz: other?.z ?? z, oy: other?.y, since: this.t };
    this.askT = 0;
  }

  // The line from his head to where the camera stands (and, before a shot's begun, to where it would on the other side too):
  // clear, the shot holds; not, it's given up (or tried from the other side, once).
  look(dt, x, y, z, P, brain) {
    const S = this.shot, nav = brain?.nav;
    if (!nav?.ready) { S.ending = true; return; }
    if ((this.askT -= dt) > 0 || this.busy) return;
    this.askT = 0.3; this.busy = true;
    const marks = [P.p];
    // (An orbit goes all the way round: every quarter of the ring is looked at before it starts.)
    if (S.kind === 'orbit' && !S.ok) for (let q = 1; q < 6; q++) { const a = S.a0 + q * TAU / 6; marks.push([x + Math.sin(a) * 5.4, Math.max(y + 2.5, terrainHeight(x + Math.sin(a) * 5.4, z + Math.cos(a) * 5.4) + 0.6), z + Math.cos(a) * 5.4]); }
    nav.ask('sight', { from: [x, y + 1.55, z], marks, fat: 0.3, hallOpen: this.o.game.hallUI?.hall?.state === 'open', doors: this.o.shared.input[INPUT.DOORS] }).then((r) => {
      this.busy = false;
      if (this.shot !== S || !r) { if (this.shot === S && !r) S.ending = true; return; }
      const clear = r.every((q) => q[0] > 0);
      if (clear) { S.ok = true; return; }
      // (Not yet begun: the other side, once. Under way: let go.)
      if (!S.ok && S.tries++ < 1 && S.kind !== 'orbit') { S.s = -S.s; this.askT = 0; return; }
      S.ending = true;
      if (!S.ok) { this.last[S.kind] = this.t - SHOTS[S.kind].again + 4; this.shot = null; this.w = 0; }
    });
  }

  // The picture, w of the way from the view behind him to the shot: where it stands, and the way it looks (turned the short
  // way round), level.
  blend(cam, P, w) {
    const dx = P.l[0] - P.p[0], dy = P.l[1] - P.p[1], dz = P.l[2] - P.p[2];
    const yaw1 = Math.atan2(dx, dz), pitch1 = Math.atan2(dy, Math.hypot(dx, dz) || 1e-6);
    const yaw0 = Math.atan2(cam.fx, cam.fz), pitch0 = Math.asin(clamp(cam.fy, -1, 1));
    const yw = yaw0 + wrap(yaw1 - yaw0) * w, p = pitch0 + (pitch1 - pitch0) * w, cp = Math.cos(p);
    cam.x += (P.p[0] - cam.x) * w; cam.y += (P.p[1] - cam.y) * w; cam.z += (P.p[2] - cam.z) * w;
    cam.fx = Math.sin(yw) * cp; cam.fy = Math.sin(p); cam.fz = Math.cos(yw) * cp;
    // (The game's own roll, a shake or a lean, goes as the shot comes in.)
    const ux = -Math.sin(yw) * Math.sin(p), uy = cp, uz = -Math.cos(yw) * Math.sin(p);
    cam.ux += (ux - cam.ux) * w; cam.uy += (uy - cam.uy) * w; cam.uz += (uz - cam.uz) * w;
  }
}

/** How far to the side the look is turned, in third person, so the X is on a mark d metres off: the camera stands a step to
 * his right (THIRD.side, by H.TP_SIDE), and its line runs beside his own. (src/ui/autobrain.js motor.) */
export const thirdLead = (side, d) => Math.asin(clamp(THIRD.side * side / Math.max(1.2, d), -0.5, 0.5));
