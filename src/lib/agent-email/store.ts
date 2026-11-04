import "server-only";

import { createHash } from "node:crypto";

import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";

import type { db as dbGlobal } from "@/lib/db";
import { agentEmailConturi, agentEmailContor, agentEmailMesaje, agentEmailPdf, agentEmailRaspunsuri, agentEmailSetari, emailSuppression, fundraisingPages, prospectareSuprimati } from "@/lib/db/schema";
import { esteAmprentaHmac, SetSuprimate } from "@/lib/amprente-hmac";
import { hashSuprimare } from "@/lib/dezabonare";
import { decripteaza } from "@/lib/secret-box";

import { LIMITA_ZI_IMPLICITA, MINUTE_BLOCARE_TRIMITERE, ziBucuresti, type EtichetaRaspuns, type Mecanism, type StareMesaj, type TipMesaj } from "./reguli";
import type { ContPublic, MesajClient, PdfGeneral, RaspunsClient, SetariAgent } from "./tipuri";

export type Db = typeof dbGlobal;
export type RandMesaj = typeof agentEmailMesaje.$inferSelect;
export type RandCont = typeof agentEmailConturi.$inferSelect;

export const bazaUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/+$/, "");
export const linkPaginaPublica = (orgSlug: string, slug: string): string => `${bazaUrl()}/strangere-fonduri/${orgSlug}/${slug}`;

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

// ===== Setări și conturi =====
export async function citesteSetari(db: Db, orgId: string): Promise<SetariAgent> {
  const [r] = await db.select({ limitaZi: agentEmailSetari.limitaZi, pixelActiv: agentEmailSetari.pixelActiv }).from(agentEmailSetari).where(eq(agentEmailSetari.orgId, orgId)).limit(1);
  return r ?? { limitaZi: LIMITA_ZI_IMPLICITA, pixelActiv: false };
}

export function contPublic(r: RandCont): ContPublic {
  return {
    adresa: r.adresa,
    semnatura: r.semnatura,
    smtpHost: r.smtpHost,
    smtpPort: r.smtpPort,
    smtpUser: r.smtpUser,
    imapHost: r.imapHost,
    imapPort: r.imapPort,
    imapUser: r.imapUser,
    amprenta: r.amprenta,
    smtpTestatLa: iso(r.smtpTestatLa),
    smtpEroare: r.smtpEroare,
    imapTestatLa: iso(r.imapTestatLa),
    imapEroare: r.imapEroare,
    imapVerificatLa: iso(r.imapVerificatLa),
    imapNoi: r.imapNoi,
  };
}

export async function citesteCont(db: Db, orgId: string, userId: string): Promise<RandCont | null> {
  const [r] = await db.select().from(agentEmailConturi).where(and(eq(agentEmailConturi.orgId, orgId), eq(agentEmailConturi.userId, userId))).limit(1);
  return r ?? null;
}

// Parola în clar: doar pe server, doar pentru conectarea la SMTP / IMAP. Dacă nu mai poate fi citită (cheie de criptare schimbată), întoarce null.
export function parolaCont(r: Pick<RandCont, "parolaEnc">): string | null {
  try {
    return decripteaza(r.parolaEnc);
  } catch {
    return null;
  }
}

// ===== Mesaje =====
function mapRaspuns(r: typeof agentEmailRaspunsuri.$inferSelect): RaspunsClient {
  return { id: r.id, primitLa: r.primitLa.toISOString(), subiect: r.subiect, fragment: r.fragment, eticheta: r.eticheta as EtichetaRaspuns, automat: r.automat, citit: r.citit };
}

export function mapMesaj(r: RandMesaj, raspunsuri: RaspunsClient[], cazLink: string | null): MesajClient {
  return {
    id: r.id,
    companyId: r.companyId,
    firma: r.firmaNume,
    contactId: r.contactId,
    catre: { nume: r.catreNume, email: r.catreEmail, rol: r.catreRol },
    de: { id: r.deUserId, nume: r.deNume, email: r.deEmail },
    subiect: r.subiect,
    mesaj: r.mesaj,
    subiectAlt: r.subiectAlt,
    subiectAles: r.subiectAles === "A" || r.subiectAles === "B" || r.subiectAles === "editat" ? r.subiectAles : null,
    aiSubiect: r.aiSubiect,
    mecanism: r.mecanism as Mecanism,
    cazNume: r.cazNume,
    cazLink,
    istoric: r.istoric,
    tip: r.tip as TipMesaj,
    revenireLa: r.revenireLa,
    stare: r.stare as StareMesaj,
    eroare: r.eroare,
    creat: r.createdAt.toISOString(),
    seTrimiteLa: iso(r.seTrimiteLa),
    trimisLa: iso(r.trimisLa),
    aprobatDe: r.aprobatDeNume,
    deschis: r.deschisPrima && r.deschisUltima ? { prima: r.deschisPrima.toISOString(), ultima: r.deschisUltima.toISOString(), nr: r.deschisNr } : null,
    raspunsuri,
    apelLa: iso(r.apelLa),
    apelFacutLa: iso(r.apelFacutLa),
    salutGhicit: r.salutGhicit,
    pdfNume: r.pdfNume,
  };
}

// Ciornele netrimise + emailurile trimise în ultimul an. `doarUserId`: un membru simplu își vede doar mesajele lui; administratorul le vede pe toate.
export async function listaMesajeClient(db: Db, orgId: string, orgSlug: string, doarUserId: string | null): Promise<MesajClient[]> {
  const unAn = new Date(Date.now() - 365 * 86_400_000);
  const conditii = [eq(agentEmailMesaje.orgId, orgId), sql`${agentEmailMesaje.stare} <> 'respinsa'`, sql`(${agentEmailMesaje.stare} <> 'trimis' or coalesce(${agentEmailMesaje.trimisLa}, ${agentEmailMesaje.createdAt}) >= ${unAn.toISOString()}::timestamptz)`];
  if (doarUserId) conditii.push(eq(agentEmailMesaje.deUserId, doarUserId));
  const randuri = await db.select().from(agentEmailMesaje).where(and(...conditii)).orderBy(desc(agentEmailMesaje.createdAt)).limit(3000);
  if (!randuri.length) return [];
  const ids = randuri.map((r) => r.id);
  const raspunsuri = new Map<string, RaspunsClient[]>();
  for (let i = 0; i < ids.length; i += 500) {
    const rr = await db
      .select()
      .from(agentEmailRaspunsuri)
      .where(and(eq(agentEmailRaspunsuri.orgId, orgId), inArray(agentEmailRaspunsuri.mesajId, ids.slice(i, i + 500))))
      .orderBy(desc(agentEmailRaspunsuri.primitLa));
    for (const r of rr) raspunsuri.set(r.mesajId, [...(raspunsuri.get(r.mesajId) ?? []), mapRaspuns(r)]);
  }
  const paginiCaz = [...new Set(randuri.map((r) => r.cazPageId).filter((x): x is string => !!x))];
  const sluguri = new Map<string, string>();
  if (paginiCaz.length) {
    const pg = await db.select({ id: fundraisingPages.id, slug: fundraisingPages.slug }).from(fundraisingPages).where(and(eq(fundraisingPages.orgId, orgId), inArray(fundraisingPages.id, paginiCaz)));
    for (const p of pg) sluguri.set(p.id, p.slug);
  }
  return randuri.map((r) => mapMesaj(r, raspunsuri.get(r.id) ?? [], r.cazPageId && sluguri.get(r.cazPageId) ? linkPaginaPublica(orgSlug, sluguri.get(r.cazPageId)!) : null));
}

export async function citesteMesaj(db: Db, orgId: string, id: string): Promise<RandMesaj | null> {
  const [r] = await db.select().from(agentEmailMesaje).where(and(eq(agentEmailMesaje.orgId, orgId), eq(agentEmailMesaje.id, id))).limit(1);
  return r ?? null;
}

export const esteUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Revendică ATOMIC mesajul pentru trimitere: reușește o singură dată (al doilea clic sau al doilea tab primește null). O trimitere „se_trimite” mai veche de 10 minute poate fi reluată.
export async function revendicaPentruTrimitere(db: Db, orgId: string, id: string, date: Partial<Pick<RandMesaj, "subiect" | "mesaj" | "messageId" | "pixel" | "pdfHash" | "pdfNume" | "aprobatDe" | "aprobatDeNume" | "aprobatLa" | "subiectAles" | "referinte" | "inReplyTo">>): Promise<RandMesaj | null> {
  const acum = new Date();
  const [r] = await db
    .update(agentEmailMesaje)
    .set({ ...date, stare: "se_trimite", seTrimiteLa: acum, eroare: null, updatedAt: acum })
    .where(
      and(
        eq(agentEmailMesaje.orgId, orgId),
        eq(agentEmailMesaje.id, id),
        sql`(${agentEmailMesaje.stare} in ('ciorna', 'eroare') or (${agentEmailMesaje.stare} = 'se_trimite' and ${agentEmailMesaje.seTrimiteLa} < now() - make_interval(mins => ${MINUTE_BLOCARE_TRIMITERE})))`,
      ),
    )
    .returning();
  return r ?? null;
}

// Blochează în tranzacție orice altă trimitere către aceeași firmă (două colege nu pot trimite simultan primul email aceleiași firme).
export async function blocheazaFirma(db: Db, orgId: string, companyId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`agent-email:${orgId}:${companyId}`}))`);
}

// Ultimul prim email trimis (sau în curs de trimitere) către firmă în ultimele `zile`, altul decât `exceptId`.
export async function primMailRecent(db: Db, orgId: string, companyId: string, exceptId: string | null, zile: number): Promise<{ id: string; la: Date; deNume: string } | null> {
  const limita = new Date(Date.now() - zile * 86_400_000);
  const conditii = [
    eq(agentEmailMesaje.orgId, orgId),
    eq(agentEmailMesaje.companyId, companyId),
    eq(agentEmailMesaje.tip, "prim"),
    inArray(agentEmailMesaje.stare, ["trimis", "se_trimite"]),
    sql`coalesce(${agentEmailMesaje.trimisLa}, ${agentEmailMesaje.seTrimiteLa}) > ${limita.toISOString()}::timestamptz`,
  ];
  if (exceptId) conditii.push(sql`${agentEmailMesaje.id} <> ${exceptId}::uuid`);
  const [r] = await db
    .select({ id: agentEmailMesaje.id, trimisLa: agentEmailMesaje.trimisLa, seTrimiteLa: agentEmailMesaje.seTrimiteLa, deNume: agentEmailMesaje.deNume })
    .from(agentEmailMesaje)
    .where(and(...conditii))
    .orderBy(desc(agentEmailMesaje.createdAt))
    .limit(1);
  const la = r?.trimisLa ?? r?.seTrimiteLa;
  return r && la ? { id: r.id, la, deNume: r.deNume } : null;
}

// ===== Limita zilnică pe expeditor =====
// Rezervă un loc în ziua curentă (ora României): atomic, nu depășește niciodată limita, chiar dacă două trimiteri vin deodată.
export async function rezervaLimita(db: Db, orgId: string, userId: string, limita: number): Promise<boolean> {
  const zi = ziBucuresti(new Date());
  const r = await db.execute(sql`
    insert into agent_email_contor as c (org_id, user_id, zi, nr) values (${orgId}::uuid, ${userId}::uuid, ${zi}::date, 1)
    on conflict (org_id, user_id, zi) do update set nr = c.nr + 1 where c.nr < ${limita}
    returning nr`);
  return (r as unknown as unknown[]).length > 0;
}

export async function elibereazaLimita(db: Db, orgId: string, userId: string): Promise<void> {
  const zi = ziBucuresti(new Date());
  await db.update(agentEmailContor).set({ nr: sql`greatest(${agentEmailContor.nr} - 1, 0)` }).where(and(eq(agentEmailContor.orgId, orgId), eq(agentEmailContor.userId, userId), eq(agentEmailContor.zi, zi)));
}

export async function trimiseAzi(db: Db, orgId: string, userId: string): Promise<number> {
  const zi = ziBucuresti(new Date());
  const [r] = await db.select({ nr: agentEmailContor.nr }).from(agentEmailContor).where(and(eq(agentEmailContor.orgId, orgId), eq(agentEmailContor.userId, userId), eq(agentEmailContor.zi, zi))).limit(1);
  return r?.nr ?? 0;
}

// ===== PDF =====
export const amprentaPdf = (base64: string): string => createHash("sha256").update(base64).digest("hex").slice(0, 24);

export type PdfAtasat = { nume: string; base64: string; marime: number; sursa: "firma" | "general"; hash: string };

// PDF-ul care s-ar atașa ACUM: al firmei (dacă există), altfel cel general al organizației; cu amprenta lui.
export async function pdfPentru(db: Db, orgId: string, companyId: string): Promise<PdfAtasat | null> {
  const randuri = await db
    .select({ nume: agentEmailPdf.nume, continut: agentEmailPdf.continutB64, marime: agentEmailPdf.marime, hash: agentEmailPdf.hash, companyId: agentEmailPdf.companyId })
    .from(agentEmailPdf)
    .where(and(eq(agentEmailPdf.orgId, orgId), sql`(${agentEmailPdf.companyId} = ${companyId}::uuid or ${agentEmailPdf.companyId} is null)`));
  const r = randuri.find((x) => x.companyId) ?? randuri.find((x) => !x.companyId);
  return r ? { nume: r.nume, base64: r.continut, marime: r.marime, sursa: r.companyId ? "firma" : "general", hash: r.hash } : null;
}

// Doar „există + când” (fără conținut), pentru lista de firme.
export async function firmeCuPdf(db: Db, orgId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const r = await db.select({ c: agentEmailPdf.companyId }).from(agentEmailPdf).where(and(eq(agentEmailPdf.orgId, orgId), inArray(agentEmailPdf.companyId, ids)));
  return new Set(r.map((x) => x.c).filter((x): x is string => !!x));
}

export async function pdfGeneralInfo(db: Db, orgId: string): Promise<PdfGeneral | null> {
  const [r] = await db
    .select({ nume: agentEmailPdf.nume, marime: agentEmailPdf.marime, la: agentEmailPdf.createdAt, de: agentEmailPdf.incarcatDeNume, hash: agentEmailPdf.hash })
    .from(agentEmailPdf)
    .where(and(eq(agentEmailPdf.orgId, orgId), isNull(agentEmailPdf.companyId)))
    .limit(1);
  return r ? { nume: r.nume, marime: r.marime, la: r.la.toISOString(), de: r.de, hash: r.hash } : null;
}

// ===== Suprimări =====
// Adrese care nu mai trebuie contactate: dezabonări / refuzuri (email_suppression, doar amprenta) și „nu mai căuta” de la prospectare (aceeași regulă ca la decidenți).
export async function construiesteSuprimare(db: Db, orgId: string): Promise<(emailMinuscule: string) => boolean> {
  const [hashuri, prospectare] = await Promise.all([
    db.select({ h: emailSuppression.emailHash }).from(emailSuppression).where(eq(emailSuppression.orgId, orgId)),
    db.select({ v: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(and(eq(prospectareSuprimati.orgId, orgId), eq(prospectareSuprimati.tip, "email"))),
  ]);
  const h = new Set(hashuri.map((x) => x.h));
  // Rândurile vechi sunt adrese în clar, cele noi amprente HMAC: setul le recunoaște pe ambele.
  const e = new SetSuprimate(orgId, "email", prospectare.map((x) => (esteAmprentaHmac(x.v) ? x.v : x.v.trim().toLowerCase())));
  return (email) => e.has(email) || h.has(hashSuprimare(orgId, email));
}

export async function adaugaSuprimare(db: Db, orgId: string, email: string, motiv: string): Promise<void> {
  await db.insert(emailSuppression).values({ orgId, emailHash: hashSuprimare(orgId, email), motiv }).onConflictDoNothing();
}

// ===== Curățenie =====
// Ciornele netrimise mai vechi de `zile` (datele firmei s-au putut schimba) se șterg; emailurile trimise rămân.
export async function stergeCiorneExpirate(db: Db, orgId: string, zile: number): Promise<number> {
  const limita = new Date(Date.now() - zile * 86_400_000);
  const expirate = and(eq(agentEmailMesaje.orgId, orgId), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"]), sql`${agentEmailMesaje.createdAt} < ${limita.toISOString()}::timestamptz`);
  // Revenirile expirate nu se șterg (altfel cron-ul ar scrie alta în ziua următoare, cu cost AI): devin „respinsa”, fără datele persoanei.
  const respinse = await respingeReveniri(db, and(expirate, eq(agentEmailMesaje.tip, "revenire")));
  const r = await db.delete(agentEmailMesaje).where(and(expirate, eq(agentEmailMesaje.tip, "prim"))).returning({ id: agentEmailMesaje.id });
  return r.length + respinse;
}

// Revenire respinsă (de om sau expirată): rămâne doar marcajul că a existat (ca să nu fie regenerată), fără textul și datele destinatarului.
export async function respingeReveniri(db: Db, conditie: SQL | undefined): Promise<number> {
  const r = await db
    .update(agentEmailMesaje)
    .set({ stare: "respinsa", mesaj: "", subiect: "[respins]", subiectAlt: null, subiectAles: null, aiSubiect: null, aiMesaj: null, istoric: null, catreNume: "[respins]", catreEmail: "[respins]", catreRol: null, eroare: null, updatedAt: new Date() })
    .where(conditie)
    .returning({ id: agentEmailMesaje.id });
  return r.length;
}
