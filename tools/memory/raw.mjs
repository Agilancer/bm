// The game in a plain Chrome with no automation library attached (Playwright's network watching keeps a copy of every file
// each thread downloads, which is hundreds of MB that a player's browser never holds). Spoken to over the debugger's socket
// only: the page target for emulation and evaluation; worker threads are attached only when a step asks (ATTACH=1).
//   node raw.mjs steps.json
// Env: PORT (8861)  PHONE=pixel|iphone|small|tablet|'' (desk)  Q='&light=1'  NOAUTO=1  TIMEOUT (s, 600)  W,H
//      ATTACH=1 (watch worker threads' heaps; a little memory of its own)  CHROME (path)  FLAGS  OUT
//      DEBUG_PORT (unset: a free one of Chrome's choosing, said at the start; set: refused if taken; tools/chrome-port.mjs)
// steps: [{eval}|{wait}|{shot}|{log}|{mem}|{peak}|{regions}|{dump}|{threads}|{gc}|{top}|{x}|{touch:[type,x,y,id]}|{tap:[x,y]}|{key}
//         |{sample}|{snap}]  ({peak} and {sample}: what a thread makes, and the process's height uncollected; see below)
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portFlag, chromeSocket, openSocket } from '../chrome-port.mjs';

const here = path.dirname(process.argv[1]);
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = process.env.PORT || '8861';
const out = process.env.OUT || path.join(path.dirname(path.resolve(process.argv[2])), 'shots');
fs.mkdirSync(out, { recursive: true });
const PHONES = {
  pixel: { w: 915, h: 412, dpr: 2.625, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', plat: 'Android' },
  iphone: { w: 844, h: 390, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', plat: 'iOS' },
  small: { w: 667, h: 375, dpr: 2, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', plat: 'iOS' },
  tablet: { w: 1180, h: 820, dpr: 2, ua: 'Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', plat: 'iOS' },
};
const ph = PHONES[process.env.PHONE || ''];
const W = ph ? ph.w : +(process.env.W || 1280), H = ph ? ph.h : +(process.env.H || 720);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-raw-'));
const tag = path.basename(profile);
const MB = (x) => Math.round(x / 1048576);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chromePath = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));

const INIT = fs.readFileSync(path.join(here, 'init.js'), 'utf8');

const debugFlag = await portFlag().catch((e) => { console.log(e.message); process.exit(1); });
const chrome = spawn(chromePath, [`--user-data-dir=${profile}`, debugFlag, '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check',
  '--window-position=-3000,0', `--window-size=${Math.max(W + 40, 500)},${H + 160}`, '--autoplay-policy=no-user-gesture-required', '--disable-features=CalculateNativeWinOcclusion',
  ...(process.env.FLAGS ? process.env.FLAGS.split(' ') : []), 'about:blank'], { stdio: 'ignore' });
let chromeGone = false;
chrome.on('exit', () => { chromeGone = true; });
// (This Chrome's own socket, from its profile: never another run's Chrome, whatever port it's on.)
const dbg = await chromeSocket(profile, { seconds: 15, alive: () => !chromeGone });
if (!dbg) { console.log('chrome did not start'); try { chrome.kill(); } catch { /* */ } process.exit(1); }
console.log(`debugger on port ${dbg.port}`);
const ws = await openSocket(dbg.url).catch((e) => { console.log(e.message); try { chrome.kill(); } catch { /* */ } process.exit(1); });
let snapChunks = null, lastLayers = null;
let id = 0; const waits = new Map(), threads = new Map(), traced = []; let traceDone = null;
const send = (method, params = {}, sessionId, timeout = 60000) => new Promise((res, rej) => {
  const i = ++id;
  waits.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  setTimeout(() => { if (waits.delete(i)) rej(new Error(`${method} timed out`)); }, timeout);
});
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waits.has(m.id)) { const w = waits.get(m.id); waits.delete(m.id); w(m); return; }
  if (m.method === 'Tracing.dataCollected') traced.push(...m.params.value);
  else if (m.method === 'Tracing.tracingComplete') traceDone?.();
  else if (m.method === 'Target.detachedFromTarget') threads.delete(m.params.sessionId);
  else if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'worker') {
    const { sessionId, targetInfo } = m.params;
    threads.set(sessionId, { name: targetInfo.url.split('/').pop().split('?')[0].slice(0, 40) });
    send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId).catch(() => {});
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const t = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    if (m.params.type === 'error' || m.params.type === 'warning' || /^graphics:|^memory:|^loader:|^phone:/.test(t)) { if (!/preloaded using link preload|powerPreference/.test(t)) console.log(m.params.type, t.slice(0, 500)); }
    logs.push(t);
  } else if (m.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR', (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 500));
  else if (m.method === 'Inspector.targetCrashed') console.log('PAGE CRASHED');
  else if (m.method === 'LayerTree.layerTreeDidChange' && m.params.layers) lastLayers = m.params.layers;
  else if (m.method === 'HeapProfiler.addHeapSnapshotChunk') snapChunks?.push(m.params.chunk);
};
const targets = (await send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page');
const { sessionId: S } = await send('Target.attachToTarget', { targetId: targets[0].targetId, flatten: true });
threads.set(S, { name: 'the page' });
await send('Page.enable', {}, S); await send('Runtime.enable', {}, S); await send('Inspector.enable', {}, S).catch(() => {});
if (ph) {
  await send('Emulation.setUserAgentOverride', { userAgent: ph.ua, platform: ph.plat === 'iOS' ? 'iPhone' : 'Linux armv81', userAgentMetadata: { mobile: true, platform: ph.plat, platformVersion: '14', architecture: '', model: 'Pixel 7', brands: [{ brand: 'Chromium', version: '130' }] } }, S);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: ph.dpr, mobile: true, screenWidth: W, screenHeight: H, screenOrientation: { type: 'landscapePrimary', angle: 90 } }, S);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, S);
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: false }, S).catch(() => {});
} else await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: +(process.env.DPR || 1), mobile: false }, S);
if (process.env.DM) await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'deviceMemory', { get: () => ${+process.env.DM} });` }, S);
if (process.env.HC) await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${+process.env.HC} });` }, S);
// (NOINIT=1: without init.js, whose counting costs time of its own, to time the game as a player has it.)
if (!process.env.NOINIT) await send('Page.addScriptToEvaluateOnNewDocument', { source: INIT }, S);
if (process.env.GFX) await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { const k = 'velscour.settings'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o.gfx = '${process.env.GFX}'; localStorage.setItem(k, JSON.stringify(o)); } catch {}` }, S);
// LS='{"key":"value"}': put in the page's storage before it starts (the threads' consent, the keep question...).
if (process.env.LS) await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { for (const [k, v] of Object.entries(${process.env.LS})) if (localStorage.getItem(k) === null) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {}` }, S);
if (process.env.ATTACH) await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, S);

const ev = async (expr, awaitPromise = true) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true, userGesture: true }, S, 120000);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const ps = (file) => execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(here, file)}" -tag ${tag}`, { encoding: 'utf8' }).trim();
const processes = () => {
  try {
    const by = {};
    for (const l of ps('procs.ps1').split(/\n/)) { const [t, ws_, pv] = l.trim().split(' '); if (!by[t] || +pv > by[t][1]) by[t] = [+ws_, +pv]; }
    return { page: by.renderer?.[1] || 0, gpu: by['gpu-process']?.[1] || 0, text: `page ${by.renderer?.[1]} MB, GPU process ${by['gpu-process']?.[1]} MB` };
  } catch (e) { return { page: 0, gpu: 0, text: String(e.message).slice(0, 100) }; }
};
// The page process's size, read every so often, for its peak.
let peak = 0, peakGpu = 0, watching = true;
(async () => { while (watching) { const p = processes(); peak = Math.max(peak, p.page); peakGpu = Math.max(peakGpu, p.gpu); await sleep(+(process.env.POLL || 700)); } })();
const mem = async (label) => {
  const g = await ev('({ tex: window.__gpu.tex, buf: window.__gpu.buf, pt: window.__gpu.peakTex, pb: window.__gpu.peakBuf, js: performance.memory?.usedJSHeapSize || 0 })').catch(() => null);
  const p = processes();
  console.log(`== ${label}: ${p.text} (peaks so far ${peak} and ${peakGpu}); GPU asked: textures ${g ? MB(g.tex) : '?'} MB, buffers ${g ? MB(g.buf) : '?'} MB; page heap ${g ? MB(g.js) : '?'} MB`);
};
const threadMem = async (label) => {
  const rows = []; let total = 0, committed = 0, bufs = 0;
  for (const [sid, t] of threads) {
    const h = await send('Runtime.getHeapUsage', {}, sid, 8000).catch(() => null);
    if (!h) { rows.push([0, `? ${t.name}`]); continue; }
    const sum = h.usedSize + (h.backingStorageSize || 0) + (h.embedderHeapUsedSize || 0);
    total += sum; committed += h.totalSize || 0; bufs += h.backingStorageSize || 0;
    rows.push([sum, `${MB(sum)} ${t.name} (heap ${MB(h.usedSize)} of ${MB(h.totalSize || 0)}, buffers ${MB(h.backingStorageSize || 0)})`]);
  }
  console.log(`== ${label}: script memory ${MB(total)} MB over ${threads.size} threads (heaps committed ${MB(committed)}, buffers ${MB(bufs)}): ${rows.sort((x, y) => y[0] - x[0]).map((r) => r[1]).join(' | ')}`);
};
const dump = async (label) => {
  traced.length = 0;
  await send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [] } } });
  await send('Tracing.requestMemoryDump', { levelOfDetail: 'detailed' }, undefined, 90000).catch((e) => console.log('dump', e.message));
  const done = new Promise((r) => { traceDone = r; });
  await send('Tracing.end');
  await Promise.race([done, sleep(60000)]);
  const procs = {};
  for (const e of traced) {
    if (e.ph === 'M' && e.name === 'process_name') (procs[e.pid] ||= {}).name = e.args.name;
    if (e.ph !== 'v' || !e.args?.dumps?.allocators) continue;
    const P = (procs[e.pid] ||= {}); P.alloc ||= {};
    for (const [k, v] of Object.entries(e.args.dumps.allocators)) { const sz = v.attrs?.size?.value; if (sz) P.alloc[k] = parseInt(sz, 16); }
  }
  let said = false;
  for (const P of Object.values(procs)) {
    if (!P.alloc || !(P.alloc.v8 > 30e6)) continue;
    said = true;
    const g = (k) => MB(P.alloc[k] || 0);
    console.log(`== ${label}: by Chrome's account: v8 ${g('v8')} MB (page ${g('v8/main')}, workers ${g('v8/workers')}), array buffers ${g('partition_alloc/partitions/array_buffer')}, buffer pool ${g('partition_alloc/partitions/buffer')}, malloc ${g('malloc')}, blink ${g('blink_gc')}, gpu ${g('gpu')}, shared ${g('shared_memory')}, audio ${g('web_audio') || g('audio')}`);
    if (process.env.UNDER) console.log(Object.entries(P.alloc).filter(([k]) => k.startsWith(process.env.UNDER) && !k.includes('/__')).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${String(MB(v)).padStart(6)}  ${k}`).join('\n'));
  }
  if (!said) console.log(`== ${label}: the page's process did not answer the memory dump`);
  // (GPUDUMP=1: the GPU process's own account as well, its allocators two deep, the biggest first.)
  if (process.env.GPUDUMP) for (const P of Object.values(procs)) {
    if (!P.alloc || !/gpu/i.test(P.name || '')) continue;
    const two = Object.entries(P.alloc).filter(([k]) => k.split('/').length <= 2 && !k.includes('/__')).sort((a, b) => b[1] - a[1]).slice(0, 18);
    console.log(`== ${label}: the GPU process by Chrome's account: ${two.map(([k, v]) => `${k} ${MB(v)}`).join(', ')}`);
  }
};

const t0 = Date.now();
const url = `http://localhost:${port}/?${process.env.NOAUTO ? 'x' : process.env.OPENING ? 'auto' : 'auto&noopening'}${process.env.Q || ''}`;
await send('Page.navigate', { url }, S);
if (!process.env.NOAUTO) {
  const limit = +(process.env.TIMEOUT || 600) * 1000;
  let up = false;
  while (Date.now() - t0 < limit) { await sleep(500); up = await ev('!!(window.bm && bm.snap && bm.snap())').catch(() => false); if (up) break; }
  if (!up) console.log('NOT UP in time');
  else console.log(`up in ${((Date.now() - t0) / 1000).toFixed(1)} s, tier ${await ev('bm.renderer.tier.name')}, page process peak while loading ${peak} MB (GPU process ${peakGpu})`);
}
for (const s of steps) {
  try {
    if (s.wait) await sleep(s.wait);
    if (s.eval) await ev(`(async () => { ${s.eval} })()`);
    if (s.log) console.log(JSON.stringify(await ev(`(async () => { ${s.log} })()`)));
    if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }, S); fs.writeFileSync(path.join(out, `${s.shot}.png`), Buffer.from(r.data, 'base64')); console.log('shot', s.shot); }
    if (s.gc) { for (const sid of threads.keys()) await send('HeapProfiler.collectGarbage', {}, sid, 15000).catch(() => {}); await sleep(2500); }
    if (s.mem) await mem(s.mem);
    // {"peak": "label"}: the page's and the GPU process's biggest since the last "peak" (or the start), and begin again.
    if (s.peak) { console.log(`== ${s.peak}: page process peak ${peak} MB, GPU process peak ${peakGpu} MB`); peak = 0; peakGpu = 0; }
    if (s.threads) await threadMem(s.threads);
    if (s.regions) console.log(`== ${s.regions}: ${ps('regions.ps1').replace(/\r/g, '')}`);
    if (s.dump) await dump(s.dump);
    if (s.x) console.log(`== ${s.x}: ` + await ev('window.__xsum()'));
    if (s.top) console.log(await ev(`(() => { const f = (o) => Object.entries(o).filter((e) => e[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, ${s.top}).map(([k, v]) => (v / 1048576).toFixed(1).padStart(7) + '  ' + k).join('\\n'); return 'textures (MB):\\n' + f(window.__gpu.texBy) + '\\nbuffers (MB):\\n' + f(window.__gpu.bufBy); })()`));
    if (s.touch) { const [type, x, y, tid = 1] = s.touch; await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: tid, radiusX: 8, radiusY: 8, force: 1 }] }, S); }
    if (s.tap) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.tap[0], y: s.tap[1], id: 1 }] }, S); await sleep(60); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, S); }
    // {"tapOn": "css selector", "text": "words in it"}: a finger on the middle of the first that's shown (waits up to 60 s for it).
    // "hold": ms the finger stays down (60 if not said: a tap).
    if (s.tapOn) {
      let at = null;
      for (let i = 0; i < 120 && !at; i++) {
        at = await ev(`(() => { for (const e of document.querySelectorAll(${JSON.stringify(s.tapOn)})) { const r = e.getBoundingClientRect(); if (r.width && e.offsetParent !== null && (!${JSON.stringify(s.text || '')} || e.textContent.includes(${JSON.stringify(s.text || '')}))) return [r.x + r.width / 2, r.y + r.height / 2]; } return null; })()`).catch(() => null);
        if (!at) await sleep(500);
      }
      if (!at) console.log('nothing to tap', s.tapOn, s.text || '');
      else { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at[0], y: at[1], id: 1 }] }, S); await sleep(s.hold || 60); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, S); console.log(s.hold ? `held ${s.hold} ms on` : 'tapped', s.tapOn, s.text || '', at.map(Math.round)); }
    }
    if (s.click) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: s.click[0], y: s.click[1], button: 'left', clickCount: 1 }, S); }
    if (s.key) { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: s.key, code: s.code || s.key, windowsVirtualKeyCode: s.vk || 0 }, S); }
    if (s.emulate) await send(s.emulate[0], s.emulate[1], S);
    // {"layers": "label"}: the compositor's layers that paint, and what their pictures weigh at the screen's pixel ratio (as an
    // iPhone keeps one for each), the biggest named.
    if (s.layers) {
      lastLayers = null;
      await send('LayerTree.enable', {}, S).catch(() => {});
      for (let i = 0; i < 20 && !lastLayers; i++) await sleep(150);
      await sleep(400);
      const dpr = ph ? ph.dpr : +(process.env.DPR || 1);
      const L = (lastLayers || []).filter((l) => l.drawsContent && !l.invisible);
      const nodeName = async (l) => { if (!l.backendNodeId) return ''; try { const d = await send('DOM.describeNode', { backendNodeId: l.backendNodeId }, S); const n = d.node; return (n.localName || n.nodeName) + (n.attributes ? (() => { const a = n.attributes; const i = a.indexOf('id'), c = a.indexOf('class'); return (i >= 0 ? '#' + a[i + 1] : '') + (c >= 0 ? '.' + a[c + 1].split(' ')[0] : ''); })() : ''); } catch { return ''; } };
      await send('DOM.enable', {}, S).catch(() => {});
      await send('DOM.getDocument', { depth: 0 }, S).catch(() => {});
      const rows = [];
      let total = 0;
      for (const l of L) { const b = l.width * l.height * dpr * dpr * 4; total += b; rows.push([b, l]); }
      rows.sort((a, b) => b[0] - a[0]);
      const named = [];
      // (WHY=1: and why the compositor gave it a layer of its own, as it says.)
      const why = async (l) => { if (!process.env.WHY) return ''; try { const r = await send('LayerTree.compositingReasons', { layerId: l.layerId }, S); return ` [${(r.compositingReasonIds || r.compositingReasons || []).join(',')}]`; } catch { return ''; } };
      for (const [b, l] of rows.slice(0, 12)) named.push(`${MB(b)} MB ${Math.round(l.width)}x${Math.round(l.height)} ${await nodeName(l)}${await why(l)}`);
      console.log(`== ${s.layers}: ${L.length} painted layers of ${(lastLayers || []).length}, ${MB(total)} MB at x${dpr}: ${named.join(' | ')}`);
      await send('LayerTree.disable', {}, S).catch(() => {});
    }
    // {"sample": "sim.worker", "ms": 15000, "most": 25}: what the thread whose script's name has that in it ('page' for the page)
    // makes over that long, collected since or not, by the function that made it: the garbage a frame makes, and where.
    if (s.sample) {
      const sid = s.sample === 'page' ? S : [...threads].find(([, t]) => t.name.includes(s.sample))?.[0];
      if (!sid) console.log('no thread', s.sample);
      else {
        await send('HeapProfiler.enable', {}, sid);
        await send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }, sid);
        await sleep(s.ms || 15000);
        const { profile } = await send('HeapProfiler.stopSampling', {}, sid, 60000);
        const by = new Map(); let all = 0;
        const walk = (n, up) => {
          const f = n.callFrame, at = `${f.functionName || '(anon)'} ${(f.url || '').replace(/^.*\/(src|tools)\//, '$1/')}:${f.lineNumber + 1}`;
          if (n.selfSize) { all += n.selfSize; const r = by.get(at) || { b: 0, up }; r.b += n.selfSize; by.set(at, r); }
          for (const c of n.children || []) walk(c, at);
        };
        walk(profile.head, '');
        const secs = (s.ms || 15000) / 1000, M2 = (x) => (x / 1048576).toFixed(2);
        console.log(`== made by ${s.sample} over ${secs} s: ${M2(all)} MB (${M2(all / secs)} MB a second)\n` + [...by].sort((a, b) => b[1].b - a[1].b).slice(0, s.most || 25)
          .map(([k, r]) => `${M2(r.b / secs).padStart(6)} MB/s  ${k}   <- ${r.up}`).join('\n'));
      }
    }
    // {"snap": "sim"}: a heap snapshot of the thread whose script's name has that in it ('page' for the page), to OUT/<name>.heapsnapshot.
    if (s.snap) {
      const sid = s.snap === 'page' ? S : [...threads].find(([, t]) => t.name.includes(s.snap))?.[0];
      if (!sid) console.log('no thread', s.snap);
      else {
        snapChunks = [];
        await send('HeapProfiler.enable', {}, sid);
        await send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false }, sid, 300000);
        const file = path.join(out, s.snap.replace(/\W/g, '_') + '.heapsnapshot');
        fs.writeFileSync(file, snapChunks.join(''));
        snapChunks = null;
        console.log('snapshot', file);
      }
    }
  } catch (e) { console.log('STEP FAILED', JSON.stringify(s).slice(0, 120), String(e.message).slice(0, 400)); }
}
watching = false;
await send('Browser.close').catch(() => {});
await sleep(800);
try { chrome.kill(); } catch { /* */ }
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* */ }
process.exit(0);
