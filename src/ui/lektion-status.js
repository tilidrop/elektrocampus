// DOM-freie Statuslogik fuer die Pruefanzeige einer Lektion.
export const STAND = "2026-11-03";
export const NORM_HINWEIS = "Massgebend bleibt immer der aktuelle Normtext (NIN 2025) und die Weisung des Meisters.";

export function pruefStatus(l) {
  if (l && l.geprueft === true) {
    const grad = l.belegt === "hoch" || l.belegt === "mittel" ? `Belegt: ${l.belegt}` : null;
    return { geprueft: true, text: `Fachlich geprüft anhand öffentlicher Schweizer Quellen (Stand ${STAND})`, grad };
  }
  return { geprueft: false, text: "Inhalt noch nicht vom Meister geprüft", grad: null };
}
