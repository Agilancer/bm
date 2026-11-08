// Feelings over a head, since faces in this game don't move: a mark that pops up beside it (! !! ? the vein of anger, a
// bead of sweat, a little rain cloud of gloom) and lines round it (the tremble of anger, the burst of a start). Drawn on the page
// over the picture, pinned to the head from the camera each frame: life size from close up, never smaller than a
// thumbnail from far off, and kept clear of the cinema bars.
import { clamp } from '../core/math.js';

const WORLD_FOV = 64 * Math.PI / 180;   // (the renderer's, when the camera doesn't narrow it)
// The drawing is laid out in centimetres round the middle of the head: x right, y down.
const BOX = { x: -60, y: -70, w: 120, h: 100 };
// Where the mark and the side mark sit for each of her. The witch's hat is wide and tall, so hers sit further out.
const SPOT = {
  pretty: { mark: [17, -27], side: [13, -18], sweat: [15, -6], ring: 17 },
  witch: { mark: [30, -44], side: [20, -6], sweat: [20, -2], ring: 24 },
};
const KINDS = ['startle', 'panic', 'question', 'anger', 'sweat', 'gloom'];

const glyph = (text, cls = '') => `<text class="em-glyph ${cls}" text-anchor="middle" y="8">${text}</text>`;
// The vein: four bent strokes, their corners turned in to the middle.
const vein = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => `M${a * 1.3} ${b * 4.6}Q${a * 1.3} ${b * 1.3} ${a * 4.6} ${b * 1.3}`).join('');
const drop = 'M0 -5.5C2.4 -1.6 4 1 4 3A4 4 0 0 1 -4 3C-4 1 -2.4 -1.6 0 -5.5Z';
const cloud = 'M-9 2A4 4 0 0 1 -6 -4A5.5 5.5 0 0 1 3 -6A4.5 4.5 0 0 1 9 -1A3.5 3.5 0 0 1 7.5 4L-7.5 4A3 3 0 0 1 -9 2Z';
const rain = [-5.5, -1.8, 1.8, 5.5].map((x, i) => `M${x} ${7 + (i % 2)}q1.2 2 0 4q-1.2 2 0 4`).join('');

export class Emotes {
  constructor(parent, before = null) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = this.svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'op-emote');
    svg.setAttribute('viewBox', `${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`);
    svg.setAttribute('width', BOX.w); svg.setAttribute('height', BOX.h);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <linearGradient id="em-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7da"/><stop offset="1" stop-color="#e3a93a"/></linearGradient>
      </defs>
      <g data-k="startle"><g class="em-lines"></g><g class="em-mark"><g class="em-hop">${glyph('!')}</g></g></g>
      <g data-k="panic"><g class="em-lines"></g><g class="em-mark"><g class="em-hop"><g transform="translate(-6 0) rotate(-9)">${glyph('!')}</g><g transform="translate(6 1) rotate(9)">${glyph('!')}</g></g></g></g>
      <g data-k="question"><g class="em-mark"><g class="em-hop">${glyph('?')}</g></g></g>
      <g data-k="anger"><g class="em-lines"></g><g class="em-side"><g transform="scale(1.9)"><path class="em-vein-ink" d="${vein}"/><path class="em-vein" d="${vein}"/></g></g></g>
      <g data-k="sweat"><g class="em-side"><path class="em-drop" d="${drop}" transform="scale(1.25)"/><ellipse class="em-shine" cx="-1.3" cy="2.6" rx="0.9" ry="1.5"/></g></g>
      <g data-k="gloom"><g class="em-mark"><g class="em-hop"><path class="em-rain" d="${rain}"/><path class="em-cloud" d="${cloud}"/></g></g></g>`;
    parent.insertBefore(svg, before);
    this.groups = {};
    for (const k of KINDS) {
      const g = svg.querySelector(`[data-k="${k}"]`);
      this.groups[k] = { g, mark: g.querySelector('.em-mark'), hop: g.querySelector('.em-hop'), side: g.querySelector('.em-side'), lines: g.querySelector('.em-lines') };
      g.style.display = 'none';
    }
    this.kind = null; this.form = null; this.shown = false;
    svg.style.display = 'none';
  }

  hide() {
    if (!this.shown) return;
    this.shown = false;
    this.svg.style.display = 'none';
  }

  // The lines round the head for this feeling, laid out for this her.
  layLines(kind, form) {
    const s = SPOT[form], g = this.groups[kind].lines;
    if (!g) return;
    let html = '';
    if (kind === 'startle' || kind === 'panic') {
      // A burst off the crown of the head.
      const r = s.ring, angles = kind === 'panic' ? [-160, -125, -90, -55, -20] : [-150, -112, -68, -30];
      for (const a of angles) {
        const c = Math.cos(a * Math.PI / 180), n = Math.sin(a * Math.PI / 180);
        html += `<line x1="${(c * (r + 1)).toFixed(1)}" y1="${(n * (r + 1) - 4).toFixed(1)}" x2="${(c * (r + 8)).toFixed(1)}" y2="${(n * (r + 8) - 4).toFixed(1)}"/>`;
      }
    } else if (kind === 'anger') {
      // Trembling: two arcs hugging each side of the head, like (( )).
      for (const side of [-1, 1]) for (const r of [s.ring + 3, s.ring + 7]) {
        const c = Math.cos(0.5) * r, n = Math.sin(0.5) * r;
        html += `<path d="M${(side * c).toFixed(1)} ${(-n + 2).toFixed(1)}A${r} ${r} 0 0 ${side > 0 ? 1 : 0} ${(side * c).toFixed(1)} ${(n + 2).toFixed(1)}"/>`;
      }
    }
    g.innerHTML = html;
  }

  // cam: the frame's camera ({x, y, z, fx, fy, fz, ux, uy, uz, fov?}). head: the middle of her head, world metres. age and
  // dur: seconds into the feeling and how long it lasts. form: 'pretty' or 'witch'. bar: the cinema bar's height, px.
  draw(cam, head, kind, age, dur, form, bar = 0) {
    const W = innerWidth, H = innerHeight;
    const dx = head[0] - cam.x, dy = head[1] - cam.y, dz = head[2] - cam.z;
    const z = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (z < 0.35) { this.hide(); return; }
    // The camera's right is forward × up.
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    const tan = Math.tan((cam.fov || WORLD_FOV) / 2), aspect = W / H;
    const nx = (dx * rx + dy * ry + dz * rz) / (z * tan * aspect), ny = (dx * cam.ux + dy * cam.uy + dz * cam.uz) / (z * tan);
    if (Math.abs(nx) > 1.1 || ny < -1.2 || ny > 1.25) { this.hide(); return; }
    const sx = (nx + 1) / 2 * W, sy = (1 - ny) / 2 * H;
    // Pixels a centimetre: true to her from close up, never smaller than a thumbnail far off; the marks themselves stop
    // growing past about a head's height on screen so a close-up isn't all exclamation mark.
    const life = H / 2 / (z * tan) / 100;
    const k = Math.max(life, H * 0.0034), g = Math.min(1, (H * 0.0052) / k);
    if (kind !== this.kind || form !== this.form) {
      if (this.kind) this.groups[this.kind].g.style.display = 'none';
      this.kind = kind; this.form = form;
      this.groups[kind].g.style.display = '';
      this.layLines(kind, form);
    }
    if (!this.shown) { this.shown = true; this.svg.style.display = ''; }
    const s = SPOT[form], grp = this.groups[kind];
    const fade = clamp(age / 0.1, 0, 1) * clamp((dur - age) / 0.3, 0, 1);
    const pop = age < 0.26 ? backOut(age / 0.26) : 1;
    this.svg.style.opacity = fade.toFixed(3);
    // (The head's middle is the drawing's 0,0: BOX in from its corner, scaled.)
    this.svg.style.transform = `translate(${(sx + BOX.x * k).toFixed(1)}px,${(sy + BOX.y * k).toFixed(1)}px) scale(${k.toFixed(4)})`;
    // Keep the mark under the top bar: slide it down (and out, past the hat) rather than lose it.
    const place = (at, el, extra = '', top = 14) => {
      const minY = (bar + 8 - sy) / k + top * g;
      const y = Math.max(at[1], minY), x = at[0] + Math.max(0, y - at[1]) * 0.35;
      el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(g * pop).toFixed(3)})${extra}`);
    };
    const jit = (n) => { const q = Math.floor(age / 0.06) * 7.13 + n * 3.7; return (Math.sin(q * 12.9898) * 43758.5453 % 1) * 0.9; };
    if (kind === 'startle' || kind === 'panic') {
      place(s.mark, grp.mark, '', 16);
      grp.hop.setAttribute('transform', `translate(0 ${(-3 * Math.sin(clamp(age / 0.3, 0, 1) * Math.PI)).toFixed(2)})`);
      grp.lines.setAttribute('transform', `scale(${(0.6 + 0.4 * pop).toFixed(3)})${kind === 'panic' ? ` translate(${jit(1).toFixed(2)} ${jit(2).toFixed(2)})` : ''}`);
      grp.lines.style.opacity = (1 - clamp((age - 0.5) / 0.5, 0, 0.6)).toFixed(3);
    } else if (kind === 'question') {
      place(s.mark, grp.mark, ` rotate(${(-6 + 9 * Math.sin(age * 2.6)).toFixed(2)})`, 16);
    } else if (kind === 'anger') {
      const beat = 1 + 0.16 * Math.max(0, Math.sin(age * 14));
      place(s.side, grp.side, ` scale(${beat.toFixed(3)})`, 9);
      grp.lines.setAttribute('transform', `translate(${(1.6 * jit(1) - 0.7).toFixed(2)} ${(jit(2) - 0.45).toFixed(2)})`);
    } else if (kind === 'sweat') {
      place([s.sweat[0], s.sweat[1] + 3.5 * clamp(age / Math.max(0.5, dur), 0, 1)], grp.side, '', 6);
    } else if (kind === 'gloom') {
      place(s.mark, grp.mark, '', 8);
      grp.hop.setAttribute('transform', `translate(0 ${(0.8 * Math.sin(age * 2.2)).toFixed(2)})`);
      grp.hop.firstElementChild.style.opacity = smooth((age - 0.15) / 0.4).toFixed(3);
    }
  }
}

const backOut = (x) => { const c = 2.2; x -= 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
