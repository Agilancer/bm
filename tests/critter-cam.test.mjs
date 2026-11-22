// The Critter camera (src/ui/crittercam.js): the C beside Auto while auto-play plays, the interface all away but it, and the
// view free round him. Its sums, its place on a phone, and that it's hooked in where it has to be.
//   node --test tests/critter-cam.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { orbit, lookAt } from '../src/ui/crittercam.js';
import { boxes } from '../src/ui/thumbs.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);
const unit = (c) => { near(Math.hypot(c.fx, c.fy, c.fz), 1); near(Math.hypot(c.ux, c.uy, c.uz), 1); near(c.fx * c.ux + c.fy * c.uy + c.fz * c.uz, 0); };

test('the view stands so far from him, looks straight at him, and is level', () => {
  for (const [yaw, pitch, d] of [[0, 0, 6], [1.3, 0.6, 10], [-2.9, 1.4, 3], [4, -0.4, 20]]) {
    const c = orbit(5, 2, -7, yaw, pitch, d);
    unit(c);
    near(Math.hypot(c.x - 5, c.y - 2, c.z + 7), d);
    // (Looking along f from where it stands comes to him.)
    near(c.x + c.fx * d, 5); near(c.y + c.fy * d, 2); near(c.z + c.fz * d, -7);
    near(Math.atan2(c.fx, c.fz), Math.atan2(Math.sin(yaw), Math.cos(yaw)));
    assert.ok(c.uy > 0, 'never upside down');
  }
  assert.ok(orbit(0, 0, 0, 0, 0.8, 5).y > 0, 'pitched up is over him, looking down');
  const l = lookAt(0, 10, 0, 3, 1, 4);
  unit(l);
  near(l.fx, 3 / Math.hypot(3, 9, 4)); near(l.fy, -9 / Math.hypot(3, 9, 4));
});

test('on a phone the C sits by Auto under the map, clear of everything (tests/touch-hud.test.mjs holds the rest)', () => {
  const b = boxes(844, 390), c = b.find((q) => q.id === 'critCam'), a = b.find((q) => q.id === 'autoBtn');
  assert.ok(c && a);
  assert.ok(c.x < a.x && Math.abs(c.y - a.y) < a.r, 'on Auto\'s left, level with it');
});

test('it\'s hooked into auto-play, the director stands aside for it, and the page puts everything but it away', () => {
  const ap = read('../src/ui/autoplay.js'), cam = read('../src/ui/autocam.js'), cc = read('../src/ui/crittercam.js');
  assert.ok(ap.includes('new CritterCam(') && ap.includes('this.critter.frame(dt, snap)') && ap.includes('this.critter.set(false)'));
  assert.ok(ap.includes("classList.toggle('auto-on'"), 'the C only shows while auto-play is on');
  assert.ok(cam.includes('!ap.critter?.on'), 'no director\'s shot while it\'s on');
  assert.ok(/body\.critter-cam > :not\(#view, #critCam, #critPad/.test(cc), 'all but the picture, the C and its pad hidden');
  assert.ok(/#critPad \{[^}]*z-index: 2147483000/.test(cc), 'the pad over everything, so no stick or button wakes under a finger');
  assert.ok(!/input\.(yaw|pitch)\s*[-+]?=/.test(cc), 'his aim is never touched: only the picture moves');
});
