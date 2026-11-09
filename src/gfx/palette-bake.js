// A Tripo monster's colour map in one of palettes.json's palettes: the bestiary's sums (monsters.html paletted()) done on the pixels,
// once per model and palette. Run in a worker (bake.worker.js), as a big map takes the best part of a second.
// sRGB <-> linear, as tables: the palette sums are done on linear colour, like the bestiary's shader.
const TO_LIN = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const TO_SRGB = new Uint8Array(4096).map((_, i) => { const c = i / 4095; return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)); });

// monsters.html paletted(): hue turned, saturation and value scaled, then mixed toward a tint by its brightness.
export function bake(px, p) {
  const hue = (p.hue || 0) / 360, sat = p.sat ?? 1, val = p.val ?? 1, tamt = p.tamt || 0, tint = p.tint || [1, 1, 1];
  for (let i = 0; i < px.length; i += 4) {
    const r = TO_LIN[px[i]], g = TO_LIN[px[i + 1]], b = TO_LIN[px[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 1e-6) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h / 6 + hue) % 1;
    const s = Math.min(1, (max > 1e-6 ? d / max : 0) * sat), v = max * val;
    const k = (n) => { const x = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
    let R = k(5), G = k(3), B = k(1);
    if (tamt) {
      const l = R * 0.3 + G * 0.59 + B * 0.11;
      R += (l * tint[0] * 2 - R) * tamt; G += (l * tint[1] * 2 - G) * tamt; B += (l * tint[2] * 2 - B) * tamt;
    }
    px[i] = TO_SRGB[Math.min(4095, Math.max(0, (R * 4095) | 0))];
    px[i + 1] = TO_SRGB[Math.min(4095, Math.max(0, (G * 4095) | 0))];
    px[i + 2] = TO_SRGB[Math.min(4095, Math.max(0, (B * 4095) | 0))];
  }
}

