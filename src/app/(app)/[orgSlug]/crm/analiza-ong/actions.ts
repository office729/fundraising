"use server";

import { after } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { citesteConfigAi, mesajFaraCheieAi } from "@/lib/ai-org/consum-server";
import { ziBucuresti } from "@/lib/ai-org/consum";
import { valideazaCerere } from "@/lib/analiza-ong/analiza";
import { citesteAnalizeOng, pregateste, revendicaAnaliza, ruleazaAnalizaOng, stergeAnaliza, type AnalizaOngRand, type Pregatit } from "@/lib/analiza-ong/server";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { withOrgAdmin } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";

// Analiza ONG-urilor (doar proprietar/administratori; cheia Anthropic e a organizației). Modulul „ai-agenti” (IMPACT).
// Pornirea durează o clipă: verifică, „revendică” analiza (blocare atomică în baza de date) și lasă munca lungă în fundal (`after`), ca pagina să nu aștepte 2–5 minute.
// `maxDuration = 300` e pe pagina din care se apelează acțiunea (vezi page.tsx): acolo se aplică și lui `after`.
const OPT = { modul: "ai-agenti" as const };
const MAX_ANALIZE_PE_ORA = 12;

export type RezultatPornire = { ok: true; id: string } | { ok: false; cod: string; mesaj?: string };

const autorizeaza = withOrgAdmin(async (ctx) => ({ orgId: ctx.orgId, userId: ctx.userId }), OPT);

// Faza 1, într-o tranzacție scurtă: cheia, blocarea analizei, rândul „in_lucru”. Cheia (în clar) rămâne doar în memoria procesului.
const pregatesteAnaliza = withOrgAdmin(
  async (ctx, intrare: { nume: unknown; site?: unknown; interes?: unknown }): Promise<{ gata: RezultatPornire } | { pregatit: Pregatit }> => {
    const locale = await getLocale();
    const v = valideazaCerere(intrare);
    if (!v.ok) return { gata: { ok: false, cod: v.cod } };
    const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
    if (!cfg.conectat || !cfg.cheie) return { gata: { ok: false, cod: "fara-cheie", mesaj: mesajFaraCheieAi(locale, cfg.ilizibila) } };
    const claim = await revendicaAnaliza(ctx.db, ctx.orgId, ctx.userId, v.cerere);
    if (!claim.ok) return { gata: { ok: false, cod: "deja-in-lucru" } };
    return { pregatit: pregateste(claim.id, cfg.cheie, cfg.model, ctx.userId, v.cerere, ziBucuresti(new Date())) };
  },
  OPT,
);

export async function pornesteAnalizaOng(orgSlug: string, intrare: { nume: string; site?: string; interes?: string }): Promise<RezultatPornire> {
  try {
    const { orgId } = await autorizeaza(orgSlug);
    // Plafon pe organizație: fiecare analiză plătește căutări web din contul ei; un ciclu greșit nu trebuie să-l golească.
    if (!(await verificaLimitaRata("analiza-ong", orgId, MAX_ANALIZE_PE_ORA, 60))) return { ok: false, cod: "limita" };
    const r = await pregatesteAnaliza(orgSlug, intrare);
    if ("gata" in r) return r.gata;
    // Munca lungă rulează după răspuns; nu aruncă (își scrie singură erorile pe rândul analizei).
    after(() => ruleazaAnalizaOng(orgId, r.pregatit));
    return { ok: true, id: r.pregatit.analizaId };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, cod: "generala" };
  }
}

export const obtineAnalizeOng = withOrgAdmin(async (ctx): Promise<{ analize: AnalizaOngRand[]; aiConectat: boolean }> => {
  const cfg = await citesteConfigAi(ctx.db, ctx.orgId, false);
  return { analize: await citesteAnalizeOng(ctx.db, ctx.orgId), aiConectat: cfg.conectat };
}, OPT);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const stergeAnalizaOng = withOrgAdmin(async (ctx, id: string): Promise<{ ok: boolean }> => {
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false };
  return { ok: await stergeAnaliza(ctx.db, ctx.orgId, id) };
}, OPT);
