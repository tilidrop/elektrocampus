let module = [];

async function json(url) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Dateiliste kommt aus src/module-liste.json (erzeugt von tools/precache.mjs), sonst wird 0 bis 7 probiert.
export async function ladeModule() {
  const dateien = (await json("src/module-liste.json")) || [0, 1, 2, 3, 4, 5, 6, 7].map((n) => `modul-${n}.json`);
  const geladen = await Promise.all(dateien.map((d) => json(`content/${d}`)));
  module = geladen.filter(Boolean).sort((a, b) => a.nummer - b.nummer);
  return module;
}

export const alleModule = () => module;
export const modul = (id) => module.find((m) => m.id === id);

export function lektion(id) {
  for (const m of module) {
    const l = (m.lektionen || []).find((x) => x.id === id);
    if (l) return { ...l, modulId: m.id };
  }
}

export function aufgabe(id) {
  for (const m of module) {
    const a = (m.praxisaufgaben || []).find((x) => x.id === id);
    if (a) return { ...a, modulId: m.id };
  }
}

export function frage(id) {
  for (const m of module) for (const l of m.lektionen || []) {
    const f = (l.quiz || []).find((q) => q.id === id);
    if (f) return f;
  }
}

export const modulFragen = (m) => (m.lektionen || []).flatMap((l) => l.quiz || []);
