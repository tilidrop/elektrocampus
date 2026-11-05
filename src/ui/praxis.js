import { setze, h, icon, zurueck } from "./dom.js";
import { get, set, heute, meister } from "../state.js";
import { praxisFreigabe } from "../engine/progress.js";
import { alleModule, aufgabe } from "../content.js";

export function liste(container) {
  const aufgaben = alleModule().flatMap((m) => (m.praxisaufgaben || []).map((a) => ({ ...a, modulTitel: m.titel })));
  setze(container, 
    h("div", { class: "page-head" }, h("h1", {}, "Praxisaufgaben")),
    aufgaben.length
      ? h("div", { class: "stack" }, aufgaben.map((a) => {
          const frei = get().praxis[a.id]?.frei;
          return h("a", { class: "card zeile praxis", href: `#/praxis/${a.id}` },
            h("span", { class: `dot ${frei ? "fertig" : ""}` }, frei ? icon("haken") : icon("werkzeug")),
            h("span", { class: "grow" }, h("strong", {}, a.titel), h("span", { class: "muted klein" }, ` ${a.modulTitel}`)),
            h("span", { class: "chip orange" }, frei ? "Freigegeben" : a.stufe || "Offen"));
        }))
      : h("p", { class: "muted" }, "Noch keine Inhalte vorhanden.")
  );
}

export function zeige(container, id) {
  const a = aufgabe(id);
  if (!a) return setze(container, h("p", {}, "Aufgabe nicht gefunden."), zurueck("#/praxis", "Praxis"));
  const stand = get();
  const frei = stand.praxis[a.id]?.frei;
  const haken = a.kriterien.map(() => Boolean(frei));
  const boxen = a.kriterien.map((k, i) =>
    h("label", { class: "krit" },
      h("input", { type: "checkbox", checked: frei ? true : null, disabled: meister.aktiv && !frei ? null : true, onchange: (e) => { haken[i] = e.target.checked; } }),
      h("span", {}, k)));
  setze(container, 
    h("div", { class: "page-head" }, zurueck("#/praxis", "Praxis"), h("span", { class: "chip orange" }, a.stufe || ""), h("h1", {}, a.titel)),
    h("div", { class: "card praxis-karte" },
      h("h2", {}, "Dein Ziel"), h("p", {}, a.ziel),
      h("h2", {}, "Bewertungskriterien"), h("div", { class: "stack" }, boxen)),
    frei
      ? h("div", { class: "ok-box" }, `Freigegeben am ${stand.praxis[a.id].datum}. Gilt nur als Ausbildungs-Abzeichen, nicht als Bewilligung.`)
      : meister.aktiv
        ? h("button", { class: "btn orange", type: "button", onclick: () => {
            set(praxisFreigabe(get(), a.id, haken, heute()));
            zeige(container, id);
          } }, "Freigabe erteilen")
        : h("div", { class: "warn" }, "Freigabe nur im Meister-Modus.", h("a", { href: "#/meister" }, " Zum Meister-Modus"))
  );
}
