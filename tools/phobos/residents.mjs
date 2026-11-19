// Phobos's people made on Meshy (tools/phobos/residents.json): for each, a text-to-3D preview, refined with PBR textures,
// then rigged; the rigged GLB and a front picture saved in art/phobos/residents/<name>.glb / .png. Resumable: what's been
// asked for and what's come back is kept in art/phobos/residents/state.json, so running it again picks up where it was.
//   node tools/phobos/residents.mjs            every one
//   node tools/phobos/residents.mjs sweep      just those
// The key is never in here: the session's network proxy puts it on requests to api.meshy.ai. (In a cloud session run it
// with NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt, or fetch goes round the proxy and finds nothing.)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const API = 'https://api.meshy.ai/openapi', DIR = 'art/phobos/residents', STATE = `${DIR}/state.json`;
const cfg = JSON.parse(readFileSync('tools/phobos/residents.json', 'utf8'));
mkdirSync(DIR, { recursive: true });
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 1));
const H = { Authorization: 'Bearer proxy-injected', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  for (let t = 0; ; t++) {
    const res = await fetch(API + path, { method, headers: H, body: body && JSON.stringify(body) });
    if (res.ok) return res.json();
    const txt = await res.text();
    if (t < 3 && (res.status >= 500 || res.status === 429)) { await sleep(5000 * (t + 1)); continue; }
    throw new Error(`${method} ${path}: ${res.status} ${txt.slice(0, 300)}`);
  }
}
async function wait(path, id, what) {
  for (;;) {
    const t = await call('GET', `${path}/${id}`);
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED' || t.status === 'CANCELED' || t.status === 'EXPIRED') throw new Error(`${what}: ${t.status} ${JSON.stringify(t.task_error || '')}`);
    await sleep(10000);
  }
}
async function fetchTo(url, file) { const r = await fetch(url); if (!r.ok) throw new Error(`download ${r.status}`); writeFileSync(file, Buffer.from(await r.arrayBuffer())); }

async function make(name, p) {
  const s = (state[name] ||= {});
  const prompt = `${p.prompt} ${cfg.style}`.slice(0, 600);
  if (!s.preview) { s.preview = (await call('POST', '/v2/text-to-3d', { mode: 'preview', prompt, art_style: 'realistic', ai_model: 'latest', topology: 'triangle', target_polycount: 30000, should_remesh: true, pose_mode: 't-pose' })).result; save(); console.log(name, 'preview asked', s.preview); }
  if (!s.previewDone) { await wait('/v2/text-to-3d', s.preview, `${name} preview`); s.previewDone = true; save(); console.log(name, 'preview done'); }
  if (!s.refine) { s.refine = (await call('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: s.preview, enable_pbr: true, texture_prompt: `${p.prompt} Grim, weathered, realistic fabrics and skin.`.slice(0, 600) })).result; save(); console.log(name, 'refine asked'); }
  if (!s.refineDone) { const t = await wait('/v2/text-to-3d', s.refine, `${name} refine`); s.refineDone = true; s.thumb = t.thumbnail_url; save(); if (t.thumbnail_url) await fetchTo(t.thumbnail_url, `${DIR}/${name}.png`); console.log(name, 'refine done'); }
  if (s.thumb && !existsSync(`${DIR}/${name}.png`)) await fetchTo(s.thumb, `${DIR}/${name}.png`);
  if (!s.rig) { s.rig = (await call('POST', '/v1/rigging', { input_task_id: s.refine, height_meters: p.height })).result; save(); console.log(name, 'rig asked'); }
  if (!s.rigDone) {
    const t = await wait('/v1/rigging', s.rig, `${name} rig`);
    const url = t.result?.rigged_character_glb_url;
    if (!url) throw new Error(`${name}: no rigged GLB in ${JSON.stringify(Object.keys(t.result || {}))}`);
    await fetchTo(url, `${DIR}/${name}.glb`); s.rigDone = true; save(); console.log(name, 'rigged and saved');
  }
}

const asked = process.argv.slice(2), names = Object.keys(cfg.people).filter((n) => !asked.length || asked.includes(n));
const out = await Promise.allSettled(names.map((n) => make(n, cfg.people[n])));
out.forEach((o, i) => { if (o.status === 'rejected') console.log('FAILED', names[i], String(o.reason).slice(0, 300), String(o.reason?.cause || '').slice(0, 300)); });
console.log('balance', (await call('GET', '/v1/balance')).balance);
