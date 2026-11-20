(() => {
  const G = (window.__gpu = { tex: 0, buf: 0, texBy: {}, bufBy: {}, peakTex: 0, peakBuf: 0 });
  const bytesPer = (f) => (/^bc[14]|^etc2-rgb8|^eac-r11/.test(f) ? 0.5 : /^bc|^etc2|^eac|^astc/.test(f) ? 1 : /32float/.test(f) ? (/rgba/.test(f) ? 16 : /rg/.test(f) ? 8 : 4)
    : /16(float|uint|sint|unorm)/.test(f) ? (/rgba/.test(f) ? 8 : /rg/.test(f) ? 4 : 2) : /^r8/.test(f) ? 1 : /^rg8/.test(f) ? 2 : /stencil8/.test(f) ? 8 : 4);
  const where = () => new Error().stack.split('\n').slice(3, 7).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/src\//, '').replace(/\?[^:]*:/, ':')).join(' < ');
  const P = GPUDevice.prototype, tex = P.createTexture, buf = P.createBuffer;
  const counted = (made, bytes, by, key, kind) => {
    G[kind] += bytes; by[key] = (by[key] || 0) + bytes;
    G.peakTex = Math.max(G.peakTex, G.tex); G.peakBuf = Math.max(G.peakBuf, G.buf);
    const destroy = made.destroy.bind(made); let gone = false;
    made.destroy = () => { if (!gone) { gone = true; G[kind] -= bytes; by[key] -= bytes; } destroy(); };
    return made;
  };
  P.createTexture = function (d) {
    const s = d.size, w = s.width ?? s[0], h = s.height ?? s[1] ?? 1, l = s.depthOrArrayLayers ?? s[2] ?? 1, mips = d.mipLevelCount || 1;
    const bytes = w * h * l * bytesPer(d.format) * (d.sampleCount || 1) * (mips > 1 ? 4 / 3 : 1);
    return counted(tex.call(this, d), bytes, G.texBy, `${w}x${h}x${l} ${d.format}${mips > 1 ? ' mips' : ''} @ ${where()}`, 'tex');
  };
  P.createBuffer = function (d) { return counted(buf.call(this, d), d.size, G.bufBy, `usage ${d.usage} @ ${where()}`, 'buf'); };

  // Sound decoded, pictures decoded and not yet closed, and canvases: what the page holds that no script heap counts.
  const X = (window.__x = { audio: 0, audioN: 0, bmp: 0, bmpN: 0, bmpPeak: 0, canvases: new Set(), audioBy: {} });
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const dec = AC.prototype.decodeAudioData;
    const live = new FinalizationRegistry((b) => { X.audio -= b; X.audioN--; });
    AC.prototype.decodeAudioData = function (...a) {
      const p = dec.apply(this, a);
      p?.then?.((buf) => { const b = buf.length * buf.numberOfChannels * 4; X.audio += b; X.audioN++; X.audioTotal = (X.audioTotal || 0) + b; live.register(buf, b); }, () => {});
      return p;
    };
  }
  const cib = window.createImageBitmap;
  window.createImageBitmap = async function (...a) {
    const bmp = await cib.apply(this, a);
    const b = bmp.width * bmp.height * 4; X.bmp += b; X.bmpN++; X.bmpPeak = Math.max(X.bmpPeak, X.bmp);
    const close = bmp.close.bind(bmp); let gone = false;
    bmp.close = () => { if (!gone) { gone = true; X.bmp -= b; X.bmpN--; } close(); };
    return bmp;
  };
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (t, ...r) { const el = ce.call(this, t, ...r); if (String(t).toLowerCase() === 'canvas') X.canvases.add(new WeakRef(el)); return el; };
  if (window.OffscreenCanvas) { const OC = window.OffscreenCanvas; window.OffscreenCanvas = new Proxy(OC, { construct(t, args) { const o = new t(...args); X.canvases.add(new WeakRef(o)); return o; } }); }
  window.__xsum = () => {
    let cv = 0, n = 0; const big = [];
    for (const r of X.canvases) { const c = r.deref(); if (!c) { X.canvases.delete(r); continue; } const b = c.width * c.height * 4; cv += b; n++; if (b > 2e6) big.push(`${c.width}x${c.height}${c.id ? '#' + c.id : ''}${c.isConnected === false ? ' (off page)' : ''}`); }
    for (const c of document.querySelectorAll('canvas')) if (![...X.canvases].some((r) => r.deref() === c)) { const b = c.width * c.height * 4; cv += b; n++; if (b > 2e6) big.push(`${c.width}x${c.height}#${c.id}`); }
    let img = 0, imgN = 0; const bigImg = [];
    for (const i of document.images) { const b = i.naturalWidth * i.naturalHeight * 4; img += b; imgN++; if (b > 2e6) bigImg.push(`${i.naturalWidth}x${i.naturalHeight} ${i.src.split('/').pop()}`); }
    const mb = (x) => Math.round(x / 1048576);
    return `sound decoded and alive ${mb(X.audio)} MB in ${X.audioN} (ever ${mb(X.audioTotal || 0)}); pictures open ${mb(X.bmp)} MB in ${X.bmpN} (peak ${mb(X.bmpPeak)}); canvases ${mb(cv)} MB in ${n} [${big.join(', ')}]; <img> ${mb(img)} MB in ${imgN} [${bigImg.join(', ')}]; dom nodes ${document.getElementsByTagName('*').length}`;
  };
  // Long tasks and long frames, as the page sees them.
  window.__long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
  window.__laf = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__laf.push([Math.round(e.startTime), Math.round(e.duration), Math.round(e.blockingDuration), (e.scripts || []).filter((x) => x.duration > 30).map((x) => `${Math.round(x.duration)}ms ${x.invokerType} ${x.sourceFunctionName || ''} ${(x.sourceURL || '').split('/').slice(-2).join('/')}:${x.sourceCharPosition}`).join(' ; ')]); }).observe({ type: 'long-animation-frame', buffered: true }); } catch { /* */ }
})();
