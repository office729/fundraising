import "server-only";

// Curs USD→RON doar pentru afișarea echivalentului în lei al consumului AI (reper, nu sumă contabilă). Memorat 6 ore; dacă sursa cade, se afișează doar USD.
const TTL_MS = 6 * 60 * 60 * 1000;
let cache: { curs: number; la: number } | null = null;

export async function cursUsdRon(): Promise<number | null> {
  const acum = Date.now();
  if (cache && acum - cache.la < TTL_MS) return cache.curs;
  try {
    const r = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=RON", { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (r.ok) {
      const curs = Number(((await r.json()) as { rates?: { RON?: number } }).rates?.RON);
      // Plauzibilitate: un dolar valorează câțiva lei.
      if (Number.isFinite(curs) && curs > 2 && curs < 10) {
        cache = { curs, la: acum };
        return curs;
      }
    }
  } catch {
    // fără curs: se afișează doar USD
  }
  return cache && acum - cache.la < 48 * TTL_MS ? cache.curs : null;
}
