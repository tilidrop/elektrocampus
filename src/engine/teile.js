// Einzige Quelle fuer Teiletypen und Klemmen.
// stellungen: Stellung -> Kontaktpaare, die in dieser Stellung verbunden sind. Erste Stellung ist die Grundstellung.
// last: Klemmenpaar der Last (nicht leitend, nur Lastzweig). intern: alle Klemmen sind fest verbunden.
export const TEILE = {
  quelle: { klemmen: [] },
  ausschalter: { klemmen: ['in', 'out'], stellungen: { aus: [], ein: [['in', 'out']] } },
  taster: { klemmen: ['in', 'out'], stellungen: { aus: [], ein: [['in', 'out']] } },
  wechsler: { klemmen: ['com', 'a', 'b'], stellungen: { a: [['com', 'a']], b: [['com', 'b']] } },
  kreuz: {
    klemmen: ['a1', 'a2', 'b1', 'b2'],
    stellungen: { gerade: [['a1', 'b1'], ['a2', 'b2']], gekreuzt: [['a1', 'b2'], ['a2', 'b1']] },
  },
  lampe: { klemmen: ['l', 'n', 'pe'], last: ['l', 'n'] },
  steckdose: { klemmen: ['l', 'n', 'pe'], last: ['l', 'n'] },
  dose: { klemmen: ['1', '2', '3', '4', '5', '6'], intern: true },
};
