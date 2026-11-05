import { setze, h } from "./dom.js";
import { get, set, meister } from "../state.js";
import { pinSetzen, pinPruefen } from "../engine/progress.js";
import { alleModule } from "../content.js";

export function zeige(container) {
  const kopf = h("div", { class: "page-head" }, h("h1", {}, "Meister-Modus"));
  const meldung = h("p", { class: "fehler", role: "alert" });
  const feld = (label, name) => h("label", { class: "feld" }, label, h("input", { type: "password", inputmode: "numeric", autocomplete: "off", name, minlength: 4 }));

  if (meister.aktiv) {
    const aufgaben = alleModule().flatMap((m) => m.praxisaufgaben || []);
    return setze(container, 
      kopf,
      h("div", { class: "card" },
        h("p", {}, "Meister-Modus aktiv. Du kannst Praxisaufgaben freigeben."),
        h("div", { class: "stack" }, aufgaben.map((a) => h("a", { class: "zeile", href: `#/praxis/${a.id}` }, h("span", { class: "grow" }, a.titel), h("span", { class: "chip orange" }, get().praxis[a.id]?.frei ? "Freigegeben" : "Offen")))),
        h("button", { class: "btn ghost", type: "button", onclick: () => { meister.aktiv = false; zeige(container); } }, "Meister-Modus beenden"))
    );
  }

  const neu = get().pinHash === null;
  const f1 = feld(neu ? "Neue PIN (mindestens 4 Ziffern)" : "PIN", "pin");
  const f2 = neu ? feld("PIN wiederholen", "pin2") : null;
  const form = h("form", { class: "card", onsubmit: async (e) => {
    e.preventDefault();
    const pin = f1.querySelector("input").value;
    if (neu) {
      if (!/^\d{4,}$/.test(pin)) return (meldung.textContent = "Die PIN braucht mindestens 4 Ziffern.");
      if (pin !== f2.querySelector("input").value) return (meldung.textContent = "Die beiden PIN stimmen nicht überein.");
      set(await pinSetzen(get(), pin));
      meister.aktiv = true;
    } else if (await pinPruefen(get(), pin)) {
      meister.aktiv = true;
    } else {
      return (meldung.textContent = "Falsche PIN.");
    }
    zeige(container);
  } },
  neu ? h("p", { class: "muted" }, "Beim ersten Öffnen legst du die PIN fest. Sie gilt nur auf diesem Gerät.") : null,
  f1, f2, meldung,
  h("button", { class: "btn", type: "submit" }, neu ? "PIN festlegen" : "Entsperren"));
  setze(container, kopf, form);
}
