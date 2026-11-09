// The opening on screen: the camera while the story has it, your eyes opening, the bars, her words, your name, the cards,
// holding to skip, and its sound (src/ui/opening-sound.js). The sim keeps the clock and where everyone is (src/sim/opening.js).
import { CUES, CUE_IDS, emoteAt, lineAt, spoken, voiceOf } from '../core/opening-script.js';
import { C, CHARS_START, C_PROPS, C_SIZE, H } from '../core/layout.js';
import { clamp, damp, lerp, smoothstep, wrapAngle } from '../core/math.js';
import { CANDLES_AT, CAVE_LINE, CAVE_MOUTH, CAVE_OUT, DUST_AT, ESCORT_TO, OPENING, OPENING_REVISION, SNAP_AT, SWAP_AT, caveNearest, chamberPoint, collapseEye, prettyShown } from '../core/opening.js';
import { OpeningSound } from './opening-sound.js';
import { Emotes } from './emotes.js';
import { terrainHeight } from '../core/terrain.js';

const HERD_CONTROL = 9.9;    // (src/sim/opening.js: when you can walk again)
const SKIP_HOLD = 1.0;
const DEG = Math.PI / 180;
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]);
const pitchTo = (a, b) => Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2]));
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));
// The lens that fits `span` metres of her, top to bottom, between the bars, from d metres off (the bars take a fifth).
const framing = (d, span, lo = 9, hi = 64) => clamp(2 * Math.atan(span / 2 / Math.max(0.4, d)) / DEG / 0.79, lo, hi);
// Out from the ledge through the notch the road goes down: the far hills toward the town, and the sun. (The ledge sits
// between two banks, and from eye height the nearer one hides the town itself; the gap is narrow, so the lens is long.)
// The town, far below the ledge (the woods leave a line of sight to it: src/core/forest.js viewLane).
const valley = () => [ESCORT_TO[0], terrainHeight(ESCORT_TO[0], ESCORT_TO[1]) + 6, ESCORT_TO[1]];

// How far your eyes are open in the first moments: three tries, and the flash.
function lidsAt(t) {
  if (t >= SWAP_AT) return lerp(0.7, 1, clamp((t - SWAP_AT) / 0.12, 0, 1));
  const flutter = (k) => 1 + 0.06 * Math.sin(t * 9.0 + k) * Math.sin(t * 3.1);
  return 0.15 * bump(t, 3.0, 3.5, 3.9, 4.4) + 0.4 * bump(t, 4.7, 5.3, 6.0, 6.5) * flutter(1) + 0.7 * smoothstep(6.9, 7.6, t) * flutter(2);
}

export class OpeningHUD {
  constructor(onName, opts = {}) {
    this.name = '';
    this.onSkip = opts.onSkip;
    this.fx = opts.renderer;
    this.sound = opts.audio ? new OpeningSound(opts.audio) : null;
    const el = (tag, id, html = '') => { const e = document.createElement(tag); if (id) e.id = id; e.innerHTML = html; return e; };
    this.root = el('div', 'opening');
    this.root.setAttribute('aria-live', 'polite');
    this.root.innerHTML = `
      <div class="op-eyes"><span></span><span></span><i></i></div>
      <div class="op-flash"></div>
      <div class="op-bar op-top"></div><div class="op-bar op-bottom"></div>
      <div class="op-sub"><b></b><p></p></div>
      <div class="op-title"><h1></h1><p>Tessariel · Beacon of the Infinite</p><p class="op-class">Wizard</p></div>
      <div class="op-quest"><small></small><span></span></div>
      <div class="op-track"></div>
      <div class="op-skip"><span></span><i></i></div>`;
    document.body.append(this.root);
    // Her feelings over her head: in the world, so under your lids and the bars.
    this.emotes = new Emotes(this.root, this.root.firstElementChild);
    const q = (s) => this.root.querySelector(s);
    this.eyes = q('.op-eyes'); this.flash = q('.op-flash'); this.sub = q('.op-sub'); this.who = q('.op-sub b'); this.line = q('.op-sub p');
    this.title = q('.op-title'); this.titleName = q('.op-title h1'); this.quest = q('.op-quest'); this.track = q('.op-track'); this.skipHint = q('.op-skip');
    this.namePanel = el('section', 'opening-name-panel', `
      <form>
        <label for="opening-name">Your name</label>
        <div><input id="opening-name" maxlength="32" required autocomplete="off" placeholder="Your name"><button type="submit">Answer</button></div>
      </form>`);
    this.namePanel.hidden = true;
    document.body.append(this.namePanel);
    this.form = this.namePanel.querySelector('form');
    this.field = this.form.querySelector('input');
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = this.field.value.trim();
      if (!name) return;
      this.name = name;
      this.namePanel.hidden = true;
      onName();
    });
    this.form.addEventListener('keydown', (event) => event.stopPropagation());
    // Hold to skip: Space, or a finger held down while the story has the camera.
    this.holding = { key: false, touch: 0 };
    addEventListener('keydown', (e) => { if (e.code === 'Space') this.holding.key = true; });
    addEventListener('keyup', (e) => { if (e.code === 'Space') this.holding.key = false; });
    addEventListener('blur', () => { this.holding.key = false; this.holding.touch = 0; });
    addEventListener('touchstart', (e) => { this.holding.touch = e.touches.length; this.touched = true; }, { passive: true });
    addEventListener('touchend', (e) => { this.holding.touch = e.touches.length; }, { passive: true });
    addEventListener('touchcancel', () => { this.holding.touch = 0; }, { passive: true });
    this.reset();
  }

  reset(name = '') {
    this.name = name;
    this.field.value = name;
    this.lastStage = -1; this.lastT = 0; this.lastCue = 0;
    this.dir = null; this.holdT = 0; this.skipped = -1;
    this.sound?.stopAll();
  }

  // Whether the story has the screen: bars up, no hands, no HUD.
  cinematic(snap) {
    const s = snap[H.OPENING];
    return s >= OPENING.WAKE && s <= OPENING.COLLAPSE;
  }

  // Where she stands, her heading, and the height of her head (the sim's speech mark, 0.19 m over the head joint): close
  // shots are aimed by her head, so they find her eyes whether she's standing, kneeling or bent.
  her(snap) {
    const co = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    const head = snap[co + C_PROPS + 1] - 0.19;
    return [snap[co + C.X], snap[co + C.Y], snap[co + C.Z], snap[co + C.YAW], head > snap[co + C.Y] + 0.3 ? head : snap[co + C.Y] + 1.5];
  }

  // ---- the words, the eyes, the cards ------------------------------------------------------------------------------------
  draw(snap, active, dt = 1 / 60) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME];
    if (stage === OPENING.WAKE && (this.lastStage > OPENING.WAKE || t < this.lastT - 1)) this.reset(this.name);
    const crossed = (at) => this.lastStage === stage && this.lastT < at && t >= at;
    const her = this.her(snap);
    const show = active && stage > 0;
    this.root.hidden = !show;
    if (!show) { this.namePanel.hidden = true; this.lastStage = stage; this.lastT = t; return; }
    const cine = this.cinematic(snap);
    this.root.classList.toggle('bars', cine);
    document.body.classList.toggle('cinematic', cine);
    // The first moments of the walk: no crosshair sitting on her while you get your bearings.
    document.body.classList.toggle('op-handoff', stage === OPENING.ESCORT && t < 1.8);
    // Your eyes.
    const lids = stage === OPENING.WAKE ? lidsAt(t) : 1;
    const haze = stage !== OPENING.WAKE ? 0 : t < SWAP_AT ? (t < 4.6 ? 9 : t < 6.7 ? 6 : 3.5) : 3.5 * (1 - clamp((t - SWAP_AT) / 0.3, 0, 1));
    const vignette = stage !== OPENING.WAKE ? 0 : t < SWAP_AT ? 0.9 : lerp(0.9, 0.22, smoothstep(SWAP_AT, 11, t));
    this.eyes.style.setProperty('--lid', `${((1 - lids) * 51).toFixed(2)}vh`);
    this.eyes.style.setProperty('--haze', `${haze.toFixed(2)}px`);
    this.eyes.style.setProperty('--vig', vignette.toFixed(3));
    this.eyes.hidden = stage !== OPENING.WAKE || t > 16;
    // The flash when the glamour breaks; and the dark, if you're knocked flat on the road.
    const fell = snap[H.OPENING_FELL];
    const white = stage === OPENING.WAKE ? (t < SWAP_AT ? smoothstep(SWAP_AT - 0.06, SWAP_AT, t) : 1 - smoothstep(SWAP_AT, SWAP_AT + 0.4, t)) : 0;
    const black = fell < 1.8 ? 1 - smoothstep(0.5, 1.8, fell) : 0;
    this.flash.style.opacity = Math.max(white, black).toFixed(3);
    this.flash.classList.toggle('dark', black > white);
    // The name.
    this.namePanel.hidden = stage !== OPENING.NAME || !!this.name;
    if (!this.namePanel.hidden && document.activeElement !== this.field && !this.touched) this.field.focus({ preventScroll: true });
    // The title card, once you've said it.
    const card = stage === OPENING.HERD ? bump(t, 0.8, 1.4, 4.0, 4.8) : 0;
    this.title.style.opacity = card.toFixed(3);
    if (card > 0) this.titleName.textContent = (this.name || 'Tessariel').toUpperCase();
    // The quest.
    const q = stage === OPENING.ESCORT ? bump(t, 0.2, 0.8, 5.0, 5.8) : stage === OPENING.ARRIVED ? bump(t, 0.1, 0.6, 4.6, 5.4) : 0;
    this.quest.style.opacity = q.toFixed(3);
    if (q > 0) {
      this.quest.querySelector('small').textContent = stage === OPENING.ARRIVED ? 'Quest complete' : 'Quest';
      this.quest.querySelector('span').textContent = 'Go to Bellmourn with Lisandra';
    }
    this.track.textContent = stage === OPENING.ESCORT && t > 5 ? 'Go to Bellmourn with Lisandra' : '';
    // Her words.
    this.words(snap, stage, t, her);
    // Holding to skip.
    const canSkip = stage === OPENING.WAKE || stage === OPENING.COLLAPSE || stage === OPENING.LEAVE || (stage === OPENING.HERD && t < HERD_CONTROL);
    const touchOK = stage !== OPENING.LEAVE;
    const held = canSkip && this.skipped !== stage && (this.holding.key || (touchOK && this.holding.touch > 0));
    this.holdT = held ? this.holdT + dt : 0;
    if (this.holdT >= SKIP_HOLD) { this.holdT = 0; this.skipped = stage; this.sound?.hush(); this.onSkip?.(); }
    this.skipHint.hidden = !canSkip || this.skipped === stage || (stage === OPENING.WAKE && t < 2);
    this.skipHint.querySelector('span').textContent = this.touched ? 'Hold to skip' : 'Hold Space to skip';
    this.skipHint.style.setProperty('--k', (this.holdT / SKIP_HOLD).toFixed(3));
    // Dust and stones when it comes down.
    this.effects(snap, stage, t, dt, her, crossed);
    // Sound. (Birds and wind come in as you near the mouth.)
    if (this.sound) {
      const cam = this.cam || { x: snap[H.PX], z: snap[H.PZ] };
      const n = caveNearest(cam.x, cam.z);
      const inside = stage <= OPENING.LEAVE || (stage === OPENING.COLLAPSE && this.dir?.inside);
      const amb = inside ? clamp((1.2 - n.s) / 3, 0, 1) : 1;
      this.sound.update(stage, t, snap, her, lids, inside && n.s > 0.5, amb);
      const cue = snap[H.OPENING_CUE];
      if (cue && cue !== this.lastCue && CUE_IDS[cue - 1] === 'scream') {
        const a = Math.atan2(ESCORT_TO[0] - snap[H.PX], ESCORT_TO[1] - snap[H.PZ]);
        this.sound.scream(snap[H.PX] + Math.sin(a) * 26, snap[H.PY] + 1.6, snap[H.PZ] + Math.cos(a) * 26);
      }
      this.lastCue = cue;
    }
    this.lastStage = stage; this.lastT = t;
  }

  words(snap, stage, t, her) {
    let l = lineAt(stage, t), cueLine = false;
    const cue = snap[H.OPENING_CUE], cueT = snap[H.OPENING_CUE_T];
    if (!l && cue) {
      const c = CUES[CUE_IDS[cue - 1]];
      if (c && cueT < c.dur) { l = c; cueLine = true; }
    }
    if (!l) { this.sub.hidden = true; this.shown = null; return; }
    // Said aloud, in the voice of whichever of her you're seeing: from her mouth, the summons in your head (your eyes
    // aren't open yet), and from out of sight with the tunnel's echo.
    if (this.sound) {
      const id = cueLine ? `c${cue}` : `${stage}:${l.at}`, age = cueLine ? cueT : t - l.at;
      const wet = l.vo || l.off ? 0.6 : stage <= OPENING.LEAVE ? 0.3 : 0.12;
      if (l.vo) this.sound.say(id, voiceOf(stage, l), spoken(l), age, null, 0, 0, wet);
      else this.sound.say(id, voiceOf(stage, l), spoken(l), age, her[0], her[4] - 0.1, her[2], wet);
    }
    const named = stage >= OPENING.ESCORT || l.named || (cueLine && stage >= OPENING.ESCORT);
    const who = l.caption ? '' : named ? 'LISANDRA' : 'THE WITCH';
    const text = l.text.replace('{name}', this.name || 'Tessariel');
    let html;
    if (l.words) {
      const w = text.split(' ');
      const n = t < l.from ? 0 : t >= l.land ? w.length : 1 + Math.floor((t - l.from) / (l.land - l.from) * (w.length - 1));
      html = w.map((x, i) => (i < n ? x : `<span class="op-ghost">${x}</span>`)).join(' ');
    } else html = text;
    const key = who + html;
    if (key !== this.shown) {
      this.shown = key;
      this.sub.hidden = false;
      this.who.textContent = who + (l.vo ? ' (v.o.)' : l.off ? ' (off)' : '');
      this.line.innerHTML = html;
      this.sub.className = `op-sub${l.big ? ' big' : ''}${l.mutter || l.vo || l.off ? ' soft' : ''}${l.caption ? ' caption' : ''}`;
    }
  }

  effects(snap, stage, t, dt, her, crossed) {
    const r = this.fx;
    if (!r?.emit) return;
    const top = [CAVE_MOUTH[0] - CAVE_OUT[0] * 0.3, CAVE_LINE[0][5] + CAVE_LINE[0][7] - 0.2, CAVE_MOUTH[1] - CAVE_OUT[1] * 0.3];
    const every = (gap) => Math.floor(t / gap) !== Math.floor(this.lastT / gap) && this.lastStage === stage;
    if (stage === OPENING.LEAVE && every(1.7)) {
      // Grit trickling from the roof as the door slips.
      const n = caveNearest(snap[H.PX], snap[H.PZ]);
      if (n.s > 0 && n.s < 22) r.emit(4, 2, snap[H.PX] + (Math.random() - 0.5) * 2, n.floor + n.h - 0.3, snap[H.PZ] + (Math.random() - 0.5) * 2, 0, -0.6, 0, 0.3, 0.2, 0.6, 0.15, 0.4, 1.5, 2.5);
    }
    if (stage !== OPENING.COLLAPSE) return;
    if (t > 4.6 && t < 6.9 && every(0.2)) r.emit(4, 3, top[0], top[1], top[2], CAVE_OUT[0] * 0.5, -0.3, CAVE_OUT[1] * 0.5, 0.6, 0.3, 1.2, 0.3, 0.8, 1.5, 3);
    if (t > 6.2 && t < 7.1 && every(0.12)) r.emit(3, 3, top[0], top[1], top[2], CAVE_OUT[0] * 0.6, -1, CAVE_OUT[1] * 0.6, 1, 0.5, 2.5, 0.06, 0.2, 0.8, 1.4);
    if (crossed(DUST_AT)) {
      // A wall of dust across the whole mouth, not one puff: low and wide, rolling out and settling.
      const [, , , , , floor, w, h] = CAVE_LINE[0];
      for (let i = 0; i < 9; i++) {
        const across = (i / 8 - 0.5) * 2 * w, up = 0.35 + (h - 0.6) * ((i * 0.618) % 1) * 0.8;
        r.emit(4, 9, CAVE_MOUTH[0] + CAVE_OUT[1] * across, floor + up, CAVE_MOUTH[1] - CAVE_OUT[0] * across,
          CAVE_OUT[0] * 2.2, 0.15, CAVE_OUT[1] * 2.2, 1.1, 0.8, 4.5, 0.35, 1.2, 2.5, 5);
      }
      r.emit(3, 36, top[0], top[1], top[2], CAVE_OUT[0] * 1.5, 0.3, CAVE_OUT[1] * 1.5, 1.6, 1, 4.5, 0.08, 0.3, 0.8, 1.8);
    }
    // And it hangs there, all across the heap, for a good few seconds.
    if (t > DUST_AT && t < DUST_AT + 4.5 && every(0.2)) {
      const [, , , , , floor, w, h] = CAVE_LINE[0];
      for (let i = 0; i < 3; i++) {
        const across = (Math.random() * 2 - 1) * (w + 0.6), out = 0.6 + Math.random() * 1.6;
        r.emit(4, 3, CAVE_MOUTH[0] + CAVE_OUT[0] * out + CAVE_OUT[1] * across, floor + 0.3 + Math.random() * (h - 0.4), CAVE_MOUTH[1] + CAVE_OUT[1] * out - CAVE_OUT[0] * across,
          CAVE_OUT[0] * 0.35, 0.12, CAVE_OUT[1] * 0.35, 0.8, 0.1, 0.5, 0.8, 1.8, 3, 5);
      }
    }
  }

  // Her feelings over her head (src/ui/emotes.js), placed by the camera the frame was drawn with.
  feel(snap, cam) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME], cue = snap[H.OPENING_CUE];
    const e = !this.root.hidden && cam ? emoteAt(stage, t, cue ? CUE_IDS[cue - 1] : null, snap[H.OPENING_CUE_T]) : null;
    if (!e) { this.emotes.hide(); return; }
    // The one of her you're looking at (the pretty one is the second to last), the middle of her head: 0.19 m over the head
    // joint is her speech mark, the middle of the skull about 0.1.
    const pretty = prettyShown(stage, t);
    const co = CHARS_START + (snap[H.NCHARS] - (pretty ? 2 : 1)) * C_SIZE;
    const head = [snap[co + C_PROPS], snap[co + C_PROPS + 1] - 0.09, snap[co + C_PROPS + 2]];
    this.emotes.draw(cam, head, e.kind, e.age, e.dur, pretty ? 'pretty' : 'witch', this.root.classList.contains('bars') ? innerHeight * 0.105 : 0, snap[co + C.YAW]);
  }

  // ---- the camera -------------------------------------------------------------------------------------------------------
  // The story's camera, or null when it's yours. input's yaw and pitch become a small look around it while it lasts, and
  // where it was looking when it hands back.
  direct(snap, dt, input) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME];
    const P = [snap[H.PX], snap[H.PY], snap[H.PZ]];
    const h = this.her(snap);
    const shot = stage === OPENING.WAKE ? this.wakeShot(t, P, h)
      : stage === OPENING.NAME ? { eye: [P[0], P[1] + 1.62, P[2]], look: [h[0], h[1] + 1.12, h[2]], fov: framing(Math.hypot(h[0] - P[0], h[2] - P[2]), 1.35), free: 0.35, rate: 3 }
      : stage === OPENING.HERD && t < HERD_CONTROL ? this.herdShot(t, P, h)
      : stage === OPENING.COLLAPSE ? this.collapseShot(t, P, h) : null;
    if (!shot) {
      if (this.dir) {
        // Handing back: you're looking where it was.
        input.yaw = this.dir.yaw + this.dir.offYaw;
        input.pitch = clamp(this.dir.pitch + this.dir.offPitch, -1.2, 1.2);
        this.dir = null;
      }
      this.cam = null;
      return null;
    }
    const want = { yaw: yawTo(shot.eye, shot.look), pitch: pitchTo(shot.eye, shot.look) };
    let d = this.dir;
    if (!d) {
      // Taking over from wherever you were looking.
      d = this.dir = { yaw: input.yaw, pitch: input.pitch, fov: 64, offYaw: 0, offPitch: 0, inYaw: input.yaw, inPitch: input.pitch, cutKey: null };
      if (stage === OPENING.WAKE && t < 2) { d.yaw = want.yaw; d.pitch = want.pitch; }
    }
    if (shot.cut && d.cutKey !== shot.cut) { d.yaw = want.yaw; d.pitch = want.pitch; d.fov = shot.fov; }
    d.cutKey = shot.cut || null;
    const rate = shot.rate ?? 4;
    d.yaw += wrapAngle(want.yaw - d.yaw) * (1 - Math.exp(-rate * dt));
    d.pitch = damp(d.pitch, want.pitch, rate, dt);
    d.fov = damp(d.fov, shot.fov, shot.fovRate ?? 6, dt);
    // A little look of your own.
    const free = shot.free ?? 0;
    const dy = wrapAngle(input.yaw - d.inYaw), dp = input.pitch - d.inPitch;
    d.inYaw = input.yaw; d.inPitch = input.pitch;
    d.offYaw = clamp(d.offYaw + dy, -free, free); d.offPitch = clamp(d.offPitch + dp, -free * 0.6, free * 0.6);
    if (!free) { d.offYaw = damp(d.offYaw, 0, 6, dt); d.offPitch = damp(d.offPitch, 0, 6, dt); }
    d.inside = !!shot.inside;
    let yaw = d.yaw + d.offYaw + (shot.sway ? 0.018 * Math.sin(t * 0.83) + 0.01 * Math.sin(t * 1.9) : 0);
    let pitch = d.pitch + d.offPitch + (shot.sway ? 0.012 * Math.sin(t * 0.71 + 1) : 0);
    let roll = shot.roll || 0;
    if (shot.shake) {
      const k = shot.shake;
      yaw += k * (Math.sin(t * 41) * 0.6 + Math.sin(t * 67) * 0.4); pitch += k * (Math.sin(t * 53) * 0.6 + Math.sin(t * 29) * 0.4); roll += k * 0.8 * Math.sin(t * 37);
    }
    const cp = Math.cos(pitch);
    const fx = Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = Math.cos(yaw) * cp;
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const uxb = -Math.sin(yaw) * Math.sin(pitch), uyb = cp, uzb = -Math.cos(yaw) * Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    this.cam = { x: shot.eye[0], y: shot.eye[1], z: shot.eye[2], fx, fy, fz, ux: uxb * cr + rx * sr, uy: uyb * cr, uz: uzb * cr + rz * sr, fov: d.fov * DEG };
    return this.cam;
  }

  // Act I. Lying in the circle, three tries at opening your eyes; the flash, a scramble back; sitting up, then standing.
  wakeShot(t, P, h) {
    const toHer = yawTo(P, h);
    const scramble = smoothstep(SWAP_AT, SWAP_AT + 0.28, t), stand = smoothstep(16.2, 18.8, t);
    const eyeH = lerp(lerp(0.62, 0.46, scramble) + 0.4 * smoothstep(10.6, 13.6, t), 1.62, stand);
    const back = 0.5 * scramble * (1 - smoothstep(16.2, 19.2, t));
    const eye = [P[0] - Math.sin(toHer) * back, P[1] + eyeH, P[2] - Math.cos(toHer) * back];
    if (t < SWAP_AT) {
      // Each try starts low on the floor, lifts toward her, and sags as the lids close; the lens pushes in each time.
      const k = t < 4.55 ? 0 : t < 6.7 ? 1 : 2;
      const lift = [0.45 * bump(t, 3.0, 3.8, 3.95, 4.5), 0.75 * bump(t, 4.7, 5.6, 6.0, 6.6), 0.97 * smoothstep(6.9, 7.9, t)][k];
      const floor = [eye[0] + Math.sin(toHer) * 1.6, P[1] - 0.1, eye[2] + Math.cos(toHer) * 1.6];
      const aim = [h[0], h[1] + [1.0, 1.3, 1.22][k], h[2]];
      return { eye, look: mix3(floor, aim, lift), fov: [40, 24, 11.5][k], fovRate: 30, rate: 7, sway: true, inside: true };
    }
    // After the flash a long lens holds her knees up, through the scramble and her fright, lit violet from the portal
    // behind you, until the snap; the candles open it out and lift it to them; then as she comes to you, waist up, her
    // eyes in the top third, all the way in.
    const D = Math.hypot(h[0] - eye[0], h[2] - eye[2]);
    const knees = [h[0], h[1] + 1.12, h[2]], waist = [h[0], h[4] - 0.1, h[2]];
    const up = [h[0], h[1] + 3.0, h[2]];
    let look, fov;
    if (t < SNAP_AT) {
      look = knees; fov = framing(D, 1.65);
    } else if (t < 18.0) {
      look = mix3(knees, up, 0.75 * bump(t, CANDLES_AT - 0.2, 16.4, 17.2, 18.0));
      fov = lerp(framing(D, 1.65), 46, smoothstep(SNAP_AT, CANDLES_AT + 0.6, t));
    } else {
      const k = smoothstep(18.0, 19.8, t);
      look = mix3(knees, waist, k); fov = lerp(46, framing(D, 1.05, 18, 50), k);
    }
    return { eye, look, fov, fovRate: t < SWAP_AT + 0.6 ? 14 : 3, rate: t < SWAP_AT + 0.6 ? 12 : 3.5, free: t < 18.9 ? 0.2 : 0.3, inside: true, shake: t < SWAP_AT + 0.35 ? 0.012 * (1 - scramble) : 0 };
  }

  herdShot(t, P, h) {
    const eye = [P[0], P[1] + 1.62, P[2]];
    let look = [h[0], h[4] - 0.1, h[2]];
    const tunnel = chamberPoint(0, 0);
    look = mix3(look, [tunnel[0], P[1] + 1.3, tunnel[1]], 0.4 * bump(t, 4.4, 5.2, 6.0, 6.7));
    return { eye, look, fov: t > 9.2 ? 64 : framing(Math.hypot(h[0] - P[0], h[2] - P[2]), 1.25, 30, 58), fovRate: 3, rate: 3.5, free: 0.44, inside: true };
  }

  // Act II, out on the ledge.
  collapseShot(t, P, h) {
    // (You drop to a crouch when it comes down, and get up as she does: you meet her eye, not the top of her head.)
    const eye = [P[0], P[1] + collapseEye(t), P[2]];
    const D = Math.hypot(h[0] - P[0], h[2] - P[2]);
    // Her eyes in the top third, from waist up.
    const face = [h[0], h[4] - 0.1, h[2]], close = framing(D, 1.0, 24, 60);
    const mouth = [CAVE_MOUTH[0], CAVE_LINE[0][5] + 1.5, CAVE_MOUTH[1]];
    if (t >= 4.8 && t < DUST_AT) {
      // The one shot that isn't yours: down the tunnel behind her as she runs for the light.
      const n = caveNearest(h[0], h[2]);
      const at = CAVE_LINE[Math.min(CAVE_LINE.length - 1, n.i + 6)];
      const cam = [at[0], at[5] + 1.45, at[1]];
      const ahead = CAVE_LINE[Math.max(0, n.i - 8)];
      return { eye: cam, look: mix3([h[0], h[1] + 1.1, h[2]], [ahead[0], ahead[5] + 1.2, ahead[1]], 0.5), fov: 52, cut: 'tunnel', rate: 8, inside: true };
    }
    let look, fov = 64, rate = 3, free = 0.2, shake = 0, cut;
    if (t < 3.0) {
      // The valley, the town small and far below.
      look = valley(P); fov = 30;
      rate = 1.3;
    } else if (t < DUST_AT) {
      look = mouth; rate = 2.4;
      shake = t > 4.6 && t < 5.6 ? 0.012 * (1 - (t - 4.6)) : 0;
    } else if (t < 9.0) {
      // Out of the dust and down on one knee: on her, low.
      look = mix3(mouth, [h[0], h[4] - 0.25, h[2]], smoothstep(DUST_AT, DUST_AT + 0.6, t)); rate = 6; cut = 'pov';
      fov = lerp(64, framing(D, 1.5, 30, 64), smoothstep(DUST_AT - 0.1, DUST_AT + 0.45, t));
      shake = t < 8.2 ? 0.02 * (1 - (t - DUST_AT) / 1.2) : 0;
    } else if (t < 12.0) {
      // Getting up: room over her head, so it never rises into the bar.
      look = [h[0], h[4] - 0.08, h[2]]; fov = framing(D, 1.6, 28, 62); rate = 5;
    } else if (t < 14.8) {
      // The shout: wide enough for her arms flung up.
      look = face; fov = framing(D, 1.45, 28, 60); rate = 4;
    } else if (t < 21.2) {
      look = face; fov = close; rate = 4;
    } else if (t < 23.6) {
      // The double take: her, the rubble, her.
      look = t < 21.75 || t > 22.45 ? face : mouth; rate = 9; fov = close;
    } else if (t > 34.6 && t < 36.4) {
      // "Bellmourn." Down the road she's pointing along.
      look = valley(P); rate = 2.2; fov = 26;
    } else {
      look = face; fov = t > 41 ? 64 : close; rate = 3;
    }
    return { eye, look, fov, fovRate: t > 9 && t < 12 ? 3 : 4, rate, free, shake, cut };
  }

  save(snap) {
    const co = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    return {
      openingRevision: OPENING_REVISION,
      opening: this.name && snap[H.OPENING] === OPENING.NAME ? OPENING.LEAVE : snap[H.OPENING],
      guide: [snap[co + C.X], snap[co + C.Z], snap[co + C.YAW], snap[H.OPENING_NEXT]],
      name: this.name,
    };
  }
}
