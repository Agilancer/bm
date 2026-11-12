// The chat log, low on the left as an MMO's would be: what's said near you and across the town by the other Tessariels
// (src/ui/heroes.js), what happens in the land, and everything Lisandra says to you (src/ui/opening.js, src/ui/folk.js).
// Each line fades on its own. It's here rather than with the heroes so it's there with the heroes turned off, and while
// the opening's story has the screen, when only her lines show in it (story: true).

// The channels, as the log shows them: its label and its colour.
export const CHANNEL = { say: ['Say', '#efe6d2'], party: ['Party', '#9cc3ff'], guild: ['Guild', '#86dc95'], trade: ['Trade', '#efae66'], shout: ['Shout', '#ff8a6a'], system: ['', '#f1d68a'],
  // Lisandra, to you.
  her: ['', '#f4ead3'] };

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export class ChatLog {
  constructor({ settings, touch }) {
    this.settings = settings; this.touch = touch;
    this.lines = [];
    const css = document.createElement('style');
    css.textContent = `
      #heroChat { position: fixed; left: 14px; bottom: 132px; width: min(440px, 58vw); pointer-events: none; z-index: 5; font: 13px/1.38 Georgia, serif;
        padding: 6px 10px 6px 8px; border-radius: 6px; background: linear-gradient(90deg, rgba(8,6,4,.5), rgba(8,6,4,.32) 70%, rgba(8,6,4,0)); }
      #heroChat:empty { display: none; }
      #heroChat div { color: #efe6d2; text-shadow: 0 0 3px #000, 0 1px 2px #000; margin-top: 2px; transition: opacity 1.2s; }
      #heroChat div span.n { color: #bfe0ff; } #heroChat div span.c { opacity: .85; }
      #heroChat div.her span.n { color: #e8c77a; }
      #heroChat div.her.soft { font-style: italic; }
      /* While the opening's story has the screen: only what she says, under her bubble (which keeps clear of it: src/ui/speech.js). */
      body.cinematic #heroChat { z-index: 11; }
      body.cinematic #heroChat div:not(.story), body.cinematic #heroChat:not(:has(div.story)) { display: none; }
    `;
    document.head.appendChild(css);
    this.el = document.createElement('div'); this.el.id = 'heroChat';
    document.body.append(this.el);
  }

  // A line: its channel (CHANNEL), who said it (none for the system's), and the words. opts.story: one of hers in the
  // opening, shown while the story has the screen; opts.soft: under her breath, or in your head.
  line(channel, who, text, opts = {}) {
    const [label, colour] = CHANNEL[channel] || CHANNEL.say;
    const el = document.createElement('div');
    el.style.color = colour;
    if (channel === 'her') el.className = `her${opts.story ? ' story' : ''}${opts.soft ? ' soft' : ''}`;
    const tag = label ? `<span class="c">[${label}]</span> ` : '';
    el.innerHTML = `${tag}${who ? `<span class="n">${esc(who)}:</span> ` : ''}${esc(text)}`;
    this.el.appendChild(el);
    // (Hers stay up a little longer: some of hers are long, and they're the story.)
    this.lines.push({ el, t: channel === 'system' ? 10 : channel === 'her' ? 18 : 14 });
    const most = this.touch ? 4 : 8;
    while (this.lines.length > most) this.lines.shift().el.remove();
  }

  system(text) { this.line('system', null, text); }

  // Where it is on the screen, while there's anything in it to see; else null.
  box() {
    const story = document.body.classList.contains('cinematic');
    if (this.shown !== '' || !this.lines.some((e) => !e.gone && (!story || e.el.classList.contains('story')))) return null;
    const r = this.el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  // Each frame: shown or not (the Chat log setting), and the lines fading out one by one.
  // (Gone lines leave the page, so the log's backing goes with the last of them.)
  update(dt, active) {
    const show = active && this.settings.chatlog !== 'off' ? '' : 'none';
    if (this.shown !== show) { this.shown = show; this.el.style.display = show; }
    for (const e of this.lines) { e.t -= dt; if (e.t < 0 && !e.gone) { e.gone = true; e.el.style.opacity = 0; } if (e.t < -1.4) e.el.remove(); }
    if (this.lines.length && this.lines[0].t < -1.4) this.lines = this.lines.filter((e) => e.t >= -1.4);
  }
}
