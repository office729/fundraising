import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { apeleazaClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi } from "@/lib/ai-org/consum-server";
import { UTILIZARE_GOALA, type Utilizare } from "@/lib/ai-org/pret";
import type { Loc } from "@/lib/ai-org/protocol";
import { agentEmailConturi, agentEmailMesaje, agentEmailRaspunsuri, companyNotite } from "@/lib/db/schema";
import { ferestreFiscale } from "@/lib/ferestre-fiscale";
import { propozitieSezon } from "@/lib/script-apel";

import { esteSarbatoare } from "./generare";
import { citesteRevenire, mesajRevenire, systemRevenire } from "./prompt";
import { MAX_ZILE_REVENIRE, ZILE_PANA_LA_REVENIRE, extrageJson, revenireScadenta, salutPentru, sloturiApel, zileLucratoare } from "./reguli";
import type { Db, RandMesaj } from "./store";
import { verificaDestinatarAcum } from "./verificari";

// Revenirea (follow-up): după 5 zile lucrătoare fără răspuns la primul email, AI scrie o revenire scurtă, în același fir (Re: …, fără atașament), care intră în coada
// de aprobare ca orice ciornă — NU pleacă singură. Dacă nici după revenire nu răspunde în 5 zile lucrătoare, apare sarcina „Sună” (cu scriptul de apel) în fila „Azi”.

type Tr = (ro: string, en: string) => string;

export type ElementRevenire = { original: RandMesaj; cerere: { organizatie: string; firma: string; salut: string; emailInitial: { subiect: string; mesaj: string }; sloturi: string; sezon: string } };

export type PregatitReveniri = {
  orgId: string;
  userId: string | null;
  userNume: string;
  cheie: string;
  model: string;
  locale: Loc;
  orgNume: string;
  elemente: ElementRevenire[];
  erori: string[];
};

// Emailurile inițiale cărora li se cuvine o revenire acum (`doarDe`: doar ale unui expeditor).
export async function pregatesteReveniri(
  db: Db,
  t: Tr,
  o: { orgId: string; orgNume: string; locale: Loc; userId: string | null; userNume: string; doarDe: string | null; limita: number; ids?: string[] },
): Promise<{ gata: { ok: false; error: string } } | { pregatit: PregatitReveniri }> {
  const cfg = await citesteConfigAi(db, o.orgId);
  if (!cfg.conectat || !cfg.cheie) return { gata: { ok: false, error: mesajFaraCheieAi(o.locale, cfg.ilizibila) } };
  const acum = new Date();
  const limitaData = new Date(acum.getTime() - MAX_ZILE_REVENIRE * 86_400_000);
  const conditii = [eq(agentEmailMesaje.orgId, o.orgId), eq(agentEmailMesaje.tip, "prim"), eq(agentEmailMesaje.stare, "trimis"), sql`${agentEmailMesaje.trimisLa} > ${limitaData.toISOString()}::timestamptz`];
  if (o.doarDe) conditii.push(eq(agentEmailMesaje.deUserId, o.doarDe));
  if (o.ids?.length) conditii.push(inArray(agentEmailMesaje.id, o.ids));
  const prime = await db.select().from(agentEmailMesaje).where(and(...conditii));
  if (!prime.length) return { gata: { ok: false, error: t("Nicio revenire scadentă.", "No follow-up is due.") } };
  const idsPrime = prime.map((p) => p.id);
  const [raspunsuri, reveniri] = await Promise.all([
    db.select({ mesajId: agentEmailRaspunsuri.mesajId }).from(agentEmailRaspunsuri).where(and(eq(agentEmailRaspunsuri.orgId, o.orgId), eq(agentEmailRaspunsuri.automat, false), inArray(agentEmailRaspunsuri.mesajId, idsPrime))),
    db.select({ original: agentEmailMesaje.revenireLa }).from(agentEmailMesaje).where(and(eq(agentEmailMesaje.orgId, o.orgId), eq(agentEmailMesaje.tip, "revenire"), inArray(agentEmailMesaje.revenireLa, idsPrime))),
  ]);
  const cuRaspuns = new Set(raspunsuri.map((r) => r.mesajId));
  const cuRevenire = new Set(reveniri.map((r) => r.original).filter((x): x is string => !!x));
  const scadente = prime
    .filter((p) => revenireScadenta({ tip: "prim", stare: "trimis", trimisLa: p.trimisLa, areRaspunsReal: cuRaspuns.has(p.id), areRevenire: cuRevenire.has(p.id) }, acum, esteSarbatoare))
    .slice(0, o.limita);
  if (!scadente.length) return { gata: { ok: false, error: t("Nicio revenire scadentă.", "No follow-up is due.") } };

  const sezon = propozitieSezon(ferestreFiscale(acum));
  const sloturi = sloturiApel(acum, esteSarbatoare);
  const erori: string[] = [];
  const elemente: ElementRevenire[] = [];
  for (const p of scadente) {
    // Revenirea pleacă tot din căsuța expeditorului: fără ea, ciorna n-ar putea fi trimisă.
    const [cont] = p.deUserId ? await db.select({ id: agentEmailConturi.id }).from(agentEmailConturi).where(and(eq(agentEmailConturi.orgId, o.orgId), eq(agentEmailConturi.userId, p.deUserId))).limit(1) : [];
    if (!cont) {
      erori.push(`${p.firmaNume}: ${t(`${p.deNume} nu mai are căsuța conectată.`, `${p.deNume} no longer has a connected mailbox.`)}`);
      continue;
    }
    const motiv = await verificaDestinatarAcum(db, o.orgId, { mesajId: p.id, companyId: p.companyId, contactId: p.contactId, email: p.catreEmail, tip: "revenire" }, t);
    if (motiv) {
      erori.push(`${p.firmaNume}: ${motiv}`);
      continue;
    }
    elemente.push({
      original: p,
      cerere: { organizatie: o.orgNume, firma: p.firmaNume, salut: salutPentru(p.catreNume).salut, emailInitial: { subiect: p.subiect, mesaj: p.mesaj }, sloturi, sezon },
    });
  }
  if (!elemente.length) return { gata: { ok: false, error: erori[0] ?? t("Nicio revenire scadentă.", "No follow-up is due.") } };
  return { pregatit: { orgId: o.orgId, userId: o.userId, userNume: o.userNume, cheie: cfg.cheie, model: cfg.model, locale: o.locale, orgNume: o.orgNume, elemente, erori } };
}

export type RezultatAiRevenire = { ok: true; mesaj: string; utilizare: Utilizare; costUsd: number; model: string } | { ok: false; eroare: string; utilizare: Utilizare; costUsd: number; model: string };

export async function ruleazaAiReveniri(p: PregatitReveniri): Promise<RezultatAiRevenire[]> {
  const rez: RezultatAiRevenire[] = [];
  let urmator = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, p.elemente.length) }, async () => {
      while (urmator < p.elemente.length) {
        const i = urmator++;
        const el = p.elemente[i];
        try {
          const r = await apeleazaClaude({ cheie: p.cheie, model: p.model, system: systemRevenire(p.orgNume), mesaje: [{ role: "user", content: mesajRevenire(el.cerere) }], maxTokens: 3000, efort: "medium", timeoutMs: 80_000, locale: p.locale });
          if (!r.ok) rez[i] = { ok: false, eroare: r.eroare, utilizare: r.utilizare, costUsd: r.costUsd, model: r.model };
          else {
            const mesaj = citesteRevenire(r.text, extrageJson);
            rez[i] = mesaj ? { ok: true, mesaj, utilizare: r.utilizare, costUsd: r.costUsd, model: r.model } : { ok: false, eroare: p.locale === "ro" ? "AI-ul nu a întors o revenire validă." : "The AI did not return a valid follow-up.", utilizare: r.utilizare, costUsd: r.costUsd, model: r.model };
          }
        } catch {
          rez[i] = { ok: false, eroare: p.locale === "ro" ? "Eroare neașteptată la generare." : "Unexpected error while generating.", utilizare: UTILIZARE_GOALA, costUsd: 0, model: p.model };
        }
      }
    }),
  );
  return rez;
}

export async function salveazaReveniri(db: Db, p: PregatitReveniri, rez: RezultatAiRevenire[]): Promise<{ create: number; erori: string[] }> {
  const erori = [...p.erori];
  let create = 0;
  // Fără un index unic pe (org, revenire_la), verificarea „există deja?” de mai jos nu e atomică: cron-ul și butonul (sau două taburi) ar scrie două reveniri pentru același email.
  // Blocarea e pe organizație (nu pe email), ca două salvări cu liste diferite să nu se blocheze reciproc în ordine inversă; a doua așteaptă commit-ul primei și vede rândurile ei.
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`agent-email-reveniri:${p.orgId}`}))`);
  for (let i = 0; i < p.elemente.length; i++) {
    const { original: o, cerere } = p.elemente[i];
    const r = rez[i];
    await inregistreazaConsum(db, { orgId: p.orgId, userId: p.userId, instrument: "agent_email", model: r.model, utilizare: r.utilizare, costUsd: r.costUsd });
    if (!r.ok) {
      erori.push(`${o.firmaNume}: ${r.eroare}`);
      continue;
    }
    // O singură revenire per email inițial (două apăsări simultane nu o dublează).
    const [existenta] = await db.select({ id: agentEmailMesaje.id }).from(agentEmailMesaje).where(and(eq(agentEmailMesaje.orgId, p.orgId), eq(agentEmailMesaje.tip, "revenire"), eq(agentEmailMesaje.revenireLa, o.id))).limit(1);
    if (existenta) continue;
    const subiect = /^re:/i.test(o.subiect) ? o.subiect : `Re: ${o.subiect}`;
    const mesaj = r.mesaj.startsWith(cerere.salut.replace(/,\s*$/, "")) ? r.mesaj : `${cerere.salut}\n\n${r.mesaj}`;
    await db.insert(agentEmailMesaje).values({
      orgId: p.orgId,
      companyId: o.companyId,
      contactId: o.contactId,
      firmaNume: o.firmaNume,
      catreNume: o.catreNume,
      catreEmail: o.catreEmail,
      catreRol: o.catreRol,
      deUserId: o.deUserId,
      deNume: o.deNume,
      deEmail: o.deEmail,
      subiect,
      mesaj,
      aiSubiect: subiect,
      aiMesaj: mesaj,
      mecanism: o.mecanism,
      cazPageId: o.cazPageId,
      cazNume: o.cazNume,
      istoric: o.istoric,
      tip: "revenire",
      revenireLa: o.id,
      inReplyTo: o.messageId,
      referinte: [o.referinte, o.messageId].filter(Boolean).join(" ") || null,
      stare: "ciorna",
      creatDe: p.userId,
      creatDeNume: p.userNume,
    });
    create++;
  }
  return { create, erori };
}

// După revenire, fără răspuns încă 5 zile lucrătoare => sarcina „Sună” (o singură dată): apare în fila „Azi” a expeditorului și lasă o notă pe firmă.
export async function programeazaApeluri(db: Db, orgId: string): Promise<number> {
  const acum = new Date();
  const reveniri = await db
    .select()
    .from(agentEmailMesaje)
    .where(and(eq(agentEmailMesaje.orgId, orgId), eq(agentEmailMesaje.tip, "revenire"), eq(agentEmailMesaje.stare, "trimis"), isNull(agentEmailMesaje.apelLa)));
  if (!reveniri.length) return 0;
  const ids = [...reveniri.map((r) => r.id), ...reveniri.map((r) => r.revenireLa).filter((x): x is string => !!x)];
  const cuRaspuns = new Set((await db.select({ id: agentEmailRaspunsuri.mesajId }).from(agentEmailRaspunsuri).where(and(eq(agentEmailRaspunsuri.orgId, orgId), eq(agentEmailRaspunsuri.automat, false), inArray(agentEmailRaspunsuri.mesajId, ids)))).map((r) => r.id));
  let n = 0;
  for (const r of reveniri) {
    if (!r.trimisLa || cuRaspuns.has(r.id) || (r.revenireLa && cuRaspuns.has(r.revenireLa))) continue;
    if (zileLucratoare(r.trimisLa, acum, esteSarbatoare) < ZILE_PANA_LA_REVENIRE) continue;
    const marcat = await db.update(agentEmailMesaje).set({ apelLa: acum }).where(and(eq(agentEmailMesaje.id, r.id), isNull(agentEmailMesaje.apelLa))).returning({ id: agentEmailMesaje.id });
    if (!marcat.length) continue;
    await db.insert(companyNotite).values({ orgId, companyId: r.companyId, text: `De sunat: ${r.catreNume} (${r.firmaNume}) nu a răspuns la email și nici la revenire. Scriptul de apel e în Agent email → Azi.`.slice(0, 500), createdBy: r.deUserId });
    n++;
  }
  return n;
}
