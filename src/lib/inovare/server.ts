import "server-only";

import { sql } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import type { OrgContext } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { layoutEmail, paragraf } from "@/lib/email-layout";
import { escHtml } from "@/lib/html-escape";
import { raporteazaEroare } from "@/lib/monitoring";

import { ETICHETE_STARE, LIMITE, type DatePropunere, type Efort, type StareIdee } from "./model";

type Dbx = typeof db;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/i;
const bazaSite = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
const DESTINATAR_IMPLICIT = "vlad.placinta@alexandrit.ro";

// Linkul din emailuri duce direct la idee, în Centrul de inovare al organizației; fără slug (rânduri vechi) duce la autentificare.
export function linkIdee(orgSlug: string | null | undefined, ideeId: string): string {
  return orgSlug && SLUG_RE.test(orgSlug) ? `${bazaSite()}/${orgSlug}/crm/inovare#${ideeId}` : `${bazaSite()}/login`;
}

export type IdeeVizibila = {
  id: string;
  titlu: string;
  descriere: string;
  cumFaciAcum: string | null;
  categorie: string;
  stare: StareIdee;
  efort: Efort | null;
  obiectiv: string | null;
  frecventa: string | null;
  raspunsEchipa: string | null;
  reevaluareLa: string | null;
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
    obiectiv: string | null;
    frecventa: string | null;
    raspuns_echipa: string | null;
    reevaluare_la: string | null;
    de_mine: boolean;
    autor: string | null;
    creat_la: string;
    actualizat_la: string;
    finalizat_la: string | null;
    voturi: number;
    votat: boolean;
  }>(sql`
    select p.id, p.titlu, p.descriere, p.cum_faci_acum, p.categorie, p.stare, p.efort, p.obiectiv, p.frecventa, p.raspuns_echipa, p.reevaluare_la::text,
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
    obiectiv: x.obiectiv,
    frecventa: x.frecventa,
    raspunsEchipa: x.raspuns_echipa,
    reevaluareLa: x.reevaluare_la,
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
    insert into inovare_propuneri (org_id, user_id, autor_nume, org_nume, organizatie_slug, afiseaza_organizatia, titlu, descriere, cum_faci_acum, categorie, obiectiv, frecventa)
    values (${ctx.orgId}::uuid, ${ctx.userId}::uuid, ${prenume}, ${ctx.orgName}, ${ctx.orgSlug}, ${d.afiseazaOrganizatia}, ${d.titlu}, ${d.descriere}, ${d.cumFaciAcum || null}, ${d.categorie}, ${d.obiectiv}, ${d.frecventa})
    returning id`);
  const id = rez[0]?.id;
  if (!id) return { ok: false, eroare: "Nu am putut salva ideea. Încearcă din nou." };
  // Primul vot e al organizației care a propus ideea.
  await ctx.db.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id, organizatie_slug) values (${id}::uuid, ${ctx.orgId}::uuid, ${ctx.userId}::uuid, ${ctx.orgSlug}) on conflict do nothing`);
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
  if (vot) await ctx.db.execute(sql`insert into inovare_voturi (propunere_id, org_id, user_id, organizatie_slug) values (${id}::uuid, ${ctx.orgId}::uuid, ${ctx.userId}::uuid, ${ctx.orgSlug}) on conflict do nothing`);
  else await ctx.db.execute(sql`delete from inovare_voturi where propunere_id = ${id}::uuid and org_id = ${ctx.orgId}::uuid`);
  const [n] = await ctx.db.execute<{ n: number }>(sql`select count(*)::int as n from inovare_voturi where propunere_id = ${id}::uuid`);
  return { ok: true, voturi: n?.n ?? 0 };
}

// Raportare: o organizație semnalează o idee a altei organizații (date personale, defăimare, conținut inadecvat). Ideea se ascunde imediat din listă,
// iar echipa o analizează și o poate restabili din Panou platformă. O organizație nu își poate raporta propriile idei.
export async function raporteaza(ctx: OrgContext, id: string, motiv: string): Promise<{ ok: boolean; eroare?: string }> {
  if (!UUID_RE.test(id)) return { ok: false, eroare: "Idee invalidă." };
  if (!(await verificaLimitaRata("inovare-raportare", ctx.userId, 10, 24 * 60))) return { ok: false, eroare: "Ai trimis deja mai multe raportări azi. Scrie-ne direct dacă e urgent." };
  const motivCurat = motiv.replace(/\s+/g, " ").trim().slice(0, LIMITE.motivRaportareMax);
  await ctx.db.execute(sql`select set_config('app.inovare_citire', 'true', true)`);
  const [idee] = await ctx.db.execute<{ titlu: string; de_mine: boolean; stare: string }>(sql`
    select titlu, (org_id = ${ctx.orgId}::uuid) as de_mine, stare from inovare_propuneri where id = ${id}::uuid and not ascunsa`);
  if (!idee) return { ok: false, eroare: "Ideea nu mai există." };
  if (idee.de_mine) return { ok: false, eroare: "Nu îți poți raporta propria idee. Dacă vrei să o retragi, scrie-ne." };
  await ctx.db.execute(sql`insert into inovare_raportari (propunere_id, org_id, user_id, motiv) values (${id}::uuid, ${ctx.orgId}::uuid, ${ctx.userId}::uuid, ${motivCurat || null}) on conflict do nothing`);
  // Ascunderea e o acțiune a platformei, nu a organizației: se face în afara sesiunii ei, după ce raportarea a fost înregistrată.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`update inovare_propuneri set ascunsa = true, motiv_ascundere = 'raportata', actualizat_la = now() where id = ${id}::uuid and not ascunsa`);
  });
  await anuntaRaportare(id, idee.titlu, ctx.orgName, motivCurat);
  return { ok: true };
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
          paragraf("Termen intern de răspuns: 5 zile lucrătoare."),
        ].join(""),
        buton: { text: "Deschide în Panou platformă", url: `${bazaSite()}/platform-admin/inovare#${id}` },
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-echipa", e);
  }
}

async function anuntaRaportare(id: string, titlu: string, org: string, motiv: string): Promise<void> {
  if (!emailConfigurat()) return;
  try {
    await trimiteEmail({
      to: process.env.INTERES_EMAIL_TO?.trim() || DESTINATAR_IMPLICIT,
      subiect: `Idee raportată în Centrul de inovare: ${titlu}`,
      html: layoutEmail({
        titlu: "O idee a fost raportată și ascunsă",
        corpHtml: [paragraf(`<strong>${escHtml(titlu)}</strong>`), paragraf(`Raportată de: ${escHtml(org)}`), paragraf(motiv ? `Motiv: ${escHtml(motiv)}` : "Fără motiv scris."), paragraf("Ideea e ascunsă până o analizezi. Termen intern: 48 de ore.")].join(""),
        buton: { text: "Analizează în Panou platformă", url: `${bazaSite()}/platform-admin/inovare#${id}` },
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-raportare", e);
  }
}

const MESAJE_AUTOR: Record<StareIdee, string> = {
  propus: "Ideea ta a fost primită.",
  vazuta: "Am citit ideea ta și o analizăm. Dacă avem nevoie de detalii, te contactăm.",
  in_planificare: "Am decis să facem ideea ta și o programăm.",
  in_dezvoltare: "Lucrăm acum la ideea ta.",
  finalizat: "Ideea ta e gata: o poți folosi în platformă.",
  nu_acum: "Nu putem face ideea ta în perioada următoare, dar o păstrăm în listă.",
};

// Cine a propus ideea află când se schimbă starea ei, cu răspunsul echipei și un link direct la idee.
export async function anuntaAutorul(p: { id: string; titlu: string; stare: StareIdee; raspuns: string | null; email: string; prenume: string | null; orgSlug: string | null; reevaluareLa: string | null }): Promise<void> {
  if (!emailConfigurat()) return;
  try {
    await trimiteEmail({
      to: p.email,
      subiect: `Ideea ta „${p.titlu}”: ${ETICHETE_STARE[p.stare].toLowerCase()}`,
      html: layoutEmail({
        titlu: ETICHETE_STARE[p.stare],
        corpHtml: [
          paragraf(`Bună${p.prenume ? `, ${escHtml(p.prenume)}` : ""}!`),
          paragraf(`<strong>${escHtml(p.titlu)}</strong>`),
          paragraf(escHtml(MESAJE_AUTOR[p.stare])),
          ...(p.raspuns ? [paragraf(`<strong>Răspunsul echipei:</strong><br>${escHtml(p.raspuns).replace(/\n/g, "<br>")}`)] : []),
          ...(p.stare === "nu_acum" && p.reevaluareLa ? [paragraf(`Ne uităm din nou la ea după ${escHtml(dataRo(p.reevaluareLa))}.`)] : []),
        ].join(""),
        buton: { text: "Vezi ideea în Centrul de inovare", url: linkIdee(p.orgSlug, p.id) },
        nota: "Primești acest email pentru că ai propus ideea în Centrul de inovare Alexandrit.",
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-autor", e);
  }
}

// Organizațiile care au votat o idee află, 1 la 1, când intră în lucru sau e gata. E un mesaj tranzacțional despre un vot dat de ele, nu un newsletter.
export async function anuntaVotantii(p: { id: string; titlu: string; stare: "in_dezvoltare" | "finalizat"; destinatari: { email: string; orgSlug: string | null }[] }): Promise<number> {
  if (!emailConfigurat()) return 0;
  let trimise = 0;
  const mesaj = p.stare === "finalizat" ? "Ideea pe care ai votat-o e gata: ai cerut, am făcut. O poți folosi acum în platformă." : "Lucrăm acum la o idee pe care ai votat-o.";
  for (const d of p.destinatari.slice(0, 300)) {
    try {
      await trimiteEmail({
        to: d.email,
        subiect: p.stare === "finalizat" ? `Ai cerut, am făcut: ${p.titlu}` : `Lucrăm la o idee votată de tine: ${p.titlu}`,
        html: layoutEmail({
          titlu: p.stare === "finalizat" ? "Ai cerut, am făcut" : "În dezvoltare",
          corpHtml: [paragraf(`<strong>${escHtml(p.titlu)}</strong>`), paragraf(escHtml(mesaj))].join(""),
          buton: { text: p.stare === "finalizat" ? "Vezi ce s-a schimbat" : "Vezi ideea", url: linkIdee(d.orgSlug, p.id) },
          nota: "Primești acest email pentru că organizația ta a votat această idee în Centrul de inovare Alexandrit. Îți scriem doar când se schimbă starea ideilor votate.",
        }),
      });
      trimise++;
    } catch (e) {
      raporteazaEroare("inovare-email-votant", e);
    }
  }
  return trimise;
}

const dataRo = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));

// Autorul unei idei unite cu alta află unde o poate urmări; voturile ei s-au adunat la ideea principală.
export async function anuntaUnirea(p: { email: string; prenume: string | null; titluDublat: string; principalId: string; titluPrincipal: string; orgSlug: string | null }): Promise<void> {
  if (!emailConfigurat()) return;
  try {
    await trimiteEmail({
      to: p.email,
      subiect: `Ideea ta „${p.titluDublat}” s-a unit cu o idee asemănătoare`,
      html: layoutEmail({
        titlu: "Ideea ta s-a unit cu alta",
        corpHtml: [
          paragraf(`Bună${p.prenume ? `, ${escHtml(p.prenume)}` : ""}!`),
          paragraf(`Altă organizație propusese deja o idee asemănătoare cu a ta: <strong>${escHtml(p.titluPrincipal)}</strong>. Le-am unit, iar votul organizației tale s-a adunat la ideea principală.`),
          paragraf("De acum urmărești ideea principală: ea primește starea și răspunsul echipei."),
        ].join(""),
        buton: { text: "Vezi ideea principală", url: linkIdee(p.orgSlug, p.principalId) },
        nota: "Primești acest email pentru că ai propus o idee în Centrul de inovare Alexandrit.",
      }),
    });
  } catch (e) {
    raporteazaEroare("inovare-email-unire", e);
  }
}
