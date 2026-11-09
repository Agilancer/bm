// Write src/core/voiced.js, the list of what each of Lisandra's voices has been recorded saying and how long each recording
// runs, from the recordings themselves (assets/voice/<voice>/<key>.mp3), and check the game's lines against it. (The cave's
// scene is timed by those lengths: src/core/opening-cave.js.)
//   node tools/voice/manifest.mjs assets/voice [lines.json]
// With lines.json (from script.mjs), every line in it must have its recording, or this exits 1 and says which are missing.
// (From the Bellmourn repository's tools/voice.)
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || 'assets/voice');
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../src/core/voiced.js');
const have = {}, secs = {};
let n = 0, bytes = 0;

// An MP3's length, from its frames: each frame's header gives its size and how many samples it holds.
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
const KBPS = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
function mp3Seconds(b) {
  let i = 0, t = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, br = b[i + 2] >> 4, sr = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
    if (ver === 1 || layer !== 1 || br === 0 || br === 15 || sr === 3) { i++; continue; }
    const rate = RATES[ver][sr], kbps = KBPS[ver === 3 ? 1 : 2][br], samples = ver === 3 ? 1152 : 576;
    i += Math.floor((samples / 8) * kbps * 1000 / rate) + pad;
    t += samples / rate;
  }
  return t;
}
for (const v of readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory()).sort()) {
  const keys = readdirSync(join(root, v)).filter((f) => f.endsWith('.mp3') && !f.includes('.tmp')).map((f) => f.slice(0, -4)).sort();
  if (!keys.length) continue;
  have[v] = keys.join(' ');
  n += keys.length;
  for (const k of keys) bytes += statSync(join(root, v, k + '.mp3')).size;
  secs[v] = keys.map((k) => `${k}:${mp3Seconds(readFileSync(join(root, v, k + '.mp3'))).toFixed(2)}`).join(' ');
}
const body = [
  '// Which lines each voice has been recorded saying (tools/voice/manifest.mjs writes this from the recordings themselves;',
  "// docs/VOICES.md): each voice's lines, by key (voicekey.js), space-separated. A line missing here is shown, not said.",
  'export const VOICED = {',
  ...Object.entries(have).map(([v, k]) => `  ${/^[A-Za-z_]\w*$/.test(v) ? v : JSON.stringify(v)}: '${k}',`),
  '};',
  '// And how long each runs, in seconds: key:seconds, space-separated.',
  'export const VOICE_SECONDS = {',
  ...Object.entries(secs).map(([v, k]) => `  ${/^[A-Za-z_]\w*$/.test(v) ? v : JSON.stringify(v)}: '${k}',`),
  '};',
  '',
].join('\n');
writeFileSync(out, body);
console.log(`${n} recordings (${(bytes / 1048576).toFixed(2)} MB) for ${Object.keys(have).length} voices -> src/core/voiced.js`);
if (process.argv[3] && existsSync(process.argv[3])) {
  const lines = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const missing = lines.filter((l) => !(have[l.voice] || '').split(' ').includes(l.key));
  for (const l of missing) console.log(`missing: ${l.voice}: ${l.text}`);
  console.log(missing.length ? `${missing.length} of ${lines.length} lines have no recording` : `all ${lines.length} lines are recorded`);
  process.exit(missing.length ? 1 : 0);
}
