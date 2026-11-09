// Positional sound on Web Audio. Everything is decoded up front, so a blow is heard the instant it lands.
import { isMobileDevice } from './gfx/gpu.js';

// Head-related filtering is a convolution for every sound playing, for a phone's speakers to throw away.
const PHONE = isMobileDevice();
const PANNING = PHONE ? 'equalpower' : 'HRTF';

const n = (base, k) => Array.from({ length: k }, (_, i) => `${base}_${i + 1}`);
// Decoded at load, before the game starts: what a fight and a walk on the dirt need the instant they happen.
const BANKS = {
  attack: n('sword_attack', 3), impact: n('sword_impact_hit', 3), blocked: n('sword_blocked', 3), parry: n('sword_parry', 3),
  draw: ['sword_unsheath_1'],
  walk: n('dirt_walk', 5), run: n('dirt_run', 5), armorWalk: n('dirt_chain_walk', 5), armorRun: n('dirt_chain_run', 5),
  jump: ['dirt_jump'], land: ['dirt_land'], armorLand: ['dirt_chain_land'],
  birds: ['birds'], wind: ['wind_calm'],
};
const CORE = new Set(Object.values(BANKS).flat());
// The rest of TomMusic's Free Fantasy SFX Pack (tools/audio/build_fantasy_sfx.py), fetched once the game's begun. Asked for before
// it's in, a sound's fetched there and then and plays a moment late.
// Steps on each ground the pack has (src/ui/places.js groundAt): walk_stone, armorRun_wood, land_water, ...
for (const g of ['dirt', 'stone', 'wood', 'water']) {
  Object.assign(BANKS, {
    [`walk_${g}`]: n(`${g}_walk`, 5), [`run_${g}`]: n(`${g}_run`, 5), [`armorWalk_${g}`]: n(`${g}_chain_walk`, 5), [`armorRun_${g}`]: n(`${g}_chain_run`, 5),
    [`jump_${g}`]: [`${g}_jump`], [`land_${g}`]: [`${g}_land`], [`armorJump_${g}`]: [`${g}_chain_jump`], [`armorLand_${g}`]: [`${g}_chain_land`],
  });
}
Object.assign(BANKS, {
  // A knight's sword out (src/main.js ALERT).
  unsheath: n('sword_unsheath', 2),
  // Doors (src/items/doors.js): a house's or the church's iron ones, and the cathedral's great doors.
  doorOpen: n('door_open', 2), doorClose: n('door_close', 2), gateOpen: ['gate_open'], gateClose: ['gate_close'], unlock: ['lock_unlock'],
  chestOpen: n('chest_open', 2),
  // The town at work (src/folk/folk.worker.js blows), and the camp in the Rustwood.
  chop: n('chop', 4), anvil: n('mine', 5),
  // The pack opened and shut: the rustle of a strap and leather.
  packOpen: ['bow_take_out_1'], packClose: ['bow_put_away_1'],
  // Spells (src/spellsound.js), each over its element's own made sound.
  fireball: n('fireball', 3), firebuff: n('firebuff', 2), firespray: n('firespray', 2), fireCatch: n('light_torch_with_starting_loop', 2),
  torchImpact: n('torch_impact', 2), torchStrike: n('torch_attack_strike', 2), kindle: n('light_torch', 2),
  iceThrow: n('ice_throw', 2), iceFreeze: n('ice_freeze', 2), iceBarrage: n('ice_barrage', 2), iceWall: n('ice_wall', 2),
  rockThrow: n('rock_meteor_throw', 2), rockSwarm: n('rock_meteor_swarm', 2), rockWall: n('rock_wall', 2),
  spellImpact: n('spell_impact', 3), splash: n('waterspray', 2), wave: n('wave_attack', 2), thunk: n('bow_impact_hit', 3),
});
// From two general packs (tools/audio/build_extra_sfx.py): what's picked up, the book and the map, bone and gore, the panels' clicks.
Object.assign(BANKS, {
  coin: ['coin_collect', 'coins_gather_small', 'coins_gather_quick'], coinLand: ['coin_jingle_small'],
  gem: ['gem_collect'], gemLand: ['glass_ping_small'], orb: ['heart_collect'],
  takeGear: ['weapon_pick_up'], takeRobe: ['clothing_1'], takeThing: ['wood_small_pickup'], scroll: ['page_turn'],
  equip: ['item_equip'], equipStaff: ['weapon_equip'], keys: ['keys_jingling'],
  bookOpen: ['book_open'], bookClose: ['book_close'], mapOpen: ['map_open'], mapClose: ['map_close'],
  boneSnap: ['bone_snap', 'crunch'], crunch: ['crunch_splat', 'crunch_splat_2'], squelch: n('squelching', 4), splat: ['splat_quick', 'crunch_quick'],
  uiHover: ['ui_pointer'], uiConfirm: ['ui_confirm'], uiCancel: ['ui_cancel'], uiOpen: ['ui_popup'], uiClose: ['ui_popdown'],
});
// The least time between two of a bank, so a volley or a line of spikes doesn't stack up into one roar.
const GAP = { spellImpact: 0.07, torchImpact: 0.1, iceFreeze: 0.1, thunk: 0.08, rockWall: 0.3, splash: 0.2, rockThrow: 0.12, fireball: 0.08, anvil: 0.2, chop: 0.2,
  coin: 0.06, coinLand: 0.05, gem: 0.08, gemLand: 0.05, orb: 0.1, squelch: 0.1, splat: 0.08, crunch: 0.1, uiHover: 0.05 };

export class Audio {
  // ctx and dest: the title's context and its Volume, so the title and the game share one line out.
  constructor(base, ctx = null, dest = null, ambience = 1) {
    this.base = base;
    this.sharedCtx = ctx; this.dest = dest; this.ambienceLevel = ambience;
    this.buffers = {};
    this.ctx = null;
    this.ready = false;
  }

  async load() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC && !this.sharedCtx) return;
    this.ctx = this.sharedCtx || new AC({ latencyHint: 'interactive' });
    const { ctx } = this;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(this.dest || ctx.destination);
    this.amb = ctx.createGain();
    this.amb.gain.value = this.ambienceLevel;
    this.amb.connect(this.master);
    // A short slap of space, so steel rings off the houses.
    const len = Math.floor(ctx.sampleRate * 0.7);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / len * 7) * (i < 500 ? i / 500 : 1) * 0.4;
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.reverb.connect(wet);
    wet.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    await Promise.all([...CORE].map(async (n) => {
      const res = await fetch(`${this.base}assets/game/audio/${n}.mp3`);
      this.buffers[n] = await ctx.decodeAudioData(await res.arrayBuffer());
    }));
    this.lastAt = {};
    this.ready = true;
    if (this.wantStart) this.start();
  }

  start() {
    // (Asked before the sounds are in, as ?auto does: it starts once they are.)
    if (!this.ready) { this.wantStart = true; return; }
    this.ctx.resume();
    if (this.started) return;
    this.started = true;
    // (Beds, so the lands can bring them down indoors and under the ground: src/ui/lands.js sounds.)
    this.bed('birds', 0.16);
    this.bed('wind_calm', 0.34);
    // The rest of the effects, a few at a time, out of the way of everything else loading.
    const rest = [...new Set(Object.values(BANKS).flat())].filter((k) => !CORE.has(k));
    const next = () => { const k = rest.shift(); if (k) this.fetchBuffer(k).catch(() => {}).then(() => setTimeout(next, 30)); };
    for (let i = 0; i < 4; i++) setTimeout(next, 1500 + i * 40);
  }

  // A loop fetched the first time it's wanted, its level eased toward gain: the falls, the wind on the heights (src/ui/lands.js).
  bed(name, gain) {
    if (!this.ready) return;
    this.beds = this.beds || {};
    let b = this.beds[name];
    if (!b) {
      if (gain < 0.005) return;
      b = this.beds[name] = { g: this.ctx.createGain() };
      b.g.gain.value = 0;
      b.g.connect(this.amb);
      this.fetchBuffer(name).then((buf) => {
        const s = this.ctx.createBufferSource();
        s.buffer = buf; s.loop = true; s.connect(b.g); s.start(this.ctx.currentTime, Math.random() * buf.duration);
      }).catch(() => {});
    }
    b.g.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.9);
  }

  // A sound heard once, wherever you are, fetched the first time it's wanted.
  once(name, gain = 1) {
    if (!this.ready) return;
    this.fetchBuffer(name).then((buf) => {
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      g.gain.value = gain; s.buffer = buf; s.connect(g); g.connect(this.master); s.start();
    }).catch(() => {});
  }

  fetchBuffer(name) {
    if (this.buffers[name]) return Promise.resolve(this.buffers[name]);
    this.pending = this.pending || {};
    return this.pending[name] || (this.pending[name] = fetch(`${this.base}assets/game/audio/${name}.mp3`).then((r) => r.arrayBuffer()).then((a) => this.ctx.decodeAudioData(a)).then((buf) => (this.buffers[name] = buf)));
  }

  // The shield's scrape, its rumble, and the wind when you're fast. Bellmourn's board loop. speed 0 is silence; in the air only the wind's left.
  surf(speed, grounded) {
    if (!this.ready) return;
    const c = this.ctx;
    if (!this.slide) {
      if (speed <= 0) return;
      const mk = (type, f, q) => {
        const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = c.createGain(); g.gain.value = 0;
        src.connect(fl); fl.connect(g); g.connect(this.master); src.start(c.currentTime, Math.random() * 0.5);
        return { fl, g };
      };
      this.slide = { scrape: mk('bandpass', 900, 0.8), rumble: mk('lowpass', 160, 0.7), wind: mk('bandpass', 700, 0.6) };
    }
    const n = c.currentTime, k = Math.min(1, speed / 18), on = speed > 0 && grounded, { scrape, rumble, wind } = this.slide;
    scrape.g.gain.setTargetAtTime(on ? 0.16 + 0.4 * Math.sqrt(k) : 0, n, 0.06);
    scrape.fl.frequency.setTargetAtTime(900 * (0.7 + 0.6 * k), n, 0.1);
    rumble.g.gain.setTargetAtTime(on ? 0.1 + 0.35 * k : 0, n, 0.08);
    wind.g.gain.setTargetAtTime(0.24 * Math.max(0, (speed - 7) / 22) ** 1.5, n, 0.15);
    wind.fl.frequency.setTargetAtTime(500 + speed * 40, n, 0.2);
  }

  setAmbience(v) { this.ambienceLevel = v; if (this.amb) this.amb.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  listener(x, y, z, fx, fy, fz, ux, uy, uz) {
    if (!this.ready) return;
    if (PHONE && (this.listenerTurn = (this.listenerTurn + 1 || 0) % 3)) return;
    const l = this.ctx.listener, t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(x, t); l.positionY.setValueAtTime(y, t); l.positionZ.setValueAtTime(z, t);
      l.forwardX.setValueAtTime(fx, t); l.forwardY.setValueAtTime(fy, t); l.forwardZ.setValueAtTime(fz, t);
      l.upX.setValueAtTime(ux, t); l.upY.setValueAtTime(uy, t); l.upZ.setValueAtTime(uz, t);
    } else {
      l.setPosition(x, y, z); l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  // A loop heard from one place, which can move (the nearest flame: src/ui/lands.js), eased toward gain. Fetched the first time.
  spot(key, name, x, y, z, gain) {
    if (!this.ready) return;
    this.spots = this.spots || {};
    let s = this.spots[key];
    if (!s) {
      if (gain < 0.005) return;
      const p = this.ctx.createPanner();
      p.panningModel = PANNING; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1.2;
      const g = this.ctx.createGain(); g.gain.value = 0;
      g.connect(p); p.connect(this.amb);
      s = this.spots[key] = { p, g };
      this.fetchBuffer(name).then((buf) => {
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true; src.connect(g); src.start(this.ctx.currentTime, Math.random() * buf.duration);
      }).catch(() => {});
    }
    const t = this.ctx.currentTime, { p } = s;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, 0.1); p.positionY.setTargetAtTime(y, t, 0.1); p.positionZ.setTargetAtTime(z, t, 0.1); } else p.setPosition(x, y, z);
    s.g.gain.setTargetAtTime(gain, t, 0.4);
  }

  // bank name, position (null for "in your head"), volume, rate
  play(bank, x, y, z, gain = 1, rate = 1, wet = true) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const list = BANKS[bank];
    if (!list) return;
    if (GAP[bank]) {
      const now = this.ctx.currentTime;
      if (now - (this.lastAt[bank] ?? -1) < GAP[bank]) return;
      this.lastAt[bank] = now;
    }
    this.sound(list[(Math.random() * list.length) | 0], x, y, z, gain, rate, wet);
  }

  // One file by name (play's, once it's picked one of a bank).
  sound(name, x, y, z, gain = 1, rate = 1, wet = true) {
    if (!this.buffers[name]) {
      // (Not in yet: as soon as it is, unless that's too late to still belong to what made it.)
      const asked = performance.now();
      this.fetchBuffer(name).then(() => { if (performance.now() - asked < 400) this.sound(name, x, y, z, gain, rate, wet); }).catch(() => {});
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[name];
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    if (x === null || x === undefined) {
      g.connect(this.master);
      if (wet) g.connect(this.reverb);
    } else {
      const p = this.ctx.createPanner();
      p.panningModel = PANNING; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.rolloffFactor = 1.1;
      if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
      g.connect(p);
      p.connect(this.master);
      if (wet) p.connect(this.reverb);
    }
    src.start();
  }

  // A close aspirated inhale: filtered air with a brief, quiet throat onset.
  // Synthesized locally so scene cues need no external voice service.
  breath(kind, x, y, z) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const ctx = this.ctx, now = ctx.currentTime;
    const duration = kind === 'gasp' ? 0.52 : kind === 'catch' ? 0.42 : 0.8;
    const level = kind === 'gasp' ? 0.46 : kind === 'catch' ? 0.27 : 0.14;
    const pan = ctx.createPanner();
    pan.panningModel = PANNING;
    pan.refDistance = 2.5;
    pan.positionX.value = x; pan.positionY.value = y; pan.positionZ.value = z;
    pan.connect(this.master);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + (kind === 'release' ? 0.12 : 0.035));
    if (kind === 'catch') {
      gain.gain.exponentialRampToValueAtTime(0.025, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(level * 0.65, now + 0.21);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(pan);
    const air = ctx.createBufferSource();
    air.buffer = this.noise;
    const mouth = ctx.createBiquadFilter();
    mouth.type = 'bandpass'; mouth.Q.value = 0.65;
    mouth.frequency.setValueAtTime(kind === 'release' ? 850 : 1900, now);
    mouth.frequency.exponentialRampToValueAtTime(650, now + duration);
    air.connect(mouth); mouth.connect(gain);
    air.start(now, 0.17); air.stop(now + duration);
    air.onended = () => { air.disconnect(); mouth.disconnect(); gain.disconnect(); pan.disconnect(); };
  }

  // A burst of filtered noise: the wet sound of a wound opening, or a spurt on each heartbeat.
  gore(x, y, z, gain = 1, dur = 0.28, freq = 900) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.6;
    const t = ctx.currentTime;
    f.frequency.setValueAtTime(freq * (0.8 + Math.random() * 0.5), t);
    f.frequency.exponentialRampToValueAtTime(freq * 0.26, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createPanner();
    p.panningModel = PANNING; p.distanceModel = 'inverse'; p.refDistance = 2.5;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
