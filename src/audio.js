// Positional sound on Web Audio. Everything is decoded up front, so a blow is heard the instant it lands.
import { isMobileDevice } from './gfx/gpu.js';

// Head-related filtering is a convolution for every sound playing, for a phone's speakers to throw away.
const PHONE = isMobileDevice();
const PANNING = PHONE ? 'equalpower' : 'HRTF';

const BANKS = {
  attack: ['sword_attack_1', 'sword_attack_2', 'sword_attack_3'],
  impact: ['sword_impact_hit_1', 'sword_impact_hit_2', 'sword_impact_hit_3'],
  blocked: ['sword_blocked_1', 'sword_blocked_2', 'sword_blocked_3'],
  parry: ['sword_parry_1', 'sword_parry_2', 'sword_parry_3'],
  draw: ['sword_unsheath_1'],
  walk: ['dirt_walk_1', 'dirt_walk_2', 'dirt_walk_3', 'dirt_walk_4', 'dirt_walk_5'],
  run: ['dirt_run_1', 'dirt_run_2', 'dirt_run_3', 'dirt_run_4', 'dirt_run_5'],
  armorWalk: ['dirt_chain_walk_1', 'dirt_chain_walk_2', 'dirt_chain_walk_3', 'dirt_chain_walk_4', 'dirt_chain_walk_5'],
  armorRun: ['dirt_chain_run_1', 'dirt_chain_run_2', 'dirt_chain_run_3', 'dirt_chain_run_4', 'dirt_chain_run_5'],
  jump: ['dirt_jump'], land: ['dirt_land'], armorLand: ['dirt_chain_land'],
  birds: ['birds'], wind: ['wind_calm'],
};

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
    const names = new Set(Object.values(BANKS).flat());
    await Promise.all([...names].map(async (n) => {
      const res = await fetch(`${this.base}assets/game/audio/${n}.mp3`);
      this.buffers[n] = await ctx.decodeAudioData(await res.arrayBuffer());
    }));
    this.ready = true;
  }

  start() {
    if (!this.ready) return;
    this.ctx.resume();
    if (this.started) return;
    this.started = true;
    this.loop('birds', 0.16);
    this.loop('wind', 0.34);
  }

  loop(bank, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[BANKS[bank][0]];
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.amb);
    src.start();
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

  // bank name, position (null for "in your head"), volume, rate
  play(bank, x, y, z, gain = 1, rate = 1, wet = true) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const list = BANKS[bank];
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[list[(Math.random() * list.length) | 0]];
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
