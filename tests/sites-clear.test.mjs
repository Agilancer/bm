// What stands in the land leaves the roads, the seals, people's spots and the dungeons' portal ground clear
// (tools/lands/check-sites.mjs does the looking).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('no place blocks a road, a seal, a spot or a portal\'s ground', () => {
  const r = spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../tools/lands/check-sites.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.split('\n').filter((l) => /BLOCKED|SLOPE/.test(l)).slice(0, 12).join('\n'));
});
