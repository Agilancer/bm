// What the east's walking map and its trips came to last time they were looked over (baseline.json, committed): map.mjs and
// trips.mjs check a run against it and fail if anything's got worse — a count up, or a walk failing that didn't — so the
// next pass over the houses or the castle can't quietly lock doors or strand towers again. `--baseline` writes this run's
// as the new one (after looking it over: docs/PHOBOS-PATHS.md).
import fs from 'node:fs';
const FILE = new URL('./baseline.json', import.meta.url);
const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
// (part: 'map' or 'trips'; now: its numbers, each lower the better; known: for trips, the walks allowed to fail.)
export function against(part, now, known = null) {
  const B = read(), was = B[part];
  if (process.argv.includes('--baseline') || !was) {
    B[part] = { ...now, ...(known ? { known } : {}) };
    fs.writeFileSync(FILE, JSON.stringify(B, null, 1) + '\n');
    console.log(`baseline: ${part} written`);
    return true;
  }
  const worse = Object.keys(now).filter((k) => typeof was[k] === 'number' && now[k] > was[k]).map((k) => `${k} ${was[k]} -> ${now[k]}`);
  const fresh = known ? known.filter((k) => !(was.known || []).includes(k)) : [];
  for (const w of worse) console.log(`WORSE than the baseline: ${w}`);
  for (const f of fresh) console.log(`NEW failure (not in the baseline): ${f}`);
  if (!worse.length && !fresh.length) console.log(`baseline: ${part} no worse`);
  return !worse.length && !fresh.length;
}
