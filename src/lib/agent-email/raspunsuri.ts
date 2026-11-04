import "server-only";

import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { apeleazaClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum } from "@/lib/ai-org/consum-server";
import { UTILIZARE_GOALA, type Utilizare } from "@/lib/ai-org/pret";
import type { Loc } from "@/lib/ai-org/protocol";
import { agentEmailConturi, agentEmailMesaje, agentEmailRaspunsuri, companies, companyNotite, companyStageLog, contacts } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

import { citesteRaspunsuriImap, type ConexiuneImap, type RaspunsBrut } from "./conexiuni";
import { mesajEticheta, systemEticheta } from "./prompt";
import { esteRaspunsAutomat, etichetaRapida, fragmentRaspuns, parseazaEticheta, potrivesteMesaj, type MesajAsteptat } from "./raspunsuri-reguli";
import { ETAPE_INITIALE, type EtichetaRaspuns } from "./reguli";
import { adaugaSuprimare, parolaCont, type Db } from "./store";

// Citirea răspunsurilor (IMAP) din căsuța fiecărui coleg care a trimis emailuri prin agent. Trei faze, ca la orice funcție lentă:
//  1) tranzacție scurtă: conturile, mesajele așteptate, cheia AI; contul se „închiriază” 5 minute (două verificări simultane nu se calcă);
//  2) fără bază de date: IMAP + etichetarea AI;
//  3) tranzacție nouă: răspunsurile (unice pe Message-ID), consumul AI, nota pe firmă, dreptul de opoziție (STOP / refuz), etapa.
// Doar CITIM din căsuță (INBOX, readOnly); nu ștergem, nu mutăm și nu marcăm nimic ca citit.

const ZILE_URMARIRE = 120;
const MAX_PE_ADRESA = 8;
const MAX_ETICHETARI_AI = 15;
const MINUTE_LACAT = 5;

type MesajUrmarit = MesajAsteptat & { companyId: string; contactId: string | null; firma: string; catreNume: string; deUserId: string; subiectReal: string; emailDestinatar: string };

type ContDeCitit = {
  contId: string;
  userId: string;
  adresa: string;
  conexiune: ConexiuneImap;
  mesaje: MesajUrmarit[];
  deja: Set<string>;
};

export type PregatitCitire = {
  orgId: string;
  orgNume: string;
  locale: Loc;
  ai: { cheie: string; model: string } | null;
  conturi: ContDeCitit[];
  eroriInitiale: { contId: string; adresa: string; eroare: string }[];
  deadline: number;
};

export type RaspunsProcesat = {
  mesajId: string;
  companyId: string;
  contactId: string | null;
  firma: string;
  catreNume: string;
  subiectMesaj: string;
  deUserId: string;
  messageIdRaspuns: string;
  deLa: string;
  primitLa: Date;
  subiect: string;
  fragment: string;
  eticheta: EtichetaRaspuns;
  automat: boolean;
  ai: { utilizare: Utilizare; costUsd: number; model: string } | null;
};

export type RezultatCitire = { conturi: { contId: string; ok: boolean; eroare: string | null; raspunsuri: RaspunsProcesat[] }[] };

// Faza 1. `doarUserId`: verificarea manuală citește doar căsuța celui care a apăsat butonul; cron-ul le citește pe toate.
export async function pregatesteCitirea(db: Db, o: { orgId: string; orgNume: string; locale: Loc; doarUserId?: string; durataMs?: number }): Promise<PregatitCitire> {
  const conturiDb = await db
    .select()
    .from(agentEmailConturi)
    .where(o.doarUserId ? and(eq(agentEmailConturi.orgId, o.orgId), eq(agentEmailConturi.userId, o.doarUserId)) : eq(agentEmailConturi.orgId, o.orgId));
  const cfg = await citesteConfigAi(db, o.orgId);
  const ai = cfg.conectat && cfg.cheie ? { cheie: cfg.cheie, model: cfg.model } : null;
  const limita = new Date(Date.now() - ZILE_URMARIRE * 86_400_000);
  const conturi: ContDeCitit[] = [];
  const eroriInitiale: PregatitCitire["eroriInitiale"] = [];
  for (const c of conturiDb) {
    const mesajeDb = await db
      .select({
        id: agentEmailMesaje.id,
        messageId: agentEmailMesaje.messageId,
        subiect: agentEmailMesaje.subiect,
        trimisLa: agentEmailMesaje.trimisLa,
        companyId: agentEmailMesaje.companyId,
        contactId: agentEmailMesaje.contactId,
        firma: agentEmailMesaje.firmaNume,
        catreNume: agentEmailMesaje.catreNume,
        catreEmail: agentEmailMesaje.catreEmail,
      })
      .from(agentEmailMesaje)
      .where(and(eq(agentEmailMesaje.orgId, o.orgId), eq(agentEmailMesaje.deUserId, c.userId), eq(agentEmailMesaje.stare, "trimis"), gte(agentEmailMesaje.trimisLa, limita)));
    if (!mesajeDb.length) continue;
    // Căsuța se „închiriază” atomic: dacă altă verificare e în curs, o sărim.
    const lacat = await db
      .update(agentEmailConturi)
      .set({ imapBlocatPana: new Date(Date.now() + MINUTE_LACAT * 60_000) })
      .where(and(eq(agentEmailConturi.id, c.id), sql`(${agentEmailConturi.imapBlocatPana} is null or ${agentEmailConturi.imapBlocatPana} < now())`))
      .returning({ id: agentEmailConturi.id });
    if (!lacat.length) {
      eroriInitiale.push({ contId: c.id, adresa: c.adresa, eroare: "in_curs" });
      continue;
    }
    const parola = parolaCont(c);
    if (!parola) {
      eroriInitiale.push({ contId: c.id, adresa: c.adresa, eroare: "parola" });
      await db.update(agentEmailConturi).set({ imapBlocatPana: null, imapEroare: "parola" }).where(eq(agentEmailConturi.id, c.id));
      continue;
    }
    const deja = new Set(
      (await db.select({ id: agentEmailRaspunsuri.messageIdRaspuns }).from(agentEmailRaspunsuri).where(and(eq(agentEmailRaspunsuri.orgId, o.orgId), inArray(agentEmailRaspunsuri.mesajId, mesajeDb.map((m) => m.id))))).map((r) => r.id),
    );
    conturi.push({
      contId: c.id,
      userId: c.userId,
      adresa: c.adresa,
      conexiune: { host: c.imapHost, port: c.imapPort, user: c.imapUser, parola },
      mesaje: mesajeDb
        .filter((m): m is typeof m & { trimisLa: Date } => !!m.trimisLa)
        .map((m) => ({ id: m.id, messageId: m.messageId, subiect: m.subiect, subiectReal: m.subiect, trimisLa: m.trimisLa, companyId: m.companyId, contactId: m.contactId, firma: m.firma, catreNume: m.catreNume, deUserId: c.userId, emailDestinatar: m.catreEmail.toLowerCase() })),
      deja,
    });
  }
  return { orgId: o.orgId, orgNume: o.orgNume, locale: o.locale, ai, conturi, eroriInitiale, deadline: Date.now() + (o.durataMs ?? 100_000) };
}

async function laLimita<T, R>(items: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const rezultate: R[] = new Array(items.length);
  let urmator = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (urmator < items.length) {
        const i = urmator++;
        rezultate[i] = await fn(items[i]);
      }
    }),
  );
  return rezultate;
}

async function eticheteazaAi(p: PregatitCitire, subiect: string, fragment: string): Promise<{ eticheta: EtichetaRaspuns; ai: RaspunsProcesat["ai"] }> {
  if (!p.ai || !fragment.trim()) return { eticheta: "altul", ai: null };
  try {
    const r = await apeleazaClaude({ cheie: p.ai.cheie, model: p.ai.model, system: systemEticheta(p.orgNume), mesaje: [{ role: "user", content: mesajEticheta(subiect, fragment) }], maxTokens: 2000, efort: "low", timeoutMs: 40_000, locale: p.locale });
    return { eticheta: r.ok ? parseazaEticheta(r.text) : "altul", ai: { utilizare: r.utilizare, costUsd: r.costUsd, model: r.model } };
  } catch {
    return { eticheta: "altul", ai: { utilizare: UTILIZARE_GOALA, costUsd: 0, model: p.ai.model } };
  }
}

// Faza 2: IMAP + AI, fără bază de date.
export async function ruleazaCitirea(p: PregatitCitire): Promise<RezultatCitire> {
  const iesire: RezultatCitire["conturi"] = [];
  let etichetariAi = 0;
  for (const c of p.conturi) {
    const dupaAdresa = new Map<string, MesajUrmarit[]>();
    for (const m of c.mesaje) {
      const a = m.emailDestinatar;
      dupaAdresa.set(a, [...(dupaAdresa.get(a) ?? []), m]);
    }
    const adrese = [...dupaAdresa].slice(0, 300).map(([adresa, ms]) => ({ adresa, deLa: new Date(Math.min(...ms.map((x) => x.trimisLa.getTime()))) }));
    const citit = await citesteRaspunsuriImap(c.conexiune, { adrese, deja: c.deja, maxPerAdresa: MAX_PE_ADRESA, deadline: p.deadline });
    const raspunsuri: RaspunsProcesat[] = [];
    const deEtichetat: { r: RaspunsProcesat; brut: RaspunsBrut }[] = [];
    for (const brut of citit.mesaje) {
      const candidati = dupaAdresa.get(brut.deLa) ?? [];
      const m = potrivesteMesaj({ fir: brut.fir, subiect: brut.subiect, primitLa: brut.primitLa }, candidati);
      if (!m) continue;
      const fragment = fragmentRaspuns(brut.text);
      const automat = esteRaspunsAutomat({ antete: brut.antete, subiect: brut.subiect, text: fragment, deLa: brut.deLa });
      const rapid = automat ? ("automat" as const) : etichetaRapida(brut.subiect, fragment);
      const r: RaspunsProcesat = {
        mesajId: m.id,
        companyId: m.companyId,
        contactId: m.contactId,
        firma: m.firma,
        catreNume: m.catreNume,
        subiectMesaj: m.subiectReal,
        deUserId: m.deUserId,
        messageIdRaspuns: brut.messageId,
        deLa: brut.deLa,
        primitLa: brut.primitLa ?? new Date(),
        subiect: brut.subiect,
        fragment: fragment || "(mesaj fără text)",
        eticheta: rapid ?? "altul",
        automat,
        ai: null,
      };
      raspunsuri.push(r);
      if (!rapid) deEtichetat.push({ r, brut });
    }
    // Etichetarea AI: câteva odată, cu plafon pe rulare (costul e al organizației).
    const deFacut = deEtichetat.slice(0, Math.max(0, MAX_ETICHETARI_AI - etichetariAi));
    etichetariAi += deFacut.length;
    await laLimita(deFacut, 3, async ({ r }) => {
      const e = await eticheteazaAi(p, r.subiect, r.fragment);
      r.eticheta = e.eticheta;
      r.ai = e.ai;
    });
    iesire.push({ contId: c.contId, ok: citit.ok, eroare: citit.ok ? null : `${citit.eroare.cod}:${citit.eroare.detaliu}`.slice(0, 300), raspunsuri });
  }
  return { conturi: iesire };
}

const ETICHETE_NOTA: Record<EtichetaRaspuns, string> = {
  interesat: "interesat",
  detalii: "cere detalii",
  nu_acum: "nu acum",
  refuz: "refuz",
  alt_contact: "ne trimite la altă persoană",
  stop: "STOP — nu mai vrea emailuri",
  automat: "răspuns automat",
  altul: "răspuns",
};

// Faza 3.
export async function salveazaCitirea(db: Db, p: PregatitCitire, rez: RezultatCitire): Promise<{ noi: number; erori: { adresa: string; eroare: string }[] }> {
  let noi = 0;
  const erori: { adresa: string; eroare: string }[] = p.eroriInitiale.filter((e) => e.eroare !== "in_curs").map((e) => ({ adresa: e.adresa, eroare: e.eroare }));
  for (const c of rez.conturi) {
    const cont = p.conturi.find((x) => x.contId === c.contId);
    let noiCont = 0;
    for (const r of c.raspunsuri) {
      const [adaugat] = await db
        .insert(agentEmailRaspunsuri)
        .values({ orgId: p.orgId, mesajId: r.mesajId, messageIdRaspuns: r.messageIdRaspuns, deLa: r.deLa, primitLa: r.primitLa, subiect: r.subiect.slice(0, 300), fragment: r.fragment, eticheta: r.eticheta, automat: r.automat || r.eticheta === "automat", citit: r.automat })
        .onConflictDoNothing()
        .returning({ id: agentEmailRaspunsuri.id });
      // Consumul AI se înregistrează oricum (apelul s-a făcut și a costat), chiar dacă răspunsul fusese salvat între timp.
      if (r.ai) await inregistreazaConsum(db, { orgId: p.orgId, userId: r.deUserId, instrument: "agent_email", model: r.ai.model, utilizare: r.ai.utilizare, costUsd: r.ai.costUsd });
      if (!adaugat) continue;
      if (r.automat || r.eticheta === "automat") continue; // un răspuns automat (concediu) se păstrează, dar nu e un răspuns al omului
      noiCont++;
      try {
        await db.transaction(async (sp) => {
          const s = sp as unknown as Db;
          await s.insert(companyNotite).values({ orgId: p.orgId, companyId: r.companyId, text: `Răspuns de la ${r.catreNume} la emailul agentului („${r.subiectMesaj.slice(0, 120)}”) — ${ETICHETE_NOTA[r.eticheta]}: ${r.fragment.slice(0, 400)}`.slice(0, 1000), createdBy: r.deUserId });
          if (r.eticheta === "stop" || r.eticheta === "refuz") {
            // Dreptul de opoziție: persoana nu mai primește emailuri de la noi (acord = nu, adresa intră în lista de suprimare).
            if (r.contactId) await s.update(contacts).set({ consentStatus: "nu", consentAt: new Date(), consentSource: `răspuns la emailul agentului (${r.eticheta})` }).where(and(eq(contacts.orgId, p.orgId), eq(contacts.id, r.contactId)));
            await adaugaSuprimare(s, p.orgId, r.deLa, `raspuns_${r.eticheta}`);
          }
          if (r.eticheta === "interesat" || r.eticheta === "detalii") {
            // Pasul următor pe pipeline: discuția telefonică, dacă firma era încă la început de drum.
            const [f] = await s.select({ stage: companies.stage, status: companies.status }).from(companies).where(and(eq(companies.orgId, p.orgId), eq(companies.id, r.companyId))).limit(1);
            if (f && [...ETAPE_INITIALE, "onepager"].includes(f.stage)) {
              const mutat = await s.update(companies).set({ stage: "telefon" }).where(and(eq(companies.orgId, p.orgId), eq(companies.id, r.companyId), eq(companies.stage, f.stage))).returning({ id: companies.id });
              if (mutat.length) await s.insert(companyStageLog).values({ orgId: p.orgId, companyId: r.companyId, fromStage: f.stage, toStage: "telefon", fromStatus: f.status, toStatus: f.status, byUserId: r.deUserId });
            }
          }
        });
      } catch (e) {
        raporteazaEroare("agent-email-raspuns-evidenta", e, { orgId: p.orgId });
      }
    }
    noi += noiCont;
    if (!c.ok && c.eroare) erori.push({ adresa: cont?.adresa ?? "", eroare: c.eroare });
    // Contul se eliberează și se notează rezultatul verificării.
    await db
      .update(agentEmailConturi)
      .set({ imapBlocatPana: null, imapVerificatLa: new Date(), imapNoi: noiCont, imapEroare: c.ok ? null : (c.eroare ?? "eroare").slice(0, 300) })
      .where(eq(agentEmailConturi.id, c.contId));
  }
  // Conturile pe care nu le-am citit (de ex. au rămas fără rezultat) nu rămân blocate.
  const citite = new Set(rez.conturi.map((c) => c.contId));
  for (const c of p.conturi) if (!citite.has(c.contId)) await db.update(agentEmailConturi).set({ imapBlocatPana: null }).where(eq(agentEmailConturi.id, c.contId));
  return { noi, erori };
}
