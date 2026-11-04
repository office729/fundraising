"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, withOrgFaze } from "@/lib/auth/guard";
import { aiSetari, prospectareChei } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { verificaCheieAnthropic } from "@/lib/ai-org/client";
import { citesteConfigAi, FURNIZOR_ANTHROPIC } from "@/lib/ai-org/consum-server";
import { cursUsdRon } from "@/lib/ai-org/curs";
import { eModelAles, type ModelAles } from "@/lib/ai-org/pret";
import { RE_CHEIE_ANTHROPIC } from "@/lib/ai-org/protocol";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTr } from "@/lib/i18n/tr-server";
import { criptareConfigurata, cripteaza } from "@/lib/secret-box";

// Contul Anthropic al organizației: cheia (criptată, afișată doar ca amprentă), modelul și bugetul lunar de referință. Doar owner/admin, în TOATE pachetele:
// e contul propriu al organizației și îl folosesc și funcțiile mai vechi (promovare, granturi); doar agenții noi cer modulul „ai-agenti”.
const OPTIUNI = {};

export type StareAi = {
  criptareActiva: boolean;
  conectat: boolean;
  ilizibila: boolean;
  amprenta: string | null;
  adaugatLa: string | null;
  model: ModelAles;
  bugetUsd: number | null;
  cursUsdRon: number | null;
};

export const obtineStareAi = withOrgAdmin(async (ctx): Promise<StareAi> => {
  const [cfg, curs] = await Promise.all([citesteConfigAi(ctx.db, ctx.orgId, false), cursUsdRon()]);
  // Cheia nu se decriptează aici (nu pleacă spre browser): doar dacă există și ce alegeri s-au făcut.
  return { criptareActiva: criptareConfigurata(), conectat: cfg.conectat, ilizibila: false, amprenta: cfg.amprenta, adaugatLa: cfg.adaugatLa, model: cfg.model, bugetUsd: cfg.bugetUsd, cursUsdRon: curs };
}, OPTIUNI);

const salveaza = withOrgFaze<[string], { cheie: string }, Awaited<ReturnType<typeof verificaCheieAnthropic>>, void>({
  admin: true,
  opts: OPTIUNI,
  pregateste: async (_ctx, cheie) => {
    const t = await getTr();
    const curata = String(cheie ?? "").trim();
    if (!RE_CHEIE_ANTHROPIC.test(curata)) throw new EroareUtilizator(t("Cheia pare incompletă. O cheie Anthropic începe cu „sk-ant-”; copiaz-o întreagă din console.anthropic.com → API keys, fără spații.", "The key looks incomplete. An Anthropic key starts with “sk-ant-”; copy all of it from console.anthropic.com → API keys, without spaces."));
    if (!criptareConfigurata()) throw new EroareUtilizator(t("Salvarea cheilor nu e activată pe această platformă (lipsește cheia de criptare). Scrie-ne ca s-o activăm.", "Saving keys is not enabled on this platform (the encryption key is missing). Write to us so we can enable it."));
    return { pregatit: { cheie: curata } };
  },
  extern: async (p) => verificaCheieAnthropic(p.cheie, await getLocale()),
  salveaza: async (ctx, p, rezultat) => {
    if (!rezultat.ok) throw new EroareUtilizator(rezultat.eroare);
    const enc = cripteaza(p.cheie);
    const amprenta = `…${p.cheie.slice(-4)}`;
    await ctx.db
      .insert(prospectareChei)
      .values({ orgId: ctx.orgId, provider: FURNIZOR_ANTHROPIC, cheieEnc: enc, amprenta, adaugatDe: ctx.userId })
      .onConflictDoUpdate({ target: [prospectareChei.orgId, prospectareChei.provider], set: { cheieEnc: enc, amprenta, adaugatDe: ctx.userId, updatedAt: new Date() } });
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "ai_cheie_salvata", entitate: "organizatie", entitateId: ctx.orgId, detalii: { furnizor: FURNIZOR_ANTHROPIC } });
    revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  },
});

export async function salveazaCheieAnthropic(orgSlug: string, cheie: string): Promise<{ error: string | null }> {
  try {
    await salveaza(orgSlug, cheie);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut salva cheia Anthropic. Încearcă din nou.", "We could not save the Anthropic key. Please try again."), "ai-cheie-salvare") };
  }
}

// Testare cu cheia deja salvată (fără s-o trimită în browser): lista de modele, gratuită.
const testeaza = withOrgFaze<[], { cheie: string }, Awaited<ReturnType<typeof verificaCheieAnthropic>>, { error: string | null }>({
  admin: true,
  opts: OPTIUNI,
  pregateste: async (ctx) => {
    const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
    const t = await getTr();
    if (!cfg.conectat) return { gata: { error: t("Conectează întâi contul Anthropic.", "Connect your Anthropic account first.") } };
    if (!cfg.cheie) return { gata: { error: t("Cheia salvată nu mai poate fi citită; adaug-o din nou.", "The saved key can no longer be read; add it again.") } };
    return { pregatit: { cheie: cfg.cheie } };
  },
  extern: async (p) => verificaCheieAnthropic(p.cheie, await getLocale()),
  salveaza: async (_ctx, _p, r) => (r.ok ? { error: null } : { error: r.eroare }),
});

export async function testeazaConexiuneAnthropic(orgSlug: string): Promise<{ error: string | null }> {
  try {
    return await testeaza(orgSlug);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut testa conexiunea. Încearcă din nou.", "We could not test the connection. Please try again."), "ai-conexiune-test") };
  }
}

const sterge = withOrgAdmin(async (ctx): Promise<void> => {
  await ctx.db.delete(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, FURNIZOR_ANTHROPIC)));
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "ai_cheie_stearsa", entitate: "organizatie", entitateId: ctx.orgId, detalii: { furnizor: FURNIZOR_ANTHROPIC } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
}, OPTIUNI);

export async function deconecteazaAnthropic(orgSlug: string): Promise<{ error: string | null }> {
  try {
    await sterge(orgSlug);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut deconecta contul. Încearcă din nou.", "We could not disconnect the account. Please try again."), "ai-cheie-stergere") };
  }
}

const BUGET_MAX = 100_000;

const salveazaAlegeri = withOrgAdmin(async (ctx, alegeri: { model: string; bugetUsd: number | null }): Promise<void> => {
  const t = await getTr();
  if (!eModelAles(alegeri?.model)) throw new EroareUtilizator(t("Alege un model din listă.", "Choose a model from the list."));
  let buget: string | null = null;
  if (alegeri.bugetUsd != null) {
    const b = Number(alegeri.bugetUsd);
    if (!Number.isFinite(b) || b < 0 || b > BUGET_MAX) throw new EroareUtilizator(t(`Bugetul trebuie să fie între 0 și ${BUGET_MAX.toLocaleString("ro-RO")} USD.`, `The budget must be between 0 and ${BUGET_MAX.toLocaleString("en-GB")} USD.`));
    buget = b > 0 ? b.toFixed(2) : null;
  }
  await ctx.db
    .insert(aiSetari)
    .values({ orgId: ctx.orgId, model: alegeri.model, bugetUsd: buget })
    .onConflictDoUpdate({ target: aiSetari.orgId, set: { model: alegeri.model, bugetUsd: buget, updatedAt: new Date() } });
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "ai_setari_salvate", entitate: "organizatie", entitateId: ctx.orgId, detalii: { model: alegeri.model, buget: buget != null } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  revalidatePath(`/${ctx.orgSlug}/crm/consum-ai`);
}, OPTIUNI);

export async function salveazaSetariAi(orgSlug: string, alegeri: { model: string; bugetUsd: number | null }): Promise<{ error: string | null }> {
  try {
    await salveazaAlegeri(orgSlug, alegeri);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut salva alegerile. Încearcă din nou.", "We could not save your choices. Please try again."), "ai-setari-salvare") };
  }
}
