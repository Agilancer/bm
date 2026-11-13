// The game's music (assets/game/music: the tracks of the first Bellmourn, as they were there).
//
//  - The title's song is the title's own (src/title.js). This begins once you're in the game, and the opening's over.
//  - The music of wherever you are (SETS: Bellmourn, the open country, the woods, the grim lands, Velscour's waste, the
//    fells, under the ground), a track at a time with a quiet between, crossfading when you go somewhere else. A fight
//    brings in the action tracks over it: the place's own track waits, and picks up where it left off when it's done.
//  - Stingers (the pack's Fx): somewhere new found, your death, a triumph (a quest done, a lord felled).
//
// The tracks stream through <audio> players into the music's line out (the Music setting: src/title.js musicBus). None is
// decoded whole: that's 60 MB of files, and a phone's memory is kept for the world.
import { SITES, countryAt } from './core/lands.js';
import { inTown } from './core/town.js';
import { inDungeon } from './core/dungeon.js';
import { H } from './core/layout.js';
import { roomAt } from './ui/places.js';

const DIR = 'assets/game/music/';
const T = (k, n) => Array.from({ length: n }, (_, i) => `${k}_${i + 1}`);
// Where each of the pack's tracks plays.
export const SETS = {
  town: T('light', 5),                                                              // Bellmourn, its streets and houses
  open: ['ambient_1', 'ambient_2', 'ambient_3', 'ambient_4', 'ambient_8', 'ambient_9'],   // the Green Downs, and the road out
  wood: ['ambient_6', 'ambient_7', 'ambient_10'],                                   // the Darkwood, the Deepwood, the Rustwood
  grim: ['dark_2', 'dark_3', 'ambient_7'],                                          // the Weeping Fen, the Barrow Moor, the Gallowswood
  fells: ['ambient_5', 'ambient_8', 'ambient_9'],                                   // the Rimeholt Fells and the Sorrowhorn
  waste: ['intro_cursed_citadel', 'ambient_5', 'dark_1'],                           // the Ashen Waste: Velscour's ground, and his keep
  under: T('dark', 5),                                                              // his church and its catacombs, the Rift, the delves
};
const COUNTRY_SET = { darkwood: 'wood', deepwood: 'wood', rustwood: 'wood', downs: 'open', fen: 'grim', barrow: 'grim', gallows: 'grim', rimeholt: 'fells', ashen: 'waste' };
const COMBAT = T('action', 5);
export const STINGERS = { found: 'fx_1', fell: 'fx_2', triumph: 'fx_3' };
const STINGER_S = { found: 11, fell: 3.5, triumph: 7 };
const LEVEL = { track: 0.8, combat: 0.75, stinger: 0.8 };
const GAP = [7, 20];                // the quiet between one track and the next (s)

/** Which set plays at (x, y, z). `was`: the set playing, kept under a house's roof (a door in and out is nothing). */
export function musicSet(x, y, z, was = null) {
  const room = roomAt(x, y, z);
  if (room === 'hall') return null;
  if (room === 'cathedral' || room === 'catacombs' || room === 'rift' || inDungeon(x, z)) return 'under';
  if (room === 'house' && was) return was;
  if (inTown(x, z, 30)) return 'town';
  if (Math.hypot(x - SITES.keep.x, z - SITES.keep.z) < 700) return 'waste';
  return COUNTRY_SET[countryAt(x, z)] || 'open';
}

/** A short silence, to let a player play from inside a click (an iPhone wants each one let). */
function silence() {
  const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const s = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class Music {
  // base: the game's own address. ctx and out: the title's context and its music line. volume(): the Music setting.
  constructor(base, ctx, out, volume = () => 1) {
    this.base = base; this.ctx = ctx; this.out = out; this.volume = volume;
    this.slots = [];        // the players: {el, g (its gain), url, use: what it's playing for, ended}
    this.queue = {};        // each set's tracks still to come, in a shuffled order
    this.last = {};         // each set's last track (not straight again)
    this.set = null; this.want = null; this.wantT = 0;
    this.area = null;       // the player with the place's music
    this.fight = null;      // the player with a fight's
    this.hotT = 0; this.coolT = 0; this.inFight = false;
    this.gapUntil = 0;
    this.duckK = 1; this.pausedK = 1;
    this.on = false;
    this.placeT = 0; this.hp = null; this.hurtT = 9;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  /** The music's own line (into the Music setting's): ducked under a stinger, and while paused. */
  get bus() {
    if (!this._bus && this.ctx && this.out) { this._bus = this.ctx.createGain(); this._bus.connect(this.out); }
    return this._bus;
  }

  /** A player (made the first time: five in all, one kept for the stingers). */
  player(i) {
    if (this.slots[i]) return this.slots[i];
    if (!this.bus) return null;
    const el = new window.Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const g = this.ctx.createGain();
    g.gain.value = 0;
    this.ctx.createMediaElementSource(el).connect(g);
    g.connect(i === 4 ? this.out : this.bus);
    const s = { i, el, g, url: null, use: null, ended: false };
    el.addEventListener('ended', () => { s.ended = true; });
    el.addEventListener('error', () => { if (s.use) console.warn('music: could not play', s.url); s.ended = true; });
    return (this.slots[i] = s);
  }

  /** Inside a click: every idle player let play (an iPhone won't start one later otherwise). */
  unlock() {
    if (!this.ctx || this.ctx.state === 'closed') return;
    this.silent ||= silence();
    for (let i = 0; i < 5; i++) {
      const s = this.player(i);
      if (!s || s.unlocked || s.use) continue;
      if (!s.url) s.el.src = this.silent;
      s.el.play().then(() => { s.unlocked = true; if (!s.use) s.el.pause(); }).catch(() => {});
    }
  }

  /** A free player (not the stingers'). */
  free() {
    for (let i = 0; i < 4; i++) { const s = this.player(i); if (s && !s.use) return s; }
    // all busy (fades overlapping): the one that's been fading longest
    return this.slots.filter((s) => s.i < 4).sort((a, b) => (a.fadeAt || 0) - (b.fadeAt || 0))[0] || null;
  }

  /** Start track `name` on player s, fading up to vol over `fade` s. */
  begin(s, name, use, { vol = 1, fade = 2 } = {}) {
    if (!s) return null;
    const url = `${this.base}${DIR}${name}.mp3`;
    clearTimeout(s.stopT);
    s.use = use; s.ended = false; s.fadeAt = 0; s.vol = vol; s.name = name;
    s.el.loop = false;
    if (s.url !== url) { s.el.src = url; s.url = url; }
    try { s.el.currentTime = 0; } catch { /* not seekable yet */ }
    const g = s.g.gain, n = this.now;
    g.cancelScheduledValues(n); g.setValueAtTime(fade > 0 ? 0 : vol, n);
    if (fade > 0) g.linearRampToValueAtTime(vol, n + fade);
    s.el.play()?.catch?.((e) => { console.warn('music:', e?.message || e); s.ended = true; });
    return s;
  }

  /** Fade player s out over `secs`; stopped there (or only paused: kept where it was, `park`). */
  fade(s, secs = 2, park = false) {
    if (!s || !s.use) return;
    const g = s.g.gain, n = this.now;
    g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0, n + secs);
    s.fadeAt = n;
    clearTimeout(s.stopT);
    s.stopT = setTimeout(() => { s.el.pause(); if (!park) { s.use = null; s.ended = false; } }, secs * 1000 + 60);
  }

  /** Into the game (from the title, or a save): the place's music, after the title's song has gone. */
  play() {
    if (this.on) return;
    this.on = true;
    this.gapUntil = this.now + 3;
  }

  /** Back to the title: all of it away. */
  stop(fade = 1.5) {
    if (!this.on) return;
    this.on = false;
    for (const s of this.slots) if (s?.use && s.use !== 'stinger') this.fade(s, fade);
    this.area = this.fight = null; this.inFight = false; this.set = this.want = null; this.hotT = 0;
  }

  /** Each frame in the game, from what the sim says of you. hold: nothing new begins (the opening, with its own sound). */
  frame(dt, snap, paused, hold = false) {
    if (!this.on || !snap) return;
    // (Where you are, looked at twice a second.)
    if ((this.placeT -= dt) <= 0) { this.placeT = 0.5; this.place = hold ? null : musicSet(snap[H.PX], snap[H.PY], snap[H.PZ], this.set); }
    const hp = snap[H.HP];
    this.hurtT = this.hp !== null && hp < this.hp - 0.01 ? 0 : this.hurtT + dt;
    this.hp = hp;
    this.update(dt, { set: this.place, threat: hold ? 0 : snap[H.THREAT] || 0, hurt: this.hurtT < 4, paused });
  }

  /** o: {set (SETS's), threat (how many are at you, near), hurt (you were struck just now), paused} */
  update(dt, o) {
    if (!this.ctx || !this.on || !this.bus) return;
    const n = this.now, loud = this.volume() > 0.01;
    // paused: the music drops back
    const pk = o.paused ? 0.45 : 1;
    if (pk !== this.pausedK) { this.pausedK = pk; this.bus.gain.setTargetAtTime(pk * this.duckK, n, 0.25); }
    // the place: a change holds a few seconds before the music follows it
    if (o.set !== this.want) { this.want = o.set; this.wantT = 0; }
    this.wantT += dt;
    if (this.want !== this.set && (this.wantT > 3.5 || !this.set)) {
      const was = this.set;
      this.set = this.want;
      if (this.area && !this.inFight) { this.fade(this.area, 3); this.area = null; this.gapUntil = n + (was ? 2.2 : 0); }
      else if (this.area) { this.fade(this.area, 0.5); this.area = null; }   // (parked under the fight: let go)
    }
    // a fight: two or more at you, near, for a moment (or one, and you've been struck); over once none has been for a while
    const hot = o.threat >= 2 || (o.threat >= 1 && o.hurt);
    this.hotT = hot ? this.hotT + dt : 0;
    this.coolT = o.threat > 0 ? 0 : this.coolT + dt;
    if (!this.inFight && this.hotT > 0.8 && !o.paused && loud) this.startFight();
    else if (this.inFight && this.coolT > 7) this.endFight();
    if (this.inFight) {
      if (this.fight?.ended) this.fight = this.begin(this.fight, this.pick('combat', COMBAT), 'fight', { vol: LEVEL.combat, fade: 0.3 });
      return;
    }
    // a track done: the quiet, then the next
    if (this.area?.ended) { this.area.use = null; this.area = null; this.gapUntil = n + GAP[0] + Math.random() * (GAP[1] - GAP[0]); }
    if (!this.area && this.set && n > this.gapUntil && loud) {
      this.area = this.begin(this.free(), this.pick(this.set, SETS[this.set]), 'area', { vol: LEVEL.track, fade: 3 });
    }
  }

  /** The next of a set's tracks: all of them in turn, shuffled, never the same twice running. */
  pick(set, list) {
    let q = this.queue[set];
    if (!q?.length) {
      q = this.queue[set] = shuffle([...list]);
      if (q.length > 1 && q[0] === this.last[set]) q.push(q.shift());
    }
    return (this.last[set] = q.shift());
  }

  startFight() {
    this.inFight = true;
    this.coolT = 0;
    if (this.area) this.fade(this.area, 1.2, true);   // (parked: it picks up where it was)
    this.fight = this.begin(this.free(), this.pick('combat', COMBAT), 'fight', { vol: LEVEL.combat, fade: 0.7 });
  }

  endFight() {
    this.inFight = false;
    this.hotT = 0;
    this.fade(this.fight, 3.5);
    this.fight = null;
    const a = this.area;
    if (a && a.use === 'area' && !a.ended) {   // the place's own track, back where it was
      clearTimeout(a.stopT);
      setTimeout(() => {
        if (this.area !== a || this.inFight || !this.on) return;
        const g = a.g.gain, n = this.now;
        g.cancelScheduledValues(n); g.setValueAtTime(0, n); g.linearRampToValueAtTime(a.vol, n + 3.5);
        a.el.play()?.catch?.(() => {});
      }, 1800);
    } else { this.area = null; this.gapUntil = this.now + 4; }
  }

  /** A stinger over the music (which drops under it): found, fell or triumph. */
  stinger(kind) {
    const f = STINGERS[kind], s = this.on ? this.player(4) : null;
    if (!f || !s || this.volume() < 0.01) return;
    this.begin(s, f, 'stinger', { vol: LEVEL.stinger, fade: 0.05 });
    const bus = this.bus.gain, n = this.now, dur = STINGER_S[kind];
    this.duckK = 0.35;
    bus.cancelScheduledValues(n); bus.setTargetAtTime(this.duckK * this.pausedK, n, 0.2);
    clearTimeout(this.duckT);
    this.duckT = setTimeout(() => { this.duckK = 1; this.bus.gain.setTargetAtTime(this.pausedK, this.now, 1.2); }, dur * 1000);
    clearTimeout(s.stopT);
    s.stopT = setTimeout(() => { s.use = null; }, (dur + 4) * 1000);
  }
}
