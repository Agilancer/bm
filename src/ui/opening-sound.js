// The opening's sound: made on the spot (the summons' drone and the portal's roar, the zap when the glamour breaks, her
// snap, the candles popping, the scream at the edge of town), with the game's sound packs over it (assets/game/audio: the
// cave's air and drips, her book, the flash's burst, the candles catching and burning, the portal dying and the cave
// coming down). Played off the story's clock, so a moment is heard once, as it's crossed. And her voice, which is recorded
// (below).
import { H } from '../core/layout.js';
import { smoothstep } from '../core/math.js';
import {
  BURST_CANDLE, CANDLES, CANDLES_AT, CAVE, CAVE_LINE, CAVE_MOUTH, DAZZLE, HERD, DUST_AT, OPENING, PORTAL, REVEAL_AT, SNAP_AT, SPARK_AT,
  SWAP_AT,
} from '../core/opening.js';
import { CUES, SCRIPT, VOICE, spoken, voiceOf } from '../core/opening-script.js';
import { VOICED } from '../core/voiced.js';
import { voiceKey } from '../core/voicekey.js';

// Her voice (docs/VOICES.md): every line recorded ahead of time in the voice of whichever of her you see, one MP3 a line
// under assets/voice/<voice>/<key>.mp3, the opening's all fetched and decoded as soon as there's a context. A line with no
// recording is only shown.
const VOICE_LEVEL = 1.1;
const VOICE_LATE = 0.6;      // s: a line whose recording wasn't ready as it came up is still said this far in
const VOICE_WAIT = 0.7;      // s: a line waits this long at most for the one before to finish; longer, and that one's cut
// Her mouth, from the loudness of what she says (mouth): measured this many times a second, over a window this long,
// opening evenly in dB from this far under the line's loudest (shut) up to this far under it (wide), so most syllables
// open it part way; opening this fast and shutting this fast (s); and a little ahead of the sound, as a jaw moves before
// the voice it makes.
const MOUTH_RATE = 100, MOUTH_WINDOW = 0.03, MOUTH_FLOOR = 30, MOUTH_FULL = 2;
const MOUTH_OPEN = 0.03, MOUTH_SHUT = 0.07, MOUTH_LEAD = 0.04;
const mouths = new WeakMap();

// How open her mouth is through a recording, MOUTH_RATE times a second, 0 to 1.
function mouthOf(buf) {
  let env = mouths.get(buf);
  if (env) return env;
  const rate = buf.sampleRate, hop = rate / MOUTH_RATE, half = Math.round(rate * MOUTH_WINDOW / 2);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const n = Math.ceil(buf.length / hop), db = new Float32Array(n);
  let peak = -Infinity;
  for (let i = 0; i < n; i++) {
    const mid = Math.round(i * hop), a = Math.max(0, mid - half), b = Math.min(buf.length, mid + half);
    let sum = 0;
    for (const ch of chans) for (let s = a; s < b; s++) sum += ch[s] * ch[s];
    db[i] = 10 * Math.log10(sum / Math.max(1, (b - a) * chans.length) + 1e-10);
    peak = Math.max(peak, db[i]);
  }
  env = new Float32Array(n);
  const up = 1 - Math.exp(-1 / (MOUTH_RATE * MOUTH_OPEN)), down = 1 - Math.exp(-1 / (MOUTH_RATE * MOUTH_SHUT));
  let m = 0;
  for (let i = 0; i < n; i++) {
    const want = Math.min(Math.max((db[i] - peak + MOUTH_FLOOR) / (MOUTH_FLOOR - MOUTH_FULL), 0), 1);
    m += (want - m) * (want > m ? up : down);
    env[i] = m;
  }
  mouths.set(buf, env);
  return env;
}
const HAVE = new Map(Object.entries(VOICED).map(([v, s]) => [v, new Set(s.split(' '))]));
// Just the opening's lines, of all her recordings (her lines in the town are fetched as they're said: src/ui/folk.js).
const OPENING_LINES = new Set([
  ...Object.entries(SCRIPT).flatMap(([stage, ls]) => ls.map((l) => [Number(stage), l])),
  ...Object.values(CUES).map((l) => [OPENING.ESCORT, l]),
].filter(([, l]) => spoken(l)).map(([stage, l]) => `${voiceOf(stage, l)}/${voiceKey(spoken(l))}`));

// The pack sounds it uses, fetched as soon as there's sound, so none comes late.
const PACK = ['cave', 'cave_drips', 'fire_medium', 'page_turn', 'book_close', 'spell_impact_2', 'firebuff_1', 'light_torch_1', 'light_torch_2',
  'rock_meteor_throw_1', 'rock_meteor_throw_2', 'rock_meteor_swarm_1', 'rock_meteor_swarm_2', 'rock_wall_1', 'rock_wall_2', 'fireball_2',
  'clothing_1', 'firebuff_2', 'firespray_1', 'torch_impact_1', 'fireball_1', 'wind_calm'];

export class OpeningSound {
  constructor(audio) {
    this.a = audio;
    this.stage = -1; this.t = 0;
    this.drone = null; this.roar = null; this.room = null;
    this.ambK = 1;
    this.voices = null; this.saidId = null; this.speaking = null;
    this.loadVoices();
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

  // On "Tessariel.": the door's hum comes back for one breath, and goes.
  breath() {
    if (this.drone) return;
    this.startDrone();
    const d = this.drone, now = this.a.ctx.currentTime;
    d.g.gain.cancelScheduledValues(now); d.g.gain.setValueAtTime(0.0001, now);
    d.g.gain.exponentialRampToValueAtTime(0.16, now + 0.35); d.g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    for (const o of d.oscs) o.stop(now + 2.3);
    this.drone = null;
  }

  cutDrone() {
    if (!this.drone) return;
    const now = this.a.ctx.currentTime, { g, oscs } = this.drone;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.03);
    for (const o of oscs) o.stop(now + 0.1);
    this.drone = null;
  }

  stopAll() {
    this.hush(); this.saidId = null;
    this.cutDrone();
    for (const k of ['roar', 'room']) if (this[k]) { this[k].src.stop(); this[k] = null; }
    for (const l of Object.values(this.loops || {})) { l.g.gain.setTargetAtTime(0, this.a.ctx.currentTime, 0.1); setTimeout(() => l.src?.stop(), 600); }
    this.loops = {};
    for (const id of this.timers || []) clearTimeout(id);
    this.timers = [];
    this.setAmb(1);
  }

  // One of the pack's sounds, from (x, y, z), or in your head with no x; `later` seconds from now.
  fx(name, x, y, z, gain = 1, rate = 1, later = 0) {
    if (!later) { this.a.sound(name, x, y, z, gain, rate, true); return; }
    this.timers = this.timers || [];
    const id = setTimeout(() => { this.timers = this.timers.filter((k) => k !== id); this.a.sound(name, x, y, z, gain, rate, true); }, later * 1000);
    this.timers.push(id);
  }

  // One of the pack's loops, eased toward gain. (Its own, not the lands' beds: those are set from where you are.)
  loop(name, gain) {
    this.loops = this.loops || {};
    let l = this.loops[name];
    if (!l) {
      if (gain < 0.005) return;
      const g = this.a.ctx.createGain();
      g.gain.value = 0; g.connect(this.out(null, 0, 0, 0.15));
      l = this.loops[name] = { g, src: null };
      this.a.fetchBuffer(name).then((buf) => {
        if (this.loops[name] !== l) return;
        const src = this.a.ctx.createBufferSource();
        src.buffer = buf; src.loop = true; src.connect(g); src.start(0, Math.random() * buf.duration);
        l.src = src;
      }).catch(() => {});
    }
    l.g.gain.setTargetAtTime(gain, this.a.ctx.currentTime, 0.6);
  }

  // The birds and the wind, turned down in the cave (on top of the player's own setting).
  setAmb(k) {
    if (k === this.ambK) return;
    this.ambK = k;
    const a = this.a;
    if (a.amb) a.amb.gain.setTargetAtTime(a.ambienceLevel * k, a.ctx.currentTime, 0.25);
  }

  // ---- her voice ----
  loadVoices() {
    const a = this.a;
    if (this.voices || !a?.ctx) return;
    this.voices = new Map();
    for (const [v, keys] of HAVE) {
      for (const k of keys) {
        const id = `${v}/${k}`;
        if (!OPENING_LINES.has(id)) continue;
        fetch(`${a.base}assets/voice/${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((b) => a.ctx.decodeAudioData(b)).then((buf) => this.voices.set(id, buf)).catch(() => {});
      }
    }
  }

  // Say a line once (id: which line; age: seconds since it came up), from (x, y, z), or in your head with no x. Called
  // every frame it's up, so a recording that's still decoding is said when it's ready, if that's soon enough.
  say(id, voice, text, age, x, y, z, wet = 0.25) {
    if (!this.ok || id === this.saidId) return;
    this.loadVoices();
    const key = text && voiceKey(text);
    if (!key || !HAVE.get(voice)?.has(key)) { this.saidId = id; return; }
    const buf = this.voices.get(`${voice}/${key}`);
    if (!buf) { if (age > VOICE_LATE) this.saidId = id; return; }
    this.saidId = id;
    // The line before nearly done: this one waits for it, rather than cutting her off mid-word.
    const now = this.a.ctx.currentTime, left = this.speaking ? this.speaking.ends - now : 0;
    const at = left > 0 && left <= VOICE_WAIT ? now + left : now;
    if (at === now) this.hush();
    const src = this.a.ctx.createBufferSource(), g = this.out(x, y, z, wet);
    src.buffer = buf; g.gain.value = VOICE_LEVEL;
    src.connect(g); src.start(at);
    // (The line before, if it's finishing, still moves her mouth till it's done.)
    this.tail = at > now ? this.speaking : null;
    // Said from her mouth (not in your head) in the witch's voice: her jaw follows it (mouth).
    const env = x !== null && voice === VOICE.witch ? mouthOf(buf) : null;
    this.speaking = { src, g, at, env, ends: at + buf.duration };
    src.onended = () => { if (this.speaking?.src === src) this.speaking = null; if (this.tail?.src === src) this.tail = null; };
  }

  // How open the witch's mouth is now, 0 to 1, by what she's saying aloud.
  mouth() {
    if (!this.ok) return 0;
    const now = this.a.ctx.currentTime + MOUTH_LEAD;
    let m = 0;
    for (const s of [this.speaking, this.tail]) {
      if (!s?.env) continue;
      const f = (now - s.at) * MOUTH_RATE, i = Math.floor(f);
      if (i < 0 || i >= s.env.length) continue;
      m = Math.max(m, s.env[i] + ((s.env[i + 1] ?? 0) - s.env[i]) * (f - i));
    }
    return m;
  }

  // Cut her off: a new line, or the scene skipped.
  hush() {
    const s = this.speaking;
    if (!s) return;
    const now = this.a.ctx.currentTime;
    s.g.gain.setTargetAtTime(0, now, 0.04); s.src.stop(now + 0.25);
    this.speaking = null;
    this.tail?.src.stop(now); this.tail = null;
  }

  // ---- the moments ----
  zap(x, y, z) {
    const now = this.a.ctx.currentTime, d = this.out(x, y, z, 0.7), e = this.out(null, 0, 0, 0.2);
    this.noise(d, now, 0.32, 'bandpass', 4200, 1400, 0.9, 0.5, 0.002);
    this.tone(d, now, 0.28, 'square', 90, 1900, 0.09, 0.002);
    this.tone(d, now + 0.02, 0.22, 'sawtooth', 2600, 600, 0.05, 0.002);
    this.noise(e, now, 0.5, 'highpass', 6000, 3000, 0.7, 0.12, 0.001);
  }

  // The glamour bursting in your face: a crack and a deep whump of magic, and your ears ringing while your eyes swim.
  flashBurst(x, y, z) {
    this.zap(x, y, z);
    this.fx('spell_impact_2', x, y, z, 0.95);
    this.fx('firebuff_1', x, y, z, 0.8, 0.72);
    const now = this.a.ctx.currentTime, e = this.out(null, 0, 0, 0);
    this.tone(e, now + 0.05, DAZZLE, 'sine', 3520, 3380, 0.035, 0.08);
    this.tone(e, now + 0.05, DAZZLE * 0.7, 'sine', 5270, 5100, 0.012, 0.1);
  }

  // The portal dying, deep in the cave behind you: a blast that comes up through your feet.
  portalBlast() {
    this.thoom();
    this.fx('fireball_2', null, 0, 0, 0.75, 0.55);
    this.fx('rock_wall_1', null, 0, 0, 0.5, 0.7, 0.12);
  }

  // The mouth coming down: the crash, a roar of rock, and the last of it settling.
  caveIn(x, y, z) {
    this.crash(x, y, z);
    const m = [CAVE_MOUTH[0], CAVE_LINE[0][5] + 1.5, CAVE_MOUTH[1]];
    this.fx('rock_meteor_swarm_1', m[0], m[1], m[2], 1.0, 0.8);
    this.fx('rock_wall_1', m[0], m[1] + 1, m[2], 0.9, 0.75, 0.22);
    this.fx('rock_meteor_swarm_2', m[0], m[1] + 1.5, m[2], 0.75, 0.68, 0.5);
    this.fx('rock_wall_2', null, 0, 0, 0.4, 0.6, 0.9);
    this.fx('rock_meteor_throw_1', m[0], m[1] - 1, m[2], 0.35, 0.8, 2.1);
    this.fx('rock_meteor_throw_2', m[0], m[1] - 1, m[2], 0.25, 0.7, 3.4);
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
    if (!this.packed) { this.packed = true; for (const k of PACK) this.a.fetchBuffer(k).catch(() => {}); }
    // The cave's own air and its drips while you're in it, and the candles burning once they're lit.
    const cave = stage >= OPENING.WAKE && stage <= OPENING.LEAVE ? 1 - 0.7 * amb : 0;
    const lit = stage > OPENING.WAKE || t > CANDLES_AT;
    this.loop('cave', 0.22 * cave);
    this.loop('cave_drips', 0.18 * cave);
    // (And her hearth, lit with them: louder the nearer the story has brought you to it, as she stands at it.)
    const atFire = stage === OPENING.WAKE ? 0.1 * smoothstep(CAVE.toHearth + 2, CAVE.toHearth + 6, t) * (1 - smoothstep(CAVE.ledger, CAVE.toYou, t)) : 0;
    this.loop('fire_medium', lit ? (0.12 + atFire) * cave : 0);
    const book = [her[0], her[1] + 1.1, her[2]];
    switch (stage) {
      case OPENING.WAKE:
        if (t < SNAP_AT && !this.drone && prev < 0.5) this.startDrone();
        // Her book: a page turned as she reads the summons, and shut as she looks up at you.
        if (crossed(2.3) || crossed(5.0)) this.fx('page_turn', book[0], book[1], book[2], 0.35);
        if (crossed(6.85)) this.fx('book_close', book[0], book[1], book[2], 0.45);
        if (crossed(SWAP_AT)) this.flashBurst(her[0], her[1] + 1.3, her[2]);
        if (crossed(SWAP_AT + 0.25)) this.hush();      // the glamour's gone, and her young voice with it
        if (crossed(SWAP_AT + 2.0)) { this.crackThud(); this.fx('rock_meteor_throw_2', PORTAL[0], PORTAL[1], PORTAL[2], 0.3, 0.7); }
        if (crossed(SNAP_AT)) { this.cutDrone(); this.snap(her[0], her[1] + 1.4, her[2]); }
        // The candles: a whoosh as the wave of them catches, and again as it reaches the ledge's.
        if (crossed(CANDLES_AT)) this.fx('light_torch_1', her[0], her[1] + 2, her[2], 0.5);
        if (crossed(CANDLES_AT + 1.3)) this.fx('light_torch_2', snap[H.PX], snap[H.PY] + 2, snap[H.PZ], 0.3, 0.9);
        for (const k of CANDLES) if (crossed(k.at)) this.pop(k.x, k.y, k.z);
        // Her name for you: the door breathes once more behind her, and the flames lean in.
        if (crossed(REVEAL_AT + 0.15)) { this.breath(); this.whine(); this.crackThud(0.4); }
        // Embers on your knuckles; the spark; the candle bursting.
        if (crossed(CAVE.hands + 0.3)) this.fx('firebuff_2', snap[H.PX], snap[H.PY] + 1.1, snap[H.PZ], 0.22, 0.9);
        if (crossed(SPARK_AT)) this.fx('firespray_1', snap[H.PX], snap[H.PY] + 1.2, snap[H.PZ], 0.45, 1.3);
        if (crossed(SPARK_AT + 0.25)) {
          const c = CANDLES[BURST_CANDLE];
          this.fx('torch_impact_1', c.x, c.y, c.z, 0.6); this.fx('fireball_1', c.x, c.y, c.z, 0.35, 1.2);
        }
        break;
      case OPENING.HERD:
        if (crossed(HERD.go)) this.whine();
        break;
      case OPENING.LEAVE:
        // The door slipping as you go, and grit coming down from the roof.
        if (Math.floor(t / 4.7) !== Math.floor(prev / 4.7) && prev > 0) {
          this.crackThud(0.45);
          this.fx('rock_meteor_throw_1', snap[H.PX], snap[H.PY] + 2.6, snap[H.PZ], 0.22, 0.6);
        }
        break;
      case OPENING.COLLAPSE:
        if (crossed(3.0)) this.portalBlast();
        if (crossed(4.6)) { this.rumble(1.1, 0.5); this.fx('rock_wall_2', null, 0, 0, 0.45, 0.6); }
        if (crossed(DUST_AT - 0.05)) this.caveIn(her[0], her[1] + 1.5, her[2]);
        break;
    }
  }
}

