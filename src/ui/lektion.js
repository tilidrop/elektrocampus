import { setze, h, zurueck } from "./dom.js";
import { get, set, heute } from "../state.js";
import { lektionFertig } from "../engine/progress.js";
import { lektion } from "../content.js";
import { quizLauf } from "./quiz.js";
import { pruefStatus, NORM_HINWEIS } from "./lektion-status.js";

function block(b) {
  switch (b.typ) {
    case "text": return h("p", {}, b.text);
    case "liste": return h("ul", { class: "liste" }, (b.punkte || []).map((p) => h("li", {}, p)));
    case "merke": return h("div", { class: "merke" }, h("strong", {}, "Merke: "), b.text);
    case "vergleich":
      return h("div", { class: "vergleich" },
        h("div", {}, h("strong", {}, "Auto"), h("p", {}, b.auto)),
        h("div", {}, h("strong", {}, "Elektro"), h("p", {}, b.elektro)));
    default: return null;
  }
}

function statusBlock(l) {
  const s = pruefStatus(l);
  return h("div", { class: "pruefblock" },
    h("div", { class: s.geprueft ? "ok-box pruefzeile" : "warn pruefzeile" },
      s.text, s.grad ? h("strong", { class: "grad" }, ` ${s.grad}`) : null),
    l.quellen?.length ? h("details", { class: "quellen" }, h("summary", {}, "Quellen"), h("ul", { class: "liste klein" }, l.quellen.map((q) => h("li", {}, q)))) : null,
    h("p", { class: "muted klein" }, NORM_HINWEIS));
}

export function zeige(container, id) {
  const l = lektion(id);
  if (!l) return setze(container, h("p", {}, "Lektion nicht gefunden."), zurueck("#/lernen", "Lernen"));
  const reiter = { Theorie: () => (l.theorie || []).map(block), Praxis: () => (l.praxis || []).map(block), Quiz: quiz };
  const tabs = h("div", { class: "reiter", role: "tablist" });
  const inhalt = h("div", { class: "card inhalt" });

  function quiz() {
    const box = h("div", { class: "quizbox" });
    const fragen = l.quiz || [];
    if (!fragen.length) {
      box.append(
        h("p", { class: "muted" }, "Diese Lektion hat keine Quizfragen."),
        h("button", { class: "btn", type: "button", onclick: () => {
          set(lektionFertig(get(), l.id, heute()));
          setze(box, h("p", {}, "Lektion abgeschlossen."), h("a", { class: "btn", href: `#/modul/${l.modulId}` }, "Zurück zum Modul"));
        } }, "Lektion abschliessen")
      );
      return box;
    }
    quizLauf(box, fragen, ({ richtige, gesamt }) => {
      set(lektionFertig(get(), l.id, heute()));
      setze(box, 
        h("h2", {}, `${richtige} von ${gesamt} richtig`),
        h("p", { class: "muted" }, "Lektion abgeschlossen. Falsche Fragen kommen später zur Wiederholung."),
        h("a", { class: "btn", href: `#/modul/${l.modulId}` }, "Zurück zum Modul"),
        h("button", { class: "btn ghost", type: "button", onclick: () => show("Quiz") }, "Quiz nochmal")
      );
    });
    return box;
  }

  function show(name) {
    [...tabs.children].forEach((b) => b.setAttribute("aria-selected", String(b.textContent === name)));
    const r = reiter[name]();
    const teile = (Array.isArray(r) ? r : [r]).filter(Boolean);
    setze(inhalt, teile);
    if (!teile.length) inhalt.append(h("p", { class: "muted" }, "Hier steht noch nichts."));
  }
  Object.keys(reiter).forEach((n) => tabs.append(h("button", { class: "tab", role: "tab", type: "button", onclick: () => show(n) }, n)));

  setze(container, 
    h("div", { class: "page-head" }, zurueck(`#/modul/${l.modulId}`, "Modul"), h("h1", {}, l.titel), h("p", { class: "muted" }, `${l.minuten || "?"} Min.`)),
    statusBlock(l),
    tabs,
    inhalt
  );
  show("Theorie");
}
