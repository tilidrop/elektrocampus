export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // nur für feste Icon-Strings
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  home: P('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  buch: P('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/>'),
  werkzeug: P('<path d="M14 6a4 4 0 005 5l-9 9a2.1 2.1 0 01-3-3l9-9"/><path d="M14 6l2-2 4 4-2 2"/>'),
  quiz: P('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2"/><path d="M12 17h.01"/>'),
  chart: P('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  schloss: P('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  stern: P('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  blitz: P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  haken: P('<path d="M5 12l5 5 9-10"/>'),
  zurueck: P('<path d="M15 5l-7 7 7 7"/>'),
  pfeil: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  uhr: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};
export function icon(name) {
  return h("span", { class: "ic", html: ICONS[name] || "" });
}

export function balken(prozent, klasse = "") {
  const p = Math.max(0, Math.min(100, Math.round(prozent)));
  return h("div", { class: `bar ${klasse}`, role: "progressbar", "aria-valuenow": p, "aria-valuemin": 0, "aria-valuemax": 100 }, h("span", { style: `width:${p}%` }));
}

export function zurueck(href, text) {
  return h("a", { class: "back", href }, icon("zurueck"), text);
}

// Wie replaceChildren, ignoriert aber null und false (sonst würde "null" als Text erscheinen).
export function setze(container, ...kids) {
  container.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
}
