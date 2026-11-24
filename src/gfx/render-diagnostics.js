// Local-only diagnostics for failures that leave the simulation running behind
// an unchanged canvas. Off unless the page is opened with ?diagnose=1: without
// it nothing is drawn over the game, and errors only go to the console.
// When it's on, the panel can be folded to one line (–) or closed (×).
export class RenderDiagnostics {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.errors = [];
    this.frames = 0;
    this.lastFrame = 0;
    this.stage = 'boot';
    this.small = false;
  }

  attach(readStatus) {
    this.readStatus = readStatus;
    if (this.enabled) {
      this.draw();
      this.timer = setInterval(() => this.draw(), 1000);
    }
  }

  fail(error, stage = this.stage) {
    // GPU errors may have an unhelpful stack on Safari. Preserve the message.
    const detail = error?.message || error?.stack || String(error);
    const message = `${stage}: ${detail}`;
    if (!this.errors.includes(message)) {
      this.errors.push(message);
      if (!this.enabled) console.error('render:', message, error);
    }
    this.errors = this.errors.slice(-3);
    this.draw();
  }

  presented() { this.frames++; this.lastFrame = performance.now(); }

  close() {
    this.enabled = false;
    clearInterval(this.timer);
    this.panel?.remove();
    this.panel = this.text = null;
  }

  build() {
    const panel = this.panel = document.createElement('div');
    panel.id = 'render-diagnostics';
    panel.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top, 0px));left:8px;z-index:9999;background:#100e0ef2;color:#fff;font:12px/1.4 monospace;pointer-events:auto;display:flex;flex-direction:column';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px 2px 2px 10px';
    this.title = document.createElement('span');
    this.title.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    const button = (label, name, act) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-label', name);
      b.style.cssText = 'flex:none;width:40px;height:36px;border:0;background:#fff2;color:#fff;font:18px/1 monospace;touch-action:manipulation';
      // The game listens for touches on the whole page: keep these to the panel.
      for (const type of ['pointerdown', 'touchstart', 'mousedown']) b.addEventListener(type, e => e.stopPropagation());
      b.addEventListener('click', e => { e.stopPropagation(); act(); });
      return b;
    };
    this.fold = button('–', 'Minimize diagnostics', () => { this.small = !this.small; this.draw(); });
    bar.append(this.title, this.fold, button('×', 'Close diagnostics', () => this.close()));
    this.text = document.createElement('pre');
    this.text.style.cssText = 'margin:0;padding:4px 10px 10px;max-height:45vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text';
    panel.append(bar, this.text);
    document.body.append(panel);
  }

  draw() {
    if (!this.enabled) return;
    if (!this.panel) this.build();
    const errors = this.errors.length;
    this.title.textContent = this.small ? (errors ? `DIAG · ${errors} error${errors > 1 ? 's' : ''}` : 'DIAG') : 'BM RENDER DIAGNOSTICS v2';
    this.title.style.color = errors ? '#ff8a8a' : '#fff';
    this.fold.textContent = this.small ? '+' : '–';
    this.fold.setAttribute('aria-label', this.small ? 'Expand diagnostics' : 'Minimize diagnostics');
    this.panel.style.right = this.small ? 'auto' : '8px';
    this.text.style.display = this.small ? 'none' : '';
    if (this.small) return;
    const status = this.readStatus?.() || {};
    this.text.textContent = [
      `Frames submitted: ${this.frames}; last frame: ${this.lastFrame ? Math.round(performance.now() - this.lastFrame) + ' ms ago' : 'none'}; stage: ${this.stage}`,
      ...Object.entries(status).map(([key, value]) => `${key}: ${value}`),
      ...this.errors.map(error => `ERROR ${error}`),
    ].join('\n');
  }
}
