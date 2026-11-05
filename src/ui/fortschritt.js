import { setze, h, icon, balken } from "./dom.js";
import { get } from "../state.js";
import { alleModule, modul } from "../content.js";
import { modulProzent } from "./lernen.js";

export function zeige(container) {
  const stand = get();
  setze(container, 
    h("div", { class: "page-head" }, h("h1", {}, "Fortschritt")),
    alleModule().length
      ? h("div", { class: "stack" }, alleModule().map((m) => {
          const t = stand.module[m.id];
          return h("div", { class: "card modul" },
            h("div", { class: "kachel" }, String(m.nummer).padStart(2, "0")),
            h("div", { class: "modul-text" }, h("strong", {}, m.titel), h("div", { class: "muted klein" }, t ? `Modultest ${t.prozent} %${t.bestanden ? ", bestanden" : ""}` : "Modultest noch offen"), balken(modulProzent(m))),
            t?.bestanden ? h("span", { class: "ok-mark" }, icon("haken")) : null);
        }))
      : h("p", { class: "muted" }, "Noch keine Inhalte vorhanden."),
    h("h2", {}, "Abzeichen"),
    stand.abzeichen.length
      ? h("div", { class: "abzeichen" }, stand.abzeichen.map((id) => h("div", { class: "abz-klein" }, h("div", { class: "badge" }, icon("blitz")), h("span", {}, modul(id)?.titel || id))))
      : h("p", { class: "muted" }, "Noch kein Abzeichen. Bestehe einen Modultest mit 80 %.")
  );
}
