// Reine Logik des Schaltungs-Trainers, ohne DOM (testbar).
import { TEILE } from "../engine/teile.js";
import { simulate } from "../engine/circuit.js";

export const FARBEN = ["braun", "schwarz", "blau", "gelb-gruen", "grau"];
export const FARBNAMEN = { braun: "braun", schwarz: "schwarz", blau: "blau", "gelb-gruen": "gelb-grün", grau: "grau" };
export const farbName = (f) => FARBNAMEN[f] || f;

// "S1.com" -> "S1 com", "L" bleibt "L"
export const klemmenName = (id) => String(id).replace(/^([^.]+)\.(.+)$/, "$1 $2");

const schluessel = (a, b) => [a, b].sort().join("|");

// Draht hinzufuegen: Selbstverbindung und Duplikate (auch umgekehrt) werden ignoriert. Liefert immer ein neues Array.
export function hinzufuegen(draehte, a, b, farbe = "grau") {
  if (!a || !b || a === b) return [...draehte];
  if (draehte.some(([x, y]) => schluessel(x, y) === schluessel(a, b))) return [...draehte];
  return [...draehte, [a, b, farbe]];
}

export const entfernen = (draehte, index) => draehte.filter((_, i) => i !== index);

// Tippen auf eine Klemme im Verdrahten-Modus. Erste Klemme merken, zweite ergibt den Draht.
export function tippeKlemme(auswahl, id, draehte, farbe) {
  if (!auswahl) return { auswahl: id, draehte, meldung: null };
  if (auswahl === id) return { auswahl: null, draehte, meldung: null };
  const neu = hinzufuegen(draehte, auswahl, id, farbe);
  const meldung = neu.length === draehte.length ? `Zwischen ${klemmenName(auswahl)} und ${klemmenName(id)} liegt schon ein Draht.` : null;
  return { auswahl: null, draehte: neu, meldung };
}

export const alsPaare = (draehte) => draehte.map(([a, b]) => [a, b]);

// Meldungen aus dem Ergebnis von check(). Doppelte Texte aus hinweise (fehlend/falsch) werden weggelassen.
export function meldungen(ergebnis) {
  const name = (t) => t.replace(/\b([A-Za-z]+\d*)\.(\w+)\b/g, "$1 $2");
  const fehlend = (ergebnis.fehlend || []).map(([a, b]) => `Es fehlt ein Draht zwischen ${klemmenName(a)} und ${klemmenName(b)}.`);
  const falsch = (ergebnis.falsch || []).map(([a, b]) => `Der Draht zwischen ${klemmenName(a)} und ${klemmenName(b)} gehört nicht in diese Schaltung. Tippe ihn an, um ihn zu löschen.`);
  const hinweise = (ergebnis.hinweise || [])
    .filter((t) => !t.startsWith("Es fehlt eine Verbindung von") && !t.startsWith("Die Verbindung von"))
    .map(name);
  return { ok: Boolean(ergebnis.ok), fehlend, falsch, hinweise };
}

// Netz aus Draehten und Dosen (ohne Schalterkontakte) beziehungsweise mit Schalterstellung.
function netz(circuit, draehte, positionen) {
  const eltern = new Map();
  const find = (x) => {
    if (!eltern.has(x)) eltern.set(x, x);
    while (eltern.get(x) !== x) x = eltern.get(x);
    return x;
  };
  const v = (a, b) => eltern.set(find(a), find(b));
  for (const [a, b] of draehte) v(a, b);
  for (const t of circuit.teile) {
    const typ = TEILE[t.typ];
    if (typ?.intern) {
      const [erste, ...rest] = typ.klemmen;
      for (const k of rest) v(`${t.id}.${erste}`, `${t.id}.${k}`);
    }
    if (positionen && typ?.stellungen) {
      const st = typ.stellungen;
      const pos = Object.hasOwn(st, positionen[t.id] ?? "") ? positionen[t.id] : Object.keys(st)[0];
      for (const [a, b] of st[pos]) v(`${t.id}.${a}`, `${t.id}.${b}`);
    }
  }
  return { gleich: (a, b) => find(a) === find(b) };
}

// Soll-Aderfarbe je Draht: Farbe der Quelle (L, N, PE), mit der der Draht ohne Schalter verbunden ist, sonst "grau".
export function sollFarben(circuit, draehte) {
  const farben = circuit.farben || {};
  const n = netz(circuit, draehte, null);
  return draehte.map(([a]) => {
    for (const q of circuit.teile.filter((t) => t.typ === "quelle")) {
      if (farben[q.id] && n.gleich(a, q.id)) return farben[q.id];
    }
    return "grau";
  });
}

// Hinweise zur Aderfarbe (nur Anzeige, nicht Teil von check). Nur fuer Draehte, die an L, N oder PE liegen.
export function farbHinweise(circuit, draehte) {
  if (!circuit.farben) return [];
  const soll = sollFarben(circuit, draehte);
  const aus = [];
  draehte.forEach(([a, b, farbe], i) => {
    if (soll[i] === "grau" || (farbe || "grau") === soll[i]) return;
    aus.push(`Der Draht zwischen ${klemmenName(a)} und ${klemmenName(b)} ist ${farbName(farbe || "grau")}, vorgesehen ist ${farbName(soll[i])}.`);
  });
  return aus;
}

export const schalterTeile = (circuit) => circuit.teile.filter((t) => TEILE[t.typ]?.stellungen);
export const lastTeile = (circuit) => circuit.teile.filter((t) => TEILE[t.typ]?.last);

export function startPositionen(circuit) {
  return Object.fromEntries(schalterTeile(circuit).map((t) => [t.id, Object.keys(TEILE[t.typ].stellungen)[0]]));
}

export const stellungsListe = (teil) => Object.keys(TEILE[teil.typ]?.stellungen || {});

export function naechsteStellung(teil, aktuell) {
  const l = stellungsListe(teil);
  if (!l.length) return aktuell;
  return l[(Math.max(0, l.indexOf(aktuell)) + 1) % l.length];
}

// Schluessel einer Schalterstellung, unabhaengig von der Reihenfolge der Eintraege.
export const stellungsKey = (pos) => Object.keys(pos).sort().map((k) => `${k}=${pos[k]}`).join(",");

// Schalterstellung einer Tabellenzeile (ohne Lampenwerte).
export function zeilenStellung(circuit, zeile) {
  return Object.fromEntries(schalterTeile(circuit).filter((t) => zeile[t.id] != null).map((t) => [t.id, zeile[t.id]]));
}

export function stellungsText(circuit, pos) {
  return schalterTeile(circuit).map((t) => `${t.id} ${pos[t.id] ?? ""}`).join(", ");
}

export function frageText(circuit, zeile) {
  const teile = schalterTeile(circuit).filter((t) => zeile[t.id] != null).map((t) => `${t.id} auf «${zeile[t.id]}»`);
  return `Was passiert, wenn ${teile.join(" und ")} steht?`;
}

export const frageLampen = (circuit, zeile) => lastTeile(circuit).map((t) => t.id).filter((id) => typeof zeile[id] === "boolean");

// Auswertung einer Quizantwort: antworten = {E1:true}
export function frageAuswerten(circuit, zeile, antworten) {
  const lampen = frageLampen(circuit, zeile);
  const falsch = lampen.filter((id) => antworten[id] !== zeile[id]);
  return { richtig: falsch.length === 0, falsch };
}

// Welche Drahtindizes fuehren Strom? {l:Set, n:Set}. Nur wenn mindestens eine Last brennt.
export function stromDraehte(circuit, draehte, positionen) {
  const aus = { l: new Set(), n: new Set() };
  const r = simulate(circuit, alsPaare(draehte), positionen);
  if (!Object.values(r.lampen).some(Boolean) || r.kurzschluss) return aus;
  const n = netz(circuit, alsPaare(draehte), positionen);
  const quellen = (pol) => circuit.teile.filter((t) => t.typ === "quelle" && t.pol === pol).map((t) => t.id);
  const imNetz = (pol, k) => quellen(pol).some((q) => n.gleich(q, k));
  draehte.forEach(([a], i) => {
    if (imNetz("L", a)) aus.l.add(i);
    else if (imNetz("N", a)) aus.n.add(i);
  });
  return aus;
}
