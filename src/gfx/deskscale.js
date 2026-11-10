// Dynamic resolution on a PC: hold the display's refresh rate, spend what's left on pixels. (Phones: gfx/governor.js.)
// Called once per window of frames (main.js, govern) with the GPU's time per frame; returns the resolution step to use.
//
// Two rules keep it from sinking for good, which it used to do (docs/RENDERING.md, "Resolution that comes back"):
// - One slow window is not a trend (a load, a teleport, the first frames at a new size): it takes two in a row to step down.
// - It steps back up when the frame would still fit even if all of it grew with the pixels. It doesn't (shadows and the
//   like stay put), so a step up can't overshoot into a step back down, and the GPU clocking down when it's idle (which
//   makes a light frame look slower than it is) only makes it more careful.

// Resolution moves in fixed steps, so each size only has to be built once.
export const STEPS = [1, 0.88, 0.76, 0.66, 0.55];
const SLOW = 0.92;     // of the budget: too slow
const FITS = 0.85;     // of the budget: what a step up must stay under, at the worst
const BELOW_60 = 15.3; // ms: not even 60 fps

// st: this game's running state ({ slow, fast }). gpuMs: GPU time per frame. frameMs: time between frames. step: the
// step in use. demote: turns an effect off, false when none are left. Returns the step to use.
export function deskStep(st, gpuMs, frameMs, step, demote) {
  const budget = Math.max(1000 / 144, Math.min(frameMs, 1000 / 60));
  st.slow = gpuMs > budget * SLOW ? (st.slow || 0) + 1 : 0;
  const grow = step > 0 ? (STEPS[step - 1] / STEPS[step]) ** 2 : Infinity;
  st.fast = gpuMs * grow < budget * FITS ? (st.fast || 0) + 1 : 0;
  if (st.slow >= 2) {
    st.slow = 0; st.fast = 0;
    // Chasing a high-refresh display only ever spends resolution. Effects go only when 60 Hz itself is out of reach.
    if (gpuMs > BELOW_60 && step >= 2) return demote() ? step : Math.min(step + 1, STEPS.length - 1);
    return Math.min(step + 1, Math.max(step, 2));
  }
  if (st.fast >= 2 && step > 0) { st.fast = 0; return step - 1; }
  return step;
}
