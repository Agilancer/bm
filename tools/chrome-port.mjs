// A debugger port of a tool's own, for the tools that start a Chrome and speak to it over the debugger's socket
// (tools/memory/raw.mjs, tools/astc/check.mjs, tools/phone_memory.mjs).
//
// They used to share fixed ports (9351, 9371, 9333), and two runs at once met there: the second found the first's
// Chrome already on the port, took its page and sent it to its own server, and each run went on measuring the other's
// steps. So now Chrome is asked for port 0: it takes a free one itself and writes it, with the address of its own
// browser, into DevToolsActivePort in the profile it was started with. Read from there, the socket is that Chrome's and
// no other's. A port given by hand (DEBUG_PORT) is refused if something holds it already, so it can't be another's
// either. (Chrome writes DevToolsActivePort only for port 0: on a port given, it's found the old way, at /json/version.)
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const given = () => +process.env.DEBUG_PORT || 0;

/** Whether nothing listens on this port of 127.0.0.1 just now. */
function isFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.unref();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)));
  });
}

const taken = (p) => new Error(`DEBUG_PORT ${p} is taken, another run's Chrome perhaps: leave DEBUG_PORT unset for a port of its own`);

/** The --remote-debugging-port flag: 0, a free port of Chrome's choosing; or DEBUG_PORT, refused if it's taken. */
export async function portFlag() {
  const p = given();
  if (p && !(await isFree(p))) throw taken(p);
  return `--remote-debugging-port=${p}`;
}

/**
 * Once the Chrome started with this profile (and portFlag) is up: { port, url }, url its own browser's socket
 * (ws://127.0.0.1:<port>/devtools/browser/<id>). null if it didn't come up in time, or stopped (alive() false).
 */
export async function chromeSocket(profile, { seconds = 30, alive = () => true } = {}) {
  const p = given(), file = path.join(profile, 'DevToolsActivePort');
  for (const end = Date.now() + seconds * 1000; Date.now() < end && alive(); await sleep(200)) {
    if (p) {
      const v = await fetch(`http://127.0.0.1:${p}/json/version`).then((r) => r.json()).catch(() => null);
      if (v?.webSocketDebuggerUrl) return { port: p, url: v.webSocketDebuggerUrl };
      continue;
    }
    let port, where;
    try { [port, where] = fs.readFileSync(file, 'utf8').split(/\r?\n/); } catch { continue; }
    if (+port > 0 && where?.startsWith('/devtools/browser/')) return { port: +port, url: `ws://127.0.0.1:${port}${where}` };
  }
  return null;
}

/** The socket, open. */
export function openSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`no debugger at ${url}`));
  });
}

/** A port free now, for a launcher whose profile can't be read back (Playwright keeps its own): DEBUG_PORT if it's free. */
export async function freePort() {
  const p = given();
  if (p) { if (!(await isFree(p))) throw taken(p); return p; }
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}
