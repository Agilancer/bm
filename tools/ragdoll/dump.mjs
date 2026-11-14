import fs from 'node:fs';
import { parseGLB, readSkeleton } from '../../src/core/glb.js';
for (const f of process.argv.slice(2)) {
  const b = fs.readFileSync(f); const glb = parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const s = readSkeleton(glb);
  const kids = s.names.map(() => []); s.parent.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
  const roots = s.names.filter((n, i) => s.parent[i] < 0);
  const short = (n) => n.replace(/^mixamorig\d*:/, '');
  const branch = s.names.map((n, i) => kids[i].length > 1 ? `${short(n)}>[${kids[i].map((k) => short(s.names[k])).join(',')}]` : null).filter(Boolean);
  console.log(`${f.split('/').pop()} n=${s.names.length} roots=${roots.join(',')} :: ${branch.join(' ').slice(0, 420)}`);
}
