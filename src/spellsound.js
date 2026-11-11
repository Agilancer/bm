// Spells' sounds, made on the spot from noise and oscillators, in the same space as everything else the game plays.
// Each element is a filtered noise that sweeps, and a tone under or over it.
const VOICE = [
  { n: [1000, 150], q: 0.9, tone: [110, 46], type: 'sine', t: 0.42 },      // fire: a whoosh with a chest in it
  { n: [5200, 8200], q: 2.4, tone: [1700, 820], type: 'triangle', t: 0.3 }, // frost: glass
  { n: [2600, 520], q: 2.6, tone: [430, 105], type: 'sawtooth', t: 0.36 },  // arcane
  { n: [3800, 900], q: 3.8, tone: [150, 60], type: 'square', t: 0.2 },      // storm: a crack
  { n: [2200, 4200], q: 1.5, tone: [523, 1046], type: 'sine', t: 0.7 },     // heal: rising
  { n: [3000, 5000], q: 2, tone: [880, 1320], type: 'sine', t: 0.55 },      // light
  { n: [500, 200], q: 1.4, tone: [190, 80], type: 'sine', t: 0.5 },         // drain
  { n: [2400, 520], q: 1.6, tone: [130, 70], type: 'triangle', t: 0.18 },   // bone
  { n: [380, 80], q: 1.1, tone: [120, 34], type: 'sine', t: 0.7 },          // void
  { n: [800, 300], q: 2.2, tone: [240, 150], type: 'triangle', t: 0.4 },    // poison
  { n: [3400, 1400], q: 3.2, tone: [800, 400], type: 'triangle', t: 0.4 },  // spirit
  { n: [420, 80], q: 0.8, tone: [90, 38], type: 'sine', t: 0.32 },          // stone
];

// Over the made sounds, the Fantasy SFX Pack's (src/audio.js BANKS): [bank, gain, rate].
// As each spell leaves the hand, by its key (src/sim/spells.js):
const LOOSE = {
  firebolt: ['fireball', 0.6, 1], frost: ['iceThrow', 0.6, 1.05], firebeam: ['firespray', 0.55, 1], nova: ['iceWall', 1, 1],
  wisp: ['kindle', 0.55, 1.15], spikes: ['rockThrow', 0.8, 0.8], meteor: ['torchStrike', 0.9, 0.6], arcaneblast: ['wave', 0.4, 1.35],
  // The six trees' own (src/sim/treespells.js), from the same packs.
  comet: ['fireball', 0.65, 1.15], wyrm: ['firespray', 0.6, 0.85], firenova: ['fireCatch', 1, 1.1], bomb: ['kindle', 0.7, 0.8], phoenix: ['fireball', 0.8, 0.8], inferno: ['fireCatch', 1.2, 0.8],
  coldcone: ['iceWall', 0.7, 1.3], rime: ['iceThrow', 0.7, 0.85], prism: ['iceThrow', 0.6, 1.3], orb: ['iceBarrage', 0.8, 0.9], shatter: ['iceFreeze', 1, 0.8], zero: ['iceWall', 1.2, 0.7],
  stone: ['rockThrow', 0.6, 1.2], boulder: ['rockThrow', 0.9, 0.7], monolith: ['rockWall', 1.1, 0.8], quake: ['rockSwarm', 1.1, 0.7], stoneskin: ['rockWall', 0.6, 1.3],
  fork: ['spellImpact', 0.5, 1.5], thunderclap: ['wave', 0.7, 0.8], thunder: ['wave', 0.6, 0.6], crescent: ['wave', 0.35, 1.6], turn: ['kindle', 0.8, 1.3],
};
// Where an element strikes something, by ELEM (the rest: spellImpact).
const HIT = { 0: ['torchImpact', 0.5, 1], 1: ['iceFreeze', 0.35, 1.3], 7: ['thunk', 0.8, 0.9], 11: ['rockThrow', 0.5, 1.2] };

export class SpellSound {
  constructor(audio) {
    this.audio = audio;
    this.hum = null;
    this.humElem = 0;
  }

  get live() { return this.audio.ready && this.audio.ctx.state === 'running'; }

  // A place in the world, or right at the ear (x null).
  out(x, y, z) {
    const { ctx, master } = this.audio;
    if (x === null) return master;
    const p = ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 4;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    p.connect(master);
    return p;
  }

  voice(e, x, y, z, gain, scale = 1, pitch = 1) {
    if (!this.live) return;
    const { ctx, noise } = this.audio, v = VOICE[e], t = ctx.currentTime, dur = v.t * scale;
    const end = this.out(x, y, z);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.014);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(end);
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = v.q;
    f.frequency.setValueAtTime(v.n[0] * pitch, t);
    f.frequency.exponentialRampToValueAtTime(v.n[1] * pitch, t + dur);
    src.connect(f); f.connect(env);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.03);
    const o = ctx.createOscillator();
    o.type = v.type;
    o.frequency.setValueAtTime(v.tone[0] * pitch, t);
    o.frequency.exponentialRampToValueAtTime(v.tone[1] * pitch, t + dur);
    const og = ctx.createGain();
    og.gain.value = v.type === 'sine' ? 0.7 : 0.16;
    o.connect(og); og.connect(env);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  layer(s, x, y, z, k = 1) { if (s && this.live) this.audio.play(s[0], x, y, z, s[1] * k, s[2]); }

  gather(e) {
    this.voice(e, null, 0, 0, 0.16, 1.5, 0.6);
    if (e === 0 && this.live) this.audio.play('firebuff', null, 0, 0, 0.3, 1.1, false);
  }
  // key: the spell's (null for a staff's own shot).
  loose(e, x, y, z, key = null) {
    this.voice(e, x, y, z, 0.5, 1, 1 + Math.random() * 0.1);
    this.layer(LOOSE[key], x, y, z);
  }
  hit(e, x, y, z) {
    this.voice(e, x, y, z, 0.26, 0.5, 1.2 + Math.random() * 0.3);
    this.layer(HIT[e] || ['spellImpact', 0.4, 1.1], x, y, z);
  }
  // Scaled by how big a thing went off.
  boom(e, x, y, z, size) {
    const big = Math.min(1, size / 5);
    this.voice(e, x, y, z, 0.35 + big * 0.9, 0.7 + big * 2.2, 1.1 - big * 0.45);
    if (size > 1.6) this.voice(0, x, y, z, 0.25 + big * 0.8, 1.4 + big * 2.4, 0.42);
    if (!this.live) return;
    const A = this.audio;
    if (e === 0) {
      // A meteor brings the sky's stones down with it; a bolt bursts; a beam's every touch hisses.
      if (size >= 4) { A.play('fireball', x, y, z, 1.4, 0.65); A.play('rockSwarm', x, y, z, 1.3, 0.85); } else if (size >= 1) A.play('fireball', x, y, z, 0.6 + big * 0.6, 1.15 - big * 0.3);
      else A.play('torchImpact', x, y, z, 0.3, 1.2);
    } else if (e === 1) { if (size < 4) A.play('iceFreeze', x, y, z, 0.6, 1.1); }
    else if (e === 11) A.play('rockWall', x, y, z, 0.7, 1.1);
    else if (e === 9) { if (size >= 1.5) A.play('splash', x, y, z, 0.8, 0.9); }
    else if (e === 7) A.play('thunk', x, y, z, 0.9, 0.85);
    else A.play('spellImpact', x, y, z, 0.35 + big * 0.5, 1.2 - big * 0.5);
  }

  // A spell laid on the ground away from you, heard where it is: the wall of fire catching, the blizzard's ice coming down.
  zone(key, x, y, z, dur) {
    if (!this.live) return;
    const A = this.audio;
    if (key === 'wallfire' || key === 'firenova') A.play('fireCatch', x, y, z, 1.3, 0.9);
    else if (key === 'quake') for (let t = 0; t < dur - 0.5; t += 1.5) setTimeout(() => A.play('rockSwarm', x, y, z, 1, 0.75 + Math.random() * 0.1), t * 1000);
    else if (key === 'zero') setTimeout(() => A.play('iceBarrage', x, y, z, 1.3, 0.7), dur * 1000 - 1000);
    else if (key === 'blizzard') for (let t = 0; t < dur - 1; t += 2.3) setTimeout(() => A.play('iceBarrage', x, y, z, 1.1, 0.9 + Math.random() * 0.15), t * 1000);
  }
  fizzle() { this.voice(11, null, 0, 0, 0.14, 0.5, 2.4); }

  // The roar of what's being held. elem is the snapshot's: 0 for nothing, or its element and one.
  channel(elem) {
    if (elem === this.humElem) return;
    const { ctx, noise } = this.audio;
    if (this.hum) {
      const h = this.hum, t = ctx.currentTime;
      h.g.gain.setTargetAtTime(0.0001, t, 0.05);
      h.src.stop(t + 0.3); h.o.stop(t + 0.3);
      this.hum = null;
    }
    this.humElem = elem;
    if (!elem || !this.live) return;
    const v = VOICE[elem - 1], t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = v.q * 0.6;
    f.frequency.value = Math.sqrt(v.n[0] * v.n[1]);
    const o = ctx.createOscillator();
    o.type = v.type;
    o.frequency.value = Math.sqrt(v.tone[0] * v.tone[1]);
    const og = ctx.createGain();
    og.gain.value = v.type === 'sine' ? 0.45 : 0.07;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(0.3, t, 0.07);
    src.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.audio.master);
    src.start(t, Math.random() * 0.5); o.start(t);
    this.hum = { src, o, g };
  }
}
