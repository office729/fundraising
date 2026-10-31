import { and, desc, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { listeazaDefinitii } from "@/lib/campuri-personalizate-server";
import { appUsers, atribConversii, donatiiImportate, donatorNotite, donatoriReali, fundraisingDonations, fundraisingPages } from "@/lib/db/schema";
import {
  evenimentDonatie,
  evenimentDonatieImportata,
  evenimentNota,
  evenimentParcurs,
  evenimenteDeStare,
  ordoneazaCronologie,
  type EvenimentCronologie,
} from "@/lib/cronologie-donator";

// Numele parcursurilor automate, pentru cronologie (aceleași ca pe pagina Parcursuri). Cheile necunoscute se afișează așa cum sunt.
const NUME_PARCURS: Record<string, string> = { welcome: "Welcome", save: "Save", upgrade: "Upgrade", reactivare: "Reactivare", a_doua_donatie: "A doua donație" };
const NUME_PARCURS_EN: Record<string, string> = { welcome: "Welcome", save: "Save", upgrade: "Upgrade", reactivare: "Reactivation", a_doua_donatie: "Second donation" };

// Fișa unui donator real (pagina reali/[id]). Lista, segmentele și analizele sunt în queries-pf.ts și queries-analiza.ts.
export const getDonatorRealDetaliu = withOrgSession(async (ctx, id: string) => {
  const rows = await ctx.db
    .select()
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!rows[0]) return null;
  const donator = rows[0];
  const emailMic = donator.email.toLowerCase();

  const [donatii, notite, importate, parcursuri] = await Promise.all([
    ctx.db
      .select({
        id: fundraisingDonations.id,
        suma: fundraisingDonations.suma,
        status: fundraisingDonations.status,
        recurenta: fundraisingDonations.recurenta,
        createdAt: fundraisingDonations.createdAt,
        proiect: fundraisingPages.titlu,
        // Proveniența donației (instantaneul de atribuire din clipa donației; ultima sursă nedirectă, altfel sursa sesiunii).
        provSursa: sql<string | null>`coalesce(${atribConversii.ultSursa}, ${atribConversii.sesSursa})`,
        provCanal: sql<string | null>`coalesce(${atribConversii.ultCanal}, ${atribConversii.sesCanal})`,
        provTip: sql<string | null>`coalesce(${atribConversii.ultTip}, ${atribConversii.sesTip})`,
        provCampanie: sql<string | null>`coalesce(${atribConversii.ultCampanie}, ${atribConversii.sesCampanie})`,
      })
      .from(fundraisingDonations)
      .leftJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
      .leftJoin(atribConversii, and(eq(atribConversii.entitateId, fundraisingDonations.id), eq(atribConversii.tip, "donatie"), eq(atribConversii.orgId, ctx.orgId)))
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${emailMic}`))
      .orderBy(desc(fundraisingDonations.createdAt)),
    ctx.db
      .select({
        id: donatorNotite.id,
        text: donatorNotite.text,
        tip: donatorNotite.tip,
        rezultat: donatorNotite.rezultat,
        createdAt: donatorNotite.createdAt,
        editatLa: donatorNotite.editatLa,
        autorNume: appUsers.name,
      })
      .from(donatorNotite)
      .leftJoin(appUsers, eq(appUsers.id, donatorNotite.createdBy))
      .where(and(eq(donatorNotite.donatorId, id), eq(donatorNotite.orgId, ctx.orgId)))
      .orderBy(desc(donatorNotite.createdAt)),
    ctx.db
      .select({ id: donatiiImportate.id, data: donatiiImportate.data, suma: donatiiImportate.suma, proiect: donatiiImportate.proiect, procesator: donatiiImportate.procesator })
      .from(donatiiImportate)
      .where(and(eq(donatiiImportate.orgId, ctx.orgId), sql`lower(${donatiiImportate.email}) = ${emailMic}`, eq(donatiiImportate.status, "reusita")))
      .orderBy(desc(donatiiImportate.data))
      .limit(200),
    ctx.db.execute(sql`select id, cheie, pas, stare, creat_la from parcursuri_trimiteri where org_id = ${ctx.orgId} and email = ${emailMic} order by creat_la desc limit 200`) as unknown as Promise<
      { id: string; cheie: string; pas: number; stare: string; creat_la: Date | string }[]
    >,
  ]);

  const locale = await getLocale();
  const numeParcurs = locale === "en" ? NUME_PARCURS_EN : NUME_PARCURS;
  // O singură cronologie: donații online și importate, înregistrările echipei (notițe, apeluri), e-mailurile din parcursuri și schimbările de stare.
  const evenimente: EvenimentCronologie[] = [
    ...donatii.map((d) => evenimentDonatie({ id: d.id, la: d.createdAt, suma: d.suma, status: d.status, recurenta: d.recurenta, proiect: d.proiect }, locale)),
    ...importate.map((d) => evenimentDonatieImportata({ id: d.id, la: d.data, suma: d.suma, proiect: d.proiect, procesator: d.procesator }, locale)),
    ...notite.map((n) => evenimentNota({ id: n.id, la: n.createdAt, tip: n.tip, text: n.text, rezultat: n.rezultat, autor: n.autorNume }, locale)),
    ...parcursuri.map((p) => evenimentParcurs({ id: p.id, la: p.creat_la, numeParcurs: numeParcurs[p.cheie] ?? p.cheie, pas: p.pas, stare: p.stare }, locale)),
    ...evenimenteDeStare({
      acordLa: donator.consimtamantEmailLa,
      acordSursa: donator.consimtamantEmailSursa,
      dezabonatLa: donator.dezabonatEmailLa,
      adresaLa: donator.emailStareLa,
      adresaStare: donator.emailStare,
      adresaMotiv: donator.emailStareMotiv,
      sunatLa: donator.sunatLa,
      multumitLa: donator.multumitLa,
    }, locale),
  ];
  const cronologie = ordoneazaCronologie(evenimente);

  // Câmpurile personalizate active ale organizației (se afișează doar dacă pachetul are modulul; vezi pagina).
  const campuriDefs = await listeazaDefinitii(ctx.db, ctx.orgId, "donator", true).catch(() => []);

  return { donator, donatii, notite, cronologie, campuriDefs, poateAdministra: ctx.role === "owner" || ctx.role === "admin" };
});
