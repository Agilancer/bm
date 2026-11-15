// First person or third: V, the eye by the spell bar (Alt frees the mouse for it), or VIEW under a thumb.
// Which it is goes to the sim as INPUT.THIRD, and the sim says when your body is posed and the camera can stand back
// (H.TP: src/sim/sim.worker.js stepBody, src/core/third.js). Not in Lisandra's cave: the switch isn't there until you're out.
//
// The mouse wheel too, with the mouse held by the game: out of first person it puts the camera just behind you, each notch
// out takes it further back (THIRD.far at most) and each in nearer, and one more notch in once it's as near as it goes is
// first person again. How far back it was is kept with the settings (`zoom`), and V goes back to it. (Shift and the wheel
// still turn the spell bar: src/ui/spellbar.js. The big map's wheel is its own: src/ui/map.js.)
import { H, INPUT } from '../core/layout.js';
import { THIRD, thirdAllowed, thirdZoom, zoomBy } from '../core/third.js';
import { icon, setIcon } from './icons.js';

// A notch in, from the nearest, is first person only once the wheel's been still this long with the camera there: a spin in
// toward you (or a trackpad's run-on) stops at your back, and doesn't carry on into your eyes. The next notch does.
const SETTLE = 0.18;

export class ViewSwitch {
  // o: { input, shared, settings, save(), tip(text, secs), busy(): a panel or the pause is up }
  constructor(o) {
    this.o = o;
    this.on = o.settings.view === 'third';
    this.zoom = thirdZoom(o.settings.zoom);
    this.closeAt = -1;   // (when the wheel brought it as near as it goes, by the clock: SETTLE)
    this.push = 0; this.pushAt = -1;
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
    window.addEventListener('wheel', (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey || !(this.o.input.wheelOk?.(e) ?? document.pointerLockElement)) return;
      // (A notch is 100 or so of deltaY in pixels, 3 in lines; a trackpad sends it a little at a time.)
      this.wheel(e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1) / 100);
    }, { passive: true });
    this.draw();
  }

  // The wheel turned this many notches (out, away from you, is more).
  wheel(notches) {
    const { input } = this.o;
    if (!notches || !input.enabled || input.menu || this.o.busy()) return;
    if (!this.allowed) { if (notches > 0 && !this.third) this.o.tip('Not in here. Once you are out of the cave.', 2.5); return; }
    const now = performance.now() / 1000;
    // (Into or out of first person takes half a notch the one way, so a trackpad's brush doesn't flip the view.)
    if (now - this.pushAt > 0.3 || Math.sign(notches) !== Math.sign(this.push)) this.push = 0;
    this.pushAt = now;
    if (!this.third) {
      // Out of first person: just behind you.
      if (notches < 0 || (this.push += notches) < 0.5) return;
      this.push = 0; this.zoom = THIRD.close; this.closeAt = now; this.keepZoom();
      if (this.auto) this.setAuto(false); else this.set(true);
      return;
    }
    if (notches < 0 && this.zoom <= THIRD.close + 1e-3) {
      // As near as it goes already: first person, once it's been there a moment. V then brings you back to V's own distance.
      if (now - this.closeAt < SETTLE) { this.closeAt = now; this.push = 0; return; }
      if ((this.push += notches) > -0.5) return;
      this.push = 0; this.zoom = THIRD.dist; this.keepZoom();
      if (this.auto) this.setAuto(true); else this.set(false);
      return;
    }
    this.push = 0;
    this.zoom = zoomBy(this.zoom, notches);
    if (this.zoom <= THIRD.close + 1e-3) this.closeAt = now;
    this.keepZoom();
  }

  keepZoom() {
    if (this.o.settings.zoom === this.zoom) return;
    this.o.settings.zoom = this.zoom;
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => this.o.save(), 400);
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
