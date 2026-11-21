// Bakes a palette into a colour map off the render thread (src/gfx/tripo-slots.js skin): decode, scale, bake, and hand back a bitmap.
// Sized by the rule it's handed, as every other model's picture is (src/gfx/picsize.js): a dyed skin is no bigger than the
// same monster's own colours. (It used to scale by the tier's shrink alone, past the phone's cap: 1024 across, not 256.)
// size: the original's [width, height] when what it's handed is the phone's copy of it (src/gfx/lean-pictures.js source),
// shrunk the rest of the way in halves.
import { bake } from './palette-bake.js';
import { decodeScaledBitmap } from './picsize.js';

self.onmessage = async (e) => {
  const { id, blob, rule, pal, size } = e.data;
  try {
    const bmp = await decodeScaledBitmap(blob, rule.scale, rule.cap, rule.step, size);
    const cv = new OffscreenCanvas(bmp.width, bmp.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0);
    bmp.close();
    const img = cx.getImageData(0, 0, cv.width, cv.height);
    bake(img.data, pal);
    cx.putImageData(img, 0, 0);
    const out = cv.transferToImageBitmap();
    self.postMessage({ id, bmp: out }, [out]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
