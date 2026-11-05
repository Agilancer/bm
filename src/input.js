// Mouse and keyboard on PC; a virtual stick, look drag and buttons on touch screens.
import { INPUT } from './core/layout.js';

const SENS = 0.0021, TOUCH_SENS = 0.0056;

export class Input {
  constructor(canvas, shared) {
    this.canvas = canvas;
    this.s = shared;
    this.keys = new Set();
    this.yaw = Math.PI; this.pitch = 0;
    this.yawVel = 0; this.pitchVel = 0;
    this.moveX = 0; this.moveZ = 0;
    this.sprintToggle = false;
    this.enabled = false;
    this.menu = false;   // a menu is up: the hands and feet are off duty
    this.sens = 1;   // the Look speed setting
    this.onPauseChange = null;
    this.touch = /Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
    this.bindMouse();
    if (this.touch) this.bindTouch();
    this.stickId = null; this.lookId = null;
  }

  fire(slot) { this.s[slot] += 1; }

  bindMouse() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      // (Alt would take the browser's focus to its menu.)
      if (e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); this.softOn(true); }
      if (!this.enabled || this.menu) return;
      if (e.code === 'Space') { this.fire(INPUT.JUMP); e.preventDefault(); }
      if (e.code === 'KeyQ') this.fire(INPUT.DODGE);
      if (e.code === 'KeyF') this.fire(INPUT.CAST_N);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); this.softOn(false); } });
    window.addEventListener('blur', () => { this.keys.clear(); this.softOn(false); });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== this.canvas) return;
      if (this.soft) {
        this.softX = Math.max(0, Math.min(innerWidth - 1, this.softX + e.movementX));
        this.softY = Math.max(0, Math.min(innerHeight - 1, this.softY + e.movementY));
        this.softMove?.(this.softX, this.softY);
        return;
      }
      this.look(e.movementX * SENS * this.sens, e.movementY * SENS * this.sens);
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement !== this.canvas && !this.touch) { this.lock(); return; }
      if (this.soft) { if (e.button === 0) this.softPress?.(this.softX, this.softY); return; }
      if (e.button === 0) this.fire(INPUT.ATTACK);
      if (e.button === 2) { this.guardMouse = true; this.s[INPUT.BLOCK] = 1; this.fire(INPUT.WIDE); }     // (held before the press is seen: the shield drops when it isn't)
      if (e.button === 1) { e.preventDefault(); this.castMouse = true; this.fire(INPUT.CAST_N); }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 1) this.castMouse = false; if (e.button === 2) { this.guardMouse = false; if (!this.guardTouch) this.s[INPUT.BLOCK] = 0; } });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (this.onPauseChange && !this.touch) this.onPauseChange(!locked);
    });
  }

  // The soft cursor, while Alt is held: the mouse moves it, not the view. It starts over the spell bar.
  softOn(on) {
    if (on && (!this.enabled || this.menu || document.pointerLockElement !== this.canvas)) return;
    if (this.soft === on) return;
    this.soft = on;
    if (on) { this.softX = innerWidth / 2; this.softY = innerHeight - 50; this.softMove?.(this.softX, this.softY); }
    this.softShow?.(on);
  }

  lock() {
    if (this.touch) return;
    const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => { const q = this.canvas.requestPointerLock(); if (q && q.catch) q.catch(() => { if (this.onLockRefused) this.onLockRefused(); }); });
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy));
    this.yawVel += dx; this.pitchVel += dy;
  }

  bindTouch() {
    document.body.classList.add('touch');
    const root = document.getElementById('touch');
    const stick = document.getElementById('stick'), nub = document.getElementById('nub');
    const R = 52;
    const start = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.42 && this.stickId === null) {
          this.stickId = t.identifier;
          this.ox = t.clientX; this.oy = t.clientY;
          stick.style.display = 'block';
          stick.style.left = `${t.clientX - 65}px`; stick.style.top = `${t.clientY - 65}px`;
        } else if (this.lookId === null) {
          this.lookId = t.identifier;
          this.lx = t.clientX; this.ly = t.clientY;
        }
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          let dx = t.clientX - this.ox, dy = t.clientY - this.oy;
          const L = Math.hypot(dx, dy);
          if (L > R) { dx *= R / L; dy *= R / L; }
          nub.style.transform = `translate(${dx}px, ${dy}px)`;
          this.stickX = dx / R; this.stickY = -dy / R;
          // Pushing all the way forward breaks into a run.
          this.stickRun = this.stickY > 0.9 && L > R * 1.25;
        } else if (t.identifier === this.lookId) {
          this.look((t.clientX - this.lx) * TOUCH_SENS * this.sens, (t.clientY - this.ly) * TOUCH_SENS * this.sens);
          this.lx = t.clientX; this.ly = t.clientY;
        }
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          this.stickId = null; this.stickX = 0; this.stickY = 0; this.stickRun = false;
          stick.style.display = 'none'; nub.style.transform = '';
        } else if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    root.addEventListener('touchstart', start, { passive: false });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end);
    root.addEventListener('touchcancel', end);
    const btn = (id, fn) => {
      const el = document.getElementById(id);
      // A thumb on a button can still steer: drag off it, or on it, and the view follows.
      el.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!this.enabled) return;
        fn(el);
        const t = e.changedTouches[0];
        if (this.lookId === null) { this.lookId = t.identifier; this.lx = t.clientX; this.ly = t.clientY; }
      }, { passive: false });
    };
    btn('bAttack', () => this.fire(INPUT.ATTACK));
    btn('bWide', () => { this.guardTouch = true; this.s[INPUT.BLOCK] = 1; this.fire(INPUT.WIDE); });
    const lower = () => { this.guardTouch = false; if (!this.guardMouse) this.s[INPUT.BLOCK] = 0; };
    document.getElementById('bWide').addEventListener('touchend', lower);
    document.getElementById('bWide').addEventListener('touchcancel', lower);
    btn('bJump', () => { this.jumpTouch = true; this.fire(INPUT.JUMP); });
    const letGo = () => { this.jumpTouch = false; };
    document.getElementById('bJump').addEventListener('touchend', letGo);
    document.getElementById('bJump').addEventListener('touchcancel', letGo);
    btn('bDodge', () => this.fire(INPUT.DODGE));
    btn('bCast', () => { this.castTouch = true; this.fire(INPUT.CAST_N); });
    const lift = () => { this.castTouch = false; };
    document.getElementById('bCast').addEventListener('touchend', lift);
    document.getElementById('bCast').addEventListener('touchcancel', lift);
    btn('bSprint', (el) => { this.sprintToggle = !this.sprintToggle; el.classList.toggle('on', this.sprintToggle); });
  }

  update() {
    const s = this.s, k = this.keys;
    let mx = 0, mz = 0;
    if (this.enabled && !this.menu) {
      if (k.has('KeyW') || k.has('ArrowUp')) mz += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) mz -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
      if (this.stickX || this.stickY) { mx = this.stickX || 0; mz = this.stickY || 0; }
    }
    this.moveX = mx; this.moveZ = mz;
    s[INPUT.MOVE_X] = mx;
    s[INPUT.MOVE_Z] = mz;
    s[INPUT.YAW] = this.yaw;
    s[INPUT.PITCH] = this.pitch;
    s[INPUT.SPRINT] = (k.has('ShiftLeft') || k.has('ShiftRight') || this.sprintToggle || this.stickRun) ? 1 : 0;
    s[INPUT.JUMP_HELD] = this.enabled && !this.menu && (k.has('Space') || this.jumpTouch) ? 1 : 0;
    s[INPUT.CAST] = this.enabled && !this.menu && (k.has('KeyF') || this.castMouse || this.castTouch || this.castSlot) ? 1 : 0;
    s[INPUT.BLOCK] = this.enabled && !this.menu && (this.guardMouse || this.guardTouch) ? 1 : 0;
  }
}
