// The beacon stone's fifteen seconds (the stone itself: src/items/beacon.js). Used by H, by a right click or double click on
// it in the pack, or by auto-play (src/ui/autobrain.js beaconJob): blue light gathers at the feet of you and of everyone in
// your party, climbs and closes in, and at CHANNEL seconds has every one of you whole. Then the sim sets you all down by
// Bellmourn's seal (command 28, src/sim/dungeon.js home), the light lets go of you there, and the stone is dark for
// COOLDOWN seconds of play (counted in the pack, so a save keeps it).
//
// Standing still is the price: walking off, a jump, a dodge, the staff or a spell lets it go dark again, for nothing. A blow
// doesn't, unless it throws you. While a menu is up (the pack, the paused game) it waits, and starts again where it was.
import { CHARS_START, C_HERO, C_SIZE, H, INPUT } from '../core/layout.js';
import { OPENING } from '../core/opening.js';
import { SEALS } from '../core/sites.js';
import { BEACON, CHANNEL, COOLDOWN, waitText } from '../items/beacon.js';

// Where it sets you down: 5.5 m off Bellmourn's seal toward the town, as a seal itself does (src/ui/lands.js go), facing the
// town; your party round behind you, toward the seal.
const SEAL = SEALS.find((s) => s.key === 'bellmourn');
const toTown = Math.atan2(-SEAL.z, -SEAL.x);
export const HOME = { x: SEAL.x + Math.cos(toTown) * 5.5, z: SEAL.z + Math.sin(toTown) * 5.5, yaw: Math.atan2(-SEAL.x, -SEAL.z) };

const BREAK = 0.8;        // metres moved off where you stood that let it go
const SETTLE = 0.35;      // seconds after a menu shuts in which a press (the click that takes the pointer back) doesn't count
const LET_GO = 1.4;       // seconds the light takes to let go of you at the seal
const PRESSES = [INPUT.ATTACK, INPUT.WIDE, INPUT.JUMP, INPUT.DODGE, INPUT.CAST_N];

export class Beacon {
  // o: { pack, shared, input, hud, renderer, audio, cmd(code, a, b, c), party() (src/ui/party.js), firstHero(), gameState(),
  //      testing() (in the Test Dungeon), saved() }
  constructor(o) {
    this.o = o;
    this.on = null;            // { t, x, z, presses, settle } while it's being used
    this.landed = 0;           // seconds of the light letting go, at the seal
    this.arrivedAt = -1e9;     // (performance.now() when it set you down: auto-play's sense of a jump, src/ui/autobrain.js)
    BEACON.left = () => this.o.pack.beaconCd;
    this.el = document.createElement('div');
    this.el.id = 'beaconCast';
    this.el.innerHTML = '<div class="bc-name">Beacon Stone</div><div class="bc-bar"><i></i></div><div class="bc-left"></div>';
    document.body.appendChild(this.el);
    this.fill = this.el.querySelector('i');
    this.leftEl = this.el.querySelector('.bc-left');
  }

  get left() { return this.o.pack.beaconCd; }
  get busy() { return !!this.on; }
  // Whether it would start now: the stone carried, lit, and nothing in the way.
  ready(snap) { return !this.on && !this.why(snap); }

  // Why it can't be used now, or '' if it can.
  why(snap) {
    const { pack } = this.o;
    if (!pack.beacon()) return 'You have no beacon stone.';
    if (this.left > 0) return `The beacon stone is dark: ${waitText(this.left)} more.`;
    if (this.o.testing?.()) return 'Not in the Test Dungeon: it has its own way out.';
    if (!snap) return 'Not yet.';
    if (this.o.gameState?.() === 2) return 'Not while you lie fallen.';
    const op = snap[H.OPENING];
    if (op > 0 && op < OPENING.ARRIVED) return 'Not yet: Lisandra has still to bring you down to the town.';
    return '';
  }

  // H, the pack, or auto-play: starts it, or with it going, lets it go. What to say of it, for the pack's line.
  use(snap = this.o.snap?.()) {
    if (this.on) { this.stop('You let the beacon stone go quiet.'); return 'You let the beacon stone go quiet.'; }
    const no = this.why(snap);
    if (no) { this.o.hud.tip(no, 2.5); return no; }
    this.on = { t: 0, x: snap[H.PX], z: snap[H.PZ], presses: null, settle: SETTLE };
    this.o.audio?.play('iceFreeze', null, 0, 0, 0.5, 0.7, false);
    const say = 'The beacon stone wakes. Stand still: fifteen seconds, and you and your party are home.';
    this.o.hud.tip(say, 3.5);
    return say;
  }

  stop(why) {
    if (!this.on) return;
    this.on = null;
    this.el.classList.remove('on');
    if (why) this.o.hud.tip(why, 2.5);
  }

  // Each frame, before the frame's drawn.
  frame(dt, snap) {
    const { pack, shared, input } = this.o;
    const paused = !!shared.input[INPUT.PAUSE] || !input.enabled;
    if (!paused && pack.beaconCd > 0) pack.beaconCd = Math.max(0, pack.beaconCd - dt);
    // (Owed one, from a save whose pack had no room for it: in as soon as there's room.)
    if (pack.owesBeacon && (this.oweT = (this.oweT || 0) - dt) <= 0) { this.oweT = 2; if (pack.giveBeacon()) this.o.hud.tip('A beacon stone is in your pack now: H takes you and your party home to Bellmourn.', 5); }
    // (Once the sim has you there: a frame or two after it's asked.)
    if (this.landed > 0 && snap && !paused && Math.hypot(snap[H.PX] - HOME.x, snap[H.PZ] - HOME.z) < 15) { this.landed -= dt; this.light(snap, Math.max(0, this.landed / LET_GO), dt, true); }
    else if (this.landed > 0 && performance.now() - this.arrivedAt > 3000) this.landed = 0;
    const on = this.on;
    if (!on || !snap) { this.el.classList.remove('on'); return; }
    if (paused) { on.presses = null; on.settle = SETTLE; return; }
    // (What's been pressed so far, taken again for a moment after a menu: the click that takes the pointer back isn't a cast.)
    const presses = PRESSES.map((k) => shared.input[k]);
    if (!on.presses || (on.settle -= dt) > 0) on.presses = presses;
    if (this.o.gameState?.() === 2) { this.stop(''); return; }
    if (Math.hypot(snap[H.PX] - on.x, snap[H.PZ] - on.z) > BREAK) { this.stop('You moved: the beacon stone goes quiet.'); return; }
    if (presses.some((v, i) => v !== on.presses[i]) || shared.input[INPUT.CAST] > 0 || shared.input[INPUT.BLOCK] > 0) { this.stop('The beacon stone goes quiet.'); return; }
    on.t += dt;
    const e = Math.min(1, on.t / CHANNEL);
    this.light(snap, e, dt, false);
    this.el.classList.add('on');
    this.fill.style.transform = `scaleX(${e.toFixed(3)})`;
    this.leftEl.textContent = `${Math.max(0, Math.ceil(CHANNEL - on.t))} s`;
    if (on.t >= CHANNEL) this.home();
  }

  // Everyone set down at the seal, and the stone dark.
  home() {
    this.on = null;
    this.el.classList.remove('on');
    this.o.cmd(28, HOME.yaw, HOME.x, HOME.z);
    this.o.pack.beaconCd = COOLDOWN;
    this.landed = LET_GO;
    this.arrivedAt = performance.now();
    this.o.audio?.play('wave', null, 0, 0, 0.7, 0.75, false);
    this.o.hud.tip('Bellmourn.', 2.5);
    this.o.saved?.();
  }

  // You and your party, as the snapshot has you: [x, y, z] of each, the feet.
  bodies(snap) {
    const out = [[snap[H.PX], snap[H.PY], snap[H.PZ]]];
    const P = this.o.party?.(), first = this.o.firstHero?.() ?? 0;
    for (const m of P?.members || []) {
      const o = CHARS_START + (first + m.slot) * C_SIZE + C_HERO;
      if (snap[o + 9] > 0.5) continue;
      const x = snap[o + 2], y = snap[o + 3], z = snap[o + 4];
      if (Number.isFinite(x) && Math.hypot(x - out[0][0], z - out[0][2]) < 120) out.push([x, y, z]);
    }
    return out;
  }

  // The light round each of them, e of the way along (0 just woken, 1 whole). out: letting go at the seal, so the haze only.
  light(snap, e, dt, out) {
    const r = this.o.renderer, tier = r.tier?.emit ?? 1;
    for (const [x, y, z] of this.bodies(snap)) {
      // The bright motes, from a few round the feet to a column round the whole of them; and as it closes, the blue haze.
      if (!out) r.orbit(11, (40 + 560 * e * e) * dt * tier, x, y, z, e, 0.7, 1.3, 0.018, 0.055);
      const haze = out ? 90 * e : e > 0.3 ? 150 * ((e - 0.3) / 0.7) ** 1.5 : 0;
      if (haze) r.orbit(11, haze * dt * tier, x, y, z, out ? 1 : e, 0.9, 1.6, 0.28, 0.6);
      // (The last moment: bright through the middle of them.)
      if (!out && e > 0.9) r.orbit(11, 260 * (e - 0.9) * 10 * dt * tier, x, y + 0.2, z, 1, 0.4, 0.8, 0.03, 0.08);
    }
  }
}
