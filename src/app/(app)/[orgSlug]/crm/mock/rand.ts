// PRNG determinist (mulberry32) — NU Math.random(). Fixture-urile trebuie să
// fie identice la fiecare randare (server + client), altfel apar mismatch-uri
// de hidratare în Componentele Client care le consumă direct la import.
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function int(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Ancorat la 12:00 UTC a zilei curente, nu la ora exactă a încărcării modulului. Modulul se evaluează pe server (la pornirea
// funcției, uneori cu ore în urmă) și în browser (la deschiderea paginii): cu ora exactă, `formatDataRelativa` (care rotunjește
// la zile) putea da „acum 3 zile" pe server și „acum 2 zile" în browser — nepotrivire de hidratare (React #418).
// Cu ancora la prânz UTC, diferența rotunjită e aceeași pe tot parcursul zilei UTC.
export function daysAgo(n: number) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}
