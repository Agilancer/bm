// How much memory the game holds at a phone's settings, and who holds it. A phone's browser kills a page that asks for more
// than it'll give (the screen goes white and the page loads again), so this is the number that decides whether the game
// runs there at all. Chromium is told it's an iPhone (so the game takes the Mobile tier) and runs on a software GPU: the
// sizes are what the game asks for, the speeds mean nothing. README.md, "When the browser closes the game".
//
//   NODE_PATH=$(npm root -g) node tools/phone_memory.mjs [seconds to watch after the load, 30]
//
// Prints, as the load ends, after the wait and after a forced collection: each thread's script memory (its heap, and its
// buffers: typed arrays and files fetched), what the game has asked the GPU for in textures and buffers, and each
// process's size. Env:
//   TOP=20    the biggest textures and buffers on the GPU, by the code that made them
//   WHO=1     written to tools/build/memory/: each thread's heap by the code that allocated what's still alive (a sampling
//             profile begun before its first line), and its typed arrays over 8 KB by where they were made
//   PRE='js'  run in the page once the game's up (a scene: see tools/autoplay/watch.mjs)   AUTOPLAY=1  auto-play on
//   DRAW=1    leave drawing on (the software GPU is slow, and the page may die of it with auto-play on)
//   Q='&light=2' more query string   PORT (8481)
// Needs the server (python tools/serve.py 8481) and Playwright's Chromium.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const wait = +(process.argv[2] || 30), TOP = +(process.env.TOP || 0), WHO = !!process.env.WHO;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const DEBUG_PORT = 9333;
const MB = (x) => Math.round(x / 1048576);

// Put in before the page's own code: every texture and buffer asked of the GPU, counted, by the code that asked.
const COUNT_GPU = () => {
  const G = (window.__gpu = { tex: 0, buf: 0, texBy: {}, bufBy: {} });
  const bytesPer = (f) => (/^bc[14]|^etc2-rgb8|^eac-r11/.test(f) ? 0.5 : /^bc|^etc2|^eac/.test(f) ? 1 : /32float/.test(f) ? (/rgba/.test(f) ? 16 : /rg/.test(f) ? 8 : 4)
    : /16(float|uint|sint|unorm)/.test(f) ? (/rgba/.test(f) ? 8 : /rg/.test(f) ? 4 : 2) : /^r8/.test(f) ? 1 : /^rg8/.test(f) ? 2 : /stencil8/.test(f) ? 8 : 4);
  const where = () => new Error().stack.split('\n').slice(3, 7).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/src\//, '').replace(/\?[^:]*:/, ':')).join(' < ');
  const P = GPUDevice.prototype, tex = P.createTexture, buf = P.createBuffer;
  const counted = (made, bytes, by, key, kind) => {
    G[kind] += bytes; by[key] = (by[key] || 0) + bytes;
    const destroy = made.destroy.bind(made); let gone = false;
    made.destroy = () => { if (!gone) { gone = true; G[kind] -= bytes; by[key] -= bytes; } destroy(); };
    return made;
  };
  P.createTexture = function (d) {
    const s = d.size, w = s.width ?? s[0], h = s.height ?? s[1] ?? 1, l = s.depthOrArrayLayers ?? s[2] ?? 1, mips = d.mipLevelCount || 1;
    const bytes = w * h * l * bytesPer(d.format) * (d.sampleCount || 1) * (mips > 1 ? 4 / 3 : 1);
    return counted(tex.call(this, d), bytes, G.texBy, `${w}x${h}x${l} ${d.format}${mips > 1 ? ' mips' : ''} @ ${where()}`, 'tex');
  };
  P.createBuffer = function (d) { return counted(buf.call(this, d), d.size, G.bufBy, `usage ${d.usage} @ ${where()}`, 'buf'); };
};
// Put into every thread before its first line (WHO=1): its typed arrays over 8 KB, by where they were made, while alive.
const COUNT_ARRAYS = `(() => {
  if (globalThis.__big) return;
  const live = new Map(); let n = 0;
  const reg = new FinalizationRegistry((k) => live.delete(k));
  const note = (o, bytes, what) => { if (bytes < 8192) return; const k = ++n; live.set(k, [bytes, what + ' ' + new Error().stack.split('\\n').slice(3, 8).map((l) => l.trim().replace(/^at /, '').replace(/https?:\\/\\/[^/]+\\//, '')).join(' < ')]); reg.register(o, k); };
  for (const name of ['ArrayBuffer', 'SharedArrayBuffer', 'Float32Array', 'Float64Array', 'Uint8Array', 'Uint8ClampedArray', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array']) {
    const C = globalThis[name]; if (!C) continue;
    const P = new Proxy(C, { construct(t, args, nt) { const o = Reflect.construct(t, args, nt === P ? t : nt); const a = args[0]; if (name.endsWith('Buffer') || !(a instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && a instanceof SharedArrayBuffer))) note(name.endsWith('Buffer') ? o : o.buffer, o.byteLength, name); return o; } });
    C.prototype.constructor = P; globalThis[name] = P;
  }
  const sl = ArrayBuffer.prototype.slice; ArrayBuffer.prototype.slice = function (...a) { const o = sl.apply(this, a); note(o, o.byteLength, 'slice'); return o; };
  const ab = Response.prototype.arrayBuffer; Response.prototype.arrayBuffer = async function () { const o = await ab.call(this); note(o, o.byteLength, 'fetched ' + (this.url || '').split('/').slice(-2).join('/')); return o; };
  globalThis.__big = () => { const by = {}; let tot = 0; for (const [bytes, k] of live.values()) { by[k] = (by[k] || 0) + bytes; tot += bytes; } return { tot, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 45) }; };
})()`;

const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox', `--remote-debugging-port=${DEBUG_PORT}`] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
const page = await ctx.newPage();
page.on('crash', () => console.log('PAGE CRASHED'));
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e.stack || e).slice(0, 600)));
await page.addInitScript(COUNT_GPU);

// The debugger, spoken to directly, so every thread of the page can be asked (Playwright only speaks to the page's own).
const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()).webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const waits = new Map(), threads = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id;
  waits.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  setTimeout(() => { if (waits.delete(i)) rej(new Error(`${method} timed out`)); }, 60000);
});
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waits.has(m.id)) { const w = waits.get(m.id); waits.delete(m.id); w(m); }
  if (m.method === 'Target.detachedFromTarget') threads.delete(m.params.sessionId);
  if (m.method !== 'Target.attachedToTarget') return;
  const { sessionId, targetInfo } = m.params;
  threads.set(sessionId, { type: targetInfo.type, name: targetInfo.type === 'page' ? 'the page' : targetInfo.url.split('/').pop().slice(0, 40) });
  try {
    if (WHO) {
      if (targetInfo.type === 'page') { await send('Page.enable', {}, sessionId); await send('Page.addScriptToEvaluateOnNewDocument', { source: COUNT_ARRAYS }, sessionId); } else await send('Runtime.evaluate', { expression: COUNT_ARRAYS }, sessionId);
      await send('HeapProfiler.enable', {}, sessionId);
      await send('HeapProfiler.startSampling', { samplingInterval: 32768 }, sessionId);
    }
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: WHO, flatten: true }, sessionId);
  } catch (err) { console.log('attach', targetInfo.url, err.message); }
  send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {});
};
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: WHO, flatten: true, filter: [{ type: 'page' }, { type: 'worker' }] });
await new Promise((r) => setTimeout(r, 1000));

const processes = () => {
  const by = {};
  for (const l of execSync('ps -eo rss,args').toString().split('\n')) { const t = /chrom.*--type=(\S+)/.exec(l); if (t) by[t[1]] = Math.max(by[t[1]] || 0, Math.round(+l.trim().split(/\s+/)[0] / 1024)); }
  return `page ${by.renderer} MB, GPU ${by['gpu-process']} MB`;
};
const look = async (name) => {
  const rows = [];
  let total = 0;
  for (const [sid, t] of threads) {
    const h = await send('Runtime.getHeapUsage', {}, sid).catch(() => null);
    if (!h) { rows.push([0, `      ?  ${t.name}`]); continue; }
    const sum = h.usedSize + (h.backingStorageSize || 0) + (h.embedderHeapUsedSize || 0);
    total += sum;
    rows.push([sum, `${String(MB(sum)).padStart(7)} MB  ${t.name}: heap ${MB(h.usedSize)}, buffers ${MB(h.backingStorageSize || 0)}`]);
  }
  const g = await page.evaluate(() => ({ tex: window.__gpu.tex, buf: window.__gpu.buf })).catch(() => ({ tex: 0, buf: 0 }));
  console.log(`== ${name}: script ${MB(total)} MB; asked of the GPU: textures ${MB(g.tex)} MB, buffers ${MB(g.buf)} MB; processes: ${processes()}`);
  for (const r of rows.sort((x, y) => y[0] - x[0])) console.log(r[1]);
};

const t0 = Date.now();
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
console.log(`up in ${Math.round((Date.now() - t0) / 1000)} s, tier ${await page.evaluate(() => bm.renderer.tier.name)}, ${await page.evaluate(() => bm.renderer.heroCast?.length ?? 0)} other heroes`);
await page.evaluate(`${process.env.DRAW ? '' : 'bm.renderer.frame = () => {};'} ${process.env.PRE || ''}; ${process.env.AUTOPLAY ? 'bm.view.lands.cheats.noDamage = true; if (!bm.view.autoplay.on) bm.view.autoplay.toggle(true);' : ''}`);
await look('as the load ends');
for (let s = 30; s <= wait; s += 30) { await page.waitForTimeout(30000); await look(`${s} s on`); }
if (wait % 30) await page.waitForTimeout((wait % 30) * 1000);
for (const sid of threads.keys()) await send('HeapProfiler.collectGarbage', {}, sid).catch(() => {});
await page.waitForTimeout(3000);
await look('collected');
if (TOP) {
  const r = await page.evaluate((n) => { const f = (o) => Object.entries(o).filter((e) => e[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => `${(v / 1048576).toFixed(1).padStart(7)}  ${k}`); return { tex: f(window.__gpu.texBy), buf: f(window.__gpu.bufBy) }; }, TOP);
  console.log(`textures (MB):\n${r.tex.join('\n')}\nbuffers (MB):\n${r.buf.join('\n')}`);
}
if (WHO) {
  const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'build', 'memory');
  fs.mkdirSync(out, { recursive: true });
  const flat = (head) => {
    const by = {};
    const walk = (n, trail) => {
      const f = n.callFrame, here = [`${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`, ...trail].slice(0, 4);
      if (n.selfSize) by[here.join(' < ')] = (by[here.join(' < ')] || 0) + n.selfSize;
      for (const c of n.children || []) walk(c, here);
    };
    walk(head, []);
    return Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 45);
  };
  for (const [sid, t] of threads) {
    try {
      const { profile } = await send('HeapProfiler.getSamplingProfile', {}, sid);
      const big = JSON.parse((await send('Runtime.evaluate', { expression: 'JSON.stringify(globalThis.__big ? __big() : null)', returnByValue: true }, sid)).result.value);
      const line = ([k, v]) => `${(v / 1048576).toFixed(1).padStart(7)}  ${k}`;
      const file = path.join(out, `${t.name.replace(/\W+/g, '_')}-${sid.slice(0, 4)}.txt`);
      fs.writeFileSync(file, `${t.name}\n-- heap still alive, by the code that allocated it (MB)\n${flat(profile.head).map(line).join('\n')}\n-- typed arrays still alive, by where they were made (MB)${big ? ` of ${MB(big.tot)}\n${big.top.map(line).join('\n')}` : ''}\n`);
      console.log('written', file);
    } catch (err) { console.log(t.name, err.message); }
  }
}
await b.close();
process.exit(0);
