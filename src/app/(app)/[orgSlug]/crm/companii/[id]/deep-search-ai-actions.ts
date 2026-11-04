"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { apeleazaClaude, type RezultatClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi } from "@/lib/ai-org/consum-server";
import { withOrgFaze } from "@/lib/auth/guard";
import { companies, deepSearchAi, prospectareCandidati } from "@/lib/db/schema";
import { cerereUtilizator, MAX_CAUTARI_WEB, promptSistem } from "@/lib/deep-search-ai/prompt";
import { esteMemoratProaspat, parseazaRaspunsAi } from "@/lib/deep-search-ai/validare";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { PROSPECTARE_DEEP_DICT } from "@/lib/i18n/dictionaries/prospectare-deep-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { uneste, type CandidatDeep } from "@/lib/prospectare/deep-search";
import { etichetaRol, scorDecident } from "@/lib/prospectare/motor";
import { candidatDinRand, esteExclus, incarcaExcluderi, salveazaCandidati, type CandidatDeSalvat, type Excluderi } from "@/lib/prospectare/server";

// „Caută pe internet (AI)”: Claude cu căutare web caută decidenții firmei în surse PUBLICE (site, presă, registre), cu cheia Anthropic a ORGANIZAȚIEI.
// Persoanele găsite intră în lista „De aprobat” (sursa „web-ai”), cu linkul sursei; email/telefon doar dacă sunt publicate. Rezultatul se ține minte 30 de zile pe firmă
// (deep_search_ai); costul intră în Consum AI cu instrumentul „deep_search_ai”. Doar un administrator poate repeta căutarea înainte de 30 de zile (costă bani).
const OPTIUNI = { modul: "ai-agenti" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esteAdminRol = (rol: string) => rol === "owner" || rol === "admin";
const msg = async () => PROSPECTARE_DEEP_DICT[await getLocale()].msg;

export type RezultatWebAi = {
  ok: boolean;
  eroare?: string;
  gasiti?: number; // persoane găsite de AI (după curățare)
  noi?: number; // persoane noi puse în listă
  dinMemorie?: boolean; // rezultat memorat (0 cost)
  la?: string; // data căutării (ISO)
  ignorati?: number;
};

type PregatitAi = {
  companyId: string;
  firma: { nume: string; cui: string | null; localitate: string | null; judet: string | null; site: string | null; administrator: string | null; angajati: number | null };
  cheie: string;
  model: string;
  numeOrganizatie: string;
  locale: "ro" | "en";
  existente: ReturnType<typeof candidatDinRand>[];
  excluderi: Excluderi;
};

const cautaAi = withOrgFaze<[string, boolean], PregatitAi, RezultatClaude, RezultatWebAi>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId, forteaza) => {
    const m = await msg();
    if (!UUID.test(companyId)) throw new EroareUtilizator(m.firmaNegasita);
    const [firma] = await ctx.db
      .select({ nume: companies.nume, cui: companies.cui, localitate: companies.localitate, judet: companies.judet, site: companies.site, administrator: companies.administrator, angajati: companies.nrAngajati })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator(m.firmaNegasita);

    // Memorat 30 de zile: nu plătim de două ori. Doar un administrator poate cere o nouă căutare (cost real).
    const [memorie] = await ctx.db.select().from(deepSearchAi).where(and(eq(deepSearchAi.orgId, ctx.orgId), eq(deepSearchAi.companyId, companyId))).limit(1);
    const proaspat = esteMemoratProaspat(memorie?.createdAt.toISOString());
    if (memorie && proaspat && !(forteaza && esteAdminRol(ctx.role))) {
      return { gata: { ok: true, dinMemorie: true, gasiti: memorie.gasiti, noi: 0, la: memorie.createdAt.toISOString() } };
    }

    const locale = await getLocale();
    const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
    if (!cfg.conectat || !cfg.cheie) return { gata: { ok: false, eroare: mesajFaraCheieAi(locale, cfg.ilizibila) } };

    const [existente, excluderi] = await Promise.all([
      ctx.db
        .select()
        .from(prospectareCandidati)
        .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.stare, "nou"))),
      incarcaExcluderi(ctx.db, ctx.orgId, companyId),
    ]);
    return {
      pregatit: { companyId, firma, cheie: cfg.cheie, model: cfg.model, numeOrganizatie: ctx.orgName, locale, existente: existente.map(candidatDinRand), excluderi },
    };
  },
  // Faza externă: fără conexiune la baza de date (poate dura peste un minut).
  extern: async (p) =>
    apeleazaClaude({
      cheie: p.cheie,
      model: p.model,
      system: promptSistem(p.numeOrganizatie),
      mesaje: [{ role: "user", content: cerereUtilizator(p.firma) }],
      maxTokens: 8000,
      efort: "medium",
      // fără user_location: codul de țară RO nu e acceptat de căutarea web (firma e oricum din România)
      cautareWeb: { maxUtilizari: MAX_CAUTARI_WEB },
      timeoutMs: 90_000,
      maxTure: 2,
      termenTotalMs: 150_000, // pagina are maxDuration 180: lăsăm timp pentru faza de salvare
      locale: p.locale,
    }),
  salveaza: async (ctx, p, r): Promise<RezultatWebAi> => {
    const m = await msg();
    // Consumul se înregistrează ÎNTÂI, și când apelul a eșuat parțial (o tură a reușit, apoi a venit eroarea).
    await inregistreazaConsum(ctx.db, { orgId: ctx.orgId, userId: ctx.userId, instrument: "deep_search_ai", model: r.model, utilizare: r.utilizare, costUsd: r.costUsd });
    if (!r.ok) return { ok: false, eroare: r.eroare };
    const parsat = parseazaRaspunsAi(r.text);
    if (!parsat.ok) return { ok: false, eroare: m.webRaspunsInvalid };

    // Fără cei excluși (au cerut să nu mai fie propuși, respinși sau șterși: doar amprente) și fără cei deja în contactele firmei.
    const noi = parsat.decidenti.filter((d) => !esteExclus(p.excluderi, ctx.orgId, p.companyId, d));
    const lista: CandidatDeSalvat[] = noi.map((d) => {
      const s = scorDecident(d.rol, { romania: true, angajati: p.firma.angajati });
      return {
        nume: d.nume,
        rol: d.rol,
        dept: "",
        linkedin: "",
        email: d.email ?? "",
        emailStatus: null,
        telefon: d.telefon ?? undefined,
        sursa: "web-ai",
        sursaUrl: d.sursaUrl,
        ids: {},
        alteSurse: [],
        scor: s.scor,
        prioritate: s.prioritate,
        eticheta: etichetaRol(d.rol),
      };
    });
    // Rândurile deja în „De aprobat” (găsite de Apollo, Prospeo etc.) se unesc cu ce aduce AI-ul, ca la Deep Search: altfel salvarea le-ar suprascrie și ar pierde
    // furnizorul și id-urile cu care se cumpără emailul la „Aprobă”.
    const unite = uneste<CandidatDeep>([p.existente, lista]).map((c): CandidatDeSalvat => ({ ...c, scor: c.scor ?? 0, prioritate: c.prioritate ?? null, eticheta: c.eticheta ?? "" }));
    const adaugate = await salveazaCandidati(ctx.db, ctx.orgId, p.companyId, ctx.userId, unite);
    const la = new Date();
    await ctx.db
      .insert(deepSearchAi)
      .values({ orgId: ctx.orgId, companyId: p.companyId, createdAt: la, createdBy: ctx.userId, gasiti: parsat.decidenti.length, surse: r.surse.length, costUsd: r.costUsd.toFixed(6), model: r.model.slice(0, 80) })
      .onConflictDoUpdate({ target: [deepSearchAi.orgId, deepSearchAi.companyId], set: { createdAt: la, createdBy: ctx.userId, gasiti: parsat.decidenti.length, surse: r.surse.length, costUsd: r.costUsd.toFixed(6), model: r.model.slice(0, 80) } });
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    revalidatePath(`/${ctx.orgSlug}/crm/decidenti`);
    return { ok: true, gasiti: parsat.decidenti.length, noi: adaugate, dinMemorie: false, la: la.toISOString(), ignorati: parsat.ignorati };
  },
});

export async function cautaDecidentiWebAi(orgSlug: string, companyId: string, forteaza = false): Promise<RezultatWebAi> {
  const m = await msg();
  try {
    return await cautaAi(orgSlug, companyId, forteaza === true);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, m.webEsuat, "deep-search-ai") };
  }
}
