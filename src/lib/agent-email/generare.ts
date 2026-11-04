import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { apeleazaClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi } from "@/lib/ai-org/consum-server";
import { UTILIZARE_GOALA, type Utilizare } from "@/lib/ai-org/pret";
import type { Loc } from "@/lib/ai-org/protocol";
import type { OrgContext } from "@/lib/auth/guard";
import { agentEmailMesaje, appUsers, companies, companySponsorizari, contacts, fundraisingPages, memberships } from "@/lib/db/schema";
import { ferestreFiscale } from "@/lib/ferestre-fiscale";
import { esteEligibilaD177, sumaEfectiva } from "@/lib/prioritizare-firme";
import { sarbatoriRo } from "@/lib/sarbatori-ro";
import { propozitieSezon } from "@/lib/script-apel";

import { citesteEmail, mesajEmail, MAX_INSTRUCTIUNI, systemEmail, type CerereEmail, type EmailScris } from "./prompt";
import {
  alegeDestinatar,
  asiguraSalut,
  extrageJson,
  firmaEligibila,
  MAX_FIRME_PE_GENERARE,
  numeCurat,
  salutPentru,
  sloturiApel,
  STILURI_EMAIL,
  ZILE_FARA_DUBLURA,
  type ContactCandidat,
  type Mecanism,
  type MotivRespins,
} from "./reguli";
import { citesteCont, construiesteSuprimare, esteUuid, linkPaginaPublica, primMailRecent, type Db } from "./store";

// Generarea ciornelor cu AI, în trei faze (vezi withOrgFaze): 1) în tranzacție scurtă citim firmele, alegem destinatarul și verificăm eligibilitatea;
// 2) fără bază de date, apelăm Claude (cheia organizației); 3) înregistrăm consumul și salvăm ciornele. NIMIC nu se trimite aici: ciornele așteaptă aprobarea omului.

type Tr = (ro: string, en: string) => string;

export type ParametriGenerare = {
  companyIds: string[];
  mecanism: Mecanism;
  cazId?: string;
  deId: string;
  instructiuni: string;
  doarCuAcord: boolean;
  inlocuiesteId?: string | null;
  variantaAnterioara?: { subiect: string; deschidere: string } | null;
};

export type ElementGenerare = {
  companyId: string;
  firma: string;
  contact: { id: string; nume: string; email: string; rol: string | null };
  cerere: CerereEmail;
  istoric: string | null;
  salutGhicit: boolean;
  mecanism: Mecanism;
  cazPageId: string | null;
  cazNume: string | null;
  inlocuiesteId: string | null;
};

export type PregatitGenerare = {
  orgId: string;
  userId: string;
  userNume: string;
  cheie: string;
  model: string;
  locale: Loc;
  orgNume: string;
  expeditor: { id: string; nume: string; email: string };
  elemente: ElementGenerare[];
  erori: string[];
};

export type RezultatAiElement =
  | { ok: true; email: EmailScris; utilizare: Utilizare; costUsd: number; model: string }
  | { ok: false; eroare: string; utilizare: Utilizare; costUsd: number; model: string };

export const esteSarbatoare = (iso: string): boolean => sarbatoriRo(Number(iso.slice(0, 4))).has(iso);

const prenumeSiNume = (u: { name: string | null; email: string }): string => (u.name ?? "").trim() || u.email.split("@")[0];

export function textMotivContact(t: Tr, motive: MotivRespins[], doarCuAcord: boolean): string {
  if (!motive.length) return t("nu are nicio persoană de contact în CRM.", "has no contact person in the CRM.");
  const are = (m: MotivRespins) => motive.includes(m);
  if (doarCuAcord && are("fara_acord")) return t("persoanele de contact nu au acord pentru email (debifează „Doar contacte cu acord pentru email” ca să apară și cele cu acord necunoscut).", "the contacts have no email consent (untick “Only contacts with email consent” to include those with unknown consent).");
  if (are("acord_refuzat")) return t("persoanele de contact cu email au refuzat să fie contactate.", "the contacts with an email address declined to be contacted.");
  if (are("suprimat")) return t("adresa e pe lista de dezabonări sau „nu mai căuta”.", "the address is on the unsubscribe or “do not contact” list.");
  if (are("email_marcat_invalid") || are("email_invalid")) return t("adresele de email ale persoanelor de contact sunt invalide.", "the contacts' email addresses are invalid.");
  if (are("adresa_generica")) return t("singura adresă e una automată (noreply).", "the only address is an automated one (noreply).");
  return t("nicio persoană de contact nu are adresă de email.", "no contact has an email address.");
}

function textMotivFirma(t: Tr, m: NonNullable<ReturnType<typeof firmaEligibila>>): string {
  switch (m) {
    case "stearsa":
      return t("firma a fost ștearsă din CRM.", "the company was deleted from the CRM.");
    case "respinsa":
      return t("firma e marcată „Respins” în CRM.", "the company is marked “Lost” in the CRM.");
    case "in_contract":
      return t("firma e deja în etapa de contract sau sponsor: discutați direct, nu printr-un email de prim contact.", "the company is already at contract stage or a sponsor: talk to them directly, not through a first-contact email.");
    case "scris_recent":
      return t(`a primit deja un email prin agent în ultimele ${ZILE_FARA_DUBLURA} de zile.`, `already received an agent email in the last ${ZILE_FARA_DUBLURA} days.`);
    default:
      return t("o altă colegă i-a scris deja.", "a colleague has already written to them.");
  }
}

const lei = (n: number) => n.toLocaleString("ro-RO");

// Ce știm din CRM despre colaborarea anterioară (sponsorizări cu dată), într-o propoziție pe an; null = firmă nouă pentru noi.
function textIstoric(rows: { data: string; suma: number; proiect: string | null }[], esteSponsor: boolean): string | null {
  const parti = rows.slice(0, 4).map((r) => `${r.data.slice(0, 4)}: sponsorizare de ${lei(r.suma)} lei${r.proiect ? ` (${r.proiect.slice(0, 80)})` : ""}`);
  if (parti.length) return parti.join("; ");
  return esteSponsor ? "este marcată ca sponsor în CRM (fără detalii despre sumă sau an)" : null;
}

const primaFraza = (m: string): string => (m.split(/\n\s*\n/)[1] || "").split(/(?<=[.!?])\s/)[0]?.slice(0, 160) || "";

export async function pregatesteGenerare(
  ctx: OrgContext,
  locale: Loc,
  t: Tr,
  p: ParametriGenerare,
): Promise<{ gata: { ok: false; error: string } } | { pregatit: PregatitGenerare }> {
  const ids = [...new Set(p.companyIds)].filter(esteUuid).slice(0, MAX_FIRME_PE_GENERARE);
  if (!ids.length) return { gata: { ok: false, error: t("Alege cel puțin o firmă.", "Choose at least one company.") } };
  if (!esteUuid(p.deId)) return { gata: { ok: false, error: t("Alege expeditorul.", "Choose the sender.") } };

  const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
  if (!cfg.conectat || !cfg.cheie) return { gata: { ok: false, error: mesajFaraCheieAi(locale, cfg.ilizibila) } };

  // Expeditorul: un membru simplu scrie doar în numele lui; administratorul poate pregăti ciorne pentru colegii care și-au conectat căsuța.
  const admin = ctx.role === "owner" || ctx.role === "admin";
  if (p.deId !== ctx.userId && !admin) return { gata: { ok: false, error: t("Poți scrie ciorne doar în numele tău.", "You can only write drafts in your own name.") } };
  const [expeditor] = await ctx.db
    .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, p.deId)))
    .limit(1);
  if (!expeditor) return { gata: { ok: false, error: t("Expeditorul nu face parte din organizație.", "The sender is not part of the organization.") } };
  const cont = await citesteCont(ctx.db, ctx.orgId, p.deId);
  if (!cont) return { gata: { ok: false, error: t(`${prenumeSiNume(expeditor)} nu și-a conectat căsuța de email (Setări → Căsuța mea de email). Fără ea, emailul nu poate pleca.`, `${prenumeSiNume(expeditor)} has not connected their mailbox (Settings → My mailbox). Without it the email cannot be sent.`) } };

  // Cazul propus: doar o campanie cu pagină publică ACTIVĂ și cu acordul publicării (aceeași regulă ca la pagina publică). Trimitem modelului doar ce e deja public: titlul, locul, sumele și linkul.
  let caz: CerereEmail["caz"] = null;
  let cazPageId: string | null = null;
  if (p.mecanism === "caz") {
    if (!esteUuid(p.cazId)) return { gata: { ok: false, error: t("Alege campania pentru care scrii.", "Choose the campaign you are writing about.") } };
    const [pg] = await ctx.db
      .select({ id: fundraisingPages.id, slug: fundraisingPages.slug, titlu: fundraisingPages.titlu, judet: fundraisingPages.judet, localitate: fundraisingPages.localitate, sumaTinta: fundraisingPages.sumaTinta, sumaStransa: fundraisingPages.sumaStransa, status: fundraisingPages.status, acord: fundraisingPages.consimtamantGdpr })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.id, p.cazId)))
      .limit(1);
    if (!pg) return { gata: { ok: false, error: t("Campania nu mai există.", "The campaign no longer exists.") } };
    if (pg.status !== "activa" || !pg.acord) return { gata: { ok: false, error: t("Campania nu poate fi propusă firmelor: pagina ei publică nu e activă sau lipsește acordul pentru publicare.", "This campaign cannot be proposed to companies: its public page is not active or the publishing consent is missing.") } };
    caz = { titlu: pg.titlu.slice(0, 160), localitate: pg.localitate, judet: pg.judet, link: linkPaginaPublica(ctx.orgSlug, pg.slug), sumaTinta: pg.sumaTinta, sumaStransa: pg.sumaStransa };
    cazPageId = pg.id;
  }

  const firme = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      stage: companies.stage,
      status: companies.status,
      stergeLa: companies.deletedAt,
      localitate: companies.localitate,
      judet: companies.judet,
      industrie: companies.industrie,
      caen: companies.caen,
      site: companies.site,
      nrAngajati: companies.nrAngajati,
      regimFiscal: companies.regimFiscal,
      profit: companies.profit,
      ca: companies.ca,
      impozit: companies.impozit,
      sumaDisponibila: companies.sumaDisponibila,
      sumaSponsorizata: companies.sumaSponsorizata,
      d177Incasat: companies.d177Incasat,
    })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), inArray(companies.id, ids)));
  const contacteToate = await ctx.db.select().from(contacts).where(and(eq(contacts.orgId, ctx.orgId), inArray(contacts.companyId, ids)));
  const sponsorizari = await ctx.db
    .select({ companyId: companySponsorizari.companyId, data: companySponsorizari.data, suma: companySponsorizari.suma, proiect: companySponsorizari.proiect })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.orgId, ctx.orgId), inArray(companySponsorizari.companyId, ids)))
    .orderBy(desc(companySponsorizari.data))
    .limit(200);
  const recente = await ctx.db
    .select({ subiect: agentEmailMesaje.subiect, mesaj: agentEmailMesaje.mesaj })
    .from(agentEmailMesaje)
    .where(and(eq(agentEmailMesaje.orgId, ctx.orgId), eq(agentEmailMesaje.tip, "prim")))
    .orderBy(desc(agentEmailMesaje.createdAt))
    .limit(10);
  const suprimat = await construiesteSuprimare(ctx.db, ctx.orgId);

  const acum = new Date();
  const ferestre = ferestreFiscale(acum);
  const sezon = propozitieSezon(ferestre);
  const sloturi = sloturiApel(acum, esteSarbatoare);
  const deEvitat = recente.flatMap((v) => [v.subiect, primaFraza(v.mesaj)]).filter(Boolean);
  let stilIdx = Math.floor(Math.random() * STILURI_EMAIL.length);

  const erori: string[] = [];
  const elemente: ElementGenerare[] = [];
  for (const id of ids) {
    const f = firme.find((x) => x.id === id);
    if (!f) continue;
    const motivFirma = firmaEligibila(
      { stergeLa: f.stergeLa ? f.stergeLa.toISOString() : null, status: f.status, stage: f.stage, tip: "prim", ultimulPrimMail: (await primMailRecent(ctx.db, ctx.orgId, id, p.inlocuiesteId ?? null, ZILE_FARA_DUBLURA))?.la ?? null },
      acum,
    );
    if (motivFirma) {
      erori.push(`${f.nume}: ${textMotivFirma(t, motivFirma)}`);
      continue;
    }
    if (p.mecanism === "d177" && !esteEligibilaD177({ regimFiscal: f.regimFiscal, profit: f.profit, ca: f.ca })) {
      erori.push(`${f.nume}: ${t("D177 se aplică firmelor care plătesc impozit pe profit; aceasta pare microîntreprindere sau fără profit. Propune sponsorizare sau alege altă firmă.", "D177 applies to companies paying profit tax; this one looks like a micro-company or without profit. Offer sponsorship or pick another company.")}`);
      continue;
    }
    const cc: ContactCandidat[] = contacteToate
      .filter((c) => c.companyId === id)
      .map((c) => ({ id: c.id, nume: c.nume, rol: c.rol, dept: c.dept, email: c.email, acord: c.consentStatus, cheie: c.cheie, emailStatus: c.emailStatus, creat: c.createdAt.toISOString() }));
    const alegere = alegeDestinatar(cc, { doarCuAcord: p.doarCuAcord, suprimat });
    if (!alegere.contact) {
      erori.push(`${f.nume}: ${textMotivContact(t, alegere.respinse.map((r) => r.motiv), p.doarCuAcord)}`);
      continue;
    }
    const destinatar = alegere.contact;
    const nume = numeCurat(destinatar.nume);
    const { salut, ghicit } = salutPentru(nume);
    const spon = sponsorizari.filter((s) => s.companyId === id).map((s) => ({ data: s.data, suma: s.suma, proiect: s.proiect }));
    const istoric = textIstoric(spon, f.status === "won" || (f.sumaSponsorizata ?? 0) > 0 || f.d177Incasat);
    const suma = sumaEfectiva(f.sumaDisponibila, { regimFiscal: f.regimFiscal, profit: f.profit, ca: f.ca, impozit: f.impozit });
    elemente.push({
      companyId: id,
      firma: f.nume,
      contact: { id: destinatar.id, nume, email: (destinatar.email ?? "").trim().toLowerCase(), rol: destinatar.rol },
      istoric,
      salutGhicit: ghicit,
      mecanism: p.mecanism,
      cazPageId,
      cazNume: caz?.titlu ?? null,
      inlocuiesteId: p.inlocuiesteId ?? null,
      cerere: {
        organizatie: ctx.orgName,
        firma: f.nume,
        localitate: f.localitate,
        judet: f.judet,
        domeniu: f.industrie ?? f.caen,
        site: f.site,
        nrAngajati: f.nrAngajati,
        destinatar: { nume, rol: destinatar.rol },
        expeditor: { nume: prenumeSiNume(expeditor) },
        mecanism: p.mecanism,
        caz,
        istoric,
        sezon,
        ferestre: ferestre.map((x) => ({ titlu: x.titlu, termen: x.termenText, zileRamase: x.zileRamase })),
        sumaOrientativa: suma.suma > 0 ? suma.suma : null,
        sumaEstimata: suma.estimata,
        salut,
        sloturi,
        stil: STILURI_EMAIL[stilIdx++ % STILURI_EMAIL.length],
        deEvitat: [...deEvitat],
        instructiuni: p.instructiuni.slice(0, MAX_INSTRUCTIUNI),
        varianta_anterioara: p.variantaAnterioara ?? null,
      },
    });
    // Și în același lot, emailurile să nu semene între ele.
    deEvitat.unshift(`stil: ${STILURI_EMAIL[(stilIdx - 1) % STILURI_EMAIL.length].slice(0, 60)}`);
  }
  if (!elemente.length) return { gata: { ok: false, error: erori[0] ?? t("Nicio firmă eligibilă.", "No eligible company.") } };
  return {
    pregatit: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      userNume: ctx.userName ?? ctx.userEmail,
      cheie: cfg.cheie,
      model: cfg.model,
      locale,
      orgNume: ctx.orgName,
      expeditor: { id: expeditor.id, nume: prenumeSiNume(expeditor), email: cont.adresa },
      elemente,
      erori,
    },
  };
}

async function laLimita<T, R>(items: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const rezultate: R[] = new Array(items.length);
  let urmator = 0;
  const lucratori = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (urmator < items.length) {
      const i = urmator++;
      rezultate[i] = await fn(items[i]);
    }
  });
  await Promise.all(lucratori);
  return rezultate;
}

// Faza 2: apelurile către Claude (3 odată), FĂRĂ bază de date. Un eșec la o firmă nu le oprește pe celelalte.
export async function ruleazaAiGenerare(p: PregatitGenerare): Promise<RezultatAiElement[]> {
  return laLimita(p.elemente, 3, async (el): Promise<RezultatAiElement> => {
    try {
      const r = await apeleazaClaude({
        cheie: p.cheie,
        model: p.model,
        system: systemEmail(p.orgNume),
        mesaje: [{ role: "user", content: mesajEmail(el.cerere) }],
        maxTokens: 4000,
        efort: "medium",
        timeoutMs: 100_000,
        termenTotalMs: 110_000,
        locale: p.locale,
      });
      if (!r.ok) return { ok: false, eroare: r.eroare, utilizare: r.utilizare, costUsd: r.costUsd, model: r.model };
      const email = citesteEmail(r.text, extrageJson);
      if (!email) return { ok: false, eroare: p.locale === "ro" ? "AI-ul nu a întors un email valid. Încearcă din nou." : "The AI did not return a valid email. Please try again.", utilizare: r.utilizare, costUsd: r.costUsd, model: r.model };
      return { ok: true, email, utilizare: r.utilizare, costUsd: r.costUsd, model: r.model };
    } catch {
      return { ok: false, eroare: p.locale === "ro" ? "Eroare neașteptată la generare. Încearcă din nou." : "Unexpected error while generating. Please try again.", utilizare: UTILIZARE_GOALA, costUsd: 0, model: p.model };
    }
  });
}

// Faza 3: consumul se înregistrează ÎNTÂI (și pentru apelurile eșuate parțial), apoi se salvează ciornele. O singură ciornă netrimisă per firmă și expeditor: cea nouă o înlocuiește pe a lui.
export async function salveazaGenerare(db: Db, p: PregatitGenerare, rez: RezultatAiElement[]): Promise<{ create: number; erori: string[] }> {
  const erori = [...p.erori];
  let create = 0;
  // „Șterge ciorna veche + inserează cea nouă” nu e atomic fără blocare: două generări simultane pentru aceeași firmă ar lăsa două ciorne (invariantul: una pe firmă și expeditor).
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`agent-email-generare:${p.orgId}`}))`);
  for (let i = 0; i < p.elemente.length; i++) {
    const el = p.elemente[i];
    const r = rez[i];
    await inregistreazaConsum(db, { orgId: p.orgId, userId: p.userId, instrument: "agent_email", model: r.model, utilizare: r.utilizare, costUsd: r.costUsd });
    if (!r.ok) {
      erori.push(`${el.firma}: ${r.eroare}`);
      continue;
    }
    const mesaj = asiguraSalut(r.email.mesaj, el.cerere.salut);
    await db
      .delete(agentEmailMesaje)
      .where(
        and(
          eq(agentEmailMesaje.orgId, p.orgId),
          inArray(agentEmailMesaje.stare, ["ciorna", "eroare"]),
          sql`(${agentEmailMesaje.id} = ${el.inlocuiesteId ?? "00000000-0000-0000-0000-000000000000"}::uuid or (${agentEmailMesaje.companyId} = ${el.companyId}::uuid and ${agentEmailMesaje.deUserId} = ${p.expeditor.id}::uuid and ${agentEmailMesaje.tip} = 'prim'))`,
        ),
      );
    await db.insert(agentEmailMesaje).values({
      orgId: p.orgId,
      companyId: el.companyId,
      contactId: el.contact.id,
      firmaNume: el.firma,
      catreNume: el.contact.nume,
      catreEmail: el.contact.email,
      catreRol: el.contact.rol,
      deUserId: p.expeditor.id,
      deNume: p.expeditor.nume,
      deEmail: p.expeditor.email,
      subiect: r.email.subiect,
      mesaj,
      subiectAlt: r.email.subiectAlt || null,
      aiSubiect: r.email.subiect,
      aiMesaj: mesaj,
      mecanism: el.mecanism,
      cazPageId: el.cazPageId,
      cazNume: el.cazNume,
      istoric: el.istoric,
      tip: "prim",
      stare: "ciorna",
      creatDe: p.userId,
      creatDeNume: p.userNume,
      salutGhicit: el.salutGhicit,
    });
    create++;
  }
  return { create, erori };
}

