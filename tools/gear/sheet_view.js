// For the critics: review sheets of the gauntlets from swings.html, through the game's own arm camera and close to the hands, in true pose.
//   const { sheet, close } = await import('./tools/gear/sheet_view.js'); await sheet('name', [['blade_over', 0.4], ...]);
// A sheet goes to tools/fp_arms/build/shots/<name>.png (POST /shot, tools/fp_arms/serve.py).
const dbg = () => window.rigDbg;

function pose(name, f) {
  const d = dbg();
  d.mixer.stopAllAction();
  const a = d.actions[name];
  a.reset(); a.setEffectiveWeight(1); a.play();
  a.time = a.getClip().duration * f; a.paused = true;
  d.mixer.update(0);
  d.rig.updateMatrixWorld(true);
}

function tile(c, cv, i, cols, W, H, label) {
  c.drawImage(cv, (i % cols) * W, Math.floor(i / cols) * H, W, H);
  c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.fillText(label, (i % cols) * W + 6, Math.floor(i / cols) * H + 16);
}

async function send(name, ov) {
  const blob = await new Promise((ok) => ov.toBlob(ok, 'image/png'));
  await fetch(`/shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
}

function canvas(cols, rows, W, H) {
  const ov = document.createElement('canvas');
  ov.width = cols * W; ov.height = rows * H;
  return ov;
}

// Through the game's camera.
export async function sheet(name, list, cols = 3, W = 640) {
  const d = dbg(), cv = document.querySelector('canvas');
  const H = Math.round(W * cv.height / cv.width);
  const ov = canvas(cols, Math.ceil(list.length / cols), W, H), c = ov.getContext('2d');
  list.forEach(([clip, f], i) => { pose(clip, f); d.draw(); tile(c, cv, i, cols, W, H, `${clip} ${f}`); });
  await send(name, ov);
  return [ov.width, ov.height];
}

// Up close, round the hand: the camera moved to look at one bone from several sides, in a clip's pose.
export async function close(name, clip, f, bone, dist = 0.32, cols = 3, W = 640) {
  const d = dbg(), cv = document.querySelector('canvas'), T = d.THREE, cam = d.vmCam;
  const H = Math.round(W * cv.height / cv.width);
  const dirs = [[0, -0.2, 1], [1, 0.2, 0.2], [-1, 0.2, 0.2], [0, 1, 0.3], [0, -1, 0.3], [0.6, 0.5, -0.6]];
  const ov = canvas(cols, Math.ceil(dirs.length / cols), W, H), c = ov.getContext('2d');
  const keepP = cam.position.clone(), keepQ = cam.quaternion.clone(), keepF = cam.fov, keepN = cam.near;
  pose(clip, f);
  const at = d.rig.getObjectByName(bone).getWorldPosition(new T.Vector3());
  cam.fov = 45; cam.near = 0.01; cam.updateProjectionMatrix();
  dirs.forEach((v, i) => {
    cam.position.copy(at).add(new T.Vector3(...v).normalize().multiplyScalar(dist));
    cam.lookAt(at); cam.updateMatrixWorld(true);
    d.draw();
    tile(c, cv, i, cols, W, H, `${clip} ${f} ${bone} [${v}]`);
  });
  cam.position.copy(keepP); cam.quaternion.copy(keepQ); cam.fov = keepF; cam.near = keepN; cam.updateProjectionMatrix();
  await send(name, ov);
  return [ov.width, ov.height];
}

// The casts, from spells.html: list of [model, cast, seconds].
export async function spellSheet(name, list, cols = 3, W = 640) {
  const cv = document.querySelector('canvas');
  const H = Math.round(W * cv.height / cv.width);
  const ov = canvas(cols, Math.ceil(list.length / cols), W, H), c = ov.getContext('2d');
  for (let i = 0; i < list.length; i++) {
    const [m, cast, t] = list[i];
    await window.bm.seek(m, cast, t, 'none');
    tile(c, cv, i, cols, W, H, `${m} ${cast} ${t}`);
  }
  await send(name, ov);
  return [ov.width, ov.height];
}

// A round's sheets for one suit, through whichever page is open.
export async function round(tag, suit) {
  await new Promise((r) => setTimeout(r, 2500));
  const model = new URLSearchParams(location.search).get('model') || '1h';
  if (location.pathname.includes('spells')) {
    return spellSheet(`${tag}_${suit}_spell`, [['attack', 'both', 0.15], ['attack', 'both', 0.35], ['attack', 'both', 0.55], ['attack', 'both', 0.8], ['raise', 'both', 0.3], ['raise', 'both', 0.7]]);
  }
  const d = dbg();
  if (model === '1h') {
    await sheet(`${tag}_${suit}_1h_game`, [['blade_over', 0.4], ['blade_sky1', 0.3], ['blade_d1', 0.3], ['shield_up', 0.9], ['shield_bash', 0.5], ['blade_stab', 0.4]]);
    await close(`${tag}_${suit}_1h_handR`, 'blade_over', 0.4, 'hand_R');
    return close(`${tag}_${suit}_1h_handL`, 'shield_up', 0.9, 'hand_L');
  }
  const names = Object.keys(d.actions);
  const pick = names.filter((n) => !/idle|walk/.test(n)).slice(0, 6).map((n, i) => [n, 0.3 + (i % 3) * 0.12]);
  await sheet(`${tag}_${suit}_${model}_game`, pick);
  return close(`${tag}_${suit}_${model}_handR`, pick[0][0], pick[0][1], 'hand_R');
}
