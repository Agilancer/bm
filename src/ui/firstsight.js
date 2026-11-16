// First sight of Phobos (docs/PHOBOS-LAYOUT.md, "First sight, twice"). The first time you come out of the Chasm onto the
// Sill, the city, the castle and the Keep are all in front of you at once. In auto-play the hero stops and looks for about
// five minutes: the camera leaves him and goes to the place in five beats (the plain and the gate, along the
// wall, up over the three wards, round the Keep's spires, the Throne Tower's top and all the way back to him), then gives
// him back. Any key, click or tap rides on. Settings' "Pause auto-play at first sight of Phobos" turns it off. Playing by
// hand you just get the view, and its name. Once only (kept on this device: velscour.phobosSeen).
//
// The camera is the game's own override (game.overrideCam, as the opening's and bm.setCam's): { x, y, z, fx, fy, fz, ux, uy, uz }.
// While it runs auto-play is held (src/ui/autoplay.js asks `active`), the hands and the HUD are hidden (body.cinematic).

import { H } from '../core/layout.js';
import { terrainHeight } from '../core/terrain.js';
import { CITY_WALL, CRAG, PLAIN, SILL, WARDS } from '../core/east.js';

const SEEN_KEY = 'velscour.phobosSeen';
// The five beats' lengths, seconds: five minutes in all (the owner's length). The first is short: he's seen it, now go.
export const BEATS = [30, 70, 60, 70, 70];
export const TOTAL = BEATS.reduce((a, b) => a + b, 0);
const FADE = 0.9;                 // seconds down to black and up again where one beat cuts to the next
const KEEP = { x: 11200, z: 0, base: PLAIN + 115, top: PLAIN + 330 };   // (tools/phobos/layout.json keep)
// The five spires, as the camera rounds them, and the Throne Tower: [name, x, z, top over the plain].
const SPIRES = [['The Ember Spire', 11168, -70, 175], ['The Storm Spire', 11240, -95, 215], ['The Bone Spire', 11300, -40, 250], ['The Shadow Spire', 11345, 45, 285], ['The Blood Spire', 11290, 95, 305]];

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
// A point on a line of points at u (0 to 1), smoothed through them.
function along(pts, u) {
  const f = Math.min(0.9999, Math.max(0, u)) * (pts.length - 1), i = Math.floor(f), t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
  return p1.map((_, q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t * t + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * t * t * t));
}
// Never under the ground.
const over = (p, clear = 2) => { p[1] = Math.max(p[1], terrainHeight(p[0], p[2]) + clear); return p; };

// Where the camera is and what it looks at, t seconds in. hero: [x, y, z] of the hero's feet. -> { eye, at, line, dark }
// (dark: 0 to 1, how far down to black the picture is, at a cut.)
export function sightAt(t, hero) {
  const [hx, hy, hz] = hero;
  let beat = 0, t0 = 0;
  while (beat < 4 && t >= t0 + BEATS[beat]) t0 += BEATS[beat++];
  const len = BEATS[beat], u = Math.min(1, (t - t0) / len), e = ease(u);
  // (Cuts: into black at a beat's end, out of it at the next's start. The first opens on him, the last ends on him: no fade.)
  const dark = Math.max(beat > 0 && beat < 4 ? 1 - (t - t0) / FADE : 0, beat < 3 ? 1 - (t0 + len - t) / FADE : 0, beat === 3 ? 1 - (t0 + len - t) / FADE : 0, beat === 4 ? 1 - (t - t0) / FADE : 0, 0);
  const s = shot(beat, u, e, hx, hy, hz);
  s.dark = Math.min(1, dark);
  return s;
}
const pick = (names, e) => names[Math.min(names.length - 1, Math.floor(e * names.length))];
function shot(beat, u, e, hx, hy, hz) {
  const gate = [9350, PLAIN + 9, 0];
  if (beat === 0) {
    // At his boots, then craning up and back over his head till the whole plain is under him and the gate's in the middle.
    return { eye: over([hx - 2.6 - e * 9, hy + 0.35 + e * e * 11, hz + 1.3 - e * 1.3], 0.3), at: [lerp(hx + 30, gate[0], e), lerp(hy + 1, gate[1], e), lerp(hz, gate[2], e)], line: u < 0.45 ? 'The Sill' : 'The Drawbridge Gate, raised' };
  }
  if (beat === 1) {
    // Down off the Sill and along the wall, outside it, one way: from the Barbican south round to the Water Gate.
    const w = CITY_WALL, path = [[SILL.x + 70, SILL.y + 6, -30], [9285, PLAIN + 24, -60], [9290, PLAIN + 30, 240], [w[4][0] - 80, PLAIN + 36, w[4][1] + 70], [w[3][0] - 20, PLAIN + 44, w[3][1] + 100]];
    const look = [[9440, PLAIN + 14, -40], [9560, PLAIN + 16, 60], [9640, PLAIN + 16, 300], [9880, PLAIN + 18, 420], [9950, PLAIN + 16, 660]];
    return { eye: over(along(path, e), 6), at: along(look, e), line: pick(['City State Phobos', 'The Barbican', 'The Rookeries', 'The Drowned Wharf', "The Tanners' Water Gate"], e) };
  }
  if (beat === 2) {
    // Up the Castle Approach and over the three ward walls, each higher.
    const path = [[10240, PLAIN + 70, 60], [10600, PLAIN + 78, 20], [WARDS[0][0] + 30, PLAIN + WARDS[0][1] + 30, -20], [WARDS[1][0] + 30, PLAIN + WARDS[1][1] + 34, 10], [WARDS[2][0] + 20, PLAIN + WARDS[2][1] + 40, 0]];
    const look = [[10700, PLAIN + 70, 0], [10850, PLAIN + 80, 0], [11050, PLAIN + 100, 0], [11200, PLAIN + 140, 0], [KEEP.x, PLAIN + 200, 0]];
    return { eye: over(along(path, e), 8), at: along(look, e), line: e < 0.2 ? 'Castle Velscour' : e < 0.5 ? 'The Lower Ward' : e < 0.75 ? 'The Middle Ward' : 'The High Ward' };
  }
  if (beat === 3) {
    // Round the Keep, climbing, inside the basin's head: from the west by the north, the east and the south. What it looks at
    // slides from spire to spire as each is passed, and each is named.
    const a = Math.PI + e * Math.PI * 1.75, r = 215 - e * 35, y = lerp(KEEP.base + 60, KEEP.top - 20, e);
    const f = e * 4, i = Math.min(3, Math.floor(f)), k = ease(f - i), p = SPIRES[i], q = SPIRES[i + 1];
    const sx = lerp(p[1], q[1], k), sz = lerp(p[2], q[2], k), sy = lerp(p[3], q[3], k);
    return { eye: over([KEEP.x + Math.cos(a) * r, y, KEEP.z + Math.sin(a) * r], 14), at: [lerp(KEEP.x, sx, 0.5), lerp(KEEP.base + 60, PLAIN + sy, 0.5 + 0.3 * e), lerp(KEEP.z, sz, 0.5)], line: SPIRES[Math.min(4, Math.round(f))][0] };
  }
  // The Throne Tower's top, close; then all the way back down to him.
  if (u < 0.42) {
    const k = ease(u / 0.42);
    return { eye: [KEEP.x - 120 + k * 62, KEEP.top + 14 - k * 9, 46 - k * 30], at: [KEEP.x + 5, KEEP.top - 2, 0], line: k > 0.15 ? 'The Throne Tower' : '' };
  }
  const k = ease((u - 0.42) / 0.58);
  const path = [[KEEP.x - 58, KEEP.top + 5, 16], [CRAG.x - 500, PLAIN + 240, 0], [9700, PLAIN + 170, -40], [SILL.x + 220, SILL.y + 60, 10], [hx - 4.4, hy + 1.85, hz + 0.8]];
  return { eye: over(along(path, k), 1.2), at: [lerp(KEEP.x, hx + 60, k * k), lerp(KEEP.top - 20, hy + 1.2, k), lerp(0, hz, k)], line: '' };
}

export class FirstSight {
  // o: { game, input, settings, renderer, tip(text, seconds), autoOn(): is auto-play playing }
  constructor(o) {
    this.o = o; this.t = -1; this.hero = null;
    try { this.seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { this.seen = false; }
    const el = this.el = document.createElement('div');
    el.id = 'firstSight'; el.hidden = true;
    el.innerHTML = '<div class="fs-black"></div><div class="fs-bar top"></div><div class="fs-bar bottom"></div><div class="fs-line"></div><div class="fs-skip">Any key rides on</div>';
    const css = document.createElement('style');
    css.textContent = `#firstSight{position:fixed;inset:0;z-index:12;pointer-events:none;font-family:Georgia,serif;color:#e2cf9c}
#firstSight .fs-black{position:absolute;inset:0;background:#000;opacity:0}
#firstSight .fs-bar{position:absolute;left:0;right:0;height:9vh;background:#000}#firstSight .fs-bar.top{top:0}#firstSight .fs-bar.bottom{bottom:0}
#firstSight .fs-line{position:absolute;left:0;right:0;bottom:12vh;text-align:center;font-style:italic;font-size:clamp(18px,2.6vw,34px);letter-spacing:.06em;text-shadow:0 2px 8px #000,0 0 2px #000;transition:opacity .9s}
#firstSight .fs-skip{position:absolute;right:2.2vw;bottom:2.6vh;font-size:13px;opacity:.55}`;
    document.head.appendChild(css); document.body.appendChild(el);
    this.lineEl = el.querySelector('.fs-line'); this.blackEl = el.querySelector('.fs-black');
    const skip = (e) => { if (this.active && this.t > 1.5) { this.end(); e.preventDefault?.(); } };
    window.addEventListener('keydown', skip, true); window.addEventListener('pointerdown', skip, true);
  }

  get active() { return this.t >= 0; }

  // (For looking at it: bm.firstSight() plays it from where you stand, seen or not.)
  begin(snap) { this.hero = [snap[H.PX], snap[H.PY], snap[H.PZ]]; this.t = 0; this.el.hidden = false; this.shown = null; }

  end() {
    if (!this.active) return;
    this.t = -1; this.el.hidden = true;
    document.body.classList.remove('cinematic');
    this.o.game.overrideCam = this.o.game.reviewCam || null;
    this.o.renderer.hideVM = false;
  }

  frame(dt, snap) {
    if (!snap) return;
    if (!this.active) {
      if (this.seen) return;
      const x = snap[H.PX], z = snap[H.PZ];
      if (x < SILL.x - 20 || Math.hypot(x - SILL.x, z - SILL.z) > SILL.r || Math.abs(snap[H.PY] - SILL.y) > 6) return;
      this.seen = true;
      try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* it plays again next time */ }
      if (this.o.autoOn() && this.o.settings.phobosAwe !== 'off') this.begin(snap);
      else this.o.tip('City State Phobos, and Castle Velscour over it.', 8);
      return;
    }
    if (this.o.paused?.()) return;
    this.t += dt;
    if (this.t >= TOTAL) { this.end(); return; }
    const s = sightAt(this.t, this.hero), [ex, ey, ez] = s.eye;
    let fx = s.at[0] - ex, fy = s.at[1] - ey, fz = s.at[2] - ez;
    const L = Math.hypot(fx, fy, fz) || 1; fx /= L; fy /= L; fz /= L;
    // (Up: straight up, less what of it lies along the view.)
    let ux = -fx * fy, uy = 1 - fy * fy, uz = -fz * fy;
    const U = Math.hypot(ux, uy, uz) || 1;
    this.o.game.overrideCam = { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux / U, uy: uy / U, uz: uz / U };
    this.o.renderer.hideVM = true;
    this.blackEl.style.opacity = s.dark;
    document.body.classList.add('cinematic');
    if (s.line !== this.shown) { this.shown = s.line; this.lineEl.style.opacity = s.line ? 1 : 0; if (s.line) this.lineEl.textContent = s.line; }
  }
}
