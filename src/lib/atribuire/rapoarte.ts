import "server-only";

import { sql, type SQL } from "drizzle-orm";

import type { db } from "@/lib/db";
import { celulaSigura } from "@/lib/reclame/export-csv";

import { esteCanal, esteFlux, esteTip, ETICHETE_CANAL, type Canal, type Flux, type TipPromovare } from "./clasificare";
import { esteModel, rata, type ModelAtribuire } from "./model";
import { citesteFereastra } from "./server";

type Dbx = typeof db;

// ---------------------------------------------------------------------------------------------------------------------
// Definițiile indicatorilor (aceleași în pagină și în exportul CSV):
//  - Vizitatori: vizitatori distincți cu cel puțin o vizită în perioadă. Cu acord = persoană (ID pseudonim), fără acord = vizitator-zi (amprentă zilnică).
//    Din surse diferite NU se adună: un vizitator care a venit din două surse apare în ambele rânduri, dar o singură dată în totaluri.
//  - Sesiuni: perechi (vizitator, sesiune) distincte.
//  - Donatori unici: adrese de email distincte ale donațiilor confirmate (identificare legitimă din CRM; fără email nu se numără).
//  - Donație confirmată: stare „reusită” în evidența operațională, setată doar de webhook-ul procesatorului de plată; valoarea netă scade rambursările.
//  - Rata de conversie (donații): donații confirmate ÷ vizitatori. Rata de finalizare (Formular 230): formulare trimise ÷ formulare începute.
//    Fără numitor nu există rată (se afișează „—”).
//  - Sumele sunt în lei (donațiile în altă monedă sunt deja convertite de platformă la cursul zilei donației).
// ---------------------------------------------------------------------------------------------------------------------

export type Filtre = {
  de: string; // YYYY-MM-DD (ora României)
  pana: string;
  flux: Flux | "toate";
  pageId: string | null;
  sursa: string | null;
  canal: Canal | null;
  tip: TipPromovare | null;
  campanieMarketing: string | null;
  model: ModelAtribuire;
};

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETICHETA_RE = /^[a-z0-9_.:+()-]{1,60}$/;

export const ziuaRoJs = (decalajZile = 0): string => {
  const d = new Date(Date.now() + decalajZile * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

export const PERIOADE_RAPORT: { cheie: string; eticheta: string; zile: number }[] = [
  { cheie: "7", eticheta: "Ultimele 7 zile", zile: 7 },
  { cheie: "30", eticheta: "Ultimele 30 de zile", zile: 30 },
  { cheie: "90", eticheta: "Ultimele 90 de zile", zile: 90 },
  { cheie: "365", eticheta: "Ultimele 12 luni", zile: 365 },
];

// Parametrii din adresă -> filtre valide (orice valoare nerecunoscută cade pe implicit; nimic din adresă nu ajunge în SQL fără validare).
export function filtreDinParametri(sp: Record<string, string | string[] | undefined>): Filtre {
  const unu = (k: string): string | null => {
    const v = sp[k];
    const t = Array.isArray(v) ? v[0] : v;
    return typeof t === "string" && t.length > 0 ? t : null;
  };
  let de = unu("de");
  let pana = unu("pana");
  if (!de || !pana || !DATA_RE.test(de) || !DATA_RE.test(pana) || de > pana) {
    const zile = PERIOADE_RAPORT.find((p) => p.cheie === unu("perioada"))?.zile ?? 30;
    de = ziuaRoJs(-(zile - 1));
    pana = ziuaRoJs(0);
  }
  // cel mult 13 luni (cât se păstrează evenimentele)
  const limita = ziuaRoJs(-400);
  if (de < limita) de = limita;
  const fluxBrut = unu("flux");
  const pageId = unu("campanie") && UUID_RE.test(unu("campanie")!) ? unu("campanie") : null;
  const sursa = unu("sursa");
  const canal = unu("canal");
  const tip = unu("tip");
  const camp = unu("camp");
  const model = unu("model");
  return {
    de,
    pana,
    flux: pageId ? "campanie" : esteFlux(fluxBrut) && fluxBrut !== "platforma" ? fluxBrut : "toate",
    pageId,
    sursa: sursa && ETICHETA_RE.test(sursa) ? sursa : null,
    canal: esteCanal(canal) ? canal : null,
    tip: esteTip(tip) ? tip : null,
    campanieMarketing: camp && ETICHETA_RE.test(camp) ? camp : null,
    model: esteModel(model) ? model : "ultima",
  };
}

export const filtreInParametri = (f: Filtre): URLSearchParams => {
  const q = new URLSearchParams({ de: f.de, pana: f.pana, model: f.model });
  if (f.flux !== "toate" && !f.pageId) q.set("flux", f.flux);
  if (f.pageId) q.set("campanie", f.pageId);
  if (f.sursa) q.set("sursa", f.sursa);
  if (f.canal) q.set("canal", f.canal);
  if (f.tip) q.set("tip", f.tip);
  if (f.campanieMarketing) q.set("camp", f.campanieMarketing);
  return q;
};

// ---------- fragmente SQL ----------

const coloaneModel = (m: ModelAtribuire) => {
  if (m === "prima") return { sursa: sql.raw("c.prima_sursa"), canal: sql.raw("c.prima_canal"), tip: sql.raw("c.prima_tip"), camp: sql.raw("c.prima_campanie"), cont: sql.raw("c.prima_continut") };
  if (m === "sesiune") return { sursa: sql.raw("c.ses_sursa"), canal: sql.raw("c.ses_canal"), tip: sql.raw("c.ses_tip"), camp: sql.raw("c.ses_campanie"), cont: sql.raw("c.ses_continut") };
  return {
    sursa: sql.raw("coalesce(c.ult_sursa, c.ses_sursa)"),
    canal: sql.raw("coalesce(c.ult_canal, c.ses_canal)"),
    tip: sql.raw("coalesce(c.ult_tip, c.ses_tip)"),
    camp: sql.raw("coalesce(c.ult_campanie, c.ses_campanie)"),
    cont: sql.raw("coalesce(c.ult_continut, c.ses_continut)"),
  };
};

function fluxuri(f: Filtre): Flux[] {
  return f.flux === "toate" ? ["campanie", "f230"] : [f.flux];
}
const listaFluxuri = (f: Filtre): SQL => sql.join(fluxuri(f).map((x) => sql`${x}`), sql`, `);

function whereEvenimente(orgId: string, f: Filtre): SQL {
  const p: SQL[] = [sql`e.org_id = ${orgId}::uuid`, sql`e.ziua >= ${f.de}::date`, sql`e.ziua <= ${f.pana}::date`, sql`e.flux in (${listaFluxuri(f)})`];
  if (f.pageId) p.push(sql`e.page_id = ${f.pageId}::uuid`);
  if (f.sursa) p.push(sql`e.sursa = ${f.sursa}`);
  if (f.canal) p.push(sql`e.canal = ${f.canal}`);
  if (f.tip) p.push(sql`e.tip_promovare = ${f.tip}`);
  if (f.campanieMarketing) p.push(sql`e.campanie_marketing = ${f.campanieMarketing}`);
  return sql.join(p, sql` and `);
}

function whereConversii(orgId: string, f: Filtre, tipConv: "donatie" | "f230"): SQL {
  const m = coloaneModel(f.model);
  const p: SQL[] = [
    sql`c.org_id = ${orgId}::uuid`,
    sql`c.tip = ${tipConv}`,
    sql`(timezone('Europe/Bucharest', c.conversie_la))::date >= ${f.de}::date`,
    sql`(timezone('Europe/Bucharest', c.conversie_la))::date <= ${f.pana}::date`,
  ];
  if (f.pageId) p.push(sql`c.page_id = ${f.pageId}::uuid`);
  if (f.sursa) p.push(sql`${m.sursa} = ${f.sursa}`);
  if (f.canal) p.push(sql`${m.canal} = ${f.canal}`);
  if (f.tip) p.push(sql`${m.tip} = ${f.tip}`);
  if (f.campanieMarketing) p.push(sql`${m.camp} = ${f.campanieMarketing}`);
  return sql.join(p, sql` and `);
}

export type Grupare = "total" | "tip" | "zi" | "pagina" | "tabel";
const GRUPE_EV: Record<Grupare, { select: SQL; group: SQL }> = {
  total: { select: sql`'' as k1, '' as k2, '' as k3, '' as k4, '' as k5`, group: sql`` },
  tip: { select: sql`e.tip_promovare as k1, '' as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1` },
  zi: { select: sql`e.ziua::text as k1, '' as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1` },
  pagina: { select: sql`coalesce(e.page_id::text, '') as k1, e.flux as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1, 2` },
  tabel: {
    select: sql`e.sursa as k1, e.canal as k2, e.tip_promovare as k3, coalesce(e.campanie_marketing, '') as k4, coalesce(e.continut, '') as k5`,
    group: sql`group by 1, 2, 3, 4, 5`,
  },
};

function grupConv(m: ModelAtribuire, g: Grupare): { select: SQL; group: SQL } {
  const c = coloaneModel(m);
  switch (g) {
    case "total":
      return GRUPE_EV.total;
    case "tip":
      return { select: sql`${c.tip} as k1, '' as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1` };
    case "zi":
      return { select: sql`(timezone('Europe/Bucharest', c.conversie_la))::date::text as k1, '' as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1` };
    case "pagina":
      return { select: sql`coalesce(c.page_id::text, '') as k1, c.flux as k2, '' as k3, '' as k4, '' as k5`, group: sql`group by 1, 2` };
    default:
      return { select: sql`${c.sursa} as k1, ${c.canal} as k2, ${c.tip} as k3, coalesce(${c.camp}, '') as k4, coalesce(${c.cont}, '') as k5`, group: sql`group by 1, 2, 3, 4, 5` };
  }
}

type Chei = { k1: string; k2: string; k3: string; k4: string; k5: string };
type RandVizite = Chei & { flux?: string; vizitatori: number; sesiuni: number; click_doneaza: number; start_donatie: number; start_formular: number; fara_acord: number };
type RandDonatii = Chei & { initiate: number; confirmate: number; rambursate: number; donatori: number; suma_bruta: number; suma_neta: number; recurente_noi: number };
type RandF230 = Chei & { trimise: number };

async function viziteGrupat(dbx: Dbx, orgId: string, f: Filtre, g: Grupare): Promise<RandVizite[]> {
  const { select, group } = GRUPE_EV[g];
  const rez = await dbx.execute<RandVizite>(sql`
    select ${select},
      count(distinct e.vizitator_id) filter (where e.tip = 'vizita')::int as vizitatori,
      count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'vizita')::int as sesiuni,
      count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'click_doneaza')::int as click_doneaza,
      count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'start_donatie')::int as start_donatie,
      count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'start_formular')::int as start_formular,
      count(distinct e.vizitator_id) filter (where e.tip = 'vizita' and not e.persistent)::int as fara_acord
    from atrib_evenimente e
    where ${whereEvenimente(orgId, f)}
    ${group}`);
  return [...rez];
}

async function donatiiGrupat(dbx: Dbx, orgId: string, f: Filtre, g: Grupare): Promise<RandDonatii[]> {
  if (f.flux === "f230") return [];
  const { select, group } = grupConv(f.model, g);
  const rez = await dbx.execute<RandDonatii>(sql`
    select ${select},
      count(*)::int as initiate,
      count(*) filter (where d.status = 'reusita')::int as confirmate,
      count(*) filter (where d.status = 'rambursata')::int as rambursate,
      count(distinct lower(d.email_donator)) filter (where d.status = 'reusita' and coalesce(d.email_donator, '') <> '')::int as donatori,
      coalesce(sum(d.suma) filter (where d.status = 'reusita'), 0)::int as suma_bruta,
      coalesce(sum(d.suma - d.suma_rambursata) filter (where d.status = 'reusita'), 0)::int as suma_neta,
      count(*) filter (where d.status = 'reusita' and d.recurenta)::int as recurente_noi
    from atrib_conversii c
    join fundraising_donations d on d.id = c.entitate_id and d.org_id = c.org_id
    where ${whereConversii(orgId, f, "donatie")}
    ${group}`);
  return [...rez];
}

async function f230Grupat(dbx: Dbx, orgId: string, f: Filtre, g: Grupare): Promise<RandF230[]> {
  if (f.flux === "campanie" || f.pageId) return [];
  const { select, group } = grupConv(f.model, g);
  const rez = await dbx.execute<RandF230>(sql`
    select ${select}, count(*)::int as trimise
    from atrib_conversii c
    join formular230_submissions s on s.id = c.entitate_id and s.org_id = c.org_id
    where ${whereConversii(orgId, f, "f230")}
    ${group}`);
  return [...rez];
}

// ---------- rezultat ----------

export type Metrici = {
  vizitatori: number;
  sesiuni: number;
  clickDoneaza: number;
  startDonatie: number;
  startFormular: number;
  donatiiInitiate: number;
  donatiiConfirmate: number;
  donatiiRambursate: number;
  donatoriUnici: number;
  sumaBruta: number;
  sumaNeta: number;
  recurenteNoi: number;
  formulareTrimise: number;
};
const zero = (): Metrici => ({ vizitatori: 0, sesiuni: 0, clickDoneaza: 0, startDonatie: 0, startFormular: 0, donatiiInitiate: 0, donatiiConfirmate: 0, donatiiRambursate: 0, donatoriUnici: 0, sumaBruta: 0, sumaNeta: 0, recurenteNoi: 0, formulareTrimise: 0 });

export type RandRaport = { sursa: string; canal: Canal; tip: TipPromovare; campanie: string; continut: string } & Metrici;

const cheie = (r: Chei) => `${r.k1}\u0001${r.k2}\u0001${r.k3}\u0001${r.k4}\u0001${r.k5}`;

function imbina(vizite: RandVizite[], donatii: RandDonatii[], f230: RandF230[]): Map<string, { chei: Chei; m: Metrici }> {
  const harta = new Map<string, { chei: Chei; m: Metrici }>();
  const ia = (r: Chei) => {
    const k = cheie(r);
    let x = harta.get(k);
    if (!x) harta.set(k, (x = { chei: { k1: r.k1, k2: r.k2, k3: r.k3, k4: r.k4, k5: r.k5 }, m: zero() }));
    return x.m;
  };
  for (const v of vizite) {
    const m = ia(v);
    m.vizitatori += v.vizitatori;
    m.sesiuni += v.sesiuni;
    m.clickDoneaza += v.click_doneaza;
    m.startDonatie += v.start_donatie;
    m.startFormular += v.start_formular;
  }
  for (const d of donatii) {
    const m = ia(d);
    m.donatiiInitiate += d.initiate;
    m.donatiiConfirmate += d.confirmate;
    m.donatiiRambursate += d.rambursate;
    m.donatoriUnici += d.donatori;
    m.sumaBruta += d.suma_bruta;
    m.sumaNeta += d.suma_neta;
    m.recurenteNoi += d.recurente_noi;
  }
  for (const x of f230) ia(x).formulareTrimise += x.trimise;
  return harta;
}

export type PunctSerie = { ziua: string; vizitatori: number; donatiiConfirmate: number; formulareTrimise: number };
export type RandCampanie = { pageId: string; titlu: string; slug: string } & Metrici;
export type RandCost = { campanie: string; costLei: number; donatori: number; formulare: number; costPerDonator: number | null; costPerFormular: number | null };
export type Sponsorizare20 = { companiiAdaugate: number; contracteTrimise: number; contracteSemnate: number; sponsorizariIncasate: number; sumaIncasata: number };
export type UltimaConversie = { tip: "donatie" | "f230"; la: string; sursa: string; canal: Canal; tipPromovare: TipPromovare; campanie: string; pageTitlu: string | null; suma: number | null; stare: string; vizitatorId: string | null; persistent: boolean; donatorId: string | null };

export type Raport = {
  filtre: Filtre;
  fereastraZile: number;
  total: Metrici;
  totalCampanie: Metrici;
  totalF230: Metrici;
  fracFaraAcord: number | null;
  conversiiNeatribuite: number;
  conversiiTotal: number;
  tipNedeterminatVizitatori: number | null;
  perTip: ({ tip: TipPromovare } & Metrici)[];
  serie: PunctSerie[];
  tabel: RandRaport[];
  campanii: RandCampanie[];
  costuri: RandCost[];
  sponsorizare20: Sponsorizare20;
  ultimeleConversii: UltimaConversie[];
  campaniiDisponibile: { id: string; titlu: string }[];
  opSurse: string[];
  opCampaniiMarketing: string[];
};

export async function incarcaRaport(dbx: Dbx, orgId: string, f: Filtre, identificabil: boolean): Promise<Raport> {
  const [fereastraZile, vTot, dTot, fTot, vTip, dTip, fTip, vZi, dZi, fZi, vPag, dPag, fPag, vTab, dTab, fTab] = await Promise.all([
    citesteFereastra(dbx, orgId),
    viziteGrupat(dbx, orgId, f, "total"),
    donatiiGrupat(dbx, orgId, f, "total"),
    f230Grupat(dbx, orgId, f, "total"),
    viziteGrupat(dbx, orgId, f, "tip"),
    donatiiGrupat(dbx, orgId, f, "tip"),
    f230Grupat(dbx, orgId, f, "tip"),
    viziteGrupat(dbx, orgId, f, "zi"),
    donatiiGrupat(dbx, orgId, f, "zi"),
    f230Grupat(dbx, orgId, f, "zi"),
    viziteGrupat(dbx, orgId, f, "pagina"),
    donatiiGrupat(dbx, orgId, f, "pagina"),
    f230Grupat(dbx, orgId, f, "pagina"),
    viziteGrupat(dbx, orgId, f, "tabel"),
    donatiiGrupat(dbx, orgId, f, "tabel"),
    f230Grupat(dbx, orgId, f, "tabel"),
  ]);

  // Totaluri: vizitatorii pe flux nu se adună între ele (același om poate vedea ambele pagini), deci totalul vine din interogarea fără grupare pe flux.
  const total = [...imbina(vTot, dTot, fTot).values()][0]?.m ?? zero();
  const totalCampanie = f.flux === "f230" ? zero() : ([...imbina(await viziteFlux(dbx, orgId, f, "campanie"), dTot, []).values()][0]?.m ?? zero());
  const totalF230 = f.flux === "campanie" || f.pageId ? zero() : ([...imbina(await viziteFlux(dbx, orgId, f, "f230"), [], fTot).values()][0]?.m ?? zero());

  const perTip = (["organic", "platit", "nedeterminat"] as TipPromovare[]).map((tip) => ({ tip, ...([...imbina(vTip.filter((x) => x.k1 === tip), dTip.filter((x) => x.k1 === tip), fTip.filter((x) => x.k1 === tip)).values()][0]?.m ?? zero()) }));

  const harta = new Map<string, PunctSerie>();
  const punct = (z: string) => harta.get(z) ?? (harta.set(z, { ziua: z, vizitatori: 0, donatiiConfirmate: 0, formulareTrimise: 0 }), harta.get(z)!);
  for (const v of vZi) punct(v.k1).vizitatori += v.vizitatori;
  for (const d of dZi) punct(d.k1).donatiiConfirmate += d.confirmate;
  for (const x of fZi) punct(x.k1).formulareTrimise += x.trimise;
  const serie = [...harta.values()].sort((a, b) => a.ziua.localeCompare(b.ziua));

  const tabel: RandRaport[] = [...imbina(vTab, dTab, fTab).values()]
    .map(({ chei, m }) => ({ sursa: chei.k1, canal: (esteCanal(chei.k2) ? chei.k2 : "altele") as Canal, tip: (esteTip(chei.k3) ? chei.k3 : "nedeterminat") as TipPromovare, campanie: chei.k4, continut: chei.k5, ...m }))
    .sort((a, b) => b.vizitatori + b.donatiiConfirmate * 10 + b.formulareTrimise * 10 - (a.vizitatori + a.donatiiConfirmate * 10 + a.formulareTrimise * 10))
    .slice(0, 300);

  // Campaniile (paginile de strângere de fonduri).
  const pagini = await dbx.execute<{ id: string; titlu: string; slug: string }>(sql`select id, titlu, slug from fundraising_pages where org_id = ${orgId}::uuid order by created_at desc limit 200`);
  const titluri = new Map([...pagini].map((p) => [p.id, p]));
  const harta2 = imbina(vPag.filter((x) => x.k1 !== ""), dPag.filter((x) => x.k1 !== ""), []);
  const campanii: RandCampanie[] = [...harta2.values()]
    .filter(({ chei }) => titluri.has(chei.k1))
    .map(({ chei, m }) => ({ pageId: chei.k1, titlu: titluri.get(chei.k1)!.titlu, slug: titluri.get(chei.k1)!.slug, ...m }))
    .sort((a, b) => b.donatiiConfirmate - a.donatiiConfirmate || b.vizitatori - a.vizitatori);

  const costuri = await costuriPeCampanie(dbx, orgId, f, tabel);
  const sponsorizare20 = await sponsorizare20Crm(dbx, orgId, f);

  // Limitele măsurării.
  const vizAcord = vTot[0];
  const fracFaraAcord = vizAcord && vizAcord.vizitatori > 0 ? (vizAcord.fara_acord / vizAcord.vizitatori) * 100 : null;
  const nedeterminatViz = perTip.find((t) => t.tip === "nedeterminat")?.vizitatori ?? 0;
  const sumVizTip = perTip.reduce((s, t) => s + t.vizitatori, 0);
  const conversiiTotal = total.donatiiInitiate + total.formulareTrimise;
  const neatribuite = await dbx.execute<{ n: number }>(sql`
    select count(*)::int as n from atrib_conversii c
    where c.org_id = ${orgId}::uuid and c.tip in ('donatie','f230') and c.ses_canal = 'direct' and c.ult_canal is null
      and (timezone('Europe/Bucharest', c.conversie_la))::date >= ${f.de}::date and (timezone('Europe/Bucharest', c.conversie_la))::date <= ${f.pana}::date`);

  const ultimele = await ultimeleConversii(dbx, orgId, f, identificabil);

  const opSurse = await dbx.execute<{ v: string }>(sql`select distinct sursa as v from atrib_evenimente where org_id = ${orgId}::uuid and ziua >= ${f.de}::date order by 1 limit 100`);
  const opCamp = await dbx.execute<{ v: string }>(sql`select distinct campanie_marketing as v from atrib_evenimente where org_id = ${orgId}::uuid and ziua >= ${f.de}::date and campanie_marketing is not null order by 1 limit 100`);

  return {
    filtre: f,
    fereastraZile,
    total,
    totalCampanie,
    totalF230,
    fracFaraAcord,
    conversiiNeatribuite: neatribuite[0]?.n ?? 0,
    conversiiTotal,
    tipNedeterminatVizitatori: sumVizTip > 0 ? (nedeterminatViz / sumVizTip) * 100 : null,
    perTip,
    serie,
    tabel,
    campanii,
    costuri,
    sponsorizare20,
    ultimeleConversii: ultimele,
    campaniiDisponibile: [...pagini].map((p) => ({ id: p.id, titlu: p.titlu })),
    opSurse: [...opSurse].map((x) => x.v),
    opCampaniiMarketing: [...opCamp].map((x) => x.v),
  };
}

// Vizitatorii unui singur flux (pentru totalul pe flux).
async function viziteFlux(dbx: Dbx, orgId: string, f: Filtre, flux: Flux): Promise<RandVizite[]> {
  return viziteGrupat(dbx, orgId, { ...f, flux }, "total");
}

// Costuri reale de reclame (modulul Performanța reclamelor), legate de campania de marketing prin codul utm_campaign. Fără costuri legate: „Indisponibil”.
async function costuriPeCampanie(dbx: Dbx, orgId: string, f: Filtre, tabel: RandRaport[]): Promise<RandCost[]> {
  try {
    const rez = await dbx.execute<{ camp: string; cost: number }>(sql`
      select rc.utm_campanie as camp, coalesce(sum(rk.cheltuiala_ron_minor), 0)::bigint as cost
      from reclame_campanii rc
      join reclame_costuri rk on rk.org_id = rc.org_id and rk.platforma = rc.platforma and rk.campanie_cheie = rc.campanie_cheie
      where rc.org_id = ${orgId}::uuid and rc.utm_campanie is not null and rk.ziua >= ${f.de}::date and rk.ziua <= ${f.pana}::date
      group by 1`);
    const parcurse = new Map<string, { donatori: number; formulare: number }>();
    for (const r of tabel) {
      if (!r.campanie) continue;
      const x = parcurse.get(r.campanie) ?? { donatori: 0, formulare: 0 };
      x.donatori += r.donatoriUnici;
      x.formulare += r.formulareTrimise;
      parcurse.set(r.campanie, x);
    }
    return [...rez].map((r) => {
      const costLei = Number(r.cost) / 100;
      const x = parcurse.get(r.camp) ?? { donatori: 0, formulare: 0 };
      return { campanie: r.camp, costLei, donatori: x.donatori, formulare: x.formulare, costPerDonator: x.donatori > 0 ? costLei / x.donatori : null, costPerFormular: x.formulare > 0 ? costLei / x.formulare : null };
    });
  } catch {
    return [];
  }
}

// Sponsorizarea 20% nu are pagini publice: contractele se generează în CRM Companii. Cifrele vin din evidența CRM (fără provenință de pe web).
async function sponsorizare20Crm(dbx: Dbx, orgId: string, f: Filtre): Promise<Sponsorizare20> {
  const r = await dbx.execute<Record<string, number>>(sql`
    select
      (select count(*)::int from companies where org_id = ${orgId}::uuid and (timezone('Europe/Bucharest', created_at))::date between ${f.de}::date and ${f.pana}::date) as adaugate,
      (select count(distinct company_id)::int from company_stage_log where org_id = ${orgId}::uuid and to_stage = 'contract_trimis' and (timezone('Europe/Bucharest', created_at))::date between ${f.de}::date and ${f.pana}::date) as trimise,
      (select count(distinct company_id)::int from company_stage_log where org_id = ${orgId}::uuid and to_stage = 'contract_semnat' and (timezone('Europe/Bucharest', created_at))::date between ${f.de}::date and ${f.pana}::date) as semnate,
      (select count(*)::int from company_sponsorizari where org_id = ${orgId}::uuid and data between ${f.de}::date and ${f.pana}::date) as incasate,
      (select coalesce(sum(suma), 0)::int from company_sponsorizari where org_id = ${orgId}::uuid and data between ${f.de}::date and ${f.pana}::date) as suma`);
  const x = r[0] ?? {};
  return { companiiAdaugate: x.adaugate ?? 0, contracteTrimise: x.trimise ?? 0, contracteSemnate: x.semnate ?? 0, sponsorizariIncasate: x.incasate ?? 0, sumaIncasata: x.suma ?? 0 };
}

async function ultimeleConversii(dbx: Dbx, orgId: string, f: Filtre, identificabil: boolean): Promise<UltimaConversie[]> {
  const m = coloaneModel(f.model);
  const rez = await dbx.execute<{ tip: string; la: string; sursa: string; canal: string; tipp: string; camp: string; titlu: string | null; suma: number | null; stare: string; vizitator: string | null; persistent: boolean; donator_id: string | null }>(sql`
    select c.tip, c.conversie_la::text as la, ${m.sursa} as sursa, ${m.canal} as canal, ${m.tip} as tipp, coalesce(${m.camp}, '') as camp,
      p.titlu, d.suma, coalesce(d.status::text, case when s.id is not null then 'trimis' else '' end) as stare,
      c.vizitator_id as vizitator, c.persistent,
      (select dr.id::text from donatori_reali dr where dr.org_id = c.org_id and lower(dr.email) = lower(d.email_donator) limit 1) as donator_id
    from atrib_conversii c
    left join fundraising_donations d on c.tip = 'donatie' and d.id = c.entitate_id and d.org_id = c.org_id
    left join formular230_submissions s on c.tip = 'f230' and s.id = c.entitate_id and s.org_id = c.org_id
    left join fundraising_pages p on p.id = c.page_id and p.org_id = c.org_id
    where c.org_id = ${orgId}::uuid and c.tip in ('donatie', 'f230')
      and (timezone('Europe/Bucharest', c.conversie_la))::date >= ${f.de}::date and (timezone('Europe/Bucharest', c.conversie_la))::date <= ${f.pana}::date
    order by c.conversie_la desc
    limit 25`);
  return [...rez].map((r) => ({
    tip: r.tip === "f230" ? "f230" : "donatie",
    la: r.la,
    sursa: r.sursa ?? "(direct)",
    canal: esteCanal(r.canal) ? r.canal : "direct",
    tipPromovare: esteTip(r.tipp) ? r.tipp : "nedeterminat",
    campanie: r.camp,
    pageTitlu: r.titlu,
    suma: r.suma,
    stare: r.stare,
    // ID-ul pseudonim al vizitatorului și legătura spre donatorul din CRM se văd doar pentru proprietar/administrator.
    vizitatorId: identificabil ? r.vizitator : null,
    persistent: r.persistent,
    donatorId: identificabil ? r.donator_id : null,
  }));
}

// ---------- export CSV ----------


export function construiesteCsvRaport(r: Raport, orgNume: string): string {
  const f = r.filtre;
  const antet: string[] = [
    ["Statistici și surse", orgNume].map(celulaSigura).join(","),
    ["Perioada (ora României)", `${f.de} – ${f.pana}`].map(celulaSigura).join(","),
    ["Model de atribuire", f.model === "prima" ? "Prima sursă observată" : f.model === "sesiune" ? "Sursa sesiunii conversiei" : "Ultima sursă nedirectă"].map(celulaSigura).join(","),
    ["Fereastra de atribuire (zile)", r.fereastraZile].map(celulaSigura).join(","),
    ["Flux", f.flux].map(celulaSigura).join(","),
    ["Sume", "lei; donații confirmate prin webhook; valoare netă = după rambursări"].map(celulaSigura).join(","),
    ["Notă", "Vizitatorii din surse diferite nu se adună. Sunt măsurate doar vizitele observabile (fără acord, vizitatorii se numără pe zi)."].map(celulaSigura).join(","),
    "",
    ["Sursă", "Canal", "Tip promovare", "Campanie de marketing", "Conținut", "Vizitatori", "Sesiuni", "Clic Donează", "Donații începute", "Formulare începute", "Donații confirmate", "Donatori unici", "Valoare brută (lei)", "Valoare netă (lei)", "Formulare 230 trimise", "Rata conversie donații (%)", "Rata finalizare F230 (%)"].map(celulaSigura).join(","),
  ];
  const rata1 = (n: number, d: number) => {
    const x = rata(n, d);
    return x === null ? "" : Math.round(x * 100) / 100;
  };
  const corp = r.tabel.map((x) =>
    [x.sursa, ETICHETE_CANAL[x.canal], x.tip, x.campanie, x.continut, x.vizitatori, x.sesiuni, x.clickDoneaza, x.startDonatie, x.startFormular, x.donatiiConfirmate, x.donatoriUnici, x.sumaBruta, x.sumaNeta, x.formulareTrimise, rata1(x.donatiiConfirmate, x.vizitatori), rata1(x.formulareTrimise, x.startFormular)]
      .map((c) => celulaSigura(c as string | number))
      .join(","),
  );
  return [...antet, ...corp].join("\r\n") + "\r\n";
}

// ---------- istoricul unui vizitator ----------

export type IstoricVizitator = {
  vizitatorId: string;
  persistent: boolean;
  sesiuni: { sesiuneId: string; la: string; sursa: string; canal: Canal; tip: TipPromovare; campanie: string; continut: string; metoda: string; referrer: string; pagini: number }[];
  evenimente: { la: string; tip: string; flux: string; cale: string; pagina: string | null }[];
  conversii: { tip: string; la: string; suma: number | null; stare: string; prima: string; sesiune: string; ultima: string; donatorId: string | null }[];
};

const eticheta = (s: string | null, c: string | null) => (s ? `${s} · ${esteCanal(c) ? ETICHETE_CANAL[c] : c}` : "—");

export async function incarcaIstoricVizitator(dbx: Dbx, orgId: string, vizitatorId: string): Promise<IstoricVizitator | null> {
  const ev = await dbx.execute<{ la: string; tip: string; flux: string; sesiune_id: string; sursa: string; canal: string; tip_promovare: string; metoda: string; campanie_marketing: string | null; continut: string | null; referrer_host: string | null; cale: string | null; persistent: boolean; titlu: string | null }>(sql`
    select e.la::text as la, e.tip, e.flux, e.sesiune_id, e.sursa, e.canal, e.tip_promovare, e.metoda, e.campanie_marketing, e.continut, e.referrer_host, e.cale, e.persistent, p.titlu
    from atrib_evenimente e left join fundraising_pages p on p.id = e.page_id
    where e.org_id = ${orgId}::uuid and e.vizitator_id = ${vizitatorId}
    order by e.la asc limit 500`);
  if (ev.length === 0) return null;
  const sesiuni = new Map<string, IstoricVizitator["sesiuni"][number]>();
  for (const e of ev) {
    const s = sesiuni.get(e.sesiune_id);
    if (s) s.pagini += e.tip === "vizita" ? 1 : 0;
    else
      sesiuni.set(e.sesiune_id, {
        sesiuneId: e.sesiune_id,
        la: e.la,
        sursa: e.sursa,
        canal: esteCanal(e.canal) ? e.canal : "altele",
        tip: esteTip(e.tip_promovare) ? e.tip_promovare : "nedeterminat",
        campanie: e.campanie_marketing ?? "",
        continut: e.continut ?? "",
        metoda: e.metoda,
        referrer: e.referrer_host ?? "",
        pagini: e.tip === "vizita" ? 1 : 0,
      });
  }
  const conv = await dbx.execute<{ tip: string; la: string; suma: number | null; stare: string; ps: string | null; pc: string | null; ss: string | null; sc: string | null; us: string | null; uc: string | null; donator_id: string | null }>(sql`
    select c.tip, c.conversie_la::text as la, d.suma, coalesce(d.status::text, case when s.id is not null then 'trimis' else '' end) as stare,
      c.prima_sursa as ps, c.prima_canal as pc, c.ses_sursa as ss, c.ses_canal as sc, c.ult_sursa as us, c.ult_canal as uc,
      (select dr.id::text from donatori_reali dr where dr.org_id = c.org_id and lower(dr.email) = lower(d.email_donator) limit 1) as donator_id
    from atrib_conversii c
    left join fundraising_donations d on c.tip = 'donatie' and d.id = c.entitate_id and d.org_id = c.org_id
    left join formular230_submissions s on c.tip = 'f230' and s.id = c.entitate_id and s.org_id = c.org_id
    where c.org_id = ${orgId}::uuid and c.vizitator_id = ${vizitatorId}
    order by c.conversie_la desc limit 50`);
  return {
    vizitatorId,
    persistent: ev[0]!.persistent,
    sesiuni: [...sesiuni.values()],
    evenimente: [...ev].map((e) => ({ la: e.la, tip: e.tip, flux: e.flux, cale: e.cale ?? "", pagina: e.titlu })),
    conversii: [...conv].map((c) => ({ tip: c.tip, la: c.la, suma: c.suma, stare: c.stare, prima: eticheta(c.ps, c.pc), sesiune: eticheta(c.ss, c.sc), ultima: eticheta(c.us ?? c.ss, c.uc ?? c.sc), donatorId: c.donator_id })),
  };
}
