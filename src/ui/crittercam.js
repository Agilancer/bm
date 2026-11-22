// Critter camera: while auto-play plays, the small C beside the Auto button puts the whole interface away but itself (it goes
// to the top left corner), and the picture is yours to look about with. Drag (the mouse, or a finger anywhere) and the view
// swings round him in all three ways, the wheel or a pinch brings it nearer or further, and a tap or a click catches a gilded
// critter there (src/main.js pickCritter) without the stick, the staff or any button under it waking. Where you leave the view
// it stays: the same way round him, the same height and the same distance, while he walks on (it goes with him, never swung
// back behind him). C again, auto-play stopped, or the pause, and the game is as it was.
//
// Only the picture moves, as with the director's shots (src/ui/autocam.js): his aim is his own look (Input.yaw and pitch),
// which this never touches. It's set after the game's own camera every frame (AutoPlay.frame), and the director takes no shot
// while it's on. body.critter-cam hides the rest (the rules below): the page's own layers, all but the picture, this, and the
// words a catch is worth (src/ui/critterwords.js).
import { H } from '../core/layout.js';
import { terrainHeight } from '../core/terrain.js';
import { floorAt } from '../core/interior.js';
import { inChurch } from '../core/church.js';
import { inDungeon } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// How far it swings for a pixel dragged, the highest and lowest it goes (radians: up is looking down on him), and how near and
// far it stands.
const TURN = 0.0065, LOW = -0.45, HIGH = 1.45, NEAR = 1.6, FAR = 40;
const TAP = { px: 10, ms: 350 };   // a tap, not a drag: up again this soon, having moved less than this
const CHEST = 1.2;                 // what it looks at: so far over his feet

const CSS = `
#critCam { position: fixed; display: none; z-index: 46; width: 30px; height: 30px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 1px solid #2a6a8a; background: radial-gradient(circle at 40% 35%, #18323e, #050d12 75%); color: #8fe0ff;
  font: 700 16px/28px Cinzel, Georgia, serif; text-align: center; text-shadow: 0 0 4px #000; box-shadow: 0 2px 4px #000a;
  transition: box-shadow .12s, transform .12s; -webkit-tap-highlight-color: transparent; user-select: none; touch-action: none; }
#critCam:hover { box-shadow: 0 0 8px rgba(79,208,255,.6), 0 2px 4px #000a; }
#critCam:active { transform: scale(.92); }
body.playing.auto-on #critCam { display: block; }
body:not(.touch) #critCam { top: 284px; right: 82px; }
body.touch.menu-up #critCam, body.touch.paused #critCam, body.touch.map-open #critCam, body.ui-bare #critCam, body.upright #critCam, body.firstsight #critCam { visibility: hidden; }
#critPad { position: fixed; inset: 0; z-index: 2147483000; display: none; touch-action: none; cursor: grab; }
body.critter-cam #critPad { display: block; }
body.critter-cam.crit-drag #critPad { cursor: grabbing; }
html body.critter-cam #critCam { display: block; visibility: visible !important; position: fixed; z-index: 2147483001;
  top: calc(10px + env(safe-area-inset-top, 0px)); left: calc(10px + env(safe-area-inset-left, 0px)); right: auto;
  width: 40px; height: 40px; font-size: 20px; line-height: 38px; color: #04131b; background: #8fe0ff; border-color: #bff0ff;
  box-shadow: 0 0 10px #4fd0ff, 0 2px 4px #000a; opacity: .85; }
body.critter-cam > :not(#view, #critCam, #critPad, #critterWords, script, style, link) { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
`;

/** Where the camera stands and the way it looks, round a point: yaw the way it looks (as Input.yaw: 0 along +z), pitch how far
 * down on him (radians), dist how far. { x, y, z, fx, fy, fz, ux, uy, uz }. (Pure: tests/critter-cam.test.mjs.) */
export function orbit(px, py, pz, yaw, pitch, dist) {
  const cp = Math.cos(pitch), fx = Math.sin(yaw) * cp, fy = -Math.sin(pitch), fz = Math.cos(yaw) * cp;
  return { x: px - fx * dist, y: py - fy * dist, z: pz - fz * dist, fx, fy, fz, ...up(yaw, -pitch) };
}
const up = (yaw, p) => ({ ux: -Math.sin(yaw) * Math.sin(p), uy: Math.cos(p), uz: -Math.cos(yaw) * Math.sin(p) });

/** The camera at (x, y, z) looking at (tx, ty, tz), level. */
export function lookAt(x, y, z, tx, ty, tz) {
  const dx = tx - x, dy = ty - y, dz = tz - z, L = Math.hypot(dx, dy, dz) || 1;
  const yaw = Math.atan2(dx, dz), p = Math.asin(clamp(dy / L, -1, 1));
  return { x, y, z, fx: dx / L, fy: dy / L, fz: dz / L, ...up(yaw, p) };
}

export class CritterCam {
  // o: { game: the GameView (its cam, renderer, pickCritter, hoverCritter), input, isOn: auto-play's on, paused() }
  constructor(o) {
    this.o = o;
    this.on = false;
    this.yaw = 0; this.pitch = 0.35; this.dist = 6;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    this.btn = document.createElement('button');
    this.btn.id = 'critCam'; this.btn.type = 'button'; this.btn.textContent = 'C';
    this.btn.title = 'Critter camera: just the picture, to look about him and catch critters (again to come back)';
    this.btn.setAttribute('aria-label', 'Critter camera');
    this.pad = document.createElement('div'); this.pad.id = 'critPad';
    document.body.append(this.pad, this.btn);
    const press = (e) => { e.preventDefault(); e.stopPropagation(); this.btn.blur(); this.set(!this.on); };
    this.btn.addEventListener('click', press);
    this.btn.addEventListener('touchend', press, { passive: false });
    for (const t of ['pointerdown', 'mousedown']) this.btn.addEventListener(t, (e) => e.stopPropagation());
    this.btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    this.bindPad();
  }

  // On (from where the game's camera is now) or off.
  set(on) {
    on = !!on && this.o.isOn();
    if (on === this.on) return;
    this.on = on;
    this.pts = new Map();
    document.body.classList.toggle('critter-cam', on);
    document.body.classList.remove('crit-drag');
    this.btn.classList.toggle('on', on);
    if (on) {
      const c = this.o.game.cam, s = this.o.game.currentSnap?.();
      this.yaw = Math.atan2(c.fx, c.fz);
      this.pitch = clamp(-Math.asin(clamp(c.fy, -1, 1)), LOW, HIGH);
      this.dist = s ? clamp(Math.hypot(c.x - s[H.PX], c.y - s[H.PY] - CHEST, c.z - s[H.PZ]), 3.5, 14) : 6;
      // (Nothing held over: a key or a button the thumb was on stays where it was otherwise.)
      this.o.input.releaseControls();
    } else if (this.o.game.critterLook) this.o.game.critterLook.hover = null;
  }

  // The pad over the whole screen while it's on: every finger and the mouse land on it, never on the stick or a button.
  bindPad() {
    const P = this.pad;
    P.addEventListener('contextmenu', (e) => e.preventDefault());
    P.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      try { P.setPointerCapture(e.pointerId); } catch { /* gone already */ }
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: 0 });
      if (this.pts.size === 2) this.pinch = this.spread();
    });
    P.addEventListener('pointermove', (e) => {
      const q = this.pts.get(e.pointerId);
      if (!q) { if (e.pointerType === 'mouse') this.hover(e.clientX, e.clientY, e.timeStamp); return; }
      e.preventDefault();
      const dx = e.clientX - q.x, dy = e.clientY - q.y;
      q.x = e.clientX; q.y = e.clientY;
      q.moved = Math.max(q.moved, Math.hypot(q.x - q.x0, q.y - q.y0));
      if (this.pts.size >= 2) {
        // Two fingers: nearer or further as they spread or close.
        const d = this.spread();
        if (this.pinch > 0 && d > 0) this.dist = clamp(this.dist * (this.pinch / d), NEAR, FAR);
        this.pinch = d;
        return;
      }
      if (q.moved < TAP.px) return;
      document.body.classList.add('crit-drag');
      this.yaw -= dx * TURN;
      this.pitch = clamp(this.pitch + dy * TURN, LOW, HIGH);
    });
    const end = (e) => {
      const q = this.pts.get(e.pointerId);
      if (!q) return;
      this.pts.delete(e.pointerId);
      if (this.pts.size < 2) this.pinch = 0;
      if (!this.pts.size) document.body.classList.remove('crit-drag');
      // A tap or a click, not a drag (nor one finger of a pinch): a critter there is caught.
      if (e.type === 'pointerup' && !this.pinched && q.moved < TAP.px && performance.now() - q.t < TAP.ms && (e.pointerType !== 'mouse' || e.button === 0)) {
        this.o.game.pickCritter?.(q.x0, q.y0, e.pointerType === 'mouse' ? 'cursor' : 'tap');
      }
      if (!this.pts.size) this.pinched = false;
    };
    P.addEventListener('pointerup', end);
    P.addEventListener('pointercancel', end);
    P.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.0012), NEAR, FAR); }, { passive: false });
  }

  spread() {
    const [a, b] = [...this.pts.values()];
    this.pinched = true;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // The mouse over the picture: a critter in reach under it lights up (fifteen times a second).
  hover(x, y, t) {
    if (t - (this.hoverAt || 0) < 66) return;
    this.hoverAt = t;
    this.o.game.hoverCritter?.(x, y);
    this.pad.style.cursor = this.o.game.input?.canvas?.style.cursor || '';
  }

  // Every frame, after the game's own camera (and the director's) is set: the view where it was left, round him.
  frame(dt, snap) {
    if (this.on && (!this.o.isOn() || this.o.paused())) this.set(false);
    if (!this.on || !snap) return;
    const { game } = this.o, cam = game.cam;
    const x = snap[H.PX], y = snap[H.PY] + CHEST, z = snap[H.PZ];
    const P = orbit(x, y, z, this.yaw, this.pitch, this.dist);
    // (Out under the sky it's kept off the ground, and looks at him from there.)
    const sky = snap[H.PY] > -6 && floorAt(x, z) === null && !inChurch(x, y, z) && !inDungeon(x, z) && !inHall(x, z);
    const floor = sky ? terrainHeight(P.x, P.z) + 0.5 : -Infinity;
    Object.assign(cam, P.y < floor ? lookAt(P.x, floor, P.z, x, y, z) : P);
    game.renderer.thirdNear = false;
  }
}
