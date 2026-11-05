// Schaltungs-Trainer: Schema lesen, nach Schema verdrahten, Fehler suchen.
import { setze, h, icon, zurueck } from "./dom.js";
import { simulate, check } from "../engine/circuit.js";
import { s, zeichneTeil, alleKlemmen, klemmenPos, schemaBox, schalterBox, drahtPfad, spreize, TREFFER } from "./symbole.js";
import {
  FARBEN, farbName, klemmenName, tippeKlemme, entfernen, alsPaare, meldungen, sollFarben, farbHinweise,
  schalterTeile, startPositionen, stellungsListe, naechsteStellung, stellungsKey, zeilenStellung, stellungsText,
  frageText, frageLampen, frageAuswerten, stromDraehte,
} from "./trainer-logik.js";

const MODI = [["lesen", "Lesen"], ["verdrahten", "Verdrahten"], ["fehler", "Fehler suchen"]];
const FARB_CSS = { braun: "#c27a3d", schwarz: "#101010", blau: "#5cc8ff", "gelb-gruen": "#9bd13a", grau: "#9aa4b2" };

let laufnr = 0;
let cache = null;

async function json(url) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Schaltungsliste aus src/schaltungen-liste.json (erzeugt von tools/precache.mjs), Dateien aus content/circuits/.
async function ladeAlle() {
  if (cache) return cache;
  const ids = (await json("src/schaltungen-liste.json")) || [];
  const geladen = await Promise.all(ids.map((id) => json(`content/circuits/${id}.json`)));
  const ok = geladen.filter((c) => c && c.id && Array.isArray(c.teile) && Array.isArray(c.soll));
  if (ok.length) cache = [...ok.filter((c) => !c.fehler), ...ok.filter((c) => c.fehler)];
  return ok;
}

const istFehlerfall = (c) => Boolean(c.fehler && Array.isArray(c.fehler.wires));

// ---------- Einstieg: Liste ----------

export function liste(container) {
  const token = ++laufnr;
  setze(container, h("div", { class: "page-head" }, zurueck("#/lernen", "Lernen"), h("h1", {}, "Schaltungs-Trainer")), h("p", { class: "muted" }, "Lade Schaltungen ..."));
  ladeAlle().then((alle) => {
    if (token !== laufnr) return;
    const kopf = h("div", { class: "page-head" }, zurueck("#/lernen", "Lernen"), h("h1", {}, "Schaltungs-Trainer"),
      h("p", { class: "muted" }, "Schema lesen, nach Schema verdrahten und Fehler suchen. Alles bleibt auf dem Gerät, nichts wird angeschlossen."));
    if (!alle.length) return setze(container, kopf, h("div", { class: "card" }, h("p", {}, "Es konnten keine Schaltungen geladen werden. Bitte die Seite neu laden.")));
    const karte = (c) => h("div", { class: "card trainer-karte" },
      h("div", { class: "zeile" }, h("strong", { class: "grow" }, c.titel), istFehlerfall(c) ? h("span", { class: "chip orange" }, "Fehlersuche") : null),
      h("div", { class: "modi" },
        istFehlerfall(c)
          ? [h("a", { class: "btn orange klein-btn", href: `#/trainer/${c.id}/fehler` }, "Fehler suchen"), h("a", { class: "btn ghost klein-btn", href: `#/trainer/${c.id}/lesen` }, "Lesen")]
          : [h("a", { class: "btn klein-btn", href: `#/trainer/${c.id}/lesen` }, "Lesen"), h("a", { class: "btn klein-btn", href: `#/trainer/${c.id}/verdrahten` }, "Verdrahten")]));
    setze(container, kopf,
      h("h2", {}, "Grundschaltungen"), h("div", { class: "stack" }, alle.filter((c) => !istFehlerfall(c)).map(karte)),
      h("h2", {}, "Fehlersuche"), h("div", { class: "stack" }, alle.filter(istFehlerfall).map(karte)));
  }).catch((e) => { console.error(e); setze(container, h("p", {}, "Der Trainer konnte nicht geladen werden.")); });
}

// ---------- Einzelne Schaltung ----------

export function zeige(container, circuitId, modus = "lesen") {
  const token = ++laufnr;
  if (!MODI.some(([m]) => m === modus)) modus = "lesen";
  setze(container, h("div", { class: "page-head" }, zurueck("#/trainer", "Trainer")), h("p", { class: "muted" }, "Lade Schaltung ..."));
  ladeAlle().then((alle) => {
    if (token !== laufnr) return;
    const c = alle.find((x) => x.id === circuitId);
    if (!c) {
      return setze(container, h("div", { class: "page-head" }, zurueck("#/trainer", "Trainer")),
        h("div", { class: "card" }, h("h2", {}, "Schaltung nicht gefunden"), h("p", {}, `Es gibt keine Schaltung mit der Kennung «${circuitId}».`), h("a", { class: "btn", href: "#/trainer" }, "Zur Übersicht")));
    }
    starte(container, c, modus, alle);
  }).catch((e) => { console.error(e); setze(container, h("p", {}, "Die Schaltung konnte nicht geladen werden.")); });
}

function starte(container, original, modus, alle) {
  const circuit = spreize(original);
  const st = {
    circuit, modus, alle,
    pos: startPositionen(circuit),
    wires: [], auswahl: null, farbe: "braun", meldung: null,
    ergebnis: null, versucht: false, geloest: false, getestet: new Set(), quiz: null,
    verdacht: null, falschVerdacht: new Set(), aufgeloest: false,
  };
  if (modus === "lesen") st.wires = mitFarben(circuit, circuit.soll);
  if (modus === "fehler" && istFehlerfall(circuit)) st.wires = mitFarben(circuit, circuit.fehler.wires);
  const neuZeichnen = () => {
    const wrap = container.querySelector(".schema-wrap");
    const links = wrap ? wrap.scrollLeft : 0;
    const y = window.scrollY;
    zeichne(container, st, neuZeichnen);
    const neu = container.querySelector(".schema-wrap");
    if (neu) neu.scrollLeft = links;
    window.scrollTo(0, y);
  };
  zeichne(container, st, neuZeichnen);
}

function mitFarben(circuit, paare) {
  const farben = sollFarben(circuit, paare);
  return paare.map(([a, b], i) => [a, b, farben[i]]);
}

const sim = (st) => simulate(st.circuit, alsPaare(st.wires), st.pos);

function zeichne(container, st, neu) {
  const { circuit, modus } = st;
  const kopf = h("div", { class: "page-head" }, zurueck("#/trainer", "Trainer"), h("h1", {}, circuit.titel),
    circuit.beschreibung ? h("details", { class: "beschr" }, h("summary", { class: "muted" }, "Worum geht es?"), h("p", { class: "muted klein" }, circuit.beschreibung.replace(/\s*Farben für Schalterdraht[^.]*\./, ""))) : null,
    h("div", { class: "reiter" }, MODI.map(([m, text]) => h("a", { class: "tab", href: `#/trainer/${circuit.id}/${m}`, "aria-selected": m === modus ? "true" : "false" }, text))));

  if (modus === "fehler" && !istFehlerfall(circuit)) return setze(container, kopf, fehlerAuswahl(st));

  const r = sim(st);
  const teile = [kopf];
  if (modus === "lesen") teile.push(lesenBlock(st, r, neu));
  if (modus === "verdrahten") teile.push(verdrahtenBlock(st, r, neu));
  if (modus === "fehler") teile.push(fehlerBlock(st, r, neu));
  setze(container, teile);
}

function fehlerAuswahl(st) {
  const faelle = st.alle.filter(istFehlerfall);
  return h("div", { class: "card" },
    h("h2", {}, "Diese Schaltung hat keinen Fehlerfall"),
    h("p", {}, "Wähle eine Fehlersuche:"),
    h("div", { class: "stack" }, faelle.map((f) => h("a", { class: "card zeile", href: `#/trainer/${f.id}/fehler` }, h("span", { class: "grow" }, f.titel), icon("pfeil")))));
}

// ---------- Schema (SVG) ----------

function schema(st, r, opt) {
  const { circuit } = st;
  const box = schemaBox(circuit);
  const breite = box.x1 - box.x0;
  const hoehe = box.y1 - box.y0;
  const svg = s("svg", { class: "sv", viewBox: `${box.x0} ${box.y0} ${breite} ${hoehe}`, role: "group", "aria-label": `Schema ${circuit.titel}` });
  const strom = st.modus === "fehler" || !opt.strom ? { l: new Set(), n: new Set() } : stromDraehte(circuit, st.wires, st.pos);
  const farben = st.modus === "verdrahten" ? null : sollFarben(circuit, alsPaare(st.wires));

  const verbunden = new Set(st.wires.flatMap(([a, b]) => [a, b]));
  const pos = (id) => {
    const [teilId, k] = id.includes(".") ? id.split(".") : [id, ""];
    const t = circuit.teile.find((x) => x.id === teilId);
    return t ? klemmenPos(t, k) : null;
  };
  const drahtGruppe = s("g", { class: "draehte" });
  st.wires.forEach(([a, b, farbe], i) => {
    const pa = pos(a), pb = pos(b);
    if (!pa || !pb) return;
    const d = drahtPfad(pa, pb, i);
    const f = farben ? farben[i] : farbe;
    const klasse = strom.l.has(i) ? "strom-l" : strom.n.has(i) ? "strom-n" : "";
    drahtGruppe.append(s("g", { class: `draht ${klasse}`, "data-draht": i },
      strom.l.has(i) || strom.n.has(i) ? s("path", { class: "glow", d }) : null,
      f === "schwarz" ? s("path", { class: "d-rand", d }) : null,
      s("path", { class: "d-ader", d, style: `stroke:${FARB_CSS[f] || FARB_CSS.grau}` }),
      f === "gelb-gruen" ? s("path", { class: "d-ader d-streifen", d }) : null,
      opt.loeschen ? s("path", { class: "d-hit", d, "data-draht": i }) : null));
  });
  svg.append(drahtGruppe);

  const markiert = new Map();
  if (opt.markiert) for (const [k, v] of opt.markiert) markiert.set(k, v);
  for (const t of circuit.teile) {
    svg.append(zeichneTeil(t, { stellung: st.pos[t.id], brennt: r.lampen[t.id], ausgewaehlt: st.auswahl, verbunden, markiert }));
  }

  const klemmen = alleKlemmen(circuit);
  svg.addEventListener("click", (e) => {
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    let best = null, bd = TREFFER;
    for (const k of klemmen) {
      const dd = Math.hypot(k.x - p.x, k.y - p.y);
      if (dd <= bd) { bd = dd; best = k; }
    }
    if (best) return opt.klemme?.(best.id);
    for (const t of circuit.teile) {
      const sb = schalterBox(t);
      if (sb && p.x >= sb.x0 && p.x <= sb.x1 && p.y >= sb.y0 && p.y <= sb.y1) {
        st.pos = { ...st.pos, [t.id]: naechsteStellung(t, st.pos[t.id]) };
        return opt.stellung?.(t);
      }
    }
    const dr = e.target.closest?.("[data-draht]");
    if (dr && opt.loeschen) opt.draht?.(Number(dr.dataset.draht));
  });
  const mindest = Math.round(breite * 1.15);
  return h("div", { class: "schema-wrap" }, h("div", { class: "schema", style: `min-width:${mindest}px` }, svg));
}

function lampenLeiste(st, r) {
  const lasten = st.circuit.teile.filter((t) => t.id in r.lampen);
  return h("div", { class: "lampen" },
    lasten.map((t) => h("span", { class: `chip lampe ${r.lampen[t.id] ? "an" : ""}` }, `${t.id}: ${t.typ === "steckdose" ? (r.lampen[t.id] ? "unter Spannung" : "spannungslos") : r.lampen[t.id] ? "brennt" : "aus"}`)),
    r.kurzschluss ? h("span", { class: "chip schlecht" }, "Kurzschluss zwischen L und N") : null,
    r.pe_unter_spannung ? h("span", { class: "chip schlecht" }, "L liegt auf PE oder Gehäuse") : null);
}

function schalterPanel(st, neu) {
  const sw = schalterTeile(st.circuit);
  if (!sw.length) return null;
  return h("div", { class: "schalter-panel" }, sw.map((t) =>
    h("div", { class: "sw-zeile" }, h("strong", {}, t.id),
      h("div", { class: "seg" }, stellungsListe(t).map((stl) =>
        h("button", { type: "button", class: "seg-btn", "aria-pressed": st.pos[t.id] === stl ? "true" : "false", onclick: () => { st.pos = { ...st.pos, [t.id]: stl }; markiereGetestet(st); neu(); } }, stl))))));
}

function markiereGetestet(st) {
  if (st.geloest) st.getestet.add(stellungsKey(st.pos));
}

// Tabelle der Stellungen als tippbare Zeilen. getestet: Set der besuchten Stellungen oder null.
function tabelle(st, neu) {
  const { circuit } = st;
  const lampen = circuit.teile.filter((t) => circuit.tabelle.some((z) => typeof z[t.id] === "boolean"));
  return h("div", { class: "tabelle" }, circuit.tabelle.map((z) => {
    const pos = zeilenStellung(circuit, z);
    const key = stellungsKey(pos);
    const aktiv = key === stellungsKey(st.pos);
    const gesehen = st.getestet.has(key);
    const text = lampen.map((l) => `${l.id} ${z[l.id] ? "an" : "aus"}`).join(", ");
    return h("button", { type: "button", class: `tab-zeile ${aktiv ? "aktiv" : ""} ${gesehen ? "gesehen" : ""}`, onclick: () => { st.pos = { ...st.pos, ...pos }; markiereGetestet(st); neu(); } },
      h("span", { class: "grow" }, stellungsText(circuit, pos)), h("span", {}, text), gesehen ? icon("haken") : null);
  }));
}

// ---------- Modus lesen ----------

function neueFrage(st) {
  const zeilen = st.circuit.tabelle.filter((z) => frageLampen(st.circuit, z).length);
  if (!zeilen.length) return null;
  const letzte = st.quiz?.zeile;
  const kandidaten = zeilen.length > 1 ? zeilen.filter((z) => z !== letzte) : zeilen;
  return { zeile: kandidaten[Math.floor(Math.random() * kandidaten.length)], antworten: {}, fertig: false };
}

function lesenBlock(st, r, neu) {
  if (!st.quiz) st.quiz = neueFrage(st);
  const q = st.quiz;
  const opt = { strom: true, stellung: neu };
  return h("div", {},
    schema(st, r, opt),
    h("p", { class: "muted klein" }, "Tippe auf einen Schalter im Schema oder unten auf eine Stellung. Der Stromweg ist hervorgehoben: orange L, blau N."),
    lampenLeiste(st, r),
    schalterPanel(st, neu),
    q ? quizKarte(st, q, neu) : null,
    h("details", { class: "card" }, h("summary", {}, "Alle Stellungen anzeigen"), tabelle(st, neu)));
}

function quizKarte(st, q, neu) {
  const lampen = frageLampen(st.circuit, q.zeile);
  const alle = lampen.every((id) => id in q.antworten);
  const res = alle ? frageAuswerten(st.circuit, q.zeile, q.antworten) : null;
  return h("div", { class: "card quiz-karte" },
    h("h2", {}, "Mini-Quiz"),
    h("p", {}, frageText(st.circuit, q.zeile)),
    lampen.map((id) => h("div", { class: "sw-zeile" }, h("strong", {}, id),
      h("div", { class: "seg" }, [[true, "brennt"], [false, "brennt nicht"]].map(([wert, text]) => {
        const gewaehlt = q.antworten[id] === wert;
        const klasse = res && gewaehlt ? (wert === q.zeile[id] ? "ok" : "bad") : "";
        return h("button", { type: "button", class: `seg-btn ${klasse}`, disabled: res ? true : null, "aria-pressed": gewaehlt ? "true" : "false", onclick: () => { q.antworten = { ...q.antworten, [id]: wert }; neu(); } }, text);
      })))),
    res ? h("div", { class: res.richtig ? "ok-box" : "warn" },
      res.richtig ? "Richtig." : `Nicht ganz: ${res.falsch.map((id) => `${id} ${q.zeile[id] ? "brennt" : "brennt nicht"}`).join(", ")}. Schau dir die Stellung im Schema an.`) : null,
    res ? h("div", { class: "zeile-btn" },
      h("button", { type: "button", class: "btn ghost", onclick: () => { st.pos = { ...st.pos, ...zeilenStellung(st.circuit, q.zeile) }; neu(); } }, "Stellung im Schema zeigen"),
      h("button", { type: "button", class: "btn", onclick: () => { st.quiz = neueFrage(st); neu(); } }, "Nächste Frage")) : null);
}

// ---------- Modus verdrahten ----------

function verdrahtenBlock(st, r, neu) {
  const { circuit } = st;
  const aendern = () => { st.ergebnis = null; st.geloest = false; st.getestet = new Set(); };
  const opt = {
    strom: true, loeschen: true,
    klemme: (id) => {
      const x = tippeKlemme(st.auswahl, id, st.wires, st.farbe);
      if (x.draehte.length !== st.wires.length) aendern();
      st.auswahl = x.auswahl; st.wires = x.draehte; st.meldung = x.meldung;
      neu();
    },
    stellung: () => { markiereGetestet(st); neu(); },
    draht: (i) => { st.wires = entfernen(st.wires, i); st.auswahl = null; st.meldung = null; aendern(); neu(); },
  };
  const status = st.meldung || (st.auswahl ? `Gewählt: ${klemmenName(st.auswahl)}. Tippe jetzt die zweite Klemme.` : "Tippe eine Klemme, danach die zweite Klemme: das gibt einen Draht.");
  return h("div", {},
    schema(st, r, opt),
    h("p", { class: `status ${st.auswahl ? "sel" : ""}`, role: "status" }, status),
    h("div", { class: "farbwahl", role: "group", "aria-label": "Aderfarbe" },
      FARBEN.map((f) => h("button", { type: "button", class: "farbe", "aria-label": farbName(f), "aria-pressed": st.farbe === f ? "true" : "false", title: farbName(f), style: `--f:${FARB_CSS[f]}`, onclick: () => { st.farbe = f; neu(); } })),
      h("span", { class: "muted klein" }, `Aderfarbe: ${farbName(st.farbe)}`)),
    drahtListe(st, opt),
    lampenLeiste(st, r),
    h("div", { class: "zeile-btn" },
      h("button", { type: "button", class: "btn orange", onclick: () => pruefen(st, neu) }, "Prüfen"),
      st.versucht ? h("button", { type: "button", class: "btn ghost", onclick: () => loesungZeigen(st, neu) }, "Lösung zeigen") : null),
    st.ergebnis ? ergebnisKarte(st, neu) : null);
}

function drahtListe(st, opt) {
  if (!st.wires.length) return null;
  return h("div", { class: "draht-liste" }, st.wires.map(([a, b, f], i) =>
    h("button", { type: "button", class: "draht-chip", "aria-label": `Draht ${klemmenName(a)} nach ${klemmenName(b)} löschen`, onclick: () => opt.draht(i) },
      h("span", { class: "punkt", style: `background:${FARB_CSS[f]}` }), `${klemmenName(a)} nach ${klemmenName(b)}`, h("span", { class: "x" }, "×"))));
}

function pruefen(st, neu) {
  st.versucht = true;
  const e = check(st.circuit, alsPaare(st.wires));
  st.ergebnis = { ...meldungen(e), farben: farbHinweise(st.circuit, st.wires) };
  st.geloest = st.ergebnis.ok;
  st.getestet = new Set();
  if (st.geloest) st.getestet.add(stellungsKey(st.pos));
  st.auswahl = null;
  st.meldung = null;
  neu();
}

function loesungZeigen(st, neu) {
  st.wires = mitFarben(st.circuit, st.circuit.soll);
  st.auswahl = null; st.meldung = null;
  st.ergebnis = null; st.geloest = false; st.getestet = new Set();
  neu();
}

function ergebnisKarte(st, neu) {
  const e = st.ergebnis;
  const liste = (titel, zeilen) => zeilen.length ? [h("h3", {}, titel), h("ul", { class: "liste" }, zeilen.map((z) => h("li", {}, z)))] : null;
  const farben = liste("Aderfarben (Hinweis)", e.farben);
  if (!e.ok) {
    return h("div", { class: "card ergebnis schlecht" },
      h("h2", {}, "Noch nicht richtig"),
      liste("Das fehlt", e.fehlend), liste("Das ist falsch", e.falsch), liste("Hinweise", e.hinweise), farben);
  }
  const alle = st.circuit.tabelle.map((z) => stellungsKey(zeilenStellung(st.circuit, z)));
  const gesehen = alle.filter((k) => st.getestet.has(k)).length;
  const fertig = gesehen === alle.length;
  return h("div", { class: "card ergebnis gut" },
    h("h2", {}, fertig ? "Geschafft" : "Die Verdrahtung stimmt"),
    fertig
      ? h("p", {}, "Alle Stellungen getestet: die Schaltung verhält sich wie in der Tabelle. Gut gemacht.")
      : h("p", {}, `Jetzt der Funktionstest: Lege die Schalter um oder tippe unten eine Stellung an und beobachte die Lampe. Getestet: ${gesehen} von ${alle.length}.`),
    liste("Hinweise", e.hinweise), farben,
    tabelle(st, neu));
}

// ---------- Modus fehler ----------

function fehlerBlock(st, r, neu) {
  const f = st.circuit.fehler;
  const markiert = new Map();
  for (const k of st.falschVerdacht) markiert.set(k, "bad");
  if (st.verdacht === f.ort || st.aufgeloest) markiert.set(f.ort, "ok");
  const richtig = st.verdacht === f.ort;
  const opt = {
    strom: false, markiert,
    klemme: (id) => {
      if (richtig || st.aufgeloest) return;
      st.verdacht = id;
      if (id !== f.ort) st.falschVerdacht.add(id);
      neu();
    },
    stellung: neu,
  };
  const fertig = richtig || st.aufgeloest;
  return h("div", {},
    h("div", { class: "warn symptom" }, h("strong", {}, "Symptom: "), f.symptom),
    schema(st, r, opt),
    h("p", { class: "muted klein" }, "Lege die Schalter um und tippe die Klemme an, an der du den Fehler vermutest."),
    lampenLeiste(st, r),
    schalterPanel(st, neu),
    st.verdacht && !richtig ? h("div", { class: "warn", role: "status" }, `Bei ${klemmenName(st.verdacht)} ist der Fehler nicht. Prüfe die Verdrahtung nochmals und versuche eine andere Klemme.`) : null,
    richtig ? h("div", { class: "ok-box", role: "status" }, `Richtig: der Fehler liegt bei ${klemmenName(f.ort)}.`) : null,
    !fertig && st.falschVerdacht.size ? h("button", { type: "button", class: "btn ghost", onclick: () => { st.aufgeloest = true; neu(); } }, "Auflösung zeigen") : null,
    fertig ? h("div", { class: "card" }, h("h2", {}, "Auflösung"), h("p", {}, f.beschreibung), weitere(st)) : null);
}

function weitere(st) {
  const faelle = st.alle.filter(istFehlerfall);
  const i = faelle.findIndex((c) => c.id === st.circuit.id);
  const n = faelle[(i + 1) % faelle.length];
  return n && n.id !== st.circuit.id ? h("a", { class: "btn", href: `#/trainer/${n.id}/fehler` }, "Nächster Fehlerfall") : null;
}
