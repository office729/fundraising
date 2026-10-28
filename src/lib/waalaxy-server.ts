import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { sql } from "drizzle-orm";

import type { db } from "@/lib/db";
import { patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { hashSuprimare } from "@/lib/dezabonare";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { adaugaZileLucratoare, aziBucuresti } from "@/lib/prospectare/limite";
import { cheieNume, hunterVerifica, linkedinNormalizat } from "@/lib/prospectare/motor";
import { decripteaza } from "@/lib/secret-box";
import {
  cheieIdempotenta,
  cuvantulCelMaiLung,
  potrivesteFirma,
  stareDinEveniment,
  stareNoua,
  esteStareOutreach,
  type EvenimentWaalaxy,
  type StareOutreach,
} from "@/lib/waalaxy-evenimente";

// Webhook-ul Waalaxy: răspunsurile și acceptările de invitație vin DOAR prin webhook (API-ul nu le expune). Aici: adresa secretă a organizației, potrivirea evenimentului cu o firmă și
// o persoană din CRM, starea persoanei (fără retrogradare), propagarea refuzului pe toate canalele, sarcinile pentru momentele calde și verificarea e-mailului.
//
// Reguli de date personale:
//  - se păstrează evenimente DOAR pentru persoane potrivite cu o firmă din CRM; restul se numără și se aruncă (nu stocăm persoane necunoscute);
//  - textul mesajelor NU se păstrează: se folosește o singură dată, ca să se recunoască un refuz;
//  - un refuz închide persoana pe toate canalele: contactul devine „a refuzat” (nu mai apare la telefon, WhatsApp sau e-mail), intră în lista de suprimare a prospectării
//    (nu mai e propus și nu mai e căutat) și nu mai primește nicio urmărire.

type Database = Pick<typeof db, "execute">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CALE_WEBHOOK = "waalaxy-webhook";

// ===== Adresa secretă (token fără stare în baza de date) =====
// Token = <id organizație>.<versiune>.<semnătură HMAC>; versiunea stă în crm_kv. Regenerarea crește versiunea: adresa veche nu mai funcționează.
function semnatura(orgId: string, versiune: number): string {
  const cheie = process.env.ORG_SECRETS_KEY;
  if (!cheie) throw new Error("ORG_SECRETS_KEY lipsește — nu se pot semna adrese de webhook.");
  return createHmac("sha256", cheie).update(`waalaxy:${orgId}:${versiune}`).digest("base64url").slice(0, 32);
}

export function creeazaToken(orgId: string, versiune: number): string {
  return `${orgId}.${versiune}.${semnatura(orgId, versiune)}`;
}

// Organizația și versiunea din token, doar dacă semnătura e validă (comparație în timp constant); altfel null.
export function verificaToken(token: string | null | undefined): { orgId: string; versiune: number } | null {
  const parti = (token ?? "").split(".");
  if (parti.length !== 3 || !UUID.test(parti[0]) || !/^[1-9][0-9]{0,8}$/.test(parti[1])) return null;
  const versiune = Number(parti[1]);
  let asteptat: Buffer;
  try {
    asteptat = Buffer.from(semnatura(parti[0], versiune));
  } catch {
    return null;
  }
  const primit = Buffer.from(parti[2]);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit) ? { orgId: parti[0].toLowerCase(), versiune } : null;
}

export async function citesteVersiuneWebhook(exec: Database, orgId: string): Promise<number | null> {
  const [r] = (await exec.execute(sql`select (data->>'versiune')::int as v from crm_kv where org_id = ${orgId} and path = ${CALE_WEBHOOK}`)) as unknown as { v: number | null }[];
  return r?.v ?? null;
}

// Prima generare sau regenerare: versiunea crește cu 1 (adresa veche se invalidează).
export async function regenereazaWebhook(exec: Database, orgId: string): Promise<number> {
  const [r] = (await exec.execute(sql`
    insert into crm_kv (org_id, path, data) values (${orgId}, ${CALE_WEBHOOK}, '{"versiune": 1}'::jsonb)
    on conflict (org_id, path) do update set data = jsonb_build_object('versiune', coalesce((crm_kv.data->>'versiune')::int, 0) + 1), updated_at = now()
    returning (data->>'versiune')::int as v`)) as unknown as { v: number }[];
  return r.v;
}

// ===== Potrivirea cu CRM-ul =====
type FirmaRand = { id: string; nume: string; owner_id: string | null };
type ContactRand = { id: string; nume: string; email: string | null; linkedin: string | null; outreach_stare: string | null; email_status: string | null };

async function gasesteFirma(tx: Tx, orgId: string, numeFirma: string): Promise<FirmaRand | null> {
  const cuvant = cuvantulCelMaiLung(numeFirma);
  if (cuvant.length < 3) return null;
  const candidate = (await tx.execute(
    sql`select id::text as id, nume, owner_id::text as owner_id from companies where org_id = ${orgId} and deleted_at is null and ${sqlFaraDiacritice(sql`nume`)} like ${patternLike(cuvant)} limit 200`,
  )) as unknown as FirmaRand[];
  return potrivesteFirma(numeFirma, candidate);
}

const COL_CONTACT = sql`id::text as id, nume, email, linkedin, outreach_stare, email_status`;

// Persoana din firmă: după profilul LinkedIn, apoi e-mail, apoi nume.
function gasesteContactInFirma(contacte: readonly ContactRand[], ev: EvenimentWaalaxy): ContactRand | null {
  const l = linkedinNormalizat(ev.linkedin);
  if (l) {
    const c = contacte.find((x) => linkedinNormalizat(x.linkedin) === l);
    if (c) return c;
  }
  const e = ev.email.trim().toLowerCase();
  if (e) {
    const c = contacte.find((x) => (x.email ?? "").trim().toLowerCase() === e);
    if (c) return c;
  }
  const k = cheieNume(ev.nume);
  if (k) {
    const potriviri = contacte.filter((x) => cheieNume(x.nume) === k);
    if (potriviri.length === 1) return potriviri[0];
  }
  return null;
}

// Fără numele firmei în eveniment, persoana se caută după profilul LinkedIn în toată organizația.
async function gasesteDupaLinkedin(tx: Tx, orgId: string, linkedin: string): Promise<{ firma: FirmaRand; contact: ContactRand } | null> {
  const l = linkedinNormalizat(linkedin);
  if (!l) return null;
  const randuri = (await tx.execute(
    sql`select ${COL_CONTACT}, company_id::text as company_id from contacts where org_id = ${orgId} and lower(linkedin) like ${"%" + l.replace(/[\\%_]/g, (c) => "\\" + c) + "%"} limit 20`,
  )) as unknown as (ContactRand & { company_id: string })[];
  const c = randuri.find((x) => linkedinNormalizat(x.linkedin) === l);
  if (!c) return null;
  const [firma] = (await tx.execute(sql`select id::text as id, nume, owner_id::text as owner_id from companies where id = ${c.company_id} and org_id = ${orgId} and deleted_at is null`)) as unknown as FirmaRand[];
  return firma ? { firma, contact: c } : null;
}

// ===== Refuzul: opoziția se propagă pe toate canalele =====
export async function propagaOpozitie(
  tx: Tx,
  orgId: string,
  p: { contactId: string | null; companyId: string; nume: string; linkedin: string; email: string },
  motiv: string,
): Promise<void> {
  const sursa = `Refuz pe LinkedIn (Waalaxy)`;
  if (p.contactId) {
    await tx.execute(sql`update contacts set consent_status = 'nu', consent_at = now(), consent_source = ${sursa}, outreach_stare = 'refuz', outreach_stare_la = now() where id = ${p.contactId} and org_id = ${orgId}`);
  }
  // Lista de suprimare a prospectării: persoana nu mai e propusă, aprobată sau căutată (pe nume, profil și e-mail).
  const cheie = cheieNume(p.nume);
  const l = linkedinNormalizat(p.linkedin);
  const email = p.email.trim().toLowerCase();
  const suprimari: [string, string][] = [];
  if (cheie) suprimari.push(["nume", cheie]);
  if (l) suprimari.push(["linkedin", l]);
  if (email) suprimari.push(["email", email]);
  for (const [tip, valoare] of suprimari) {
    await tx.execute(sql`insert into prospectare_suprimati (org_id, tip, valoare, motiv) values (${orgId}, ${tip}, ${valoare}, ${motiv}) on conflict do nothing`);
  }
  // E-mailul intră și în lista generală de suprimare (aceeași ca la dezabonări): nicio campanie de e-mail nu o mai atinge.
  if (email) await tx.execute(sql`insert into email_suppression (org_id, email_hash, motiv) values (${orgId}, ${hashSuprimare(orgId, email)}, 'refuz_linkedin') on conflict do nothing`);
  // Urmărirea se oprește: candidatul legat de contact se închide, iar cele încă nepropuse se resping.
  if (p.contactId) await tx.execute(sql`update prospectare_candidati set stadiu = 'inchis' where org_id = ${orgId} and contact_id = ${p.contactId} and stare = 'aprobat'`);
  if (cheie) await tx.execute(sql`update prospectare_candidati set stare = 'respins', hotarat_la = now() where org_id = ${orgId} and nume_norm = ${cheie} and stare = 'nou'`);
  await tx.execute(sql`insert into fundraising_audit_log (org_id, actor_app_user_id, actiune, entitate, entitate_id, detalii) values (${orgId}, null, 'outreach_refuz', 'contact', ${p.contactId}, ${JSON.stringify({ sursa: "waalaxy", firmaId: p.companyId })}::text::jsonb)`);
}

// ===== Sarcini =====
// Responsabilul sarcinii: persoana care a aprobat contactul în prospectare, altfel responsabilul firmei; apoi angajatul legat de acel cont. Fără el, sarcina rămâne nealocată
// (momentul apare oricum în lista „De urmărit” din Decidenți).
async function angajatPentru(tx: Tx, orgId: string, contactId: string, ownerFirma: string | null): Promise<string | null> {
  const [r] = (await tx.execute(sql`
    select a.id::text as id from angajati a
    where a.org_id = ${orgId} and a.app_user_id = coalesce((select responsabil_id from prospectare_candidati where org_id = ${orgId} and contact_id = ${contactId} and responsabil_id is not null limit 1), ${ownerFirma}::uuid)
    limit 1`)) as unknown as { id: string }[];
  return r?.id ?? null;
}

async function creeazaSarcina(tx: Tx, orgId: string, s: { cheie: string; titlu: string; descriere: string; termen: string; responsabilId: string | null }): Promise<boolean> {
  const r = (await tx.execute(sql`
    insert into activitati (org_id, titlu, descriere, responsabil_id, prioritate, termen, efort_ore, sursa, cheie_automatizare, criteriu_finalizare)
    values (${orgId}, ${s.titlu}, ${s.descriere}, ${s.responsabilId}, 'mare', ${s.termen}::date, 0.25, 'automatizare', ${s.cheie}, 'Persoana a primit un mesaj sau a fost sunată.')
    on conflict do nothing returning id`)) as unknown as unknown[];
  return r.length > 0;
}

// ===== Procesarea unui eveniment =====
export type RezultatEveniment = "fara_firma" | "duplicat" | "procesat";
export type DetaliiEveniment = { rezultat: RezultatEveniment; contactId: string | null; refuz: boolean; sarcina: boolean; emailDeVerificat: string | null };

export async function proceseazaEveniment(tx: Tx, orgId: string, ev: EvenimentWaalaxy, acum: Date = new Date()): Promise<DetaliiEveniment> {
  const gol = (rezultat: RezultatEveniment): DetaliiEveniment => ({ rezultat, contactId: null, refuz: false, sarcina: false, emailDeVerificat: null });

  // 1. Firma și persoana.
  let firma: FirmaRand | null = null;
  let contacte: ContactRand[] = [];
  let contact: ContactRand | null = null;
  if (ev.firma) {
    firma = await gasesteFirma(tx, orgId, ev.firma);
    if (firma) {
      contacte = (await tx.execute(sql`select ${COL_CONTACT} from contacts where org_id = ${orgId} and company_id = ${firma.id}`)) as unknown as ContactRand[];
      contact = gasesteContactInFirma(contacte, ev);
    }
  }
  if (!firma) {
    const g = await gasesteDupaLinkedin(tx, orgId, ev.linkedin);
    if (g) {
      firma = g.firma;
      contact = g.contact;
    }
  }
  if (!firma) return gol("fara_firma");

  // 2. Idempotență: aceeași încărcătură retrimisă nu se numără din nou.
  const externId = createHash("sha256").update(`${orgId}|${cheieIdempotenta(ev)}`).digest("hex");
  const inserat = (await tx.execute(sql`
    insert into outreach_evenimente (org_id, company_id, contact_id, tip, refuz, campanie, extern_id)
    values (${orgId}, ${firma.id}, ${contact?.id ?? null}, ${ev.tip}, ${ev.refuz}, ${ev.campanie || null}, ${externId})
    on conflict (org_id, extern_id) do nothing returning id`)) as unknown as { id: string }[];
  if (inserat.length === 0) return gol("duplicat");

  const stare = stareDinEveniment(ev);
  const motiv = "a refuzat pe LinkedIn (Waalaxy)";

  // 3. Persoana lipsă: se creează doar dacă s-a implicat (a acceptat invitația sau a răspuns, fără refuz). Cine doar a primit o invitație nu intră în CRM, iar cine a refuzat nu se creează
  //    deloc (doar se suprimă, ca să nu mai fie propusă).
  if (!contact && ev.nume && stare !== "invitat" && stare !== "refuz") {
    const [nou] = (await tx.execute(sql`
      insert into contacts (org_id, company_id, nume, rol, linkedin, email, telefon, consent_source, detalii)
      values (${orgId}, ${firma.id}, ${ev.nume}, ${ev.rol || null}, ${ev.linkedin || null}, ${ev.email || null}, ${ev.telefon || null}, 'waalaxy:linkedin',
              ${"Adăugat din campania LinkedIn (Waalaxy) la " + aziBucuresti(acum) + ", după ce a " + (stare === "conectat" ? "acceptat invitația" : "răspuns") + ". De informat despre prelucrarea datelor (art. 14 GDPR)."})
      returning ${COL_CONTACT}`)) as unknown as ContactRand[];
    contact = nou;
    await tx.execute(sql`update outreach_evenimente set contact_id = ${nou.id} where org_id = ${orgId} and extern_id = ${externId}`);
  }

  // 4. Refuzul: opoziția se propagă; nu se mai face nimic altceva pentru persoană.
  if (stare === "refuz") {
    await propagaOpozitie(tx, orgId, { contactId: contact?.id ?? null, companyId: firma.id, nume: ev.nume, linkedin: ev.linkedin, email: ev.email }, motiv);
    return { rezultat: "procesat", contactId: contact?.id ?? null, refuz: true, sarcina: false, emailDeVerificat: null };
  }
  if (!contact) return { rezultat: "procesat", contactId: null, refuz: false, sarcina: false, emailDeVerificat: null };

  // 5. Starea: nu se retrogradează. Un contact deja „a refuzat” (din alt canal) nu se redeschide.
  const existenta = esteStareOutreach(contact.outreach_stare) ? (contact.outreach_stare as StareOutreach) : null;
  const finala = stareNoua(existenta, stare);
  if (finala !== existenta) await tx.execute(sql`update contacts set outreach_stare = ${finala}, outreach_stare_la = now() where id = ${contact.id} and org_id = ${orgId}`);
  // E-mailul adus de campanie completează contactul doar dacă acesta nu are unul.
  const faraEmail = !(contact.email ?? "").trim() && ev.email.trim();
  if (faraEmail) await tx.execute(sql`update contacts set email = ${ev.email.trim()}, email_status = null where id = ${contact.id} and org_id = ${orgId} and coalesce(email, '') = ''`);

  // 6. Momentele calde devin sarcini (o singură dată pe persoană, indiferent de câte ori vine evenimentul).
  let sarcina = false;
  if (stare === "conectat" && finala === "conectat") {
    sarcina = await creeazaSarcina(tx, orgId, {
      cheie: `conectat:${contact.id}`,
      titlu: `Ți-a acceptat invitația pe LinkedIn: scrie-i acum (${contact.nume}, ${firma.nume})`,
      descriere: "Creată automat din Waalaxy. Momentul cel mai cald: persoana tocmai a acceptat invitația, deci scrie-i în aceeași zi.",
      termen: aziBucuresti(acum),
      responsabilId: await angajatPentru(tx, orgId, contact.id, firma.owner_id),
    });
  } else if (stare === "a_raspuns") {
    sarcina = await creeazaSarcina(tx, orgId, {
      cheie: `raspuns:${contact.id}`,
      titlu: `Răspuns pe LinkedIn: continuă discuția (${contact.nume}, ${firma.nume})`,
      descriere: "Creată automat din Waalaxy. Persoana a răspuns la mesajul tău; citește răspunsul în Waalaxy și continuă discuția.",
      termen: adaugaZileLucratoare(aziBucuresti(acum), 1),
      responsabilId: await angajatPentru(tx, orgId, contact.id, firma.owner_id),
    });
  }

  // 7. E-mailul adus de campanie se verifică (după tranzacție, cu un furnizor extern): doar dacă evenimentul a adus unul, e valid ca formă, coincide cu cel al contactului
  //    (sau contactul n-avea) și nu are încă o stare. Un eveniment fără e-mail nu consumă credite.
  const emailEv = ev.email.trim();
  const emailContact = (contact.email ?? "").trim() || emailEv;
  const emailDeVerificat = emailEv && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEv) && !contact.email_status && emailContact.toLowerCase() === emailEv.toLowerCase() ? emailEv : null;
  return { rezultat: "procesat", contactId: contact.id, refuz: false, sarcina, emailDeVerificat };
}

export type RezultatProcesare = { primite: number; inCrm: number; duplicate: number; refuzuri: number; sarcini: number };

// Procesează evenimentele unei organizații; fiecare într-o tranzacție proprie (un eveniment stricat nu le oprește pe celelalte). Verificarea e-mailului rulează după, cu cheia Hunter a organizației.
export async function proceseazaEvenimente(dbInstance: typeof db, orgId: string, evenimente: readonly EvenimentWaalaxy[]): Promise<RezultatProcesare> {
  const rez: RezultatProcesare = { primite: evenimente.length, inCrm: 0, duplicate: 0, refuzuri: 0, sarcini: 0 };
  const deVerificat: { contactId: string; email: string }[] = [];
  for (const ev of evenimente) {
    try {
      const d = await dbInstance.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
        return proceseazaEveniment(tx, orgId, ev);
      });
      if (d.rezultat === "duplicat") rez.duplicate++;
      if (d.rezultat === "procesat") rez.inCrm++;
      if (d.refuz) rez.refuzuri++;
      if (d.sarcina) rez.sarcini++;
      if (d.contactId && d.emailDeVerificat) deVerificat.push({ contactId: d.contactId, email: d.emailDeVerificat });
    } catch (e) {
      raporteazaEroare("waalaxy-webhook", e, { orgId });
    }
  }
  if (deVerificat.length) await verificaEmailuri(dbInstance, orgId, deVerificat.slice(0, 20));
  return rez;
}

// ===== Verificarea e-mailului (Hunter, cheia ORGANIZAȚIEI) =====
// Costă un credit Hunter pe adresă; se face doar dacă organizația are cheia conectată și doar pentru adrese încă neverificate. „invalid” rămâne marcat pe contact (nu se șterge adresa).
async function verificaEmailuri(dbInstance: typeof db, orgId: string, lista: { contactId: string; email: string }[]): Promise<void> {
  try {
    const cheie = await dbInstance.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
      const [r] = (await tx.execute(sql`select cheie_enc from prospectare_chei where org_id = ${orgId} and provider = 'hunter'`)) as unknown as { cheie_enc: string }[];
      return r ? decripteaza(r.cheie_enc) : null;
    });
    if (!cheie) return;
    for (const { contactId, email } of lista) {
      const r = await hunterVerifica(cheie, email, fetch);
      const status = r.ok ? r.date : null;
      if (status !== "valid" && status !== "risky" && status !== "invalid") continue;
      await dbInstance.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
        await tx.execute(sql`update contacts set email_status = ${status} where id = ${contactId} and org_id = ${orgId} and lower(email) = ${email.toLowerCase()}`);
      });
    }
  } catch (e) {
    raporteazaAvertisment("waalaxy-verificare-email", "verificarea e-mailului nu a reușit", { orgId, eroare: String((e as Error)?.message ?? e).slice(0, 120) });
  }
}

// ===== Trimiteri din Alexandrit: persoana e „invitat” =====
// Apelat după ce o persoană aprobată a ajuns în Waalaxy: starea ei devine „invitat” (dacă n-are deja una mai avansată) și se înregistrează în jurnal (pentru pâlnie).
export async function noteazaInvitatie(exec: Database, orgId: string, p: { contactId: string; companyId: string; campanie?: string | null }): Promise<void> {
  const cheie = createHash("sha256").update(`${orgId}|trimis|${p.contactId}`).digest("hex");
  await exec.execute(sql`
    insert into outreach_evenimente (org_id, company_id, contact_id, tip, refuz, campanie, extern_id)
    values (${orgId}, ${p.companyId}, ${p.contactId}, 'invitat', false, ${p.campanie ?? null}, ${cheie}) on conflict (org_id, extern_id) do nothing`);
  await exec.execute(sql`update contacts set outreach_stare = 'invitat', outreach_stare_la = now() where id = ${p.contactId} and org_id = ${orgId} and outreach_stare is null`);
}

// ===== Pâlnie și liste de urmărit =====
export type PalnieOutreach = { invitati: number; conectati: number; raspunsuri: number; refuzuri: number };

// Persoane unice care au ajuns la fiecare pas. Un răspuns sau un refuz arată și că s-a ajuns la persoană, chiar dacă acceptarea invitației nu a fost raportată.
export async function palnieOutreach(exec: Database, orgId: string): Promise<PalnieOutreach> {
  const [r] = (await exec.execute(sql`
    select
      count(distinct coalesce(contact_id::text, id::text)) filter (where tip = 'invitat')::int as invitati,
      count(distinct coalesce(contact_id::text, id::text)) filter (where tip = 'conectat')::int as conectati,
      count(distinct coalesce(contact_id::text, id::text)) filter (where tip = 'raspuns')::int as raspunsuri,
      count(distinct coalesce(contact_id::text, id::text)) filter (where refuz)::int as refuzuri
    from outreach_evenimente where org_id = ${orgId}`)) as unknown as PalnieOutreach[];
  return r ?? { invitati: 0, conectati: 0, raspunsuri: 0, refuzuri: 0 };
}

export type RandUrmarire = { contactId: string; companyId: string; firma: string; nume: string; rol: string | null; linkedin: string | null; zile: number };
export type ListeUrmarire = { conectatiNecontactati: RandUrmarire[]; invitatiFaraAccept: RandUrmarire[] };

// „Conectați necontactați”: au acceptat invitația, dar după acel moment nu există nicio notă pe firmă și candidatul nu a trecut la „contactat”.
// „Invitați fără accept”: invitați de mai mult de `zileInvitat` zile, fără nicio mișcare.
export async function listeUrmarire(exec: Database, orgId: string, zileInvitat = 14): Promise<ListeUrmarire> {
  const baza = sql`select c.id::text as "contactId", c.company_id::text as "companyId", co.nume as firma, c.nume, c.rol, c.linkedin, greatest(0, extract(day from now() - c.outreach_stare_la))::int as zile
    from contacts c join companies co on co.id = c.company_id and co.deleted_at is null where c.org_id = ${orgId}`;
  const [conectati, invitati] = await Promise.all([
    exec.execute(sql`${baza} and c.outreach_stare = 'conectat'
      and not exists (select 1 from company_notite n where n.company_id = c.company_id and n.created_at > c.outreach_stare_la)
      and not exists (select 1 from prospectare_candidati p where p.contact_id = c.id and p.stadiu in ('contactat', 'raspuns', 'inchis') and p.contactat_la > c.outreach_stare_la)
      order by c.outreach_stare_la asc limit 200`),
    exec.execute(sql`${baza} and c.outreach_stare = 'invitat' and c.outreach_stare_la < now() - make_interval(days => ${zileInvitat}) order by c.outreach_stare_la asc limit 200`),
  ]);
  return { conectatiNecontactati: conectati as unknown as RandUrmarire[], invitatiFaraAccept: invitati as unknown as RandUrmarire[] };
}
