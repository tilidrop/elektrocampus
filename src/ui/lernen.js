import { setze, h, icon, balken, zurueck } from "./dom.js";
import { get } from "../state.js";
import { offen } from "../engine/progress.js";
import { alleModule, modul } from "../content.js";

export function lektionenFertig(m) {
  const gemacht = (m.lektionen || []).filter((l) => get().lektionen[l.id]).length;
  return { gemacht, gesamt: (m.lektionen || []).length };
}

export function modulProzent(m) {
  const { gemacht, gesamt } = lektionenFertig(m);
  return gesamt ? (gemacht / gesamt) * 100 : 0;
}

export const offenMap = () => offen(get(), alleModule().map((m) => m.id));

export function modulKarte(m, istOffen) {
  const p = Math.round(modulProzent(m));
  const nr = String(m.nummer).padStart(2, "0");
  return h(istOffen ? "a" : "div", { class: `card modul ${istOffen ? "" : "zu"}`, href: istOffen ? `#/modul/${m.id}` : null },
    h("div", { class: "kachel" }, nr),
    h("div", { class: "modul-text" },
      h("strong", {}, m.titel),
      h("div", { class: "muted klein" }, istOffen ? `${p} %` : "Gesperrt: Vorgängermodul zuerst bestehen"),
      istOffen ? balken(p) : null),
    istOffen ? (get().module[m.id]?.bestanden ? h("span", { class: "ok-mark" }, icon("haken")) : icon("pfeil")) : icon("schloss"));
}

export function liste(container) {
  const o = offenMap();
  const module = alleModule();
  setze(container, 
    h("div", { class: "page-head" }, h("h1", {}, "Lernmodule")),
    h("a", { class: "card zeile trainer-link", href: "#/trainer" }, h("span", { class: "dot" }, icon("blitz")), h("span", { class: "grow" }, h("strong", {}, "Schaltungs-Trainer"), h("span", { class: "muted klein" }, " Schemas lesen, verdrahten, Fehler suchen")), icon("pfeil")),
    module.length ? h("div", { class: "stack" }, module.map((m) => modulKarte(m, o[m.id]))) : h("p", { class: "muted" }, "Noch keine Inhalte vorhanden.")
  );
}

export function zeigeModul(container, id) {
  const m = modul(id);
  if (!m) return setze(container, h("p", {}, "Modul nicht gefunden."), zurueck("#/lernen", "Lernen"));
  if (!offenMap()[m.id]) {
    return setze(container, zurueck("#/lernen", "Lernen"), h("div", { class: "card" }, icon("schloss"), h("h2", {}, m.titel), h("p", {}, "Dieses Modul ist gesperrt. Bestehe zuerst Modul 0 und das Vorgängermodul (ab 80 %).")));
  }
  const stand = get();
  const test = stand.module[m.id];
  setze(container, 
    h("div", { class: "page-head" }, zurueck("#/lernen", "Lernen"), h("h1", {}, `Modul ${m.nummer}: ${m.titel}`), m.beschreibung ? h("p", { class: "muted" }, m.beschreibung) : null),
    h("h2", {}, "Lektionen"),
    h("div", { class: "stack" }, (m.lektionen || []).map((l) =>
      h("a", { class: "card zeile", href: `#/lektion/${l.id}` },
        h("span", { class: `dot ${stand.lektionen[l.id] ? "fertig" : ""}` }, stand.lektionen[l.id] ? icon("haken") : null),
        h("span", { class: "grow" }, h("strong", {}, l.titel), h("span", { class: "muted klein" }, ` ${l.minuten || "?"} Min.`)),
        h("span", { class: `pruef ${l.geprueft ? "ja" : "nein"}`, title: l.geprueft ? "Fachlich geprüft" : "Noch nicht vom Meister geprüft", "aria-label": l.geprueft ? "Fachlich geprüft" : "Noch nicht vom Meister geprüft" }, l.geprueft ? icon("haken") : null),
        icon("pfeil")))),
    (m.praxisaufgaben || []).length ? h("h2", {}, "Praxisaufgaben") : null,
    h("div", { class: "stack" }, (m.praxisaufgaben || []).map((a) =>
      h("a", { class: "card zeile praxis", href: `#/praxis/${a.id}` },
        h("span", { class: `dot ${stand.praxis[a.id]?.frei ? "fertig" : ""}` }, stand.praxis[a.id]?.frei ? icon("haken") : icon("werkzeug")),
        h("span", { class: "grow" }, h("strong", {}, a.titel), h("span", { class: "muted klein" }, ` ${a.stufe || ""}`)),
        icon("pfeil")))),
    (m.schaltungen || []).length ? h("h2", {}, "Schaltungen") : null,
    h("div", { class: "stack" }, (m.schaltungen || []).map((s) =>
      h("div", { class: "card zeile" },
        h("span", { class: "grow" }, h("strong", {}, s)),
        ["lesen", "verdrahten", "fehler"].map((mo) => h("a", { class: "chip", href: `#/trainer/${s}/${mo}` }, mo))))),
    h("h2", {}, "Modultest"),
    h("div", { class: "card" },
      h("p", {}, test ? `Letztes Ergebnis: ${test.prozent} %${test.bestanden ? " (bestanden)" : ""}` : "Bis zu 10 Fragen aus dem ganzen Modul. Bestanden ab 80 %."),
      h("a", { class: "btn", href: `#/quiz/${m.id}` }, test ? "Test wiederholen" : "Test starten"))
  );
}
