// A suit's gauntlets in the game itself: the player's real camera, in the game's own light, with every kind of weapon and both pairs of casting hands.
// Load the game with ?auto&timer (a hidden pane runs no frames without it), then:
//   const { suitSheet } = await import('/tools/gear/game_sheet.js'); await suitSheet('knight');
// A sheet goes to tools/build/shots/game_<suit>.png (POST /shot, tools/serve.py).
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

const grab = (b) => new Promise((ok) => {
  b.view.onFrame = () => { b.view.onFrame = null; ok(createImageBitmap(b.renderer.canvas)); };
});

async function burst(b, frames, label, fire, times) {
  fire();
  const t0 = performance.now();
  for (const t of times) {
    const left = t - (performance.now() - t0);
    if (left > 0) await wait(left);
    frames.push({ label: `${label} ${t}ms`, shot: await grab(b), gloves: !!(b.renderer.vmGloves || b.renderer.spellGloves) });
  }
}

export async function suitSheet(suit, W = 320) {
  const b = window.bm, r = b.renderer;
  b.pack.slots.hands.base = `${suit}_hands`;
  b.inventory.on.change();
  const set = r.gauntletSet(suit);
  while (!set.ready) await wait(100);
  const frames = [];
  const hold = async (base) => {
    b.pack.slots.main = b.pack.entries.find((e) => e.item.base === base).item;
    b.inventory.on.change();
    await wait(900);
  };
  const SWING = [80, 200, 320, 440, 560, 700];
  await hold('frost_sword');
  await burst(b, frames, 'sword', () => b.attack(), SWING);
  await wait(900);
  await hold('fluked_greatsword');
  await burst(b, frames, 'greatsword', () => b.attack(), SWING);
  await wait(900);
  await hold('crystal_staff');
  await burst(b, frames, 'staff', () => b.attack(), SWING);
  await wait(900);
  await hold('frost_sword');
  b.spell('lightning');
  await burst(b, frames, 'cast attack', () => b.cast(1), [100, 300, 500, 700, 900, 1100]);
  b.cast(0);
  await wait(1200);
  b.spell('mend');
  await burst(b, frames, 'cast raise', () => b.cast(1), [200, 400, 600, 800, 1000, 1200]);
  b.cast(0);
  const cols = 6, cv = b.renderer.canvas, H = Math.round(W * cv.height / cv.width);
  const ov = document.createElement('canvas');
  ov.width = cols * W; ov.height = Math.ceil(frames.length / cols) * H;
  const c = ov.getContext('2d');
  frames.forEach((f, i) => {
    const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    c.drawImage(f.shot, x, y, W, H);
    c.fillStyle = '#fff'; c.font = '12px sans-serif'; c.fillText(`${suit} ${f.label}${f.gloves ? '' : ' NO GLOVES'}`, x + 5, y + 14);
  });
  const send = async (name, canvas) => fetch(`/shot?name=${name}`, { method: 'POST', body: await new Promise((ok) => canvas.toBlob(ok, 'image/png')) });
  await send(`game_${suit}`, ov);
  // The frames with the hands in view, bigger.
  const big = ['greatsword 440ms', 'staff 440ms', 'cast attack 300ms', 'cast attack 500ms', 'cast attack 900ms', 'cast raise 200ms', 'cast raise 400ms', 'cast raise 800ms', 'sword 700ms'].map((l) => frames.find((f) => f.label === l));
  const W2 = 640, H2 = Math.round(W2 * cv.height / cv.width), ov2 = document.createElement('canvas');
  ov2.width = 3 * W2; ov2.height = 3 * H2;
  const c2 = ov2.getContext('2d');
  big.forEach((f, i) => {
    const x = (i % 3) * W2, y = Math.floor(i / 3) * H2;
    c2.drawImage(f.shot, x, y, W2, H2);
    c2.fillStyle = '#fff'; c2.font = '14px sans-serif'; c2.fillText(`${suit} ${f.label}`, x + 6, y + 18);
  });
  await send(`game_${suit}_close`, ov2);
  return { suit, gloves: frames.filter((f) => f.gloves).length, of: frames.length, eye: +b.view.cam.y.toFixed(2) };
}
