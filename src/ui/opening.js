import { openingBeat } from '../core/opening-script.js';
import { C, C_PROPS, CHARS_START, C_SIZE, H } from '../core/layout.js';
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
    this.namePanel = document.createElement('section');
    this.namePanel.id = 'opening-name-panel';
    this.namePanel.hidden = true;
    this.namePanel.append(this.form);
    document.body.append(this.namePanel);
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
    const beat = openingBeat(stage, t);
    if (beat !== this.lastBeat || t < this.lastTime) {
      if (active && beat?.breath && t - beat.at < 0.5) this.onBreath?.(beat.breath, snap);
      this.lastBeat = beat;
    }
    this.lastTime = t;
    this.namePanel.hidden = !active || stage !== OPENING.NAME || t < NAME_PROMPT_AT || !!this.name;
    this.panel.hidden = !active || !stage || (stage === OPENING.NAME && t < 1.15)
      || (stage === OPENING.ARRIVED && t > 9);
    if (this.panel.hidden) return;
    const showName = stage === OPENING.NAME && t > NAME_PROMPT_AT && !this.name;
    this.speaker.textContent = stage < OPENING.ESCORT ? 'THE WITCH' : 'LISANDRA';
    let line = '';
    switch (stage) {
      case OPENING.NAME:
      case OPENING.LEAVE:
      case OPENING.REVEAL:
        line = (beat?.text ?? '').replace('{name}', this.name || 'Tessariel');
        break;
      case OPENING.ESCORT:
        this.speaker.textContent = 'FIRST QUEST - FOLLOW LISANDRA TO TOWN';
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
    this.playerSpeaking = beat?.who === 'player';
    this.panel.classList.toggle('player-speaking', this.playerSpeaking);
    if (this.playerSpeaking) this.speaker.textContent = this.name || 'YOU';
    if (!line) this.panel.hidden = true;
    if (this.line.textContent !== line) this.line.textContent = line;
    this.form.hidden = !showName;
  }

  position(snap, camera) {
    if (this.panel.hidden) return;
    if (this.playerSpeaking) {
      this.panel.style.visibility = 'visible';
      this.panel.style.left = '50%';
      this.panel.style.top = '72%';
      return;
    }
    const guide = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    const dx = snap[guide + C_PROPS] - camera.x;
    const dy = snap[guide + C_PROPS + 1] - camera.y;
    const dz = snap[guide + C_PROPS + 2] - camera.z;
    const depth = dx * camera.fx + dy * camera.fy + dz * camera.fz;
    if (depth < 0.15 || depth > 26) { this.panel.style.visibility = 'hidden'; return; }
    const rx = camera.fy * camera.uz - camera.fz * camera.uy;
    const ry = camera.fz * camera.ux - camera.fx * camera.uz;
    const rz = camera.fx * camera.uy - camera.fy * camera.ux;
    const f = innerHeight / (2 * Math.tan(64 * Math.PI / 360));
    const x = innerWidth / 2 + (dx * rx + dy * ry + dz * rz) / depth * f;
    const y = innerHeight / 2 - (dx * camera.ux + dy * camera.uy + dz * camera.uz) / depth * f;
    this.panel.style.visibility = x < -60 || x > innerWidth + 60 ? 'hidden' : 'visible';
    const half = Math.min(170, innerWidth * 0.43);
    this.panel.style.left = `${Math.max(half + 10, Math.min(innerWidth - half - 10, x))}px`;
    this.panel.style.top = `${Math.max(this.panel.offsetHeight + 28, y - 8)}px`;
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
    this.lastBeat = null;
    this.lastTime = -1;
    this.name = name;
    this.field.value = name;
  }
}
