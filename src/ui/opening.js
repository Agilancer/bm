// The opening on screen: the camera while the story has it, your eyes opening, the bars, her words (in a bubble over her
// head, src/ui/speech.js, and in the chat log), your name, the cards, holding to skip, and its sound
// (src/ui/opening-sound.js). The sim keeps the clock and where everyone is (src/sim/opening.js).
import { CUES, CUE_IDS, emoteAt, lineAt, partAt } from '../core/opening-script.js';
import { C, CHARS_START, C_PROPS, C_SIZE, H } from '../core/layout.js';
import { clamp, damp, lerp, smoothstep, wrapAngle } from '../core/math.js';
import {
  BURST_CANDLE, CANDLES, CANDLES_AT, CAST_AT, CAVE, CAVE_LINE, CAVE_MOUTH, CAVE_OUT, COLLAPSE_END, DAZZLE, DUST_AT, ESCORT_TO, FALL, GLAMOUR_AT, HEARTH,
  HERD, HERD_CONTROL, OPENING, OPENING_REVISION, REVEAL_AT, SNAP_AT, SPARK_AT, SWAP_AT, caveNearest, chamberPoint, chamberShape, collapseEye,
  prettyShown, storyHolds, wakeEyeBack, wakeEyeH,
} from '../core/opening.js';
import { OpeningSound } from './opening-sound.js';
import { SpeechBubble } from './speech.js';
import { Emotes } from './emotes.js';
import { terrainHeight } from '../core/terrain.js';

const SKIP_HOLD = 1.0;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
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

// How far your eyes are open in the first moments: three tries; a little wider as she talks you round; and the flash,
// which makes you screw them up for a moment before they fly open.
function lidsAt(t) {
  if (t >= SWAP_AT) return lerp(0.78, 1, clamp((t - SWAP_AT) / 0.12, 0, 1)) - 0.42 * bump(t, SWAP_AT + 0.05, SWAP_AT + 0.18, SWAP_AT + 0.35, SWAP_AT + 0.9);
  const flutter = (k) => 1 + 0.06 * Math.sin(t * 9.0 + k) * Math.sin(t * 3.1);
  return 0.15 * bump(t, 3.0, 3.5, 3.9, 4.4) + 0.4 * bump(t, 4.7, 5.3, 6.0, 6.5) * flutter(1)
    + (0.7 + 0.08 * smoothstep(GLAMOUR_AT, SWAP_AT - 3, t)) * smoothstep(6.9, GLAMOUR_AT, t) * flutter(2);
}
// After the flash, your sight swims: a hard blur that clears over DAZZLE seconds, wavering as it goes.
const dazzleAt = (t) => (t < SWAP_AT ? 0 : 1 - smoothstep(SWAP_AT + 0.1, SWAP_AT + DAZZLE, t));

export class OpeningHUD {
  constructor(onName, opts = {}) {
    this.name = '';
    this.onSkip = opts.onSkip;
    this.fx = opts.renderer;
    this.sound = opts.audio ? new OpeningSound(opts.audio) : null;
    this.log = opts.log || null;      // the chat log (src/ui/chatlog.js): each of her lines goes into it as she says it
    const el = (tag, id, html = '') => { const e = document.createElement(tag); if (id) e.id = id; e.innerHTML = html; return e; };
    this.root = el('div', 'opening');
    this.root.setAttribute('aria-live', 'polite');
    this.root.innerHTML = `
      <div class="op-eyes"><span></span><span></span><i></i></div>
      <div class="op-flash"></div>
      <div class="op-bar op-top"></div><div class="op-bar op-bottom"></div>
      <div class="op-sub"><b></b><p></p></div>
      <div class="op-title"><h1></h1><p>Tessariel · Beacon of the Infinite</p><p class="op-class">Wizard</p></div>
      <div class="op-her"><h2>Lisandra</h2><p>Keeper of the Door</p></div>
      <div class="op-cast"></div>
      <div class="op-quest"><small></small><span></span></div>
      <div class="op-track"></div>
      <div class="op-skip"><span></span><i></i></div>`;
    document.body.append(this.root);
    // Her feelings over her head: in the world, so under your lids and the bars.
    this.emotes = new Emotes(this.root, this.root.firstElementChild);
    // Her words: over everything, your lids and the bars too, so a line's read even with your eyes shut.
    this.bubble = new SpeechBubble(this.root);
    const q = (s) => this.root.querySelector(s);
    this.eyes = q('.op-eyes'); this.flash = q('.op-flash'); this.sub = q('.op-sub'); this.who = q('.op-sub b'); this.line = q('.op-sub p');
    this.title = q('.op-title'); this.titleName = q('.op-title h1'); this.herCard = q('.op-her'); this.castHint = q('.op-cast'); this.quest = q('.op-quest'); this.track = q('.op-track'); this.skipHint = q('.op-skip');
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
    this.bubble?.hide(); this.said = null; this.speech = null;
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
    // The thumbs go only while you're held still: walking out of the cave is under the bars too, and needs them.
    document.body.classList.toggle('op-held', storyHolds(stage, t));
    // The first moments of the walk: no crosshair sitting on her while you get your bearings.
    document.body.classList.toggle('op-handoff', stage === OPENING.ESCORT && t < 1.8);
    // Your eyes.
    const lids = stage === OPENING.WAKE ? lidsAt(t) : 1;
    const dazzle = stage === OPENING.WAKE ? dazzleAt(t) : 0;
    const haze = stage !== OPENING.WAKE ? 0 : t < SWAP_AT ? (t < 4.6 ? 9 : t < 6.7 ? 6 : 3.5) : dazzle * (16 + 2.5 * Math.sin(t * 6.3) * Math.sin(t * 2.2));
    const vignette = stage !== OPENING.WAKE ? 0 : t < SWAP_AT ? 0.9 : lerp(0.9, 0.22, smoothstep(SWAP_AT, SWAP_AT + 2, t));
    this.eyes.style.setProperty('--lid', `${((1 - lids) * 51).toFixed(2)}vh`);
    this.eyes.style.setProperty('--haze', `${haze.toFixed(2)}px`);
    this.eyes.style.setProperty('--vig', vignette.toFixed(3));
    this.eyes.hidden = stage !== OPENING.WAKE || t > CAVE.drop + 1.4;
    // The flash when the glamour breaks; and the dark, if you're knocked flat on the road.
    const fell = snap[H.OPENING_FELL];
    // (And a white glare left on your eyes, fading with the blur.)
    const white = stage === OPENING.WAKE ? (t < SWAP_AT ? smoothstep(SWAP_AT - 0.06, SWAP_AT, t) : Math.max(1 - smoothstep(SWAP_AT, SWAP_AT + 0.6, t), 0.32 * dazzle * dazzle)) : 0;
    const black = fell < 1.8 ? 1 - smoothstep(0.5, 1.8, fell) : 0;
    this.flash.style.opacity = Math.max(white, black).toFixed(3);
    this.flash.classList.toggle('dark', black > white);
    // The name.
    this.namePanel.hidden = stage !== OPENING.NAME || !!this.name;
    if (!this.namePanel.hidden && document.activeElement !== this.field && !this.touched) this.field.focus({ preventScroll: true });
    // The title card, once you've said it.
    const card = stage === OPENING.HERD ? bump(t, 0.8, 1.4, HERD.point - 0.6, HERD.point + 0.2) : 0;
    this.title.style.opacity = card.toFixed(3);
    if (card > 0) this.titleName.textContent = (this.name || 'Tessariel').toUpperCase();
    // Hers, as she bows and gives it.
    this.herCard.style.opacity = (stage === OPENING.WAKE ? bump(t, CAVE.named - 0.2, CAVE.named + 0.5, CAVE.named + 4.2, CAVE.named + 5.2) : 0).toFixed(3);
    // Beat 8: cast. (On a phone the cast button comes back for it: the story keeps the thumbs away otherwise.)
    const asked = stage === OPENING.WAKE && t > CAST_AT + 0.3 && t < SPARK_AT;
    document.body.classList.toggle('op-cast', asked);
    this.castHint.style.opacity = asked ? '1' : '0';
    if (asked && !this.castHint.textContent) this.castHint.innerHTML = this.touched ? 'Tap <kbd>CAST</kbd>' : 'Press <kbd>F</kbd> to cast';
    // The quest: down to Bellmourn with her; when the dead come up on the road (you reach the place, src/sim/opening.js),
    // putting them all down; then on down with her again.
    const fight = stage === OPENING.ESCORT && snap[H.OPENING_FIGHT] > 0;
    if (stage === OPENING.ESCORT && fight !== !!this.fightOn) { this.fightOn = fight; this.questT = t; }
    if (stage !== OPENING.ESCORT) { this.fightOn = false; this.questT = undefined; }
    const since = this.questT !== undefined ? t - this.questT : -1;
    const q = stage === OPENING.ESCORT ? Math.max(bump(t, 0.2, 0.8, 5.0, 5.8), since >= 0 ? bump(since, 0, 0.6, 4.8, 5.6) : 0) : stage === OPENING.ARRIVED ? bump(t, 0.1, 0.6, 4.6, 5.4) : 0;
    const goal = fight ? 'Kill the zombies and the necromancers' : 'Go to Bellmourn with Lisandra';
    this.quest.style.opacity = q.toFixed(3);
    if (q > 0) {
      this.quest.querySelector('small').textContent = stage === OPENING.ARRIVED ? 'Quest complete' : fight ? 'New quest' : 'Quest';
      this.quest.querySelector('span').textContent = goal;
    }
    this.track.textContent = stage === OPENING.ESCORT && (t > 5 || fight) ? goal : '';
    // Her words.
    this.words(snap, stage, t);
    // Holding to skip.
    const canSkip = stage === OPENING.WAKE || stage === OPENING.COLLAPSE || stage === OPENING.LEAVE || (stage === OPENING.HERD && t < HERD_CONTROL);
    const touchOK = stage !== OPENING.LEAVE;
    const held = canSkip && this.skipped !== stage && (this.holding.key || (touchOK && this.holding.touch > 0));
    this.holdT = held ? this.holdT + dt : 0;
    if (this.holdT >= SKIP_HOLD) { this.holdT = 0; this.skipped = stage; this.onSkip?.(); }
    // (On a phone, a thumb held while you walk out is walking: only Space skips that, so the hint isn't offered.)
    this.skipHint.hidden = !canSkip || this.skipped === stage || (stage === OPENING.WAKE && t < 2) || (this.touched && !touchOK);
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

  // Her words, up now: in a bubble over her head (placed in feel, once the frame's camera is known), and into the chat log
  // as each is said in full. A caption ([a scream]) isn't hers, and stays a subtitle. (Her recordings, in assets/voice,
  // aren't played.)
  words(snap, stage, t) {
    let l = lineAt(stage, t), cueLine = false;
    const cue = snap[H.OPENING_CUE], cueT = snap[H.OPENING_CUE_T];
    if (!l && cue) {
      const c = CUES[CUE_IDS[cue - 1]];
      if (c && cueT < c.dur) { l = c; cueLine = true; }
    }
    if (!l) { this.sub.hidden = true; this.shown = null; this.bubble.hide(); this.speech = null; return; }
    const named = stage > OPENING.WAKE || l.named;
    const age = cueLine ? cueT : t - l.at;
    const text = partAt(l, age).replace('{name}', this.name || 'Tessariel');
    let html;
    if (l.words) {
      const w = text.split(' ');
      const n = t < l.from ? 0 : t >= l.land ? w.length : 1 + Math.floor((t - l.from) / (l.land - l.from) * (w.length - 1));
      html = w.map((x, i) => (i < n ? esc(x) : `<span class="op-ghost">${esc(x)}</span>`)).join(' ');
    } else html = esc(text);
    if (l.caption) {
      this.bubble.hide(); this.speech = null;
      if (html !== this.shown) { this.shown = html; this.sub.hidden = false; this.who.textContent = ''; this.line.innerHTML = html; this.sub.className = 'op-sub caption'; }
      return;
    }
    this.sub.hidden = true; this.shown = null;
    const who = named ? 'Lisandra' : 'The Witch', soft = !!(l.mutter || l.vo || l.off);
    const id = cueLine ? `c${cue}` : `${stage}:${l.at}`;
    // From her mouth; or (vo) in your head before your eyes are open, or (off) from out of sight: no tail to her for those.
    this.bubble.set(id, html, who, { big: !!l.big, soft, inside: !!l.vo });
    this.speech = { off: !!(l.vo || l.off) };
    // Into the chat log, each part once, as soon as it's all there (a line revealed a word at a time, when the last lands).
    // (The same call again, later, is a new line: its clock starts over.)
    const said = this.said;
    if (!said || said.id !== id || said.text !== text || age + 0.25 < said.age) this.said = { id, text, age, logged: false };
    this.said.age = age;
    if (!this.said.logged && (!l.words || t >= l.land)) {
      this.said.logged = true;
      this.log?.line('her', who, text, { story: true, soft });
    }
  }

  // Beat 8: your hand in view, with the staff in it (src/main.js shows it under the bars).
  handsUp(snap) {
    const t = snap[H.OPENING_TIME];
    return snap[H.OPENING] === OPENING.WAKE && t > CAVE.hands + 0.2 && t < SPARK_AT + 1.1;
  }

  // Where your right hand is, by the camera: low and to the right of your eyes.
  hand(c = this.cam) {
    if (!c) return null;
    const rx = c.fy * c.uz - c.fz * c.uy, ry = c.fz * c.ux - c.fx * c.uz, rz = c.fx * c.uy - c.fy * c.ux;
    return [c.x + c.fx * 0.5 + rx * 0.2 - c.ux * 0.22, c.y + c.fy * 0.5 + ry * 0.2 - c.uy * 0.22, c.z + c.fz * 0.5 + rz * 0.2 - c.uz * 0.22];
  }

  effects(snap, stage, t, dt, her, crossed) {
    const r = this.fx;
    if (!r?.emit) return;
    const top = [CAVE_MOUTH[0] - CAVE_OUT[0] * 0.3, CAVE_LINE[0][5] + CAVE_LINE[0][7] - 0.2, CAVE_MOUTH[1] - CAVE_OUT[1] * 0.3];
    const every = (gap) => Math.floor(t / gap) !== Math.floor(this.lastT / gap) && this.lastStage === stage;
    if (stage === OPENING.WAKE) {
      const burst = CANDLES[BURST_CANDLE];
      // Embers crawling over your knuckles while she stares at your hand; then the spark leaps to the candle, and it bursts.
      const hand = this.hand();
      if (hand && t > CAVE.hands && t < SPARK_AT && every(0.09)) r.emit(6, 2, hand[0], hand[1], hand[2], 0, 0.6, 0, 0.6, 0.1, 0.4, 0.004, 0.009, 0.4, 0.9);
      if (hand && crossed(SPARK_AT)) {
        const dx = burst.x - hand[0], dy = burst.y + burst.tall - hand[1], dz = burst.z - hand[2], l = Math.hypot(dx, dy, dz);
        r.emit(2, 46, hand[0], hand[1], hand[2], dx / l, dy / l, dz / l, 0.08, 7, 11, 0.004, 0.009, l / 11, l / 7);
        r.emit(7, 8, hand[0], hand[1], hand[2], dx / l, dy / l, dz / l, 0.15, 2, 4, 0.02, 0.04, 0.12, 0.25);
      }
      if (crossed(SPARK_AT + 0.25)) {
        const y = burst.y + burst.tall + 0.05;
        r.emit(7, 40, burst.x, y, burst.z, 0, 1, 0, 0.9, 1.2, 3.2, 0.04, 0.12, 0.35, 0.8);
        r.emit(6, 30, burst.x, y, burst.z, 0, 1, 0, 1.4, 1, 3, 0.005, 0.012, 0.6, 1.4);
        r.emit(4, 6, burst.x, y + 0.3, burst.z, 0, 1, 0, 0.5, 0.2, 0.6, 0.15, 0.4, 1.2, 2.2);
      }
      // Her hearth, once it's lit: a spark now and then, and a thread of smoke.
      if (t > CANDLES_AT + 0.6 && every(0.5)) this.hearth(r);
    } else if (stage <= OPENING.LEAVE && every(0.5)) this.hearth(r);
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

  // The fire in her hearth: sparks up off it, and a little smoke.
  hearth(r) {
    const y = chamberShape(7.8)[2] + 0.35;
    r.emit(6, 2, HEARTH[0] + (Math.random() - 0.5) * 0.3, y, HEARTH[1] + (Math.random() - 0.5) * 0.3, 0, 1, 0, 0.5, 0.4, 1.2, 0.004, 0.01, 0.5, 1.2);
    if (Math.random() < 0.5) r.emit(4, 1, HEARTH[0], y + 0.5, HEARTH[1], 0, 1, 0, 0.2, 0.2, 0.5, 0.12, 0.3, 1.6, 2.6);
  }

  // Her words and her feelings over her head (src/ui/speech.js, src/ui/emotes.js), placed by the camera the frame was drawn with.
  feel(snap, cam) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME], cue = snap[H.OPENING_CUE];
    // The one of her you're looking at (the pretty one is the second to last), the middle of her head: 0.19 m over the head
    // joint is her speech mark, the middle of the skull about 0.1.
    const pretty = prettyShown(stage, t);
    const co = CHARS_START + (snap[H.NCHARS] - (pretty ? 2 : 1)) * C_SIZE;
    const head = [snap[co + C_PROPS], snap[co + C_PROPS + 1] - 0.09, snap[co + C_PROPS + 2]];
    const bar = this.root.classList.contains('bars') ? innerHeight * 0.105 : 0;
    if (this.speech && !this.root.hidden) { const log = this.log?.box(); this.bubble.place(cam, this.speech.off ? null : head, bar, log ? [log] : []); }
    const e = !this.root.hidden && cam ? emoteAt(stage, t, cue ? CUE_IDS[cue - 1] : null, snap[H.OPENING_CUE_T]) : null;
    if (!e) { this.emotes.hide(); return; }
    this.emotes.draw(cam, head, e.kind, e.age, e.dur, pretty ? 'pretty' : 'witch', bar, snap[co + C.YAW]);
  }

  // ---- the camera -------------------------------------------------------------------------------------------------------
  // The story's camera, or null when it's yours. input's yaw and pitch become a small look around it while it lasts, and
  // where it was looking when it hands back.
  direct(snap, dt, input) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME];
    const P = [snap[H.PX], snap[H.PY], snap[H.PZ]];
    const h = this.her(snap);
    const shot = stage === OPENING.WAKE ? this.wakeShot(t, P, h)
      : stage === OPENING.NAME ? { eye: [P[0], P[1] + 1.62, P[2]], look: [h[0], h[1] + 1.12, h[2]], fov: framing(Math.hypot(h[0] - P[0], h[2] - P[2]), 1.35), free: 0, rate: 3 }
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
    d.free = damp(d.free ?? 0, shot.free ?? 0, 2.5, dt);
    const free = d.free;
    const dy = wrapAngle(input.yaw - d.inYaw), dp = input.pitch - d.inPitch;
    d.inYaw = input.yaw; d.inPitch = input.pitch;
    d.offYaw = clamp(d.offYaw + dy, -free, free); d.offPitch = clamp(d.offPitch + dp, -free * 0.6, free * 0.6);
    if (!shot.free) { d.offYaw = damp(d.offYaw, 0, 6, dt); d.offPitch = damp(d.offPitch, 0, 6, dt); }
    if (shot.home) { d.offYaw = damp(d.offYaw, 0, 1.2, dt); d.offPitch = damp(d.offPitch, 0, 1.2, dt); }
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

  // Act I. Lying in the circle, three tries at opening your eyes, and her coming to you; the flash, a scramble back;
  // sitting up as she comes to herself; then on your feet from the snap, on her wherever she goes in her cave.
  wakeShot(t, P, h) {
    const C = CAVE;
    const toHer = yawTo(P, h);
    const scramble = smoothstep(SWAP_AT, SWAP_AT + 0.28, t), back = wakeEyeBack(t);
    const eye = [P[0] - Math.sin(toHer) * back, P[1] + wakeEyeH(t), P[2] - Math.cos(toHer) * back];
    const D = Math.hypot(h[0] - eye[0], h[2] - eye[2]);
    if (t < SWAP_AT) {
      // Each try starts low on the floor, lifts toward her, and sags as the lids close; the lens pushes in each time. Then
      // it keeps her framed as she comes to you, easing back to take in more of her as she talks you round.
      const k = t < 4.55 ? 0 : t < 6.7 ? 1 : 2;
      const lift = [0.45 * bump(t, 3.0, 3.8, 3.95, 4.5), 0.75 * bump(t, 4.7, 5.6, 6.0, 6.6), 0.97 * smoothstep(6.9, 7.9, t)][k];
      const floor = [eye[0] + Math.sin(toHer) * 1.6, P[1] - 0.1, eye[2] + Math.cos(toHer) * 1.6];
      const aim = [h[0], h[1] + [1.0, 1.3, 1.22][k], h[2]];
      const ease = k === 2 ? bump(t, GLAMOUR_AT + 0.6, GLAMOUR_AT + 3.5, SWAP_AT - 4.0, SWAP_AT - 1.6) : 0;
      const fov = k === 2 ? framing(D, lerp(1.4, 1.95, ease), 11.5, 56) : [40, 24][k];
      return { eye, look: mix3(floor, aim, lift), fov, fovRate: k === 2 ? 2.5 : 30, rate: 7, sway: true, inside: true };
    }
    const knees = [h[0], h[1] + 1.12, h[2]], face = [h[0], h[4] - 0.1, h[2]], up = [h[0], h[1] + 3.0, h[2]];
    // How much of her: close in, waist up; further off, more of her, and at her hearth, her and the room round her.
    const her = (span) => framing(D, span ?? clamp(0.33 * D + 0.72, 1.05, 4.4), 18, 62);
    let look, fov, rate = 3.5;
    if (t < C.drop) {
      // A long lens holds her knees up, through the scramble and her fright.
      look = knees; fov = framing(D, 1.65); rate = t < SWAP_AT + 0.6 ? 12 : 3.5;
    } else if (t < C.backOff) {
      // "Not at the girl. At me.": in on her face.
      look = mix3(knees, face, smoothstep(C.drop, C.drop + 1.2, t)); fov = her(1.15); rate = 4;
    } else if (t < SNAP_AT) {
      look = mix3(face, knees, smoothstep(C.backOff, C.aim, t)); fov = her(lerp(1.15, 1.6, smoothstep(C.backOff, C.aim, t)));
    } else if (t < C.comeBack + 1.6) {
      // The candles open it out and lift it to them.
      look = mix3(knees, up, 0.75 * bump(t, CANDLES_AT - 0.2, CANDLES_AT + 0.8, C.comeBack, C.comeBack + 1.6));
      fov = lerp(framing(D, 1.65), 50, smoothstep(SNAP_AT, CANDLES_AT + 0.6, t) * (1 - smoothstep(C.comeBack, C.comeBack + 1.6, t) * 0.4));
    } else if (t > C.hands && t < SPARK_AT + 0.35) {
      // Down at your hand, the staff in it; and back up to her as the spark goes.
      const dn = [eye[0] + Math.sin(toHer) * 0.55, eye[1] - 1.05, eye[2] + Math.cos(toHer) * 0.55];
      look = dn; fov = 58; rate = 3;
    } else {
      look = face; fov = her(); rate = t < SPARK_AT + 1.2 ? 6 : 3.5;
      // At her hearth the lens eases wider still, to the fire and the room it lights; on her name for you, it leans in.
      fov *= 1 + 0.18 * bump(t, C.toHearth + 2, C.toHearth + 6, C.rose - 1, C.ledger);
      fov *= 1 - 0.14 * bump(t, REVEAL_AT - 0.4, REVEAL_AT + 0.3, REVEAL_AT + 2.2, REVEAL_AT + 3.4);
    }
    const shake = t < SWAP_AT + 0.35 ? 0.012 * (1 - scramble) : 0;
    // (The view is hers until she sends you out: no look of your own.)
    return { eye, look, fov, fovRate: t < SWAP_AT + 0.6 ? 14 : 3, rate, free: 0, inside: true, shake, sway: t > C.comeBack };
  }

  herdShot(t, P, h) {
    const eye = [P[0], P[1] + 1.62, P[2]];
    let look = [h[0], h[4] - 0.1, h[2]];
    const tunnel = chamberPoint(0, 0);
    look = mix3(look, [tunnel[0], P[1] + 1.3, tunnel[1]], 0.4 * bump(t, HERD.point + 0.2, HERD.point + 1.0, HERD.go - 0.6, HERD.go + 0.2));
    return { eye, look, fov: t > HERD_CONTROL - 1.4 ? 64 : framing(Math.hypot(h[0] - P[0], h[2] - P[2]), 1.25, 30, 58), fovRate: 3, rate: 3.5, free: 0, inside: true };
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
    } else if (t < FALL.catch - 0.5) {
      look = face; fov = close; rate = 4;
    } else if (t < FALL.catch + 0.9) {
      // The double take: her, the rubble, her.
      look = t < FALL.catch - 0.1 || t > FALL.catch + 0.5 ? face : mouth; rate = 9; fov = close;
    } else if (t > FALL.coming + 0.8 && t < FALL.coming + 3.0) {
      // "So I'm coming to Bellmourn with you." Out over the valley, to the town.
      look = valley(P); rate = 2.2; fov = 26;
    } else {
      look = face; fov = t > COLLAPSE_END - 0.8 ? 64 : close; rate = 3;
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
