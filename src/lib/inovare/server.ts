import "server-only";

import { sql } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import type { OrgContext } from "@/lib/auth/guard";
import type { db } from "@/lib/db";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { layoutEmail, paragraf } from "@/lib/email-layout";
import { escHtml } from "@/lib/html-escape";
import { raporteazaEroare } from "@/lib/monitoring";

import { ETICHETE_STARE, type DatePropunere, type Efort, type StareIdee } from "./model";

type Dbx = typeof db;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bazaSite = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
const DESTINATAR_IMPLICIT = "vlad.placinta@alexandrit.ro";

export type IdeeVizibila = {
  id: string;
  titlu: string;
  descriere: string;
  cumFaciAcum: string | null;
  categorie: string;
  stare: StareIdee;
  efort: Efort | null;
  raspunsEchipa: string | null;
  voturi: number;
  votatDeMine: boolean;
  deMine: boolean;
  autor: string | null; // numele organizației, doar dacă a acceptat să fie afișat
  creatLa: string;
  actualizatLa: string;
  finalizatLa: string | null;
};

// Ideile vizibile pentru o organizație: toate cele neascunse, cu voturile numărate (fără să se știe cine a votat) și dacă organizația ei a votat.
// Rulează în sesiunea organizației (ctx.db): app.inovare_citire se setează aici, după ce accesul a fost verificat.
export async function incarcaIdei(dbx: Dbx, orgId: string): Promise<IdeeVizibila[]> {
  await dbx.execute(sql`select set_config('app.inovare_citire', 'true', true)`);
  const r = await dbx.execute<{
    id: string;
    titlu: string;
    descriere: string;
    cum_faci_acum: string | null;
    categorie: string;
    stare: StareIdee;
    efort: Efort | null;
    raspuns_echipa: string | null;
    de_mine: boolean;
    autor: string | null;
    creat_la: string;
    actualizat_la: string;
    finalizat_la: string | null;
    voturi: number;
    votat: boolean;
  }>(sql`
    select p.id, p.titlu, p.descriere, p.cum_faci_acum, p.categorie, p.stare, p.efort, p.raspuns_echipa,
      (p.org_id = ${orgId}::uuid) as de_mine,
      case when p.afiseaza_organizatia then p.org_nume end as autor,
      p.creat_la::text, p.actualizat_la::text, p.finalizat_la::text,
      (select count(*) from inovare_voturi v where v.propunere_id = p.id)::int as voturi,
      exists (select 1 from inovare_voturi v where v.propunere_id = p.id and v.org_id = ${orgId}::uuid) as votat
    from inovare_propuneri p
    where not p.ascunsa
    order by p.creat_la desc
    limit 500`);
  return [...r].map((x) => ({
    id: x.id,
    titlu: x.titlu,
    descriere: x.descriere,
    cumFaciAcum: x.cum_faci_acum,
    categorie: x.categorie,
    stare: x.stare,
    efort: x.efort,
    raspunsEchipa: x.raspuns_echipa,
    voturi: x.voturi,
    votatDeMine: x.votat,
    deMine: x.de_mine,
    autor: x.autor,
    creatLa: x.creat_la,
    actualizatLa: x.actualizat_la,
    finalizatLa: x.finalizat_la,
  }));
}

export type RezultatPropunere = { ok: true; id: string } | { ok: false; eroare: string };

export async function propune(ctx: OrgContext, d: DatePropunere): Promise<RezultatPropunere> {
  // Cel mult 5 idei pe zi de la un utilizator și 40 pe zi pe platformă: ideile se citesc de oameni, nu se umple lista.
  const okUser = await verificaLimitaRata("inovare-propunere-user", ctx.userId, 5, 24 * 60);
  const okGlobal = await verificaLimitaRata("inovare-propunere-global", "toate", 40, 24 * 60);
  if (!okUser || !okGlobal) return { ok: false, eroare: "Ai trimis deja mai multe idei azi. Revino mâine sau scrie-ne direct." };
  await ctx.db.execute(sql`select set_config('app.inovare_citire', 'true', true)`);
  const prenume = (ctx.userName ?? "").trim().split(/\s+/)[0] || null;
  const rez = await ctx.db.execute<{ id: string }>(sql`
    insert into inovare_propuneri (org_id, user_id, autor_nume, org_nume, afiseaza_organizatia, titlu, descriere, cum_faci_acum, categorie)
    values (${ctx.orgId}::uuid, ${ctx.userId}::uuid, ${prenume}, ${ctx.orgName}, ${d.afiseazaOrganizatia}, ${d.titlu}, ${d.descriere}, ${d.cumFaciAcum || null}, ${d.categorie})
    returning id`);
  const id = rez[0]?.id;
  if (!id) return { ok: false, eroare: "Nu am putut salva ideea. Încearcă din nou." };
  // Primul vot e al organizației care a propus ideea.
  await ctx.db.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id) values (${id}::uuid, ${ctx.orgId}::uuid, ${ctx.userId}::uuid) on conflict do nothing`);
  await anuntaEchipa(id, ctx.orgName, prenume, d);
  return { ok: true, id };
}

export async function voteaza(ctx: OrgContext, id: string, vot: boolean): Promise<{ ok: boolean; voturi?: number; eroare?: string }> {
  if (!UUID_RE.test(id)) return { ok: false, eroare: "Idee invalidă." };
  if (!(await verificaLimitaRata("inovare-vot", ctx.userId, 120, 60))) return { ok: false, eroare: "Prea multe voturi într-un timp scurt. Încearcă peste puțin." };
  await ctx.db.execute(sql`select set_config('app.inovare_citire', 'true', true)`);
  const [idee] = await ctx.db.execute<{ stare: string }>(sql`select stare from inovare_propuneri where id = ${id}::uuid and not ascunsa`);
  if (!idee) return { ok: false, eroare: "Ideea nu mai există." };
  if (idee.stare === "finalizat") return { ok: false, eroare: "Ideea e deja finalizată; nu se mai votează." };
  if (vot) await ctx.db.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id) values (${id}::uuid, ${ctx.orgId}::uuid, ${ctx.userId}::uuid) on conflict do nothing`);
  else await ctx.db.execute(sql`delete from inovare_voturi where propunere_id = ${id}::uuid and org_id = ${ctx.orgId}::uuid`);
  const [n] = await ctx.db.execute<{ n: number }>(sql`select count(*)::int as n from inovare_voturi where propunere_id = ${id}::uuid`);
  return { ok: true, voturi: n?.n ?? 0 };
}

// ---------- emailuri ----------

async function anuntaEchipa(id: string, org: string, prenume: string | null, d: DatePropunere): Promise<void> {
  if (!emailConfigurat()) return;
  try {
    const rand = (e: string, v: string) => paragraf(`<strong>${escHtml(e)}:</strong> ${v}`);
    await trimiteEmail({
      to: process.env.INTERES_EMAIL_TO?.trim() || DESTINATAR_IMPLICIT,
      subiect: `Idee nouă în Centrul de inovare: ${d.titlu}`,
      html: layoutEmail({
        titlu: "Idee nouă de la un ONG",
        corpHtml: [
          rand("Titlu", escHtml(d.titlu)),
          rand("De la", `${escHtml(org)}${prenume ? ` (${escHtml(prenume)})` : ""}`),
          rand("Categorie", escHtml(d.categorie)),
          rand("Ce problemă rezolvă", escHtml(d.descriere).replace(/\n/g, "<br>")),
          ...(d.cumFaciAcum ? [rand("Cum fac acum", escHtml(d.cumFaciAcum).replace(/\n/g, "<br>"))] : []),
        ].join(""),
        buton: { text: "Deschide în Panou platformă", url: `${bazaSite()}/platform-admin/inovare#${id}` },
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-echipa", e);
  }
}

// Cine a propus ideea află când se schimbă starea ei (planificată, în lucru, gata sau amânată), cu răspunsul echipei.
export async function anuntaAutorul(p: { titlu: string; stare: StareIdee; raspuns: string | null; email: string; prenume: string | null }): Promise<void> {
  if (!emailConfigurat()) return;
  try {
    const mesaje: Record<StareIdee, string> = {
      propus: "Ideea ta a fost primită.",
      in_planificare: "Am decis să facem ideea ta și o programăm.",
      in_dezvoltare: "Lucrăm acum la ideea ta.",
      finalizat: "Ideea ta e gata: o poți folosi în platformă.",
      nu_acum: "Nu putem face ideea ta în perioada următoare, dar o păstrăm în listă.",
    };
    await trimiteEmail({
      to: p.email,
      subiect: `Ideea ta „${p.titlu}”: ${ETICHETE_STARE[p.stare].toLowerCase()}`,
      html: layoutEmail({
        titlu: ETICHETE_STARE[p.stare],
        corpHtml: [paragraf(`Bună${p.prenume ? `, ${escHtml(p.prenume)}` : ""}!`), paragraf(`<strong>${escHtml(p.titlu)}</strong>`), paragraf(escHtml(mesaje[p.stare])), ...(p.raspuns ? [paragraf(`<strong>Răspunsul echipei:</strong><br>${escHtml(p.raspuns).replace(/\n/g, "<br>")}`)] : [])].join(""),
        buton: { text: "Vezi în Centrul de inovare", url: `${bazaSite()}/login` },
        nota: "Primești acest email pentru că ai propus ideea în Centrul de inovare Alexandrit.",
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-autor", e);
  }
}
