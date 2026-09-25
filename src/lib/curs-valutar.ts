// Curs EUR→RON pentru metodele de plată care nu acceptă RON (PayPal prin Stripe
// acceptă doar EUR/GBP/USD/etc.). Donația se încasează în EUR, iar în platformă
// se reține echivalentul în lei la cursul din momentul donației — totalurile
// campaniilor rămân în lei.
//
// Sursă: cursul de referință ECB (Frankfurter), cu un furnizor de rezervă. Cursul
// se reține în memorie 6 ore; dacă ambele surse cad, se folosește ultimul curs
// bun cunoscut (max 48 ore), altfel se întoarce null și metoda se dezactivează
// — mai bine fără PayPal decât cu o sumă calculată la întâmplare.

const TTL_MS = 6 * 60 * 60 * 1000;
const VALABIL_MAX_MS = 48 * 60 * 60 * 1000;

let cache: { curs: number; la: number } | null = null;

async function citesteJson(url: string): Promise<unknown> {
  const raspuns = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
  if (!raspuns.ok) throw new Error(`curs valutar: ${url} → ${raspuns.status}`);
  return raspuns.json();
}

async function dinSurse(): Promise<number | null> {
  const surse: Array<[string, (j: unknown) => unknown]> = [
    ["https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RON", (j) => (j as { rates?: { RON?: number } }).rates?.RON],
    ["https://open.er-api.com/v6/latest/EUR", (j) => (j as { rates?: { RON?: number } }).rates?.RON],
  ];
  for (const [url, extrage] of surse) {
    try {
      const curs = Number(extrage(await citesteJson(url)));
      // Plauzibilitate: RON/EUR e undeva în jur de 5; un curs absurd nu se folosește.
      if (Number.isFinite(curs) && curs > 3 && curs < 8) return curs;
    } catch (e) {
      console.error("curs valutar:", e);
    }
  }
  return null;
}

export async function cursEurRon(): Promise<number | null> {
  const acum = Date.now();
  if (cache && acum - cache.la < TTL_MS) return cache.curs;
  const curs = await dinSurse();
  if (curs) {
    cache = { curs, la: acum };
    return curs;
  }
  return cache && acum - cache.la < VALABIL_MAX_MS ? cache.curs : null;
}
