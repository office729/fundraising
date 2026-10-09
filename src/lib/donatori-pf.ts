import { sql, type SQL } from "drizzle-orm";

import { patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { PRAGURI, SEGMENTE_META, type FiltruPf, type SegmentMeta, type Sortare } from "@/lib/donatori-pf-filtre";

// Re-exportate ca serverul să importe tot dintr-un singur loc.
export * from "@/lib/donatori-pf-filtre";

// Motorul CRM Persoane fizice: o singură „bază” de donatori (SQL) peste TOATE donațiile reușite ale organizației — online, înregistrate
// manual (fundraising_donations) și importate (donatii_importate) — cu segmentele, filtrele, sortarea și paginarea aplicate pe ea.
// Pragurile sunt constante aici; se pot ajusta fără a atinge restul codului.


export type ContextPf = { valDe: string; importNouId: string | null };

// ===== Baza de donatori (CTE-uri) =====
// Toate donațiile reușite ale organizației, într-o singură formă: online + înregistrate manual (fundraising_donations) + importate.
export function donCte(orgId: string): SQL {
  return sql`
    don as (
      select lower(d.email_donator) as email, greatest(d.suma - coalesce(d.suma_rambursata, 0), 0)::int as suma, d.created_at as data,
             p.titlu as proiect, d.page_id::text as pid, coalesce(d.recurenta, false) as recurenta
      from fundraising_donations d join fundraising_pages p on p.id = d.page_id
      where d.org_id = ${orgId} and d.status = 'reusita' and d.email_donator is not null
      union all
      select i.email, i.suma, i.data, coalesce(p.titlu, i.proiect), coalesce(i.proiect_page_id::text, 'i:' || lower(coalesce(i.proiect, ''))), false
      from donatii_importate i left join fundraising_pages p on p.id = i.proiect_page_id
      where i.org_id = ${orgId} and i.status = 'reusita'
    )`;
}

export function bazaDonatori(orgId: string): SQL {
  return sql`
    ${donCte(orgId)},
    agg as (
      select email, sum(suma)::bigint as total, count(*)::int as nr, min(data) as prima, max(data) as ultima,
             (array_agg(suma order by data desc))[1] as ultima_suma,
             (array_agg(proiect order by data asc))[1] as primul_proiect,
             (array_agg(proiect order by data desc))[1] as ultimul_proiect,
             count(distinct pid)::int as nr_proiecte
      from don group by email
    ),
    abon as (
      select distinct lower(email_donator) as email from fundraising_donations
      where org_id = ${orgId} and recurenta and abonament_activ and email_donator is not null
    ),
    base as (
      select dr.id, dr.email, dr.nume, dr.telefon, dr.localitate, dr.judet, dr.responsabil, dr.sursa, dr.import_id, dr.adaugat_la,
             dr.sunat_la, dr.multumit_la, dr.a_raspuns, dr.nu_contactat, dr.reapel_la, dr.wb_stage,
             dr.consimtamant_email, dr.consimtamant_whatsapp, dr.dezabonat_email_la,
             coalesce(a.total, 0) as total, coalesce(a.nr, 0) as nr, a.prima, a.ultima, a.ultima_suma,
             a.primul_proiect, a.ultimul_proiect, coalesce(a.nr_proiecte, 0) as nr_proiecte,
             (ab.email is not null) as lunar,
             extract(year from a.prima at time zone 'Europe/Bucharest')::int as an,
             (select count(*) from donator_notite n where n.donator_id = dr.id)::int as nr_notite
      from donatori_reali dr
      left join agg a on a.email = lower(dr.email)
      left join abon ab on ab.email = lower(dr.email)
      where dr.org_id = ${orgId}
    )`;
}

// ===== Segmente =====
// Metadatele (etichete, descrieri) sunt în donatori-pf-filtre.ts; aici sunt doar condițiile SQL, pe alias-ul `b` (baza).
export type SegmentDef = SegmentMeta & { sql: ((c: ContextPf) => SQL) | null };

const interval = (luni: number) => sql.raw(`interval '${Math.round(luni)} months'`);
const zile = (n: number) => sql.raw(`interval '${Math.round(n)} days'`);
const telefonPrezent = sql`coalesce(b.telefon, '') <> ''`;

const P90_TOTAL = sql`(select coalesce(percentile_cont(0.9) within group (order by total), 0) from base where nr >= 1)`;

const SQL_SEGMENT: Record<string, (c: ContextPf) => SQL> = {
  recurenti: () => sql`b.nr >= 2`,
  unica: () => sql`b.nr = 1`,
  noi: (c) => (c.importNouId ? sql`b.import_id = ${c.importNouId}::uuid` : sql`b.prima >= now() - ${zile(PRAGURI.noiZile)}`),
  aumaidonat: (c) => sql`b.nr >= 2 and b.ultima >= ${c.valDe}::date and b.prima < ${c.valDe}::date`,
  dormanti: () => sql`b.nr >= 1 and b.ultima < now() - ${interval(PRAGURI.dormantLuni)}`,
  desunat: () => sql`${telefonPrezent} and b.sunat_la is null and not b.nu_contactat`,
  demultumit: () => sql`b.nr >= 1 and b.multumit_la is null and b.ultima >= now() - ${zile(30)}`,
  cutelefon: () => telefonPrezent,
  sunati: () => sql`b.sunat_la is not null`,
  multumiti: () => sql`b.multumit_la is not null`,
  lunari: () => sql`b.lunar`,
  candidatilunar: () => sql`b.nr >= ${PRAGURI.candidatLunarMinDonatii} and not b.lunar`,
  winback: () => sql`b.wb_stage = 'reactivare'`,
  risc: () =>
    sql`b.nr >= ${PRAGURI.riscMinDonatii} and not b.lunar and b.ultima < now() - ${interval(PRAGURI.riscDeLuni)} and b.ultima >= now() - ${interval(PRAGURI.riscPanaLuni)}
        and (extract(epoch from (b.ultima - b.prima)) / 86400.0 / nullif(b.nr - 1, 0)) <= ${PRAGURI.riscIntervalMaxZile}`,
  primadeconvertit: () => sql`b.nr = 1 and not b.lunar and b.prima >= now() - ${zile(PRAGURI.primaConvertitZile)}`,
  consimtemail: () => sql`b.consimtamant_email is true and b.dezabonat_email_la is null`,
  abonati: () => sql`b.consimtamant_email is not false and b.dezabonat_email_la is null`,
  dezabonati: () => sql`b.dezabonat_email_la is not null`,
  // Radar: segmente „ascunse”. Pragul de 10% se calculează pe toți donatorii cu donații.
  radarmari: () => sql`b.total >= ${P90_TOTAL} and b.total > 0 and b.ultima < now() - ${interval(6)}`,
  radaropriti: () =>
    sql`b.nr >= 2 and not b.lunar and b.ultima < now() - ${interval(6)} and (extract(epoch from (now() - b.ultima)) / 86400.0) > 2 * (extract(epoch from (b.ultima - b.prima)) / 86400.0 / nullif(b.nr - 1, 0))`,
  radarscadere: () => sql`b.nr >= 3 and b.ultima_suma < 0.6 * ((b.total - b.ultima_suma)::numeric / (b.nr - 1))`,
  radarbigunica: () => sql`b.nr = 1 and b.total >= ${P90_TOTAL} and b.total > 0`,
  radarambasadori: () => sql`b.nr_proiecte >= 3 and b.nr >= 4`,
};

export const SEGMENTE: SegmentDef[] = SEGMENTE_META.map((m) => ({ ...m, sql: SQL_SEGMENT[m.key] ?? null }));
export const SEGMENT_PE_CHEIE = new Map(SEGMENTE.map((s) => [s.key, s]));
function ziuaUrmatoare(d: string): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

// Condițiile filtrelor (fără segmente), pe alias-ul `b` (baza). `orgId` pentru subinterogările pe donații.
export function conditiiFiltre(f: FiltruPf, orgId: string): SQL[] {
  const c: SQL[] = [];
  const q = f.q.trim();
  if (q) {
    const p = patternLike(q);
    c.push(
      sql`(${sqlFaraDiacritice(sql`b.nume`)} like ${p} or lower(b.email) like ${`%${q.toLowerCase()}%`} or ${sqlFaraDiacritice(sql`coalesce(b.localitate, '')`)} like ${p}
        or ${sqlFaraDiacritice(sql`coalesce(b.primul_proiect, '')`)} like ${p} or ${sqlFaraDiacritice(sql`coalesce(b.ultimul_proiect, '')`)} like ${p})`,
    );
  }
  if (f.an !== null) c.push(sql`b.an = ${f.an}`);
  if (f.primProiect.trim()) c.push(sql`b.primul_proiect = ${f.primProiect.trim()}`);
  if (f.judet.trim()) c.push(sql`${sqlFaraDiacritice(sql`coalesce(b.judet, '')`)} like ${patternLike(f.judet)}`);
  if (f.localitate.trim()) c.push(sql`${sqlFaraDiacritice(sql`coalesce(b.localitate, '')`)} like ${patternLike(f.localitate)}`);
  if (f.sumaMin !== null) c.push(sql`b.total >= ${f.sumaMin}`);
  if (f.sumaMax !== null) c.push(sql`b.total <= ${f.sumaMax}`);
  if (f.ultimaMin !== null) c.push(sql`b.ultima_suma >= ${f.ultimaMin}`);
  if (f.primaDe) c.push(sql`b.prima >= ${f.primaDe}::date`);
  if (f.primaPana) c.push(sql`b.prima < ${ziuaUrmatoare(f.primaPana)}::date`);

  // Filtrele pe donații (proiect, pentru cine, dată de activitate) se potrivesc pe ACEEAȘI donație.
  const cuDonatie: SQL[] = [];
  if (f.proiect.trim()) cuDonatie.push(sql`x.proiect = ${f.proiect.trim()}`);
  if (f.pentruCine.trim()) cuDonatie.push(sql`${sqlFaraDiacritice(sql`coalesce(x.proiect, '')`)} like ${patternLike(f.pentruCine)}`);
  if (f.campData === "activitate") {
    if (f.dataDe) cuDonatie.push(sql`x.data >= ${f.dataDe}::date`);
    if (f.dataPana) cuDonatie.push(sql`x.data < ${ziuaUrmatoare(f.dataPana)}::date`);
  } else {
    const col = f.campData === "adaugat" ? sql`b.adaugat_la` : f.campData === "sunat" ? sql`b.sunat_la` : sql`b.multumit_la`;
    if (f.dataDe) c.push(sql`${col} >= ${f.dataDe}::date`);
    if (f.dataPana) c.push(sql`${col} < ${ziuaUrmatoare(f.dataPana)}::date`);
  }
  if (cuDonatie.length) {
    c.push(sql`exists (
      select 1 from (
        select lower(d.email_donator) as email, p.titlu as proiect, d.created_at as data from fundraising_donations d join fundraising_pages p on p.id = d.page_id
        where d.org_id = ${orgId} and d.status = 'reusita'
        union all
        select i.email, coalesce(p.titlu, i.proiect), i.data from donatii_importate i left join fundraising_pages p on p.id = i.proiect_page_id where i.org_id = ${orgId} and i.status = 'reusita'
      ) x where x.email = lower(b.email) and ${sql.join(cuDonatie, sql` and `)}
    )`);
  }
  return c;
}

export function conditiiSegmente(seg: string[], ctx: ContextPf): { conditii: SQL[]; top: number | null } {
  const conditii: SQL[] = [];
  let top: number | null = null;
  for (const k of seg) {
    const d = SEGMENT_PE_CHEIE.get(k);
    if (!d) continue;
    if (d.sql) conditii.push(sql`(${d.sql(ctx)})`);
    if (d.top) top = top === null ? d.top : Math.min(top, d.top);
  }
  return { conditii, top };
}

const COL_SORT: Record<Sortare, SQL> = {
  email: sql`lower(email)`,
  nume: sql`lower(nume)`,
  localitate: sql`lower(coalesce(localitate, ''))`,
  total: sql`total`,
  nr: sql`nr`,
  ultima_suma: sql`ultima_suma`,
  ultima: sql`ultima`,
  primul_proiect: sql`lower(coalesce(primul_proiect, ''))`,
  ultimul_proiect: sql`lower(coalesce(ultimul_proiect, ''))`,
  an: sql`an`,
};

export function ordonare(f: Pick<FiltruPf, "sort" | "dir">): SQL {
  const dir = f.dir === "asc" ? sql`asc nulls last` : sql`desc nulls last`;
  return sql`${COL_SORT[f.sort]} ${dir}, email asc`;
}

export type RandDonator = {
  id: string;
  email: string;
  nume: string;
  telefon: string | null;
  localitate: string | null;
  judet: string | null;
  responsabil: string | null;
  sursa: string;
  adaugat_la: string;
  sunat_la: string | null;
  multumit_la: string | null;
  a_raspuns: boolean;
  nu_contactat: boolean;
  reapel_la: string | null;
  wb_stage: string | null;
  consimtamant_email: boolean | null;
  dezabonat_email_la: string | null;
  total: number;
  nr: number;
  prima: string | null;
  ultima: string | null;
  ultima_suma: number | null;
  primul_proiect: string | null;
  ultimul_proiect: string | null;
  nr_proiecte: number;
  lunar: boolean;
  an: number | null;
  nr_notite: number;
};

// Interogarea listei: `filtered` aplică filtrele + segmentele (ȘI), apoi „Top N” se taie DUPĂ ele (sortate pe total).
export function interogareLista(orgId: string, f: FiltruPf, ctx: ContextPf, opt: { paginat: boolean }): SQL {
  const { conditii, top } = conditiiSegmente(f.seg, ctx);
  const toate = [...conditiiFiltre(f, orgId), ...conditii];
  const unde = toate.length ? sql`where ${sql.join(toate, sql` and `)}` : sql``;
  const taie = top !== null ? sql`where rn <= ${top}` : sql``;
  const pag = opt.paginat ? sql`limit ${PRAGURI.pagina} offset ${(f.pagina - 1) * PRAGURI.pagina}` : sql``;
  return sql`
    with ${bazaDonatori(orgId)},
    filtered as (select b.*, row_number() over (order by b.total desc, b.email) as rn from base b ${unde})
    select *, count(*) over ()::int as _total, coalesce(sum(total) over (), 0)::bigint as _suma, coalesce(sum(nr) over (), 0)::int as _donatii
    from filtered ${taie} order by ${ordonare(f)} ${pag}`;
}

// Contoarele chip-urilor: fiecare segment aplicat singur peste filtrele curente (fără segmentele alese). Top N = min(N, total).
export function interogareContoare(orgId: string, f: FiltruPf, ctx: ContextPf): SQL {
  const conditii = conditiiFiltre(f, orgId);
  const unde = conditii.length ? sql`where ${sql.join(conditii, sql` and `)}` : sql``;
  const coloane = SEGMENTE.filter((s) => s.sql).map((s) => sql`count(*) filter (where ${s.sql!(ctx)})::int as ${sql.raw(`s_${s.key}`)}`);
  return sql`with ${bazaDonatori(orgId)} select count(*)::int as toti, ${sql.join(coloane, sql`, `)} from base b ${unde}`;
}

export const cheieContor = (k: string) => `s_${k}`;

// „Ultimul val” și „importul nou” pentru segmentele „Au mai donat” și „Noi”: de la începutul ultimului import; fără importuri, ultimele N luni.
export async function contextPf(ctx: { db: { execute: (q: SQL) => PromiseLike<unknown> }; orgId: string }): Promise<ContextPf> {
  const [imp] = (await ctx.db.execute(sql`select id::text as id, de::text as de from donatori_importuri where org_id = ${ctx.orgId} order by created_at desc limit 1`)) as unknown as { id: string; de: string | null }[];
  const implicit = new Date(Date.now() - PRAGURI.valLuni * 30.4 * 86400000).toISOString().slice(0, 10);
  return { valDe: imp?.de ?? implicit, importNouId: imp?.id ?? null };
}
