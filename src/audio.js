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
