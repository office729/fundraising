import "server-only";

import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";

import { adaugaSuprimare } from "@/lib/agent-email/store";
import type { OrgContext } from "@/lib/auth/guard";
import { agentEmailMesaje, agentEmailRaspunsuri, companies, contacts, emailSuppression, influenceri, influenceriActivitati, influenceriLinkuri, prospectareCandidati } from "@/lib/db/schema";
import { hashSuprimare } from "@/lib/dezabonare";
import { LUNI_RETENTIE_INFLUENCERI_BLOCATI, slugLinkedinDinHandle, VALOARE_EXPIRATA, VALOARE_STEARSA, limitaRetentieEmailuri } from "@/lib/gdpr-module-noi-reguli";
import { amprentePersoana } from "@/lib/gdpr-persoane";
import { normEmail, normFacebook, normInstagram, normTiktok, normYoutube } from "@/lib/influenceri/reguli";
import { stergeLaCerere } from "@/lib/influenceri/server";

type Db = OrgContext["db"];

// Cererile GDPR (art. 15 și 17) pentru modulele noi: emailurile Agentului email și răspunsurile primite, candidații din Prospectare,
// fișele din Influenceri și lista de suprimare. Toate interogările filtrează explicit după organizație (pe lângă RLS).
// Persoana se identifică după email și/sau după un handle / link de profil (Influenceri; LinkedIn pentru Prospectare).

export type IdentitateCerere = { email: string | null; handle: string | null };

export type RezultatModuleNoi = {
  emailuriAgent: number;
  raspunsuriAgent: number;
  candidatiProspectare: number;
  influenceri: number;
  peListaSuprimare: boolean;
};

export type RezumatStergereModuleNoi = {
  emailuriCiorneSterse: number;
  emailuriAnonimizate: number;
  raspunsuriAnonimizate: number;
  candidatiAnonimizati: number;
  influenceriStersi: number;
  adaugatiLaSuprimare: number;
};

const ZERO_REZUMAT: RezumatStergereModuleNoi = { emailuriCiorneSterse: 0, emailuriAnonimizate: 0, raspunsuriAnonimizate: 0, candidatiAnonimizati: 0, influenceriStersi: 0, adaugatiLaSuprimare: 0 };

const LIMITA_EXPORT = 5000;

// Contactele companiilor cu acest email: emailurile și candidații legați de ele (contact_id) fac parte din aceeași persoană, chiar dacă adresa s-a schimbat între timp.
async function idContacte(db: Db, orgId: string, email: string | null): Promise<string[]> {
  if (!email) return [];
  const r = await db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.orgId, orgId), sql`lower(${contacts.email}) = ${email}`));
  return r.map((x) => x.id);
}

function filtruAgent(orgId: string, email: string | null, contactIds: string[]): SQL | undefined {
  const parti: SQL[] = [];
  if (email) parti.push(sql`lower(${agentEmailMesaje.catreEmail}) = ${email}`);
  if (contactIds.length) parti.push(inArray(agentEmailMesaje.contactId, contactIds));
  // Fără niciun criteriu nu întoarcem „tot”: un `or()` gol ar potrivi toată organizația.
  return parti.length ? and(eq(agentEmailMesaje.orgId, orgId), or(...parti)) : undefined;
}

function filtruRaspunsuri(orgId: string, email: string | null, filtruMesaje: SQL | undefined, db: Db): SQL | undefined {
  const parti: SQL[] = [];
  if (email) parti.push(sql`lower(${agentEmailRaspunsuri.deLa}) = ${email}`);
  if (filtruMesaje) parti.push(inArray(agentEmailRaspunsuri.mesajId, db.select({ id: agentEmailMesaje.id }).from(agentEmailMesaje).where(filtruMesaje)));
  return parti.length ? and(eq(agentEmailRaspunsuri.orgId, orgId), or(...parti)) : undefined;
}

function filtruCandidati(orgId: string, ident: IdentitateCerere, contactIds: string[]): SQL | undefined {
  const parti: SQL[] = [];
  if (ident.email) parti.push(sql`lower(${prospectareCandidati.email}) = ${ident.email}`);
  if (contactIds.length) parti.push(inArray(prospectareCandidati.contactId, contactIds));
  const slug = slugLinkedinDinHandle(ident.handle);
  if (slug) parti.push(sql`lower(substring(${prospectareCandidati.linkedin} from 'linkedin\.com/in/([^/?#]+)')) = ${slug}`);
  // Candidații deja anonimizați (la cerere, la expirare sau respinși) își păstrează legătura cu contactul, dar nu mai conțin date: nu se numără și nu se rescriu.
  return parti.length ? and(eq(prospectareCandidati.orgId, orgId), or(...parti), sql`${prospectareCandidati.nume} not in (${VALOARE_STEARSA}, ${VALOARE_EXPIRATA}, '[respins]')`) : undefined;
}

// Un handle simplu („ana.pop”) poate fi pe mai multe rețele: se potrivește pe oricare. Un link de profil se potrivește doar pe rețeaua lui.
function filtruInfluenceri(orgId: string, ident: IdentitateCerere): SQL | undefined {
  const parti: SQL[] = [];
  const email = normEmail(ident.email);
  if (email) parti.push(sql`(lower(${influenceri.email}) = ${email} or ${influenceri.emailNorm} = ${email})`);
  const ig = normInstagram(ident.handle);
  const fb = normFacebook(ident.handle);
  const tt = normTiktok(ident.handle);
  const yt = normYoutube(ident.handle);
  if (ig) parti.push(sql`${influenceri.instagramNorm} = ${ig}`);
  if (fb) parti.push(sql`${influenceri.facebookNorm} = ${fb}`);
  if (tt) parti.push(sql`${influenceri.tiktokNorm} = ${tt}`);
  if (yt) parti.push(sql`${influenceri.youtubeNorm} = ${yt}`);
  return parti.length ? and(eq(influenceri.orgId, orgId), or(...parti)) : undefined;
}

const numar = sql<number>`count(*)::int`;

async function estePeListaSuprimare(db: Db, orgId: string, email: string | null): Promise<boolean> {
  if (!email) return false;
  const [r] = await db
    .select({ id: emailSuppression.id })
    .from(emailSuppression)
    .where(and(eq(emailSuppression.orgId, orgId), eq(emailSuppression.emailHash, hashSuprimare(orgId, email))))
    .limit(1);
  return Boolean(r);
}

export async function cautaModuleNoi(db: Db, orgId: string, ident: IdentitateCerere): Promise<RezultatModuleNoi> {
  const contactIds = await idContacte(db, orgId, ident.email);
  const fMesaje = filtruAgent(orgId, ident.email, contactIds);
  const fRaspunsuri = filtruRaspunsuri(orgId, ident.email, fMesaje, db);
  const fCandidati = filtruCandidati(orgId, ident, contactIds);
  const fInfluenceri = filtruInfluenceri(orgId, ident);

  const [mesaje, raspunsuri, candidati, infl, suprimat] = await Promise.all([
    fMesaje ? db.select({ n: numar }).from(agentEmailMesaje).where(fMesaje) : Promise.resolve([{ n: 0 }]),
    fRaspunsuri ? db.select({ n: numar }).from(agentEmailRaspunsuri).where(fRaspunsuri) : Promise.resolve([{ n: 0 }]),
    fCandidati ? db.select({ n: numar }).from(prospectareCandidati).where(fCandidati) : Promise.resolve([{ n: 0 }]),
    fInfluenceri ? db.select({ n: numar }).from(influenceri).where(fInfluenceri) : Promise.resolve([{ n: 0 }]),
    estePeListaSuprimare(db, orgId, ident.email),
  ]);
  return { emailuriAgent: mesaje[0]?.n ?? 0, raspunsuriAgent: raspunsuri[0]?.n ?? 0, candidatiProspectare: candidati[0]?.n ?? 0, influenceri: infl[0]?.n ?? 0, peListaSuprimare: suprimat };
}

// Export (art. 15): tot ce păstrăm despre persoană în modulele noi. Textul emailurilor și al răspunsurilor se exportă integral (sunt datele ei).
export async function exportaModuleNoi(db: Db, orgId: string, ident: IdentitateCerere) {
  const contactIds = await idContacte(db, orgId, ident.email);
  const fMesaje = filtruAgent(orgId, ident.email, contactIds);
  const fRaspunsuri = filtruRaspunsuri(orgId, ident.email, fMesaje, db);
  const fCandidati = filtruCandidati(orgId, ident, contactIds);
  const fInfluenceri = filtruInfluenceri(orgId, ident);

  const [mesaje, raspunsuri, candidati, fise, suprimat] = await Promise.all([
    fMesaje
      ? db
          .select({
            id: agentEmailMesaje.id,
            firma: agentEmailMesaje.firmaNume,
            catreNume: agentEmailMesaje.catreNume,
            catreEmail: agentEmailMesaje.catreEmail,
            catreRol: agentEmailMesaje.catreRol,
            deNume: agentEmailMesaje.deNume,
            subiect: agentEmailMesaje.subiect,
            mesaj: agentEmailMesaje.mesaj,
            aiMesaj: agentEmailMesaje.aiMesaj,
            istoric: agentEmailMesaje.istoric,
            stare: agentEmailMesaje.stare,
            creatLa: agentEmailMesaje.createdAt,
            trimisLa: agentEmailMesaje.trimisLa,
            deschisNr: agentEmailMesaje.deschisNr,
          })
          .from(agentEmailMesaje)
          .where(fMesaje)
          .orderBy(agentEmailMesaje.createdAt)
          .limit(LIMITA_EXPORT)
      : Promise.resolve([]),
    fRaspunsuri
      ? db
          .select({ mesajId: agentEmailRaspunsuri.mesajId, deLa: agentEmailRaspunsuri.deLa, primitLa: agentEmailRaspunsuri.primitLa, subiect: agentEmailRaspunsuri.subiect, fragment: agentEmailRaspunsuri.fragment, eticheta: agentEmailRaspunsuri.eticheta })
          .from(agentEmailRaspunsuri)
          .where(fRaspunsuri)
          .orderBy(agentEmailRaspunsuri.primitLa)
          .limit(LIMITA_EXPORT)
      : Promise.resolve([]),
    fCandidati
      ? db
          .select({
            nume: prospectareCandidati.nume,
            rol: prospectareCandidati.rol,
            departament: prospectareCandidati.dept,
            linkedin: prospectareCandidati.linkedin,
            email: prospectareCandidati.email,
            telefon: prospectareCandidati.telefon,
            sursa: prospectareCandidati.sursa,
            sursaUrl: prospectareCandidati.sursaUrl,
            stare: prospectareCandidati.stare,
            gasitLa: prospectareCandidati.gasitLa,
          })
          .from(prospectareCandidati)
          .where(fCandidati)
          .limit(LIMITA_EXPORT)
      : Promise.resolve([]),
    fInfluenceri ? db.select().from(influenceri).where(fInfluenceri).limit(LIMITA_EXPORT) : Promise.resolve([]),
    estePeListaSuprimare(db, orgId, ident.email),
  ]);

  const idFise = fise.map((f) => f.id);
  const [activitati, linkuri] = idFise.length
    ? await Promise.all([
        db
          .select({ influencerId: influenceriActivitati.influencerId, tip: influenceriActivitati.tip, canal: influenceriActivitati.canal, text: influenceriActivitati.text, la: influenceriActivitati.createdAt })
          .from(influenceriActivitati)
          .where(and(eq(influenceriActivitati.orgId, orgId), inArray(influenceriActivitati.influencerId, idFise)))
          .orderBy(influenceriActivitati.createdAt),
        db
          .select({ influencerId: influenceriLinkuri.influencerId, slug: influenceriLinkuri.slug, platforma: influenceriLinkuri.platforma, descriere: influenceriLinkuri.descriere, creatLa: influenceriLinkuri.createdAt })
          .from(influenceriLinkuri)
          .where(and(eq(influenceriLinkuri.orgId, orgId), inArray(influenceriLinkuri.influencerId, idFise))),
      ])
    : [[], []];

  const faraLegatura = <T extends object, K extends keyof T>(x: T, cheie: K): Omit<T, K> => Object.fromEntries(Object.entries(x).filter(([k]) => k !== cheie)) as Omit<T, K>;
  return {
    emailuriAgent: mesaje.map((m) => ({ ...faraLegatura(m, "id"), raspunsuri: raspunsuri.filter((r) => r.mesajId === m.id).map((r) => faraLegatura(r, "mesajId")) })),
    // Răspunsurile primite de la această adresă la emailuri trimise altor persoane.
    raspunsuriLaAlteEmailuri: raspunsuri.filter((r) => !mesaje.some((m) => m.id === r.mesajId)).map((r) => faraLegatura(r, "mesajId")),
    candidatiProspectare: candidati,
    influenceri: fise.map((f) => ({
      ...Object.fromEntries(Object.entries(f).filter(([k]) => !["id", "orgId", "createdBy", "responsabilId"].includes(k))),
      activitati: activitati.filter((a) => a.influencerId === f.id).map((a) => faraLegatura(a, "influencerId")),
      linkuri: linkuri.filter((l) => l.influencerId === f.id).map((l) => faraLegatura(l, "influencerId")),
    })),
    listaSuprimare: { prezent: suprimat, nota: "Se păstrează doar o amprentă criptografică a adresei (nu adresa), ca persoana să nu mai fie contactată." },
  };
}

// „Nu mai căuta”: persoana scoasă din Prospectare nu mai e propusă de motorul de căutare (doar amprentă, ca în ștergerea unui contact).
async function adaugaNuMaiCauta(db: Db, orgId: string, companyId: string, amprente: string[]): Promise<void> {
  if (!amprente.length) return;
  await db
    .update(companies)
    .set({
      extra: sql`jsonb_set(coalesce(${companies.extra}, '{}'::jsonb), '{nuMaiCauta}', (
        select coalesce(jsonb_agg(distinct v), '[]'::jsonb) from jsonb_array_elements_text(
          coalesce(${companies.extra}->'nuMaiCauta', '[]'::jsonb) || ${JSON.stringify(amprente)}::text::jsonb
        ) as t(v)
      ))`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, orgId)));
}

// Ciornele netrimise se șterg, emailurile trimise își pierd destinatarul și textul (rândul rămâne pentru statistici), iar răspunsurile primite se golesc —
// aceeași regulă ca la ștergerea unui contact din CRM Companii.
export async function anonimizeazaEmailuriAgent(db: Db, orgId: string, email: string | null, contactIds: string[]): Promise<{ sterse: number; anonimizate: number; raspunsuri: number }> {
  const f = filtruAgent(orgId, email, contactIds);
  const fRaspunsuriDirecte = email ? and(eq(agentEmailRaspunsuri.orgId, orgId), sql`lower(${agentEmailRaspunsuri.deLa}) = ${email}`) : undefined;
  let raspunsuri = 0;
  if (fRaspunsuriDirecte) {
    const r = await db
      .update(agentEmailRaspunsuri)
      .set({ deLa: VALOARE_STEARSA, fragment: "" })
      .where(and(fRaspunsuriDirecte, sql`${agentEmailRaspunsuri.deLa} <> ${VALOARE_STEARSA}`))
      .returning({ id: agentEmailRaspunsuri.id });
    raspunsuri += r.length;
  }
  if (!f) return { sterse: 0, anonimizate: 0, raspunsuri };

  const sterse = await db
    .delete(agentEmailMesaje)
    .where(and(f, inArray(agentEmailMesaje.stare, ["ciorna", "eroare"])))
    .returning({ id: agentEmailMesaje.id });
  const trimise = await db
    .update(agentEmailMesaje)
    .set({ catreNume: VALOARE_STEARSA, catreEmail: VALOARE_STEARSA, catreRol: null, mesaj: VALOARE_STEARSA, aiMesaj: null, istoric: null, contactId: null })
    .where(f)
    .returning({ id: agentEmailMesaje.id });
  if (trimise.length) {
    const r = await db
      .update(agentEmailRaspunsuri)
      .set({ deLa: VALOARE_STEARSA, fragment: "" })
      .where(and(eq(agentEmailRaspunsuri.orgId, orgId), inArray(agentEmailRaspunsuri.mesajId, trimise.map((m) => m.id)), sql`${agentEmailRaspunsuri.deLa} <> ${VALOARE_STEARSA}`))
      .returning({ id: agentEmailRaspunsuri.id });
    raspunsuri += r.length;
  }
  return { sterse: sterse.length, anonimizate: trimise.length, raspunsuri };
}

// Trebuie apelat ÎNAINTE de ștergerea contactelor din CRM: legătura contact_id dispare la ștergere și emailurile/candidații n-ar mai fi găsiți după contact.
export async function stergeModuleNoi(db: Db, orgId: string, ident: IdentitateCerere): Promise<RezumatStergereModuleNoi> {
  const rez = { ...ZERO_REZUMAT };
  const contactIds = await idContacte(db, orgId, ident.email);

  const agent = await anonimizeazaEmailuriAgent(db, orgId, ident.email, contactIds);
  rez.emailuriCiorneSterse = agent.sterse;
  rez.emailuriAnonimizate = agent.anonimizate;
  rez.raspunsuriAnonimizate = agent.raspunsuri;

  // Candidații din Prospectare: se păstrează doar rândul gol (pentru numărători) și amprenta „nu mai căuta” a firmei.
  const fCandidati = filtruCandidati(orgId, ident, contactIds);
  if (fCandidati) {
    const gasiti = await db
      .select({ id: prospectareCandidati.id, companyId: prospectareCandidati.companyId, nume: prospectareCandidati.nume, linkedin: prospectareCandidati.linkedin })
      .from(prospectareCandidati)
      .where(fCandidati);
    const dupaFirma = new Map<string, string[]>();
    for (const c of gasiti) {
      if (c.nume === VALOARE_STEARSA || c.nume === VALOARE_EXPIRATA || c.nume === "[respins]") continue;
      dupaFirma.set(c.companyId, [...(dupaFirma.get(c.companyId) ?? []), ...amprentePersoana(orgId, c.companyId, c.nume, c.linkedin)]);
    }
    for (const [companyId, amprente] of dupaFirma) await adaugaNuMaiCauta(db, orgId, companyId, amprente);
    if (gasiti.length) {
      const anonimizati = await db
        .update(prospectareCandidati)
        .set({
          nume: VALOARE_STEARSA,
          numeNorm: sql`'sters:' || ${prospectareCandidati.id}::text`,
          rol: null,
          dept: null,
          linkedin: null,
          email: null,
          emailStatus: null,
          telefon: null,
          ids: {},
          alteSurse: [],
          cerereLusha: null,
          sursaUrl: null,
          eticheta: null,
          stadiu: "inchis",
          urmatorPasLa: null,
        })
        .where(and(eq(prospectareCandidati.orgId, orgId), inArray(prospectareCandidati.id, gasiti.map((c) => c.id))))
        .returning({ id: prospectareCandidati.id });
      rez.candidatiAnonimizati = anonimizati.length;
    }
  }

  // Influenceri: ștergerea la cerere existentă (fișa, istoricul și numele din linkuri dispar; rămân doar amprentele de excludere).
  // Adresele lor intră și în lista de suprimare, ca să nu mai primească emailuri de la Agentul email.
  const fInfluenceri = filtruInfluenceri(orgId, ident);
  const emailuriDeSuprimat = new Set<string>();
  if (fInfluenceri) {
    const fise = await db.select({ id: influenceri.id, email: influenceri.email }).from(influenceri).where(fInfluenceri);
    for (const f of fise) {
      const e = normEmail(f.email);
      if (e) emailuriDeSuprimat.add(e);
      await stergeLaCerere(db, orgId, f.id);
      rez.influenceriStersi++;
    }
  }

  // Lista de suprimare păstrează doar amprenta (hash) adresei. Pentru adresa din cerere se completează când s-a șters ceva din modulele noi;
  // acțiunea din panou o completează și când s-a șters ceva din sursele vechi.
  if (ident.email && (rez.emailuriCiorneSterse + rez.emailuriAnonimizate + rez.candidatiAnonimizati + rez.influenceriStersi > 0)) emailuriDeSuprimat.add(ident.email);
  for (const e of emailuriDeSuprimat) {
    await adaugaSuprimare(db, orgId, e, "cerere_gdpr");
    rez.adaugatiLaSuprimare++;
  }
  return rez;
}

// Retenția de 24 de luni: emailurile TRIMISE de Agentul email (și răspunsurile primite la ele) își pierd datele destinatarului după 24 de luni de la trimitere.
// Rândul rămâne pentru statistici (stare, date, număr de deschideri). Ciornele nu intră aici (au curățenia lor); analizele ONG și căutările profunde AI nu se ating.
// Idempotent: rândurile deja anonimizate (la cerere sau la expirare) nu se mai numără.
export async function anonimizeazaEmailuriExpirate(db: Db, orgId: string, acum: Date = new Date()): Promise<{ emailuri: number; raspunsuri: number }> {
  const limita = limitaRetentieEmailuri(acum).toISOString();
  const expirate = and(
    eq(agentEmailMesaje.orgId, orgId),
    eq(agentEmailMesaje.stare, "trimis"),
    sql`${agentEmailMesaje.trimisLa} < ${limita}::timestamptz`,
    sql`${agentEmailMesaje.catreEmail} not in (${VALOARE_EXPIRATA}, ${VALOARE_STEARSA})`,
  );
  // Răspunsurile întâi, cât timp mesajele încă se disting după destinatar.
  const raspunsuri = await db
    .update(agentEmailRaspunsuri)
    .set({ deLa: VALOARE_EXPIRATA, fragment: "" })
    .where(and(eq(agentEmailRaspunsuri.orgId, orgId), inArray(agentEmailRaspunsuri.mesajId, db.select({ id: agentEmailMesaje.id }).from(agentEmailMesaje).where(expirate)), sql`${agentEmailRaspunsuri.deLa} not in (${VALOARE_EXPIRATA}, ${VALOARE_STEARSA})`))
    .returning({ id: agentEmailRaspunsuri.id });
  const emailuri = await db
    .update(agentEmailMesaje)
    .set({ catreNume: VALOARE_EXPIRATA, catreEmail: VALOARE_EXPIRATA, catreRol: null, mesaj: VALOARE_EXPIRATA, aiMesaj: null, istoric: null, contactId: null })
    .where(expirate)
    .returning({ id: agentEmailMesaje.id });
  return { emailuri: emailuri.length, raspunsuri: raspunsuri.length };
}

// Retenția influencerilor „Nu mai contactăm”: la 12 luni de la marcare, fișa se reduce la amprentele de excludere (stergeLaCerere: dispar fișa, istoricul și numele din linkuri;
// refuzul rămâne respectat prin amprente). Data marcării = ultima trecere în „Nu mai contactăm” din jurnalul fișei; dacă jurnalul nu o are, ultima modificare a fișei.
// Fișele marcate recent sau nemarcate nu se ating. Un rând care eșuează (savepoint propriu) nu oprește celelalte rânduri; plafon pe rulare, restul rămâne pe a doua zi.
export async function expiraInfluenceriBlocati(db: Db, orgId: string, acum: Date = new Date()): Promise<{ reduse: number; esuate: number; primaEroare: unknown }> {
  const limita = limitaRetentieEmailuri(acum, LUNI_RETENTIE_INFLUENCERI_BLOCATI).toISOString();
  const expirate = (await db.execute(sql`
    select i.id::text as id from influenceri i
    where i.org_id = ${orgId} and i.nu_contacta = true
      and coalesce(
        (select max(a.created_at) from influenceri_activitati a
         where a.org_id = ${orgId} and a.influencer_id = i.id and (a.tip = 'nu_contacta' or (a.tip = 'etapa' and a.text like ${"→ stop%"}))),
        i.updated_at
      ) < ${limita}::timestamptz
    order by i.created_at
    limit 200`)) as unknown as { id: string }[];
  let reduse = 0;
  let esuate = 0;
  let primaEroare: unknown = null;
  for (const f of expirate) {
    try {
      await db.transaction((sp) => stergeLaCerere(sp as unknown as Db, orgId, f.id, "nu_mai_contactam"));
      reduse++;
    } catch (e) {
      primaEroare ??= e;
      // un rând care nu se poate reduce acum (ex. blocat de altă tranzacție) se reia la următoarea rulare; cron-ul raportează numărul
      esuate++;
    }
  }
  return { reduse, esuate, primaEroare };
}
