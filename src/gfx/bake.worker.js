// Bakes a palette into a colour map off the render thread (src/gfx/tripo-slots.js skin): decode, scale, bake, and hand back a bitmap.
import { bake } from './palette-bake.js';

const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };

self.onmessage = async (e) => {
  const { id, blob, scale, pal } = e.data;
  try {
    let bmp = await createImageBitmap(blob, opts);
    if (scale !== 1) {
      const small = await createImageBitmap(bmp, { ...opts, resizeWidth: Math.max(1, Math.round(bmp.width * scale)),
        resizeHeight: Math.max(1, Math.round(bmp.height * scale)), resizeQuality: 'high' });
      bmp.close();
      bmp = small;
    }
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
