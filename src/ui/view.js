// First person or third: V, the eye by the spell bar (Alt frees the mouse for it), or VIEW under a thumb.
// Which it is goes to the sim as INPUT.THIRD, and the sim says when your body is posed and the camera can stand back
// (H.TP: src/sim/sim.worker.js stepBody, src/core/third.js). Not in Lisandra's cave: the switch isn't there until you're out.
import { H, INPUT } from '../core/layout.js';
import { thirdAllowed } from '../core/third.js';
import { icon, setIcon } from './icons.js';

export class ViewSwitch {
  // o: { input, shared, settings, save(), tip(text, secs), busy(): a panel or the pause is up }
  constructor(o) {
    this.o = o;
    this.on = o.settings.view === 'third';
    this.allowed = false;
    // While auto-play has the camera (Settings' Camera in auto-play, anything but As you left it): 'third', behind him, or
    // 'first', through his eyes. V and the eye then choose between those two, and your own view is kept for when it stops.
    this.auto = null;
    this.autoBack = 'director';
    this.btn = document.createElement('div');
    this.btn.id = 'viewBtn';
    this.btn.title = 'First or third person (V)';
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
    if (this.auto) { this.setAuto(this.auto !== 'first'); return; }
    this.set(!this.on);
  }

  set(on) {
    this.on = !!on;
    this.o.settings.view = this.on ? 'third' : 'first';
    this.o.save();
    this.draw();
  }

  // Auto-play's view: through his eyes, or back behind him the way it was (directed, or not).
  setAuto(first) {
    const s = this.o.settings;
    if (first) { if (s.autocam !== 'first') this.autoBack = s.autocam || 'director'; s.autocam = 'first'; }
    else s.autocam = this.autoBack === 'third' ? 'third' : 'director';
    this.auto = first ? 'first' : 'third';
    this.o.save();
    this.o.tip(first ? 'Auto-play in first person. V for the view behind him.' : 'Auto-play from behind him. V for first person.', 3);
    this.draw();
  }

  get third() { return this.auto ? this.auto === 'third' : this.on; }

  draw() {
    const shown = this.allowed ? '' : 'none', third = this.third && this.allowed;
    this.btn.style.display = shown;
    this.btn.classList.toggle('on', third);
    // (The eye on the bar and the phone's VIEW show the view it would give you.)
    const ic = third ? 'view1' : 'view3';
    if (this.btn.dataset.ic !== ic) { this.btn.dataset.ic = ic; this.btn.innerHTML = `${icon(ic)}<kbd>V</kbd>`; }
    if (this.touchBtn) { this.touchBtn.style.display = this.allowed ? 'flex' : 'none'; setIcon(this.touchBtn, ic); }
    document.body.classList.toggle('third', third);
  }

  // Each frame: whether it can be on yet, and what the sim's told.
  frame(snap) {
    const allowed = thirdAllowed(snap[H.OPENING]);
    if (allowed !== this.allowed || this.auto !== this.wasAuto) { this.allowed = allowed; this.wasAuto = this.auto; this.draw(); }
    this.o.shared.input[INPUT.THIRD] = this.third && allowed ? 1 : 0;
  }
}
