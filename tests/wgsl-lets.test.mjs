// WGSL takes one declaration a statement: `let a = 1.0, b = 2.0;` won't parse, and the frame it's in is lost with it (nothing
// in node compiles the shaders, so this reads them). Every template string in src/gfx that holds WGSL is looked through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('no chained let or var in the shaders', () => {
  const bad = [];
  for (const f of readdirSync('src/gfx').filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(`src/gfx/${f}`, 'utf8');
    for (const m of src.matchAll(/`([^`]*)`/g)) {
      if (!/@(fragment|vertex|compute)|\bfn \w+\(|vec[234]f/.test(m[1])) continue;
      for (const line of m[1].split('\n')) {
        // (A comma at the top level of the statement, then another name and an equals.)
        const s = line.trim(); if (!/^(let|var)\s/.test(s)) continue;
        let depth = 0, top = '';
        for (const c of s) { if ('([{<'.includes(c)) depth++; else if (')]}>'.includes(c)) depth--; else if (!depth) top += c; }
        if (/,\s*[A-Za-z_]\w*\s*(:\s*\w+\s*)?=[^=]/.test(top)) bad.push(`${f}: ${s.slice(0, 100)}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});
