import type { OrgContext } from "@/lib/auth/guard";

// Rulează o citire SECUNDARĂ a unei pagini într-un savepoint: dacă pică, tranzacția paginii rămâne validă (altfel o singură
// interogare eșuată ar anula toate celelalte din aceeași tranzacție), eroarea e jurnalizată fără date personale, iar pagina
// primește valoarea de rezervă. Apelurile se fac pe rând (un savepoint deschis la un moment dat).
export async function sectiuneSigura<T>(ctx: OrgContext, eticheta: string, citire: (db: OrgContext["db"]) => Promise<T>, rezerva: T): Promise<T> {
  try {
    return await ctx.db.transaction(async (sp) => citire(sp as unknown as OrgContext["db"]));
  } catch (e) {
    console.error(`[sectiune-secundara:${eticheta}]`, e instanceof Error ? e.name : "eroare");
    return rezerva;
  }
}
