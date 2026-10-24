"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { donatoriReali } from "@/lib/db/schema";
import { gasesteDubluri } from "@/lib/curatare-contacte";
import { executaImbinare, type RezultatImbinare } from "@/lib/donatori-imbinare";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";

// Donatori care par aceeași persoană (e-mail echivalent, același telefon, același nume și aceeași localitate). Nimic nu se unește singur: lista e o propunere,
// iar îmbinarea cere confirmare și e rezervată administratorilor.
const MAX_DONATORI_ANALIZATI = 60_000;
const MAX_GRUPURI = 60;

export type MembruDublu = {
  id: string;
  nume: string;
  email: string;
  telefon: string | null;
  localitate: string | null;
  totalDonat: number;
  numarDonatii: number;
  ultimaDonatieLa: string;
  dezabonat: boolean;
  abonamentActiv: boolean; // are o donație recurentă activă pe această adresă: îmbinarea ar fi anulată de următoarea plată
};
export type GrupDublu = { membri: MembruDublu[]; motive: string[]; incredere: "mare" | "medie"; sugerat: string };
export type DateDubluri = { grupuri: GrupDublu[]; total: number; poateImbina: boolean };

export const listeazaDubluri = withOrgSession(async (ctx): Promise<DateDubluri> => {
  const [donatori, abonamente] = await Promise.all([
    ctx.db
      .select({
        id: donatoriReali.id, nume: donatoriReali.nume, email: donatoriReali.email, telefon: donatoriReali.telefon, localitate: donatoriReali.localitate,
        totalDonat: donatoriReali.totalDonat, numarDonatii: donatoriReali.numarDonatii, ultimaDonatieLa: donatoriReali.ultimaDonatieLa, dezabonatEmailLa: donatoriReali.dezabonatEmailLa,
      })
      .from(donatoriReali)
      .where(eq(donatoriReali.orgId, ctx.orgId))
      .limit(MAX_DONATORI_ANALIZATI),
    ctx.db.execute(sql`select distinct lower(email_donator) as email from fundraising_donations where org_id = ${ctx.orgId} and recurenta and abonament_activ and email_donator is not null`),
  ]);
  const cuAbonament = new Set((abonamente as unknown as { email: string }[]).map((a) => a.email));
  const dupaId = new Map(donatori.map((d) => [d.id, d]));
  const grupuri = gasesteDubluri(donatori.map((d) => ({ id: d.id, nume: d.nume, email: d.email, telefon: d.telefon, localitate: d.localitate })));
  const rezultat: GrupDublu[] = grupuri.slice(0, MAX_GRUPURI).map((g) => {
    const membri = g.ids
      .map((id) => dupaId.get(id)!)
      .filter(Boolean)
      .map((d) => ({
        id: d.id, nume: d.nume, email: d.email, telefon: d.telefon, localitate: d.localitate, totalDonat: d.totalDonat, numarDonatii: d.numarDonatii,
        ultimaDonatieLa: d.ultimaDonatieLa.toISOString(), dezabonat: d.dezabonatEmailLa !== null, abonamentActiv: cuAbonament.has(d.email.toLowerCase()),
      }))
      .sort((a, b) => b.numarDonatii - a.numarDonatii || b.totalDonat - a.totalDonat);
    return { membri, motive: g.motive, incredere: g.incredere, sugerat: membri[0]?.id ?? "" };
  });
  return { grupuri: rezultat, total: grupuri.length, poateImbina: ctx.role === "owner" || ctx.role === "admin" };
});

export type { RezultatImbinare } from "@/lib/donatori-imbinare";

// Îmbină donatorii secundari în cel principal (logica e în lib/donatori-imbinare.ts); doar administratorii, după confirmarea din interfață.
export const imbinaDonatori = withOrgAdmin(async (ctx, primarId: string, secundariIds: string[]): Promise<RezultatImbinare> => {
  const r = await executaImbinare(ctx, primarId, secundariIds);
  if (r.ok) revalidatePath(`/${ctx.orgSlug}/crm/donatori`);
  return r;
});

export async function imbinaDonatoriAction(orgSlug: string, primarId: string, secundariIds: string[]): Promise<RezultatImbinare> {
  try {
    return await imbinaDonatori(orgSlug, primarId, secundariIds);
  } catch (e) {
    return { ok: false, eroare: e instanceof EroareUtilizator ? e.message : mesajSigur(e, "Nu am putut îmbina donatorii. Nu s-a schimbat nimic; încearcă din nou.", "imbinare-donatori") };
  }
}
