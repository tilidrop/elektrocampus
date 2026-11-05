import { h, icon, setze } from "./ui/dom.js";
import { ladeModule } from "./content.js";
import * as dashboard from "./ui/dashboard.js";
import * as lernen from "./ui/lernen.js";
import * as lektion from "./ui/lektion.js";
import * as quiz from "./ui/quiz.js";
import * as praxis from "./ui/praxis.js";
import * as fortschritt from "./ui/fortschritt.js";
import * as meister from "./ui/meister.js";
import * as trainer from "./ui/trainer.js";

const NAV = [
  ["#/dashboard", "Dashboard", "home"],
  ["#/lernen", "Lernen", "buch"],
  ["#/praxis", "Praxis", "werkzeug"],
  ["#/wiederholen", "Quiz", "quiz"],
  ["#/fortschritt", "Fortschritt", "chart"],
];
const SIDE_EXTRA = [["#/trainer", "Trainer", "blitz"], ["#/meister", "Meister", "user"]];

// Reihenfolge: genauere Muster zuerst. Jede Route bekommt (container, ...Parameter).
const ROUTEN = [
  [/^#\/dashboard$/, (c) => dashboard.zeige(c), "#/dashboard"],
  [/^#\/lernen$/, (c) => lernen.liste(c), "#/lernen"],
  [/^#\/modul\/([^/]+)$/, (c, id) => lernen.zeigeModul(c, id), "#/lernen"],
  [/^#\/lektion\/([^/]+)$/, (c, id) => lektion.zeige(c, id), "#/lernen"],
  [/^#\/quiz\/([^/]+)$/, (c, id) => quiz.modultest(c, id), "#/lernen"],
  [/^#\/wiederholen$/, (c) => quiz.wiederholen(c), "#/wiederholen"],
  [/^#\/praxis$/, (c) => praxis.liste(c), "#/praxis"],
  [/^#\/praxis\/([^/]+)$/, (c, id) => praxis.zeige(c, id), "#/praxis"],
  [/^#\/fortschritt$/, (c) => fortschritt.zeige(c), "#/fortschritt"],
  [/^#\/meister$/, (c) => meister.zeige(c), "#/meister"],
  [/^#\/trainer$/, (c) => trainer.liste(c), "#/trainer"],
  [/^#\/trainer\/([^/]+)(?:\/(lesen|verdrahten|fehler))?$/, (c, id, modus) => trainer.zeige(c, id, modus || "lesen"), "#/lernen"],
];

const app = document.getElementById("app");
const links = (liste, klasse) => liste.map(([href, text, ik]) => h("a", { class: klasse, href, "data-href": href }, icon(ik), h("span", {}, text)));

document.getElementById("side").append(
  h("div", { class: "logo" }, icon("blitz"), h("span", {}, "Elektro", h("b", {}, "Campus"))),
  ...links([...NAV, ...SIDE_EXTRA], "navlink")
);
document.getElementById("tabs").append(...links(NAV, "navlink"));

function hinweis() {
  return h("p", { class: "dauerhinweis" }, "Die App vermittelt Theorie. Was angeschlossen oder gemessen werden darf, bestimmt der Meister. Freigaben ersetzen keine Bewilligung.");
}

function render() {
  const hash = location.hash || "#/dashboard";
  const treffer = ROUTEN.map(([re, fn, nav]) => [re.exec(hash), fn, nav]).find(([m]) => m);
  app.replaceChildren();
  if (!treffer) {
    location.hash = "#/dashboard";
    return;
  }
  const [m, fn, nav] = treffer;
  try {
    fn(app, ...m.slice(1).map(decodeURIComponent));
  } catch (e) {
    console.error(e);
    setze(app, h("div", { class: "card" }, h("h2", {}, "Diese Seite konnte nicht angezeigt werden."), h("a", { class: "btn", href: "#/dashboard" }, "Zum Dashboard")));
  }
  app.append(hinweis());
  document.querySelectorAll(".navlink").forEach((a) => a.classList.toggle("aktiv", a.dataset.href === nav));
  window.scrollTo(0, 0);
}

await ladeModule();
window.addEventListener("hashchange", render);
render();

if ("serviceWorker" in navigator) {
  // Neue Version: der Service Worker übernimmt sofort, die Seite zeigt erst nach Tippen die neuen Inhalte.
  const hatteController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hatteController || document.getElementById("update-hinweis")) return;
    const b = document.createElement("button");
    b.id = "update-hinweis";
    b.className = "update-hinweis";
    b.textContent = "Neue Version geladen. Tippe hier zum Aktualisieren.";
    b.addEventListener("click", () => location.reload());
    document.body.append(b);
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    // Eine installierte App bleibt oft lange im Hintergrund: beim Zurückkehren nach Updates suchen.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    });
  }).catch(() => {});
}
