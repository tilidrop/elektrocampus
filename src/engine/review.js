export const INTERVALS = { 0: 1, 1: 3, 2: 7 };

function plusTage(datum, tage) {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

// Ohne vorhandene Karte hat die neue Karte keine id, der Aufrufer setzt sie.
export function antwort(karte, richtig, heute) {
  if (!richtig) return { ...karte, box: 0, due: plusTage(heute, INTERVALS[0]) };
  if (!karte) return null;
  if (karte.box >= 2) return null;
  const box = karte.box + 1;
  return { ...karte, box, due: plusTage(heute, INTERVALS[box]) };
}

export function faellig(karten, heute) {
  return karten.filter((k) => k.due <= heute);
}
