import "server-only";

import { and, desc, eq, lt, sql } from "drizzle-orm";

import { costuriPeriodei, donatiiAtribuite, legaturiCampanii, type CtxDb } from "@/app/(app)/[orgSlug]/crm/reclame/queries";
import { apeleazaClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi, rulezaCaOrganizatie } from "@/lib/ai-org/consum-server";
import { ziBucuresti } from "@/lib/ai-org/consum";
import type { Loc } from "@/lib/ai-org/protocol";
import type { Utilizare } from "@/lib/ai-org/pret";
import { analizeReclame } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

import { FEREASTRA_IMPLICITA_ZILE, PLATFORME } from "./atribuire";
import { calculeazaIndicatori } from "./calcule";
import { ANALIZA_IN_LUCRU_MAX_MIN, construiestePrompt, saptamanaAnalizei, valideazaAnaliza, type AnalizaReclame, type CampanieAnaliza, type DateAnaliza, type TotaluriAnaliza } from "./analiza-ai";
import { asambleaza, type LinieRaport, type Raport } from "./raport";

// Analiza AI a reclamelor, pe contul Anthropic al organizației. Trei faze, ca nicio conexiune la baza de date să nu stea deschisă cât durează apelul AI:
// (1) pregătire în tranzacție scurtă: cheia, datele, „revendicarea” (rândul „in_lucru” care împiedică o a doua analiză simultană),
// (2) apelul către Claude, fără baza de date, (3) salvarea (consumul se înregistrează ȘI când apelul a eșuat) și păstrarea ultimelor analize.
// Modulul nu modifică niciodată bugete sau reclame: doar propune.

export const PASTREAZA_ANALIZE = 12;
const MAX_TOKENI = 12_000; // include și raționamentul modelului

export type RezultatAnaliza =
  | { ok: true; id: string }
  | { ok: false; cod: "fara-cheie" | "fara-date" | "deja" | "ai" | "format"; mesaj: string };

export type Pregatit = {
  analizaId: string;
  cheie: string;
  model: string;
  system: string;
  user: string;
  etichete: string[];
  locale: Loc;
  userId: string | null;
  dateSumar: { perioada: { de: string; pana: string }; totaluri: TotaluriAnaliza; campanii: number };
};

type OptPregatire = { sursa: "manual" | "cron"; userId: string | null; locale: Loc; azi?: string };

const MESAJE = {
  ro: {
    faraDate: "Nu există încă date de reclame pentru ultimele două săptămâni. Importă costurile sau conectează Meta Ads, apoi încearcă din nou.",
    deja: "O analiză a reclamelor e deja în lucru. Reîncarcă pagina peste un minut.",
    deciSaptamana: "Analiza acestei săptămâni există deja.",
    format: "Analiza AI nu a avut formatul cerut și n-a fost păstrată. Încearcă din nou; consumul a fost totuși înregistrat în Consum AI.",
  },
  en: {
    faraDate: "There is no ad data for the last two weeks yet. Import your costs or connect Meta Ads, then try again.",
    deja: "An ad analysis is already running. Reload the page in a minute.",
    deciSaptamana: "This week's analysis already exists.",
    format: "The AI analysis did not have the required format and was not kept. Try again; the usage was still recorded in AI usage.",
  },
} as const;

const N = (x: unknown): number => (x === null || x === undefined ? 0 : Number(x));

// Vizitatorii unici (pe zi) veniți pe paginile de campanie prin linkuri cu cod UTM, și cei care au deschis formularul de donație.
async function traficPeCod(ctx: CtxDb, de: string, pana: string): Promise<Map<string, { vizitatori: number; deschideri: number }>> {
  const r = await ctx.db.execute(sql`
    select e.utm_campanie as cod, e.tip, count(distinct (e.ziua::text || e.vizitator))::int as n
    from campaign_page_events e
    where e.org_id = ${ctx.orgId} and e.ziua between ${de}::date and ${pana}::date and e.utm_campanie is not null
    group by e.utm_campanie, e.tip
  `);
  const m = new Map<string, { vizitatori: number; deschideri: number }>();
  for (const x of r as unknown as { cod: string; tip: string; n: number }[]) {
    const cur = m.get(x.cod) ?? { vizitatori: 0, deschideri: 0 };
    if (x.tip === "vizita") cur.vizitatori = N(x.n);
    else if (x.tip === "deschide_donatia") cur.deschideri = N(x.n);
    m.set(x.cod, cur);
  }
  return m;
}

const lei = (bani: number) => bani / 100;

function totaluri(r: Raport): TotaluriAnaliza {
  const t = r.totaluri;
  const i = calculeazaIndicatori(t);
  return { cheltuialaLei: lei(t.cheltuieliBani), donatii: t.donatii, donatiiNeteLei: lei(i.netBani), donatoriNoi: t.donatoriNoi, roasNet: i.roasNet };
}

function campanie(l: LinieRaport, trafic: Map<string, { vizitatori: number; deschideri: number }>, anterior: Map<string, LinieRaport>, etichetePlatforme: Record<string, string>): CampanieAnaliza {
  const i = calculeazaIndicatori(l.totaluri);
  const tr = l.utmCampanie ? trafic.get(l.utmCampanie) : undefined;
  const ant = anterior.get(l.cheie);
  const antI = ant ? calculeazaIndicatori(ant.totaluri) : null;
  return {
    eticheta: l.eticheta,
    platforma: etichetePlatforme[l.platforma] ?? l.platforma,
    codUtm: l.utmCampanie,
    legata: l.legata,
    cheltuialaLei: lei(l.totaluri.cheltuieliBani),
    afisari: l.afisari,
    clicuriPlatforma: l.clicuri,
    vizitatoriLink: tr?.vizitatori ?? 0,
    deschideriFormular: tr?.deschideri ?? 0,
    donatii: l.totaluri.donatii,
    donatiiNeteLei: lei(i.netBani),
    donatoriNoi: l.totaluri.donatoriNoi,
    costPerDonatieLei: i.costPerDonatieBani === null ? null : lei(i.costPerDonatieBani),
    roasNet: i.roasNet,
    saptamanaAnterioara: ant && antI ? { cheltuialaLei: lei(ant.totaluri.cheltuieliBani), donatii: ant.totaluri.donatii, donatiiNeteLei: lei(antI.netBani) } : null,
  };
}

// Datele unei săptămâni (și ale celei dinainte) pentru AI: doar agregate pe campanie. Nicio donație individuală, niciun donator.
export async function adunaDateAnaliza(ctx: CtxDb, azi: string): Promise<{ date: DateAnaliza; areDate: boolean }> {
  const s = saptamanaAnalizei(azi);
  const etichetePlatforme = Object.fromEntries(PLATFORME.map((p) => [p.cheie, p.eticheta]));
  const legaturi = await legaturiCampanii(ctx);
  const [costuri, donatii, costuriAnt, donatiiAnt] = [
    await costuriPeriodei(ctx, s.de, s.pana),
    await donatiiAtribuite(ctx, s.de, s.pana, FEREASTRA_IMPLICITA_ZILE),
    await costuriPeriodei(ctx, s.anterioara.de, s.anterioara.pana),
    await donatiiAtribuite(ctx, s.anterioara.de, s.anterioara.pana, FEREASTRA_IMPLICITA_ZILE),
  ];
  const raport = asambleaza({ de: s.de, pana: s.pana, costuri, donatii, legaturi, etichetePlatforme, locale: "ro" });
  const raportAnt = asambleaza({ de: s.anterioara.de, pana: s.anterioara.pana, costuri: costuriAnt, donatii: donatiiAnt, legaturi, etichetePlatforme, locale: "ro" });
  const trafic = await traficPeCod(ctx, s.de, s.pana);
  const antMap = new Map(raportAnt.peCampanie.map((l) => [l.cheie, l]));
  const campanii = raport.peCampanie.filter((l) => l.totaluri.cheltuieliBani > 0 || l.totaluri.donatii > 0).map((l) => campanie(l, trafic, antMap, etichetePlatforme));
  const date: DateAnaliza = {
    perioada: { de: s.de, pana: s.pana },
    anterioara: s.anterioara,
    fereastraZile: FEREASTRA_IMPLICITA_ZILE,
    totaluri: totaluri(raport),
    totaluriAnterioare: totaluri(raportAnt),
    campanii,
    calitate: { costNealocatLei: lei(raport.costNealocatBani), donatiiFaraCostLegat: raport.donatiiFaraCostLegat },
  };
  const areDate = costuri.length + donatii.length + costuriAnt.length + donatiiAnt.length > 0;
  return { date, areDate };
}

// ───────────── faza 1 ─────────────

async function revendica(db: CtxDb["db"], orgId: string, opt: OptPregatire, p: { de: string; pana: string; luni: string }): Promise<{ id: string } | null> {
  const abandonat = sql`${analizeReclame.actualizatLa} < now() - make_interval(mins => ${ANALIZA_IN_LUCRU_MAX_MIN}::int)`;
  if (opt.sursa === "cron") {
    // Idempotent pe săptămână: indexul unic parțial (org_id, saptamana) pentru sursa „cron”.
    const nou = await db
      .insert(analizeReclame)
      .values({ orgId, sursa: "cron", saptamana: p.luni, perioadaDe: p.de, perioadaPana: p.pana, stare: "in_lucru" })
      .onConflictDoNothing()
      .returning({ id: analizeReclame.id });
    if (nou[0]) return { id: nou[0].id };
    // Există deja: se reia doar dacă a eșuat sau a rămas „in_lucru” fără să se termine (cererea a murit).
    const reluat = await db
      .update(analizeReclame)
      .set({ stare: "in_lucru", eroare: null, actualizatLa: new Date() })
      .where(and(eq(analizeReclame.orgId, orgId), eq(analizeReclame.sursa, "cron"), eq(analizeReclame.saptamana, p.luni), sql`(${analizeReclame.stare} = 'eroare' or (${analizeReclame.stare} = 'in_lucru' and ${abandonat}))`))
      .returning({ id: analizeReclame.id });
    return reluat[0] ? { id: reluat[0].id } : null;
  }
  // Manual: o singură analiză „in_lucru” pe organizație; blocarea consultativă face verificarea + inserarea atomice între două cereri simultane.
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`analize_reclame:${orgId}`}))`);
  const [activ] = await db
    .select({ id: analizeReclame.id })
    .from(analizeReclame)
    .where(and(eq(analizeReclame.orgId, orgId), eq(analizeReclame.stare, "in_lucru"), sql`not (${abandonat})`))
    .limit(1);
  if (activ) return null;
  const [nou] = await db
    .insert(analizeReclame)
    .values({ orgId, sursa: "manual", creatDe: opt.userId, perioadaDe: p.de, perioadaPana: p.pana, stare: "in_lucru" })
    .returning({ id: analizeReclame.id });
  return nou ? { id: nou.id } : null;
}

export async function pregatesteAnaliza(db: CtxDb["db"], orgId: string, opt: OptPregatire): Promise<{ gata: RezultatAnaliza } | { pregatit: Pregatit }> {
  const m = MESAJE[opt.locale];
  const cfg = await citesteConfigAi(db, orgId);
  if (!cfg.conectat || !cfg.cheie) return { gata: { ok: false, cod: "fara-cheie", mesaj: mesajFaraCheieAi(opt.locale, cfg.ilizibila, cfg.blocatBuget) } };

  const azi = opt.azi ?? ziBucuresti(new Date());
  const { date, areDate } = await adunaDateAnaliza({ db, orgId }, azi);
  if (!areDate) return { gata: { ok: false, cod: "fara-date", mesaj: m.faraDate } };

  const s = saptamanaAnalizei(azi);
  const claim = await revendica(db, orgId, opt, { de: s.de, pana: s.pana, luni: s.luni });
  if (!claim) return { gata: { ok: false, cod: "deja", mesaj: opt.sursa === "cron" ? m.deciSaptamana : m.deja } };

  const pregatitPrompt = construiestePrompt(date, opt.locale);
  return {
    pregatit: {
      analizaId: claim.id,
      cheie: cfg.cheie,
      model: cfg.model,
      system: pregatitPrompt.system,
      user: pregatitPrompt.user,
      etichete: date.campanii.map((c) => c.eticheta),
      locale: opt.locale,
      userId: opt.userId,
      dateSumar: { perioada: date.perioada, totaluri: date.totaluri, campanii: date.campanii.length },
    },
  };
}

// ───────────── faza 2 (fără baza de date) ─────────────

export type RezultatExtern = Awaited<ReturnType<typeof apeleazaClaude>>;

export async function apeleazaAnaliza(p: Pregatit): Promise<RezultatExtern> {
  return apeleazaClaude({
    cheie: p.cheie,
    model: p.model,
    system: p.system,
    mesaje: [{ role: "user", content: p.user }],
    maxTokens: MAX_TOKENI,
    efort: "medium",
    maxTure: 1,
    timeoutMs: 100_000,
    locale: p.locale,
  });
}

// ───────────── faza 3 ─────────────

async function pastreazaUltimele(db: CtxDb["db"], orgId: string): Promise<void> {
  const pastrate = await db
    .select({ id: analizeReclame.id })
    .from(analizeReclame)
    .where(eq(analizeReclame.orgId, orgId))
    .orderBy(desc(analizeReclame.creatLa))
    .limit(PASTREAZA_ANALIZE);
  if (pastrate.length < PASTREAZA_ANALIZE) return;
  const ultima = pastrate[pastrate.length - 1].id;
  const [prag] = await db.select({ la: analizeReclame.creatLa }).from(analizeReclame).where(eq(analizeReclame.id, ultima)).limit(1);
  if (!prag) return;
  // Se șterg doar cele mai vechi decât a 12-a; o analiză „in_lucru” nu se atinge.
  await db.delete(analizeReclame).where(and(eq(analizeReclame.orgId, orgId), lt(analizeReclame.creatLa, prag.la), sql`${analizeReclame.stare} <> 'in_lucru'`));
}

export async function salveazaAnaliza(db: CtxDb["db"], orgId: string, p: Pregatit, extern: RezultatExtern): Promise<RezultatAnaliza> {
  const utilizare: Utilizare = extern.utilizare;
  await inregistreazaConsum(db, { orgId, userId: p.userId, instrument: "reclame", model: extern.model, utilizare, costUsd: extern.costUsd });
  const cost = extern.costUsd.toFixed(6);

  if (!extern.ok) {
    await db.update(analizeReclame).set({ stare: "eroare", eroare: extern.eroare.slice(0, 400), costUsd: cost, model: extern.model, actualizatLa: new Date() }).where(and(eq(analizeReclame.id, p.analizaId), eq(analizeReclame.orgId, orgId)));
    return { ok: false, cod: "ai", mesaj: extern.eroare };
  }
  const v = valideazaAnaliza(extern.text, p.etichete);
  if (!v.ok || extern.trunchiat) {
    const mesaj = MESAJE[p.locale].format;
    await db.update(analizeReclame).set({ stare: "eroare", eroare: mesaj, costUsd: cost, model: extern.model, actualizatLa: new Date() }).where(and(eq(analizeReclame.id, p.analizaId), eq(analizeReclame.orgId, orgId)));
    return { ok: false, cod: "format", mesaj };
  }
  const rezultat: AnalizaReclame & { taiate: number } = { ...v.analiza, taiate: v.taiate };
  await db
    .update(analizeReclame)
    .set({ stare: "gata", rezultat, dateSumar: p.dateSumar, eroare: null, costUsd: cost, model: extern.model, actualizatLa: new Date() })
    .where(and(eq(analizeReclame.id, p.analizaId), eq(analizeReclame.orgId, orgId)));
  await pastreazaUltimele(db, orgId);
  return { ok: true, id: p.analizaId };
}

// ───────────── cron ─────────────

// O organizație, de la cap la coadă, fiecare fază în tranzacția ei (RLS pe organizație). Nu aruncă: o eroare nu trebuie să le oprească pe celelalte.
export async function ruleazaAnalizaPentruOrganizatie(orgId: string, azi: string): Promise<RezultatAnaliza> {
  const faza1 = await rulezaCaOrganizatie(orgId, (db) => pregatesteAnaliza(db, orgId, { sursa: "cron", userId: null, locale: "ro", azi }));
  if ("gata" in faza1) return faza1.gata;
  const extern = await apeleazaAnaliza(faza1.pregatit);
  try {
    return await rulezaCaOrganizatie(orgId, (db) => salveazaAnaliza(db, orgId, faza1.pregatit, extern));
  } catch (e) {
    raporteazaEroare("analiza-reclame-salvare", e, { orgId });
    throw e;
  }
}

// ───────────── citire pentru pagină ─────────────

export type AnalizaSalvata = {
  id: string;
  stare: "in_lucru" | "gata" | "eroare";
  sursa: "manual" | "cron";
  perioadaDe: string;
  perioadaPana: string;
  creatLa: string;
  costUsd: number;
  eroare: string | null;
  analiza: (AnalizaReclame & { taiate: number }) | null;
  totaluri: TotaluriAnaliza | null;
};

export async function citesteAnalize(db: CtxDb["db"], orgId: string): Promise<AnalizaSalvata[]> {
  const r = await db.select().from(analizeReclame).where(eq(analizeReclame.orgId, orgId)).orderBy(desc(analizeReclame.creatLa)).limit(PASTREAZA_ANALIZE);
  return r.map((x) => {
    const sumar = (x.dateSumar ?? null) as { totaluri?: TotaluriAnaliza } | null;
    return {
      id: x.id,
      stare: x.stare === "gata" || x.stare === "eroare" ? x.stare : "in_lucru",
      sursa: x.sursa === "cron" ? "cron" : "manual",
      perioadaDe: x.perioadaDe,
      perioadaPana: x.perioadaPana,
      creatLa: x.creatLa.toISOString(),
      costUsd: Number(x.costUsd),
      eroare: x.eroare,
      analiza: x.stare === "gata" && x.rezultat ? (x.rezultat as AnalizaReclame & { taiate: number }) : null,
      totaluri: sumar?.totaluri ?? null,
    };
  });
}
