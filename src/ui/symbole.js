// SVG-Symbole je Teiletyp und Klemmenpositionen. Koordinaten im Schema (ca. 600 x 300).
import { TEILE } from "../engine/teile.js";

const NS = "http://www.w3.org/2000/svg";
export const TREFFER = 24; // Radius der Tippflaeche einer Klemme (Schema-Einheiten; das Schema wird mindestens 1.15-fach dargestellt)

export function s(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) e.setAttribute(k, v);
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid);
  return e;
}

const SCHALTER2 = { in: [-40, 0], out: [40, 0] };
const LAST3 = { l: [-40, -52], n: [-40, 0], pe: [-40, 52] };
// Klemme -> [dx, dy] relativ zur Teilmitte
const GEOM = {
  ausschalter: SCHALTER2,
  taster: SCHALTER2,
  wechsler: { com: [-40, 0], a: [40, -26], b: [40, 26] },
  kreuz: { a1: [-40, -26], a2: [-40, 26], b1: [40, -26], b2: [40, 26] },
  lampe: LAST3,
  steckdose: LAST3,
  dose: { 1: [-50, -23], 2: [0, -23], 3: [50, -23], 4: [-50, 23], 5: [0, 23], 6: [50, 23] },
};
// Beschriftung der Klemme: oben oder unten (Draehte kommen seitlich, so bleibt der Text frei)
const LABEL = {
  ausschalter: () => "unten",
  taster: () => "unten",
  wechsler: (k) => (k === "a" ? "oben" : "unten"),
  kreuz: (k) => (k[1] === "1" ? "oben" : "unten"),
  lampe: (k) => (k === "pe" ? "unten" : "oben"),
  steckdose: (k) => (k === "pe" ? "unten" : "oben"),
};
// Grobe Ausdehnung inkl. Beschriftung: [x0, y0, x1, y1] relativ zur Mitte
const BOX = {
  quelle: [-22, -34, 22, 20],
  ausschalter: [-90, -46, 90, 40],
  taster: [-90, -46, 90, 40],
  wechsler: [-70, -54, 70, 62],
  kreuz: [-70, -60, 70, 62],
  lampe: [-70, -84, 80, 86],
  steckdose: [-70, -84, 80, 86],
  dose: [-100, -52, 78, 52],
};

const klemmenListe = (teil) => (teil.typ === "quelle" ? [""] : TEILE[teil.typ]?.klemmen || []);
export const klemmenId = (teil, k) => (teil.typ === "quelle" ? teil.id : `${teil.id}.${k}`);

// Position einer Klemme (klemme leer bei Quellen).
export function klemmenPos(teil, klemme) {
  if (teil.typ === "quelle") return { x: teil.x, y: teil.y };
  const d = GEOM[teil.typ]?.[klemme];
  if (!d) return null;
  return { x: teil.x + d[0], y: teil.y + d[1] };
}

// Alle Klemmen der Schaltung: [{id, teil, x, y}]
export function alleKlemmen(circuit) {
  return circuit.teile
    .flatMap((t) => klemmenListe(t).map((k) => ({ id: klemmenId(t, k), teil: t, ...klemmenPos(t, k) })))
    .filter((k) => Number.isFinite(k.x) && Number.isFinite(k.y));
}

// Streckt die Schaltung senkrecht, bis Klemmen verschiedener Teile mindestens 46 Einheiten Abstand haben (nur Darstellung).
export function spreize(circuit) {
  const mit = (f) => ({ ...circuit, teile: circuit.teile.map((t) => ({ ...t, y: t.y * f })) });
  for (let f = 1; f <= 1.8; f += 0.05) {
    const c = mit(f);
    const ks = alleKlemmen(c);
    let eng = false;
    for (let i = 0; i < ks.length && !eng; i++) for (let j = i + 1; j < ks.length; j++) {
      if (ks[i].teil !== ks[j].teil && Math.hypot(ks[i].x - ks[j].x, ks[i].y - ks[j].y) < 46) { eng = true; break; }
    }
    if (!eng) return c;
  }
  return mit(1.8);
}

export function teilBox(t) {
  const b = BOX[t.typ] || [-40, -40, 40, 40];
  return { x0: t.x + b[0], y0: t.y + b[1], x1: t.x + b[2], y1: t.y + b[3] };
}

export function schemaBox(circuit) {
  const bs = circuit.teile.filter((t) => Number.isFinite(t.x) && Number.isFinite(t.y)).map(teilBox);
  if (!bs.length) return { x0: 0, y0: 0, x1: 600, y1: 300 };
  return {
    x0: Math.min(...bs.map((b) => b.x0)) - 6, y0: Math.min(...bs.map((b) => b.y0)) - 6,
    x1: Math.max(...bs.map((b) => b.x1)) + 6, y1: Math.max(...bs.map((b) => b.y1)) + 6,
  };
}

// Bereich eines Schalters, in dem ein Tippen die Stellung umlegt (zwischen den Klemmen).
export function schalterBox(t) {
  if (!TEILE[t.typ]?.stellungen) return null;
  return { x0: t.x - 18, x1: t.x + 18, y0: t.y - 42, y1: t.y + 42 };
}

export function drahtPfad(a, b, index = 0) {
  const mx = (a.x + b.x) / 2 + ((index % 5) - 2) * 7;
  return `M${a.x} ${a.y} H${mx} V${b.y} H${b.x}`;
}

const POL_FARBE = { L: "#c27a3d", N: "#5cc8ff", PE: "#c7e03a" };

function klemme(id, p, ctx, opt = {}) {
  const r = opt.r || 8;
  const zustand = ctx.markiert?.get(id) || (ctx.ausgewaehlt === id ? "sel" : ctx.verbunden?.has(id) ? "verb" : "");
  return s("g", { class: `klemme ${zustand}`, "data-klemme": id },
    s("circle", { class: "k-hit", cx: p.x, cy: p.y, r: TREFFER, role: "button", "aria-label": `Klemme ${id.replace(".", " ")}` }),
    s("circle", { class: "k-punkt", cx: p.x, cy: p.y, r: zustand === "sel" ? r + 3 : r, style: opt.fill ? `fill:${opt.fill}` : null }),
    opt.text ? s("text", { class: "k-zahl", x: p.x, y: p.y + 4, "text-anchor": "middle" }, opt.text) : null
  );
}

function klemmenText(teil, k, p) {
  const art = LABEL[teil.typ]?.(k);
  if (!art) return null;
  const txt = `${teil.id} ${k}`;
  if (art === "unten") return s("text", { class: "k-label", x: p.x, y: p.y + 24, "text-anchor": "middle" }, txt);
  return s("text", { class: "k-label", x: p.x, y: p.y - 14, "text-anchor": "middle" }, txt);
}

const linie = (x1, y1, x2, y2, klasse = "linie") => s("line", { class: klasse, x1, y1, x2, y2 });
const punkt = (x, y) => s("circle", { class: "kontakt", cx: x, cy: y, r: 3.5 });
const name = (txt, x, y, anchor = "middle") => s("text", { class: "teil-name", x, y, "text-anchor": anchor }, txt);

// ctx: { stellung, brennt, ausgewaehlt, verbunden:Set, markiert:Map }
export function zeichneTeil(teil, ctx = {}) {
  const { x, y } = teil;
  const g = s("g", { class: `teil teil-${teil.typ}`, "data-teil": teil.id });
  const stellung = ctx.stellung ?? Object.keys(TEILE[teil.typ]?.stellungen || {})[0];

  if (teil.typ === "quelle") {
    g.append(klemme(teil.id, { x, y }, ctx, { r: 11, fill: POL_FARBE[teil.pol] }), name(teil.pol || teil.id, x, y - 20));
    return g;
  }

  if (teil.typ === "ausschalter" || teil.typ === "taster") {
    g.append(linie(x - 40, y, x - 18, y), linie(x + 18, y, x + 40, y), punkt(x - 18, y), punkt(x + 18, y));
    g.append(stellung === "ein" ? linie(x - 18, y, x + 18, y, "linie hebel") : linie(x - 18, y, x + 14, y - 24, "linie hebel"));
    if (teil.typ === "taster") g.append(linie(x, y - 16, x, y - 30), linie(x - 9, y - 30, x + 9, y - 30));
    g.append(name(teil.id, x, y - 40));
  } else if (teil.typ === "wechsler") {
    g.append(linie(x - 40, y, x - 18, y), linie(x + 18, y - 26, x + 40, y - 26), linie(x + 18, y + 26, x + 40, y + 26), punkt(x - 18, y), punkt(x + 18, y - 26), punkt(x + 18, y + 26));
    g.append(linie(x - 18, y, x + 18, stellung === "a" ? y - 26 : y + 26, "linie hebel"));
    g.append(name(teil.id, x - 6, y - 40));
  } else if (teil.typ === "kreuz") {
    for (const dy of [-26, 26]) g.append(linie(x - 40, y + dy, x - 18, y + dy), linie(x + 18, y + dy, x + 40, y + dy), punkt(x - 18, y + dy), punkt(x + 18, y + dy));
    if (stellung === "gekreuzt") g.append(linie(x - 18, y - 26, x + 18, y + 26, "linie hebel"), linie(x - 18, y + 26, x + 18, y - 26, "linie hebel"));
    else g.append(linie(x - 18, y - 26, x + 18, y - 26, "linie hebel"), linie(x - 18, y + 26, x + 18, y + 26, "linie hebel"));
    g.append(name(teil.id, x, y - 44));
  } else if (teil.typ === "lampe" || teil.typ === "steckdose") {
    const lampe = teil.typ === "lampe";
    const cx = x + (lampe ? 20 : 24);
    const oben = lampe ? y - 24 : y - 36;
    const unten = lampe ? y + 24 : y + 36;
    g.append(
      linie(x - 40, y, cx - (lampe ? 24 : 28), y),
      s("path", { class: "linie", d: `M${x - 40} ${y - 52} H${cx} V${oben}`, fill: "none" }),
      s("path", { class: "linie pe", d: `M${x - 40} ${y + 52} H${cx} V${unten}`, fill: "none" })
    );
    if (lampe) {
      g.append(s("circle", { class: `koerper ${ctx.brennt ? "an" : ""}`, cx, cy: y, r: 24 }), linie(cx - 17, y - 17, cx + 17, y + 17, "linie duenn"), linie(cx - 17, y + 17, cx + 17, y - 17, "linie duenn"));
    } else {
      g.append(
        s("rect", { class: `koerper ${ctx.brennt ? "an" : ""}`, x: cx - 28, y: y - 36, width: 56, height: 72, rx: 10 }),
        s("circle", { class: "loch", cx: cx - 10, cy: y - 8, r: 4 }), s("circle", { class: "loch", cx: cx + 10, cy: y - 8, r: 4 }),
        s("path", { class: "linie duenn", d: `M${cx - 8} ${y + 20} H${cx + 8}` })
      );
    }
    g.append(name(teil.id, cx + 36, y + 4, "start"));
  } else if (teil.typ === "dose") {
    g.append(s("rect", { class: "koerper dose", x: x - 72, y: y - 42, width: 144, height: 84, rx: 10 }), name(teil.id, x - 80, y + 4, "end"));
  }

  for (const k of TEILE[teil.typ]?.klemmen || []) {
    const p = klemmenPos(teil, k);
    if (!p) continue;
    g.append(klemme(klemmenId(teil, k), p, ctx, teil.typ === "dose" ? { r: 12, text: k } : {}));
    const t = klemmenText(teil, k, p);
    if (t) g.append(t);
  }
  return g;
}
