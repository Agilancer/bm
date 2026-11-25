// A hero's body as the game poses it, written out for Blender (tools/heroes/blend_body.py) and anything else that wants to
// look at it: the real Hero code (src/sim/hero.js) run with no page on the real body, clips and kit (tests/hero-stage.mjs),
// doing what's asked, every joint's world turn and place and every held thing's matrix at the moments asked for.
//
//   node tools/heroes/posedump.mjs BODY SCENE[,SCENE...] [--dir assets/game/heroes] > out.json
//
// SCENE: stand (at ease, arms put away), armed (at ease, arms in hand), guard (in a fight, between blows), walk, jog, run,
// sprint (a steady pace down the road: frames over one loop), blow (his first blow at a foe before him: frames through it),
// blowN (the Nth), skill:KEY (a class move at a foe), gesture:NAME (src/core/heroes.js GESTURES), clip:NAME@SECONDS.
// Each scene is a list of frames: {scene, t, names, wq, wt, at, yaw, props: [{id, m}]}.
import { stage } from '../../tests/hero-stage.mjs';

const [body, scenes = 'stand'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FRAMES = +(process.argv.find((a) => a.startsWith('--frames='))?.split('=')[1] || 8);
// (--fps=N: frames that many a second instead, for a reel to play back; --span=S: seconds of a skill, a guard or standing.)
const FPS = +(process.argv.find((a) => a.startsWith('--fps='))?.split('=')[1] || 0);
const SPAN = +(process.argv.find((a) => a.startsWith('--span='))?.split('=')[1] || 0);
const count = (secs) => FPS ? Math.max(2, Math.round(secs * FPS)) : FRAMES;
const out = { body, frames: [] };

function snap(hero, scene, t) {
  const r = hero.rig;
  const props = [hero.mainP?.id, hero.offP?.id, hero.backP?.id, hero.luteP?.id].map((id, i) => ({ id: id || null, m: Array.from(hero.propMatrices.subarray(i * 16, i * 16 + 16)) }));
  out.frames.push({ scene, t: +t.toFixed(3), names: r.names, wq: Array.from(hero.pose.wq), wt: Array.from(hero.pose.wt), at: [hero.x, hero.y, hero.z], yaw: hero.yaw, props,
    stow: hero.stow, speed: hero.speed, action: hero.action?.name || null, f: hero.swing ? +(hero.actT / hero.swing.clip.dur).toFixed(4) : null, bs: +(hero.backSwing || 0).toFixed(5), bt: hero.backTop || 0 });
}

for (const scene of scenes.split(',')) {
  const { hero, foes, step, sim } = stage(body, 30, 1);
  const peace = () => { foes[0].x = 400; foes[0].z = 400; hero.task = { kind: 'town', peace: true }; hero.hold = 1e9; hero.goal = null; };
  const settle = (s) => step(s);
  if (scene === 'stand' || scene === 'armed') {
    peace(); hero.stow = scene === 'stand' ? 1 : 0; hero.calmT = scene === 'stand' ? 1e3 : -1e9; hero.combat = 0;
    settle(2.5);
    const N = count(SPAN || FRAMES * 0.5), d = (SPAN || FRAMES * 0.5) / N;
    for (let i = 0; i < N; i++) { step(d); snap(hero, scene, i * d); }
  } else if (scene === 'guard') {
    hero.task = { kind: 'fight' }; hero.hold = 1e9; hero.goal = null; foes[0].x = hero.x; foes[0].z = hero.z + 3.2;
    hero.shotCd = 1e9; hero.attackT = 1e9;
    settle(1.5);
    const N = count(SPAN || FRAMES * 0.25), d = (SPAN || FRAMES * 0.25) / N;
    for (let i = 0; i < N; i++) { step(d); snap(hero, scene, i * d); }
  } else if (['walk', 'jog', 'run', 'sprint'].includes(scene)) {
    peace(); hero.stow = 1; hero.calmT = 1e3;
    const v = { walk: 1.4, jog: 3.1, run: 5.6, sprint: 8.6 }[scene];
    hero.hold = 0; hero.goal = { x: 0, z: 4000, speed: v, stop: 0.5 }; hero.yaw = hero.faceYaw = 0;
    settle(3);
    // (Over one loop of the gait, as near as its pace makes it: about two strides a second running.)
    const span = { walk: 2.4, jog: 1.5, run: 1.2, sprint: 1.0 }[scene];
    const N = count(span);
    for (let i = 0; i < N; i++) { step(span / N); snap(hero, scene, (i + 1) * span / N); }
  } else if (scene.startsWith('swing:')) {
    // (Any clip swung as a blow: swing:Clip@rate.)
    const [clip, rate] = scene.slice(6).split('@');
    hero.task = { kind: 'fight' }; foes[0].x = hero.x; foes[0].z = hero.z + 2.2; hero.yaw = hero.faceYaw = 0;
    hero.hold = 1e9; hero.goal = null; hero.shotCd = 1e9;
    settle(0.8);
    hero.blow(sim, foes[0], { clip, rate: +(rate || 0.8), hit: [0.5], dmg: 10, reach: 2.1 });
    const dur = hero.swing?.clip ? hero.swing.clip.dur / (hero.swing.rate || 1) : 1;
    const N = count(dur * 1.05);
    for (let i = 0; i < N; i++) { step(dur * 1.05 / N); snap(hero, scene, (i + 1) * dur * 1.05 / N); }
  } else if (scene.startsWith('blow')) {
    const n = +(scene.slice(4) || 0);
    hero.task = { kind: 'fight' }; foes[0].x = hero.x; foes[0].z = hero.z + 2.2; hero.yaw = hero.faceYaw = 0;
    hero.hold = 1e9; hero.goal = null; hero.shotCd = 1e9;
    settle(0.8);
    hero.blow(sim, foes[0], hero.blows[n % hero.blows.length]);
    const dur = hero.swing?.clip ? hero.swing.clip.dur / (hero.swing.rate || 1) : 1;
    const N = count(dur * 1.05);
    for (let i = 0; i < N; i++) { step(dur * 1.05 / N); snap(hero, scene, (i + 1) * dur * 1.05 / N); }
  } else if (scene.startsWith('skill:')) {
    const key = scene.slice(6);
    hero.task = { kind: 'fight' }; foes[0].x = hero.x; foes[0].z = hero.z + 4; hero.yaw = hero.faceYaw = 0;
    hero.hold = 1e9; hero.goal = null; hero.shotCd = 1e9;
    settle(0.8);
    // (Through the hero's own book, so the few made in src/sim/hero.js, blessed hammers among them, are seen too.)
    hero.skill(sim, key, foes[0]);
    const S = SPAN || 2.0, N = count(S);
    for (let i = 0; i < N; i++) { step(S / N); snap(hero, scene, (i + 1) * S / N); }
  } else if (scene.startsWith('gesture:')) {
    peace(); hero.stow = 1; hero.calmT = 1e3; settle(1.5);
    hero.foe = null;
    hero.gesture_(scene.slice(8), 1e9);
    const dur = hero.action?.dur || 2;
    for (let i = 0; i < FRAMES; i++) { step(dur / FRAMES); snap(hero, scene, (i + 1) * dur / FRAMES); }
  } else if (scene.startsWith('clip:')) {
    const [name, at] = scene.slice(5).split('@');
    peace(); hero.stow = 1; hero.calmT = 1e3; settle(1.5);
    // (Held as the game holds one for looking a body over, HeroWorld 'pose': at is a fraction of the clip.)
    const c = hero.bank.clips[name];
    hero.play(name, 0, 'full', 0); hero.actT = (+(at || 0.5)) * c.dur; hero.gesture = 'review'; hero.gestureT = 1e9;
    step(0.3); snap(hero, scene, +(at || 0.5));
  }
}
process.stdout.write(JSON.stringify(out));
