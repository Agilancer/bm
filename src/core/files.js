// The files the game fetches as it starts, asked for through here so the loading screen can name the one coming down
// (src/main.js, src/title.js). Each thread has its own copy of this: the render thread watches its own fetches, and the
// simulation thread passes its to the render thread (src/sim/sim.worker.js).

let watcher = null;

/** fn({ name, state }): state 'start' as a file is asked for, 'done' when all of it is here (or it failed). */
export function watchFiles(fn) { watcher = fn; }

/** What the loading screen calls a file: its path under assets/, or under the game's folder. */
export function fileName(url) {
  const path = String(url).split(/[?#]/)[0];
  const at = path.lastIndexOf('/assets/');
  if (at >= 0) return decodeURIComponent(path.slice(at + 8));
  return decodeURIComponent(path.split('/').slice(-2).join('/'));
}

/** A file, whole: as 'buffer' (an ArrayBuffer), 'json' or 'blob'. A file that isn't there is an error that names it. */
export async function getFile(url, as = 'buffer') {
  const name = fileName(url);
  watcher?.({ name, state: 'start' });
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    return await (as === 'json' ? r.json() : as === 'blob' ? r.blob() : r.arrayBuffer());
  } finally { watcher?.({ name, state: 'done' }); }
}

/** A file fetched by someone else (a pool thread decoding a picture): named on the loading screen while `work` is under way. */
export function watched(url, work) {
  const name = fileName(url);
  watcher?.({ name, state: 'start' });
  const done = () => watcher?.({ name, state: 'done' });
  work.then(done, done);
  return work;
}

/** At most n of the tasks given to it run at once, the rest in the order they came: run(task) -> the task's promise. */
export function lanes(n) {
  let free = Math.max(1, n);
  const waiting = [];
  const next = () => {
    if (!free || !waiting.length) return;
    free--;
    const { task, resolve, reject } = waiting.shift();
    Promise.resolve().then(task).then(resolve, reject).finally(() => { free++; next(); });
  };
  return (task) => new Promise((resolve, reject) => { waiting.push({ task, resolve, reject }); next(); });
}

/** What the loading screen shows of the files: the newest still coming down, or the last one that did. */
export class FileWatch {
  constructor() { this.coming = new Set(); this.last = ''; this.count = 0; }

  note({ name, state }) {
    if (state === 'start') { this.coming.delete(name); this.coming.add(name); this.last = name; } else if (this.coming.delete(name)) this.count++;
  }

  get name() {
    let newest = '';
    for (const n of this.coming) newest = n;
    return newest || this.last;
  }
}
