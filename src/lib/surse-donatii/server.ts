import "server-only";

import { and, eq } from "drizzle-orm";

import type { db as dbGlobal } from "@/lib/db";
import { donatieSurse, fundraisingDonations } from "@/lib/db/schema";
import { cursEurRon } from "@/lib/curs-valutar";

import { atribuireDeSalvat, convertesteInEur, domeniiIgnorate, parseazaSurse, type SursaDeSalvat } from "./nucleu";

type Db = typeof dbGlobal;

// Cursul EUR/RON se ia ÎNAINTE de tranzacția bazei de date (cerere de rețea, memorată 6 ore); dacă lipsește, conversia rămâne „indisponibilă”, nu 0.
export async function cursPentruDonatie(): Promise<{ curs: number | null; la: Date }> {
  try {
    return { curs: await cursEurRon(), la: new Date() };
  } catch {
    return { curs: null, la: new Date() };
  }
}

// Câmpul „x” din contextul de atribuire primit de la formularul de donație (obiect sau șir JSON).
export function surseDinContext(ctxBrut: string | null | undefined): unknown {
  if (typeof ctxBrut !== "string" || !ctxBrut) return null;
  try {
    const o = JSON.parse(ctxBrut) as { x?: unknown } | null;
    return o && typeof o === "object" && o.x != null ? o.x : null;
  } catch {
    return null;
  }
}

const idsText = (a: readonly string[]): string | null => (a.length ? a.join(",") : null);
const coloane = (p: "p" | "u", s: SursaDeSalvat | null) =>
  s
    ? {
        [`${p}Categorie`]: s.categorie,
        [`${p}UtmSource`]: s.utmSource,
        [`${p}UtmMedium`]: s.utmMedium,
        [`${p}Campanie`]: s.campanie,
        [`${p}UtmContent`]: s.utmContent,
        [`${p}UtmTerm`]: s.utmTerm,
        [`${p}ClickIds`]: idsText(s.clickIds),
        [`${p}ReferrerHost`]: s.referrerHost,
        [`${p}ReferralId`]: s.referralId,
        [`${p}La`]: s.la,
      }
    : {};

// Salvează pe donație copia atribuirii, o singură dată (unic pe donație: o retrimitere sau un webhook repetat nu creează al doilea rând și nu rescrie sursa).
// Fără sursă externă recunoscută NU se scrie nimic: donația rămâne Direct și nu intră în raport. Rulează în contextul organizației (app.current_org_id setat).
// Întoarce true dacă a salvat un rând nou.
export async function salveazaSurseDonatie(
  dbx: Db,
  i: { orgId: string; donationId: string; ctx: string | null | undefined; gazdeProprii: readonly string[]; curs: { curs: number | null; la: Date }; acum?: Date },
): Promise<boolean> {
  const acum = i.acum ?? new Date();
  const valid = parseazaSurse(surseDinContext(i.ctx), acum.getTime());
  const ignorate = domeniiIgnorate(process.env.NEXT_PUBLIC_SURSE_DOMENII_IGNORATE, i.gazdeProprii);
  const atribuire = atribuireDeSalvat(valid, ignorate);
  if (!atribuire) return false;

  const [d] = await dbx
    .select({ suma: fundraisingDonations.suma, sumaBani: fundraisingDonations.sumaBani, moneda: fundraisingDonations.moneda })
    .from(fundraisingDonations)
    .where(and(eq(fundraisingDonations.id, i.donationId), eq(fundraisingDonations.orgId, i.orgId)))
    .limit(1);
  if (!d) return false; // donația nu aparține organizației sau nu există: nu se leagă nimic

  const conv = convertesteInEur({ sumaBani: d.sumaBani, moneda: d.moneda, sumaLei: d.suma }, i.curs.curs);
  const r = await dbx
    .insert(donatieSurse)
    .values({
      orgId: i.orgId,
      donationId: i.donationId,
      captatLa: acum,
      persistent: atribuire.persistent,
      ...coloane("p", atribuire.prima),
      ...coloane("u", atribuire.ultima),
      sumaOriginalaBani: d.sumaBani ?? (d.moneda && d.moneda.toUpperCase() !== "RON" ? null : d.suma * 100),
      moneda: (d.moneda ?? "RON").toUpperCase(),
      sumaLei: d.suma,
      cursEurRon: conv.curs != null ? conv.curs.toFixed(6) : null,
      sumaEurCenti: conv.eurCenti,
      conversieBaza: conv.baza,
      cursLa: conv.curs != null ? i.curs.la : null,
    } as typeof donatieSurse.$inferInsert)
    .onConflictDoNothing({ target: donatieSurse.donationId })
    .returning({ id: donatieSurse.id });
  return r.length > 0;
}
