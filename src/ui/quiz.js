import { setze, h, icon, balken, zurueck } from "./dom.js";
import { get, set, heute } from "../state.js";
import { antwort, faellig } from "../engine/review.js";
import { modulTest } from "../engine/progress.js";
import { alleModule, modul, frage, modulFragen } from "../content.js";

function mischen(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Falsche Antworten werden zu Karten, richtige schieben sie weiter (siehe engine/review.js).
function kartenUpdate(frageId, richtig) {
  const stand = get();
  const k = antwort(stand.karten[frageId], richtig, heute());
  const karten = { ...stand.karten };
  if (k) karten[frageId] = { ...k, id: frageId };
  else delete karten[frageId];
  set({ ...stand, karten });
}

// Gemeinsamer Ablauf für Lektionsquiz, Modultest und Wiederholung.
export function quizLauf(container, fragen, onEnde) {
  let i = 0, richtige = 0;
  function schritt() {
    if (i >= fragen.length) return onEnde({ richtige, gesamt: fragen.length });
    const f = fragen[i];
    let gewaehlt = null, geprueft = false;
    const knoepfe = f.optionen.map((o, idx) =>
      h("button", { class: "opt", type: "button", onclick: () => {
        if (geprueft) return;
        gewaehlt = idx;
        knoepfe.forEach((k, n) => k.classList.toggle("sel", n === idx));
        pruefen.disabled = false;
      } }, h("span", { class: "radio" }), h("span", {}, o))
    );
    const rueck = h("div", { class: "erkl", hidden: true });
    const pruefenText = h("span", {}, "Prüfen");
    const pruefen = h("button", { class: "btn", type: "button", disabled: true, onclick: () => {
      if (geprueft) {
        i++;
        return schritt();
      }
      geprueft = true;
      const ok = gewaehlt === f.richtig;
      if (ok) richtige++;
      kartenUpdate(f.id, ok);
      knoepfe.forEach((k, n) => {
        k.classList.toggle("ok", n === f.richtig);
        k.classList.toggle("bad", n === gewaehlt && !ok);
      });
      rueck.hidden = false;
      setze(rueck, h("strong", {}, ok ? "Richtig. " : "Leider falsch. "), f.erklaerung || "");
      pruefenText.textContent = i + 1 >= fragen.length ? "Ergebnis" : "Weiter";
    } }, pruefenText, icon("pfeil"));
    setze(container, 
      h("div", { class: "qhead" }, h("span", {}, `Frage ${i + 1} / ${fragen.length}`), balken(((i + 1) / fragen.length) * 100)),
      h("h2", { class: "frage" }, f.frage),
      h("div", { class: "opts", role: "radiogroup" }, knoepfe),
      rueck,
      pruefen
    );
  }
  schritt();
}

export function modultest(container, modulId) {
  const m = modul(modulId);
  if (!m) return setze(container, h("p", {}, "Modul nicht gefunden."), zurueck("#/lernen", "Lernen"));
  const fragen = mischen(modulFragen(m)).slice(0, 10);
  const kopf = h("div", { class: "page-head" }, zurueck(`#/modul/${m.id}`, m.titel), h("h1", {}, `Modultest ${m.titel}`));
  if (!fragen.length) return setze(container, kopf, h("p", { class: "muted" }, "Dieses Modul hat noch keine Quizfragen."));
  const lauf = h("div", { class: "quizbox card" });
  setze(container, kopf, lauf);
  quizLauf(lauf, fragen, ({ richtige, gesamt }) => {
    const prozent = Math.round((richtige / gesamt) * 100);
    let stand = modulTest(get(), m.id, prozent, heute());
    const bestanden = prozent >= 80;
    if (bestanden && !stand.abzeichen.includes(m.id)) stand = { ...stand, abzeichen: [...stand.abzeichen, m.id] };
    set(stand);
    const alle = alleModule();
    const naechstes = alle[alle.findIndex((x) => x.id === m.id) + 1];
    if (!bestanden) {
      return setze(lauf, 
        h("h2", {}, `${prozent} %`),
        h("p", {}, `${richtige} von ${gesamt} richtig. Zum Bestehen braucht es 80 %.`),
        h("a", { class: "btn", href: `#/quiz/${m.id}` }, "Nochmal versuchen"),
        h("a", { class: "btn ghost", href: `#/modul/${m.id}` }, "Zurück zum Modul")
      );
    }
    setze(lauf, 
      h("div", { class: "abz" },
        h("div", { class: "badge" }, icon("blitz")),
        h("h2", {}, "Super gemacht!"),
        h("p", {}, `Du hast ${m.titel} bestanden (${prozent} %).`),
        naechstes
          ? h("a", { class: "btn", href: `#/modul/${naechstes.id}` }, h("span", {}, "Nächstes Modul"), icon("pfeil"))
          : h("a", { class: "btn", href: "#/fortschritt" }, "Zum Fortschritt"),
        h("a", { class: "btn ghost", href: "#/fortschritt" }, "Abzeichen ansehen")
      )
    );
  });
}

export function wiederholen(container) {
  const kopf = h("div", { class: "page-head" }, h("h1", {}, "Wiederholen"));
  const karten = faellig(Object.values(get().karten), heute());
  const fragen = karten.map((k) => frage(k.id)).filter(Boolean);
  if (!fragen.length) {
    const offene = Object.keys(get().karten).length;
    return setze(container, kopf, h("div", { class: "card" },
      h("p", {}, "Heute ist nichts fällig."),
      h("p", { class: "muted" }, offene ? `${offene} Karten warten auf einen späteren Tag. Falsch beantwortete Fragen kommen nach 1, 3 und 7 Tagen wieder.` : "Falsch beantwortete Quizfragen kommen hier nach 1, 3 und 7 Tagen wieder."),
      h("a", { class: "btn", href: "#/lernen" }, "Zu den Modulen")));
  }
  const lauf = h("div", { class: "quizbox card" });
  setze(container, kopf, lauf);
  quizLauf(lauf, fragen, ({ richtige, gesamt }) =>
    setze(lauf, h("h2", {}, `${richtige} von ${gesamt} richtig`), h("p", { class: "muted" }, "Falsche Fragen kommen morgen wieder."), h("a", { class: "btn", href: "#/dashboard" }, "Zum Dashboard"))
  );
}
