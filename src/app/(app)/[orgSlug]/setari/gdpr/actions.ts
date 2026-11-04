"use server";

import { and, eq, inArray, or, sql } from "drizzle-orm";

import { adaugaSuprimare } from "@/lib/agent-email/store";
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
import { cautaModuleNoi, exportaModuleNoi, stergeModuleNoi } from "@/lib/gdpr-module-noi";
import { curataHandle } from "@/lib/gdpr-module-noi-reguli";
import { normalizeazaTelefon } from "@/lib/voluntari-panou";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";
import { getTr } from "@/lib/i18n/tr-server";

// Cereri ale persoanelor vizate (GDPR art. 15 și 17) pentru PERSOANE CARE NU SUNT DONATORI:
// persoane de contact la companii, voluntari, creatori de pagini de campanie, expeditori de
// mesaje și contacte media, plus modulele noi: emailurile Agentului email (și răspunsurile primite),
// candidații din Prospectare, fișele din Influenceri și lista de suprimare. (Donatorii au panoul lor,
// pe profilul donatorului — vezi crm/donatori/reali/gdpr-actions.ts; aici apar doar ca informație,
// cu trimitere spre acel panou.)
// Doar owner/admin. Căutare după email, fără diferență de litere, și/sau după un handle / link de profil
// (Influenceri; link LinkedIn pentru Prospectare), în organizația curentă.

export type RezultatCautare = {
  email: string | null;
  handle: string | null;
  contacte: number;
  voluntari: number;
  paginiCreate: number;
  mesaje: number;
  contacteMedia: number;
  // Modulele noi.
  emailuriAgent: number;
  raspunsuriAgent: number;
  candidatiProspectare: number;
  influenceri: number;
  peListaSuprimare: boolean;
  // Informativ — se gestionează din panoul GDPR al donatorului.
  donatorId: string | null;
  donatii: number;
  formulare230: number;
};

const ROSTER_PATH = "voluntari-roster";
type Voluntar = { id?: string; nume?: string; email?: string; [k: string]: unknown };

async function emailValid(brut: string): Promise<string> {
  const email = normalizeazaEmail(brut);
  if (!email || !EMAIL_RE.test(email)) throw new EroareUtilizator((await getTr())("Adresa de email nu e validă.", "The email address is not valid."));
  return email;
}

// Persoana se caută după email, după handle / link de profil sau după ambele; cel puțin unul e obligatoriu.
async function identitate(emailBrut: string, handleBrut: string | undefined): Promise<{ email: string | null; handle: string | null }> {
  const handle = curataHandle(handleBrut);
  const brut = typeof emailBrut === "string" ? emailBrut.trim() : "";
  if (!brut && !handle) throw new EroareUtilizator((await getTr())("Introdu o adresă de email sau un profil.", "Enter an email address or a profile."));
  return { email: brut ? await emailValid(brut) : null, handle };
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

const cauta = withOrgAdmin(async (ctx, emailBrut: string, handleBrut?: string): Promise<RezultatCautare> => {
  const { email, handle } = await identitate(emailBrut, handleBrut);
  const numara = async (q: Promise<unknown[]>) => (await q).length;

  const noi = await cautaModuleNoi(ctx.db, ctx.orgId, { email, handle });
  // Sursele vechi se caută doar după email; fără email (doar handle) rămân la zero.
  if (!email) {
    return { email, handle, contacte: 0, voluntari: 0, paginiCreate: 0, mesaje: 0, contacteMedia: 0, ...noi, donatorId: null, donatii: 0, formulare230: 0 };
  }

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
    handle,
    contacte,
    voluntari: voluntari.gasiti(email).length,
    paginiCreate,
    mesaje,
    contacteMedia,
    ...noi,
    donatorId: donator[0]?.id ?? null,
    donatii,
    formulare230: formulare,
  };
});

export async function cautaPersoanaAction(orgSlug: string, email: string, handle?: string): Promise<{ error: string | null; rezultat: RezultatCautare | null }> {
  try {
    return { error: null, rezultat: await cauta(orgSlug, email, handle) };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Căutarea a eșuat.", "The search failed."), "gdpr-cautare"), rezultat: null };
  }
}

// Export (art. 15): tot ce găsim pentru acea adresă, din sursele acoperite aici + donațiile.
const exporta = withOrgAdmin(async (ctx, emailBrut: string, handleBrut?: string) => {
  const { email, handle } = await identitate(emailBrut, handleBrut);
  const noi = await exportaModuleNoi(ctx.db, ctx.orgId, { email, handle });

  const [contacte, pagini, mesaje, media, donatii, formulare, voluntari] = email
    ? await Promise.all([
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
      ])
    : [[], [], [], [], [], [], null];

  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "persoana_export_gdpr",
    entitate: "persoana",
    detalii: { contacte: contacte.length, emailuriAgent: noi.emailuriAgent.length, candidatiProspectare: noi.candidatiProspectare.length, influenceri: noi.influenceri.length },
  });

  return {
    generatLa: new Date().toISOString(),
    email,
    handle,
    contactePersoaneJuridice: contacte,
    voluntari: voluntari && email ? voluntari.gasiti(email) : [],
    paginiDeCampanieCreate: pagini,
    mesajeTrimise: mesaje,
    contacteMedia: media,
    donatii,
    formulare230: { numar: formulare.length, note: "Conținutul (CNP, semnătură) se exportă din panoul GDPR al donatorului." },
    emailuriAgentEmail: noi.emailuriAgent,
    raspunsuriLaAlteEmailuri: noi.raspunsuriLaAlteEmailuri,
    candidatiProspectare: noi.candidatiProspectare,
    influenceri: noi.influenceri,
    listaSuprimare: noi.listaSuprimare,
  };
});

export async function exportaPersoanaAction(orgSlug: string, email: string, handle?: string) {
  try {
    return { error: null as string | null, date: await exporta(orgSlug, email, handle) };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Exportul a eșuat.", "The export failed."), "gdpr-export"), date: null };
  }
}

// Ștergere/anonimizare (art. 17) pentru sursele acoperite aici. Donațiile, Formularul 230 și
// profilul de donator NU se ating — au evidență contabilă/legală și panoul lor dedicat.
const sterge = withOrgAdmin(async (ctx, emailBrut: string, handleBrut?: string) => {
  const { email, handle } = await identitate(emailBrut, handleBrut);

  // Modulele noi ÎNAINTE de contacte: emailurile Agentului și candidații din Prospectare se găsesc și după legătura cu contactul (contact_id), care dispare la ștergerea lui.
  const noi = await stergeModuleNoi(ctx.db, ctx.orgId, { email, handle });

  if (!email) {
    const rezumatNoi = { ...noi, adaugataLaSuprimare: noi.adaugatiLaSuprimare > 0 };
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "persoana_sters_gdpr", entitate: "persoana", detalii: rezumatNoi });
    return {
      contacteSterse: 0,
      contacteMediaAnonimizate: 0,
      paginiAnonimizate: 0,
      mesajeAnonimizate: 0,
      voluntariStersi: 0,
      panouVoluntariSterse: 0,
      jurnalCampaniiSters: 0,
      invitatiiSterse: 0,
      donatiiNeterminateAnonimizate: 0,
      ...rezumatNoi,
    };
  }

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

  const rezumatVechi = {
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

  // Persoana ștearsă nu mai trebuie contactată de Agentul email (se păstrează doar amprenta adresei). Modulele noi o adaugă deja când au găsit ceva la ele;
  // aici acoperim și cazul în care doar sursele vechi (contacte, voluntari etc.) au avut date.
  const ceva = contacteSterse.length + media.length + pagini.length + mesaje.length + voluntariStersi + destinatari.length + invitatiiEchipa.length + invitatiiBeneficiar.length;
  let adaugataLaSuprimare = noi.adaugatiLaSuprimare > 0;
  if (ceva > 0 && !adaugataLaSuprimare) {
    await adaugaSuprimare(ctx.db, ctx.orgId, email, "cerere_gdpr");
    adaugataLaSuprimare = true;
  }

  const rezumat = { ...rezumatVechi, ...noi, adaugataLaSuprimare };
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "persoana_sters_gdpr", entitate: "persoana", detalii: rezumat });
  return rezumat;
});

export async function stergePersoanaAction(orgSlug: string, email: string, handle?: string) {
  try {
    return { error: null as string | null, rezumat: await sterge(orgSlug, email, handle) };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Ștergerea a eșuat.", "The deletion failed."), "gdpr-stergere"), rezumat: null };
  }
}
