import { and, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { multumiriRestante } from "@/lib/documente-istoric";

import type { OrgContext } from "@/lib/auth/guard";
import { activitati, angajati, blocaje, companies, companySponsorizari, crmKv, performantaNotificari } from "@/lib/db/schema";
import { STATUSURI_DESCHISE } from "@/lib/performanta-activitati-reguli";
import { incarcaObiective } from "@/lib/performanta-date";
import { aziRo, luniSaptamanii } from "@/lib/performanta-masurare";

// Automatizări pentru Echipă & Performanță. Reguli explicite, fiecare pornită sau oprită de organizație, care fac două lucruri: trimit
// notificări în aplicație (grupate și fără repetări) și creează sarcini din evenimente reale (o donație confirmată, o sponsorizare înregistrată).
// Nimic nu se trimite pe email și nimic nu e decis de un model: fiecare mesaj arată ce l-a declanșat. Valorile KPI din CRM nu au nevoie de job:
// rezultatele-cheie legate de CRM se calculează la fiecare citire din datele validate.
//
// Anti-spam: fiecare notificare are o cheie unică per destinatar (`cheie_dedup`), deci aceeași informație nu se trimite de două ori; termenele
// se anunță o dată înainte și o dată după; actualizările lipsă cel mult o dată pe săptămână; rularea se face doar în zile lucrătoare.

type Db = OrgContext["db"];
export type SetariAutomatizari = {
  termene: boolean;
  blocaje: boolean;
  actualizari: boolean;
  rezumat: boolean;
  riscManager: boolean;
  multumire: boolean;
  raportSponsor: boolean;
  ziRezumat: number; // 1 = luni … 5 = vineri
  pragMultumire: number; // lei
  responsabilMultumireId: string | null;
  responsabilRaportId: string | null;
  ultimaRulare: { la: string; rezumat: RezultatRulare } | null;
};
export type RezultatRulare = { termene: number; blocaje: number; actualizari: number; rezumat: number; risc: number; multumiri: number; rapoarte: number };

export const SETARI_IMPLICITE: SetariAutomatizari = {
  termene: true,
  blocaje: true,
  actualizari: true,
  rezumat: true,
  riscManager: true,
  multumire: false,
  raportSponsor: false,
  ziRezumat: 1,
  pragMultumire: 100,
  responsabilMultumireId: null,
  responsabilRaportId: null,
  ultimaRulare: null,
};

const CALE = "performanta/setari";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function incarcaSetari(db: Db, orgId: string): Promise<SetariAutomatizari> {
  const [r] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, CALE))).limit(1);
  return curataSetari((r?.data ?? {}) as Partial<SetariAutomatizari>);
}

export function curataSetari(x: Partial<SetariAutomatizari>): SetariAutomatizari {
  const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const D = SETARI_IMPLICITE;
  const zi = Number(x.ziRezumat);
  const prag = Number(x.pragMultumire);
  return {
    termene: b(x.termene, D.termene),
    blocaje: b(x.blocaje, D.blocaje),
    actualizari: b(x.actualizari, D.actualizari),
    rezumat: b(x.rezumat, D.rezumat),
    riscManager: b(x.riscManager, D.riscManager),
    multumire: b(x.multumire, D.multumire),
    raportSponsor: b(x.raportSponsor, D.raportSponsor),
    ziRezumat: Number.isInteger(zi) && zi >= 1 && zi <= 5 ? zi : D.ziRezumat,
    pragMultumire: Number.isFinite(prag) && prag >= 1 && prag <= 1_000_000 ? Math.round(prag) : D.pragMultumire,
    responsabilMultumireId: typeof x.responsabilMultumireId === "string" && UUID.test(x.responsabilMultumireId) ? x.responsabilMultumireId : null,
    responsabilRaportId: typeof x.responsabilRaportId === "string" && UUID.test(x.responsabilRaportId) ? x.responsabilRaportId : null,
    ultimaRulare: x.ultimaRulare && typeof x.ultimaRulare.la === "string" ? x.ultimaRulare : null,
  };
}

async function scrieSetari(db: Db, orgId: string, s: SetariAutomatizari) {
  await db
    .insert(crmKv)
    .values({ orgId, path: CALE, data: s, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: s, updatedAt: new Date() } });
}

export async function salveazaSetari(ctx: OrgContext, x: Partial<SetariAutomatizari>): Promise<{ ok: true } | { ok: false; eroare: string }> {
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, eroare: "Automatizările le configurează un administrator." };
  const vechi = await incarcaSetari(ctx.db, ctx.orgId);
  const nou = curataSetari({ ...x, ultimaRulare: vechi.ultimaRulare });
  for (const [cheie, id] of [["responsabilMultumireId", nou.responsabilMultumireId], ["responsabilRaportId", nou.responsabilRaportId]] as const) {
    if (!id) continue;
    const [a] = await ctx.db.select({ s: angajati.status }).from(angajati).where(and(eq(angajati.id, id), eq(angajati.orgId, ctx.orgId))).limit(1);
    if (!a || a.s !== "activ") return { ok: false, eroare: `Persoana aleasă pentru ${cheie === "responsabilMultumireId" ? "mulțumiri" : "rapoarte de sponsor"} nu e activă în echipă.` };
  }
  if (nou.multumire && !nou.responsabilMultumireId) return { ok: false, eroare: "Alege cine primește sarcinile de mulțumire, ca să poți porni regula." };
  if (nou.raportSponsor && !nou.responsabilRaportId) return { ok: false, eroare: "Alege cine primește sarcinile de raport pentru sponsor, ca să poți porni regula." };
  await scrieSetari(ctx.db, ctx.orgId, nou);
  return { ok: true };
}

// ───────── Rularea regulilor ─────────

const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);
const zi = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 duminică … 6 sâmbătă
export const esteZiLucratoare = (iso: string) => zi(iso) >= 1 && zi(iso) <= 5;
const urmZiLucratoare = (iso: string) => {
  let d = adauga(iso, 1);
  while (!esteZiLucratoare(d)) d = adauga(d, 1);
  return d;
};
const ziLucrPrecedenta = (iso: string) => {
  let d = adauga(iso, -1);
  while (!esteZiLucratoare(d)) d = adauga(d, -1);
  return d;
};

type Notif = { tip: string; titlu: string; continut?: string; link: string; cheie: string };

async function notifica(db: Db, orgId: string, appUserId: string | null | undefined, n: Notif): Promise<number> {
  if (!appUserId) return 0;
  const r = await db
    .insert(performantaNotificari)
    .values({ orgId, appUserId, tip: n.tip, titlu: n.titlu.slice(0, 200), continut: n.continut?.slice(0, 1500) ?? null, link: n.link, cheieDedup: n.cheie })
    .onConflictDoNothing()
    .returning({ id: performantaNotificari.id });
  return r.length;
}

const lista = (xs: string[], max = 5) => xs.slice(0, max).map((x) => `• ${x}`).join("\n") + (xs.length > max ? `\n… și încă ${xs.length - max}` : "");

export async function ruleazaAutomatizari(db: Db, orgId: string, orgSlug: string, optiuni: { azi?: string; fortat?: boolean } = {}): Promise<{ ruleaza: boolean; motiv?: string; rezultat: RezultatRulare }> {
  const azi = optiuni.azi ?? aziRo();
  const rezultat: RezultatRulare = { termene: 0, blocaje: 0, actualizari: 0, rezumat: 0, risc: 0, multumiri: 0, rapoarte: 0 };
  if (!optiuni.fortat && !esteZiLucratoare(azi)) return { ruleaza: false, motiv: "weekend", rezultat };

  const setari = await incarcaSetari(db, orgId);
  const baza = `/${orgSlug}/crm/performanta`;
  const ang = await db.select({ id: angajati.id, nume: angajati.nume, appUserId: angajati.appUserId, managerId: angajati.managerId, status: angajati.status }).from(angajati).where(eq(angajati.orgId, orgId));
  const user = new Map(ang.map((a) => [a.id, a.appUserId]));
  const numeAng = new Map(ang.map((a) => [a.id, a.nume]));
  const managerUser = (id: string | null) => {
    const m = id ? ang.find((a) => a.id === id)?.managerId : null;
    return m ? (user.get(m) ?? null) : null;
  };
  const luni = luniSaptamanii(azi);
  const prec = ziLucrPrecedenta(azi);
  const urm = urmZiLucratoare(azi);
  const pseudo = { db, orgId, userId: "00000000-0000-0000-0000-000000000000", role: "owner" } as Pick<OrgContext, "db" | "orgId" | "userId" | "role">;

  // 1. Termene: o dată înainte (până la următoarea zi lucrătoare) și o dată după (prima zi după termen), grupate pe persoană.
  if (setari.termene) {
    const deschise = await db
      .select({ id: activitati.id, titlu: activitati.titlu, termen: activitati.termen, responsabilId: activitati.responsabilId })
      .from(activitati)
      .where(and(eq(activitati.orgId, orgId), inArray(activitati.status, STATUSURI_DESCHISE), isNotNull(activitati.responsabilId), sql`${activitati.termen} >= ${prec}::date and ${activitati.termen} <= ${urm}::date`));
    const pe = new Map<string, { maine: string[]; depasite: string[] }>();
    for (const a of deschise) {
      const u = user.get(a.responsabilId as string);
      if (!u || !a.termen) continue;
      const g = pe.get(u) ?? { maine: [], depasite: [] };
      if (a.termen > azi) g.maine.push(a.titlu);
      else if (a.termen < azi) g.depasite.push(a.titlu);
      pe.set(u, g);
    }
    for (const [u, g] of pe) {
      const parti = [g.maine.length ? `${g.maine.length} cu termen în curând` : "", g.depasite.length ? `${g.depasite.length} cu termenul depășit` : ""].filter(Boolean).join(", ");
      if (!parti) continue;
      rezultat.termene += await notifica(db, orgId, u, {
        tip: "termen",
        titlu: `Termene: ${parti}`,
        continut: [g.maine.length ? `Termen în curând:\n${lista(g.maine)}` : "", g.depasite.length ? `Termen depășit:\n${lista(g.depasite)}` : ""].filter(Boolean).join("\n\n"),
        link: `${baza}/saptamana`,
        cheie: `termene:${azi}`,
      });
    }
  }

  // 2. Blocaje: unul nou care cere decizie, ziua de revenire și prima zi după ea. Fiecare o singură dată.
  if (setari.blocaje) {
    const deschise = await db.select().from(blocaje).where(and(eq(blocaje.orgId, orgId), eq(blocaje.status, "deschis")));
    const ieri = new Date(Date.now() - 26 * 3600 * 1000);
    for (const b of deschise) {
      const rez = b.responsabilRezolvareId ? user.get(b.responsabilRezolvareId) : null;
      const rap = b.raportatDeId ? user.get(b.raportatDeId) : null;
      const link = `${baza}/spatiul-meu`;
      const scurt = b.motiv.length > 140 ? `${b.motiv.slice(0, 137)}…` : b.motiv;
      if (b.necesitaDecizie && b.deschisLa >= ieri) rezultat.blocaje += await notifica(db, orgId, rez, { tip: "blocaj", titlu: "Un blocaj așteaptă decizia ta", continut: scurt, link, cheie: `blocaj:${b.id}:nou` });
      if (b.termenRevenire === azi) {
        for (const u of new Set([rez, rap])) rezultat.blocaje += await notifica(db, orgId, u, { tip: "blocaj", titlu: "Azi e termenul de revenire pentru un blocaj", continut: scurt, link, cheie: `blocaj:${b.id}:azi` });
      } else if (b.termenRevenire >= prec && b.termenRevenire < azi) {
        const destinatari = new Set([rez, rap, managerUser(b.raportatDeId ?? b.responsabilRezolvareId)]);
        for (const u of destinatari) rezultat.blocaje += await notifica(db, orgId, u, { tip: "blocaj", titlu: "Termenul de revenire al unui blocaj a trecut", continut: scurt, link, cheie: `blocaj:${b.id}:depasit` });
      }
    }
  }

  // 3–5 folosesc obiectivele active ale perioadei curente.
  const ob = setari.actualizari || setari.rezumat || setari.riscManager ? await incarcaObiective(pseudo, { start: azi, end: azi, status: "activ" }) : null;

  // 3. Cereri de actualizare: cel mult una pe săptămână, pe persoană, pentru rezultatele-cheie manuale rămase în urmă.
  if (setari.actualizari && ob) {
    const pe = new Map<string, string[]>();
    for (const o of ob.obiective) {
      for (const r of o.rezultate) {
        if (r.status !== "activ" || r.sursa !== "manual") continue;
        const veche = r.actualitate === "intarziata" || r.actualitate === "veche" || (r.actualitate === "fara_date" && o.perioadaStart <= adauga(azi, -7));
        if (!veche) continue;
        const u = user.get((r.responsabilId ?? o.responsabilId) as string);
        if (!u) continue;
        pe.set(u, [...(pe.get(u) ?? []), `${r.titlu} (${o.titlu})`]);
      }
    }
    for (const [u, l] of pe) rezultat.actualizari += await notifica(db, orgId, u, { tip: "actualizare", titlu: `${l.length} ${l.length === 1 ? "rezultat așteaptă" : "rezultate așteaptă"} o actualizare`, continut: lista(l), link: `${baza}/spatiul-meu`, cheie: `actualizari:${luni}` });
  }

  // 4. Rezumatul săptămânii, în ziua aleasă: ce are persoana de făcut, iar managerii primesc și starea echipei.
  if (setari.rezumat && ob && zi(azi) === setari.ziRezumat) {
    const dup = luni;
    const sfarsit = adauga(luni, 6);
    const act = await db
      .select({ r: activitati.responsabilId, termen: activitati.termen })
      .from(activitati)
      .where(and(eq(activitati.orgId, orgId), inArray(activitati.status, STATUSURI_DESCHISE), isNotNull(activitati.responsabilId)));
    const decizii = await db.select({ id: blocaje.id }).from(blocaje).where(and(eq(blocaje.orgId, orgId), eq(blocaje.status, "deschis"), eq(blocaje.necesitaDecizie, true)));
    const risc = ob.obiective.filter((o) => o.stare === "in_risc" || o.stare === "intarziat");
    const subordonati = (id: string) => {
      const rez = new Set<string>();
      const coada = [id];
      while (coada.length) {
        const m = coada.pop()!;
        for (const a of ang) {
          if (a.managerId !== m || rez.has(a.id) || a.id === id) continue;
          rez.add(a.id);
          coada.push(a.id);
        }
      }
      return rez;
    };
    for (const a of ang) {
      if (!a.appUserId || a.status === "inactiv") continue;
      const ale = act.filter((x) => x.r === a.id);
      const saptamana = ale.filter((x) => x.termen && x.termen >= dup && x.termen <= sfarsit).length;
      const restante = ale.filter((x) => x.termen && x.termen < dup).length;
      const obiectiveMele = risc.filter((o) => o.responsabilId === a.id);
      const echipa = subordonati(a.id);
      const echipaRisc = echipa.size ? risc.filter((o) => o.responsabilId && echipa.has(o.responsabilId)).length : 0;
      const echipaDecizii = echipa.size ? decizii.length : 0;
      if (!saptamana && !restante && !obiectiveMele.length && !echipaRisc && !echipaDecizii) continue;
      const randuri = [`Activități cu termen în această săptămână: ${saptamana}`, `Restanțe: ${restante}`, `Obiectivele tale în risc sau întârziate: ${obiectiveMele.length}`];
      if (echipa.size) randuri.push(`Obiective ale echipei tale în risc sau întârziate: ${echipaRisc}`, `Blocaje care cer o decizie (în organizație): ${echipaDecizii}`);
      rezultat.rezumat += await notifica(db, orgId, a.appUserId, { tip: "rezumat", titlu: "Săptămâna ta în cifre", continut: randuri.join("\n"), link: `${baza}/spatiul-meu`, cheie: `rezumat:${luni}` });
    }
  }

  // 5. Obiectiv în risc: managerul direct al responsabilului află o singură dată pe lună pentru fiecare stare.
  if (setari.riscManager && ob) {
    for (const o of ob.obiective) {
      if (o.stare !== "in_risc" && o.stare !== "intarziat") continue;
      const m = managerUser(o.responsabilId);
      rezultat.risc += await notifica(db, orgId, m, {
        tip: "risc",
        titlu: `„${o.titlu}” e ${o.stare === "intarziat" ? "semnificativ în urma ritmului" : "în urma ritmului"}`,
        continut: `Responsabil: ${o.responsabilId ? (numeAng.get(o.responsabilId) ?? "—") : "—"}. Progres: ${o.progres === null ? "fără date" : `${Math.round(o.progres * 100)}%`}. Merită o discuție despre ce ar ajuta.`,
        link: `${baza}/obiective?ob=${o.id}`,
        cheie: `risc:${o.id}:${o.stare}:${azi.slice(0, 7)}`,
      });
    }
  }

  // 6. Mulțumire după o donație confirmată: sarcină pentru persoana aleasă, o dată pe donație, doar dacă donatorul nu a fost deja mulțumit.
  if (setari.multumire && setari.responsabilMultumireId) {
    const donatii = (await db.execute(sql`
      select d.id::text as id, coalesce(nullif(d.nume_donator, ''), d.email_donator) as nume, d.suma::int as suma
      from fundraising_donations d
      left join donatori_reali r on r.org_id = d.org_id and lower(r.email) = lower(d.email_donator)
      where d.org_id = ${orgId} and d.status = 'reusita' and d.created_at >= now() - interval '48 hours'
        and d.suma >= ${setari.pragMultumire} and d.email_donator is not null
        and (r.multumit_la is null or r.multumit_la < d.created_at)
      order by d.created_at desc limit 50`)) as unknown as { id: string; nume: string; suma: number }[];
    for (const d of donatii) {
      const r = await db
        .insert(activitati)
        .values({ orgId, titlu: `Mulțumește lui ${d.nume} (${d.suma} lei)`, descriere: "Creată automat după o donație confirmată. Un mulțumesc personal în primele 48 de ore ține donatorii aproape.", responsabilId: setari.responsabilMultumireId, prioritate: "medie", termen: urm, efortOre: 0.25, sursa: "automatizare", cheieAutomatizare: `multumire:${d.id}`, criteriuFinalizare: "Donatorul a primit mulțumirea (telefon, mesaj sau email)." })
        .onConflictDoNothing()
        .returning({ id: activitati.id });
      rezultat.multumiri += r.length;
    }
  }

  // 7. Raport pentru sponsor: sarcină la înregistrarea unei sponsorizări în CRM Companii.
  if (setari.raportSponsor && setari.responsabilRaportId) {
    const noi = await db
      .select({ id: companySponsorizari.id, firmaId: companySponsorizari.companyId, suma: companySponsorizari.suma, data: companySponsorizari.data, firma: companies.nume })
      .from(companySponsorizari)
      .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
      .where(and(eq(companySponsorizari.orgId, orgId), gte(companySponsorizari.createdAt, new Date(Date.now() - 48 * 3600 * 1000)), ne(companySponsorizari.suma, 0)));
    for (const s of noi) {
      const termen = adauga(s.data, 30) < adauga(azi, 7) ? adauga(azi, 7) : adauga(s.data, 30);
      const r = await db
        .insert(activitati)
        .values({ orgId, titlu: `Pregătește raportul pentru ${s.firma} (${s.suma.toLocaleString("ro-RO")} lei)`, descriere: `Creată automat la înregistrarea sponsorizării. Termenul e o propunere (30 de zile de la dată): ajustează-l după contract. Raport precompletat: /${orgSlug}/crm/instrumente/raport-companii/impact?firma=${s.firmaId}`, responsabilId: setari.responsabilRaportId, prioritate: "mare", termen, efortOre: 3, sursa: "automatizare", cheieAutomatizare: `raport-sponsor:${s.id}`, criteriuFinalizare: "Raportul a fost trimis sponsorului." })
        .onConflictDoNothing()
        .returning({ id: activitati.id });
      rezultat.rapoarte += r.length;
      // Mulțumirea pentru firmă: sarcină cu termen de 3 zile, cu linkuri către scrisoarea și certificatul precompletate. Nu se trimite nimic automat.
      const m = await db
        .insert(activitati)
        .values({
          orgId,
          titlu: `Mulțumește ${s.firma}`,
          descriere: `Creată automat la înregistrarea sponsorizării (${s.suma.toLocaleString("ro-RO")} lei). Scrisoare de mulțumire precompletată: /${orgSlug}/crm/instrumente/scrisori/generator?firma=${s.firmaId} · Certificat: /${orgSlug}/crm/instrumente/certificate/generator?firma=${s.firmaId}. Citește textul înainte să-l trimiți, apoi bifează documentul ca „trimis” în fișa firmei.`,
          responsabilId: setari.responsabilRaportId,
          prioritate: "medie",
          termen: adauga(azi, 3),
          efortOre: 0.5,
          sursa: "automatizare",
          cheieAutomatizare: `multumire-pj:${s.id}`,
          criteriuFinalizare: "Mulțumirea a fost trimisă firmei (documentul e bifat ca trimis în fișa firmei).",
        })
        .onConflictDoNothing()
        .returning({ id: activitati.id });
      rezultat.multumiri += m.length;
    }
  }

  // 8. Reînnoire: la ~10 luni de la ultima sponsorizare a unei firme, sarcină „Propune reînnoirea” (o dată pe an și firmă); o sugestie, nu un mesaj trimis.
  if (setari.raportSponsor && setari.responsabilRaportId) {
    const ultimele = await db
      .select({ companyId: companySponsorizari.companyId, firma: companies.nume, ultima: sql<string>`max(${companySponsorizari.data})::text` })
      .from(companySponsorizari)
      .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
      .where(and(eq(companySponsorizari.orgId, orgId), ne(companySponsorizari.suma, 0), sql`${companies.deletedAt} is null`))
      .groupBy(companySponsorizari.companyId, companies.nume)
      .having(sql`max(${companySponsorizari.data}) <= ${adauga(azi, -300)}::date and max(${companySponsorizari.data}) >= ${adauga(azi, -330)}::date`);
    for (const f of ultimele) {
      const r = await db
        .insert(activitati)
        .values({ orgId, titlu: `Propune reînnoirea sprijinului către ${f.firma}`, descriere: `Ultima sponsorizare: ${f.ultima}. Scrisoare de reînnoire: /${orgSlug}/crm/instrumente/scrisori/generator?firma=${f.companyId}. Creată automat; e o sugestie de moment, nu o regulă.`, responsabilId: setari.responsabilRaportId, prioritate: "medie", termen: adauga(azi, 14), efortOre: 1, sursa: "automatizare", cheieAutomatizare: `reinnoire:${f.companyId}:${f.ultima.slice(0, 4)}`, criteriuFinalizare: "Propunerea de reînnoire a fost trimisă sau s-a hotărât să nu se reînnoiască." })
        .onConflictDoNothing()
        .returning({ id: activitati.id });
      rezultat.rapoarte += r.length;
    }
  }

  // 9. Digest săptămânal pentru firme (în ziua rezumatului): mulțumiri netrimise și reînnoiri apropiate, în aplicație, fără date personale.
  if (setari.raportSponsor && setari.responsabilRaportId && zi(azi) === setari.ziRezumat) {
    const destinatar = user.get(setari.responsabilRaportId) ?? null;
    const restante = await multumiriRestante(db, orgId, azi, 50);
    if (destinatar && restante.length) {
      rezultat.rezumat += await notifica(db, orgId, destinatar, {
        tip: "rezumat",
        titlu: `${restante.length} ${restante.length === 1 ? "firmă așteaptă" : "firme așteaptă"} o mulțumire`,
        continut: lista(restante.map((r) => `${r.firma} (${r.zile} de zile)`)),
        link: `/${orgSlug}/crm/instrumente/scrisori`,
        cheie: `digest-firme:${luni}`,
      });
    }
  }

  await scrieSetari(db, orgId, { ...setari, ultimaRulare: { la: new Date().toISOString(), rezumat: rezultat } });
  return { ruleaza: true, rezultat };
}

// ───────── Notificările utilizatorului ─────────

export type NotificareDto = { id: string; tip: string; titlu: string; continut: string | null; link: string | null; citit: boolean; creatLa: string };

export async function incarcaNotificari(ctx: OrgContext, limita = 60): Promise<{ notificari: NotificareDto[]; necitite: number }> {
  const rows = await ctx.db
    .select()
    .from(performantaNotificari)
    .where(and(eq(performantaNotificari.orgId, ctx.orgId), eq(performantaNotificari.appUserId, ctx.userId)))
    .orderBy(sql`${performantaNotificari.createdAt} desc`)
    .limit(limita);
  const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(performantaNotificari).where(and(eq(performantaNotificari.orgId, ctx.orgId), eq(performantaNotificari.appUserId, ctx.userId), eq(performantaNotificari.citit, false)));
  return { notificari: rows.map((r) => ({ id: r.id, tip: r.tip, titlu: r.titlu, continut: r.continut, link: r.link, citit: r.citit, creatLa: r.createdAt.toISOString() })), necitite: n };
}

export async function numarNecitite(ctx: OrgContext): Promise<number> {
  const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(performantaNotificari).where(and(eq(performantaNotificari.orgId, ctx.orgId), eq(performantaNotificari.appUserId, ctx.userId), eq(performantaNotificari.citit, false)));
  return n;
}

export async function marcheazaCitite(ctx: OrgContext, ids: string[] | "toate"): Promise<void> {
  const conditii = [eq(performantaNotificari.orgId, ctx.orgId), eq(performantaNotificari.appUserId, ctx.userId)];
  if (ids !== "toate") {
    if (ids.length === 0) return;
    conditii.push(inArray(performantaNotificari.id, ids.slice(0, 200)));
  }
  await ctx.db.update(performantaNotificari).set({ citit: true }).where(and(...conditii));
}
