import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { faraDiacritice } from "@/lib/cautare";
import { inregistreazaAudit } from "@/lib/audit";
import type { OrgContext } from "@/lib/auth/guard";
import { getLimiteleEfective, subCota } from "@/lib/billing/quota";
import { cursEurRon } from "@/lib/curs-valutar";
import { donatiiImportate, donatoriImporturi, donatoriReali, fundraisingPages } from "@/lib/db/schema";
import { donCte } from "@/lib/donatori-pf";
import {
  CAMPURI_IMPORT,
  cheieDonatie,
  detecteazaColoane,
  detecteazaSeparator,
  normalizeazaRand,
  OBLIGATORII_IMPORT,
  type CampImport,
  type Mapare,
  type RandNormalizat,
} from "@/lib/donatori-import";
import { sqlArray } from "@/lib/sql-array";

// Importul de donații în CRM Persoane fizice: citirea fișierului (CSV/XLSX), planul (ce se importă, ce e duplicat, ce donatori sunt noi)
// și execuția. Planul se calculează la fel la previzualizare și la import, deci ce vezi e ce se întâmplă.

export const MAX_RANDURI_IMPORT = 20_000;
export const MAX_BYTES_IMPORT = 4 * 1024 * 1024;

type Ctx = Pick<OrgContext, "db" | "orgId" | "userId" | "orgPackage" | "orgCustomPlanConfig">;

export type FisierCitit = { antet: string[]; randuri: unknown[][] };

export async function citesteFisier(buf: Buffer, numeFisier: string): Promise<FisierCitit> {
  const XLSX = await import("xlsx");
  const ext = numeFisier.toLowerCase().split(".").pop() ?? "";
  let wb;
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
    wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  } else {
    const text = buf.toString("utf8").replace(/^﻿/, "");
    wb = XLSX.read(text, { type: "string", FS: detecteazaSeparator(text), raw: true });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Fișierul nu conține nicio foaie.");
  const toate = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
  // Antetul = primul rând cu cel puțin 2 celule completate.
  const iAntet = toate.findIndex((r) => r.filter((c) => String(c ?? "").trim() !== "").length >= 2);
  if (iAntet < 0) throw new Error("Nu am găsit un rând de antet în fișier.");
  const randuri = toate.slice(iAntet + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (randuri.length > MAX_RANDURI_IMPORT) throw new Error(`Fișierul are peste ${MAX_RANDURI_IMPORT.toLocaleString("ro-RO")} de rânduri. Împarte-l în mai multe importuri.`);
  return { antet: toate[iAntet].map((c) => String(c ?? "").trim()), randuri };
}

export type Previzualizare = {
  antet: string[];
  mapare: Mapare;
  lipsa: CampImport[];
  esantion: string[][];
  randuri: number;
  valide: number;
  invalide: number;
  exemple: { rand: number; motiv: string }[];
  duplicate: number;
  deImportat: number;
  donatoriNoi: number;
  donatoriExistenti: number;
  proiecte: { nume: string; nr: number; campanie: string | null }[];
  de: string | null;
  pana: string | null;
  suma: number;
  monede: Record<string, number>;
  curs: number | null;
};

export type Plan = {
  previzualizare: Previzualizare;
  deImportat: (RandNormalizat & { sumaLei: number; sumaOriginala: number | null; campaniePageId: string | null })[];
  emailuriNoi: Set<string>;
};

const norm = (s: string) => faraDiacritice(s).toLowerCase().replace(/\s+/g, " ").trim();
const ziua = (d: Date) => d.toISOString().slice(0, 10);

export async function planifica(ctx: Ctx, fisier: FisierCitit, maparePrimita?: Mapare): Promise<Plan> {
  const mapare = maparePrimita && Object.keys(maparePrimita).length ? maparePrimita : detecteazaColoane(fisier.antet);
  const lipsa = OBLIGATORII_IMPORT.filter((c) => mapare[c] === undefined);
  const gol: Previzualizare = {
    antet: fisier.antet, mapare, lipsa, esantion: fisier.randuri.slice(0, 5).map((r) => fisier.antet.map((_, i) => String(r[i] ?? ""))),
    randuri: fisier.randuri.length, valide: 0, invalide: 0, exemple: [], duplicate: 0, deImportat: 0, donatoriNoi: 0, donatoriExistenti: 0, proiecte: [], de: null, pana: null, suma: 0, monede: {}, curs: null,
  };
  if (lipsa.length > 0) return { previzualizare: gol, deImportat: [], emailuriNoi: new Set() };

  const acum = new Date();
  const valide: { rand: RandNormalizat; nr: number }[] = [];
  const motive = new Map<string, number>();
  const exemple: { rand: number; motiv: string }[] = [];
  fisier.randuri.forEach((celule, i) => {
    const r = normalizeazaRand(celule, mapare, acum);
    if (r.ok) valide.push({ rand: r.rand, nr: i + 2 });
    else {
      motive.set(r.motiv, (motive.get(r.motiv) ?? 0) + 1);
      if (exemple.length < 12) exemple.push({ rand: i + 2, motiv: r.motiv });
    }
  });

  // Monede: RON direct; EUR convertit la cursul zilei; altele respinse.
  const monede: Record<string, number> = {};
  for (const v of valide) monede[v.rand.moneda] = (monede[v.rand.moneda] ?? 0) + 1;
  const curs = monede.EUR ? await cursEurRon() : null;
  const acceptate: (RandNormalizat & { sumaLei: number; sumaOriginala: number | null })[] = [];
  let nrInvalide = fisier.randuri.length - valide.length;
  for (const { rand, nr } of valide) {
    if (rand.moneda === "RON") {
      const lei = Math.round(rand.suma);
      if (lei < 1) { nrInvalide++; if (exemple.length < 12) exemple.push({ rand: nr, motiv: "Sumă sub 1 leu" }); continue; }
      acceptate.push({ ...rand, sumaLei: lei, sumaOriginala: null });
    } else if (rand.moneda === "EUR" && curs) {
      const lei = Math.max(1, Math.round(rand.suma * curs));
      acceptate.push({ ...rand, sumaLei: lei, sumaOriginala: rand.suma });
    } else {
      nrInvalide++;
      if (exemple.length < 12) exemple.push({ rand: nr, motiv: rand.moneda === "EUR" ? "Cursul EUR → RON nu e disponibil acum" : `Monedă neacceptată (${rand.moneda})` });
    }
  }

  // Duplicate: același ID extern (în fișier sau deja importat) sau aceeași persoană, aceeași zi și aceeași sumă în lei, deja în platformă.
  const interval = acceptate.length ? { min: new Date(Math.min(...acceptate.map((r) => r.data.getTime())) - 86400000), max: new Date(Math.max(...acceptate.map((r) => r.data.getTime())) + 2 * 86400000) } : null;
  const [existente, idExterne, donatori, campanii] = await Promise.all([
    interval
      ? ctx.db.execute(sql`with ${donCte(ctx.orgId)} select email, data, suma from don where data >= ${interval.min.toISOString()}::timestamptz and data <= ${interval.max.toISOString()}::timestamptz`)
      : Promise.resolve([]),
    ctx.db.execute(sql`select id_extern from donatii_importate where org_id = ${ctx.orgId} and id_extern is not null`),
    ctx.db.select({ email: sql<string>`lower(${donatoriReali.email})` }).from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId)),
    ctx.db.select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.orgId, ctx.orgId)),
  ]);
  const chei = new Set((existente as unknown as { email: string; data: Date | string; suma: number }[]).map((e) => cheieDonatie(e.email, new Date(e.data), e.suma)));
  const externe = new Set((idExterne as unknown as { id_extern: string }[]).map((e) => e.id_extern));
  const viziteInFisier = new Set<string>();
  let duplicate = 0;
  const deImportat: Plan["deImportat"] = [];
  const campaniePeNume = new Map(campanii.map((c) => [norm(c.titlu), c]));
  for (const r of acceptate) {
    const ext = r.idExtern;
    if (ext && (externe.has(ext) || viziteInFisier.has(ext))) { duplicate++; continue; }
    if (chei.has(cheieDonatie(r.email, r.data, r.sumaLei))) { duplicate++; continue; }
    if (ext) viziteInFisier.add(ext);
    deImportat.push({ ...r, campaniePageId: r.proiect ? (campaniePeNume.get(norm(r.proiect))?.id ?? null) : null });
  }

  const emailuriExistente = new Set(donatori.map((d) => d.email));
  const emailuriFisier = new Set(deImportat.map((r) => r.email));
  const emailuriNoi = new Set([...emailuriFisier].filter((e) => !emailuriExistente.has(e)));

  const peProiect = new Map<string, { nume: string; nr: number; campanie: string | null }>();
  for (const r of deImportat) {
    if (!r.proiect) continue;
    const k = norm(r.proiect);
    const c = peProiect.get(k) ?? { nume: r.proiect, nr: 0, campanie: campaniePeNume.get(k)?.titlu ?? null };
    c.nr++;
    peProiect.set(k, c);
  }
  const timpi = deImportat.map((r) => r.data.getTime());
  return {
    previzualizare: {
      ...gol,
      valide: valide.length,
      invalide: nrInvalide,
      exemple,
      duplicate,
      deImportat: deImportat.length,
      donatoriNoi: emailuriNoi.size,
      donatoriExistenti: emailuriFisier.size - emailuriNoi.size,
      proiecte: [...peProiect.values()].sort((a, b) => b.nr - a.nr).slice(0, 60),
      de: timpi.length ? ziua(new Date(Math.min(...timpi))) : null,
      pana: timpi.length ? ziua(new Date(Math.max(...timpi))) : null,
      suma: deImportat.reduce((s, r) => s + r.sumaLei, 0),
      monede,
      curs,
    },
    deImportat,
    emailuriNoi,
  };
}

// Recalculează cache-ul donatorilor (total, număr, prima/ultima donație) din toate donațiile reușite (online + manuale + importate).
export async function recalculeazaCacheDonatori(ctx: Pick<OrgContext, "db" | "orgId">, emailuri: string[]) {
  if (emailuri.length === 0) return;
  for (let i = 0; i < emailuri.length; i += 2000) {
    const grup = emailuri.slice(i, i + 2000);
    await ctx.db.execute(sql`
      with ${donCte(ctx.orgId)}
      update donatori_reali dr set total_donat = a.total::int, numar_donatii = a.nr, prima_donatie_la = a.prima, ultima_donatie_la = a.ultima
      from (select email, sum(suma) as total, count(*)::int as nr, min(data) as prima, max(data) as ultima from don where email = any(${sqlArray(grup)}) group by email) a
      where dr.org_id = ${ctx.orgId} and lower(dr.email) = a.email`);
  }
}

export type RezultatImport = { importId: string; importate: number; duplicate: number; donatoriNoi: number };

export async function executaImport(ctx: Ctx, plan: Plan, numeSursa: string): Promise<RezultatImport> {
  const p = plan.previzualizare;
  if (plan.deImportat.length === 0) throw new Error("Nu există nicio donație de importat.");
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:donatori-import`}, 0))`);

  // Cota de persoane fizice a pachetului: donatorii NOI ocupă locuri.
  const limite = getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig);
  if (limite.contactePf !== null && plan.emailuriNoi.size > 0) {
    const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId));
    if (!subCota(n + plan.emailuriNoi.size - 1, limite.contactePf)) {
      throw new Error(`Importul ar adăuga ${plan.emailuriNoi.size} donatori noi și ar depăși limita de ${limite.contactePf} persoane fizice a pachetului.`);
    }
  }

  const importId = randomUUID();
  await ctx.db.insert(donatoriImporturi).values({
    id: importId, orgId: ctx.orgId, nume: numeSursa.slice(0, 200), de: p.de, pana: p.pana,
    nrRanduri: p.randuri, nrImportate: plan.deImportat.length, nrDuplicate: p.duplicate, nrDonatoriNoi: plan.emailuriNoi.size, createdBy: ctx.userId,
  });

  for (let i = 0; i < plan.deImportat.length; i += 500) {
    await ctx.db.insert(donatiiImportate).values(
      plan.deImportat.slice(i, i + 500).map((r) => ({
        orgId: ctx.orgId, importId, email: r.email, nume: r.nume, suma: r.sumaLei, moneda: r.moneda, sumaOriginala: r.sumaOriginala === null ? null : String(r.sumaOriginala),
        data: r.data, proiect: r.proiect, proiectPageId: r.campaniePageId, procesator: r.procesator, idExtern: r.idExtern,
      })),
    );
  }

  // Donatori: cei noi se creează (cu cache-ul recalculat mai jos); cei existenți primesc doar datele de contact care le lipseau.
  const primulDupaEmail = new Map<string, (typeof plan.deImportat)[number]>();
  for (const r of plan.deImportat) if (!primulDupaEmail.has(r.email)) primulDupaEmail.set(r.email, r);
  const noi = [...plan.emailuriNoi].map((e) => primulDupaEmail.get(e)!).filter(Boolean);
  for (let i = 0; i < noi.length; i += 500) {
    await ctx.db.insert(donatoriReali).values(
      noi.slice(i, i + 500).map((r) => ({
        id: randomUUID(), orgId: ctx.orgId, nume: r.nume, email: r.email, telefon: r.telefon, localitate: r.localitate, judet: r.judet,
        sursa: `Import: ${numeSursa}`.slice(0, 200), metodaPlata: r.procesator ?? "—", totalDonat: 0, numarDonatii: 0, importId,
      })),
    ).onConflictDoNothing();
  }
  const existenti = [...primulDupaEmail.values()].filter((r) => !plan.emailuriNoi.has(r.email));
  for (const r of existenti) {
    if (!r.telefon && !r.localitate && !r.judet) continue;
    await ctx.db.execute(sql`
      update donatori_reali set telefon = coalesce(nullif(telefon, ''), ${r.telefon}), localitate = coalesce(nullif(localitate, ''), ${r.localitate}), judet = coalesce(nullif(judet, ''), ${r.judet})
      where org_id = ${ctx.orgId} and lower(email) = ${r.email}`);
  }

  await recalculeazaCacheDonatori(ctx, [...primulDupaEmail.keys()]);
  await inregistreazaAudit(ctx.db as never, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "donatori_import", entitate: "import_donatori", entitateId: importId, detalii: { nume: numeSursa, importate: plan.deImportat.length, duplicate: p.duplicate, donatoriNoi: plan.emailuriNoi.size } });
  return { importId, importate: plan.deImportat.length, duplicate: p.duplicate, donatoriNoi: plan.emailuriNoi.size };
}

// Șterge un import: donațiile lui pleacă în cascadă, donatorii creați doar de el (fără alte donații, notițe sau stare de lucru) se șterg,
// iar totalurile celorlalți se recalculează.
export async function stergeImport(ctx: Pick<OrgContext, "db" | "orgId" | "userId">, importId: string): Promise<{ stersi: number; donatoriStersi: number }> {
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:donatori-import`}, 0))`);
  const [imp] = await ctx.db.select({ id: donatoriImporturi.id, nume: donatoriImporturi.nume }).from(donatoriImporturi).where(and(eq(donatoriImporturi.id, importId), eq(donatoriImporturi.orgId, ctx.orgId))).limit(1);
  if (!imp) throw new Error("Importul nu mai există.");
  const afectati = (await ctx.db.execute(sql`select distinct email from donatii_importate where org_id = ${ctx.orgId} and import_id = ${importId}`)) as unknown as { email: string }[];
  const emailuri = afectati.map((a) => a.email);
  const stersi = (await ctx.db.delete(donatoriImporturi).where(and(eq(donatoriImporturi.id, importId), eq(donatoriImporturi.orgId, ctx.orgId))).returning({ id: donatoriImporturi.id })).length ? emailuri.length : 0;

  const donatoriStersi = (await ctx.db.execute(sql`
    with ${donCte(ctx.orgId)}
    delete from donatori_reali dr
    where dr.org_id = ${ctx.orgId} and dr.import_id = ${importId}
      and not exists (select 1 from don where don.email = lower(dr.email))
      and not exists (select 1 from donator_notite n where n.donator_id = dr.id)
      and dr.sunat_la is null and dr.multumit_la is null and not dr.a_raspuns and dr.reapel_la is null and dr.wb_stage is null
    returning dr.id`)) as unknown as { id: string }[];
  await ctx.db.execute(sql`update donatori_reali set import_id = null where org_id = ${ctx.orgId} and import_id = ${importId}`);
  await recalculeazaCacheDonatori(ctx, emailuri);
  await inregistreazaAudit(ctx.db as never, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "donatori_import_sters", entitate: "import_donatori", entitateId: importId, detalii: { nume: imp.nume, donatoriStersi: donatoriStersi.length } });
  return { stersi, donatoriStersi: donatoriStersi.length };
}

export { CAMPURI_IMPORT };
