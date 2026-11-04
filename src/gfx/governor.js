// Holding a phone at 60 fps. Resolution takes most of the strain, effects go when that isn't enough, and a phone that
// has cooled down climbs back. GPU timers are missing or misleading on phones, so this goes by two things every browser
// can give: how often frames come round, and how long the GPU takes to finish one (onSubmittedWorkDone). It touches
// nothing but its two callbacks, so tools/test_governor.mjs can run it against simulated phones.

export const PHONE_STEPS = [1.5, 1.25, 1, 0.88, 0.76, 0.66, 0.55];
export const PHONE_START = 2;

export class Governor {
  constructor({ apply, demote, steps = PHONE_STEPS, start = PHONE_START, targetMs = 1000 / 60 }) {
    this.apply = apply; this.demote = demote; this.steps = steps; this.targetMs = targetMs;
    this.lateMs = targetMs * 1.14;
    this.rung = start;
    this.settle = 0;       // windows to ignore after a change, which costs a hitch of its own
    this.goodT = 0;        // windows in a row with room to spare
    this.holdT = 0;        // windows in a row late with the GPU idle
    this.climbedAt = -1e9; this.upBlocked = 0; this.upWait = 20;
    this.probe = null; this.probeWait = 8; this.nextProbe = 0;
    this.effectsNext = false;
    apply(steps[start]);
  }

  setRung(r) { this.rung = r; this.apply(this.steps[r]); }

  // From frames timed before anyone's looking: start where 60 fps should hold, rather than arrive there by dropping
  // frames in the first fight. About a quarter of a frame doesn't shrink with the picture (skinning, shadows, culling).
  seed(ms) {
    const aim = this.targetMs * 0.8, from = this.steps[this.rung], last = this.steps.length - 1;
    const cost = (r) => ms * (0.25 + 0.75 * (this.steps[r] / from) ** 2);
    let r = 0;
    while (r < last && cost(r) > aim) r++;
    this.setRung(r);
    this.settle = 1;
  }

  // Below full resolution, take resolution and effects in turn.
  stepDown() {
    const last = this.steps.length - 1;
    if (this.steps[this.rung] <= 1 && (this.effectsNext || this.rung === last) && this.demote()) { this.effectsNext = false; return; }
    this.effectsNext = true;
    if (this.rung < last) this.setRung(this.rung + 1);
  }

  // Once a second or so: the mean time between frames, the mean time the GPU took over one, and the time in seconds.
  update(frameMs, busyMs, now) {
    if (this.settle > 0) { this.settle--; return; }
    const t = this.targetMs;
    const late = frameMs > this.lateMs;
    if (this.probe) {
      // Dropping a step was a guess. If the frames didn't speed up, it wasn't the pixels.
      if (frameMs > this.probe.frameMs * 0.92) { this.setRung(this.probe.rung); this.probeWait = Math.min(this.probeWait * 2, 240); }
      this.nextProbe = now + this.probeWait;
      this.probe = null;
      this.settle = 1;
      return;
    }
    if (late && busyMs > t * 0.85) {
      // The GPU can't keep up. A climb that led straight here isn't tried again for a while, and longer each time.
      if (now - this.climbedAt < 5) { this.upBlocked = now + this.upWait; this.upWait = Math.min(this.upWait * 2, 300); }
      this.goodT = 0; this.holdT = 0;
      const over = Math.min(frameMs, busyMs) / t;
      const n = Math.max(1, Math.min(3, Math.ceil(Math.log(over) / Math.log(1.3))));
      for (let i = 0; i < n; i++) this.stepDown();
      this.settle = 1;
      return;
    }
    if (late) {
      // Late with the GPU to spare: a browser's power saving, or the CPU. Fewer pixels shouldn't help, but now and then see.
      this.goodT = 0;
      if (++this.holdT >= 5 && now >= this.nextProbe && this.rung < this.steps.length - 1) {
        this.probe = { rung: this.rung, frameMs };
        this.setRung(this.rung + 1);
        this.holdT = 0;
        this.settle = 1;
      }
      return;
    }
    this.holdT = 0;
    this.goodT = busyMs < t * 0.58 ? this.goodT + 1 : 0;
    if (this.goodT >= 3 && this.rung > 0 && now >= this.upBlocked) {
      this.setRung(this.rung - 1);
      this.climbedAt = now;
      this.goodT = 0;
      this.settle = 1;
    }
  }
}
