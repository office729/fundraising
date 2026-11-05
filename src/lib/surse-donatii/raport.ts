import "server-only";

import { sql, type SQL } from "drizzle-orm";

import type { db } from "@/lib/db";

import { CATEGORII } from "./nucleu";
import { calculeazaRaport, LIMITA_DETALII, paginare, type FiltreSurse, type Paginare, type RaportSurse, type RandAgregat } from "./raport-reguli";

type Dbx = typeof db;

// Interogările raportului „Sursele donațiilor”. Un rând din donatie_surse există doar pentru donațiile cu o sursă externă identificată (Direct nu are rând).
// Fiecare interogare filtrează explicit după organizație pe AMBELE tabele (și RLS rămâne), iar „plătită” = status 'reusita'.
// Perioada se aplică pe fundraising_donations.created_at (nu există coloană de dată a plății), în ora Europe/Bucharest: limitele zilelor sunt calculate de
// Postgres în acel fus (corect și la trecerea la ora de vară/iarnă), nu din decalaje fixe.
// Campania se compară insensibil la litere mari/mici și la spațiile de la capete (ambele părți prin lower(btrim()) în Postgres, ca regulile de literă să fie aceleași);
// o campanie goală (null sau doar spații) înseamnă „Fără campanie”, iar donația rămâne în raport.

const CAMPANIE_NORMALIZATA = sql`lower(btrim(s.u_campanie))`;
const FARA_CAMPANIE = sql`nullif(btrim(s.u_campanie), '') is null`;

function conditii(orgId: string, f: FiltreSurse, cuCategorie: string | null): SQL {
  const c: SQL[] = [sql`s.org_id = ${orgId}::uuid`, sql`d.org_id = ${orgId}::uuid`, sql`d.status = 'reusita'`];
  if (f.de) c.push(sql`d.created_at >= ((${f.de}::date)::timestamp at time zone 'Europe/Bucharest')`);
  if (f.pana) c.push(sql`d.created_at < (((${f.pana}::date + 1))::timestamp at time zone 'Europe/Bucharest')`);
  if (f.sursa) c.push(sql`s.u_categorie = ${f.sursa}`);
  if (cuCategorie) c.push(sql`s.u_categorie = ${cuCategorie}`);
  if (f.campanie.tip === "fara") c.push(FARA_CAMPANIE);
  else if (f.campanie.tip === "nume") c.push(sql`${CAMPANIE_NORMALIZATA} = lower(btrim(${f.campanie.nume}::text))`);
  return sql.join(c, sql` and `);
}

const DIN = sql`
  from donatie_surse s
  join fundraising_donations d on d.id = s.donation_id and d.org_id = s.org_id`;

export type OptiuneCampanie = { eticheta: string; donatii: number };
export type RandDonatie = {
  plataLa: string; // ISO 8601 (UTC)
  sumaEurCenti: number | null; // null = conversie indisponibilă
  campaniaPublica: string | null; // titlul paginii de campanie de pe care s-a donat
  categorie: string;
  campanieMarketing: string | null; // null = fără campanie
};
export type DetaliiSurse = { categorie: string; total: number; paginare: Paginare; randuri: RandDonatie[] };
export type RaportComplet = { raport: RaportSurse; campanii: OptiuneCampanie[]; detalii: DetaliiSurse | null };

type RandSql = { categorie: string; donatii: number; cu_conversie: number; total_centi: number };
type RandDonatieSql = { plata_la: string; suma_eur_centi: number | null; campania_publica: string | null; categorie: string; campanie: string | null };
type RandCampanieSql = { eticheta: string; donatii: number };

// Tabelul pe surse (aceleași filtre ca lista de detalii).
export async function incarcaTabel(dbx: Dbx, orgId: string, f: FiltreSurse): Promise<RaportSurse> {
  const rez = await dbx.execute<RandSql>(sql`
    select s.u_categorie as categorie,
      count(distinct s.donation_id)::int as donatii,
      count(s.suma_eur_centi)::int as cu_conversie,
      coalesce(sum(s.suma_eur_centi), 0)::float8 as total_centi
    ${DIN}
    where ${conditii(orgId, f, null)}
    group by s.u_categorie`);
  const randuri: RandAgregat[] = [...rez].map((r) => ({ categorie: r.categorie, donatii: Number(r.donatii), cuConversie: Number(r.cu_conversie), totalCenti: Number(r.total_centi) }));
  return calculeazaRaport(randuri, CATEGORII);
}

// Campaniile de marketing existente (donații plătite din organizație, indiferent de ceilalți filtri), grupate insensibil la litere/spații;
// eticheta este valoarea originală cea mai recentă.
export async function incarcaCampanii(dbx: Dbx, orgId: string): Promise<OptiuneCampanie[]> {
  const rez = await dbx.execute<RandCampanieSql>(sql`
    select (array_agg(btrim(s.u_campanie) order by d.created_at desc))[1] as eticheta, count(*)::int as donatii
    ${DIN}
    where s.org_id = ${orgId}::uuid and d.org_id = ${orgId}::uuid and d.status = 'reusita' and not (${FARA_CAMPANIE})
    group by ${CAMPANIE_NORMALIZATA}
    order by ${CAMPANIE_NORMALIZATA}
    limit 300`);
  return [...rez].map((r) => ({ eticheta: r.eticheta, donatii: Number(r.donatii) }));
}

// Donațiile care formează totalul unei surse (fără nume sau email de donator), cele mai recente primele, câte LIMITA_DETALII pe pagină.
export async function incarcaDonatii(dbx: Dbx, orgId: string, f: FiltreSurse, categorie: string, total: number): Promise<DetaliiSurse> {
  const pag = paginare(total, f.pagina, LIMITA_DETALII);
  const rez =
    total === 0
      ? []
      : [
          ...(await dbx.execute<RandDonatieSql>(sql`
    select to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as plata_la,
      s.suma_eur_centi,
      p.titlu as campania_publica,
      s.u_categorie as categorie,
      nullif(btrim(s.u_campanie), '') as campanie
    ${DIN}
    left join fundraising_pages p on p.id = d.page_id and p.org_id = s.org_id
    where ${conditii(orgId, f, categorie)}
    order by d.created_at desc, d.id desc
    limit ${pag.limita} offset ${pag.offset}`)),
        ];
  return {
    categorie,
    total,
    paginare: pag,
    randuri: rez.map((r) => ({
      plataLa: r.plata_la,
      sumaEurCenti: r.suma_eur_centi === null ? null : Number(r.suma_eur_centi),
      campaniaPublica: r.campania_publica,
      categorie: r.categorie,
      campanieMarketing: r.campanie,
    })),
  };
}

export async function incarcaRaportSurse(dbx: Dbx, orgId: string, f: FiltreSurse): Promise<RaportComplet> {
  const raport = await incarcaTabel(dbx, orgId, f);
  const campanii = await incarcaCampanii(dbx, orgId);
  // Totalul listei vine din același tabel (aceleași filtre), ca numărul de rânduri să fie egal cu cifra din tabel.
  const detalii = f.detalii ? await incarcaDonatii(dbx, orgId, f, f.detalii, raport.randuri.find((r) => r.categorie === f.detalii)?.donatii ?? 0) : null;
  return { raport, campanii, detalii };
}
