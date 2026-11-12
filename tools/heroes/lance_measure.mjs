// The lancer's hold, measured: what stills can't show. Plays his guard, thrust, shield bash and charge with no page (the
// stage of tests/hero-stage.mjs) and prints, for each: how far the fist and the lance's point travel, the fastest either
// goes, the biggest jump of any arm joint or of the lance's angle in one tick (a pop), and where the board is.
//
//   node tools/heroes/lance_measure.mjs
import { stage } from '../../tests/hero-stage.mjs';

const HZ = 120;
function run(name, setup, secs) {
  const { sim, hero, foes, step } = stage('lancer');
  for (const f of foes) f.x += 1;
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  hero.shotCd = 1e9; hero.hold = 1e9;
  step(0.8);
  setup({ sim, hero, foes, step });
  const m = hero.propMatrices, reach = hero.mainP.reach, A = hero.arms;
  const fwd = (x, z) => (x - hero.x) * Math.sin(hero.yaw) + (z - hero.z) * Math.cos(hero.yaw);
  const J = (j) => [hero.pose.wt[j * 3], hero.pose.wt[j * 3 + 1], hero.pose.wt[j * 3 + 2]];
  let prev = null, rows = [], pop = 0, popAt = '', turn = 0, turnAt = 0, t = 0;
  const x0 = hero.x;
  step(secs, () => {
    t += 1 / HZ;
    const fist = J(A.r.h), elbow = J(A.r.f), lh = J(A.l.h), tip = [m[12] + m[4] * reach, m[13] + m[5] * reach, m[14] + m[6] * reach], dir = [m[4], m[5], m[6]];
    // (Relative to the body, so a run's own speed isn't counted as a pop.)
    const rel = (p) => [fwd(p[0], p[2]), p[1] - hero.y, (p[0] - hero.x) * Math.cos(hero.yaw) - (p[2] - hero.z) * Math.sin(hero.yaw)];
    const cur = { fist: rel(fist), elbow: rel(elbow), lh: rel(lh), tip: rel(tip), dir, board: [fwd(m[28], m[30]), m[29] - hero.y], boardFace: -(m[24] * Math.sin(hero.yaw) + m[26] * Math.cos(hero.yaw)) };
    if (prev) {
      for (const k of ['fist', 'elbow', 'lh']) { const d = Math.hypot(cur[k][0] - prev[k][0], cur[k][1] - prev[k][1], cur[k][2] - prev[k][2]) * HZ; if (d > pop) { pop = d; popAt = `${k} at ${t.toFixed(2)} s`; } }
      const a = Math.acos(Math.min(1, dir[0] * prev.dir[0] + dir[1] * prev.dir[1] + dir[2] * prev.dir[2])) * HZ;
      if (a > turn) { turn = a; turnAt = t; }
    }
    rows.push(cur); prev = cur;
  });
  const span = (k, i) => { const v = rows.map((r) => r[k][i]); return [Math.min(...v), Math.max(...v)]; };
  const f = span('fist', 0), tp = span('tip', 0), th = span('tip', 1), fh = span('fist', 1), b = span('board', 0), bh = span('board', 1), face = Math.min(...rows.map((r) => r.boardFace));
  console.log(`${name}:`);
  console.log(`  fist travels ${(f[1] - f[0]).toFixed(2)} m along his facing (${f[0].toFixed(2)} to ${f[1].toFixed(2)} before his hips), at ${fh[0].toFixed(2)}-${fh[1].toFixed(2)} m up`);
  console.log(`  point travels ${(tp[1] - tp[0]).toFixed(2)} m (${tp[0].toFixed(2)} to ${tp[1].toFixed(2)} before him), at ${th[0].toFixed(2)}-${th[1].toFixed(2)} m up`);
  console.log(`  fastest arm joint ${pop.toFixed(1)} m/s (${popAt}); lance turns at most ${(turn * 57.3).toFixed(0)} deg/s (at ${turnAt.toFixed(2)} s)`);
  console.log(`  board ${b[0].toFixed(2)}-${b[1].toFixed(2)} m before him, its middle ${bh[0].toFixed(2)}-${bh[1].toFixed(2)} m up, facing the foe by at least ${face.toFixed(2)} (1 is square on)`);
  console.log(`  he moves ${(hero.x - x0).toFixed(2)} m; struck ${foes.reduce((n, k) => n + k.hits, 0)}`);
  console.log(`  he ends facing ${(hero.yaw * 57.3).toFixed(0)} deg (began at 90), his chest wanting ${(hero.faceYaw * 57.3).toFixed(0)}; doing ${hero.action?.name || 'nothing'}`);
}

run('guard, two seconds standing', () => {}, 2);
run('thrust', ({ sim, hero, foes }) => { for (const f of foes) f.x -= 3.5; hero.hold = 0; hero.goal = null; hero.blow(sim, foes[0], hero.blows[0]); hero.shotCd = 1e9; }, 1.2);
run('shield bash, foe inside the point', ({ sim, hero, foes }) => { for (const f of foes) f.x -= 5; hero.hold = 0; hero.goal = null; hero.blow(sim, foes[0], hero.blows[1]); hero.shotCd = 1e9; }, 1.6);
run('charge', ({ sim, hero, foes }) => { hero.hold = 0; hero.skill(sim, 'charge', foes[0]); }, 1.6);
run('lance barrage', ({ sim, hero, foes }) => { for (const f of foes) f.x -= 3.6; hero.hold = 0; hero.goal = null; hero.skill(sim, 'lance_barrage', foes[0]); }, 2.4);
