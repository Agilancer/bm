import fs from 'node:fs';
import os from 'node:os';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
globalThis.gc?.();
console.log('rss MB', (process.memoryUsage().rss / 1e6).toFixed(0), 'heap', (process.memoryUsage().heapUsed / 1e6).toFixed(0), 'free GB', (os.freemem() / 1e9).toFixed(1), 'total', (os.totalmem() / 1e9).toFixed(1));
let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9; for (const l of world.siteBoxes.values()) for (const c of l) if (c.x>9000){minx=Math.min(minx,c.x);maxx=Math.max(maxx,c.x);minz=Math.min(minz,c.z);maxz=Math.max(maxz,c.z);}
console.log('east boxes extent', minx, maxx, minz, maxz);
let pl=[1e9,-1e9,1e9,-1e9]; for (const p of world.platforms) if (p.x>9000){pl[0]=Math.min(pl[0],p.x-p.r);pl[1]=Math.max(pl[1],p.x+p.r);pl[2]=Math.min(pl[2],p.z-p.r);pl[3]=Math.max(pl[3],p.z+p.r);}
console.log('platforms extent', pl.map(v=>v.toFixed(0)), 'count east', world.platforms.filter(p=>p.x>9000).length, 'over', world.platforms.filter(p=>p.x>9000&&p.over).length);
