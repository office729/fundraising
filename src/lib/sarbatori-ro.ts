// Sărbători legale din România (fără acces la baza de date; importabil și din browser). Folosit la calculul capacității pe săptămâni.

// Paștele ortodox: algoritmul Meeus (dată iuliană) + 13 zile → gregoriană (valabil 1900–2099).
function pasteOrtodox(an: number): Date {
  const a = an % 4,
    b = an % 7,
    c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  const iulian = new Date(Date.UTC(an, luna - 1, zi));
  iulian.setUTCDate(iulian.getUTCDate() + 13);
  return iulian;
}

function isoUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const cache = new Map<number, Set<string>>();

export function sarbatoriRo(an: number): Set<string> {
  const c = cache.get(an);
  if (c) return c;
  const s = new Set<string>([`${an}-01-01`, `${an}-01-02`, `${an}-01-24`, `${an}-05-01`, `${an}-06-01`, `${an}-08-15`, `${an}-11-30`, `${an}-12-01`, `${an}-12-25`, `${an}-12-26`]);
  const paste = pasteOrtodox(an);
  for (const off of [-2, 0, 1, 49, 50]) {
    const d = new Date(paste);
    d.setUTCDate(d.getUTCDate() + off);
    s.add(isoUTC(d));
  }
  cache.set(an, s);
  return s;
}
