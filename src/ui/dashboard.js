import { setze, h, icon, balken } from "./dom.js";
import { get, heute } from "../state.js";
import { faellig } from "../engine/review.js";
import { alleModule } from "../content.js";
import { offenMap, modulProzent } from "./lernen.js";

function weiter() {
  const o = offenMap();
  for (const m of alleModule()) {
    if (!o[m.id]) continue;
    const l = (m.lektionen || []).find((x) => !get().lektionen[x.id]);
    if (l) return { m, text: l.titel, href: `#/lektion/${l.id}` };
    if (!get().module[m.id]?.bestanden) return { m, text: "Modultest", href: `#/quiz/${m.id}` };
  }
  return null;
}

export function zeige(container) {
  const stand = get();
  const module = alleModule();
  const lektionen = module.flatMap((m) => m.lektionen || []);
  const fertig = lektionen.filter((l) => stand.lektionen[l.id]).length;
  const prozent = lektionen.length ? Math.round((fertig / lektionen.length) * 100) : 0;
  const aufgaben = module.flatMap((m) => m.praxisaufgaben || []);
  const frei = aufgaben.filter((a) => stand.praxis[a.id]?.frei).length;
  const due = faellig(Object.values(stand.karten), heute()).length;
  const w = weiter();

  const stat = (zahl, text, ikon, klasse = "") => h("div", { class: `card stat ${klasse}` }, icon(ikon), h("div", {}, h("strong", {}, String(zahl)), h("span", { class: "muted klein" }, text)));

  setze(container, 
    h("div", { class: "page-head" }, h("h1", {}, "Hallo!")),
    h("section", { class: "hero" }, h("div", {}, h("span", { class: "klein" }, "Dein Lernfortschritt"), h("div", { class: "gross" }, `${prozent} %`), balken(prozent, "gruen")), icon("blitz")),
    h("div", { class: "stats" },
      stat(fertig, "Lektionen abgeschlossen", "buch"),
      stat(aufgaben.length - frei, "Praxisaufgaben offen", "werkzeug", "orange"),
      stat(frei, "Freigaben erteilt", "stern")),
    due ? h("a", { class: "card zeile", href: "#/wiederholen" }, icon("uhr"), h("span", { class: "grow" }, h("strong", {}, `${due} Wiederholung${due === 1 ? "" : "en"} fällig`)), icon("pfeil")) : null,
    h("h2", {}, "Weiterlernen"),
    w
      ? h("div", { class: "card modul" },
          h("div", { class: "kachel" }, String(w.m.nummer).padStart(2, "0")),
          h("div", { class: "modul-text" }, h("strong", {}, `Modul ${w.m.nummer}: ${w.m.titel}`), h("div", { class: "muted klein" }, w.text), balken(modulProzent(w.m))),
          h("a", { class: "btn klein-btn", href: w.href }, "Weiter"))
      : h("div", { class: "card" }, module.length ? "Alles erledigt, was aktuell freigeschaltet ist." : "Noch keine Inhalte vorhanden.")
  );
}
