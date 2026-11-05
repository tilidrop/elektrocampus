export const KEY = "elektrocampus.v1";

export function leer() {
  return { v: 1, lektionen: {}, module: {}, karten: {}, praxis: {}, pinHash: null, abzeichen: [] };
}

export function laden(storage) {
  try {
    const stand = JSON.parse(storage.getItem(KEY));
    if (stand && typeof stand === "object" && !Array.isArray(stand)) return { ...leer(), ...stand };
  } catch {}
  return leer();
}

export function speichern(storage, stand) {
  try {
    storage.setItem(KEY, JSON.stringify(stand));
  } catch {}
}

export function lektionFertig(stand, id, datum) {
  return { ...stand, lektionen: { ...stand.lektionen, [id]: { datum } } };
}

export function modulTest(stand, modulId, prozent, datum) {
  const bestanden = prozent >= 80 || stand.module[modulId]?.bestanden === true;
  return { ...stand, module: { ...stand.module, [modulId]: { prozent, bestanden, datum } } };
}

export function offen(stand, modulIds) {
  const bestanden = (id) => stand.module[id]?.bestanden === true;
  const result = {};
  modulIds.forEach((id, i) => {
    result[id] = i === 0 || (bestanden(modulIds[0]) && bestanden(modulIds[i - 1]));
  });
  return result;
}

export function praxisFreigabe(stand, aufgabeId, kriterienHaken, datum) {
  const frei = kriterienHaken.length > 0 && kriterienHaken.every((h) => h === true);
  return { ...stand, praxis: { ...stand.praxis, [aufgabeId]: { frei, datum } } };
}

async function hash(pin) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pinSetzen(stand, pin) {
  return { ...stand, pinHash: await hash(pin) };
}

export async function pinPruefen(stand, pin) {
  return stand.pinHash !== null && stand.pinHash === (await hash(pin));
}
