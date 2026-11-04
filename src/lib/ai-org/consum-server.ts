import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db as dbGlobal } from "@/lib/db";
import { aiConsum, aiSetari, prospectareChei } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";
import { decripteaza } from "@/lib/secret-box";

import { eInstrumentAi, type InstrumentAi } from "./consum";
import { eModelAles, MODEL_IMPLICIT, type ModelAles, type Utilizare } from "./pret";
import type { Loc } from "./protocol";

type Db = typeof dbGlobal;

// Cheia Anthropic a organizației stă în prospectare_chei (provider = 'anthropic'), criptată; alegerile (model, buget) în ai_setari.
export const FURNIZOR_ANTHROPIC = "anthropic";

export type ConfigAi = {
  conectat: boolean;
  // Cheia în clar: doar pe server, doar pentru apelul către Anthropic; null dacă nu e conectată sau nu mai poate fi citită.
  cheie: string | null;
  ilizibila: boolean;
  amprenta: string | null;
  adaugatLa: string | null;
  model: ModelAles;
  bugetUsd: number | null;
  // Povestea campaniei pleacă la Anthropic doar dacă organizația a bifat explicit (poate conține date medicale).
  povesteLaAi: boolean;
  opresteLaBuget: boolean;
  // Bugetul lunar a fost atins și organizația a cerut oprirea: cheia nu se mai oferă apelanților.
  blocatBuget: boolean;
};

export async function citesteConfigAi(db: Db, orgId: string, cuCheie = true, aplicaBuget = true): Promise<ConfigAi> {
  const [rand] = await db
    .select({ enc: prospectareChei.cheieEnc, amprenta: prospectareChei.amprenta, la: prospectareChei.updatedAt })
    .from(prospectareChei)
    .where(and(eq(prospectareChei.orgId, orgId), eq(prospectareChei.provider, FURNIZOR_ANTHROPIC)))
    .limit(1);
  const [setari] = await db.select({ model: aiSetari.model, buget: aiSetari.bugetUsd, poveste: aiSetari.povesteLaAi, opreste: aiSetari.opresteLaBuget }).from(aiSetari).where(eq(aiSetari.orgId, orgId)).limit(1);
  let cheie: string | null = null;
  let ilizibila = false;
  if (rand && cuCheie) {
    try {
      cheie = decripteaza(rand.enc);
    } catch {
      ilizibila = true;
    }
  }
  const buget = setari?.buget != null ? Number(setari.buget) : null;
  const bugetValid = buget != null && Number.isFinite(buget) && buget > 0 ? buget : null;
  const opresteLaBuget = Boolean(setari?.opreste);
  let blocatBuget = false;
  if (cuCheie && aplicaBuget && opresteLaBuget && bugetValid != null && rand) {
    blocatBuget = (await consumLunaUsd(db, orgId)) >= bugetValid;
    if (blocatBuget) cheie = null;
  }
  return {
    conectat: Boolean(rand),
    cheie,
    ilizibila,
    amprenta: rand?.amprenta ?? null,
    adaugatLa: rand ? rand.la.toISOString() : null,
    model: eModelAles(setari?.model) ? setari.model : MODEL_IMPLICIT,
    bugetUsd: bugetValid,
    povesteLaAi: Boolean(setari?.poveste),
    opresteLaBuget,
    blocatBuget,
  };
}

// Consumul lunii curente (ora României) în USD, pentru oprirea la buget.
export async function consumLunaUsd(db: Db, orgId: string): Promise<number> {
  const [r] = await db
    .select({ s: sql<string>`coalesce(sum(${aiConsum.costUsd}), 0)` })
    .from(aiConsum)
    .where(and(eq(aiConsum.orgId, orgId), sql`(${aiConsum.createdAt} at time zone 'Europe/Bucharest') >= date_trunc('month', now() at time zone 'Europe/Bucharest')`));
  const n = Number(r?.s ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Mesajul arătat când funcția are nevoie de AI, dar organizația nu și-a conectat contul: nu o eroare tehnică, ci pasul de făcut.
export function mesajFaraCheieAi(locale: Loc, ilizibila = false, blocatBuget = false): string {
  if (blocatBuget) return locale === "ro" ? "Bugetul lunar AI al organizației a fost atins, iar funcțiile AI sunt oprite până luna viitoare. Un administrator poate mări bugetul sau opri această limită în Setări → Integrări & AI." : "The organization's monthly AI budget has been reached and the AI features are paused until next month. An administrator can raise the budget or turn this limit off in Settings → Integrations & AI.";
  if (ilizibila) return locale === "ro" ? "Cheia Anthropic salvată nu mai poate fi citită. Adaug-o din nou în Setări → Integrări & AI." : "The saved Anthropic key can no longer be read. Add it again in Settings → Integrations & AI.";
  return locale === "ro" ? "Conectează contul Anthropic în Setări → Integrări & AI ca să folosești această funcție." : "Connect your Anthropic account in Settings → Integrations & AI to use this feature.";
}

export type IntrareConsum = { orgId: string; userId?: string | null; instrument: InstrumentAi | string; model: string; utilizare: Utilizare; costUsd: number };

// Evidența nu blochează niciodată generarea. Scrierea se face într-un punct de salvare (savepoint): dacă eșuează, tranzacția apelantului rămâne validă.
export async function inregistreazaConsum(db: Db, intrare: IntrareConsum): Promise<void> {
  const u = intrare.utilizare;
  if (u.tokeniIn + u.tokeniOut + u.tokeniCacheCitire + u.tokeniCacheScriere + u.cautariWeb === 0 && !(intrare.costUsd > 0)) return;
  try {
    await db.transaction(async (sp) => {
      await sp.insert(aiConsum).values({
        orgId: intrare.orgId,
        instrument: eInstrumentAi(intrare.instrument) ? intrare.instrument : "altele",
        model: intrare.model.slice(0, 80),
        tokeniIn: u.tokeniIn,
        tokeniOut: u.tokeniOut,
        tokeniCacheCitire: u.tokeniCacheCitire,
        tokeniCacheScriere: u.tokeniCacheScriere,
        cautariWeb: u.cautariWeb,
        costUsd: intrare.costUsd.toFixed(6),
        userId: intrare.userId ?? null,
      });
    });
  } catch (e) {
    raporteazaEroare("ai-consum-scriere", e, { orgId: intrare.orgId });
  }
}

// Pentru lucrările din fundal (după răspuns, cron): o tranzacție nouă, legată de organizație (RLS), în care se pot citi cheia și scrie consumul.
export async function rulezaCaOrganizatie<T>(orgId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  return dbGlobal.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return fn(tx as unknown as Db);
  });
}
