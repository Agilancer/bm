// The interface's own pictures: what the thumbs press, what the top bar opens, the small marks in the menus. Each is drawn here
// on a 24 box, in lines, so the game has every one of them with nothing downloaded. A painted one from the art kit
// (tools/ui/, assets/ui/kit/) goes over its drawing when it's there: src/ui/skin.js finds anything marked data-ic="<name>".
const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor" stroke="none"';

export const ICONS = {
  // ---- under the thumbs
  staff: `<g ${S}><path d="M4 21 14.300 8.700"/><circle cx="16.800" cy="6.200" r="2.700"/><path d="M16.800 1v1.300M22 6.200h-1.300M20.500 2.500l-.9.9M20.500 9.900l-.9-.9"/></g>`,
  guard: `<g ${S}><path d="M12 2.500 20 5.500v6c0 5-3.500 8.300-8 10-4.500-1.700-8-5-8-10v-6z"/><path d="M12 7v9.500M8.300 11h7.400"/></g>`,
  jump: `<g ${S}><path d="M12 19V5.500M6.500 11 12 5.500l5.500 5.500"/><path d="M6 21.500h12" opacity=".55"/></g>`,
  dodge: `<g ${S}><path d="M9 12h12M16.500 7.500 21 12l-4.500 4.500"/><path d="M2.500 8.500h4M2.500 12h2.500M2.500 15.500h4" opacity=".6"/></g>`,
  sprint: `<g ${S}><path d="M4 6.500 9.500 12 4 17.500M11 6.500 16.500 12 11 17.500"/><path d="M18 9l3 3-3 3" opacity=".6"/></g>`,
  cast: `<g ${S}><path d="M11 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M18.500 15.500l.8 2.200 2.200.8-2.200.8-.8 2.200-.8-2.200-2.200-.8 2.200-.8z"/></g>`,
  take: `<g ${S}><path d="M8.500 12.500V5.800a1.400 1.400 0 0 1 2.800 0V11M11.300 10.500V4.400a1.400 1.400 0 0 1 2.800 0V11M14.100 11V5.800a1.400 1.400 0 0 1 2.800 0v6M16.900 9.500a1.400 1.400 0 0 1 2.800 0V15c0 3.600-2.600 6.500-6.400 6.500-2.700 0-4.300-1-5.700-3.300L5 14.300a1.400 1.400 0 0 1 2.300-1.600l1.200 1.700"/></g>`,
  talk: `<g ${S}><path d="M4 4.500h16v11.500h-8.500L6.500 20v-4H4z"/><path d="M8 8.800h8M8 12h5"/></g>`,
  open: `<g ${S}><path d="M4 21h16M6.500 21V3.500h8V21"/><path d="M14.500 5 19 6.500V21"/><circle cx="12" cy="12.500" r=".7" ${F}/></g>`,
  shut: `<g ${S}><path d="M4 21h16M6.500 21V3.500h11V21"/><path d="M10 7.500h4M10 11h4"/><circle cx="15" cy="14.500" r=".7" ${F}/></g>`,
  locked: `<g ${S}><rect x="5" y="10.500" width="14" height="10.500" rx="1.500"/><path d="M8 10.500v-3a4 4 0 0 1 8 0v3M12 14.500V17"/></g>`,
  // ---- along the top
  pack: `<g ${S}><path d="M6 9.500a6 6 0 0 1 12 0V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9.500 4.800v-.6a2.500 2.500 0 0 1 5 0v.6M6 13.500h12M10 13.500v3h4v-3"/></g>`,
  book: `<g ${S}><path d="M12 6C10 4.600 7 4 4 4.500v14.300c3-.5 6 .1 8 1.500 2-1.400 5-2 8-1.500V4.500c-3-.5-6 .1-8 1.500zM12 6v14.300"/><path d="M16 8.300l.7 1.800 1.800.7-1.800.7-.7 1.800-.7-1.800-1.800-.7 1.800-.7z" ${F}/></g>`,
  journal: `<g ${S}><path d="M8 3h9.500A1.500 1.500 0 0 1 19 4.500v15a1.500 1.500 0 0 1-1.500 1.500H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM8 3v18"/><path d="M11.500 8h4.500M11.500 11.500h4.500M11.500 15h2.500"/></g>`,
  map: `<g ${S}><path d="M3 6.500 9 4l6 2.500L21 4v13.500L15 20l-6-2.500L3 20zM9 4v13.500M15 6.500V20"/></g>`,
  menu: `<g ${S}><path d="M4.500 7h15M4.500 12h15M4.500 17h15"/></g>`,
  view1: `<g ${S}><path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/></g>`,
  view3: `<g ${S}><circle cx="12" cy="5.500" r="2.500"/><path d="M12 8v6.500M7.500 10.800h9M12 14.500 8.800 21M12 14.500l3.200 6.500"/><path d="M3 15.500a9.500 9.500 0 0 0 3 4.500M21 15.500a9.500 9.500 0 0 1-3 4.500" opacity=".6"/></g>`,
  // ---- in the menus
  close: `<g ${S}><path d="M6 6l12 12M18 6 6 18"/></g>`,
  sort: `<g ${S}><path d="M4 6.500h16M4 12h11M4 17.500h6"/><path d="M18 14v6.500M15.500 18l2.500 2.500 2.500-2.500"/></g>`,
  plus: `<g ${S}><path d="M12 5v14M5 12h14"/></g>`,
  minus: `<g ${S}><path d="M5 12h14"/></g>`,
  centre: `<g ${S}><circle cx="12" cy="12" r="6.500"/><circle cx="12" cy="12" r="1.200" ${F}/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3"/></g>`,
  resume: `<g ${S}><path d="M8 5l11 7-11 7z"/></g>`,
  save: `<g ${S}><path d="M5 4h11.500L20 7.500V20H5z"/><path d="M8.500 4v5h7V4M8.500 20v-6h8v6"/></g>`,
  load: `<g ${S}><path d="M4 8.500V19h16V8.500h-8L10 6H4z"/><path d="M12 11.500v5M9.500 14.500 12 17l2.500-2.500"/></g>`,
  settings: `<g ${S}><circle cx="12" cy="12" r="3"/><path d="M12 2.800v2.700M12 18.500v2.700M2.800 12h2.700M18.500 12h2.700M5.500 5.500l1.900 1.900M16.600 16.600l1.900 1.900M18.500 5.500l-1.900 1.900M7.400 16.600l-1.900 1.900"/></g>`,
  howto: `<g ${S}><circle cx="12" cy="12" r="9"/><path d="M9.300 9.300a2.800 2.800 0 1 1 4.200 2.400c-.9.6-1.500 1.100-1.500 2.300"/><circle cx="12" cy="17.300" r=".8" ${F}/></g>`,
  home: `<g ${S}><path d="M3.500 11.500 12 4l8.500 7.500M6 9.800V20h12V9.800"/><path d="M10 20v-5.500h4V20"/></g>`,
  gold: `<g ${S}><ellipse cx="12" cy="8" rx="7" ry="3.200"/><path d="M5 8v4c0 1.800 3.100 3.200 7 3.200s7-1.400 7-3.200V8M5 12v4c0 1.800 3.100 3.200 7 3.200s7-1.400 7-3.200v-4"/></g>`,
  quest: `<g ${S}><path d="M12 3.500v11"/><circle cx="12" cy="19.300" r="1.200" ${F}/></g>`,
  rotate: `<g ${S}><rect x="8" y="2.500" width="8" height="14" rx="1.500" opacity=".5"/><rect x="2.500" y="13.500" width="14" height="8" rx="1.500"/><path d="M18.500 7a5.500 5.500 0 0 1 2.500 4.500M21 8.800v2.900h-2.900"/></g>`,
};

/** The picture's markup. */
export const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.quest}</svg>`;

/** Put a picture (and a word under it, if there's one) on a button: the button keeps the name, for the painted one to find. */
export function setIcon(el, name, label = '') {
  if (!el || (el.dataset.ic === name && el.dataset.lb === label && el.firstElementChild)) return;
  el.dataset.ic = name; el.dataset.lb = label;
  el.innerHTML = icon(name) + (label ? `<span class="lb">${label}</span>` : '');
}

/** Every element under root marked data-ic and not yet drawn. */
export function paintIcons(root = document) {
  for (const el of root.querySelectorAll('[data-ic]')) if (!el.firstElementChild) el.innerHTML = icon(el.dataset.ic) + (el.dataset.lb ? `<span class="lb">${el.dataset.lb}</span>` : '');
}
