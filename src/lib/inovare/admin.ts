import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { anuntaAutorul } from "./server";
import { esteCategorie, esteEfort, esteStare, LIMITE, type Efort, type StareIdee } from "./model";

type Tx = typeof db;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  raspunsEchipa: string;
  ascunsa: boolean;
  voturi: number;
  organizatie: string;
  autor: string;
  email: string;
  afiseazaOrganizatia: boolean;
  creatLa: string;
  actualizatLa: string;
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
      raspuns_echipa: string | null;
      ascunsa: boolean;
      voturi: number;
      org_nume: string | null;
      autor_nume: string | null;
      email: string | null;
      afiseaza_organizatia: boolean;
      creat_la: string;
      actualizat_la: string;
    }>(sql`
      select p.id, p.titlu, p.descriere, p.cum_faci_acum, p.categorie, p.stare, p.efort, p.raspuns_echipa, p.ascunsa, p.org_nume, p.autor_nume, p.afiseaza_organizatia,
        p.creat_la::text, p.actualizat_la::text, u.email,
        (select count(*) from inovare_voturi v where v.propunere_id = p.id)::int as voturi
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
      raspunsEchipa: x.raspuns_echipa ?? "",
      ascunsa: x.ascunsa,
      voturi: x.voturi,
      organizatie: x.org_nume ?? "",
      autor: x.autor_nume ?? "",
      email: x.email ?? "",
      afiseazaOrganizatia: x.afiseaza_organizatia,
      creatLa: x.creat_la,
      actualizatLa: x.actualizat_la,
    }));
  });
}

export type ModificareIdee = { titlu?: string; descriere?: string; categorie?: string; stare?: string; efort?: string; raspunsEchipa?: string; ascunsa?: boolean; anunta?: boolean };

export async function actualizeaza(id: string, m: ModificareIdee): Promise<{ ok: boolean; eroare?: string }> {
  if (!UUID_RE.test(id)) return { ok: false, eroare: "Idee invalidă." };
  const titlu = m.titlu !== undefined ? m.titlu.replace(/\s+/g, " ").trim().slice(0, LIMITE.titluMax) : undefined;
  if (titlu !== undefined && titlu.length < LIMITE.titluMin) return { ok: false, eroare: "Titlul e prea scurt." };
  if (m.stare !== undefined && !esteStare(m.stare)) return { ok: false, eroare: "Stare invalidă." };
  if (m.categorie !== undefined && !esteCategorie(m.categorie)) return { ok: false, eroare: "Categorie invalidă." };
  if (m.efort !== undefined && m.efort !== "" && !esteEfort(m.efort)) return { ok: false, eroare: "Efort invalid." };
  const raspuns = m.raspunsEchipa !== undefined ? m.raspunsEchipa.trim().slice(0, LIMITE.raspunsMax) : undefined;
  let notificare: Parameters<typeof anuntaAutorul>[0] | null = null;
  const ok = await inContextPlatforma(async (tx) => {
    const [vechi] = await tx.execute<{ stare: StareIdee; titlu: string; email: string | null; autor_nume: string | null; raspuns_echipa: string | null }>(sql`
      select p.stare, p.titlu, p.autor_nume, p.raspuns_echipa, u.email from inovare_propuneri p left join app_users u on u.id = p.user_id where p.id = ${id}::uuid`);
    if (!vechi) return false;
    await tx.execute(sql`
      update inovare_propuneri set
        titlu = coalesce(${titlu ?? null}::text, titlu),
        descriere = coalesce(${m.descriere !== undefined ? m.descriere.trim().slice(0, LIMITE.descriereMax) : null}::text, descriere),
        categorie = coalesce(${m.categorie ?? null}::text, categorie),
        stare = coalesce(${m.stare ?? null}::text, stare),
        efort = case when ${m.efort === undefined}::boolean then efort else nullif(${m.efort ?? ""}::text, '') end,
        raspuns_echipa = case when ${raspuns === undefined}::boolean then raspuns_echipa else nullif(${raspuns ?? ""}::text, '') end,
        ascunsa = coalesce(${m.ascunsa ?? null}::boolean, ascunsa),
        finalizat_la = case when ${m.stare === "finalizat"}::boolean and finalizat_la is null then now() when ${m.stare !== undefined && m.stare !== "finalizat"}::boolean then null else finalizat_la end,
        actualizat_la = now()
      where id = ${id}::uuid`);
    if (m.stare && m.stare !== vechi.stare && vechi.email && m.anunta !== false && m.stare !== "propus") {
      notificare = { titlu: titlu ?? vechi.titlu, stare: m.stare as StareIdee, raspuns: raspuns ?? vechi.raspuns_echipa, email: vechi.email, prenume: vechi.autor_nume };
    }
    return true;
  });
  if (!ok) return { ok: false, eroare: "Ideea nu a fost găsită." };
  if (notificare) await anuntaAutorul(notificare);
  return { ok: true };
}

// O idee duplicat se unește cu cea principală: voturile ei trec la principală (o organizație votează o singură dată), iar duplicatul se ascunde.
export async function uneste(dublatId: string, inId: string): Promise<{ ok: boolean; eroare?: string }> {
  if (!UUID_RE.test(dublatId) || !UUID_RE.test(inId) || dublatId === inId) return { ok: false, eroare: "Alege două idei diferite." };
  return inContextPlatforma(async (tx) => {
    const g = await tx.execute<{ n: number }>(sql`select count(*)::int as n from inovare_propuneri where id in (${dublatId}::uuid, ${inId}::uuid)`);
    if ((g[0]?.n ?? 0) !== 2) return { ok: false, eroare: "Una dintre idei nu există." };
    await tx.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id) select ${inId}::uuid, org_id, user_id from inovare_voturi where propunere_id = ${dublatId}::uuid on conflict do nothing`);
    await tx.execute(sql`delete from inovare_voturi where propunere_id = ${dublatId}::uuid`);
    await tx.execute(sql`update inovare_propuneri set ascunsa = true, duplicat_din = ${inId}::uuid, actualizat_la = now() where id = ${dublatId}::uuid`);
    return { ok: true };
  });
}
