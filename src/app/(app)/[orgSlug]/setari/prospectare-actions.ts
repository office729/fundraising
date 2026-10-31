"use server";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, withOrgFaze } from "@/lib/auth/guard";
import { prospectareChei, prospectareJurnal, prospectareSuprimati } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { apolloValideaza, CONECTORI, curataMesaj, hunterValideaza, lushaValideaza, NUME_CONECTOR, prospeoValideaza, waalaxyListe, waalaxyValideaza, type Conector, type ElementWaalaxy, type Rezultat } from "@/lib/prospectare/motor";
import { criptareConfigurata, cripteaza, decripteaza } from "@/lib/secret-box";
import { getTr } from "@/lib/i18n/tr-server";

// Cheile PROPRII ale organizației la Lusha, Apollo, Prospeo, Hunter și Waalaxy (pachetul IMPACT). Se salvează criptat (AES-256-GCM) și nu se mai afișează niciodată;
// rămâne doar o amprentă (ultimele caractere). Doar owner și administratorii le gestionează. Costurile pentru apeluri sunt în contul organizației la furnizor.
const OPTIUNI = { modul: "prospectare-multi" as const };

// Campania Waalaxy se poate alege și după rolul persoanei (decident, buget/finanțe, CSR/marketing): fiecare rol are alt mesaj. Fără alegere pe rol, se folosește campania generală.
export type RolCampanie = "decident" | "buget" | "csr";
const ROLURI_CAMPANIE: readonly RolCampanie[] = ["decident", "buget", "csr"];
export type SetariWaalaxy = { listaId: string; listaNume: string; campanieId: string; campanieNume: string; campaniiRol: Partial<Record<RolCampanie, { id: string; nume: string }>> };

export type StareChei = {
  criptareActiva: boolean;
  chei: { furnizor: Conector; amprenta: string; adaugatLa: string }[];
  waalaxy: SetariWaalaxy | null;
  apeluri30Zile: Record<string, number>;
  suprimate: number;
};

const eConector = (v: string): v is Conector => (CONECTORI as readonly string[]).includes(v);

export const obtineStareChei = withOrgAdmin(
  async (ctx): Promise<StareChei> => {
    const [chei, folosite, suprimate] = await Promise.all([
      ctx.db.select({ furnizor: prospectareChei.provider, amprenta: prospectareChei.amprenta, la: prospectareChei.updatedAt, setari: prospectareChei.setari }).from(prospectareChei).where(eq(prospectareChei.orgId, ctx.orgId)),
      ctx.db
        .select({ furnizor: prospectareJurnal.provider, n: count() })
        .from(prospectareJurnal)
        .where(and(eq(prospectareJurnal.orgId, ctx.orgId), gte(prospectareJurnal.createdAt, sql`now() - interval '30 days'`)))
        .groupBy(prospectareJurnal.provider),
      ctx.db.select({ n: count() }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, ctx.orgId)),
    ]);
    const apeluri30Zile: Record<string, number> = {};
    for (const r of folosite) apeluri30Zile[r.furnizor] = r.n;
    const w = chei.find((c) => c.furnizor === "waalaxy")?.setari ?? {};
    return {
      criptareActiva: criptareConfigurata(),
      chei: chei.filter((c) => eConector(c.furnizor)).map((c) => ({ furnizor: c.furnizor as Conector, amprenta: c.amprenta, adaugatLa: c.la.toISOString() })),
      waalaxy: w.listaId
        ? {
            listaId: w.listaId,
            listaNume: w.listaNume ?? "",
            campanieId: w.campanieId ?? "",
            campanieNume: w.campanieNume ?? "",
            campaniiRol: Object.fromEntries(ROLURI_CAMPANIE.filter((r) => w[`campanie_${r}`]).map((r) => [r, { id: w[`campanie_${r}`], nume: w[`campanie_${r}_nume`] ?? "" }])),
          }
        : null,
      apeluri30Zile,
      suprimate: suprimate[0]?.n ?? 0,
    };
  },
  OPTIUNI,
);

// Lungimea cheilor diferă mult între furnizori (unele sunt tokenuri lungi); acceptăm doar caractere uzuale.
const RE_CHEIE = /^[A-Za-z0-9_\-.:=+/]{16,400}$/;

const VALIDATORI: Record<Conector, (cheie: string, f: typeof fetch) => Promise<Rezultat<true>>> = {
  apollo: apolloValideaza,
  hunter: hunterValideaza,
  prospeo: prospeoValideaza,
  lusha: lushaValideaza,
  waalaxy: waalaxyValideaza,
};

// Cheia se verifică la furnizor ÎNAINTE de salvare (un apel de verificare a contului), în afara tranzacției.
const salveaza = withOrgFaze<[string, string], { furnizor: Conector; cheie: string }, { ok: boolean; eroare?: string }, void>({
  admin: true,
  opts: OPTIUNI,
  pregateste: async (_ctx, furnizor, cheie) => {
    const t = await getTr();
    if (!eConector(furnizor)) throw new EroareUtilizator(t("Furnizor necunoscut.", "Unknown provider."));
    const curata = String(cheie ?? "").trim();
    if (!RE_CHEIE.test(curata)) throw new EroareUtilizator(t("Cheia pare incompletă sau are caractere nepermise. Copiază-o din contul tău la instrument, fără spații.", "The key looks incomplete or has disallowed characters. Copy it from your account at the tool, without spaces."));
    if (!criptareConfigurata()) throw new EroareUtilizator(t("Salvarea cheilor nu e activată pe această platformă (lipsește cheia de criptare). Scrie-ne ca s-o activăm.", "Saving keys is not enabled on this platform (the encryption key is missing). Write to us so we can enable it."));
    return { pregatit: { furnizor, cheie: curata } };
  },
  extern: async (p) => {
    const r = await VALIDATORI[p.furnizor](p.cheie, fetch);
    if (r.ok) return { ok: true };
    // Cheia respinsă: mesaj despre ce se poate verifica (nu trimite înapoi în Setări, unde e deja utilizatorul).
    if (r.status === 401 || r.status === 403) {
      const t = await getTr();
      return { ok: false, eroare: t(`${NUME_CONECTOR[p.furnizor]} nu a acceptat cheia. Verifică să fi copiat-o întreagă, fără spații, și că planul tău ${NUME_CONECTOR[p.furnizor]} include accesul API.`, `${NUME_CONECTOR[p.furnizor]} did not accept the key. Check that you copied all of it, without spaces, and that your ${NUME_CONECTOR[p.furnizor]} plan includes API access.`) };
    }
    return { ok: false, eroare: curataMesaj(r.eroare, [p.cheie]) };
  },
  salveaza: async (ctx, p, rezultat) => {
    if (!rezultat.ok) throw new EroareUtilizator(rezultat.eroare ?? (await getTr())("Cheia nu a putut fi verificată.", "The key could not be verified."));
    // O cheie nouă pentru același conector pornește de la zero alegerile (lista/campania Waalaxy aparțineau contului vechi).
    await ctx.db
      .insert(prospectareChei)
      .values({ orgId: ctx.orgId, provider: p.furnizor, cheieEnc: cripteaza(p.cheie), amprenta: `…${p.cheie.slice(-4)}`, adaugatDe: ctx.userId })
      .onConflictDoUpdate({ target: [prospectareChei.orgId, prospectareChei.provider], set: { cheieEnc: cripteaza(p.cheie), amprenta: `…${p.cheie.slice(-4)}`, adaugatDe: ctx.userId, setari: {}, updatedAt: new Date() } });
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_cheie_salvata", entitate: "organizatie", entitateId: ctx.orgId, detalii: { furnizor: p.furnizor } });
    revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  },
});

const sterge = withOrgAdmin(
  async (ctx, furnizor: string): Promise<void> => {
    if (!eConector(furnizor)) throw new EroareUtilizator((await getTr())("Furnizor necunoscut.", "Unknown provider."));
    await ctx.db.delete(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, furnizor)));
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_cheie_stearsa", entitate: "organizatie", entitateId: ctx.orgId, detalii: { furnizor } });
    revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  },
  OPTIUNI,
);

export async function salveazaCheieProspectare(orgSlug: string, furnizor: string, cheie: string): Promise<{ error: string | null }> {
  try {
    await salveaza(orgSlug, furnizor, cheie);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t(`Nu am putut salva cheia ${eConector(furnizor) ? NUME_CONECTOR[furnizor] : ""}. Încearcă din nou.`, `We could not save the ${eConector(furnizor) ? NUME_CONECTOR[furnizor] : ""} key. Please try again.`), "prospectare-cheie-salvare") };
  }
}

export async function stergeCheieProspectare(orgSlug: string, furnizor: string): Promise<{ error: string | null }> {
  try {
    await sterge(orgSlug, furnizor);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut șterge cheia. Încearcă din nou.", "We could not delete the key. Please try again."), "prospectare-cheie-stergere") };
  }
}

// ---- Waalaxy: alegerea listei (și, opțional, a campaniei) în care se trimit persoanele aprobate

export type OptiuniWaalaxy = { error: string | null; liste: ElementWaalaxy[]; campanii: ElementWaalaxy[] };

const citesteOptiuni = withOrgFaze<[], { cheie: string }, Rezultat<{ liste: ElementWaalaxy[]; campanii: ElementWaalaxy[] }>, OptiuniWaalaxy>({
  admin: true,
  opts: OPTIUNI,
  pregateste: async (ctx) => {
    const [r] = await ctx.db.select({ enc: prospectareChei.cheieEnc }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy"))).limit(1);
    const t = await getTr();
    if (!r) return { gata: { error: t("Conectează întâi cheia Waalaxy.", "Connect the Waalaxy key first."), liste: [], campanii: [] } };
    try {
      return { pregatit: { cheie: decripteaza(r.enc) } };
    } catch {
      return { gata: { error: t("Cheia Waalaxy nu mai poate fi citită; adaug-o din nou.", "The Waalaxy key can no longer be read; add it again."), liste: [], campanii: [] } };
    }
  },
  extern: (p) => waalaxyListe(p.cheie, fetch),
  salveaza: async (_ctx, _p, r): Promise<OptiuniWaalaxy> => (r.ok ? { error: null, liste: r.date.liste, campanii: r.date.campanii } : { error: r.eroare, liste: [], campanii: [] }),
});

export async function optiuniWaalaxy(orgSlug: string): Promise<OptiuniWaalaxy> {
  try {
    return await citesteOptiuni(orgSlug);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut citi listele din Waalaxy. Încearcă din nou.", "We could not read the lists from Waalaxy. Please try again."), "prospectare-waalaxy-liste"), liste: [], campanii: [] };
  }
}

const RE_ID = /^[A-Za-z0-9_-]{1,100}$/;
const taie = (v: unknown) => (typeof v === "string" ? v : "").trim().slice(0, 120);

const idValid = (v: unknown): v is string => typeof v === "string" && RE_ID.test(v);

const salveazaListaWaalaxy = withOrgAdmin(
  async (ctx, alegere: SetariWaalaxy): Promise<void> => {
    const t = await getTr();
    if (!idValid(alegere?.listaId)) throw new EroareUtilizator(t("Alege o listă din Waalaxy.", "Choose a list from Waalaxy."));
    if (alegere.campanieId && !idValid(alegere.campanieId)) throw new EroareUtilizator(t("Campania aleasă nu e validă.", "The chosen campaign is not valid."));
    const setari: Record<string, string> = { listaId: alegere.listaId, listaNume: taie(alegere.listaNume), campanieId: alegere.campanieId || "", campanieNume: alegere.campanieId ? taie(alegere.campanieNume) : "" };
    for (const rol of ROLURI_CAMPANIE) {
      const c = alegere.campaniiRol?.[rol];
      if (!c?.id) continue;
      if (!idValid(c.id)) throw new EroareUtilizator(t("O campanie aleasă pe rol nu e validă.", "A campaign chosen for a role is not valid."));
      setari[`campanie_${rol}`] = c.id;
      setari[`campanie_${rol}_nume`] = taie(c.nume);
    }
    const r = await ctx.db
      .update(prospectareChei)
      .set({ setari, updatedAt: new Date() })
      .where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy")))
      .returning({ id: prospectareChei.id });
    if (r.length === 0) throw new EroareUtilizator(t("Conectează întâi cheia Waalaxy.", "Connect the Waalaxy key first."));
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_waalaxy_lista", entitate: "organizatie", entitateId: ctx.orgId, detalii: { campanie: Boolean(alegere.campanieId) } });
    revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  },
  OPTIUNI,
);

export async function salveazaAlegereWaalaxy(orgSlug: string, alegere: SetariWaalaxy): Promise<{ error: string | null }> {
  try {
    await salveazaListaWaalaxy(orgSlug, alegere);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut salva alegerea. Încearcă din nou.", "We could not save the choice. Please try again."), "prospectare-waalaxy-alegere") };
  }
}

// ---- Persoane excluse de la prospectare (au cerut să nu mai fie propuse): listă vizibilă și reversibilă pentru administratori

export type Excludere = { id: string; tip: string; valoare: string; motiv: string | null; la: string };

const citesteExcluderi = withOrgAdmin(
  async (ctx): Promise<Excludere[]> => {
    const randuri = await ctx.db
      .select({ id: prospectareSuprimati.id, tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare, motiv: prospectareSuprimati.motiv, la: prospectareSuprimati.createdAt })
      .from(prospectareSuprimati)
      .where(eq(prospectareSuprimati.orgId, ctx.orgId))
      .orderBy(desc(prospectareSuprimati.createdAt))
      .limit(300);
    return randuri.map((r) => ({ ...r, la: r.la.toISOString() }));
  },
  OPTIUNI,
);

export async function listaExcluderiProspectare(orgSlug: string): Promise<Excludere[]> {
  try {
    return await citesteExcluderi(orgSlug);
  } catch {
    return [];
  }
}

const eliminaExcludere = withOrgAdmin(
  async (ctx, id: string): Promise<void> => {
    if (!idValid(id)) throw new EroareUtilizator((await getTr())("Excluderea nu a fost găsită.", "The exclusion was not found."));
    await ctx.db.delete(prospectareSuprimati).where(and(eq(prospectareSuprimati.id, id), eq(prospectareSuprimati.orgId, ctx.orgId)));
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_excludere_scoasa", entitate: "organizatie", entitateId: ctx.orgId, detalii: {} });
    revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  },
  OPTIUNI,
);

export async function scoateExcludereProspectare(orgSlug: string, id: string): Promise<{ error: string | null }> {
  try {
    await eliminaExcludere(orgSlug, id);
    return { error: null };
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut scoate persoana din listă. Încearcă din nou.", "We could not remove the person from the list. Please try again."), "prospectare-excludere-scoasa") };
  }
}
