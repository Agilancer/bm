// Local-only diagnostics for failures that leave the simulation running behind
// an unchanged canvas. ?diagnose=1 also shows a heartbeat when no error is raised.
export class RenderDiagnostics {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.errors = [];
    this.frames = 0;
    this.lastFrame = 0;
    this.stage = 'boot';
  }

  attach(readStatus) {
    this.readStatus = readStatus;
    if (this.enabled) {
      this.draw();
      this.timer = setInterval(() => this.draw(), 1000);
    }
  }

  fail(error, stage = this.stage) {
    const message = `${stage}: ${error?.stack || error?.message || String(error)}`;
    if (!this.errors.includes(message)) this.errors.push(message);
    this.errors = this.errors.slice(-3);
    this.draw();
  }

  presented() { this.frames++; this.lastFrame = performance.now(); }

  draw() {
    if (!this.enabled && !this.errors.length) return;
    if (!this.panel) {
      this.panel = document.createElement('pre');
      this.panel.id = 'render-diagnostics';
      this.panel.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;max-height:55vh;overflow:auto;z-index:9999;margin:0;padding:10px;background:#100e0ef2;color:#fff;font:12px/1.4 monospace;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:auto;user-select:text';
      document.body.append(this.panel);
    }
    const status = this.readStatus?.() || {};
    this.panel.textContent = [
      'BM RENDER DIAGNOSTICS v2',
      `Frames submitted: ${this.frames}; last frame: ${this.lastFrame ? Math.round(performance.now() - this.lastFrame) + ' ms ago' : 'none'}; stage: ${this.stage}`,
      ...Object.entries(status).map(([key, value]) => `${key}: ${value}`),
      ...this.errors.map(error => `ERROR ${error}`),
    ].join('\n');
  }
}
