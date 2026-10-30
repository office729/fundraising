import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { anuntaAutorul, anuntaUnirea, anuntaVotantii } from "./server";
import { esteCategorie, esteEfort, esteStare, LIMITE, scorPrioritate, type Efort, type StareIdee } from "./model";

type Tx = typeof db;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Echipa platformei vede toate ideile (și cele ascunse), cu cine le-a propus; citește și adresa de email a autorului (app.public_lookup pentru app_users).
async function inContextPlatforma<T>(f: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return f(tx as unknown as Tx);
  });
}

export type IdeeAdmin = {
  id: string;
  titlu: string;
  descriere: string;
  cumFaciAcum: string;
  categorie: string;
  stare: StareIdee;
  efort: Efort | "";
  obiectiv: string;
  frecventa: string;
  raspunsEchipa: string;
  reevaluareLa: string;
  ascunsa: boolean;
  motivAscundere: string;
  raportari: { organizatie: string; motiv: string }[];
  voturi: number;
  scor: number;
  organizatie: string;
  autor: string;
  email: string;
  afiseazaOrganizatia: boolean;
  creatLa: string;
  actualizatLa: string;
  primulRaspunsLa: string | null;
  finalizatLa: string | null;
};

export async function listeazaAdmin(): Promise<IdeeAdmin[]> {
  return inContextPlatforma(async (tx) => {
    const r = await tx.execute<{
      id: string;
      titlu: string;
      descriere: string;
      cum_faci_acum: string | null;
      categorie: string;
      stare: StareIdee;
      efort: Efort | null;
      obiectiv: string | null;
      frecventa: string | null;
      raspuns_echipa: string | null;
      reevaluare_la: string | null;
      ascunsa: boolean;
      motiv_ascundere: string | null;
      voturi: number;
      org_nume: string | null;
      autor_nume: string | null;
      email: string | null;
      afiseaza_organizatia: boolean;
      creat_la: string;
      actualizat_la: string;
      primul_raspuns_la: string | null;
      finalizat_la: string | null;
      raportari: { organizatie: string; motiv: string }[] | null;
    }>(sql`
      select p.id, p.titlu, p.descriere, p.cum_faci_acum, p.categorie, p.stare, p.efort, p.obiectiv, p.frecventa, p.raspuns_echipa, p.reevaluare_la::text,
        p.ascunsa, p.motiv_ascundere, p.org_nume, p.autor_nume, p.afiseaza_organizatia,
        p.creat_la::text, p.actualizat_la::text, p.primul_raspuns_la::text, p.finalizat_la::text, u.email,
        (select count(*) from inovare_voturi v where v.propunere_id = p.id)::int as voturi,
        (select coalesce(json_agg(json_build_object('organizatie', coalesce(o.name, 'organizație ștearsă'), 'motiv', coalesce(r.motiv, ''))), '[]'::json)
           from inovare_raportari r left join organizations o on o.id = r.org_id where r.propunere_id = p.id) as raportari
      from inovare_propuneri p left join app_users u on u.id = p.user_id
      order by p.creat_la desc limit 500`);
    return [...r].map((x) => ({
      id: x.id,
      titlu: x.titlu,
      descriere: x.descriere,
      cumFaciAcum: x.cum_faci_acum ?? "",
      categorie: x.categorie,
      stare: x.stare,
      efort: x.efort ?? "",
      obiectiv: x.obiectiv ?? "",
      frecventa: x.frecventa ?? "",
      raspunsEchipa: x.raspuns_echipa ?? "",
      reevaluareLa: x.reevaluare_la ?? "",
      ascunsa: x.ascunsa,
      motivAscundere: x.motiv_ascundere ?? "",
      raportari: x.raportari ?? [],
      voturi: x.voturi,
      scor: scorPrioritate({ voturi: x.voturi, obiectiv: x.obiectiv, efort: x.efort }),
      organizatie: x.org_nume ?? "",
      autor: x.autor_nume ?? "",
      email: x.email ?? "",
      afiseazaOrganizatia: x.afiseaza_organizatia,
      creatLa: x.creat_la,
      actualizatLa: x.actualizat_la,
      primulRaspunsLa: x.primul_raspuns_la,
      finalizatLa: x.finalizat_la,
    }));
  });
}

export type ModificareIdee = { titlu?: string; descriere?: string; categorie?: string; stare?: string; efort?: string; raspunsEchipa?: string; reevaluareLa?: string; ascunsa?: boolean; anunta?: boolean };

export async function actualizeaza(id: string, m: ModificareIdee): Promise<{ ok: boolean; eroare?: string; anuntati?: number }> {
  if (!UUID_RE.test(id)) return { ok: false, eroare: "Idee invalidă." };
  const titlu = m.titlu !== undefined ? m.titlu.replace(/\s+/g, " ").trim().slice(0, LIMITE.titluMax) : undefined;
  if (titlu !== undefined && titlu.length < LIMITE.titluMin) return { ok: false, eroare: "Titlul e prea scurt." };
  if (m.stare !== undefined && !esteStare(m.stare)) return { ok: false, eroare: "Stare invalidă." };
  if (m.categorie !== undefined && !esteCategorie(m.categorie)) return { ok: false, eroare: "Categorie invalidă." };
  if (m.efort !== undefined && m.efort !== "" && !esteEfort(m.efort)) return { ok: false, eroare: "Efort invalid." };
  if (m.reevaluareLa !== undefined && m.reevaluareLa !== "" && !DATA_RE.test(m.reevaluareLa)) return { ok: false, eroare: "Data de reevaluare nu e validă." };
  const raspuns = m.raspunsEchipa !== undefined ? m.raspunsEchipa.trim().slice(0, LIMITE.raspunsMax) : undefined;

  let notificare: Parameters<typeof anuntaAutorul>[0] | null = null;
  let votanti: Parameters<typeof anuntaVotantii>[0] | null = null;
  const rez = await inContextPlatforma(async (tx) => {
    const [vechi] = await tx.execute<{ stare: StareIdee; titlu: string; email: string | null; autor_nume: string | null; raspuns_echipa: string | null; ascunsa: boolean; organizatie_slug: string | null; primul_raspuns_la: string | null; reevaluare_la: string | null }>(sql`
      select p.stare, p.titlu, p.autor_nume, p.raspuns_echipa, p.ascunsa, p.organizatie_slug, p.primul_raspuns_la::text, p.reevaluare_la::text, u.email
      from inovare_propuneri p left join app_users u on u.id = p.user_id where p.id = ${id}::uuid`);
    if (!vechi) return { ok: false as const, eroare: "Ideea nu a fost găsită." };

    const stareNoua = (m.stare as StareIdee | undefined) ?? vechi.stare;
    const raspunsFinal = raspuns !== undefined ? raspuns : (vechi.raspuns_echipa ?? "");
    // „Nu acum” fără explicație lasă ONG-ul fără răspuns: motivul e obligatoriu.
    if (stareNoua === "nu_acum" && raspunsFinal.length < 10) return { ok: false as const, eroare: "La „Nu acum” scrie motivul în răspunsul echipei (cel puțin 10 caractere)." };
    const schimbaStarea = stareNoua !== vechi.stare;
    const dataReevaluare = m.reevaluareLa !== undefined ? m.reevaluareLa : (vechi.reevaluare_la ?? "");
    const seAscunde = m.ascunsa === true && !vechi.ascunsa;
    const seRestabileste = m.ascunsa === false && vechi.ascunsa;

    await tx.execute(sql`
      update inovare_propuneri set
        titlu = coalesce(${titlu ?? null}::text, titlu),
        descriere = coalesce(${m.descriere !== undefined ? m.descriere.trim().slice(0, LIMITE.descriereMax) : null}::text, descriere),
        categorie = coalesce(${m.categorie ?? null}::text, categorie),
        stare = ${stareNoua},
        efort = case when ${m.efort === undefined}::boolean then efort else nullif(${m.efort ?? ""}::text, '') end,
        raspuns_echipa = case when ${raspuns === undefined}::boolean then raspuns_echipa else nullif(${raspuns ?? ""}::text, '') end,
        reevaluare_la = case when ${stareNoua === "nu_acum"}::boolean then nullif(${dataReevaluare}::text, '')::date else null end,
        ascunsa = coalesce(${m.ascunsa ?? null}::boolean, ascunsa),
        motiv_ascundere = case when ${seAscunde}::boolean then coalesce(motiv_ascundere, 'echipa') when ${seRestabileste}::boolean then null else motiv_ascundere end,
        primul_raspuns_la = case when primul_raspuns_la is null and (${stareNoua !== "propus"}::boolean or ${raspunsFinal.length > 0}::boolean) then now() else primul_raspuns_la end,
        finalizat_la = case when ${stareNoua === "finalizat"}::boolean and finalizat_la is null then now() when ${stareNoua !== "finalizat"}::boolean then null else finalizat_la end,
        actualizat_la = now()
      where id = ${id}::uuid`);
    // Odată restabilită, raportările rămân în istoric, dar nu mai țin ideea ascunsă.
    if (seRestabileste) await tx.execute(sql`delete from inovare_raportari where propunere_id = ${id}::uuid`);
    if (schimbaStarea) await tx.execute(sql`insert into inovare_evenimente (propunere_id, stare_veche, stare_noua) values (${id}::uuid, ${vechi.stare}, ${stareNoua})`);

    const anunta = schimbaStarea && m.anunta !== false && stareNoua !== "propus";
    if (anunta && vechi.email) {
      notificare = { id, titlu: titlu ?? vechi.titlu, stare: stareNoua, raspuns: raspunsFinal || null, email: vechi.email, prenume: vechi.autor_nume, orgSlug: vechi.organizatie_slug, reevaluareLa: stareNoua === "nu_acum" ? dataReevaluare || null : null };
    }
    // Organizațiile care au votat află, 1 la 1, când ideea intră în lucru sau e gata (fără autor, care are emailul lui).
    if (anunta && (stareNoua === "in_dezvoltare" || stareNoua === "finalizat")) {
      const v = await tx.execute<{ email: string; slug: string | null }>(sql`
        select distinct on (lower(u.email)) u.email, v.organizatie_slug as slug
        from inovare_voturi v join app_users u on u.id = v.user_id
        where v.propunere_id = ${id}::uuid and u.email is not null and lower(u.email) <> lower(${vechi.email ?? ""})
        order by lower(u.email)`);
      votanti = { id, titlu: titlu ?? vechi.titlu, stare: stareNoua, destinatari: [...v].map((x) => ({ email: x.email, orgSlug: x.slug })) };
    }
    return { ok: true as const };
  });
  if (!rez.ok) return rez;
  if (notificare) await anuntaAutorul(notificare);
  let anuntati = 0;
  if (votanti) anuntati = await anuntaVotantii(votanti);
  return { ok: true, anuntati };
}

// O idee duplicat se unește cu cea principală: voturile ei trec la principală (o organizație votează o singură dată), iar duplicatul se ascunde.
// Autorul duplicatului află că ideea lui s-a unit cu alta și unde o poate urmări.
export async function uneste(dublatId: string, inId: string): Promise<{ ok: boolean; eroare?: string }> {
  if (!UUID_RE.test(dublatId) || !UUID_RE.test(inId) || dublatId === inId) return { ok: false, eroare: "Alege două idei diferite." };
  let anunt: Parameters<typeof anuntaUnirea>[0] | null = null;
  const rez = await inContextPlatforma(async (tx) => {
    const g = await tx.execute<{ id: string; titlu: string; email: string | null; autor_nume: string | null; organizatie_slug: string | null }>(sql`
      select p.id, p.titlu, p.autor_nume, p.organizatie_slug, u.email from inovare_propuneri p left join app_users u on u.id = p.user_id
      where p.id in (${dublatId}::uuid, ${inId}::uuid)`);
    const dublat = [...g].find((x) => x.id === dublatId);
    const principal = [...g].find((x) => x.id === inId);
    if (!dublat || !principal) return { ok: false as const, eroare: "Una dintre idei nu există." };
    await tx.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id, organizatie_slug) select ${inId}::uuid, org_id, user_id, organizatie_slug from inovare_voturi where propunere_id = ${dublatId}::uuid on conflict do nothing`);
    await tx.execute(sql`delete from inovare_voturi where propunere_id = ${dublatId}::uuid`);
    await tx.execute(sql`update inovare_propuneri set ascunsa = true, motiv_ascundere = 'unita', duplicat_din = ${inId}::uuid, actualizat_la = now() where id = ${dublatId}::uuid`);
    if (dublat.email) anunt = { email: dublat.email, prenume: dublat.autor_nume, titluDublat: dublat.titlu, principalId: principal.id, titluPrincipal: principal.titlu, orgSlug: dublat.organizatie_slug };
    return { ok: true as const };
  });
  if (!rez.ok) return rez;
  if (anunt) await anuntaUnirea(anunt);
  return { ok: true };
}
