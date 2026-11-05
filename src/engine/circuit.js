// Durchgangs-Simulation per Union-Find ueber Klemmen. Keine Elektrophysik.
import { TEILE } from './teile.js';

function netz() {
  const eltern = new Map();
  const find = (x) => {
    if (!eltern.has(x)) eltern.set(x, x);
    while (eltern.get(x) !== x) x = eltern.get(x);
    return x;
  };
  return {
    verbinde: (a, b) => eltern.set(find(a), find(b)),
    gleich: (a, b) => find(a) === find(b),
  };
}

// Netz aus Draehten plus festen Verbindungen (Dosen), ohne Schalterkontakte.
function festesNetz(circuit, wires) {
  const n = netz();
  for (const [a, b] of wires) n.verbinde(a, b);
  for (const t of circuit.teile) {
    if (!TEILE[t.typ]?.intern) continue;
    const [erste, ...rest] = TEILE[t.typ].klemmen;
    for (const k of rest) n.verbinde(`${t.id}.${erste}`, `${t.id}.${k}`);
  }
  return n;
}

const quellen = (circuit, pol) => circuit.teile.filter((t) => t.typ === 'quelle' && t.pol === pol).map((t) => t.id);
const lasten = (circuit) => circuit.teile.filter((t) => TEILE[t.typ]?.last);
const schalter = (circuit) => circuit.teile.filter((t) => TEILE[t.typ]?.stellungen);

function alleStellungen(circuit) {
  let liste = [{}];
  for (const t of schalter(circuit)) {
    liste = liste.flatMap((p) => Object.keys(TEILE[t.typ].stellungen).map((s) => ({ ...p, [t.id]: s })));
  }
  return liste;
}

const stellungText = (pos) => Object.entries(pos).map(([k, v]) => `${k}=${v}`).join(', ');

export function simulate(circuit, wires, positions = {}) {
  const n = festesNetz(circuit, wires);
  for (const t of schalter(circuit)) {
    const st = TEILE[t.typ].stellungen;
    const pos = Object.hasOwn(st, positions[t.id] ?? '') ? positions[t.id] : Object.keys(st)[0];
    for (const [a, b] of st[pos]) n.verbinde(`${t.id}.${a}`, `${t.id}.${b}`);
  }
  const an = (pol, k) => quellen(circuit, pol).some((q) => n.gleich(q, k));
  const kurzschluss = quellen(circuit, 'N').some((q) => an('L', q));
  let pe_unter_spannung = quellen(circuit, 'PE').some((q) => an('L', q));
  const lampen = {};
  for (const t of lasten(circuit)) {
    const [l, nk] = TEILE[t.typ].last;
    lampen[t.id] = !kurzschluss && an('L', `${t.id}.${l}`) && an('N', `${t.id}.${nk}`);
    if (an('L', `${t.id}.pe`)) pe_unter_spannung = true;
  }
  return { lampen, kurzschluss, pe_unter_spannung };
}

export function check(circuit, wires) {
  const hinweise = [];
  const gesehen = new Set();
  const draehte = [];
  for (const [a, b] of wires) {
    if (a === b) { hinweise.push(`Der Draht von ${a} zu sich selbst hat keine Wirkung.`); continue; }
    const schluessel = [a, b].sort().join('|');
    if (gesehen.has(schluessel)) { hinweise.push(`Der Draht von ${a} nach ${b} ist doppelt gezogen.`); continue; }
    gesehen.add(schluessel);
    draehte.push([a, b]);
  }

  const soll = festesNetz(circuit, circuit.soll);
  const ist = festesNetz(circuit, draehte);
  const fehlend = circuit.soll.filter(([a, b]) => !ist.gleich(a, b));
  const falsch = draehte.filter(([a, b]) => !soll.gleich(a, b));
  for (const [a, b] of fehlend) hinweise.push(`Es fehlt eine Verbindung von ${a} nach ${b}.`);
  for (const [a, b] of falsch) hinweise.push(`Die Verbindung von ${a} nach ${b} gehört nicht in diese Schaltung.`);

  for (const t of lasten(circuit)) {
    const k = `${t.id}.${TEILE[t.typ].last[0]}`;
    const direkt = (n) => quellen(circuit, 'L').some((q) => n.gleich(q, k));
    if (direkt(ist) && !direkt(soll)) hinweise.push(`${k} ist direkt mit L verbunden, der Schalter liegt nicht im Polleiter.`);
  }

  for (const pos of alleStellungen(circuit)) {
    const r = simulate(circuit, draehte, pos);
    if (r.kurzschluss) hinweise.push(`Kurzschluss zwischen L und N in Stellung ${stellungText(pos)}.`);
    if (r.pe_unter_spannung) hinweise.push(`L liegt auf PE oder Gehäuse in Stellung ${stellungText(pos)}.`);
  }

  return { ok: fehlend.length === 0 && falsch.length === 0, fehlend, falsch, hinweise };
}

export function tabelleLaeuft(circuit) {
  const abweichungen = [];
  for (const pos of alleStellungen(circuit)) {
    const name = stellungText(pos);
    const zeile = circuit.tabelle.find((z) => Object.keys(pos).every((k) => z[k] === pos[k]));
    if (!zeile) { abweichungen.push(`Stellung ${name} fehlt in der Tabelle.`); continue; }
    const r = simulate(circuit, circuit.soll, pos);
    if (r.kurzschluss) abweichungen.push(`Kurzschluss in Stellung ${name}.`);
    for (const [id, brennt] of Object.entries(r.lampen)) {
      if (zeile[id] !== brennt) abweichungen.push(`${id} in Stellung ${name}: Tabelle ${zeile[id]}, Simulation ${brennt}.`);
    }
  }
  return { ok: abweichungen.length === 0, abweichungen };
}
