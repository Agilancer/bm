// Opens check.html (or any page that sets window.__result) in plain Chrome, waits for the result, and saves it with the
// sheets it drew as PNGs (tools/astc/README.md):
//   FLAGS="--enable-unsafe-swiftshader" node tools/astc/check.mjs "http://localhost:8861/tools/astc/check.html?soft=1" out
// Env: FLAGS (more of Chrome's flags), CHROME (its path), TIMEOUT (s, 600), DEBUG_PORT (unset: one of its own,
// tools/chrome-port.mjs).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portFlag, chromeSocket, openSocket } from '../chrome-port.mjs';

const url = process.argv[2], outDir = process.argv[3] || 'astc-check';
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-astc-'));
const chromePath = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const debugFlag = await portFlag().catch((e) => { console.log(e.message); process.exit(1); });
const chrome = spawn(chromePath, [`--user-data-dir=${profile}`, debugFlag,
  '--enable-unsafe-webgpu', '--no-first-run', '--no-default-browser-check', '--window-position=-3000,0', '--window-size=900,700',
  ...(process.env.FLAGS ? process.env.FLAGS.split(' ') : []), 'about:blank'], { stdio: 'ignore' });
let chromeGone = false;
chrome.on('exit', () => { chromeGone = true; });
const dbg = await chromeSocket(profile, { seconds: 15, alive: () => !chromeGone });
if (!dbg) { console.log('chrome did not start'); try { chrome.kill(); } catch { /* */ } process.exit(1); }
const ws = await openSocket(dbg.url).catch((e) => { console.log(e.message); try { chrome.kill(); } catch { /* */ } process.exit(1); });
let id = 0; const waits = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; waits.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waits.has(m.id)) { const w = waits.get(m.id); waits.delete(m.id); w(m); return; }
  if (m.method === 'Runtime.consoleAPICalled') console.log('console:', m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400));
  if (m.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR', (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 600));
};
const t = (await send('Target.getTargets')).targetInfos.find((x) => x.type === 'page');
const { sessionId: S } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
await send('Runtime.enable', {}, S); await send('Page.enable', {}, S);
await send('Page.navigate', { url }, S);
let res = null;
for (let i = 0; i < +(process.env.TIMEOUT || 600) && !res; i++) {
  await sleep(1000);
  const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__result || null)', returnByValue: true }, S).catch(() => null);
  res = r?.result?.value && JSON.parse(r.result.value);
}
const log = await send('Runtime.evaluate', { expression: 'document.getElementById("log")?.textContent', returnByValue: true }, S).catch(() => null);
console.log(log?.result?.value || '(no log)');
if (res?.sheets) for (const s of res.sheets) fs.writeFileSync(path.join(outDir, `${s.path.split('/').pop().replace(/\.webp$/, '')}.png`), Buffer.from(s.url.split(',')[1], 'base64'));
if (res) { delete res.sheets; fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(res, null, 1)); }
chrome.kill();
process.exit(0);
