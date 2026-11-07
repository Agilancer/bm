// The map: a small one in the corner that turns with you, and the whole land on M (MAP on a phone). Only what you've
// walked near is drawn; the rest stays dark until you go and see it. What you've seen is saved with the game.
//
// Seen from above with the way you face pointing up the screen, +z is up and -x is to the right (the camera's right
// is (-cos yaw, sin yaw)), so on the paper a point (x, z) goes to (-x, -z). The big map keeps +z up.

import { C, CHARS_START, C_SIZE, H } from '../core/layout.js';
import { forestTrees } from '../core/forest.js';
import { LAND_EDGE, PATHS, PLOTS, ROADS, SUMMIT, terrainHeight } from '../core/terrain.js';

const EDGE = LAND_EDGE;
const PX = 600;                       // the paper's pixels across: 2 m to a pixel
const MPP = (2 * EDGE) / PX;
const GRID = 300;                     // terrain samples across: 4 m apart
const FOG = 150;                      // seen-or-not cells across: 8 m
const FOG_M = (2 * EDGE) / FOG;
const SEE = 46;                       // how far round you the map fills in, metres
const MINI_R = 90;
const NEAR_SPAN = 400;                // the big map's close view, metres across                    // the corner map's reach, metres from you to its rim

const toPaper = (x, z) => [(EDGE - x) / MPP, (EDGE - z) / MPP];

export class WorldMap {
  constructor(base, touch) {
    this.base = base; this.touch = touch;
    this.open = false;
    this.ready = false;
    this.paper = document.createElement('canvas'); this.paper.width = this.paper.height = PX;
    this.fog = document.createElement('canvas'); this.fog.width = this.fog.height = FOG;
    this.fogCtx = this.fog.getContext('2d');
    this.seen = new Uint8Array(FOG * FOG);
    this.resetFog();
    this.mini = document.getElementById('mapMini');
    this.miniCtx = this.mini.getContext('2d');
    this.big = document.getElementById('mapBig');
    this.bigCanvas = document.getElementById('mapBigCanvas');
    this.bigCtx = this.bigCanvas.getContext('2d');
    this.miniT = 1;
    this.lastCell = -1;
    this.build();
  }

  // Drawn a few rows a frame, so nothing stalls while it's made.
  async build() {
    let village = null;
    try { village = await fetch(`${this.base}assets/game/village.json`).then((r) => r.json()); } catch { /* the map still has the land */ }
    const h = new Float32Array((GRID + 1) * (GRID + 1));
    const step = (2 * EDGE) / GRID;
    for (let j = 0; j <= GRID;) {
      const until = performance.now() + 3;
      for (; j <= GRID && performance.now() < until; j++) {
        const z = EDGE - j * step;
        for (let i = 0; i <= GRID; i++) h[j * (GRID + 1) + i] = terrainHeight(EDGE - i * step, z);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    // The land, by height and lit from the top left.
    const img = new ImageData(GRID, GRID);
    let lo = Infinity, hi = -Infinity;
    for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const k = j * (GRID + 1) + i;
        const v = h[k], dx = h[k + 1] - v, dy = h[k + GRID + 1] - v;
        const t = Math.min(1, Math.max(0, (v - lo) / Math.max(1, hi - lo))) ** 0.7;
        const shade = Math.min(1.35, Math.max(0.55, 1 - (dx + dy) * 0.09));
        const o = (j * GRID + i) * 4;
        img.data[o] = (46 + 70 * t) * shade;
        img.data[o + 1] = (50 + 52 * t) * shade;
        img.data[o + 2] = (30 + 34 * t) * shade;
        img.data[o + 3] = 255;
      }
    }
    const small = document.createElement('canvas'); small.width = small.height = GRID;
    small.getContext('2d').putImageData(img, 0, 0);
    const g = this.paper.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(small, 0, 0, PX, PX);
    await new Promise((r) => setTimeout(r, 0));

    // The woods, a dot to a tree.
    const trees = forestTrees(EDGE);
    g.fillStyle = 'rgba(14, 30, 16, 0.75)';
    for (let i = 0; i < trees.length; i += 6) {
      const [px, py] = toPaper(trees[i], trees[i + 1]);
      g.beginPath(); g.arc(px, py, 1.1 + trees[i + 3] * 0.6, 0, 6.2832); g.fill();
    }
    await new Promise((r) => setTimeout(r, 0));

    // The ways: the two roads up the hill, and the paths through the town.
    const line = (pts, w, colour) => {
      g.strokeStyle = colour; g.lineWidth = Math.max(1, (2 * w) / MPP); g.lineJoin = g.lineCap = 'round';
      g.beginPath();
      pts.forEach(([x, z], n) => { const [px, py] = toPaper(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    };
    for (const p of PATHS.slice(1)) line(p.pts, p.w, 'rgba(196, 176, 132, 0.85)');
    for (const road of ROADS) line(road.line, road.w, 'rgba(214, 192, 142, 0.95)');

    // The houses, as they stand, and the plots of the outer ones.
    g.fillStyle = 'rgba(150, 118, 70, 0.95)'; g.strokeStyle = 'rgba(20, 14, 8, 0.9)'; g.lineWidth = 1;
    const rect = (x, z, hx, hz, yaw) => {
      g.save();
      const [px, py] = toPaper(x, z);
      g.translate(px, py); g.rotate(-(yaw || 0));
      g.fillRect(-hx / MPP, -hz / MPP, (2 * hx) / MPP, (2 * hz) / MPP);
      g.strokeRect(-hx / MPP, -hz / MPP, (2 * hx) / MPP, (2 * hz) / MPP);
      g.restore();
    };
    // (A footprint's yaw turns it the other way on the paper, which is the land seen turned half round.)
    const houses = (village?.footprints || []).concat((village?.colliders || []).filter((c) => c.h >= 3 && c.hx >= 2.5 && c.hz >= 1.2 && c.x < 58));
    if (houses.length) for (const c of houses) rect(c.x, c.z, c.hx, c.hz, c.yaw);
    else for (const p of PLOTS) rect(p[0], p[1], p[2] * 0.8, p[3] * 0.8, 0);

    // The cathedral.
    g.fillStyle = 'rgba(92, 38, 30, 0.95)'; g.strokeStyle = 'rgba(201, 163, 92, 0.9)';
    rect(90, 0, 34, 22, 0);
    // The top of the hill.
    {
      const [px, py] = toPaper(SUMMIT.x, SUMMIT.z);
      g.strokeStyle = 'rgba(214, 192, 142, 0.95)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(px, py, SUMMIT.r / MPP, 0, 6.2832); g.stroke();
    }
    // The well, in the square.
    {
      const [px, py] = toPaper(-1.5, 1);
      g.fillStyle = 'rgba(120, 150, 170, 0.95)'; g.beginPath(); g.arc(px, py, 2.2, 0, 6.2832); g.fill();
    }
    // The land's rim, where nobody goes past.
    g.strokeStyle = 'rgba(0, 0, 0, 0.8)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, PX - 3, PX - 3);
    this.ready = true;
  }

  isSeen(x, z) {
    const i = Math.floor((EDGE - x) / FOG_M), j = Math.floor((EDGE - z) / FOG_M);
    return i >= 0 && j >= 0 && i < FOG && j < FOG && this.seen[j * FOG + i] === 1;
  }

  resetFog() {
    this.seen.fill(0);
    const f = this.fogCtx;
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, FOG, FOG);
    f.fillStyle = '#000'; f.fillRect(0, 0, FOG, FOG);
    this.lastCell = -1;
  }

  // Fills in the map round (x, z).
  see(x, z, r = SEE) {
    const ci = (EDGE - x) / FOG_M, cj = (EDGE - z) / FOG_M, cr = r / FOG_M;
    let any = false;
    for (let j = Math.max(0, Math.floor(cj - cr)); j <= Math.min(FOG - 1, Math.ceil(cj + cr)); j++) {
      for (let i = Math.max(0, Math.floor(ci - cr)); i <= Math.min(FOG - 1, Math.ceil(ci + cr)); i++) {
        if (this.seen[j * FOG + i] || Math.hypot(i + 0.5 - ci, j + 0.5 - cj) > cr) continue;
        this.seen[j * FOG + i] = 1; any = true;
      }
    }
    if (any) this.paintFog();
  }

  paintFog() {
    const f = this.fogCtx;
    const img = f.createImageData(FOG, FOG);
    for (let k = 0; k < FOG * FOG; k++) img.data[k * 4 + 3] = this.seen[k] ? 0 : 255;
    f.putImageData(img, 0, 0);
  }

  // As saved: the seen cells, eight to a byte, in base64.
  save() {
    const bytes = new Uint8Array(Math.ceil((FOG * FOG) / 8));
    for (let k = 0; k < FOG * FOG; k++) if (this.seen[k]) bytes[k >> 3] |= 1 << (k & 7);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return { fog: btoa(s), n: FOG };
  }

  load(d) {
    this.resetFog();
    if (d && d.n === FOG && typeof d.fog === 'string') {
      try {
        const s = atob(d.fog);
        for (let k = 0; k < FOG * FOG; k++) if (s.charCodeAt(k >> 3) & (1 << (k & 7))) this.seen[k] = 1;
      } catch { /* an unreadable map starts over */ }
    }
    // The town, which you know already.
    this.see(-1.5, 1, 70);
    this.paintFog();
  }

  // M: the land near you, then all of it, then away.
  toggle(on) {
    if (on === undefined) { if (!this.open) { on = true; this.far = false; } else if (!this.far) { on = true; this.far = true; } else on = false; }
    if (!on) this.far = false;
    this.open = on;
    this.big.classList.toggle('open', on);
    if (on) this.drawBig(this.lastSnap, this.lastYaw);
  }

  // Each frame, from main.js.
  update(dt, snap, yaw, shown) {
    if (!snap) return;
    this.lastSnap = snap; this.lastYaw = yaw;
    const x = snap[H.PX], z = snap[H.PZ];
    const cell = Math.floor((EDGE - z) / FOG_M) * FOG + Math.floor((EDGE - x) / FOG_M);
    if (cell !== this.lastCell) { this.lastCell = cell; this.see(x, z); }
    this.mini.style.display = shown ? 'block' : 'none';
    if (!shown) { if (this.open) this.toggle(false); return; }
    // The corner map at 30 a second is smooth enough, and a phone has better things to do.
    this.miniT += dt;
    if (this.miniT >= 1 / 30) { this.miniT = 0; this.drawMini(snap, yaw); }
    if (this.open) { this.bigT = (this.bigT || 0) + dt; if (this.bigT >= 1 / 15) { this.bigT = 0; this.drawBig(snap, yaw); } }
  }

  // The dots: whoever's about, near enough to matter.
  marks(g, snap, toScreen, reach, px, pz, scale) {
    const n = snap[H.NCHARS];
    for (let i = 0; i < n; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.STATE] === 10) continue;
      const x = snap[o + C.X], z = snap[o + C.Z];
      if (Math.hypot(x - px, z - pz) > reach || !this.isSeen(x, z)) continue;
      const [sx, sy] = toScreen(x, z);
      const hostile = snap[o + C.HOSTILE] > 0.5;
      g.fillStyle = hostile ? '#d8402c' : '#e9dfc9';
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      g.beginPath(); g.arc(sx, sy, hostile ? 2.6 * scale : 2 * scale, 0, 6.2832); g.fill(); g.stroke();
    }
  }

  arrow(g, sx, sy, angle, size) {
    g.save();
    g.translate(sx, sy); g.rotate(angle);
    g.fillStyle = '#f1d68a'; g.strokeStyle = '#120c06'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.62, size * 0.7); g.lineTo(0, size * 0.32); g.lineTo(-size * 0.62, size * 0.7); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }

  fit(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return dpr;
  }

  drawMini(snap, yaw) {
    const c = this.mini, g = this.miniCtx;
    const dpr = this.fit(c);
    const W = c.width, R = W / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath(); g.arc(R, R, R - 1, 0, 6.2832); g.clip();
    g.fillStyle = '#060504'; g.fillRect(0, 0, W, W);
    const px = snap[H.PX], pz = snap[H.PZ];
    const k = R / MINI_R;                    // screen pixels to a metre
    // Turned so the way you face is up: the paper's "up" is +z, and facing yaw points along (sin, cos).
    g.translate(R, R); g.rotate(yaw);
    const [ppx, ppy] = toPaper(px, pz);
    g.scale(k * MPP, k * MPP);
    g.translate(-ppx, -ppy);
    if (this.ready) {
      g.imageSmoothingEnabled = true;
      g.drawImage(this.paper, 0, 0);
      g.drawImage(this.fog, 0, 0, FOG, FOG, 0, 0, PX, PX);
    }
    g.restore();
    // The others, on the same turn.
    g.save();
    g.beginPath(); g.arc(R, R, R - 1, 0, 6.2832); g.clip();
    const s = Math.sin(yaw), co = Math.cos(yaw);
    this.marks(g, snap, (x, z) => {
      const dx = -(x - px), dz = -(z - pz);          // on the paper, before the turn
      return [R + (dx * co - dz * s) * k, R + (dx * s + dz * co) * k];
    }, MINI_R * 1.05, px, pz, dpr);
    g.restore();
    this.arrow(g, R, R, 0, 7 * dpr);
    // The rim, and north on it.
    g.strokeStyle = 'rgba(201, 163, 92, 0.85)'; g.lineWidth = 2 * dpr;
    g.beginPath(); g.arc(R, R, R - dpr, 0, 6.2832); g.stroke();
    const nx = R + Math.sin(yaw) * (R - 9 * dpr), ny = R - Math.cos(yaw) * (R - 9 * dpr);
    g.fillStyle = '#c9a35c'; g.font = `700 ${10 * dpr}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', nx, ny);
  }

  drawBig(snap, yaw) {
    const c = this.bigCanvas, g = this.bigCtx;
    const dpr = this.fit(c);
    const W = c.width, Hh = c.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#060504'; g.fillRect(0, 0, W, Hh);
    const side = Math.min(W, Hh);
    // Near: 400 m across, round you. Far: the whole land.
    const span = this.far ? 2 * EDGE : NEAR_SPAN;
    const [cx, cy] = this.far || !snap ? [PX / 2, PX / 2] : toPaper(snap[H.PX], snap[H.PZ]);
    const k = side / (span / MPP), ox = W / 2 - cx * k, oy = Hh / 2 - cy * k;
    if (this.ready) {
      g.imageSmoothingEnabled = true;
      g.drawImage(this.paper, ox, oy, PX * k, PX * k);
      g.drawImage(this.fog, 0, 0, FOG, FOG, ox, oy, PX * k, PX * k);
    } else {
      g.fillStyle = '#c9a35c'; g.font = `${14 * dpr}px Georgia, serif`; g.textAlign = 'center';
      g.fillText('Drawing the map...', W / 2, Hh / 2);
    }
    // Names, for what you've seen.
    const label = (text, x, z, size = 12) => {
      if (!this.isSeen(x, z)) return;
      const [px, py] = toPaper(x, z);
      g.font = `italic ${size * dpr}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.fillStyle = '#e2cf9c';
      g.strokeText(text, ox + px * k, oy + py * k); g.fillText(text, ox + px * k, oy + py * k);
    };
    if (!snap) return;
    label('The Cathedral', 90, -34);
    label('The Summit', SUMMIT.x, SUMMIT.z - 30);
    label('The Long Road', -262, 236, 11);
    label('The Fall', -300, 40, 11);
    const px = snap[H.PX], pz = snap[H.PZ];
    const toScreen = (x, z) => { const [a, b] = toPaper(x, z); return [ox + a * k, oy + b * k]; };
    this.marks(g, snap, toScreen, this.far ? 120 : NEAR_SPAN, px, pz, dpr);
    const [sx, sy] = toScreen(px, pz);
    // Facing yaw goes along (sin, cos) in x and z, which is (-sin, -cos) on the paper.
    this.arrow(g, sx, sy, Math.atan2(-Math.sin(yaw), Math.cos(yaw)), 9 * dpr);
  }
}
