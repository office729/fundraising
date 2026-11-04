import { listeazaDefinitii } from "@/lib/campuri-personalizate-server";
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { appUsers, companies, crmKv, fundraisingPages, companyNotite, companySponsorizari, companyStageLog, contacts, memberships } from "@/lib/db/schema";

import { citesteSegment, hexFaraCratime, LUNGIME_SUFIX, segmentFirma, slugFirma } from "@/lib/id-scurt";
import { cifreCui, faraDiacritice, patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { codJudetDinTextLiber } from "@/lib/judete";
import { CHEI_FUNCTII, esteCheieFunctie, FUNCTIE_NESPECIFICATA, regexFunctie } from "@/lib/functii-contact";
import { COTA_IMPOZIT_PROFIT, PLAFON_SPONSORIZARE_CA, PLAFON_SPONSORIZARE_IMPOZIT, PRAG_BANDA_B, PRAG_MICRO_CA } from "@/lib/prioritizare-firme";
import { sectiuneSigura } from "@/lib/sectiune-sigura";
import { citesteSet } from "./cai-calde-global";
import { TIP_EVENIMENT_TRIMIS } from "@/lib/waalaxy-trimis";
import { curataQsLista, type NumereFiltre } from "./lib/filtre-extra";
import { calculeazaInterval, type FiltruCompanii, RECENTE_LIMIT, TOP_LIMIT } from "./lib/filters";

const PAGE_SIZE = 25;
const esteAdminCtx = (ctx: OrgContext) => ctx.role === "owner" || ctx.role === "admin";

// Benzile A/B/C (lib/prioritizare-firme.ts): aceleași reguli, scrise în SQL ca să se poată filtra și sorta pe ele.
const eligibilaD177Sql = sql`(${companies.regimFiscal} = 'profit' or (${companies.regimFiscal} = 'necunoscut' and coalesce(${companies.profit}, 0) > 0 and coalesce(${companies.ca}, 0) >= ${PRAG_MICRO_CA}))`;
// Suma sponsorizabilă estimată din bilanț (aceeași formulă ca sumaSponsorizabilaEstimata din lib/prioritizare-firme.ts): doar pentru firmele eligibile, min(0,75% din CA, 20% din impozit),
// impozitul fiind cel din bilanț sau 16% din profit. Constantele se inserează ca literali numerici (un parametru fără tip ar fi citit ca întreg). Nu se scrie în baza de date.
const lit = (n: number) => sql.raw(String(n));
const sumaEstimataSql = sql`(case when ${eligibilaD177Sql} then round(least(coalesce(${companies.ca}, 0) * ${lit(PLAFON_SPONSORIZARE_CA)}, (case when coalesce(${companies.impozit}, 0) > 0 then ${companies.impozit} else greatest(coalesce(${companies.profit}, 0), 0) * ${lit(COTA_IMPOZIT_PROFIT)} end) * ${lit(PLAFON_SPONSORIZARE_IMPOZIT)}))::bigint else 0 end)`;
// Suma cu care se lucrează: cea introdusă de mână dacă e pozitivă, altfel estimarea.
const sumaEfectivaSql = sql`coalesce(nullif(${companies.sumaDisponibila}, 0), ${sumaEstimataSql})`;
// Pentru sortare: firmele fără nicio sumă (nici de mână, nici estimată) merg la urmă.
const sumaOrdineSql = sql`coalesce(nullif(${companies.sumaDisponibila}, 0), nullif(${sumaEstimataSql}, 0), -1)`;
// „Sprint fiscal”: firme cu capacitate, deschise sau în așteptare și fără contract semnat sau sponsorizare încheiată.
const sprintSql = sql`(${sumaEfectivaSql} > 0 and ${companies.status} in ('open', 'parked') and ${companies.stage} not in ('contract_semnat', 'sponsorizat'))`;
const areUrmaSql = sql`(coalesce(${companies.site}, '') <> '' or coalesce(${companies.linkedin}, '') <> '' or coalesce(${companies.facebook}, '') <> '' or exists (select 1 from ${contacts} ct where ct.company_id = ${companies.id}))`;
const bandaSql = sql<"A" | "B" | "C">`(case when not ${eligibilaD177Sql} then 'C' when ${areUrmaSql} then 'A' when ${sumaEfectivaSql} >= ${PRAG_BANDA_B} then 'B' else 'C' end)`;
const contactabilitateSql = sql<number>`(
  (case when coalesce(${companies.site}, '') <> '' then 2 else 0 end)
  + (case when coalesce(${companies.linkedin}, '') <> '' or coalesce(${companies.facebook}, '') <> '' then 2 else 0 end)
  + (case when exists (select 1 from ${contacts} ct where ct.company_id = ${companies.id}) then 3 else 0 end)
  + (case when nullif(btrim(${companies.extra}->>'telefon'), '') is not null then 1 else 0 end)
)`;

// Funcția și departamentul unei persoane, lipite și aduse la „fără diacritice, minuscule” (vezi lib/functii-contact.ts).
const textFunctieSql = () => sqlFaraDiacritice(sql`(coalesce(${contacts.rol}, '') || ' ' || coalesce(${contacts.dept}, ''))`);
const faraFunctieSql = () => sql`(coalesce(trim(${contacts.rol}), '') = '' and coalesce(trim(${contacts.dept}), '') = '')`;

// Condiția filtrului „funcția contactului” pe UN rând din contacts: persoana intră în oricare dintre categoriile alese
// ȘI (dacă e scris) funcția/departamentul ei conține textul liber. null = filtrul nu e folosit.
function conditieContactFunctie(f: FiltruCompanii): SQL | null {
  const parti: SQL[] = [];
  for (const c of f.functie) {
    if (c === FUNCTIE_NESPECIFICATA) parti.push(faraFunctieSql());
    else if (esteCheieFunctie(c)) parti.push(sql`${textFunctieSql()} ~ ${regexFunctie(c)}`);
  }
  const conditii: SQL[] = [];
  if (parti.length) conditii.push(or(...parti)!);
  if (f.functieText.trim()) conditii.push(sql`${textFunctieSql()} like ${patternLike(f.functieText)}`);
  return conditii.length ? and(...conditii)! : null;
}

// Firma are cel puțin un contact trimis în Waalaxy (invitație LinkedIn): un contact cu stare de outreach sau un eveniment de invitație (vezi lib/waalaxy-trimis.ts).
const trimisWaalaxySql = sql`(exists (select 1 from ${contacts} wk where wk.company_id = ${companies.id} and wk.outreach_stare is not null) or exists (select 1 from outreach_evenimente we where we.company_id = ${companies.id} and we.tip = ${TIP_EVENIMENT_TRIMIS}))`;
// Firmele care au sponsorizat (câștigate sau cu sumă primită), ca la „Sponsorii noștri”.
const esteSponsorSql = sql`(${companies.status} = 'won' or coalesce(${companies.sumaSponsorizata}, 0) > 0)`;

// Deep Search (?deep=1): fiecare cuvânt căutat trebuie să apară undeva — în firmă (nume, CUI, oraș, județ, domeniu / CAEN, site, administrator, notă, istoric), în contactele ei
// (nume, funcție, departament, email, telefon, LinkedIn, detalii) sau în notițe. Fără diacritice, insensibil la majuscule; un număr de telefon se potrivește după ultimele 9 cifre.
function cautareProfunda(q: string): SQL {
  const text = q.trim();
  const cifre = text.replace(/\D/g, "");
  if (cifre.length >= 6 && /^[\s\d+().-]+$/.test(text)) {
    const ultime = "%" + cifre.slice(-9);
    return sql`(exists (select 1 from ${contacts} k where k.company_id = ${companies.id} and regexp_replace(coalesce(k.telefon, ''), '[^0-9]', '', 'g') like ${ultime})
      or regexp_replace(coalesce(${companies.extra}->>'telefon', ''), '[^0-9]', '', 'g') like ${ultime}
      or regexp_replace(coalesce(${companies.cui}, ''), '[^0-9]', '', 'g') = ${cifre})`;
  }
  // „RO 12.345.678” (cu prefixul RO): ca la căutarea simplă, se compară doar cifrele CUI-ului.
  const cui = cifreCui(text);
  if (cui && cui.length >= 6) return sql`regexp_replace(coalesce(${companies.cui}, ''), '[^0-9]', '', 'g') = ${cui}`;
  const cuvinte = faraDiacritice(text).split(/\s+/).filter(Boolean).slice(0, 6);
  const firma = sqlFaraDiacritice(
    sql`concat_ws(' ', ${companies.nume}, ${companies.cui}, ${companies.localitate}, ${companies.judet}, ${companies.industrie}, ${companies.caen}, ${companies.site}, ${companies.administrator}, ${companies.nota}, ${companies.extra}->>'email', ${companies.extra}->>'telefon', ${companies.istoric}::text)`,
  );
  const contact = sqlFaraDiacritice(sql`concat_ws(' ', k.nume, k.rol, k.dept, k.loc, k.email, k.telefon, k.linkedin, k.detalii)`);
  const notita = sqlFaraDiacritice(sql`n.text`);
  const parti = cuvinte.map((w) => {
    const p = patternLike(w);
    return sql`(${firma} like ${p}
      or exists (select 1 from ${contacts} k where k.company_id = ${companies.id} and ${contact} like ${p})
      or exists (select 1 from ${companyNotite} n where n.company_id = ${companies.id} and ${notita} like ${p}))`;
  });
  return sql`(${sql.join(parti, sql` and `)})`;
}

// Condiții COMUNE listei și statisticilor — orice filtru nou trebuie adăugat
// AICI o singură dată, ca lista și cardurile de sus să rămână mereu coerente
// (aceleași firme numărate = aceleași firme afișate).
function conditiiComune(f: FiltruCompanii, userId: string, esteAdmin: boolean) {
  const cond = [sql`1=1`];
  // Căutare insensibilă la diacritice și la majuscule (fără extensia unaccent) — vezi lib/cautare.ts.
  // Dacă textul e doar cifre (eventual cu „RO”, spații, puncte) se caută și după CUI, comparând doar cifrele.
  if (f.deep && f.q.trim().length >= 2) {
    cond.push(cautareProfunda(f.q));
  } else if (f.q.trim()) {
    const dupaNume = sql`${sqlFaraDiacritice(companies.nume)} like ${patternLike(f.q)}`;
    const cifre = cifreCui(f.q);
    cond.push(cifre ? sql`(${dupaNume} or regexp_replace(coalesce(${companies.cui}, ''), '[^0-9]', '', 'g') = ${cifre})` : dupaNume);
  }
  if (f.vezi === "recente") cond.push(eq(companies.updatedBy, userId));
  if (f.judet !== "toate") cond.push(eq(companies.judet, f.judet));
  if (f.responsabil !== "toti") cond.push(eq(companies.ownerId, f.responsabil));
  if (f.contact === "cu") {
    cond.push(sql`exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and (${contacts.telefon} is not null or ${contacts.email} is not null))`);
  } else if (f.contact === "fara") {
    cond.push(sql`not exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and (${contacts.telefon} is not null or ${contacts.email} is not null))`);
  }
  if (f.contact === "ai") cond.push(sql`exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and ${contacts.provenienta} = 'web-ai')`);
  if (f.sponsor === "da") cond.push(esteSponsorSql);
  else if (f.sponsor === "nu") cond.push(sql`not ${esteSponsorSql}`);
  // Waalaxy e doar pentru administrator: pentru ceilalți parametrul se ignoră.
  if (esteAdmin && f.waalaxy === "trimise") cond.push(trimisWaalaxySql);
  else if (esteAdmin && f.waalaxy === "netrimise") cond.push(sql`not ${trimisWaalaxySql}`);
  const dupaFunctie = conditieContactFunctie(f);
  if (dupaFunctie) cond.push(sql`exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and ${dupaFunctie})`);
  if (f.banda) cond.push(sql`${bandaSql} = ${f.banda}`);
  if (f.eligibil) cond.push(eligibilaD177Sql);
  if (f.sprint) cond.push(sprintSql);
  if (f.cald) cond.push(sql`exists (select 1 from crm_kv k where k.org_id = ${companies.orgId} and k.path = 'cai-calde-set' and jsonb_exists(k.data->'ids', ${companies.id}::text))`);
  if (f.imbogatit) cond.push(sql`(coalesce((${companies.extra}->>'imbogatitLa')::timestamptz, 'epoch'::timestamptz) > now() - interval '30 days' and not (${companies.status} = 'won' or coalesce(${companies.sumaSponsorizata}, 0) > 0))`);
  for (const m of f.marcaje) {
    if (m === "d177") cond.push(eq(companies.d177, true));
    else if (m === "decembrie") cond.push(eq(companies.decembrie, true));
    else if (m === "caz") cond.push(eq(companies.mec20, true));
  }
  if (f.vezi === "lucrate") {
    cond.push(
      sql`(${companies.ownerId} is not null or ${companies.stage} <> 'nou' or exists (select 1 from ${companySponsorizari} where ${companySponsorizari.companyId} = ${companies.id}) or exists (select 1 from ${companyNotite} where ${companyNotite.companyId} = ${companies.id}))`,
    );
  }
  const { start, end } = calculeazaInterval(f);
  if (start && end) {
    cond.push(
      sql`exists (select 1 from ${companySponsorizari} where ${companySponsorizari.companyId} = ${companies.id} and ${companySponsorizari.data} >= ${start} and ${companySponsorizari.data} < ${end})`,
    );
  }
  return and(...cond)!;
}

export type RandCompanie = {
  id: string;
  nume: string;
  judet: string | null;
  localitate: string | null;
  linkedin: string | null;
  facebook: string | null;
  d177Stadiu: string | null;
  responsabilNume: string | null;
  sumaSponsorizata: number;
  recurent: boolean;
  d177: boolean;
  d177Incasat: boolean;
  decembrie: boolean;
  mec20: boolean;
  banda: "A" | "B" | "C";
  caldMotiv: string | null; // donator | sponsor | voluntar, din căile calde calculate la nivelul bazei
  temperatura: "cald" | "rece" | null;
  updatedAt: Date;
  lastViewedAt: Date | null;
  contacteFunctie: { nume: string; functie: string | null }[]; // doar când filtrul de funcție e activ
  contacteFunctieTotal: number;
};

const getCompaniiListaImpl = async (ctx: OrgContext, filtru: FiltruCompanii) => {
  const where = and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, conditiiComune(filtru, ctx.userId, esteAdminCtx(ctx)));

  const recente = filtru.vezi === "recente";
  const [{ total: totalReal }] = await ctx.db.select({ total: sql<number>`count(*)::int` }).from(companies).where(where);
  const total = recente ? Math.min(totalReal, RECENTE_LIMIT) : filtru.top ? Math.min(totalReal, TOP_LIMIT) : totalReal;

  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      judet: companies.judet,
      localitate: companies.localitate,
      linkedin: companies.linkedin,
      facebook: companies.facebook,
      d177Stadiu: sql<string | null>`${companies.extra}->>'d177Stadiu'`,
      responsabilNume: appUsers.name,
      sumaSponsorizata: sql<number>`coalesce(${companies.sumaSponsorizata}, 0)::int`,
      recurent: companies.recurent,
      d177: companies.d177,
      d177Incasat: companies.d177Incasat,
      decembrie: companies.decembrie,
      mec20: companies.mec20,
      banda: bandaSql,
      caldMotiv: sql<string | null>`(select k.data->'motive'->>(${companies.id}::text) from crm_kv k where k.org_id = ${companies.orgId} and k.path = 'cai-calde-set')`,
      temperatura: companies.temperatura,
      updatedAt: companies.updatedAt,
      lastViewedAt: companies.lastViewedAt,
    })
    .from(companies)
    .leftJoin(appUsers, eq(appUsers.id, companies.ownerId))
    .where(where)
    // Ordinea implicită: firmele „lucrate” întâi (au responsabil, altă etapă decât „nou”, alt status
    // decât „open” sau sponsorizări), apoi după suma sponsorizată, apoi după suma disponibilă.
    .orderBy(
      ...(recente
        ? [desc(companies.updatedAt)]
        : filtru.top
        ? [desc(sql`coalesce(${companies.sumaSponsorizata}, 0)`)]
        : filtru.ordine === "contactabilitate"
        ? [sql`${contactabilitateSql} desc`, sql`${sumaOrdineSql} desc`, desc(companies.id)]
        : [
            sql`(case when (${companies.ownerId} is not null or ${companies.stage} <> 'nou' or ${companies.status} <> 'open' or coalesce(${companies.sumaSponsorizata}, 0) > 0) then 1 else 0 end) desc`,
            sql`coalesce(${companies.sumaSponsorizata}, -1) desc`,
            sql`${sumaOrdineSql} desc`,
            desc(companies.id),
          ]),
    )
    .limit(recente ? RECENTE_LIMIT : PAGE_SIZE)
    .offset(recente ? 0 : (filtru.pagina - 1) * PAGE_SIZE);

  // Cu filtrul de funcție activ, fiecare firmă arată persoanele care l-au potrivit (cel mult 3, prioritarii întâi).
  const dupaFunctie = conditieContactFunctie(filtru);
  const potrivite = new Map<string, { nume: string; functie: string | null }[]>();
  if (dupaFunctie && rows.length) {
    const persoane = await ctx.db
      .select({ companyId: contacts.companyId, nume: contacts.nume, rol: contacts.rol, dept: contacts.dept })
      .from(contacts)
      .where(and(eq(contacts.orgId, ctx.orgId), inArray(contacts.companyId, rows.map((r) => r.id)), dupaFunctie))
      .orderBy(desc(contacts.cheie), contacts.nume);
    for (const p of persoane) {
      const lista = potrivite.get(p.companyId) ?? [];
      lista.push({ nume: p.nume, functie: [p.rol, p.dept].filter(Boolean).join(" · ") || null });
      potrivite.set(p.companyId, lista);
    }
  }

  const pageSize = recente ? RECENTE_LIMIT : PAGE_SIZE;
  const randuri = rows.map((r) => ({ ...r, contacteFunctie: (potrivite.get(r.id) ?? []).slice(0, 3), contacteFunctieTotal: potrivite.get(r.id)?.length ?? 0 }));
  return { rows: randuri as RandCompanie[], total, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
};
export const getCompaniiLista = withOrgSession(getCompaniiListaImpl);

export type StatisticiCompanii = {
  companii: number;
  sponsorizari: number;
  totalSponsorizat: number;
  recurenti: number;
  recurentiPct: number;
  medieSponsorizare: number;
  medieCompanie: number;
};

// Statisticile sunt calculate DOAR din company_sponsorizari (sursa reală de
// tranzacții, cu dată) — nu din cache-ul companies.suma_sponsorizata, ca să
// răspundă corect la filtrul de perioadă. companii/sponsorizari filtrate prin
// aceleași condiții comune (JOIN pe companies), plus intervalul de dată direct
// pe sponsorizări (nu prin EXISTS, ca la listă — aici avem nevoie de SUM/COUNT
// pe rândurile de sponsorizare, nu doar de firmele care au cel puțin una).
const getStatisticiCompaniiImpl = async (ctx: OrgContext, filtru: FiltruCompanii): Promise<StatisticiCompanii> => {
  const { start, end } = calculeazaInterval(filtru);
  const dataCond = start && end ? sql`and ${companySponsorizari.data} >= ${start} and ${companySponsorizari.data} < ${end}` : sql``;

  const filtruFaraPerioada: FiltruCompanii = { ...filtru, perioadaTip: "toate" };
  const condCompanii = conditiiComune(filtruFaraPerioada, ctx.userId, esteAdminCtx(ctx));

  const [row] = await ctx.db
    .select({
      companii: sql<number>`count(distinct ${companySponsorizari.companyId})::int`,
      sponsorizari: sql<number>`count(*)::int`,
      totalSponsorizat: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int`,
      recurenti: sql<number>`count(distinct ${companySponsorizari.companyId}) filter (where ${companies.recurent})::int`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
    .where(sql`${companySponsorizari.orgId} = ${ctx.orgId} and ${companies.deletedAt} is null and (${condCompanii}) ${dataCond}`);

  const companii = row?.companii ?? 0;
  const sponsorizari = row?.sponsorizari ?? 0;
  const totalSponsorizat = row?.totalSponsorizat ?? 0;
  const recurenti = row?.recurenti ?? 0;

  return {
    companii,
    sponsorizari,
    totalSponsorizat,
    recurenti,
    recurentiPct: companii ? Math.round((recurenti / companii) * 100) : 0,
    medieSponsorizare: sponsorizari ? Math.round(totalSponsorizat / sponsorizari) : 0,
    medieCompanie: companii ? Math.round(totalSponsorizat / companii) : 0,
  };
};
export const getStatisticiCompanii = withOrgSession(getStatisticiCompaniiImpl);

const getTotalFirmeImpl = async (ctx: OrgContext) => {
  const [{ total }] = await ctx.db
    .select({ total: sql<number>`count(*)::int` })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`));
  return total;
};
export const getTotalFirme = withOrgSession(getTotalFirmeImpl);

// Numărul de firme pe județ (toată baza, nu doar filtrul curent), cu codul auto folosit de harta României.
const getFirmeDupaJudetImpl = async (ctx: OrgContext) => {
  const rows = await ctx.db
    .select({ judet: companies.judet, nr: sql<number>`count(*)::int` })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, sql`${companies.judet} is not null`))
    .groupBy(companies.judet);
  const dupaJudet: Record<string, number> = {};
  for (const r of rows) {
    const cod = codJudetDinTextLiber(r.judet);
    if (cod) dupaJudet[cod] = (dupaJudet[cod] ?? 0) + r.nr;
  }
  return dupaJudet;
};

const getFunctiiNrImpl = async (ctx: OrgContext) => {
  const select: Record<string, SQL<number>> = {};
  for (const c of CHEI_FUNCTII) select[c] = sql<number>`count(distinct ${contacts.companyId}) filter (where ${textFunctieSql()} ~ ${regexFunctie(c)})::int`;
  select[FUNCTIE_NESPECIFICATA] = sql<number>`count(distinct ${contacts.companyId}) filter (where ${faraFunctieSql()})::int`;
  const [row] = await ctx.db
    .select(select)
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(and(eq(contacts.orgId, ctx.orgId), sql`${companies.deletedAt} is null`));
  return (row ?? {}) as Record<string, number>;
};

// Câte firme sunt în fiecare bandă (toată baza), plus câte sunt eligibile D177 și câte intră în „sprint fiscal”, pentru etichetele din filtru.
const getBenziNrImpl = async (ctx: OrgContext) => {
  const rows = (await ctx.db.execute(
    sql`select ${bandaSql} as banda, count(*)::int as nr from ${companies} where ${companies.orgId} = ${ctx.orgId} and ${companies.deletedAt} is null group by 1`,
  )) as unknown as { banda: "A" | "B" | "C"; nr: number }[];
  const rezultat: Record<"A" | "B" | "C", number> = { A: 0, B: 0, C: 0 };
  for (const r of rows) rezultat[r.banda] = r.nr;
  const [extra] = (await ctx.db.execute(
    sql`select count(*) filter (where ${eligibilaD177Sql})::int as eligibile, count(*) filter (where ${sprintSql})::int as sprint from ${companies} where ${companies.orgId} = ${ctx.orgId} and ${companies.deletedAt} is null`,
  )) as unknown as { eligibile: number; sprint: number }[];
  return { ...rezultat, eligibile: extra?.eligibile ?? 0, sprint: extra?.sprint ?? 0 };
};

const getResponsabiliOrgImpl = async (ctx: OrgContext) => {
  return ctx.db
    .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId))
    .orderBy(appUsers.name);
};
export const getResponsabiliOrg = withOrgSession(getResponsabiliOrgImpl);

export const getCompanieDetaliu = withOrgSession(async (ctx, segment: string) => {
  // `segment`: UUID complet, „denumire-c2607e5a” sau doar hex (adrese vechi). Vezi lib/id-scurt.ts.
  const cerut = citesteSegment(segment);
  if (!cerut) return null;
  const conditie = cerut.tip === "uuid" ? eq(companies.id, cerut.id) : sql`replace(${companies.id}::text, '-', '') like ${cerut.prefix + "%"}`;
  const candidate = await ctx.db
    .select()
    .from(companies)
    .where(and(conditie, eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
    .orderBy(companies.id)
    .limit(5);
  // la prefixe identice (foarte rar) se alege firma a cărei denumire se potrivește cu textul din adresă
  const companie = (cerut.tip === "prefix" && cerut.slug ? candidate.find((c) => slugFirma(c.nume) === cerut.slug) : undefined) ?? candidate[0];
  if (!companie) return null;
  const id = companie.id; // de aici încolo, UUID-ul complet

  // Adresa canonică: „denumire-<8 hex>”; dacă alt rând are aceeași denumire și același prefix, se folosește UUID-ul complet.
  const canonic = segmentFirma(companie.nume, id);
  const prefix8 = hexFaraCratime(id).slice(0, LUNGIME_SUFIX);

  // Citirile principale ale paginii rulează TOATE împreună (aceeași conexiune, pipeline) — înainte erau două așteptări
  // secvențiale înaintea lor. Bifarea vizitei trebuie așteptată (nu fire-and-forget): tranzacția withOrgSession se închide
  // imediat ce funcția revine. Cel mult o dată la 5 minute, ca să nu scrie (și WAL) la fiecare deschidere.
  const [aceleasiPrefix, , sponsorizari, notite, contacteFirma] = await Promise.all([
    ctx.db
      .select({ nume: companies.nume })
      .from(companies)
      .where(and(eq(companies.orgId, ctx.orgId), sql`replace(${companies.id}::text, '-', '') like ${prefix8 + "%"}`)),
    ctx.db
      .update(companies)
      .set({ lastViewedAt: new Date() })
      .where(and(eq(companies.id, id), sql`(${companies.lastViewedAt} is null or ${companies.lastViewedAt} < now() - interval '5 minutes')`)),
    ctx.db.select().from(companySponsorizari).where(eq(companySponsorizari.companyId, id)).orderBy(desc(companySponsorizari.data)),
    ctx.db
      .select({ id: companyNotite.id, text: companyNotite.text, createdAt: companyNotite.createdAt, editatLa: companyNotite.editatLa, autorNume: appUsers.name })
      .from(companyNotite)
      .leftJoin(appUsers, eq(appUsers.id, companyNotite.createdBy))
      .where(eq(companyNotite.companyId, id))
      .orderBy(desc(companyNotite.createdAt)),
    ctx.db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(desc(contacts.createdAt)),
  ]);
  const segmentCanonic = aceleasiPrefix.filter((r) => slugFirma(r.nume) === slugFirma(companie.nume)).length > 1 ? id : canonic;

  // Secțiuni secundare (lista de responsabili, jurnalul de etape): dacă pică, pagina se afișează fără ele, iar eroarea se jurnalizează.
  const responsabili = await sectiuneSigura(
    ctx,
    "companie.responsabili",
    (db) =>
      db
        .select({ id: appUsers.id, name: appUsers.name })
        .from(memberships)
        .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
        .where(eq(memberships.orgId, ctx.orgId)),
    [],
  );
  const campanii = await sectiuneSigura(
    ctx,
    "companie.campanii",
    (db) => db.select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.orgId, ctx.orgId)).orderBy(desc(fundraisingPages.createdAt)).limit(200),
    [] as { id: string; titlu: string }[],
  );
  const jurnalEtape = await sectiuneSigura(
    ctx,
    "companie.jurnalEtape",
    (db) =>
      db
        .select({
          id: companyStageLog.id,
          fromStage: companyStageLog.fromStage,
          toStage: companyStageLog.toStage,
          fromStatus: companyStageLog.fromStatus,
          toStatus: companyStageLog.toStatus,
          createdAt: companyStageLog.createdAt,
          autor: appUsers.name,
        })
        .from(companyStageLog)
        .leftJoin(appUsers, eq(appUsers.id, companyStageLog.byUserId))
        .where(eq(companyStageLog.companyId, id))
        .orderBy(desc(companyStageLog.createdAt))
        .limit(100),
    [],
  );
  const campuriDefs = await listeazaDefinitii(ctx.db, ctx.orgId, "companie", true).catch(() => []);
  return { companie, sponsorizari, notite, contacte: contacteFirma, responsabili, jurnalEtape, campanii, campuriDefs, segmentCanonic, orgNume: ctx.orgName, userEmail: ctx.userEmail };
});


// Pagina cere toate patru într-o SINGURĂ tranzacție (o conexiune din pool, un singur set de verificări de acces),
// nu patru tranzacții paralele — pool-ul are doar 5 conexiuni și layout-urile mai folosesc și ele.
export const getPaginaCompanii = withOrgSession(async (ctx, filtru: FiltruCompanii) => {
  const [totalFirme, stats, lista, responsabili, dupaJudet, functiiNr, benziNr, caiCalde] = await Promise.all([
    getTotalFirmeImpl(ctx),
    getStatisticiCompaniiImpl(ctx, filtru),
    getCompaniiListaImpl(ctx, filtru),
    getResponsabiliOrgImpl(ctx),
    getFirmeDupaJudetImpl(ctx),
    getFunctiiNrImpl(ctx),
    getBenziNrImpl(ctx),
    citesteSet(ctx),
  ]);
  return { totalFirme, stats, lista, responsabili, dupaJudet, functiiNr, benziNr, caiCalde };
});

// Numerele din selectele „Contact” și „Waalaxy”: câte firme rămân cu fiecare opțiune, ținând cont de TOATE celelalte filtre active. Rulează în paralel, într-o singură tranzacție
// separată de pagină (ca o numărătoare lentă să nu țină pagina pe loc). Waalaxy: doar pentru administrator (null altfel). Memorarea și limita de timp sunt în page.tsx.
export const getNumereFiltre = withOrgSession(async (ctx, filtru: FiltruCompanii): Promise<NumereFiltre> => {
  const admin = esteAdminCtx(ctx);
  const numara = async (patch: Partial<FiltruCompanii>): Promise<number> => {
    const [r] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(companies)
      .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, conditiiComune({ ...filtru, ...patch }, ctx.userId, admin)));
    return r?.n ?? 0;
  };
  const [cu, fara, ai, netrimise, trimise] = await Promise.all([
    numara({ contact: "cu" }),
    numara({ contact: "fara" }),
    numara({ contact: "ai" }),
    admin ? numara({ waalaxy: "netrimise" }) : Promise.resolve(null),
    admin ? numara({ waalaxy: "trimise" }) : Promise.resolve(null),
  ]);
  return { cu, fara, ai, netrimise, trimise };
});

// Ultima listă a fiecărui coleg (parametrii din adresă), ca la intrarea din meniu să reia ce avea: „Doar firme lucrate”, județ, responsabil etc. (crm_kv „lista_companii:<utilizator>”, pe organizație).
export const getUltimaLista = withOrgSession(async (ctx): Promise<string> => {
  const [r] = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, `lista_companii:${ctx.userId}`)))
    .limit(1);
  const qs = (r?.data as { qs?: unknown } | null)?.qs;
  return typeof qs === "string" ? curataQsLista(qs) : "";
});

// Firme similare: același cod CAEN (primele 4 cifre). Cele care n-au sponsorizat vin primele, apoi după suma cu care se lucrează (de mână sau estimată).
export type SimilarRand = { id: string; nume: string; judet: string | null; banda: "A" | "B" | "C"; suma: number; esteSponsor: boolean };
export const getCompaniiSimilare = withOrgSession(async (ctx, companyId: string, caen: string | null): Promise<SimilarRand[]> => {
  const cod = (caen ?? "").replace(/[^0-9]/g, "").slice(0, 4);
  if (cod.length < 3) return [];
  const esteSponsorSql = sql<boolean>`(${companies.status} = 'won' or coalesce(${companies.sumaSponsorizata}, 0) > 0)`;
  const rows = await ctx.db
    .select({ id: companies.id, nume: companies.nume, judet: companies.judet, banda: bandaSql, suma: sql<number>`coalesce(${sumaEfectivaSql}, 0)::int`, esteSponsor: esteSponsorSql })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, sql`${companies.id} <> ${companyId}`, sql`left(regexp_replace(coalesce(${companies.caen}, ''), '[^0-9]', '', 'g'), 4) = ${cod}`))
    .orderBy(sql`${esteSponsorSql} asc`, sql`${sumaOrdineSql} desc`, desc(companies.id))
    .limit(200);
  return rows;
});
