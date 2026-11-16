// The Elder Dragon Gods' lines, for the recorder: [{ god, key, when, text }], key being the line's warning
// (`<god>_say_<when>_<n>`, src/core/delve-elder.js LINES), which is also its recording's name.
//   node tools/voice/gods/lines.mjs lines.json
import { writeFileSync } from 'node:fs';
import { LINES } from '../../../src/core/delve-elder.js';

const out = [];
for (const god in LINES) for (const when in LINES[god]) LINES[god][when].forEach((text, n) => out.push({ god, key: `${god}_say_${when}_${n}`, when, text }));
writeFileSync(process.argv[2] || 'lines.json', JSON.stringify(out, null, 1));
console.log(`${out.length} lines`);
