import { C, CHARS_START, C_SIZE, H } from '../core/layout.js';
import { OPENING } from '../core/opening.js';

export class OpeningHUD {
  constructor(onName) {
    this.name = '';
    this.panel = document.createElement('section');
    this.panel.id = 'opening-scene';
    this.panel.hidden = true;
    this.panel.innerHTML = `
      <div class="opening-speaker"></div>
      <p aria-live="polite"></p>
      <form hidden>
        <label for="opening-name">Your birth name</label>
        <div><input id="opening-name" maxlength="32" required autocomplete="off"><button type="submit">Answer</button></div>
        <small>Tessariel (Beacon of the Infinite [Wizard])</small>
      </form>`;
    document.body.append(this.panel);
    this.speaker = this.panel.querySelector('.opening-speaker');
    this.line = this.panel.querySelector('p');
    this.form = this.panel.querySelector('form');
    this.field = this.form.querySelector('input');
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = this.field.value.trim();
      if (!name) return;
      this.name = name;
      this.form.hidden = true;
      onName();
    });
    this.form.addEventListener('keydown', (event) => event.stopPropagation());
  }

  draw(snap, active) {
    const stage = snap[H.OPENING], t = snap[H.OPENING_TIME];
    if (stage === OPENING.NAME && this.lastStage > OPENING.NAME) this.reset();
    this.lastStage = stage;
    this.panel.hidden = !active || !stage || stage === OPENING.ARRIVED && t > 7;
    if (this.panel.hidden) return;
    const showName = stage === OPENING.NAME && t > 8 && !this.name;
    this.speaker.textContent = stage < OPENING.ESCORT ? 'THE WITCH' : 'THE ROAD TO TOWN';
    let line = '';
    switch (stage) {
      case OPENING.NAME:
        line = t < 2.3 ? '…the seventh seal, the beacon, the—oh. You’re awake.'
          : t < 5.5 ? 'You’re Tessariel reborn. Yes, the chosen one. Velscour has to die, and I’m told you’re the one who can manage it.'
          : 'You do remember your birth name, don’t you? Quickly, before the portal hears you.';
        break;
      case OPENING.LEAVE: line = `${this.name || 'Tessariel'}, up you get. Outside. No, really. Now would be excellent.`; break;
      case OPENING.REVEAL: line = t < 1.75 ? 'WHAT HAVE YOU DONE?!' : 'Lisandra. My name is Lisandra. Keep moving.'; break;
      case OPENING.ESCORT: line = 'First quest · Follow Lisandra back to town.'; break;
      case OPENING.ARRIVED: line = 'Quest complete · Return to town with Lisandra.'; break;
    }
    if (this.line.textContent !== line) this.line.textContent = line;
    this.form.hidden = !showName;
  }

  save(snap) {
    const co = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    return {
      opening: this.name && snap[H.OPENING] === OPENING.NAME ? OPENING.LEAVE : snap[H.OPENING],
      guide: [snap[co + C.X], snap[co + C.Z], snap[co + C.YAW], snap[H.OPENING_NEXT]],
      name: this.name,
    };
  }

  reset(name = '') {
    this.lastStage = null;
    this.name = name;
    this.field.value = name;
  }
}
