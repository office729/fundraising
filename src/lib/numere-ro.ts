// Numere scrise cum le scrie omul în România: „1.234,56", „1 234", „1234.5", „12.345", „RON 5.000". Orice caracter care
// nu e cifră, punct, virgulă sau minus se ignoră. Regula pentru separatori:
//  - un singur separator urmat de EXACT 3 cifre = separator de mii („12.345" = 12345);
//  - altfel, ultimul separator urmat de 1–2 cifre = separator zecimal („1.234,56", „12.5", „2,50").
// Înainte, importul CSV arunca tot ce nu era cifră („1.234,56" devenea 123456) iar contractul de sponsorizare la fel
// („1.500,50" devenea 150.050). Întoarce null dacă nu există niciun număr.
export function parseazaNumarRo(brut: unknown): number | null {
  const t = String(brut ?? "").replace(/[^0-9.,-]/g, "");
  if (!/[0-9]/.test(t)) return null;
  const negativ = t.startsWith("-");
  const cifre = t.replace(/-/g, "");
  const ultim = Math.max(cifre.lastIndexOf(","), cifre.lastIndexOf("."));
  let intreg = cifre;
  let zec = "";
  if (ultim >= 0) {
    const dupa = cifre.slice(ultim + 1);
    const nrSeparatori = (cifre.match(/[.,]/g) ?? []).length;
    const doarMii = nrSeparatori === 1 && dupa.length === 3;
    if (!doarMii && dupa.length >= 1 && dupa.length <= 2) {
      intreg = cifre.slice(0, ultim);
      zec = dupa;
    }
  }
  const n = Number(`${intreg.replace(/[.,]/g, "")}${zec ? "." + zec : ""}`);
  return Number.isFinite(n) ? (negativ ? -n : n) : null;
}
