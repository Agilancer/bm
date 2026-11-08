// The opening's sound, made on the spot (no files): the summons' drone and the portal's roar, the zap when the glamour
// breaks, her snap, the candles catching, the cave falling in, and the scream at the edge of town. Played off the story's
// clock, so a moment is heard once, as it's crossed.
import { H } from '../core/layout.js';
import { CANDLES, CANDLES_AT, OPENING, PORTAL, SNAP_AT, SWAP_AT } from '../core/opening.js';

export class OpeningSound {
  constructor(audio) {
    this.a = audio;
    this.stage = -1; this.t = 0;
    this.drone = null; this.roar = null; this.room = null;
    this.ambK = 1;
  }

  get ok() { const a = this.a; return !!(a && a.ready && a.ctx && a.ctx.state === 'running'); }

  // Where a sound goes: placed in the world (or in your head, with no x), and some of it into the room.
  out(x, y, z, wet = 0.5) {
    const c = this.a.ctx, g = c.createGain();
    let node = g;
    if (x !== undefined && x !== null) {
      const p = c.createPanner();
      p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 0.9;
      if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
      g.connect(p); node = p;
    }
    node.connect(this.a.master);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.a.reverb); }
    return g;
  }

  // Filtered noise with a quick rise and a fall: type and the filter's sweep f0 to f1.
  noise(dest, t0, dur, type, f0, f1, q, gain, attack = 0.005) {
    const c = this.a.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.a.noise; src.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }

  tone(dest, t0, dur, wave, f0, f1, gain, attack = 0.005) {
    const c = this.a.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  // A noise bed that runs until it's stopped: its filter, and a gain to set as it goes.
  bed(type, f, q, wet = 0.3) {
    const c = this.a.ctx, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.a.noise; src.loop = true;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.value = 0;
    src.connect(fl); fl.connect(g); g.connect(this.out(null, 0, 0, wet));
    src.start(0, Math.random());
    return { src, g, fl };
  }

  // ---- the long sounds ----
  startDrone() {
    const c = this.a.ctx, now = c.currentTime, g = c.createGain(), lp = c.createBiquadFilter(), oscs = [];
    lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.13, now + 2.2);
    // A low, sweet chord that breathes: a fifth and an octave over A, each voice wavering on its own.
    for (const [f, type, lvl] of [[110, 'sine', 0.5], [164.8, 'sine', 0.3], [220.4, 'triangle', 0.16], [277.2, 'sine', 0.07], [329.6, 'sine', 0.06], [109.6, 'sawtooth', 0.035]]) {
      const o = c.createOscillator(), og = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = type; o.frequency.value = f; og.gain.value = lvl;
      lfo.frequency.value = 0.11 + Math.random() * 0.25; lg.gain.value = f * 0.005;
      lfo.connect(lg); lg.connect(o.frequency); o.connect(og); og.connect(lp);
      o.start(now); lfo.start(now); oscs.push(o, lfo);
    }
    lp.connect(g); g.connect(this.out(null, 0, 0, 0.6));
    this.drone = { g, oscs };
  }

  cutDrone() {
    if (!this.drone) return;
    const now = this.a.ctx.currentTime, { g, oscs } = this.drone;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.03);
    for (const o of oscs) o.stop(now + 0.1);
    this.drone = null;
  }

  stopAll() {
    this.cutDrone();
    for (const k of ['roar', 'room']) if (this[k]) { this[k].src.stop(); this[k] = null; }
    this.setAmb(1);
  }

  // The birds and the wind, turned down in the cave (on top of the player's own setting).
  setAmb(k) {
    if (k === this.ambK) return;
    this.ambK = k;
    const a = this.a;
    if (a.amb) a.amb.gain.setTargetAtTime(a.ambienceLevel * k, a.ctx.currentTime, 0.25);
  }

  // ---- the moments ----
  zap(x, y, z) {
    const now = this.a.ctx.currentTime, d = this.out(x, y, z, 0.7), e = this.out(null, 0, 0, 0.2);
    this.noise(d, now, 0.32, 'bandpass', 4200, 1400, 0.9, 0.5, 0.002);
    this.tone(d, now, 0.28, 'square', 90, 1900, 0.09, 0.002);
    this.tone(d, now + 0.02, 0.22, 'sawtooth', 2600, 600, 0.05, 0.002);
    this.noise(e, now, 0.5, 'highpass', 6000, 3000, 0.7, 0.12, 0.001);
  }

  crackThud(gain = 1) {
    const now = this.a.ctx.currentTime, d = this.out(PORTAL[0], PORTAL[1], PORTAL[2], 0.8);
    this.tone(d, now, 0.55, 'sine', 74, 33, 0.55 * gain, 0.004);
    this.noise(d, now, 0.08, 'highpass', 2400, 1400, 0.7, 0.3 * gain, 0.001);
    this.noise(d, now + 0.01, 0.4, 'lowpass', 500, 120, 0.7, 0.32 * gain, 0.004);
  }

  snap(x, y, z) {
    const now = this.a.ctx.currentTime, d = this.out(x, y, z, 0.9);
    this.noise(d, now, 0.05, 'bandpass', 2700, 2100, 1.4, 1.0, 0.001);
    this.tone(d, now, 0.035, 'sine', 1150, 700, 0.2, 0.001);
  }

  pop(x, y, z) {
    const now = this.a.ctx.currentTime, d = this.out(x, y, z, 0.4);
    this.noise(d, now, 0.16, 'lowpass', 900, 160, 0.6, 0.09, 0.004);
    this.tone(d, now, 0.08, 'sine', 170, 90, 0.035, 0.003);
  }

  whine() {
    const now = this.a.ctx.currentTime, d = this.out(PORTAL[0], PORTAL[1], PORTAL[2], 0.6);
    this.tone(d, now, 1.5, 'sine', 300, 560, 0.06, 0.3);
    this.tone(d, now, 1.5, 'triangle', 452, 830, 0.025, 0.3);
  }

  thoom() {
    const now = this.a.ctx.currentTime, d = this.out(null, 0, 0, 0.9);
    this.tone(d, now, 1.7, 'sine', 48, 26, 0.9, 0.01);
    this.noise(d, now, 1.3, 'lowpass', 220, 50, 0.7, 0.45, 0.02);
  }

  rumble(dur, gain) {
    const now = this.a.ctx.currentTime, d = this.out(null, 0, 0, 0.5);
    this.noise(d, now, dur, 'lowpass', 140, 60, 0.6, gain, dur * 0.25);
  }

  crash(x, y, z) {
    const c = this.a.ctx, now = c.currentTime, d = this.out(x, y, z, 0.7);
    this.rumble(2.6, 0.55);
    for (let i = 0; i < 9; i++) {
      const t = now + i * 0.12 + Math.random() * 0.15;
      this.noise(d, t, 0.25 + Math.random() * 0.3, 'lowpass', 700 + Math.random() * 1400, 140, 0.8, 0.35 + Math.random() * 0.25, 0.003);
      this.tone(d, t, 0.3, 'sine', 90 + Math.random() * 40, 40, 0.35, 0.003);
    }
  }

  // A woman's shriek, off ahead, and the basket she drops.
  scream(x, y, z) {
    const c = this.a.ctx, now = c.currentTime, d = this.out(x, y, z, 0.6);
    const o = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(720, now); o.frequency.linearRampToValueAtTime(1020, now + 0.25); o.frequency.linearRampToValueAtTime(860, now + 0.9);
    vib.frequency.value = 6.5; vg.gain.value = 22; vib.connect(vg); vg.connect(o.frequency);
    f1.type = 'bandpass'; f1.frequency.value = 1150; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = 2700; f2.Q.value = 6;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5, now + 0.06); g.gain.setValueAtTime(0.5, now + 0.65); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(d);
    o.start(now); vib.start(now); o.stop(now + 1.05); vib.stop(now + 1.05);
    for (let i = 0; i < 4; i++) this.noise(d, now + 0.35 + i * 0.09 + Math.random() * 0.04, 0.12, 'bandpass', 1800 + Math.random() * 1200, 900, 1.2, 0.18, 0.002);
    this.tone(d, now + 0.33, 0.2, 'sine', 120, 60, 0.15, 0.003);
  }

  // Each frame: what's running, and what's just been crossed.
  update(stage, t, snap, her, lids, inCave, amb = 1) {
    if (!this.ok) return;
    const prev = this.stage === stage ? this.t : -1;
    const crossed = (at) => prev < at && t >= at;
    if (stage !== this.stage && this.stage >= 0 && stage < this.stage && stage === OPENING.WAKE) this.stopAll();
    this.stage = stage; this.t = t;
    const c = this.a.ctx, now = c.currentTime;
    const wantRoar = stage >= OPENING.WAKE && (stage < OPENING.COLLAPSE || (stage === OPENING.COLLAPSE && t < 3.0));
    if (wantRoar && !this.roar) this.roar = this.bed('lowpass', 210, 0.8, 0.5);
    if (!wantRoar && this.roar) { this.roar.g.gain.setTargetAtTime(0, now, 0.08); const r = this.roar; setTimeout(() => r.src.stop(), 800); this.roar = null; }
    if (this.roar) {
      const d = Math.hypot(snap[H.PX] - PORTAL[0], snap[H.PZ] - PORTAL[2]);
      const k = stage === OPENING.WAKE ? 0.05 + 0.2 * lids : 0.12;
      this.roar.g.gain.setTargetAtTime(k / (1 + d / 5), now, 0.15);
    }
    const wantRoom = inCave && stage <= OPENING.LEAVE && (stage > OPENING.WAKE || t > CANDLES_AT);
    if (wantRoom && !this.room) this.room = this.bed('lowpass', 380, 0.5, 0.2);
    if (this.room) this.room.g.gain.setTargetAtTime(wantRoom ? 0.02 : 0, now, 0.5);
    if (!wantRoom && this.room && stage > OPENING.LEAVE) { const r = this.room; setTimeout(() => r.src.stop(), 2000); this.room = null; }
    this.setAmb(Math.round(amb * 10) / 10);
    switch (stage) {
      case OPENING.WAKE:
        if (t < SNAP_AT && !this.drone && prev < 0.5) this.startDrone();
        if (crossed(SWAP_AT)) this.zap(her[0], her[1] + 1.3, her[2]);
        if (crossed(11.0)) this.crackThud();
        if (crossed(SNAP_AT)) { this.cutDrone(); this.snap(her[0], her[1] + 1.4, her[2]); }
        for (const k of CANDLES) if (crossed(k.at)) this.pop(k.x, k.y, k.z);
        break;
      case OPENING.HERD:
        if (crossed(6.4)) this.whine();
        break;
      case OPENING.LEAVE:
        // The door slipping as you go.
        if (Math.floor(t / 4.7) !== Math.floor(prev / 4.7) && prev > 0) this.crackThud(0.45);
        break;
      case OPENING.COLLAPSE:
        if (crossed(3.0)) this.thoom();
        if (crossed(4.6)) this.rumble(1.1, 0.5);
        if (crossed(6.95)) this.crash(her[0], her[1] + 1.5, her[2]);
        break;
    }
  }
}

