import "server-only";

import { and, desc, eq, lt, sql } from "drizzle-orm";

import { apeleazaClaude } from "@/lib/ai-org/client";
import { inregistreazaConsum, rulezaCaOrganizatie } from "@/lib/ai-org/consum-server";
import { analizeOng } from "@/lib/db/schema";
import { db as dbGlobal } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";

import { ANALIZA_ONG_IN_LUCRU_MAX_MIN, construiestePrompt, curataRaport, curataSurse, MAX_CAUTARI, PASTREAZA_ANALIZE_ONG, type CerereOng, type SursaRaport } from "./analiza";

type Db = typeof dbGlobal;

// Analiza unui ONG cu căutare web, rulată în FUNDAL (după răspunsul acțiunii, vezi `after` în actions.ts; ruta are maxDuration 300). Cheia Anthropic e a organizației;
// consumul (tokeni + căutări web) intră în Consum AI cu instrumentul „analiza_ong”. Baza de date nu e ținută deschisă cât durează apelul.

export type Pregatit = { analizaId: string; cheie: string; model: string; system: string; user: string; userId: string | null };

const MESAJ_EXPIRAT = "Analiza s-a oprit înainte să se termine (a depășit timpul permis). Consumul, dacă a existat, e în Consum AI. Poți porni din nou.";

const stale = sql`${analizeOng.creatLa} < now() - make_interval(mins => ${ANALIZA_ONG_IN_LUCRU_MAX_MIN}::int)`;

// Analizele „in_lucru” abandonate (cererea s-a oprit fără să salveze) devin erori; altfel ar bloca la nesfârșit același ONG.
export async function expiraAbandonate(db: Db, orgId: string, numeNorm?: string): Promise<void> {
  await db
    .update(analizeOng)
    .set({ stare: "eroare", eroare: MESAJ_EXPIRAT, terminatLa: new Date() })
    .where(and(eq(analizeOng.orgId, orgId), eq(analizeOng.stare, "in_lucru"), stale, ...(numeNorm ? [eq(analizeOng.numeNorm, numeNorm)] : [])));
}

// Blocarea atomică: indexul unic parțial (org_id, nume_norm) cât timp starea e „in_lucru” face ca o a doua inserare pentru același ONG să nu reușească.
export async function revendicaAnaliza(db: Db, orgId: string, userId: string, cerere: CerereOng): Promise<{ ok: true; id: string } | { ok: false }> {
  await expiraAbandonate(db, orgId, cerere.numeNorm);
  const nou = await db
    .insert(analizeOng)
    .values({ orgId, nume: cerere.nume, numeNorm: cerere.numeNorm, site: cerere.site, interes: cerere.interes, stare: "in_lucru", creatDe: userId })
    .onConflictDoNothing()
    .returning({ id: analizeOng.id });
  if (!nou[0]) return { ok: false };
  await pastreazaUltimele(db, orgId);
  return { ok: true, id: nou[0].id };
}

// Ultimele 40 de analize pe organizație (cele „in_lucru” nu se șterg).
async function pastreazaUltimele(db: Db, orgId: string): Promise<void> {
  const pastrate = await db.select({ la: analizeOng.creatLa }).from(analizeOng).where(eq(analizeOng.orgId, orgId)).orderBy(desc(analizeOng.creatLa)).limit(PASTREAZA_ANALIZE_ONG);
  if (pastrate.length < PASTREAZA_ANALIZE_ONG) return;
  const prag = pastrate[pastrate.length - 1].la;
  await db.delete(analizeOng).where(and(eq(analizeOng.orgId, orgId), lt(analizeOng.creatLa, prag), sql`${analizeOng.stare} <> 'in_lucru'`));
}

export function pregateste(analizaId: string, cheie: string, model: string, userId: string | null, cerere: CerereOng, azi: string): Pregatit {
  const p = construiestePrompt(cerere, azi);
  return { analizaId, cheie, model, system: p.system, user: p.user, userId };
}

// Apelul lung + salvarea. Nu aruncă: orice eroare se scrie pe rândul analizei, ca să nu rămână „in_lucru”.
export async function ruleazaAnalizaOng(orgId: string, p: Pregatit): Promise<void> {
  try {
    const extern = await apeleazaClaude({
      cheie: p.cheie,
      model: p.model,
      system: p.system,
      mesaje: [{ role: "user", content: p.user }],
      maxTokens: 10_000,
      efort: "medium",
      cautareWeb: { maxUtilizari: MAX_CAUTARI },
      // 3 ture × 90 s încap în cei 300 s ai rutei; tura întreruptă (pause_turn) e reluată de apeleazaClaude.
      timeoutMs: 90_000,
      maxTure: 3,
      locale: "ro",
    });
    await rulezaCaOrganizatie(orgId, async (db) => {
      await inregistreazaConsum(db, { orgId, userId: p.userId, instrument: "analiza_ong", model: extern.model, utilizare: extern.utilizare, costUsd: extern.costUsd });
      const cost = extern.costUsd.toFixed(6);
      const unde = and(eq(analizeOng.id, p.analizaId), eq(analizeOng.orgId, orgId));
      if (!extern.ok) {
        await db.update(analizeOng).set({ stare: "eroare", eroare: extern.eroare.slice(0, 400), costUsd: cost, model: extern.model, cautari: extern.utilizare.cautariWeb, terminatLa: new Date() }).where(unde);
        return;
      }
      const raport = curataRaport(extern.text);
      if (raport.length < 200) {
        await db.update(analizeOng).set({ stare: "eroare", eroare: "AI-ul nu a întors un raport. Încearcă din nou, eventual cu site-ul ONG-ului.", costUsd: cost, model: extern.model, cautari: extern.utilizare.cautariWeb, terminatLa: new Date() }).where(unde);
        return;
      }
      await db
        .update(analizeOng)
        .set({
          stare: "gata",
          raport,
          surse: curataSurse(extern.surse),
          model: extern.model,
          cautari: extern.utilizare.cautariWeb,
          costUsd: cost,
          // un raport tăiat la limita de lungime rămâne util, dar se spune
          eroare: extern.trunchiat ? "Raportul a atins limita de lungime și poate fi incomplet." : null,
          terminatLa: new Date(),
        })
        .where(unde);
    });
  } catch (e) {
    raporteazaEroare("analiza-ong-fundal", e, { orgId });
    try {
      await rulezaCaOrganizatie(orgId, (db) =>
        db.update(analizeOng).set({ stare: "eroare", eroare: "Analiza nu a reușit. Încearcă din nou.", terminatLa: new Date() }).where(and(eq(analizeOng.id, p.analizaId), eq(analizeOng.orgId, orgId), eq(analizeOng.stare, "in_lucru"))),
      );
    } catch (e2) {
      raporteazaEroare("analiza-ong-fundal-eroare", e2, { orgId });
    }
  }
}

// ───────────── citire pentru pagină ─────────────

export type AnalizaOngRand = {
  id: string;
  nume: string;
  site: string | null;
  interes: string | null;
  stare: "in_lucru" | "gata" | "eroare";
  raport: string | null;
  surse: SursaRaport[];
  eroare: string | null;
  cautari: number;
  costUsd: number;
  model: string | null;
  creatLa: string;
  terminatLa: string | null;
};

export async function citesteAnalizeOng(db: Db, orgId: string): Promise<AnalizaOngRand[]> {
  await expiraAbandonate(db, orgId);
  const r = await db.select().from(analizeOng).where(eq(analizeOng.orgId, orgId)).orderBy(desc(analizeOng.creatLa)).limit(PASTREAZA_ANALIZE_ONG);
  return r.map((x) => ({
    id: x.id,
    nume: x.nume,
    site: x.site,
    interes: x.interes,
    stare: x.stare === "gata" || x.stare === "eroare" ? x.stare : "in_lucru",
    raport: x.raport,
    surse: curataSurse(x.surse),
    eroare: x.eroare,
    cautari: x.cautari,
    costUsd: Number(x.costUsd),
    model: x.model,
    creatLa: x.creatLa.toISOString(),
    terminatLa: x.terminatLa ? x.terminatLa.toISOString() : null,
  }));
}

// Se poate șterge orice analiză în afară de cea aflată în lucru (altfel s-ar putea porni a doua pentru același ONG cât prima încă rulează).
export async function stergeAnaliza(db: Db, orgId: string, id: string): Promise<boolean> {
  const r = await db.delete(analizeOng).where(and(eq(analizeOng.id, id), eq(analizeOng.orgId, orgId), sql`${analizeOng.stare} <> 'in_lucru'`)).returning({ id: analizeOng.id });
  return r.length > 0;
}
