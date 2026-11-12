// A speech bubble for Lisandra in the opening (src/ui/opening.js): her words over her head, with a tail to her, placed each
// frame by the camera the frame was drawn with. Over her head when there's room under the top bar; beside her face when
// the story has her close (a close-up leaves nothing above her); and with no tail, low in the middle, when she's out of
// sight, behind you, or a voice in your head. Never under the bars, never off the screen.
import { clamp } from '../core/math.js';

const WORLD_FOV = 72 * Math.PI / 180;   // (the view's own, when the camera doesn't say: src/ui/emotes.js)
const EDGE = 10;                        // px kept clear of the screen's edges and the bars
const TAIL = 16;                        // px from the bubble to the tip of its tail, at most
const ABOVE = 0.16;                     // m over the middle of her head: her crown, where a bubble over her points
const FACE = 0.13;                      // m: half her head's width, where a bubble beside her points
const NARROWEST = 180;                  // px: as narrow as a bubble beside her is made to fit

export class SpeechBubble {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'op-bubble';
    this.el.innerHTML = '<div class="op-bub"><b></b><p></p></div>';   // (the box inside, so it can pop without moving the bubble)
    this.who = this.el.querySelector('b'); this.text = this.el.querySelector('p');
    this.tail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.tail.setAttribute('class', 'op-tail');
    this.tail.innerHTML = '<polygon/><polyline/>';
    this.fill = this.tail.firstChild; this.ink = this.tail.lastChild;
    parent.append(this.el, this.tail);   // (the tail over the bubble's edge, so no border shows across its root)
    this.shown = false; this.key = null; this.w = 0; this.h = 0;
    this.hide();
  }

  // What she's saying: id (the line, so a new one pops in and a word revealed doesn't), html (a line revealed a word at a
  // time has the rest of it there, unseen, so the bubble keeps its size), who (named over the words when there's no tail to
  // say whose they are), and its manner: big (shouted), soft (under her breath, from out of sight, or in your head), inside
  // (in your head: no tail ever).
  set(id, html, who, style = {}) {
    const key = `${id}|${who}|${html}`;
    if (key === this.key) return;
    const fresh = id !== this.id;
    this.key = key; this.id = id;
    this.who.textContent = who;
    this.text.innerHTML = html;
    this.inside = !!style.inside;
    const cls = { big: !!style.big, soft: !!style.soft, inside: this.inside };
    for (const [k, on] of Object.entries(cls)) this.el.classList.toggle(k, on);
    this.tail.classList.toggle('soft', cls.soft);
    // (A new line pops in, the animation started again; a word revealed leaves it be. It only grows a little, never fades
    // in: a bubble is there to be read from its first frame.)
    if (fresh) { this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop'); }
    this.measure();
  }

  // Its size, as it is now (shown, to be measured: it's placed before it's painted).
  measure() {
    this.el.style.display = ''; this.el.style.width = '';
    this.w = this.el.offsetWidth; this.h = this.el.offsetHeight;
    this.heights = new Map();
  }

  hide() {
    if (this.shown === false && this.key === null) return;
    this.shown = false; this.key = null; this.id = null;
    this.el.style.display = 'none'; this.tail.style.display = 'none';
  }

  // Each frame, after it's drawn. cam: { x, y, z, fx, fy, fz, ux, uy, uz, fov? }. head: the middle of her head (world m).
  // bar: px the bars take at the top and the bottom (0 without them). avoid: boxes on the screen to keep clear of (the chat
  // log), if there's a way to: slid along off them, or on her other side.
  place(cam, head, bar = 0, avoid = []) {
    if (!this.key) return;
    const W = innerWidth, H = innerHeight;
    const top = bar + EDGE, bottom = H - bar - EDGE;
    const spot = !this.inside && cam && head ? this.project(cam, head) : null;
    // Her name over the words when there's no tail to show whose they are.
    const named = !spot;
    if (named !== this.named) { this.named = named; this.el.classList.toggle('named', named); this.measure(); }
    const w = this.w, h = this.h;
    this.el.style.display = ''; this.shown = true;
    const inX = (x, cw = w) => clamp(x, EDGE, W - EDGE - cw), inY = (y, ch = h) => clamp(y, top, bottom - ch);
    const clear = (c) => !avoid.some((o) => c.x < o.right + 6 && o.left - 6 < c.x + c.w && c.y < o.bottom + 6 && o.top - 6 < c.y + c.h);
    // Where it would go, then just past either side of each thing in the way: across (x) or up and down (y).
    const alongX = (x, cw = w) => [x, ...avoid.flatMap((o) => [inX(o.right + 8, cw), inX(o.left - 8 - cw, cw)])];
    const alongY = (y, ch = h) => [y, ...avoid.flatMap((o) => [inY(o.bottom + 8, ch), inY(o.top - 8 - ch, ch)])];
    const ways = [];
    if (!spot) {
      // Low in the middle, over the bottom bar (or where the subtitles were, without bars).
      const y = inY(bar ? bottom - h : H * 0.76 - h);
      for (const x of alongX(inX(W / 2 - w / 2))) ways.push({ x, y, w, h, tail: null });
    } else {
      const [sx, sy, ppm] = spot;
      const crown = sy - ABOVE * ppm, face = FACE * ppm;
      // Over her head, if it fits under the top bar (and not so far along that its tail can't reach her).
      const y = crown - TAIL - h;
      if (y >= top && crown <= bottom) {
        for (const x of alongX(inX(sx - w / 2))) {
          if (Math.abs(x + w / 2 - sx) > w / 2 + 40) continue;
          const bx = clamp(sx, x + 14, x + w - 14);
          ways.push({ x, y, w, h, tail: { base: [[bx - 7, y + h - 2], [bx + 7, y + h - 2]], tip: [lerpTo(bx, sx, 0.7), Math.max(y + h + 4, crown - 2)] } });
        }
      }
      // Beside her face, level with her mouth: the roomier side first, narrowed to the room there if it must be.
      const roomL = sx - face - TAIL - EDGE, roomR = W - EDGE - (sx + face + TAIL);
      for (const left of roomL > roomR ? [true, false] : [false, true]) {
        const room = left ? roomL : roomR;
        const cw = room >= w ? w : room >= NARROWEST ? Math.floor(room / 8) * 8 : 0;
        if (!cw) continue;
        const ch = cw === w ? h : this.heightAt(cw);
        const x = left ? sx - face - TAIL - cw : sx + face + TAIL;
        for (const yy of alongY(inY(sy - ch * 0.6, ch), ch)) {
          if (sy < yy - 24 || sy > yy + ch + 24) continue;
          ways.push(this.beside(left, x, yy, sx, sy, face, cw, ch));
        }
      }
      // No room either side (a face filling the screen): on the roomier side, over her face if it must be.
      if (!ways.length) {
        const left = roomL > roomR;
        ways.push(this.beside(left, inX(left ? sx - face - TAIL - w : sx + face + TAIL), inY(sy - h * 0.6), sx, sy, face, w, h));
      }
    }
    const c = ways.find(clear) || ways[0];
    const width = c.w === w ? '' : `${c.w}px`;
    if (this.el.style.width !== width) this.el.style.width = width;
    this.put(c.x, c.y, c.tail);
  }

  // Its height narrowed to cw px (once for each width, for each line).
  heightAt(cw) {
    let ch = this.heights.get(cw);
    if (ch === undefined) {
      const was = this.el.style.width;
      this.el.style.width = `${cw}px`;
      ch = this.el.offsetHeight;
      this.el.style.width = was;
      this.heights.set(cw, ch);
    }
    return ch;
  }

  // A bubble at (x, y), cw by ch, beside her face on her left or her right, its tail to her mouth (none if it's been pushed
  // in over her face for want of room, rather than one pointing the wrong way).
  beside(left, x, y, sx, sy, face, cw, ch) {
    const edge = left ? x + cw - 2 : x + 2, by = clamp(sy, y + 12, y + ch - 12);
    const tipX = left ? Math.min(sx - face, edge + TAIL) : Math.max(sx + face, edge - TAIL);
    const ok = left ? tipX > edge + 3 : tipX < edge - 3;
    return { x, y, w: cw, h: ch, tail: ok ? { base: [[edge, by - 7], [edge, by + 7]], tip: [tipX, clamp(sy, by - 10, by + 10)] } : null };
  }

  // Where the middle of her head is on the screen, and how many pixels a metre is there; null if she's not in the shot.
  project(cam, p) {
    const W = innerWidth, H = innerHeight;
    const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
    const z = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (z < 0.35) return null;
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    const tan = Math.tan((cam.fov || WORLD_FOV) / 2), aspect = W / H;
    const nx = (dx * rx + dy * ry + dz * rz) / (z * tan * aspect), ny = (dx * cam.ux + dy * cam.uy + dz * cam.uz) / (z * tan);
    if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.98) return null;
    return [(nx + 1) / 2 * W, (1 - ny) / 2 * H, H / 2 / (z * tan)];
  }

  put(x, y, tail) {
    this.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    if (!tail) { this.tail.style.display = 'none'; return; }
    this.tail.style.display = '';
    const [a, b] = tail.base, t = tail.tip, pt = (q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;
    this.fill.setAttribute('points', `${pt(a)} ${pt(t)} ${pt(b)}`);
    this.ink.setAttribute('points', `${pt(a)} ${pt(t)} ${pt(b)}`);
  }
}

const lerpTo = (a, b, k) => a + (b - a) * k;
