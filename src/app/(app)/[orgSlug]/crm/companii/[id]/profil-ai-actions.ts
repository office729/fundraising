"use server";

import { and, eq, sql } from "drizzle-orm";

import { aiConfigurat, cercetaFirmaAI, type RezultatCercetareFirma } from "@/lib/ai";
import { limitaCautareDepasita, MESAJ_LIMITA_CAUTARE } from "@/lib/ai-limit";
import { withOrgFaze } from "@/lib/auth/guard";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { companies } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { aziBucuresti } from "@/lib/prospectare/limite";

// Pregătirea de apel cu AI (pachetul IMPACT): cercetează firma pe web și păstrează profilul în companies.extra.profilAi. Costă (căutări web plătite), deci: plafon zilnic pe
// organizație (ai-limit.ts) și o pauză de 6 ore pe firmă, ca aceeași firmă să nu fie cercetată de două ori la rând.
const OPTIUNI = { modul: "prioritizare-firme" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RezultatProfilAi = { ok: boolean; eroare?: string };

type Pregatit = { companyId: string; firma: { nume: string; cui: string | null; site: string | null; caen: string | null; localitate: string | null; judet: string | null }; ong: string };

const cercetaFirma = withOrgFaze<[string], Pregatit, RezultatCercetareFirma, RezultatProfilAi>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId) => {
    if (!UUID.test(companyId)) throw new EroareUtilizator("Firma nu a fost găsită.");
    const [firma] = await ctx.db
      .select({ nume: companies.nume, cui: companies.cui, site: companies.site, caen: companies.caen, localitate: companies.localitate, judet: companies.judet })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator("Firma nu a fost găsită.");
    if (!aiConfigurat()) return { gata: { ok: false, eroare: "Cercetarea cu AI nu e configurată pe această platformă." } };
    if (await limitaCautareDepasita(ctx)) return { gata: { ok: false, eroare: MESAJ_LIMITA_CAUTARE } };
    if (!isPlatformAdmin(ctx.userEmail) && !(await verificaLimitaRata("ai-profil-firma", companyId, 1, 360))) {
      return { gata: { ok: false, eroare: "Firma a fost cercetată recent. Încearcă din nou peste câteva ore." } };
    }
    return { pregatit: { companyId, firma, ong: ctx.orgName } };
  },
  extern: async ({ firma, ong }) =>
    cercetaFirmaAI({ firma: firma.nume, cui: firma.cui, localizare: [firma.localitate, firma.judet].filter(Boolean).join(", "), site: firma.site, caen: firma.caen, ong, azi: aziBucuresti() }),
  salveaza: async (ctx, { companyId }, rezultat): Promise<RezultatProfilAi> => {
    if (!rezultat.ok) return { ok: false, eroare: rezultat.eroare };
    await ctx.db.execute(sql`
      update companies set extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('profilAi', ${JSON.stringify(rezultat.profil)}::text::jsonb)
      where id = ${companyId} and org_id = ${ctx.orgId}`);
    return { ok: true };
  },
});

export async function cercetaFirmaCuAI(orgSlug: string, companyId: string): Promise<RezultatProfilAi> {
  try {
    return await cercetaFirma(orgSlug, companyId);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, "Cercetarea nu a reușit. Încearcă din nou în câteva minute.", "profil-ai-firma") };
  }
}
