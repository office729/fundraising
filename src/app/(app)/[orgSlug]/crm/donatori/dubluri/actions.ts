"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { donatoriReali, dubluriRespinse } from "@/lib/db/schema";
import { gasesteDubluri } from "@/lib/curatare-contacte";
import { executaImbinare, type RezultatImbinare } from "@/lib/donatori-imbinare";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { DONATORI_UI3_DICT } from "@/lib/i18n/dictionaries/donatori-ui-3";
import { getLocale } from "@/lib/i18n/get-locale";

// Donatori care par aceeași persoană (e-mail echivalent, același telefon, același nume și aceeași localitate). Nimic nu se unește singur: lista e o propunere,
// iar îmbinarea cere confirmare și e rezervată administratorilor.
const MAX_DONATORI_ANALIZATI = 60_000;
const MAX_GRUPURI = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const semnaturaGrup = (ids: readonly string[]) => [...ids].sort().join(",");

export type MembruDublu = {
  id: string;
  nume: string;
  email: string;
  telefon: string | null;
  localitate: string | null;
  totalDonat: number;
  numarDonatii: number;
  ultimaDonatieLa: string;
  primaDonatieLa: string;
  dezabonat: boolean;
  abonamentActiv: boolean; // are o donație recurentă activă pe această adresă: îmbinarea ar fi anulată de următoarea plată
};
export type GrupDublu = { membri: MembruDublu[]; motive: string[]; incredere: "mare" | "medie"; sugerat: string };
export type DateDubluri = { grupuri: GrupDublu[]; total: number; poateImbina: boolean; ignorate: number };

export const listeazaDubluri = withOrgSession(async (ctx): Promise<DateDubluri> => {
  const [donatori, abonamente, respinse] = await Promise.all([
    ctx.db
      .select({
        id: donatoriReali.id, nume: donatoriReali.nume, email: donatoriReali.email, telefon: donatoriReali.telefon, localitate: donatoriReali.localitate,
        totalDonat: donatoriReali.totalDonat, numarDonatii: donatoriReali.numarDonatii, ultimaDonatieLa: donatoriReali.ultimaDonatieLa, primaDonatieLa: donatoriReali.primaDonatieLa, dezabonatEmailLa: donatoriReali.dezabonatEmailLa,
      })
      .from(donatoriReali)
      .where(eq(donatoriReali.orgId, ctx.orgId))
      .limit(MAX_DONATORI_ANALIZATI),
    ctx.db.execute(sql`select distinct lower(email_donator) as email from fundraising_donations where org_id = ${ctx.orgId} and recurenta and abonament_activ and email_donator is not null`),
    ctx.db.select({ semnatura: dubluriRespinse.semnatura }).from(dubluriRespinse).where(eq(dubluriRespinse.orgId, ctx.orgId)),
  ]);
  const semnaturiRespinse = new Set(respinse.map((r) => r.semnatura));
  const cuAbonament = new Set((abonamente as unknown as { email: string }[]).map((a) => a.email));
  const dupaId = new Map(donatori.map((d) => [d.id, d]));
  const toateGrupurile = gasesteDubluri(donatori.map((d) => ({ id: d.id, nume: d.nume, email: d.email, telefon: d.telefon, localitate: d.localitate })));
  // Grupurile marcate „Sunt persoane diferite” nu se mai propun, atâta timp cât în grup nu apare un donator nou (semnătura = ID-urile membrilor, sortate).
  const grupuri = toateGrupurile.filter((g) => !semnaturiRespinse.has(semnaturaGrup(g.ids)));
  const rezultat: GrupDublu[] = grupuri.slice(0, MAX_GRUPURI).map((g) => {
    const membri = g.ids
      .map((id) => dupaId.get(id)!)
      .filter(Boolean)
      .map((d) => ({
        id: d.id, nume: d.nume, email: d.email, telefon: d.telefon, localitate: d.localitate, totalDonat: d.totalDonat, numarDonatii: d.numarDonatii,
        ultimaDonatieLa: d.ultimaDonatieLa.toISOString(), primaDonatieLa: d.primaDonatieLa.toISOString(), dezabonat: d.dezabonatEmailLa !== null, abonamentActiv: cuAbonament.has(d.email.toLowerCase()),
      }))
      .sort((a, b) => b.numarDonatii - a.numarDonatii || b.totalDonat - a.totalDonat);
    return { membri, motive: g.motive, incredere: g.incredere, sugerat: membri[0]?.id ?? "" };
  });
  return { grupuri: rezultat, total: grupuri.length, poateImbina: ctx.role === "owner" || ctx.role === "admin", ignorate: toateGrupurile.length - grupuri.length };
});

export type { RezultatImbinare } from "@/lib/donatori-imbinare";

// Îmbină donatorii secundari în cel principal (logica e în lib/donatori-imbinare.ts); doar administratorii, după confirmarea din interfață.
export const imbinaDonatori = withOrgAdmin(async (ctx, primarId: string, secundariIds: string[]): Promise<RezultatImbinare> => {
  const r = await executaImbinare(ctx, primarId, secundariIds, await getLocale());
  if (r.ok) revalidatePath(`/${ctx.orgSlug}/crm/donatori`);
  return r;
});

export async function imbinaDonatoriAction(orgSlug: string, primarId: string, secundariIds: string[]): Promise<RezultatImbinare> {
  try {
    return await imbinaDonatori(orgSlug, primarId, secundariIds);
  } catch (e) {
    return { ok: false, eroare: e instanceof EroareUtilizator ? e.message : mesajSigur(e, DONATORI_UI3_DICT[await getLocale()].dubluri.erori.nuAmImbinat, "imbinare-donatori") };
  }
}

export type RezultatRespingere = { ok: true } | { ok: false; eroare: string };

// „Sunt persoane diferite”: grupul nu se mai propune (până apare în el un donator nou). Nu șterge și nu schimbă nimic la donatori. Doar administratorii.
export const respingeGrupDublu = withOrgAdmin(async (ctx, ids: string[]): Promise<RezultatRespingere> => {
  const er = DONATORI_UI3_DICT[await getLocale()].dubluri.erori;
  const curate = [...new Set((Array.isArray(ids) ? ids : []).filter((x) => typeof x === "string" && UUID.test(x)))];
  if (curate.length < 2 || curate.length > 50) return { ok: false, eroare: er.grupInvalid };
  const existente = await ctx.db.select({ id: donatoriReali.id }).from(donatoriReali).where(and(eq(donatoriReali.orgId, ctx.orgId), inArray(donatoriReali.id, curate)));
  if (existente.length !== curate.length) return { ok: false, eroare: er.donatorInexistent };
  await ctx.db.insert(dubluriRespinse).values({ orgId: ctx.orgId, semnatura: semnaturaGrup(curate), respinsDe: ctx.userId }).onConflictDoNothing();
  revalidatePath(`/${ctx.orgSlug}/crm/donatori/dubluri`);
  return { ok: true };
});

export async function respingeGrupDubluAction(orgSlug: string, ids: string[]): Promise<RezultatRespingere> {
  try {
    return await respingeGrupDublu(orgSlug, ids);
  } catch (e) {
    return { ok: false, eroare: e instanceof EroareUtilizator ? e.message : mesajSigur(e, DONATORI_UI3_DICT[await getLocale()].dubluri.erori.nuAmSalvat, "dubluri-respinse") };
  }
}

// Afișează din nou toate grupurile ignorate până acum.
export const restaureazaDubluriRespinse = withOrgAdmin(async (ctx): Promise<RezultatRespingere> => {
  await ctx.db.delete(dubluriRespinse).where(eq(dubluriRespinse.orgId, ctx.orgId));
  revalidatePath(`/${ctx.orgSlug}/crm/donatori/dubluri`);
  return { ok: true };
});

export async function restaureazaDubluriRespinseAction(orgSlug: string): Promise<RezultatRespingere> {
  try {
    return await restaureazaDubluriRespinse(orgSlug);
  } catch (e) {
    return { ok: false, eroare: e instanceof EroareUtilizator ? e.message : mesajSigur(e, DONATORI_UI3_DICT[await getLocale()].dubluri.erori.nuAmSalvat, "dubluri-respinse") };
  }
}
