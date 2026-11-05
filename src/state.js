import { laden, speichern } from "./engine/progress.js";

// Zugriff auf localStorage kann werfen (Safari privat, blockiert): dann nur im Speicher weiterarbeiten.
function speicher() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem() {} };
  }
}

let stand = laden(speicher());

export const get = () => stand;
export function set(neu) {
  stand = neu;
  speichern(speicher(), stand);
}

export function heute() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// Meister-Modus gilt nur bis zum Neuladen, nie gespeichert.
export const meister = { aktiv: false };
