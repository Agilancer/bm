(() => {
  const G = (window.__gpu = { tex: 0, buf: 0, texBy: {}, bufBy: {}, peakTex: 0, peakBuf: 0 });
  const bytesPer = (f) => (/^bc[14]|^etc2-rgb8|^eac-r11/.test(f) ? 0.5 : /^bc|^etc2|^eac|^astc/.test(f) ? 1 : /32float/.test(f) ? (/rgba/.test(f) ? 16 : /rg/.test(f) ? 8 : 4)
    : /16(float|uint|sint|unorm)/.test(f) ? (/rgba/.test(f) ? 8 : /rg/.test(f) ? 4 : 2) : /^r8/.test(f) ? 1 : /^rg8/.test(f) ? 2 : /stencil8/.test(f) ? 8 : 4);
  // (This script's own frames left out: it's '<anonymous>', and its wrappers are one inside another.)
  const where = () => new Error().stack.split('\n').slice(1).filter((l) => !l.includes('<anonymous>')).slice(0, 4).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/src\//, '').replace(/\?[^:]*:/, ':')).join(' < ');
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
  // How many GPU objects are made, by kind and by the code that makes them (a frame's worth, read as made a second: `made`).
  // A browser frees one only when its script object is collected, and an iPhone's script collector doesn't know what the GPU
  // side of it weighs: thousands a second pile up there.
  G.made = {}; G.madeBy = {}; G.wrote = 0;
  const tally = (kind) => { G.made[kind] = (G.made[kind] || 0) + 1; const k = `${kind} @ ${where()}`; G.madeBy[k] = (G.madeBy[k] || 0) + 1; };
  for (const m of ['createBindGroup', 'createCommandEncoder', 'createSampler', 'createRenderPipeline', 'createComputePipeline', 'createQuerySet', 'createShaderModule', 'createRenderBundleEncoder']) {
    const f = P[m]; P[m] = function (...a) { tally(m); return f.apply(this, a); };
  }
  const TP = GPUTexture.prototype, cv = TP.createView;
  TP.createView = function (...a) { tally('createView'); return cv.apply(this, a); };
  const pt = P.createTexture, pb = P.createBuffer;
  P.createTexture = function (...a) { tally('createTexture'); return pt.apply(this, a); };
  P.createBuffer = function (...a) { tally('createBuffer'); return pb.apply(this, a); };
  const QP = GPUQueue.prototype, wb = QP.writeBuffer, wt = QP.writeTexture;
  QP.writeBuffer = function (b, o, d, dofs = 0, size) { G.wrote += size ?? ((d.byteLength ?? 0) - dofs * (d.BYTES_PER_ELEMENT || 1)); tally('writeBuffer'); return wb.apply(this, arguments); };
  QP.writeTexture = function (...a) { tally('writeTexture'); return wt.apply(this, a); };
  // What's on the GPU, totalled by the line of the renderer's load that asked for it (or the function that did): {"log":
  // "return window.__gpuBy()"}.
  window.__gpuBy = (n = 30) => {
    const sum = (o) => {
      const g = {};
      for (const [k, v] of Object.entries(o)) {
        if (v <= 0) continue;
        const m = k.match(/gfx\/renderer\.js:(3\d\d|4[0-4]\d):\d+/) || k.match(/(FolkBodies|loadInterior|buildStatics|buildPipelines|buildTargetSet|SpellFX|OpeningStage|buildTerrain|buildGrass|buildParticles|phobos[\w-]*|interior)/i);
        const key = m ? (m[1] && /^\d/.test(m[1]) ? `renderer.js:${m[1]}` : m[1] || m[0]) : (k.split(' @ ')[1] || k).split(' < ')[0];
        g[key] = (g[key] || 0) + v;
      }
      return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${(v / 1048576).toFixed(1).padStart(7)}  ${k}`).join('\n');
    };
    return `buffers:\n${sum(G.bufBy)}\ntextures:\n${sum(G.texBy)}`;
  };
  // The texture views each command encoder uses, as WebKit counts them (bug 329399: an iPhone's WebGPU before the fix of
  // 4 November 2026 keeps one id for every command encoder a view was ever used in, until the view itself is let go): its
  // passes' attachments, and every view in a bind group set in one of its passes or bundles. `__slots(ms)`: encoders and
  // view-ids added a second, and by whom the views were made.
  const V = (window.__views = { encoders: 0, slots: 0, by: {}, seen: new WeakSet(), distinct: 0 });
  const texKey = new WeakMap(), viewKey = new WeakMap(), bgViews = new WeakMap(), passEnc = new WeakMap(), encViews = new WeakMap(), bundleViews = new WeakMap();
  const ct = P.createTexture;
  P.createTexture = function (d) { const t = ct.call(this, d); const s = d.size; texKey.set(t, `${s.width ?? s[0]}x${s.height ?? s[1] ?? 1}x${s.depthOrArrayLayers ?? s[2] ?? 1} ${d.format}`); return t; };
  const cv2 = TP.createView;
  TP.createView = function (...a) { const v = cv2.apply(this, a); viewKey.set(v, `${texKey.get(this) || '?'} @ ${where()}`); return v; };
  const cbg = P.createBindGroup;
  P.createBindGroup = function (d) {
    const bg = cbg.call(this, d);
    const vs = (d.entries || []).map((e) => e.resource).filter((r) => r instanceof GPUTextureView || (window.GPUExternalTexture && r instanceof GPUExternalTexture));
    if (vs.length) bgViews.set(bg, vs);
    return bg;
  };
  const addTo = (enc, views) => { if (!enc || !views) return; let s = encViews.get(enc); if (!s) encViews.set(enc, (s = new Set())); for (const v of views) s.add(v); };
  const CE = GPUCommandEncoder.prototype, brp = CE.beginRenderPass, bcp = CE.beginComputePass, fin = CE.finish;
  CE.beginRenderPass = function (d) {
    const p = brp.call(this, d); passEnc.set(p, this);
    const vs = [];
    for (const c of d.colorAttachments || []) if (c) { vs.push(c.view); if (c.resolveTarget) vs.push(c.resolveTarget); }
    if (d.depthStencilAttachment) vs.push(d.depthStencilAttachment.view);
    addTo(this, vs);
    return p;
  };
  CE.beginComputePass = function (...a) { const p = bcp.apply(this, a); passEnc.set(p, this); return p; };
  // The bug itself, as a model: each view's ids, alive until the view is collected. `__leak()`: the ids held now, and as
  // bytes at 16 an id (a WTF HashSet<uint64_t> half full).
  V.held = 0; V.ids = new WeakMap(); V.heldBy = {};
  const gone = new FinalizationRegistry((c) => { V.held -= c.n; V.heldBy[c.k] -= c.n; });
  CE.finish = function (...a) {
    const s = encViews.get(this);
    V.encoders++;
    if (s) {
      V.slots += s.size;
      for (const v of s) {
        const k = viewKey.get(v) || 'canvas or unknown'; V.by[k] = (V.by[k] || 0) + 1;
        if (!V.seen.has(v)) { V.seen.add(v); V.distinct++; }
        let c = V.ids.get(v); if (!c) { V.ids.set(v, (c = { n: 0, k: k.replace(/ < .*/, '') })); gone.register(v, c); }
        c.n++; V.held++; V.heldBy[c.k] = (V.heldBy[c.k] || 0) + 1;
      }
    }
    return fin.apply(this, a);
  };
  window.__leak = (n = 0) => `${V.held} ids held (${(V.held * 30 / 1048576).toFixed(1)} MB at the 30 B an id its reporter measured) over ${V.encoders} encoders`
    + (n ? String.fromCharCode(10) + Object.entries(V.heldBy).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, x]) => `${String(x).padStart(9)}  ${k}`).join(String.fromCharCode(10)) : '');
  for (const C of [GPURenderPassEncoder, GPUComputePassEncoder]) {
    const sbg = C.prototype.setBindGroup;
    C.prototype.setBindGroup = function (i, bg, ...r) { addTo(passEnc.get(this), bg && bgViews.get(bg)); return sbg.call(this, i, bg, ...r); };
  }
  const RBE = GPURenderBundleEncoder.prototype, rsbg = RBE.setBindGroup, rfin = RBE.finish;
  RBE.setBindGroup = function (i, bg, ...r) { const vs = bg && bgViews.get(bg); if (vs) { let s = this.__vs; if (!s) this.__vs = s = new Set(); for (const v of vs) s.add(v); } return rsbg.call(this, i, bg, ...r); };
  RBE.finish = function (...a) { const b = rfin.apply(this, a); if (this.__vs) bundleViews.set(b, [...this.__vs]); return b; };
  const xb = GPURenderPassEncoder.prototype.executeBundles;
  GPURenderPassEncoder.prototype.executeBundles = function (bundles) { const e = passEnc.get(this); for (const b of bundles) addTo(e, bundleViews.get(b)); return xb.call(this, bundles); };
  window.__slots = async (ms = 3000) => {
    const e0 = V.encoders, s0 = V.slots, b0 = { ...V.by };
    await new Promise((r) => setTimeout(r, ms));
    const per = (x) => Math.round(x * 1000 / ms);
    const top = Object.keys(V.by).map((k) => [per(V.by[k] - (b0[k] || 0)), k]).filter((r) => r[0] > 0).sort((x, y) => y[0] - x[0]).slice(0, 16)
      .map((r) => `${String(r[0]).padStart(6)}/s  ${r[1]}`).join(String.fromCharCode(10));
    return `encoders ${per(V.encoders - e0)}/s, view-ids added ${per(V.slots - s0)}/s (${((V.slots - s0) / Math.max(1, V.encoders - e0)).toFixed(1)} an encoder), distinct views ever used ${V.distinct}${String.fromCharCode(10)}${top}`;
  };

  window.__made = async (ms = 2000) => {
    const a = { ...G.made }, ab = { ...G.madeBy }, w0 = G.wrote;
    await new Promise((r) => setTimeout(r, ms));
    const per = (x, y) => Math.round(((x || 0) - (y || 0)) * 1000 / ms);
    const kinds = Object.keys(G.made).map((k) => `${k} ${per(G.made[k], a[k])}`).filter((t) => !t.endsWith(' 0')).join(', ');
    const top = Object.keys(G.madeBy).map((k) => [per(G.madeBy[k], ab[k]), k]).filter((r) => r[0] > 0).sort((x, y) => y[0] - x[0]).slice(0, 14).map((r) => `${String(r[0]).padStart(6)}/s  ${r[1]}`).join(String.fromCharCode(10));
    return `made a second: ${kinds}; written ${((G.wrote - w0) * 1000 / ms / 1048576).toFixed(1)} MB/s${String.fromCharCode(10)}${top}`;
  };

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
