// The clock in the corner: a tower dial, hour and minute hands on it, and through a slot above the middle the sun and the moon going round on a wheel.
import { phaseName } from './gfx/daylight.js';

const NUMERALS = [['XII', 0], ['III', 3], ['VI', 6], ['IX', 9]];

export class Clock {
  constructor(el) {
    this.el = el;
    const ticks = [];
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) continue;
      const a = i / 12 * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a);
      ticks.push(`<line x1="${(40 + s * 26).toFixed(1)}" y1="${(40 + c * 26).toFixed(1)}" x2="${(40 + s * 30).toFixed(1)}" y2="${(40 + c * 30).toFixed(1)}"/>`);
    }
    const numerals = NUMERALS.map(([t, h]) => {
      const a = h / 12 * Math.PI * 2;
      return `<text x="${(40 + Math.sin(a) * 26.5).toFixed(1)}" y="${(40 - Math.cos(a) * 26.5 + 3).toFixed(1)}">${t}</text>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 80 80" aria-hidden="true">
<defs>
<radialGradient id="clockFace" cx=".42" cy=".36" r=".8"><stop offset="0" stop-color="#8f8263"/><stop offset=".7" stop-color="#6b5f46"/><stop offset="1" stop-color="#3c3426"/></radialGradient>
<radialGradient id="clockIron" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#4b4744"/><stop offset="1" stop-color="#141211"/></radialGradient>
<clipPath id="clockSlot"><path d="M21 34 A19.5 19.5 0 0 1 59 34 Q40 27 21 34 Z"/></clipPath>
</defs>
<circle cx="40" cy="40" r="38.5" fill="url(#clockIron)" stroke="#0a0908" stroke-width="1"/>
<circle cx="40" cy="40" r="33" fill="url(#clockFace)" stroke="#120f0d" stroke-width="1.4"/>
<g clip-path="url(#clockSlot)"><rect class="sky" x="18" y="14" width="44" height="24"/>
<g class="wheel"><circle cx="40" cy="22" r="4.3" fill="#d6b56c" stroke="#5a431c" stroke-width=".7"/><g transform="rotate(180 40 40)"><circle cx="40" cy="22" r="4" fill="#c5cad0"/><circle cx="41.8" cy="21" r="3.3" fill="#1b2230"/></g></g></g>
<path d="M21 34 A19.5 19.5 0 0 1 59 34 Q40 27 21 34 Z" fill="none" stroke="#17130f" stroke-width="1.2"/>
<g class="ticks" stroke="#1d1711" stroke-width="1.2" stroke-linecap="round">${ticks.join('')}</g>
<g class="numerals">${numerals}</g>
<g class="minute"><path d="M39.3 44 L39.6 15 L40 12.5 L40.4 15 L40.7 44 Z" fill="#14100c"/></g>
<g class="hour"><path d="M38.8 45 L38.9 27 L37.6 24.5 L40 19.5 L42.4 24.5 L41.1 27 L41.2 45 Z" fill="#14100c"/></g>
<circle cx="40" cy="40" r="2.1" fill="#26201a" stroke="#0a0806" stroke-width=".6"/>
</svg><div class="phase"></div>`;
    this.hour = el.querySelector('.hour');
    this.minute = el.querySelector('.minute');
    this.wheel = el.querySelector('.wheel');
    this.sky = el.querySelector('.sky');
    this.phase = el.querySelector('.phase');
    this.shown = -1;
  }

  set(hour) {
    // To the minute it's shown at, which is about each second of ours.
    const minutes = Math.floor(hour * 60);
    if (minutes === this.shown) return;
    this.shown = minutes;
    const h = minutes / 60;
    this.hour.setAttribute('transform', `rotate(${(h % 12) * 30} 40 40)`);
    this.minute.setAttribute('transform', `rotate(${(minutes % 60) * 6} 40 40)`);
    this.wheel.setAttribute('transform', `rotate(${(h - 12) * 15} 40 40)`);
    const day = Math.max(0, Math.sin((h - 6) / 12 * Math.PI));
    const c = (a, b) => Math.round(a + (b - a) * day);
    this.sky.setAttribute('fill', `rgb(${c(16, 96)},${c(20, 104)},${c(33, 112)})`);
    const name = phaseName(h);
    if (this.phase.textContent !== name) this.phase.textContent = name;
  }
}
