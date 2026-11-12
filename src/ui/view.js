// First person or third: V, the eye by the spell bar (Alt frees the mouse for it), or VIEW under a thumb.
// Which it is goes to the sim as INPUT.THIRD, and the sim says when your body is posed and the camera can stand back
// (H.TP: src/sim/sim.worker.js stepBody, src/core/third.js). Not in Lisandra's cave: the switch isn't there until you're out.
import { H, INPUT } from '../core/layout.js';
import { thirdAllowed } from '../core/third.js';
import { setIcon } from './icons.js';

export class ViewSwitch {
  // o: { input, shared, settings, save(), tip(text, secs), busy(): a panel or the pause is up }
  constructor(o) {
    this.o = o;
    this.on = o.settings.view === 'third';
    this.allowed = false;
    this.btn = document.createElement('div');
    this.btn.id = 'viewBtn';
    this.btn.title = 'First or third person (V)';
    this.btn.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg><kbd>V</kbd>';
    document.getElementById('spells').appendChild(this.btn);
    this.touchBtn = document.getElementById('bView');
    const press = (e) => { e.preventDefault(); e.stopPropagation(); this.toggle(); };
    this.btn.addEventListener('mousedown', press);
    this.btn.addEventListener('touchstart', press, { passive: false });
    this.touchBtn?.addEventListener('touchstart', press, { passive: false });
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyV' && !e.repeat && !e.ctrlKey && !e.metaKey) this.toggle(); });
    this.draw();
  }

  toggle() {
    const { input } = this.o;
    if (!input.enabled || input.menu || this.o.busy()) return;
    if (!this.allowed) { this.o.tip('Not in here. Once you are out of the cave.', 2.5); return; }
    this.set(!this.on);
  }

  set(on) {
    this.on = !!on;
    this.o.settings.view = this.on ? 'third' : 'first';
    this.o.save();
    this.draw();
  }

  draw() {
    const shown = this.allowed ? '' : 'none', third = this.on && this.allowed;
    this.btn.style.display = shown;
    this.btn.classList.toggle('on', third);
    // (The button shows the view it would give you.)
    if (this.touchBtn) { this.touchBtn.style.display = this.allowed ? 'flex' : 'none'; setIcon(this.touchBtn, third ? 'view1' : 'view3'); }
    document.body.classList.toggle('third', third);
  }

  // Each frame: whether it can be on yet, and what the sim's told.
  frame(snap) {
    const allowed = thirdAllowed(snap[H.OPENING]);
    if (allowed !== this.allowed) { this.allowed = allowed; this.draw(); }
    this.o.shared.input[INPUT.THIRD] = this.on && allowed ? 1 : 0;
  }
}
