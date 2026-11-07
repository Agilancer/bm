import { C, CHARS_START, C_SIZE, H } from '../core/layout.js';
import { smoothstep } from '../core/math.js';
import { NAME_PROMPT_AT, OPENING, OPENING_REVISION, REVEAL_SWAP_AT } from '../core/opening.js';

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
    this.eyes = document.createElement('div');
    this.eyes.id = 'opening-eyes';
    this.eyes.hidden = true;
    this.eyes.setAttribute('aria-hidden', 'true');
    this.eyes.append(document.createElement('span'), document.createElement('span'));
    document.body.append(this.panel, this.eyes);
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
    const flash = stage === OPENING.REVEAL && Math.abs(t - REVEAL_SWAP_AT) < 0.37;
    this.eyes.classList.toggle('reveal', flash);
    this.eyes.hidden = !active || (!flash && (stage !== OPENING.NAME || t > 3.55));
    if (flash) {
      this.eyes.style.setProperty('--flash', String(0.78 * (1 - smoothstep(0, 0.37, Math.abs(t - REVEAL_SWAP_AT)))));
    } else if (!this.eyes.hidden) {
      const rise = smoothstep(0.32, 2.25, t);
      const blink = smoothstep(2.42, 2.65, t) * (1 - smoothstep(2.66, 3.23, t));
      this.eyes.style.setProperty('--lid', `${(1 - rise * (1 - blink * 0.94)) * 57}vh`);
      this.eyes.style.setProperty('--haze', `${(1 - smoothstep(0.9, 3.5, t)) * 5}px`);
    }
    this.panel.hidden = !active || !stage || (stage === OPENING.NAME && t < 1.15)
      || (stage === OPENING.ARRIVED && t > 9);
    if (this.panel.hidden) return;
    const showName = stage === OPENING.NAME && t > NAME_PROMPT_AT && !this.name;
    this.speaker.textContent = stage < OPENING.ESCORT ? 'THE WITCH' : 'LISANDRA';
    let line = '';
    switch (stage) {
      case OPENING.NAME:
        line = t < 3.4 ? 'Let the flame remember the soul. Let the soul remember its…'
          : t < 6.0 ? 'Oh! You’re awake. I had a whole speech for this.'
          : t < 10.6 ? 'You’re Tessariel reborn. I called across the dark for you. Something finally answered.'
          : t < 15.4 ? 'Velscour has a thousand voices. They all want you dead. You’re the one who can silence them.'
          : 'But Tessariel is the name the dead know you by. What did the living call you?';
        break;
      case OPENING.LEAVE:
        line = t < 4.8 ? `${this.name || 'Tessariel'}. Good. Hold on to that. Come on, the trail is this way.`
          : 'Watch the loose stones. And if the book asks you a question, let me answer.';
        break;
      case OPENING.REVEAL:
        line = t < 1.7 ? 'WHAT HAVE YOU DONE?!'
          : t < 5.5 ? 'Wait. Look at me. What face do you see?'
          : 'Oh, that’s bad. Lisandra. My name is Lisandra. We need to get off this hill.';
        break;
      case OPENING.ESCORT:
        this.speaker.textContent = 'FIRST QUEST · FOLLOW LISANDRA TO TOWN';
        line = t < 6 ? 'Stay close. I know the turns. You watch the trees.'
          : snap[H.OPENING_NEXT] < 6 ? 'If you lose sight of me, follow the worn stones down to the south road.'
          : snap[H.OPENING_NEXT] < 10 ? 'I used to come up here for the quiet. The book ruined that.'
          : snap[H.OPENING_NEXT] < 14 ? 'See where the trail widens? That’s the road into town.'
          : 'There. The village. Let me do the talking if anyone stops us.';
        break;
      case OPENING.ARRIVED:
        this.speaker.textContent = 'QUEST COMPLETE';
        line = 'We’re here. Keep your birth name to yourself for a little while longer.';
        break;
    }
    if (this.line.textContent !== line) this.line.textContent = line;
    this.form.hidden = !showName;
  }

  save(snap) {
    const co = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    return {
      openingRevision: OPENING_REVISION,
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
