"use server";

import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, companies, organizations, prospectareCandidati, prospectareChei, prospectareJurnal } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { bandaFirma, type Banda } from "@/lib/prioritizare-firme";
import { adaugaZileLucratoare, aziBucuresti, COOLDOWN_CAUTARE_ORE, LIMITA_APELURI_PE_ZI, REZERVARE_EXPIRA_MIN } from "@/lib/prospectare/limite";
import { listeUrmarire, palnieOutreach } from "@/lib/waalaxy-server";
import { aprobaCandidat } from "../companii/[id]/prospectare-actions";
import { getLocale } from "@/lib/i18n/get-locale";
import { DECIDENTI_UI_DICT } from "@/lib/i18n/dictionaries/decidenti-ui";

// Mesajele afișate utilizatorului, în limba aleasă (cookie-ul de limbă).
const mesaje = async () => DECIDENTI_UI_DICT[await getLocale()].msg;

// Pagina „Decidenți”: ce ai de făcut cu persoanele găsite prin prospectare, într-un singur loc (pachetul IMPACT).
//  - De contactat azi: persoanele aprobate, cu responsabil și termen pentru următorul pas;
//  - De aprobat: toate persoanele propuse, de la toate firmele, cu aprobare în lot;
//  - Căutare în masă: firmele din benzile A/B care n-au fost căutate încă (rulată din interfață, firmă cu firmă, ca să se vadă progresul).
const OPTIUNI = { modul: "prospectare-multi" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IN_LOT = 25;
export type StadiuUrmarire = "de_contactat" | "contactat" | "raspuns" | "inchis";

export type RandCoada = {
  id: string;
  companyId: string;
  firma: string;
  nume: string;
  rol: string | null;
  eticheta: string | null;
  prioritate: number | null;
  email: string | null;
  emailStatus: string | null;
  linkedin: string | null;
  stadiu: StadiuUrmarire;
  urmatorPasLa: string | null;
  nrAtingeri: number;
  responsabil: string | null;
  esteAlMeu: boolean;
};

export type EtapaDecidenti = { cheie: string; eticheta: string; n: number };

// Numărătoare pe etape pentru varianta „grafic” a paginii (vezi VARIANTE_PAGINI în lib/personalizare-org.ts): doar cifre agregate, pe organizația curentă.
export const getStatisticaDecidenti = withOrgSession(
  async (ctx): Promise<EtapaDecidenti[]> => {
    const randuri = await ctx.db
      .select({ stare: prospectareCandidati.stare, stadiu: prospectareCandidati.stadiu, n: count() })
      .from(prospectareCandidati)
      .where(eq(prospectareCandidati.orgId, ctx.orgId))
      .groupBy(prospectareCandidati.stare, prospectareCandidati.stadiu);
    const suma = (potrivit: (r: (typeof randuri)[number]) => boolean) => randuri.filter(potrivit).reduce((s, r) => s + Number(r.n), 0);
    const aprobat = (stadiu: StadiuUrmarire) => suma((r) => r.stare === "aprobat" && r.stadiu === stadiu);
    return [
      { cheie: "de_aprobat", eticheta: "De aprobat", n: suma((r) => r.stare === "nou") },
      { cheie: "de_contactat", eticheta: "De contactat", n: aprobat("de_contactat") },
      { cheie: "contactat", eticheta: "Contactate", n: aprobat("contactat") },
      { cheie: "raspuns", eticheta: "Au răspuns", n: aprobat("raspuns") },
      { cheie: "inchis", eticheta: "Închise", n: aprobat("inchis") },
      { cheie: "respins", eticheta: "Respinse", n: suma((r) => r.stare === "respins") },
    ];
  },
  OPTIUNI,
);

export type DateCoada = {
  azi: string;
  rows: RandCoada[];
  ong: string;
  semnatura: string;
};

export const getCoadaAzi = withOrgSession(
  async (ctx, toate: boolean): Promise<DateCoada> => {
    const filtre = [eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "aprobat"), inArray(prospectareCandidati.stadiu, ["de_contactat", "contactat"])];
    if (!toate) filtre.push(eq(prospectareCandidati.responsabilId, ctx.userId));
    const [randuri, [org], [eu]] = await Promise.all([
      ctx.db
        .select({
          c: prospectareCandidati,
          firma: companies.nume,
          responsabilNume: appUsers.name,
          responsabilEmail: appUsers.email,
        })
        .from(prospectareCandidati)
        .innerJoin(companies, eq(companies.id, prospectareCandidati.companyId))
        .leftJoin(appUsers, eq(appUsers.id, prospectareCandidati.responsabilId))
        .where(and(...filtre))
        .orderBy(sql`${prospectareCandidati.urmatorPasLa} asc nulls last`, desc(prospectareCandidati.scor))
        .limit(200),
      ctx.db.select({ nume: organizations.name }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1),
      ctx.db.select({ nume: appUsers.name, email: appUsers.email }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1),
    ]);
    return {
      azi: aziBucuresti(),
      ong: org?.nume ?? "",
      semnatura: eu?.nume || (eu?.email ? eu.email.split("@")[0] : ""),
      rows: randuri.map(({ c, firma, responsabilNume, responsabilEmail }) => ({
        id: c.id,
        companyId: c.companyId,
        firma,
        nume: c.nume,
        rol: c.rol,
        eticheta: c.eticheta,
        prioritate: c.prioritate,
        email: c.email,
        emailStatus: c.emailStatus,
        linkedin: c.linkedin,
        stadiu: c.stadiu as StadiuUrmarire,
        urmatorPasLa: c.urmatorPasLa,
        nrAtingeri: c.nrAtingeri,
        responsabil: responsabilNume || (responsabilEmail ? responsabilEmail.split("@")[0] : null),
        esteAlMeu: c.responsabilId === ctx.userId,
      })),
    };
  },
  OPTIUNI,
);

// Un pas de urmărire: contactat (următorul pas peste 4 zile lucrătoare), a răspuns, sau închis. Doar pe persoane aprobate încă deschise.
type PasUrmarire = "contactat" | "raspuns" | "inchis" | "preia";
const aplicaPas = withOrgSession(
  async (ctx, id: string, pas: PasUrmarire): Promise<void> => {
    const m = await mesaje();
    if (!UUID.test(id)) throw new EroareUtilizator(m.persoanaNegasita);
    const deschis = and(
      eq(prospectareCandidati.id, id),
      eq(prospectareCandidati.orgId, ctx.orgId),
      eq(prospectareCandidati.stare, "aprobat"),
      inArray(prospectareCandidati.stadiu, ["de_contactat", "contactat"]),
    );
    const set =
      pas === "contactat"
        ? { stadiu: "contactat", contactatLa: new Date(), nrAtingeri: sql`${prospectareCandidati.nrAtingeri} + 1`, urmatorPasLa: adaugaZileLucratoare(aziBucuresti(), 4) }
        : pas === "raspuns"
          ? { stadiu: "raspuns", urmatorPasLa: null }
          : pas === "inchis"
            ? { stadiu: "inchis", urmatorPasLa: null }
            : { responsabilId: ctx.userId };
    const r = await ctx.db.update(prospectareCandidati).set(set).where(deschis).returning({ id: prospectareCandidati.id });
    if (r.length === 0) throw new EroareUtilizator(m.nuMaiEInLista);
    revalidatePath(`/${ctx.orgSlug}/crm/decidenti`);
  },
  OPTIUNI,
);

export async function pasUrmarireAction(orgSlug: string, id: string, pas: string): Promise<{ error: string | null }> {
  const m = await mesaje();
  try {
    if (!["contactat", "raspuns", "inchis", "preia"].includes(pas)) throw new EroareUtilizator(m.actiuneNecunoscuta);
    await aplicaPas(orgSlug, id, pas as PasUrmarire);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, m.nuAmPututSalva, "prospectare-pas") };
  }
}

// ---- De aprobat (toate firmele)

export type RandDeAprobat = {
  id: string;
  companyId: string;
  firma: string;
  nume: string;
  rol: string | null;
  eticheta: string | null;
  email: string | null;
  emailStatus: string | null;
  linkedin: string | null;
  sursa: string;
  scor: number;
  gasitLa: string;
};

export type DateDeAprobat = { rows: RandDeAprobat[]; waalaxyGata: boolean };

export const getDeAprobat = withOrgSession(
  async (ctx): Promise<DateDeAprobat> => {
    const [randuri, waalaxy] = await Promise.all([
      ctx.db
        .select({ c: prospectareCandidati, firma: companies.nume })
        .from(prospectareCandidati)
        .innerJoin(companies, eq(companies.id, prospectareCandidati.companyId))
        .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")))
        .orderBy(desc(prospectareCandidati.scor))
        .limit(300),
      ctx.db.select({ setari: prospectareChei.setari }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy"))).limit(1),
    ]);
    return {
      waalaxyGata: Boolean(waalaxy[0]?.setari?.listaId),
      rows: randuri.map(({ c, firma }) => ({
        id: c.id,
        companyId: c.companyId,
        firma,
        nume: c.nume,
        rol: c.rol,
        eticheta: c.eticheta,
        email: c.email,
        emailStatus: c.emailStatus,
        linkedin: c.linkedin,
        sursa: c.sursa,
        scor: c.scor,
        gasitLa: c.gasitLa.toISOString(),
      })),
    };
  },
  OPTIUNI,
);

export type RezultatLot = { aprobati: number; erori: string[]; avertismente: string[] };

// Aprobarea în lot: fiecare persoană trece prin aceeași aprobare ca una singură (suprimări, poartă atomică, responsabil, termen, notă).
export async function aprobaInLotAction(orgSlug: string, ids: string[], trimiteWaalaxy = false): Promise<RezultatLot> {
  const m = await mesaje();
  const rezultat: RezultatLot = { aprobati: 0, erori: [], avertismente: [] };
  const curate = [...new Set((Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && UUID.test(x)))].slice(0, MAX_IN_LOT);
  if (curate.length === 0) return { ...rezultat, erori: [m.nicioPersoanaSelectata] };
  for (const id of curate) {
    try {
      const r = await aprobaCandidat(orgSlug, id, trimiteWaalaxy === true);
      if (r.error) rezultat.erori.push(r.error);
      else rezultat.aprobati++;
      if (r.avertisment) rezultat.avertismente.push(r.avertisment);
    } catch (e) {
      rezultat.erori.push(mesajSigur(e, m.nuAPutut, "prospectare-aprobare-lot"));
    }
  }
  return rezultat;
}

// ---- Căutare în masă

export type FirmaDeCautat = { id: string; nume: string; banda: Banda; sumaDisponibila: number | null; angajati: number | null };
export type DateCautareMasa = { firme: FirmaDeCautat[]; ramaseAzi: number; limita: number; areChei: boolean };

// Firmele eligibile D177 (aceleași reguli ca prioritizarea pe benzi), din benzile cerute, care nu au fost căutate încă: fără candidați și fără căutare recentă.
export const getFirmeDeCautat = withOrgSession(
  async (ctx, benzi: string): Promise<DateCautareMasa> => {
    const dorite: Banda[] = benzi === "A" ? ["A"] : ["A", "B"];
    const [cheiRand, folositeReale, rezervate, candidate, cautate, firme] = await Promise.all([
      ctx.db.select({ n: count() }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), ne(prospectareChei.provider, "waalaxy"))),
      ctx.db.select({ n: count() }).from(prospectareJurnal).where(and(eq(prospectareJurnal.orgId, ctx.orgId), ne(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - interval '24 hours'`))),
      ctx.db
        .select({ n: sql<number>`coalesce(sum(${prospectareJurnal.unitati}), 0)::int` })
        .from(prospectareJurnal)
        .where(and(eq(prospectareJurnal.orgId, ctx.orgId), eq(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - make_interval(mins => ${REZERVARE_EXPIRA_MIN})`))),
      ctx.db.selectDistinct({ id: prospectareCandidati.companyId }).from(prospectareCandidati).where(eq(prospectareCandidati.orgId, ctx.orgId)),
      ctx.db
        .selectDistinct({ id: prospectareJurnal.companyId })
        .from(prospectareJurnal)
        .where(and(eq(prospectareJurnal.orgId, ctx.orgId), eq(prospectareJurnal.operatie, "cautare"), gte(prospectareJurnal.createdAt, sql`now() - make_interval(hours => ${COOLDOWN_CAUTARE_ORE})`))),
      ctx.db
        .select({
          id: companies.id,
          nume: companies.nume,
          regimFiscal: companies.regimFiscal,
          profit: companies.profit,
          ca: companies.ca,
          sumaDisponibila: companies.sumaDisponibila,
          angajati: companies.nrAngajati,
          urma: sql<boolean>`(${companies.site} is not null and ${companies.site} <> '') or (${companies.linkedin} is not null and ${companies.linkedin} <> '') or (${companies.facebook} is not null and ${companies.facebook} <> '') or exists (select 1 from contacts c where c.company_id = ${companies.id})`,
        })
        .from(companies)
        .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, sql`(${companies.regimFiscal} = 'profit' or (${companies.profit} > 0 and ${companies.ca} >= 2500000))`))
        .orderBy(sql`${companies.sumaDisponibila} desc nulls last`)
        .limit(1000),
    ]);
    const excluse = new Set([...candidate.map((x) => x.id), ...cautate.map((x) => x.id)]);
    const lista: FirmaDeCautat[] = [];
    for (const f of firme) {
      if (excluse.has(f.id)) continue;
      const banda = bandaFirma({ regimFiscal: f.regimFiscal, profit: f.profit, ca: f.ca, sumaDisponibila: f.sumaDisponibila, areUrma: Boolean(f.urma) });
      if (!dorite.includes(banda)) continue;
      lista.push({ id: f.id, nume: f.nume, banda, sumaDisponibila: f.sumaDisponibila, angajati: f.angajati });
    }
    lista.sort((a, b) => (a.banda === b.banda ? (b.sumaDisponibila ?? 0) - (a.sumaDisponibila ?? 0) : a.banda < b.banda ? -1 : 1));
    return {
      firme: lista.slice(0, 100),
      ramaseAzi: Math.max(0, LIMITA_APELURI_PE_ZI - (folositeReale[0]?.n ?? 0) - (rezervate[0]?.n ?? 0)),
      limita: LIMITA_APELURI_PE_ZI,
      areChei: (cheiRand[0]?.n ?? 0) > 0,
    };
  },
  OPTIUNI,
);

// Pâlnia și listele LinkedIn (Waalaxy): invitați → conectați → răspunsuri (refuzuri), plus „conectați necontactați” și „invitați fără accept”.
export const getUrmarireLinkedin = withOrgSession(async (ctx) => ({ palnie: await palnieOutreach(ctx.db, ctx.orgId), liste: await listeUrmarire(ctx.db, ctx.orgId, 14) }), OPTIUNI);

// Wrapper-e care nu aruncă (pagina arată un mesaj, nu o eroare).
export async function urmarireLinkedin(orgSlug: string): Promise<Awaited<ReturnType<typeof getUrmarireLinkedin>> | null> {
  try {
    return await getUrmarireLinkedin(orgSlug);
  } catch {
    return null;
  }
}
export async function coadaAzi(orgSlug: string, toate: boolean): Promise<DateCoada | null> {
  try {
    return await getCoadaAzi(orgSlug, toate === true);
  } catch {
    return null;
  }
}
export async function deAprobat(orgSlug: string): Promise<DateDeAprobat | null> {
  try {
    return await getDeAprobat(orgSlug);
  } catch {
    return null;
  }
}
export async function firmeDeCautat(orgSlug: string, benzi: string): Promise<DateCautareMasa | null> {
  try {
    return await getFirmeDeCautat(orgSlug, benzi);
  } catch {
    return null;
  }
}

