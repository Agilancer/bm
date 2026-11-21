// The biggest buffers in a heap snapshot (raw.mjs {"snap": ...}), each with who holds it: the chain of properties from
// the buffer up to something with a name, as far as `DEPTH` steps.
//   node tools/memory/heapbig.mjs file.heapsnapshot [how many, 30]
import fs from 'node:fs';

const file = process.argv[2], N = +(process.argv[3] || 30), DEPTH = 7;
const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
const m = snap.snapshot.meta, nf = m.node_fields, ef = m.edge_fields, NF = nf.length, EF = ef.length;
const types = m.node_types[0], etypes = m.edge_types[0];
const { nodes, edges, strings } = snap;
const iType = nf.indexOf('type'), iName = nf.indexOf('name'), iSize = nf.indexOf('self_size'), iEdges = nf.indexOf('edge_count');
const eType = ef.indexOf('type'), eName = ef.indexOf('name_or_index'), eTo = ef.indexOf('to_node');
const count = nodes.length / NF;
const firstEdge = new Uint32Array(count + 1);
for (let i = 0, e = 0; i < count; i++) { firstEdge[i] = e; e += nodes[i * NF + iEdges] * EF; }
firstEdge[count] = edges.length;
// Who points at each node (by node index), skipping weak edges.
const retN = new Uint32Array(count);
for (let e = 0; e < edges.length; e += EF) if (etypes[edges[e + eType]] !== 'weak') retN[edges[e + eTo] / NF]++;
const retStart = new Uint32Array(count + 1);
for (let i = 0; i < count; i++) retStart[i + 1] = retStart[i] + retN[i];
const retFrom = new Uint32Array(retStart[count]), retEdge = new Uint32Array(retStart[count]), fill = retStart.slice(0, count);
for (let i = 0; i < count; i++) for (let e = firstEdge[i]; e < firstEdge[i + 1]; e += EF) {
  if (etypes[edges[e + eType]] === 'weak') continue;
  const to = edges[e + eTo] / NF, k = fill[to]++;
  retFrom[k] = i; retEdge[k] = e;
}
const name = (i) => strings[nodes[i * NF + iName]];
const type = (i) => types[nodes[i * NF + iType]];
const size = (i) => nodes[i * NF + iSize];
const edgeName = (e) => { const t = etypes[edges[e + eType]], v = edges[e + eName]; return t === 'element' || t === 'hidden' ? `[${v}]` : strings[v]; };
const dull = (n) => /^(system \/|\(|Array$|Object$|InternalNode|ArrayBuffer$|.*Array$)/.test(n);

// One chain up: at each step the retainer that isn't a dull holder if there is one, else the first.
function chain(i) {
  const out = [], seen = new Set([i]);
  let at = i;
  for (let d = 0; d < DEPTH; d++) {
    let pick = -1, pickE = -1;
    for (let k = retStart[at]; k < retStart[at + 1]; k++) {
      const f = retFrom[k];
      if (seen.has(f) || type(f) === 'synthetic') continue;
      if (pick < 0) { pick = f; pickE = retEdge[k]; }
      if (type(f) !== 'hidden' && !/^system \//.test(name(f))) { pick = f; pickE = retEdge[k]; break; }
    }
    if (pick < 0) break;
    out.push(`${edgeName(pickE)} of ${type(pick) === 'closure' ? 'fn ' : ''}${name(pick).slice(0, 40) || type(pick)}`);
    seen.add(pick); at = pick;
    if (type(pick) === 'closure' || (!dull(name(pick)) && d >= 2)) break;
  }
  return out.join(' < ');
}

const big = [];
let total = 0;
for (let i = 0; i < count; i++) {
  const n = name(i);
  if (n === 'system / JSArrayBufferData' || n === 'system / BackingStore' || (type(i) === 'native' && /ArrayBuffer/.test(n))) { total += size(i); big.push(i); }
}
big.sort((a, b) => size(b) - size(a));
const MB = (x) => (x / 1048576).toFixed(1);
console.log(`${big.length} buffers, ${MB(total)} MB; the ${N} biggest:`);
// Grouped by their chain, so a thousand small ones held the same way show as one line.
const groups = new Map();
// (Indices and scope numbers taken out, and cut at the first holder with a class of its own, so a thousand held alike are one.)
const key = (c) => {
  const parts = c.replace(/\[\d+\]|\d+ of/g, '[n] of').replace(/@\d+/g, '').split(' < ');
  const k = parts.findIndex((t, j) => j > 1 && / of [A-Z][A-Za-z]+$/.test(t) && !/ of (Object|Array|ArrayBuffer|SharedArrayBuffer|\w+Array)$/.test(t));
  return (k < 0 ? parts : parts.slice(0, k + 1)).slice(2).join(' < ') || parts.join(' < ');
};
for (const i of big) { const c = key(chain(i)); const g = groups.get(c) || { n: 0, bytes: 0 }; g.n++; g.bytes += size(i); groups.set(c, g); }
for (const [c, g] of [...groups].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, N)) console.log(`${MB(g.bytes).padStart(7)} MB  x${String(g.n).padEnd(5)} ${c}`);
// And by the class that holds them, whatever the path.
const byClass = new Map();
for (const [c, g] of groups) {
  const m = c.match(/ of ([A-Z][A-Za-z]+)(?: \[JSGlobal.*)?$/) || c.match(/ of (fn \w+)/);
  const k = m ? m[1] : c.split(' < ').slice(-2).join(' < ').replace(/\b\d+ of array/, 'n of array');
  const b = byClass.get(k) || { n: 0, bytes: 0 }; b.n += g.n; b.bytes += g.bytes; byClass.set(k, b);
}
console.log('\nby holder:');
for (const [k, g] of [...byClass].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 25)) console.log(`${MB(g.bytes).padStart(7)} MB  x${String(g.n).padEnd(6)} ${k}`);
