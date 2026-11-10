// The game's service worker. Two jobs:
//
// 1. Shared memory. Static hosts can't send the headers that unlock SharedArrayBuffer, so this adds them to every response.
//
// 2. Keeping the game on this device, only if the player said yes (src/main.js registers coi-sw.js?keep=1; Settings,
//    "Game files", turns it off). Each game file is kept after its first download. At every start (each page load) it
//    reads files.json, one small list of every file's version, and a kept file whose version has changed is downloaded
//    again when the game asks for it. Nothing else is downloaded twice. tools/serve.py makes files.json fresh on every
//    request; on a static host tools/files.py writes it. With no files.json, or for a file not in it, the network is
//    used as before.
const KEEP = new URL(self.location).searchParams.get('keep') === '1';
const FILES = 'bm-files-v1', META = 'bm-meta-v1';
const SCOPE = new URL(self.registration.scope);
let list = null; // { path: version } for this start, from files.json

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  if (KEEP) await check();
  else { await caches.delete(FILES); await caches.delete(META); }
  await self.clients.claim();
})()));

/** The response with the headers that unlock shared memory (and any others asked for). */
function isolate(res, extra) {
  if (res.status === 0) return res;
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  if (extra) for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** files.json, fresh. Slow or offline, the last one kept stands, so the game still starts from what's here. */
async function check() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(new URL('files.json', SCOPE), { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (r.ok) {
      const fresh = await r.json();
      if (fresh && fresh.files) {
        await (await caches.open(META)).put('files.json', new Response(JSON.stringify(fresh), { headers: { 'Content-Type': 'application/json' } }));
        list = fresh.files;
        return;
      }
    }
  } catch { /* offline, slow, or not there */ }
  list = null;
  await current();
}

/** This start's list: from memory, or as kept (the worker may have been stopped and started since). */
async function current() {
  if (list) return list;
  const kept = await (await caches.open(META)).match('files.json');
  list = kept ? (await kept.json()).files || {} : {};
  return list;
}

/** A while after a start, let go of kept files that are no longer the list's version, to free the space. */
async function tidy() {
  const files = await current();
  const store = await caches.open(FILES);
  for (const req of await store.keys()) {
    const hit = await store.match(req);
    const v = files[pathOf(new URL(req.url))];
    if (!v || hit?.headers.get('x-bm-v') !== v) await store.delete(req);
  }
}

function pathOf(url) {
  const p = decodeURIComponent(url.pathname.slice(SCOPE.pathname.length));
  return p === '' || p.endsWith('/') ? p + 'index.html' : p;
}

async function fromStore(e, url) {
  const files = await current();
  const path = pathOf(url);
  const v = files[path];
  // Not a game file, or no list: as before.
  if (!v) return isolate(await fetch(e.request));
  // Kept by its path alone: ?auto=1 and the like are for the page, not the file.
  const key = new URL(path, SCOPE).href;
  const store = await caches.open(FILES);
  const hit = await store.match(key);
  if (hit && hit.headers.get('x-bm-v') === v) return hit;
  const res = await fetch(e.request);
  if (res.status !== 200) return isolate(res);
  const out = isolate(res, { 'x-bm-v': v });
  e.waitUntil(store.put(key, out.clone()).catch(() => { /* no room: fetched again next time */ }));
  return out;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  const url = new URL(req.url);
  if (KEEP && url.origin === SCOPE.origin && req.method === 'GET' && !req.headers.has('range') && req.cache !== 'no-store' && !url.pathname.endsWith('/files.json')) {
    const net = () => fetch(req).then((r) => isolate(r));
    if (req.mode === 'navigate') {
      e.respondWith(check().then(() => fromStore(e, url)).catch(net));
      e.waitUntil(new Promise((r) => setTimeout(r, 20000)).then(tidy).catch(() => {}));
    } else {
      e.respondWith(fromStore(e, url).catch(net));
    }
    return;
  }
  e.respondWith(fetch(req).then((r) => isolate(r)).catch(() => Response.error()));
});

// The page asks how many files are kept (Settings).
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'kept') return;
  e.waitUntil((async () => {
    const n = (await (await caches.open(FILES)).keys()).length;
    e.source?.postMessage({ type: 'kept', files: n, keep: KEEP });
  })());
});
