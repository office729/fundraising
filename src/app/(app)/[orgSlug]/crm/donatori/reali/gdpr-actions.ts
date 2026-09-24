"use server";

import { and, eq, sql } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin } from "@/lib/auth/guard";
import { donatorNotite, donatoriReali, formular230Submissions, fundraisingDonations } from "@/lib/db/schema";
import { decripteazaSauLegacy } from "@/lib/secret-box";

// Drepturile persoanei vizate (GDPR art. 15 și 17) pentru un donator real.
// Doar owner/admin — datele exportate includ CNP-ul din Formularul 230.
//
// Donatorul se identifică prin (organizație, email), aceeași cheie ca în
// donatori_reali; donațiile și formularele 230 se potrivesc după email, fără
// diferență de litere.

export type ExportDonator = {
  generatLa: string;
  donator: Record<string, unknown>;
  donatii: Record<string, unknown>[];
  notite: Record<string, unknown>[];
  formulare230: Record<string, unknown>[];
};

export const exportaDateDonator = withOrgAdmin(async (ctx, donatorId: string): Promise<ExportDonator | null> => {
  const [donator] = await ctx.db
    .select()
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, donatorId), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!donator) return null;

  const emailLower = donator.email.toLowerCase();
  const [donatii, notite, formulare] = await Promise.all([
    ctx.db
      .select()
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${emailLower}`)),
    ctx.db
      .select({ text: donatorNotite.text, createdAt: donatorNotite.createdAt })
      .from(donatorNotite)
      .where(and(eq(donatorNotite.donatorId, donator.id), eq(donatorNotite.orgId, ctx.orgId))),
    ctx.db
      .select()
      .from(formular230Submissions)
      .where(and(eq(formular230Submissions.orgId, ctx.orgId), sql`lower(${formular230Submissions.email}) = ${emailLower}`)),
  ]);

  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "donator_export_gdpr",
    entitate: "donator",
    entitateId: donator.id,
    detalii: { donatii: donatii.length, formulare230: formulare.length },
  });

  return {
    generatLa: new Date().toISOString(),
    donator: { ...donator },
    // Identificatorii tehnici Stripe nu sunt date ale persoanei; suma, data și mesajul sunt.
    donatii: donatii.map((d) => ({
      data: d.createdAt,
      suma: d.suma,
      status: d.status,
      recurenta: d.recurenta,
      sumaRambursata: d.sumaRambursata,
      nume: d.numeDonator,
      email: d.emailDonator,
      telefon: d.telefonDonator,
      mesaj: d.mesaj,
      anonimPeSitePublic: d.anonim,
      consimtamantGdpr: d.consimtamantGdpr,
      consimtamantTermeni: d.consimtamantTermeni,
      consimtamantWhatsapp: d.consimtamantWhatsapp,
    })),
    notite,
    // Semnătura (imagine) se marchează doar ca prezentă — nu se inlină în JSON.
    formulare230: formulare.map(({ semnatura, cnp, ...rest }) => ({
      ...rest,
      cnp: decripteazaSauLegacy(cnp),
      semnaturaPrezenta: Boolean(semnatura),
    })),
  };
});

export type StergereDonatorState = {
  ok: boolean;
  error: string | null;
  donatiiAnonimizate?: number;
  formulare230Sterse?: number;
};

// Ștergere ("dreptul de a fi uitat"), cu păstrarea a ce trebuie păstrat legal:
//  - rândul din donatori_reali (nume, email, telefon) se șterge; notele lui se
//    șterg în cascadă;
//  - donațiile NU se șterg (sume încasate, evidență contabilă, progresul
//    campaniei) — se anonimizează: fără nume/email/telefon/mesaj;
//  - Formularul 230 e un act depus la ANAF, așa că se șterge DOAR dacă adminul
//    o cere explicit.
// Datele din contul Stripe al organizației (clientul creat la abonamente) nu
// sunt ale platformei — organizația le șterge din Dashboard-ul ei Stripe.
export const stergeDateDonator = withOrgAdmin(
  async (ctx, donatorId: string, inclusiv230: boolean): Promise<StergereDonatorState> => {
    const [donator] = await ctx.db
      .select({ id: donatoriReali.id, email: donatoriReali.email })
      .from(donatoriReali)
      .where(and(eq(donatoriReali.id, donatorId), eq(donatoriReali.orgId, ctx.orgId)))
      .limit(1);
    if (!donator) return { ok: false, error: "Donatorul nu a fost găsit." };

    const emailLower = donator.email.toLowerCase();

    const anonimizate = await ctx.db
      .update(fundraisingDonations)
      .set({ numeDonator: null, emailDonator: null, telefonDonator: null, mesaj: null, anonim: true })
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${emailLower}`))
      .returning({ id: fundraisingDonations.id });

    let formulareSterse = 0;
    if (inclusiv230) {
      const sterse = await ctx.db
        .delete(formular230Submissions)
        .where(and(eq(formular230Submissions.orgId, ctx.orgId), sql`lower(${formular230Submissions.email}) = ${emailLower}`))
        .returning({ id: formular230Submissions.id });
      formulareSterse = sterse.length;
    }

    await ctx.db.delete(donatoriReali).where(and(eq(donatoriReali.id, donator.id), eq(donatoriReali.orgId, ctx.orgId)));

    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "donator_sters_gdpr",
      entitate: "donator",
      entitateId: donator.id,
      detalii: { donatiiAnonimizate: anonimizate.length, formulare230Sterse: formulareSterse, inclusiv230 },
    });

    return { ok: true, error: null, donatiiAnonimizate: anonimizate.length, formulare230Sterse: formulareSterse };
  },
);
