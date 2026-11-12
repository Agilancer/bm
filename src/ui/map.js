// The map: a small one in the corner that turns with you, and the big one on M (MAP on a phone). Only what you've
// walked near is drawn; the rest stays dark until you go and see it. What you've seen is saved with the game.
//
// The big map is looked about freely: the wheel (or a pinch) brings it nearer and further, from a few rooms to the whole
// land, and a drag moves it (with the mouse held by the game, hold the left button and move). It follows you until you move
// it; a double click, Home or the ring button brings it back to you.
//
// Under a roof (the cathedral and its catacombs, the Warrens, the Test Dungeon) both maps show the place's own chart, of
// what you've walked of it: src/ui/undermap.js.
//
// The quest log's Map (src/ui/folk.js) opens the big one framed on where a quest takes place, with a gold pin on each spot
// and its name (showPlace), whether you've been there or not; someone who walks about is followed. Under a roof it shows the
// land instead when that's where the quest is. The pins go when the map's shut.
//
// Seen from above with the way you face pointing up the screen, +z is up and -x is to the right (the camera's right
// is (-cos yaw, sin yaw)), so on the paper a point (x, z) goes to (-x, -z). The big map keeps +z up.

import { C, CHARS_START, C_SIZE, H } from '../core/layout.js';
import { forestAmount, forestTrees } from '../core/forest.js';
import { LAND_EDGE, PATHS, PLOTS, ROADS, SUMMIT, openingTerrain, terrainHeight } from '../core/terrain.js';
import { CHURCH_SITE, churchAt } from '../core/church.js';
import { COUNTRIES, COUNTRY_KEYS, ROUTES, SITES, WATERS, countryWeights } from '../core/lands.js';
import { CHARTS, chartAt, setInterior } from './undermap.js';

// Two papers: the town's, fine, out to EDGE; and the whole land's, coarse, out to WORLD, under it.
const EDGE = 1200;
const PX = 1200;                      // the town paper's pixels across: 2 m to a pixel
const MPP = (2 * EDGE) / PX;
const GRID = 600;                     // terrain samples across: 4 m apart
const WORLD = LAND_EDGE;
const WPX = 1400;                     // the land's paper: 8 m to a pixel
const WMPP = (2 * WORLD) / WPX;
const WGRID = 560;                    // its samples: 20 m apart
const FOG = 700;                      // seen-or-not cells across the whole land: 16 m
const FOG_M = (2 * WORLD) / FOG;
const SEE = 46;                       // how far round you the map fills in, metres
const MINI_R = 90;                    // the corner map's reach, metres from you to its rim
const MINI_IN = 26;                   // and under a roof
const NEAR_SPAN = 400;                // the big map as it opens: metres across its shorter side
const IN_SPAN = 70;                   // and under a roof
const SPAN_MIN = 60, IN_MIN = 14;     // as near as it comes

const toPaper = (x, z) => [(EDGE - x) / MPP, (EDGE - z) / MPP];
const toWorld = (x, z) => [(WORLD - x) / WMPP, (WORLD - z) / WMPP];
// Where the town's paper lies on the land's.
const TOWN_AT = (WORLD - EDGE) / WMPP, TOWN_SIZE = (2 * EDGE) / WMPP;

export class WorldMap {
  // pool: a thread pool to make the papers' samples on (rows), if there's one free of the fight's planning.
  constructor(base, touch, pool = null) {
    this.base = base; this.touch = touch; this.pool = pool;
    this.open = false;
    this.ready = false;
    this.paper = document.createElement('canvas'); this.paper.width = this.paper.height = PX;
    this.land = document.createElement('canvas'); this.land.width = this.land.height = WPX;
    this.portals = [];                // the seals you've woken: [x, z] (src/ui/portals.js)
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
    // The big map's view: what's at its middle, how many metres lie across its shorter side (one for the land, one for
    // under a roof), and whether it's following you.
    this.cx = 0; this.cz = 0; this.follow = true;
    this.spanOut = NEAR_SPAN; this.spanIn = IN_SPAN;
    this.place = null;                // the chart of where you are, under a roof
    this.pin = null;                  // a quest's place, from the quest log: { title, spots, chart } (showPlace)
    this.title = this.big.querySelector('.mapTitle');
    this.bind();
    this.build();
    fetch(`${base}assets/game/interior/interior.json`).then((r) => r.json()).then(setInterior).catch(() => { /* no chart of the church */ });
  }

  // The chart the big map shows: where you are, unless a quest's place is pinned somewhere else (the land, from under a roof).
  get view() { return this.pin && this.open ? this.pin.chart : this.place; }
  get span() { return this.view ? this.spanIn : this.spanOut; }
  set span(v) {
    if (this.view) { const c = this.view; this.spanIn = Math.min(Math.max(c.x1 - c.x0, c.z1 - c.z0) * 1.15, Math.max(IN_MIN, v)); }
    else this.spanOut = Math.min(2 * WORLD * 1.04, Math.max(SPAN_MIN, v));
  }

  // Pixels of the big canvas to a metre.
  get k() { return Math.min(this.bigCanvas.width, this.bigCanvas.height) / this.span; }

  // Nearer (f < 1) or further, about a point of the canvas (in its pixels) if one's given: what's under it stays under it.
  zoomBy(f, sx, sy) {
    const c = this.bigCanvas, k0 = this.k;
    this.span = this.span * f;
    const k1 = this.k;
    if (sx !== undefined && k1 !== k0) {
      const dx = sx - c.width / 2, dy = sy - c.height / 2;
      if (this.follow && Math.hypot(dx, dy) > 24) this.unfollow();
      if (!this.follow) { this.cx += dx / k1 - dx / k0; this.cz += dy / k1 - dy / k0; }
    }
    this.redraw();
  }

  // Moved by so many CSS pixels of the screen: the map goes with the hand.
  panBy(dx, dy) {
    this.unfollow();
    const dpr = this.bigCanvas.width / Math.max(1, this.bigCanvas.clientWidth), k = this.k;
    this.cx += (dx * dpr) / k; this.cz += (dy * dpr) / k;
    this.redraw();
  }

  unfollow() {
    if (!this.follow) return;
    this.follow = false;
    if (this.lastSnap) { this.cx = this.lastSnap[H.PX]; this.cz = this.lastSnap[H.PZ]; }
  }

  centre() { this.follow = true; if (this.pin) this.pin.chart = this.place; this.redraw(); }
  redraw() { if (this.open) this.drawBig(this.lastSnap, this.lastYaw); }

  // The hands on the big map: the wheel, a drag, a pinch, its buttons and keys.
  bind() {
    const c = this.bigCanvas;
    const at = (e) => { const r = c.getBoundingClientRect(), s = c.width / Math.max(1, r.width); return [(e.clientX - r.left) * s, (e.clientY - r.top) * s]; };
    // (Caught before the spell bar's wheel, which turns the spells while the mouse is held: src/ui/spellbar.js.)
    window.addEventListener('wheel', (e) => {
      if (!this.open) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      const f = Math.exp(Math.max(-1, Math.min(1, d * (e.ctrlKey ? 0.01 : 0.0016))));
      if (document.pointerLockElement || e.target !== c) this.zoomBy(f); else this.zoomBy(f, ...at(e));
    }, { passive: false, capture: true });
    // With the mouse held by the game there's no pointer to drag with: the left button held, and the mouse moved.
    document.addEventListener('mousemove', (e) => { if (this.open && document.pointerLockElement && (e.buttons & 1)) this.panBy(e.movementX, e.movementY); });
    const down = new Map();
    let pinch = 0, lastTap = 0, tapAt = [0, 0];
    const lift = (e) => { down.delete(e.pointerId); pinch = 0; c.classList.toggle('held', down.size > 0); };
    c.addEventListener('pointerdown', (e) => {
      if (!this.open) return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch { /* a pointer that's gone already */ }
      down.set(e.pointerId, [e.clientX, e.clientY]);
      c.classList.add('held');
      pinch = 0;
      // Twice in one place: back to you.
      const now = performance.now();
      if (down.size === 1 && now - lastTap < 320 && Math.hypot(e.clientX - tapAt[0], e.clientY - tapAt[1]) < 28) { this.centre(); lastTap = 0; }
      else { lastTap = now; tapAt = [e.clientX, e.clientY]; }
    });
    c.addEventListener('pointermove', (e) => {
      const was = down.get(e.pointerId);
      if (!was || !this.open) return;
      const pts = [...down.values()];
      if (down.size === 1) this.panBy(e.clientX - was[0], e.clientY - was[1]);
      down.set(e.pointerId, [e.clientX, e.clientY]);
      if (down.size === 2) {
        // Two fingers: the map goes with the point between them, and grows as they part.
        const [a, b] = [...down.values()];
        const mid0 = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.panBy(mid[0] - mid0[0], mid[1] - mid0[1]);
        if (pinch > 0 && dist > 0) this.zoomBy(pinch / dist, ...at({ clientX: mid[0], clientY: mid[1] }));
        pinch = dist;
      }
    });
    c.addEventListener('pointerup', lift); c.addEventListener('pointercancel', lift);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoomBy(1 / 1.3);
      else if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoomBy(1.3);
      else if (e.code === 'Home') this.centre();
    });
    const act = { in: () => this.zoomBy(1 / 1.4), out: () => this.zoomBy(1.4), me: () => this.centre(), shut: () => (this.onClose ? this.onClose() : this.toggle(false)) };
    for (const b of this.big.querySelectorAll('[data-map]')) {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); act[b.dataset.map]?.(); });
    }
  }

  // Drawn a few rows a frame, so nothing stalls while it's made.
  async build() {
    let village = null;
    try { village = await fetch(`${this.base}assets/game/village.json`).then((r) => r.json()); } catch { /* the map still has the land */ }
    const h = new Float32Array((GRID + 1) * (GRID + 1));
    const step = (2 * EDGE) / GRID;
    for (let j = (await this.rows(EDGE, GRID, { h })) ? GRID + 1 : 0; j <= GRID;) {
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
    for (let i = 0; i < trees.length; i += 7) {
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
    const houses = (village?.footprints || []).concat((village?.colliders || []).filter((c) => c.h >= 3 && c.hx >= 2.5 && c.hz >= 1.2 && c.x < CHURCH_SITE.x0));
    if (houses.length) for (const c of houses) rect(c.x, c.z, c.hx, c.hz, c.yaw);
    else for (const p of PLOTS) rect(p[0], p[1], p[2] * 0.8, p[3] * 0.8, 0);

    // The cathedral, out east of the town (src/core/church.js).
    g.fillStyle = 'rgba(92, 38, 30, 0.95)'; g.strokeStyle = 'rgba(201, 163, 92, 0.9)';
    rect(...churchAt(90, 0), 34, 22, 0);
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
    await this.buildLand();
    this.ready = true;
  }

  // A paper's samples, made on a thread of the pool's (src/sim/job.worker.js mapRows), a few rows a job so the land
  // being laid round you isn't kept waiting behind them: three seconds of sums that were the render thread's, in the first
  // half minute of play. False with no pool to ask (or a job that fails): then they're made here, as they were.
  async rows(edge, grid, into) {
    if (!this.pool) return false;
    const N = grid + 1, each = 24;
    try {
      for (let j0 = 0; j0 < N; j0 += each) {
        const res = await this.pool.run('maprows', { opening: openingTerrain, edge, grid, j0, j1: Math.min(N, j0 + each), land: !!into.wood });
        into.h.set(res.h, j0 * N);
        if (into.wood) { into.wood.set(res.wood, j0 * N); into.tint.set(res.tint, j0 * N * 3); }
      }
      return true;
    } catch (e) { console.warn('map rows', e); return false; }
  }

  // The whole land: its countries' colours by height, the woods, the water, the roads, and every named place.
  async buildLand() {
    const N = WGRID + 1, step = (2 * WORLD) / WGRID;
    const h = new Float32Array(N * N), wood = new Float32Array(N * N), tint = new Float32Array(N * N * 3);
    const w = new Float32Array(COUNTRY_KEYS.length);
    for (let j = (await this.rows(WORLD, WGRID, { h, wood, tint })) ? N : 0; j < N;) {
      const until = performance.now() + 4;
      for (; j < N && performance.now() < until; j++) {
        const z = WORLD - j * step;
        for (let i = 0; i < N; i++) {
          const x = WORLD - i * step, k = j * N + i;
          h[k] = terrainHeight(x, z);
          wood[k] = forestAmount(x, z);
          countryWeights(x, z, w);
          let r = 0, gg = 0, b = 0;
          COUNTRY_KEYS.forEach((key, c) => { const t = COUNTRIES[key].tint; r += w[c] * t[0]; gg += w[c] * t[1]; b += w[c] * t[2]; });
          tint[k * 3] = r; tint[k * 3 + 1] = gg; tint[k * 3 + 2] = b;
        }
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    const img = new ImageData(WGRID, WGRID);
    for (let j = 0; j < WGRID; j++) {
      for (let i = 0; i < WGRID; i++) {
        const k = j * N + i, v = h[k], dx = h[k + 1] - v, dy = h[k + N] - v;
        const t = Math.min(1, Math.max(0, v / 700)) ** 0.6, snow = Math.min(1, Math.max(0, (v - 520) / 140));
        const shade = Math.min(1.4, Math.max(0.5, 1 - (dx + dy) * 0.02));
        const o = (j * WGRID + i) * 4, f = 1 - wood[k] * 0.45;
        const c = [(46 + 80 * t) * tint[k * 3] * f, (52 + 58 * t) * tint[k * 3 + 1] * f, (30 + 40 * t) * tint[k * 3 + 2] * f];
        for (let q = 0; q < 3; q++) img.data[o + q] = (c[q] + (226 - c[q]) * snow) * shade;
        img.data[o + 3] = 255;
      }
    }
    const small = document.createElement('canvas'); small.width = small.height = WGRID;
    small.getContext('2d').putImageData(img, 0, 0);
    const g = this.land.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(small, 0, 0, WPX, WPX);
    g.fillStyle = 'rgba(70, 104, 128, 0.95)';
    for (const wt of WATERS) { const [px, py] = toWorld(wt.x, wt.z); g.beginPath(); g.arc(px, py, Math.max(2, wt.r / WMPP), 0, 6.2832); g.fill(); }
    for (const r of ROUTES) {
      g.strokeStyle = 'rgba(214, 192, 142, 0.9)'; g.lineWidth = Math.max(1.5, (2 * r.w) / WMPP); g.lineJoin = g.lineCap = 'round';
      g.beginPath();
      r.pts.forEach(([x, z], n) => { const [px, py] = toWorld(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    }
    for (const k of Object.keys(SITES)) {
      const s = SITES[k], [px, py] = toWorld(s.x, s.z);
      g.fillStyle = s.keep ? 'rgba(120, 24, 20, 0.95)' : s.light ? 'rgba(220, 200, 140, 0.95)' : 'rgba(150, 118, 70, 0.95)';
      g.strokeStyle = 'rgba(20, 14, 8, 0.9)'; g.lineWidth = 1;
      g.beginPath(); g.arc(px, py, 3.2, 0, 6.2832); g.fill(); g.stroke();
    }
    // The land's rim, where nobody goes past.
    g.strokeStyle = 'rgba(0, 0, 0, 0.8)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, WPX - 3, WPX - 3);
  }

  // Both papers and the fog, drawn into g as it's set up for the land's paper.
  drawPapers(g) {
    g.drawImage(this.land, 0, 0);
    g.drawImage(this.paper, TOWN_AT, TOWN_AT, TOWN_SIZE, TOWN_SIZE);
    g.drawImage(this.fog, 0, 0, FOG, FOG, 0, 0, WPX, WPX);
  }

  isSeen(x, z) {
    const i = Math.floor((WORLD - x) / FOG_M), j = Math.floor((WORLD - z) / FOG_M);
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
    const ci = (WORLD - x) / FOG_M, cj = (WORLD - z) / FOG_M, cr = r / FOG_M;
    let any = false;
    for (let j = Math.max(0, Math.floor(cj - cr)); j <= Math.min(FOG - 1, Math.ceil(cj + cr)); j++) {
      for (let i = Math.max(0, Math.floor(ci - cr)); i <= Math.min(FOG - 1, Math.ceil(ci + cr)); i++) {
        if (this.seen[j * FOG + i] || Math.hypot(i + 0.5 - ci, j + 0.5 - cj) > cr) continue;
        this.seen[j * FOG + i] = 1; any = true;
      }
    }
    // (Cleared where you are, not the whole fog painted again: it's 700 cells across.)
    if (any) {
      const f = this.fogCtx;
      f.globalCompositeOperation = 'destination-out';
      f.beginPath(); f.arc(ci, cj, cr + 0.5, 0, 6.2832); f.fill();
      f.globalCompositeOperation = 'source-over';
    }
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
    const under = {};
    for (const c of CHARTS) { const u = c.save(); if (u) under[c.key] = u; }
    return { fog: btoa(s), n: FOG, under };
  }

  load(d) {
    for (const c of CHARTS) c.load(d?.under?.[c.key]);
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

  // M: the map round you, and away again. It opens on you, as near as it was left.
  toggle(on = !this.open) {
    this.open = on;
    if (!on) this.pin = null;
    if (this.input) this.input.mapUp = on;      // (the left button moves the map, not the sword: src/input.js)
    this.big.classList.toggle('open', on);
    document.body.classList.toggle('map-open', on);   // (on a phone the skull and Auto step aside: index.html)
    if (on) { this.follow = true; this.drawBig(this.lastSnap, this.lastYaw); }
  }

  // Each frame, from main.js.
  update(dt, snap, yaw, shown) {
    if (!snap) return;
    this.lastSnap = snap; this.lastYaw = yaw;
    const x = snap[H.PX], z = snap[H.PZ];
    const place = chartAt(x, snap[H.PY], z);
    if (place !== this.place) { this.place = place; if (!this.pin) this.follow = true; }
    if (place) place.see(x, z);
    else {
      const cell = Math.floor((WORLD - z) / FOG_M) * FOG + Math.floor((WORLD - x) / FOG_M);
      if (cell !== this.lastCell) { this.lastCell = cell; this.see(x, z); }
    }
    this.mini.style.display = shown && !this.open ? 'block' : 'none';      // (the big map has its own north, where the corner one sits)
    if (!shown) { if (this.open) this.toggle(false); return; }
    // The corner map at 30 a second is smooth enough, and a phone has better things to do.
    this.miniT += dt;
    if (this.miniT >= 1 / 30 && !this.open) { this.miniT = 0; this.drawMini(snap, yaw); }
    if (this.open) { this.bigT = (this.bigT || 0) + dt; if (this.bigT >= 1 / 20) { this.bigT = 0; this.drawBig(snap, yaw); } }
  }

  // The dots: whoever's about, near enough to matter.
  marks(g, snap, toScreen, reach, px, pz, scale, place = this.place) {
    const n = snap[H.NCHARS];
    for (let i = 0; i < n; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.STATE] === 10) continue;
      const x = snap[o + C.X], z = snap[o + C.Z];
      if (Math.hypot(x - px, z - pz) > reach || !(place ? place.isSeen(x, z) : this.isSeen(x, z))) continue;
      const [sx, sy] = toScreen(x, z);
      const hostile = snap[o + C.HOSTILE] > 0.5;
      g.fillStyle = hostile ? '#d8402c' : '#e9dfc9';
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      g.beginPath(); g.arc(sx, sy, hostile ? 2.6 * scale : 2 * scale, 0, 6.2832); g.fill(); g.stroke();
    }
  }

  arrow(g, sx, sy, angle, size, colour = '#f1d68a') {
    g.save();
    g.translate(sx, sy); g.rotate(angle);
    g.fillStyle = colour; g.strokeStyle = '#120c06'; g.lineWidth = 1.5;
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

  // The quest log's Map: the big map opened (by src/main.js) and framed on a quest's place. p: { title, spots: [{ x, z, name,
  // r (anywhere round it counts), below (in the catacombs), at() (where someone is now) }] }. False if it's nowhere yet.
  showPlace(p) {
    const at = (sp) => sp.at?.() || sp, ok = (q) => Number.isFinite(q.x) && Number.isFinite(q.z);
    const pts = p.spots.map((sp) => ({ ...sp, ...at(sp) })).filter(ok);
    if (!pts.length) return false;
    // On the chart you're on if it's all there (down in the catacombs with you); else on the land.
    const here = this.place;
    const chart = here && pts.every((q) => chartAt(q.x, q.below ? -12 : 2, q.z) === here) ? here : null;
    this.pin = { title: p.title, spots: p.spots, chart, t0: performance.now() };
    // Framed: all of it, with room round it; as near as 160 m across on the land, 40 m under a roof.
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const q of pts) { const r = q.r || 0; x0 = Math.min(x0, q.x - r); x1 = Math.max(x1, q.x + r); z0 = Math.min(z0, q.z - r); z1 = Math.max(z1, q.z + r); }
    this.follow = false;
    this.cx = (x0 + x1) / 2; this.cz = (z0 + z1) / 2;
    // (The span is across the canvas's shorter side: a wide canvas shows a wide place in less of it.)
    const c = this.bigCanvas, w = Math.max(c.clientWidth, 1), h = Math.max(c.clientHeight, 1), s = Math.min(w, h);
    this.span = Math.max(chart ? 40 : 160, Math.max((x1 - x0) * s / w, (z1 - z0) * s / h) * 1.4);
    this.redraw();
    return true;
  }

  // The pinned place: a gold pin on each spot with its name (a ring round it when anywhere near counts), an arrow at the rim
  // for one that's off the edge, and the quest's name across the top.
  drawPin(g, toScreen, k, dpr, W, Hh, text) {
    const P = this.pin, t = (performance.now() - P.t0) / 1000, m = 22 * dpr;
    for (const sp of P.spots) {
      const q = sp.at?.() || sp;
      if (!Number.isFinite(q.x) || !Number.isFinite(q.z)) continue;
      const [sx, sy] = toScreen(q.x, q.z);
      if (sx < m || sy < m || sx > W - m || sy > Hh - m) {
        // Off the edge: a pin at the rim, pointing out to it.
        const ex = Math.min(W - m, Math.max(m, sx)), ey = Math.min(Hh - m, Math.max(m, sy));
        this.arrow(g, ex, ey, Math.atan2(sx - ex, -(sy - ey)), 8 * dpr, '#ffd21f');
        continue;
      }
      const rr = (sp.r || 0) * k;
      if (rr > 14 * dpr) {
        g.save();
        g.fillStyle = 'rgba(255, 210, 31, 0.10)'; g.strokeStyle = 'rgba(255, 210, 31, 0.75)'; g.lineWidth = 1.5 * dpr; g.setLineDash([6 * dpr, 5 * dpr]);
        g.beginPath(); g.arc(sx, sy, rr, 0, 6.2832); g.fill(); g.stroke();
        g.restore();
      }
      // A ring going out from it, so it's found at a glance.
      const f = (t % 1.6) / 1.6;
      g.strokeStyle = `rgba(255, 210, 31, ${(0.85 * (1 - f)).toFixed(3)})`; g.lineWidth = 2 * dpr;
      g.beginPath(); g.arc(sx, sy - 13 * dpr, (6 + 16 * f) * dpr, 0, 6.2832); g.stroke();
      // The pin: a round head on a point, gold with a dark edge.
      g.fillStyle = '#ffd21f'; g.strokeStyle = '#2a1700'; g.lineWidth = 1.6 * dpr;
      // (Its sides run from the point to touch the head: acos(r / d) either side of straight down.)
      const side = Math.acos(7.5 / 14);
      g.beginPath(); g.moveTo(sx, sy); g.arc(sx, sy - 14 * dpr, 7.5 * dpr, Math.PI / 2 + side, Math.PI / 2 - side); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2a1700'; g.beginPath(); g.arc(sx, sy - 14 * dpr, 2.6 * dpr, 0, 6.2832); g.fill();
      if (sp.name) text(sp.name, sx, sy + 11 * dpr, 13, false, '#ffe07a');
    }
    if (P.title) text(`\u25C6 ${P.title}`, W / 2, 18 * dpr, 15, false, '#ffd21f');
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
    const place = this.place && this.place.kind ? this.place : null;
    const reach = place ? MINI_IN : MINI_R;
    const k = R / reach;                     // screen pixels to a metre
    // Turned so the way you face is up: the paper's "up" is +z, and facing yaw points along (sin, cos).
    g.translate(R, R); g.rotate(yaw);
    if (place) { g.fillStyle = '#0b0908'; g.fillRect(-W, -W, 2 * W, 2 * W); place.draw(g, 0, 0, px, pz, k); }
    const [ppx, ppy] = toWorld(px, pz);
    g.scale(k * WMPP, k * WMPP);
    g.translate(-ppx, -ppy);
    if (this.ready && !place) {
      g.imageSmoothingEnabled = true;
      this.drawPapers(g);
    }
    g.restore();
    // The others, on the same turn.
    g.save();
    g.beginPath(); g.arc(R, R, R - 1, 0, 6.2832); g.clip();
    const s = Math.sin(yaw), co = Math.cos(yaw);
    this.marks(g, snap, (x, z) => {
      const dx = -(x - px), dz = -(z - pz);          // on the paper, before the turn
      return [R + (dx * co - dz * s) * k, R + (dx * s + dz * co) * k];
    }, reach * 1.05, px, pz, dpr);
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
    const view = this.view, place = view && view.kind ? view : null;
    this.span = this.span;                 // (kept within what this place allows)
    const k = this.k, hw = W / 2 / k, hh = Hh / 2 / k;
    if (this.follow && snap) { this.cx = snap[H.PX]; this.cz = snap[H.PZ]; }
    // Never off the edge of the paper: a view wider than it sits on its middle.
    const hold = (v, lo, hi, half) => (hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
    const B = place ? { x0: place.x0 - 6, x1: place.x1 + 6, z0: place.z0 - 6, z1: place.z1 + 6 } : { x0: -WORLD, x1: WORLD, z0: -WORLD, z1: WORLD };
    const cx = hold(this.cx, B.x0, B.x1, hw), cz = hold(this.cz, B.z0, B.z1, hh);
    if (!this.follow) { this.cx = cx; this.cz = cz; }
    const toScreen = (x, z) => [W / 2 + (cx - x) * k, Hh / 2 + (cz - z) * k];
    const onScreen = (sx, sy, m = 40 * dpr) => sx > -m && sy > -m && sx < W + m && sy < Hh + m;
    const text = (t, sx, sy, size, italic = true, colour = '#e2cf9c') => {
      g.font = `${italic ? 'italic ' : ''}${size * dpr}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.fillStyle = colour;
      g.strokeText(t, sx, sy); g.fillText(t, sx, sy);
    };
    const seen = (x, z) => (place ? place.isSeen(x, z) : this.isSeen(x, z));
    // A name, for what you've seen: so many pixels under its place.
    const label = (t, x, z, size = 12, drop = 0) => {
      if (!seen(x, z)) return;
      const [sx, sy] = toScreen(x, z);
      if (onScreen(sx, sy)) text(t, sx, sy + drop * dpr, size);
    };
    let title = '';
    if (place) {
      place.draw(g, W / 2, Hh / 2, cx, cz, k);
      // Its doors, a gold tick each; and its rooms' names, once you've stood in them.
      g.fillStyle = '#e8b64a'; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = dpr;
      const r = Math.max(2 * dpr, Math.min(5 * dpr, 0.7 * k));
      for (const d of place.doors) {
        const [sx, sy] = toScreen(d.x, d.z);
        if (!onScreen(sx, sy) || !(seen(d.x, d.z) || seen(d.x + 1.5, d.z) || seen(d.x - 1.5, d.z) || seen(d.x, d.z + 1.5) || seen(d.x, d.z - 1.5))) continue;
        g.beginPath(); g.moveTo(sx, sy - r); g.lineTo(sx + r, sy); g.lineTo(sx, sy + r); g.lineTo(sx - r, sy); g.closePath(); g.fill(); g.stroke();
      }
      if (k > 2.2 * dpr) for (const l of place.labels) label(l.text, l.x, l.z, 12);
      title = snap && place.title ? place.title(snap[H.PY]) : place.name;
    } else if (this.ready) {
      g.imageSmoothingEnabled = true;
      g.save(); g.translate(W / 2 + (cx - WORLD) * k, Hh / 2 + (cz - WORLD) * k); g.scale(k * WMPP, k * WMPP); this.drawPapers(g); g.restore();
      const far = this.span > 2600, mid = this.span > 900;
      if (!far) {
        label('The Cathedral', ...churchAt(90, 0), 12, 26);
        label('The Summit', SUMMIT.x, SUMMIT.z, 12, 22);
        if (!mid) { label('The Long Road', -262, 236, 11); label('The Fall', -300, 40, 11); }
      }
      // The places and the countries, as far as you've been; and the seals you've woken.
      if (far) for (const key of COUNTRY_KEYS) { const cn = COUNTRIES[key]; if (key !== 'darkwood') label(cn.name.toUpperCase(), cn.c[0][0], cn.c[0][1] + 260, 12); }
      for (const key of Object.keys(SITES)) label(SITES[key].name, SITES[key].x, SITES[key].z, far ? 10 : 12, far ? 11 : 15);
      for (const [x, z] of this.portals) {
        const [qx, qy] = toScreen(x, z);
        g.strokeStyle = '#6fb0ff'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(qx, qy, 4.5 * dpr, 0, 6.2832); g.stroke();
      }
      // Whose land the middle of the map is, for its title.
      if (!far) {
        const w = this.weights || (this.weights = new Float32Array(COUNTRY_KEYS.length));
        countryWeights(cx, cz, w);
        let best = 0;
        for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i;
        title = COUNTRIES[COUNTRY_KEYS[best]].name;
      }
    } else {
      g.fillStyle = '#c9a35c'; g.font = `${14 * dpr}px Georgia, serif`; g.textAlign = 'center';
      g.fillText('Drawing the map...', W / 2, Hh / 2);
    }
    if (this.title && this.title.textContent !== title) this.title.textContent = title;
    if (!snap) return;
    const px = snap[H.PX], pz = snap[H.PZ];
    this.marks(g, snap, toScreen, place ? 80 : Math.min(400, Math.max(120, this.span)), px, pz, dpr, view);
    if (this.pin) this.drawPin(g, toScreen, k, dpr, W, Hh, text);
    // You: the arrow, or at the map's rim a small one pointing the way back to you.
    // (Facing yaw goes along (sin, cos) in x and z, which is (-sin, -cos) on the paper.)
    const [sx, sy] = toScreen(px, pz), m = 14 * dpr;
    if (sx >= m && sy >= m && sx <= W - m && sy <= Hh - m) this.arrow(g, sx, sy, Math.atan2(-Math.sin(yaw), Math.cos(yaw)), 9 * dpr);
    else {
      const ex = Math.min(W - m, Math.max(m, sx)), ey = Math.min(Hh - m, Math.max(m, sy));
      g.globalAlpha = 0.75; this.arrow(g, ex, ey, Math.atan2(sx - ex, -(sy - ey)), 7 * dpr); g.globalAlpha = 1;
    }
    // How far is how far: a bar of a round number of metres. And north, which is up.
    const want = (110 * dpr) / k, mag = 10 ** Math.floor(Math.log10(want)), len = [5, 2, 1].map((n) => n * mag).find((n) => n <= want) || mag;
    const bx = 16 * dpr, by = Hh - 16 * dpr, bl = len * k;
    g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 4 * dpr; g.lineCap = 'butt';
    const bar = () => { g.beginPath(); g.moveTo(bx, by - 5 * dpr); g.lineTo(bx, by); g.lineTo(bx + bl, by); g.lineTo(bx + bl, by - 5 * dpr); g.stroke(); };
    bar(); g.strokeStyle = '#e2cf9c'; g.lineWidth = 1.5 * dpr; bar();
    text(len >= 1000 ? `${len / 1000} km` : `${len} m`, bx + bl / 2, by - 11 * dpr, 11, false);
    text('N', W - 20 * dpr, 34 * dpr, 13, false, '#c9a35c');
    g.fillStyle = '#c9a35c'; g.beginPath(); g.moveTo(W - 20 * dpr, 10 * dpr); g.lineTo(W - 15 * dpr, 22 * dpr); g.lineTo(W - 25 * dpr, 22 * dpr); g.closePath(); g.fill();
  }
}
