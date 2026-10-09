import { and, eq, gte, lte, ne } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { obiective } from "@/lib/db/schema";
import { incarcaStructura } from "@/lib/performanta-date";
import { salveazaObiectiv } from "@/lib/performanta-obiective";
import { NOTA_EXEMPLU, SABLON_PE_ID } from "@/lib/performanta-sabloane";
import type { ObiectivInput } from "@/lib/performanta-validare";

// Aplică un șablon de rol pe o persoană: creează obiectivele ei individuale, cu rezultatele-cheie din șablon. Țintele sunt exemple și sunt marcate ca atare.
// Se aplică aceleași drepturi ca la crearea manuală a unui obiectiv (persoana însăși, managerul ei sau un administrator). Ce există deja nu se dublează.

type Rez<T extends object = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function aplicaSablon(ctx: OrgContext, p: { sablonId: string; angajatId: string; perioadaStart: string; perioadaEnd: string }): Promise<Rez<{ create: string[]; sarite: string[] }>> {
  const sablon = SABLON_PE_ID.get(p.sablonId);
  if (!sablon) return { ok: false, eroare: "Șablonul nu există." };
  if (!DATA.test(p.perioadaStart) || !DATA.test(p.perioadaEnd) || p.perioadaEnd < p.perioadaStart) return { ok: false, eroare: "Alege o perioadă validă." };
  const struct = await incarcaStructura(ctx);
  const ang = struct.angajati.find((a) => a.id === p.angajatId);
  if (!ang || !ang.activ) return { ok: false, eroare: "Persoana nu există sau nu e activă." };

  const existente = await ctx.db
    .select({ titlu: obiective.titlu })
    .from(obiective)
    .where(and(eq(obiective.orgId, ctx.orgId), eq(obiective.responsabilId, ang.id), ne(obiective.status, "anulat"), lte(obiective.perioadaStart, p.perioadaEnd), gte(obiective.perioadaEnd, p.perioadaStart)));
  const create: string[] = [];
  const sarite: string[] = [];
  for (const o of sablon.obiective) {
    if (existente.some((e) => e.titlu === o.titlu)) {
      sarite.push(o.titlu);
      continue;
    }
    const input: ObiectivInput = {
      nivel: "individual",
      titlu: o.titlu,
      descriere: `${NOTA_EXEMPLU} ${o.descriere}`,
      responsabilId: ang.id,
      departmentId: ang.departmentId,
      parentId: null,
      perioadaStart: p.perioadaStart,
      perioadaEnd: p.perioadaEnd,
      vizibilitate: "organizatie",
      colaboratori: [],
      legaturi: [],
      rezultate: o.rezultate.map((r) => ({
        titlu: r.titlu,
        descriere: r.metoda === "binar" ? null : NOTA_EXEMPLU,
        metoda: r.metoda,
        tipTinta: r.tipTinta,
        unitate: r.unitate ?? null,
        nivelInitial: r.metoda === "binar" || r.metoda === "interval" ? null : (r.nivelInitial ?? 0),
        tinta: r.tinta,
        tintaMax: r.tintaMax ?? null,
        pondere: r.pondere,
        sursa: r.sursa,
        metrica: r.sursa === "crm" ? (r.metrica ?? null) : null,
        frecventaActualizare: r.frecventa,
        formula: r.formula,
        reguli: r.reguli ?? null,
        atribuire: r.atribuire,
      })),
    };
    const rez = await salveazaObiectiv(ctx, input);
    if (!rez.ok) return { ok: false, eroare: `„${o.titlu}”: ${rez.eroare}` };
    create.push(o.titlu);
  }
  return { ok: true, create, sarite };
}
