"use server";

import { and, eq, inArray, or, sql } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin } from "@/lib/auth/guard";
import {
  contacts,
  crmKv,
  donatoriReali,
  formular230Destinatari,
  formular230Submissions,
  fundraisingBeneficiaryInvites,
  fundraisingDonations,
  invites,
  fundraisingMediaContacts,
  fundraisingMessages,
  fundraisingPages,
  volunteerVisitors,
} from "@/lib/db/schema";
import { normalizeazaTelefon } from "@/lib/voluntari-panou";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

// Cereri ale persoanelor vizate (GDPR art. 15 și 17) pentru PERSOANE CARE NU SUNT DONATORI:
// persoane de contact la companii, voluntari, creatori de pagini de campanie, expeditori de
// mesaje și contacte media. (Donatorii au panoul lor, pe profilul donatorului — vezi
// crm/donatori/reali/gdpr-actions.ts; aici apar doar ca informație, cu trimitere spre acel panou.)
// Doar owner/admin. Căutare după email, fără diferență de litere, în organizația curentă.

export type RezultatCautare = {
  email: string;
  contacte: number;
  voluntari: number;
  paginiCreate: number;
  mesaje: number;
  contacteMedia: number;
  // Informativ — se gestionează din panoul GDPR al donatorului.
  donatorId: string | null;
  donatii: number;
  formulare230: number;
};

const ROSTER_PATH = "voluntari-roster";
type Voluntar = { id?: string; nume?: string; email?: string; [k: string]: unknown };

function emailValid(brut: string): string {
  const email = normalizeazaEmail(brut);
  if (!email || !EMAIL_RE.test(email)) throw new EroareUtilizator("Adresa de email nu e validă.");
  return email;
}

async function citesteVoluntari(ctx: { db: typeof import("@/lib/db").db; orgId: string }): Promise<{ toti: Voluntar[]; gasiti: (email: string) => Voluntar[] }> {
  const [rand] = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, ROSTER_PATH)))
    .limit(1);
  const toti = ((rand?.data as { volunteers?: Voluntar[] } | null)?.volunteers ?? []) as Voluntar[];
  return { toti, gasiti: (email) => toti.filter((v) => (v.email ?? "").trim().toLowerCase() === email) };
}

const cauta = withOrgAdmin(async (ctx, emailBrut: string): Promise<RezultatCautare> => {
  const email = emailValid(emailBrut);
  const numara = async (q: Promise<unknown[]>) => (await q).length;

  const [contacte, paginiCreate, mesaje, contacteMedia, donator, donatii, formulare, voluntari] = await Promise.all([
    numara(ctx.db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.orgId, ctx.orgId), sql`lower(${contacts.email}) = ${email}`))),
    numara(ctx.db.select({ id: fundraisingPages.id }).from(fundraisingPages).where(and(eq(fundraisingPages.orgId, ctx.orgId), sql`lower(${fundraisingPages.emailCreator}) = ${email}`))),
    numara(ctx.db.select({ id: fundraisingMessages.id }).from(fundraisingMessages).where(and(eq(fundraisingMessages.orgId, ctx.orgId), sql`lower(${fundraisingMessages.senderEmail}) = ${email}`))),
    numara(ctx.db.select({ id: fundraisingMediaContacts.id }).from(fundraisingMediaContacts).where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), sql`lower(${fundraisingMediaContacts.email}) = ${email}`))),
    ctx.db.select({ id: donatoriReali.id }).from(donatoriReali).where(and(eq(donatoriReali.orgId, ctx.orgId), sql`lower(${donatoriReali.email}) = ${email}`)).limit(1),
    numara(ctx.db.select({ id: fundraisingDonations.id }).from(fundraisingDonations).where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${email}`))),
    numara(ctx.db.select({ id: formular230Submissions.id }).from(formular230Submissions).where(and(eq(formular230Submissions.orgId, ctx.orgId), sql`lower(${formular230Submissions.email}) = ${email}`))),
    citesteVoluntari(ctx),
  ]);

  return {
    email,
    contacte,
    voluntari: voluntari.gasiti(email).length,
    paginiCreate,
    mesaje,
    contacteMedia,
    donatorId: donator[0]?.id ?? null,
    donatii,
    formulare230: formulare,
  };
});

export async function cautaPersoanaAction(orgSlug: string, email: string): Promise<{ error: string | null; rezultat: RezultatCautare | null }> {
  try {
    return { error: null, rezultat: await cauta(orgSlug, email) };
  } catch (e) {
    return { error: mesajSigur(e, "Căutarea a eșuat.", "gdpr-cautare"), rezultat: null };
  }
}

// Export (art. 15): tot ce găsim pentru acea adresă, din sursele acoperite aici + donațiile.
const exporta = withOrgAdmin(async (ctx, emailBrut: string) => {
  const email = emailValid(emailBrut);
  const [contacte, pagini, mesaje, media, donatii, formulare, voluntari] = await Promise.all([
    ctx.db.select().from(contacts).where(and(eq(contacts.orgId, ctx.orgId), sql`lower(${contacts.email}) = ${email}`)),
    ctx.db
      .select({ titlu: fundraisingPages.titlu, slug: fundraisingPages.slug, numeCreator: fundraisingPages.numeCreator, emailCreator: fundraisingPages.emailCreator, creatLa: fundraisingPages.createdAt })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, ctx.orgId), sql`lower(${fundraisingPages.emailCreator}) = ${email}`)),
    ctx.db
      .select({ nume: fundraisingMessages.senderNume, email: fundraisingMessages.senderEmail, continut: fundraisingMessages.continut, trimisLa: fundraisingMessages.createdAt })
      .from(fundraisingMessages)
      .where(and(eq(fundraisingMessages.orgId, ctx.orgId), sql`lower(${fundraisingMessages.senderEmail}) = ${email}`)),
    ctx.db.select().from(fundraisingMediaContacts).where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), sql`lower(${fundraisingMediaContacts.email}) = ${email}`)),
    ctx.db
      .select({ data: fundraisingDonations.createdAt, suma: fundraisingDonations.suma, status: fundraisingDonations.status, nume: fundraisingDonations.numeDonator, email: fundraisingDonations.emailDonator, telefon: fundraisingDonations.telefonDonator, mesaj: fundraisingDonations.mesaj })
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${email}`)),
    // Formularul 230 conține CNP/semnătură — se exportă doar prezența și data; datele complete le exportă panoul donatorului.
    ctx.db
      .select({ creatLa: formular230Submissions.createdAt })
      .from(formular230Submissions)
      .where(and(eq(formular230Submissions.orgId, ctx.orgId), sql`lower(${formular230Submissions.email}) = ${email}`)),
    citesteVoluntari(ctx),
  ]);

  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "persoana_export_gdpr", entitate: "persoana", detalii: { contacte: contacte.length } });

  return {
    generatLa: new Date().toISOString(),
    email,
    contactePersoaneJuridice: contacte,
    voluntari: voluntari.gasiti(email),
    paginiDeCampanieCreate: pagini,
    mesajeTrimise: mesaje,
    contacteMedia: media,
    donatii,
    formulare230: { numar: formulare.length, note: "Conținutul (CNP, semnătură) se exportă din panoul GDPR al donatorului." },
  };
});

export async function exportaPersoanaAction(orgSlug: string, email: string) {
  try {
    return { error: null as string | null, date: await exporta(orgSlug, email) };
  } catch (e) {
    return { error: mesajSigur(e, "Exportul a eșuat.", "gdpr-export"), date: null };
  }
}

// Ștergere/anonimizare (art. 17) pentru sursele acoperite aici. Donațiile, Formularul 230 și
// profilul de donator NU se ating — au evidență contabilă/legală și panoul lor dedicat.
const sterge = withOrgAdmin(async (ctx, emailBrut: string) => {
  const email = emailValid(emailBrut);

  const contacteSterse = await ctx.db
    .delete(contacts)
    .where(and(eq(contacts.orgId, ctx.orgId), sql`lower(${contacts.email}) = ${email}`))
    .returning({ id: contacts.id });

  const media = await ctx.db
    .update(fundraisingMediaContacts)
    .set({ email: null, telefon: null, persoanaContact: null })
    .where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), sql`lower(${fundraisingMediaContacts.email}) = ${email}`))
    .returning({ id: fundraisingMediaContacts.id });

  // Câmpurile sunt NOT NULL — se înlocuiesc cu valori neutre, nu cu NULL.
  const pagini = await ctx.db
    .update(fundraisingPages)
    .set({ numeCreator: "[șters]", emailCreator: "sters@anonim.invalid" })
    .where(and(eq(fundraisingPages.orgId, ctx.orgId), sql`lower(${fundraisingPages.emailCreator}) = ${email}`))
    .returning({ id: fundraisingPages.id });

  const mesaje = await ctx.db
    .update(fundraisingMessages)
    .set({ senderNume: null, senderEmail: "sters@anonim.invalid" })
    .where(and(eq(fundraisingMessages.orgId, ctx.orgId), sql`lower(${fundraisingMessages.senderEmail}) = ${email}`))
    .returning({ id: fundraisingMessages.id });

  // Urme ale adresei în alte tabele ale organizației: jurnalul campaniilor F230 (adresa în clar), invitațiile încă
  // neacceptate (de echipă și de beneficiar) și încercările de donație neterminate (în așteptare / eșuate — fără valoare
  // contabilă; donațiile încasate rămân, ca evidență, și se gestionează din panoul donatorului).
  const destinatari = await ctx.db
    .delete(formular230Destinatari)
    .where(and(eq(formular230Destinatari.orgId, ctx.orgId), sql`lower(${formular230Destinatari.email}) = ${email}`))
    .returning({ id: formular230Destinatari.id });
  const invitatiiEchipa = await ctx.db
    .delete(invites)
    .where(and(eq(invites.orgId, ctx.orgId), sql`lower(${invites.email}) = ${email}`, sql`${invites.acceptedAt} is null`))
    .returning({ id: invites.id });
  const invitatiiBeneficiar = await ctx.db
    .delete(fundraisingBeneficiaryInvites)
    .where(and(eq(fundraisingBeneficiaryInvites.orgId, ctx.orgId), sql`lower(${fundraisingBeneficiaryInvites.email}) = ${email}`, sql`${fundraisingBeneficiaryInvites.acceptedAt} is null`))
    .returning({ id: fundraisingBeneficiaryInvites.id });
  const donatiiNeterminate = await ctx.db
    .update(fundraisingDonations)
    .set({ numeDonator: null, emailDonator: null, telefonDonator: null, mesaj: null, anonim: true })
    .where(
      and(
        eq(fundraisingDonations.orgId, ctx.orgId),
        sql`lower(${fundraisingDonations.emailDonator}) = ${email}`,
        sql`${fundraisingDonations.status} in ('in_asteptare', 'esuata')`,
      ),
    )
    .returning({ id: fundraisingDonations.id });

  // Voluntarii trăiesc într-un blob JSON (crm_kv) — se scot din listă. Aceeași blocare ca la salvarea din CRM Voluntari
  // (îmbinare pe modificări), ca ștergerea să nu fie anulată de o salvare simultană. Se păstrează setările din același document.
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:${ROSTER_PATH}`}, 0))`);
  const { toti } = await citesteVoluntari(ctx);
  const stersi = toti.filter((v) => (v.email ?? "").trim().toLowerCase() === email);
  const ramasi = toti.filter((v) => (v.email ?? "").trim().toLowerCase() !== email);
  const voluntariStersi = stersi.length;
  let panouVoluntariSterse = 0;
  if (voluntariStersi > 0) {
    await ctx.db
      .update(crmKv)
      .set({ data: sql`jsonb_set(${crmKv.data}, '{volunteers}', ${JSON.stringify(ramasi)}::text::jsonb)`, updatedAt: new Date() })
      .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, ROSTER_PATH)));
    // Panoul public al voluntarilor: se șterg și cei legați de fișa ștearsă sau care au același telefon (distribuirile și misiunile pleacă în cascadă).
    const ids = stersi.map((v) => (v as { id?: unknown }).id).filter((x): x is string => typeof x === "string");
    const telefoane = stersi.map((v) => normalizeazaTelefon((v as { telefon?: string }).telefon)).filter((x): x is string => !!x);
    const conditii = [ids.length ? inArray(volunteerVisitors.voluntarId, ids) : undefined, telefoane.length ? inArray(volunteerVisitors.telefon, telefoane) : undefined].filter((c) => c !== undefined);
    if (conditii.length > 0) {
      const sterse = await ctx.db.delete(volunteerVisitors).where(and(eq(volunteerVisitors.orgId, ctx.orgId), or(...conditii))).returning({ id: volunteerVisitors.id });
      panouVoluntariSterse = sterse.length;
    }
  }

  const rezumat = {
    contacteSterse: contacteSterse.length,
    contacteMediaAnonimizate: media.length,
    paginiAnonimizate: pagini.length,
    mesajeAnonimizate: mesaje.length,
    voluntariStersi,
    panouVoluntariSterse,
    jurnalCampaniiSters: destinatari.length,
    invitatiiSterse: invitatiiEchipa.length + invitatiiBeneficiar.length,
    donatiiNeterminateAnonimizate: donatiiNeterminate.length,
  };
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "persoana_sters_gdpr", entitate: "persoana", detalii: rezumat });
  return rezumat;
});

export async function stergePersoanaAction(orgSlug: string, email: string) {
  try {
    return { error: null as string | null, rezumat: await sterge(orgSlug, email) };
  } catch (e) {
    return { error: mesajSigur(e, "Ștergerea a eșuat.", "gdpr-stergere"), rezumat: null };
  }
}
