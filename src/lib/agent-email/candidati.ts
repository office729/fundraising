import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { agentEmailMesaje, companies, contacts } from "@/lib/db/schema";
import { patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { esteEligibilaD177, sumaEfectiva } from "@/lib/prioritizare-firme";
import { calculeazaScor } from "@/lib/scor-companie";

import { alegeDestinatar, doarCuAcordEfectiv, ETAPE_INITIALE, ZILE_FARA_DUBLURA, type ContactCandidat } from "./reguli";
import { construiesteSuprimare, esteUuid, firmeCuPdf } from "./store";
import type { CandidatAgent, FiltreCandidati, RezultatCandidati } from "./tipuri";

// Firmele care pot primi un email de la agent: ale responsabilului ales, cu filtre (sponsori / nesponsori, scor minim, doar cu acord de email, D177 / 20% marcat, ordonare).
// Fiecare firmă are DEJA destinatarul ales (contact direct, altfel decidentul cu cel mai bun rol); cele fără un destinatar eligibil sau scrise recent nu apar în listă (doar în numărătoare).

const PLAFON_LISTA = 200;
const PLAFON_FIRME = 1500;
const bucati = <T,>(v: readonly T[], n: number): T[][] => Array.from({ length: Math.ceil(v.length / n) }, (_, i) => v.slice(i * n, i * n + n));

// `rol`: doar owner/admin pot scoate restricția „doar contacte cu acord”; pentru un membru simplu rămâne activă oricâte valori ar trimite clientul (vezi doarCuAcordEfectiv).
export function curataFiltre(f: Partial<FiltreCandidati>, rol: string): FiltreCandidati {
  return {
    q: String(f.q ?? "").trim().slice(0, 80),
    responsabilId: esteUuid(f.responsabilId) ? f.responsabilId : "",
    tip: f.tip === "sponsori" || f.tip === "noi" ? f.tip : "toate",
    mecanism: f.mecanism === "d177" || f.mecanism === "mec20" ? f.mecanism : "toate",
    scorMin: Math.max(0, Math.min(100, Math.floor(Number(f.scorMin) || 0))),
    doarCuAcord: doarCuAcordEfectiv(f.doarCuAcord, rol),
    ordine: f.ordine === "nume" ? "nume" : "scor",
  };
}

export async function cautaCandidati(ctx: OrgContext, brut: Partial<FiltreCandidati>): Promise<RezultatCandidati> {
  const f = curataFiltre(brut, ctx.role);
  // Scris cu numele tabelului, nu cu coloanele Drizzle: în lista SELECT Drizzle omite prefixul tabelului, iar în subinterogare "id" ar însemna s.id.
  const sponsorSql = sql`(coalesce(companies.suma_sponsorizata, 0) > 0 or companies.status = 'won' or exists (select 1 from company_sponsorizari s where s.company_id = companies.id and s.org_id = companies.org_id))`;
  const conditii = [eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt), sql`${companies.status} <> 'lost'`];
  // Sponsorii noștri se recontactă din orice etapă; ceilalți, doar dacă sunt la început de drum.
  if (f.tip !== "sponsori") conditii.push(inArray(companies.stage, [...ETAPE_INITIALE] as ("nou" | "pe_viitor" | "email" | "mesaj")[]));
  if (f.tip === "sponsori") conditii.push(sponsorSql);
  if (f.tip === "noi") conditii.push(sql`not ${sponsorSql}`);
  if (f.q) conditii.push(sql`${sqlFaraDiacritice(companies.nume)} like ${patternLike(f.q)}`);
  if (f.responsabilId) conditii.push(eq(companies.ownerId, f.responsabilId));
  if (f.mecanism === "d177") conditii.push(eq(companies.d177, true));
  if (f.mecanism === "mec20") conditii.push(eq(companies.mec20, true));

  const firme = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      stage: companies.stage,
      localitate: companies.localitate,
      judet: companies.judet,
      d177: companies.d177,
      mec20: companies.mec20,
      ca: companies.ca,
      profit: companies.profit,
      impozit: companies.impozit,
      regimFiscal: companies.regimFiscal,
      nrAngajati: companies.nrAngajati,
      sumaDisponibila: companies.sumaDisponibila,
      sumaSponsorizata: companies.sumaSponsorizata,
      recurent: companies.recurent,
      temperatura: companies.temperatura,
      sponsor: sponsorSql.mapWith(Boolean),
    })
    .from(companies)
    .where(and(...conditii))
    .orderBy(asc(companies.nume))
    .limit(PLAFON_FIRME);
  const ids = firme.map((x) => x.id);
  if (!ids.length) return { lista: [], total: 0, plafonat: false, explicatie: { firme: 0, faraContactBun: 0, scriseRecent: 0 } };

  const contacteToate: (typeof contacts.$inferSelect)[] = [];
  const recente = new Set<string>();
  const cuCiorna = new Set<string>();
  const limitaRecent = new Date(Date.now() - ZILE_FARA_DUBLURA * 86_400_000);
  for (const grup of bucati(ids, 500)) {
    contacteToate.push(...(await ctx.db.select().from(contacts).where(and(eq(contacts.orgId, ctx.orgId), inArray(contacts.companyId, grup)))));
    const mesaje = await ctx.db
      .select({ companyId: agentEmailMesaje.companyId, stare: agentEmailMesaje.stare, deUserId: agentEmailMesaje.deUserId, trimisLa: agentEmailMesaje.trimisLa, seTrimiteLa: agentEmailMesaje.seTrimiteLa, tip: agentEmailMesaje.tip })
      .from(agentEmailMesaje)
      .where(and(eq(agentEmailMesaje.orgId, ctx.orgId), inArray(agentEmailMesaje.companyId, grup), inArray(agentEmailMesaje.stare, ["ciorna", "eroare", "trimis", "se_trimite"])));
    for (const m of mesaje) {
      if ((m.stare === "ciorna" || m.stare === "eroare") && m.deUserId === ctx.userId && m.tip === "prim") cuCiorna.add(m.companyId);
      const la = m.trimisLa ?? m.seTrimiteLa;
      if ((m.stare === "trimis" || m.stare === "se_trimite") && m.tip === "prim" && la && la > limitaRecent) recente.add(m.companyId);
    }
  }
  const suprimat = await construiesteSuprimare(ctx.db, ctx.orgId);

  let faraContactBun = 0;
  let scriseRecent = 0;
  const lista: CandidatAgent[] = [];
  for (const fi of firme) {
    if (recente.has(fi.id)) {
      scriseRecent++;
      continue;
    }
    const cc: ContactCandidat[] = contacteToate
      .filter((c) => c.companyId === fi.id)
      .map((c) => ({ id: c.id, nume: c.nume, rol: c.rol, dept: c.dept, email: c.email, acord: c.consentStatus, cheie: c.cheie, emailStatus: c.emailStatus, creat: c.createdAt.toISOString() }));
    const alegere = alegeDestinatar(cc, { doarCuAcord: f.doarCuAcord, suprimat });
    if (!alegere.contact) {
      faraContactBun++;
      continue;
    }
    const suma = sumaEfectiva(fi.sumaDisponibila, { regimFiscal: fi.regimFiscal, profit: fi.profit, ca: fi.ca, impozit: fi.impozit });
    const scor = calculeazaScor({
      sumaDisponibila: suma.suma,
      sumaEstimata: suma.estimata,
      ca: fi.ca,
      profit: fi.profit,
      nrAngajati: fi.nrAngajati,
      recurent: fi.recurent,
      temperatura: fi.temperatura,
      sumaSponsorizata: fi.sumaSponsorizata,
      stage: fi.stage,
      contacte: cc.map((c) => ({ dept: c.dept, cheie: c.cheie })),
    }).total;
    if (scor < f.scorMin) continue;
    const c = alegere.contact;
    lista.push({
      id: fi.id,
      nume: fi.nume,
      stage: fi.stage,
      loc: [fi.localitate, fi.judet].filter(Boolean).join(", ") || null,
      scor,
      sponsor: fi.sponsor,
      sumaSponsorizata: fi.sumaSponsorizata ?? 0,
      mecanismMarcat: [...(fi.d177 ? (["d177"] as const) : []), ...(fi.mec20 ? (["mec20"] as const) : [])],
      neeligibilD177: !esteEligibilaD177({ regimFiscal: fi.regimFiscal, profit: fi.profit, ca: fi.ca }),
      contact: { id: c.id, nume: c.nume, rol: c.rol, email: (c.email ?? "").trim().toLowerCase(), acord: c.acord === "da" ? "da" : "necunoscut", cheie: c.cheie },
      pdfFirma: false,
      areCiorna: cuCiorna.has(fi.id),
    });
  }
  if (f.ordine === "scor") lista.sort((a, b) => b.scor - a.scor || a.nume.localeCompare(b.nume, "ro"));
  const total = lista.length;
  const taiata = lista.slice(0, PLAFON_LISTA);
  const cuPdf = await firmeCuPdf(ctx.db, ctx.orgId, taiata.map((x) => x.id));
  for (const x of taiata) x.pdfFirma = cuPdf.has(x.id);
  return { lista: taiata, total, plafonat: total > PLAFON_LISTA, explicatie: { firme: firme.length, faraContactBun, scriseRecent } };
}

