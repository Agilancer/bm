// The hour of the day, and what it does to the light. A grey, thin sun by day; a red hour at each end of it; a cold moon all night.
export const DAWN_HOUR = 6, DUSK_HOUR = 20;       // Day runs from six in the morning to eight at night.
// An hour of the day is 3 minutes of ours, an hour of the night is 1: 42 minutes of day, 10 of night.
export const secondsPerHour = (h) => (h >= DAWN_HOUR && h < DUSK_HOUR ? 180 : 60);

const NIGHT = { sun: [0.36, 0.44, 0.66], sky: [0.042, 0.052, 0.082], gnd: [0.013, 0.013, 0.018], fog: [0.024, 0.029, 0.043, 0.0024], glass: 0.1 };
const DAWN = { sun: [3.3, 1.75, 0.95], sky: [0.2, 0.17, 0.2], gnd: [0.07, 0.055, 0.05], fog: [0.36, 0.25, 0.24, 0.0021], glass: 0.55 };
const DAY = { sun: [3.1, 2.8, 2.4], sky: [0.3, 0.33, 0.38], gnd: [0.1, 0.09, 0.075], fog: [0.42, 0.43, 0.46, 0.0013], glass: 1 };
const DUSK = { sun: [4.0, 1.25, 0.5], sky: [0.22, 0.14, 0.16], gnd: [0.07, 0.05, 0.045], fog: [0.36, 0.17, 0.14, 0.002], glass: 0.55 };
const LATE = { sun: [0.8, 0.16, 0.1], sky: [0.09, 0.07, 0.1], gnd: [0.024, 0.02, 0.024], fog: [0.09, 0.055, 0.07, 0.0022], glass: 0.22 };

const KEYS = [[0, NIGHT], [5, NIGHT], [6, LATE], [7.2, DAWN], [10, DAY], [16, DAY], [17.3, DUSK], [18.6, LATE], [20.5, NIGHT], [24, NIGHT]];

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

const EAST = unit([0.9, 0, -0.44]), SOUTH = [-EAST[2], 0, EAST[0]];
const UP = 0.82, LEAN = 0.57;           // The most the sun climbs, and how far south of overhead it gets.
const LOWEST = 0.105;                   // A light any nearer the horizon throws shadows longer than the maps can hold. It stops at about 6 degrees.
const across = (a) => [EAST[0] * Math.cos(a) + SOUTH[0] * LEAN * Math.sin(a), UP * Math.sin(a), EAST[2] * Math.cos(a) + SOUTH[2] * LEAN * Math.sin(a)];

const mix3 = (a, b, t, n) => { const o = []; for (let i = 0; i < n; i++) o.push(a[i] + (b[i] - a[i]) * t); return o; };

// All of it for this hour: where the light comes from and its colour, and which of sun or moon that is.
export function daylight(hour) {
  const h = ((hour % 24) + 24) % 24;
  let k = 0;
  while (k + 2 < KEYS.length && KEYS[k + 1][0] <= h) k++;
  const [h0, a] = KEYS[k], [h1, b] = KEYS[k + 1];
  const t = sstep(0, 1, (h - h0) / (h1 - h0));
  const sky = mix3(a.sky, b.sky, t, 3), gnd = mix3(a.gnd, b.gnd, t, 3), fog = mix3(a.fog, b.fog, t, 4);
  let sun = mix3(a.sun, b.sun, t, 3);
  const glass = a.glass + (b.glass - a.glass) * t;
  const trueSun = across((h - 6) / 12 * Math.PI);
  // Moon up by the time the sun's gone. It goes the same way across a little out of step, and the light's swapped while there's none of it to see.
  const trueMoon = across(((h + 12 - 6.4) % 24) / 12 * Math.PI);
  const sunUp = sstep(-0.02, 0.16, trueSun[1]);
  const moonUp = sstep(0.0, 0.24, trueMoon[1]) * (1 - sstep(-0.1, 0.0, trueSun[1]));
  const isSun = trueSun[1] > -0.02;
  const scale = isSun ? sunUp : moonUp;
  sun = sun.map((v) => v * scale);
  const dir = (isSun ? trueSun : trueMoon).slice();
  if (dir[1] < LOWEST) dir[1] = LOWEST;
  return { hour: h, dir: unit(dir), trueSun, sun, sky, gnd, fog, glass, day: sstep(-0.1, 0.3, trueSun[1]) };
}

export function phaseName(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return 'Night';
  if (h < 8) return 'Dawn';
  if (h < 16.5) return 'Day';
  if (h < 19.5) return 'Dusk';
  return 'Night';
}
