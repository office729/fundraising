"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { reclameCampanii, reclameConexiuni, reclameCosturi, reclameImporturi, reclameLinkuri } from "@/lib/db/schema";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { criptareConfigurata } from "@/lib/secret-box";
import { curataCod, esteCheiePlatforma, FEREASTRA_IMPLICITA_ZILE, PLATFORME } from "@/lib/reclame/atribuire";
import { perioadaAnterioara, rezolvaPerioada, type PresetPerioada } from "@/lib/reclame/calcule";
import { detecteazaColoane, MAX_RANDURI, monedaDinAntet, normalizeaza, parseCsv, type CampMapat, type Mapare, type RandCost } from "@/lib/reclame/csv-costuri";
import { asambleaza, totaluriSimple, type LegaturaCampanie, type Raport, type Totaluri } from "@/lib/reclame/raport";
import { conecteazaMeta, deconecteazaMeta, sincronizeazaMeta, type RezultatConectare, type RezultatSync } from "@/lib/reclame/meta-sync";
import { traduEroareMeta } from "@/lib/i18n/dictionaries/lib-mesaje-ui";
import { construiesteLink } from "@/lib/reclame/utm";

import { calitateDate, costuriPeriodei, donatiiAtribuite, legaturiCampanii, parcursObservat, reinnoiriAbonamenteAtribuite, type CalitateDate, type Parcurs } from "./queries";

// Modulul „Performanța reclamelor” (inclus din pachetul IMPACT, vezi MODULE_PACHET). Doar proprietarul și administratorii: conține cheltuieli și donații.
// Conexiunile pentru reclame sunt doar pentru citire; modulul nu modifică niciodată bugete sau reclame la platforme.
const OPT = { modul: "reclame" as const };

const FEREASTRE = [1, 7, 30];
const MAX_TEXT = 3_000_000;

export type ParametriReclame = { preset?: string; de?: string; pana?: string; fer?: string };

export type ImportRand = { id: string; platforma: string; numeFisier: string | null; randuri: number; deLa: string | null; panaLa: string | null; moneda: string; cursRon: number; totalRonBani: number; creatLa: string };
export type LinkRand = { id: string; url: string; utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string | null; eticheta: string | null; creatLa: string };

// Conexiunea către o platformă de reclame, fără token (tokenul nu părăsește niciodată serverul).
export type ConexiuneMeta = {
  platforma: string;
  contId: string;
  contNume: string | null;
  moneda: string | null;
  fusOrar: string | null;
  stare: string;
  ultimaEroare: string | null;
  ultimaSincronizare: string | null;
  ultimaReusita: string | null;
  randuriUltima: number | null;
  deLa: string | null;
  panaLa: string | null;
};

export type DateReclame = {
  perioada: { preset: PresetPerioada; de: string; pana: string; anterioara: { de: string; pana: string }; azi: string; ziuaInCurs: boolean };
  fereastraZile: number;
  raport: Raport;
  anterior: Totaluri;
  parcurs: Parcurs;
  reinnoiri: { abonamente: number; incasatBani: number };
  calitate: CalitateDate;
  legaturi: LegaturaCampanie[];
  importuri: ImportRand[];
  linkuri: LinkRand[];
  conexiuni: ConexiuneMeta[];
  // false = serverul nu poate păstra tokenuri criptate (lipsește ORG_SECRETS_KEY): conectarea nu se oferă.
  conectareDisponibila: boolean;
  etichetePlatforme: Record<string, string>;
};

const aziBucuresti = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const obtineDateReclame = withOrgAdmin(async (ctx, p: ParametriReclame = {}): Promise<DateReclame> => {
  const azi = aziBucuresti();
  const perioada = rezolvaPerioada(p.preset, azi, p.de, p.pana);
  const anterioara = perioadaAnterioara(perioada.de, perioada.pana);
  const ferCeruta = Number(p.fer);
  const fereastraZile = FEREASTRE.includes(ferCeruta) ? ferCeruta : FEREASTRA_IMPLICITA_ZILE;
  const locale = await getLocale();
  const etichetePlatforme = Object.fromEntries(PLATFORME.map((x) => [x.cheie, RECLAME_UI_DICT[locale].platforme[x.cheie] ?? x.eticheta]));

  const costuri = await costuriPeriodei(ctx, perioada.de, perioada.pana);
  const donatii = await donatiiAtribuite(ctx, perioada.de, perioada.pana, fereastraZile);
  const legaturi = await legaturiCampanii(ctx);
  const raport = asambleaza({ de: perioada.de, pana: perioada.pana, costuri, donatii, legaturi, etichetePlatforme, locale });

  const costuriAnt = await costuriPeriodei(ctx, anterioara.de, anterioara.pana);
  const donatiiAnt = await donatiiAtribuite(ctx, anterioara.de, anterioara.pana, fereastraZile);
  const anterior = totaluriSimple(costuriAnt, donatiiAnt);

  const parcurs = await parcursObservat(ctx, perioada.de, perioada.pana);
  const reinnoiri = await reinnoiriAbonamenteAtribuite(ctx, perioada.de, perioada.pana, fereastraZile);
  const calitate = await calitateDate(ctx, perioada.de, perioada.pana);

  const importuri = await ctx.db.select().from(reclameImporturi).where(eq(reclameImporturi.orgId, ctx.orgId)).orderBy(desc(reclameImporturi.creatLa)).limit(10);
  const linkuri = await ctx.db.select().from(reclameLinkuri).where(eq(reclameLinkuri.orgId, ctx.orgId)).orderBy(desc(reclameLinkuri.creatLa)).limit(15);

  const conexiuni = await ctx.db.select().from(reclameConexiuni).where(eq(reclameConexiuni.orgId, ctx.orgId));

  return {
    perioada: { ...perioada, anterioara, azi, ziuaInCurs: perioada.pana >= azi },
    fereastraZile,
    raport,
    anterior,
    parcurs,
    reinnoiri,
    calitate,
    legaturi,
    importuri: importuri.map((i) => ({
      id: i.id,
      platforma: i.platforma,
      numeFisier: i.numeFisier,
      randuri: i.randuri,
      deLa: i.deLa,
      panaLa: i.panaLa,
      moneda: i.moneda,
      cursRon: Number(i.cursRon),
      totalRonBani: i.totalRonMinor,
      creatLa: i.creatLa.toISOString(),
    })),
    linkuri: linkuri.map((l) => ({ id: l.id, url: l.url, utmSource: l.utmSource, utmMedium: l.utmMedium, utmCampaign: l.utmCampaign, utmContent: l.utmContent, eticheta: l.eticheta, creatLa: l.creatLa.toISOString() })),
    conexiuni: conexiuni.map((c) => ({
      platforma: c.platforma,
      contId: c.contId,
      contNume: c.contNume,
      moneda: c.moneda,
      fusOrar: c.fusOrar,
      stare: c.stare,
      ultimaEroare: c.ultimaEroare ? traduEroareMeta(c.ultimaEroare, locale) : null,
      ultimaSincronizare: c.ultimaSincronizare ? c.ultimaSincronizare.toISOString() : null,
      ultimaReusita: c.ultimaReusita ? c.ultimaReusita.toISOString() : null,
      randuriUltima: c.randuriUltima,
      deLa: c.deLa,
      panaLa: c.panaLa,
    })),
    conectareDisponibila: criptareConfigurata(),
    etichetePlatforme,
  };
}, OPT);

// ───────────── conexiunea Meta (doar citire) ─────────────

// Verificarea accesului se face într-o tranzacție scurtă; cererile către Meta (lente) rulează apoi fără conexiune deschisă la baza de date.
const autorizeaza = withOrgAdmin(async (ctx) => ({ orgId: ctx.orgId, userId: ctx.userId }), OPT);

export async function conecteazaMetaAction(orgSlug: string, input: { contId: string; token: string; cursManual?: number | null }): Promise<RezultatConectare> {
  const { orgId, userId } = await autorizeaza(orgSlug);
  const locale = await getLocale();
  const t = RECLAME_UI_DICT[locale].actiuni;
  // Plafon pe organizație: tokenurile greșite încercate la nesfârșit nu trebuie să încarce Meta sau serverul.
  if (!(await verificaLimitaRata("reclame-meta-conectare", orgId, 10, 60))) return { ok: false, eroare: t.prea };
  const r = await conecteazaMeta(orgId, userId, input);
  return r.ok ? r : { ...r, eroare: traduEroareMeta(r.eroare, locale) };
}

export async function sincronizeazaMetaAction(orgSlug: string, zile: number): Promise<RezultatSync> {
  const { orgId } = await autorizeaza(orgSlug);
  if (!(await verificaLimitaRata("reclame-meta-sync", orgId, 8, 60))) return { ok: false, eroare: RECLAME_UI_DICT[await getLocale()].actiuni.preaSync, clasa: "limita-locala" };
  const r = await sincronizeazaMeta(orgId, { zile: [7, 28, 90].includes(zile) ? zile : 7 });
  return r.ok ? r : { ...r, eroare: traduEroareMeta(r.eroare, await getLocale()) };
}

export async function deconecteazaMetaAction(orgSlug: string): Promise<{ ok: true }> {
  const { orgId } = await autorizeaza(orgSlug);
  await deconecteazaMeta(orgId);
  return { ok: true };
}

// ───────────── import costuri din CSV ─────────────

export type AnalizaCsv =
  | { ok: false; eroare: string }
  | {
      ok: true;
      antet: string[];
      mapare: Mapare;
      moneda: string | null;
      randuriInFisier: number;
      randuriValide: number;
      ignorate: number;
      erori: { linie: number; mesaj: string }[];
      nrErori: number;
      de: string | null;
      pana: string | null;
      totalBani: number;
      campanii: { cheie: string; nume: string; utmExistent: Record<string, string> }[];
      previzualizare: RandCost[];
    };

const CAMPURI: CampMapat[] = ["ziua", "campanieNume", "campanieCheie", "setNume", "setCheie", "reclamaNume", "reclamaCheie", "cheltuiala", "afisari", "clicuri", "plasament", "cont"];

function maparePrimita(brut: unknown, nrColoane: number): Mapare | null {
  if (!brut || typeof brut !== "object") return null;
  const m: Mapare = {};
  for (const c of CAMPURI) {
    const v = (brut as Record<string, unknown>)[c];
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n >= nrColoane) return null;
    m[c] = n;
  }
  return m;
}

export const analizeazaCsvAction = withOrgAdmin(async (ctx, input: { text: string; mapare?: Mapare }): Promise<AnalizaCsv> => {
  const locale = await getLocale();
  const t = RECLAME_UI_DICT[locale].actiuni;
  const text = typeof input?.text === "string" ? input.text : "";
  if (!text.trim()) return { ok: false, eroare: t.fisierGol };
  if (text.length > MAX_TEXT) return { ok: false, eroare: t.fisierMare };
  const randuri = parseCsv(text);
  if (randuri.length < 2) return { ok: false, eroare: t.faraDate };
  if (randuri.length - 1 > MAX_RANDURI) return { ok: false, eroare: t.preaMulteRanduri(MAX_RANDURI.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")) };
  const antet = randuri[0]!.map((h) => h.trim());
  const mapare = (input.mapare ? maparePrimita(input.mapare, antet.length) : null) ?? detecteazaColoane(antet);
  const norm = normalizeaza(randuri, mapare, { locale });
  const legaturi = await legaturiCampanii(ctx);
  return {
    ok: true,
    antet,
    mapare,
    moneda: monedaDinAntet(antet, mapare),
    randuriInFisier: randuri.length - 1,
    randuriValide: norm.randuri.length,
    ignorate: norm.ignorate,
    erori: norm.erori.slice(0, 15),
    nrErori: norm.erori.length,
    de: norm.de,
    pana: norm.pana,
    totalBani: norm.totalMinor,
    campanii: norm.campanii.slice(0, 300).map((c) => ({
      cheie: c.cheie,
      nume: c.nume,
      utmExistent: Object.fromEntries(legaturi.filter((l) => l.campanieCheie === c.cheie && l.utmCampanie).map((l) => [l.platforma, l.utmCampanie!])),
    })),
    previzualizare: norm.randuri.slice(0, 8),
  };
}, OPT);

export type RezultatImport = { ok: true; randuri: number; totalBani: number } | { ok: false; eroare: string };

export const confirmaImportAction = withOrgAdmin(
  async (
    ctx,
    input: { text: string; mapare: Mapare; platforma: string; moneda: string; cursRon: number; numeFisier?: string; legaturi: Record<string, string> },
  ): Promise<RezultatImport> => {
    const locale = await getLocale();
    const t = RECLAME_UI_DICT[locale].actiuni;
    if (!esteCheiePlatforma(input.platforma)) return { ok: false, eroare: t.alegePlatforma };
    const moneda = String(input.moneda ?? "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(moneda)) return { ok: false, eroare: t.monedaInvalida };
    const curs = moneda === "RON" ? 1 : Number(input.cursRon);
    if (!Number.isFinite(curs) || curs <= 0 || curs > 1000) return { ok: false, eroare: t.cursNecesar(moneda) };
    const text = typeof input.text === "string" ? input.text : "";
    if (!text.trim() || text.length > MAX_TEXT) return { ok: false, eroare: t.fisierLipsa };
    const rows = parseCsv(text);
    if (rows.length < 2 || rows.length - 1 > MAX_RANDURI) return { ok: false, eroare: t.formatNeacceptat };
    const mapare = maparePrimita(input.mapare, rows[0]!.length);
    if (!mapare) return { ok: false, eroare: t.mapareInvalida };
    const norm = normalizeaza(rows, mapare, { locale });
    if (norm.randuri.length === 0) return { ok: false, eroare: norm.erori[0]?.mesaj ?? t.niciunRand };

    const lotId = randomUUID();
    const platforma = input.platforma;
    const valori = norm.randuri.map((r) => ({
      orgId: ctx.orgId,
      platforma,
      ziua: r.ziua,
      cont: r.cont,
      campanieCheie: r.campanieCheie,
      campanieNume: r.campanieNume,
      setCheie: r.setCheie,
      setNume: r.setNume,
      reclamaCheie: r.reclamaCheie,
      reclamaNume: r.reclamaNume,
      plasament: r.plasament,
      moneda,
      cheltuialaMinor: r.cheltuialaMinor,
      cursRon: String(curs),
      cheltuialaRonMinor: Math.round(r.cheltuialaMinor * curs),
      afisari: r.afisari,
      clicuriLink: r.clicuri,
      sursa: "import",
      lotId,
    }));
    const totalRon = valori.reduce((s, v) => s + v.cheltuialaRonMinor, 0);

    // Reimportul aceleiași perioade înlocuiește rândurile cu aceeași cheie (zi + campanie + set + reclamă + plasament), nu le dublează.
    for (let i = 0; i < valori.length; i += 500) {
      await ctx.db
        .insert(reclameCosturi)
        .values(valori.slice(i, i + 500))
        .onConflictDoUpdate({
          target: [reclameCosturi.orgId, reclameCosturi.platforma, reclameCosturi.ziua, reclameCosturi.cont, reclameCosturi.campanieCheie, reclameCosturi.setCheie, reclameCosturi.reclamaCheie, reclameCosturi.plasament],
          set: {
            campanieNume: sql`excluded.campanie_nume`,
            setNume: sql`excluded.set_nume`,
            reclamaNume: sql`excluded.reclama_nume`,
            moneda: sql`excluded.moneda`,
            cheltuialaMinor: sql`excluded.cheltuiala_minor`,
            cursRon: sql`excluded.curs_ron`,
            cheltuialaRonMinor: sql`excluded.cheltuiala_ron_minor`,
            afisari: sql`excluded.afisari`,
            clicuriLink: sql`excluded.clicuri_link`,
            sursa: sql`excluded.sursa`,
            lotId: sql`excluded.lot_id`,
            actualizatLa: sql`now()`,
          },
        });
    }

    // Legătura campanie publicitară ↔ cod UTM: un cod lăsat gol nu șterge o legătură existentă.
    for (const c of norm.campanii) {
      const utm = curataCod(input.legaturi?.[c.cheie]);
      await ctx.db
        .insert(reclameCampanii)
        .values({ orgId: ctx.orgId, platforma, campanieCheie: c.cheie, campanieNume: c.nume, utmCampanie: utm })
        .onConflictDoUpdate({
          target: [reclameCampanii.orgId, reclameCampanii.platforma, reclameCampanii.campanieCheie],
          set: { campanieNume: sql`excluded.campanie_nume`, utmCampanie: sql`coalesce(excluded.utm_campanie, reclame_campanii.utm_campanie)` },
        });
    }

    await ctx.db.insert(reclameImporturi).values({
      id: lotId,
      orgId: ctx.orgId,
      platforma,
      numeFisier: input.numeFisier ? String(input.numeFisier).slice(0, 200) : null,
      randuri: valori.length,
      deLa: norm.de,
      panaLa: norm.pana,
      moneda,
      cursRon: String(curs),
      totalRonMinor: totalRon,
      creatDe: ctx.userId,
    });
    return { ok: true, randuri: valori.length, totalBani: totalRon };
  },
  OPT,
);

export const stergeImportAction = withOrgAdmin(async (ctx, id: string): Promise<{ ok: boolean }> => {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false };
  await ctx.db.delete(reclameCosturi).where(and(eq(reclameCosturi.orgId, ctx.orgId), eq(reclameCosturi.lotId, id)));
  await ctx.db.delete(reclameImporturi).where(and(eq(reclameImporturi.orgId, ctx.orgId), eq(reclameImporturi.id, id)));
  return { ok: true };
}, OPT);

// ───────────── legături campanie ↔ cod UTM ─────────────

export const salveazaLegaturaAction = withOrgAdmin(async (ctx, input: { platforma: string; campanieCheie: string; utmCampanie: string }): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const t = RECLAME_UI_DICT[await getLocale()].actiuni;
  if (!esteCheiePlatforma(input.platforma)) return { ok: false, eroare: t.platformaNecunoscuta };
  const gol = String(input.utmCampanie ?? "").trim() === "";
  const utm = gol ? null : curataCod(input.utmCampanie);
  if (!gol && !utm) return { ok: false, eroare: t.codInvalid };
  const r = await ctx.db
    .update(reclameCampanii)
    .set({ utmCampanie: utm })
    .where(and(eq(reclameCampanii.orgId, ctx.orgId), eq(reclameCampanii.platforma, input.platforma), eq(reclameCampanii.campanieCheie, String(input.campanieCheie))))
    .returning({ id: reclameCampanii.id });
  return r.length ? { ok: true } : { ok: false, eroare: t.campanieNegasita };
}, OPT);

// ───────────── generator de linkuri UTM ─────────────

export const salveazaLinkAction = withOrgAdmin(
  async (ctx, input: { url: string; source: string; medium: string; campaign: string; content?: string; eticheta?: string }): Promise<{ ok: true; url: string } | { ok: false; eroare: string }> => {
    const r = construiesteLink(input, await getLocale());
    if (!r.ok) return { ok: false, eroare: r.eroare };
    await ctx.db.insert(reclameLinkuri).values({
      orgId: ctx.orgId,
      url: r.url.slice(0, 2000),
      utmSource: input.source.trim().toLowerCase(),
      utmMedium: input.medium.trim().toLowerCase(),
      utmCampaign: input.campaign.trim().toLowerCase(),
      utmContent: input.content?.trim() ? input.content.trim().toLowerCase() : null,
      eticheta: input.eticheta?.trim() ? input.eticheta.trim().slice(0, 120) : null,
      creatDe: ctx.userId,
    });
    return { ok: true, url: r.url };
  },
  OPT,
);

export const stergeLinkAction = withOrgAdmin(async (ctx, id: string): Promise<{ ok: boolean }> => {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false };
  await ctx.db.delete(reclameLinkuri).where(and(eq(reclameLinkuri.orgId, ctx.orgId), eq(reclameLinkuri.id, id)));
  return { ok: true };
}, OPT);
