"use server";

import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { type OrgContext, withOrgSession } from "@/lib/auth/guard";
import { angajati, kpiAtribuiri, kpiDefinitii, kpiInteractiuni } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { perioadaCurenta, type Frecventa } from "@/lib/kpi-engine";

// Ritmul echipei (Faza G): check-in săptămânal (angajatul scrie despre sine), 1:1 (manager-ul notează o discuție, vizibilă și
// angajatului) și calendarul care le adună. Ton de sprijin, nu de control: întrebările sunt „ce ți-a ieșit / unde ai nevoie de
// ajutor”, nu „de ce nu ai atins ținta”. Cine vede ce: angajatul — ale lui; manager-ul direct și adminul de departament — ale
// echipei lor; owner/admin — toate. Regula e în `poateGestiona` / `poateVedea` de mai jos, nu doar în interfață.

type Eu = { id: string; nume: string; managerId: string | null; departmentId: string | null; nivelAcces: "membru" | "manager" | "admin_departament" };

async function profilulMeu(ctx: OrgContext): Promise<Eu | null> {
  const [r] = await ctx.db
    .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume, managerId: angajati.managerId, departmentId: angajati.departmentId, nivelAcces: angajati.nivelAcces })
    .from(angajati)
    .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId)))
    .limit(1);
  return r ? { id: r.id, nume: `${r.nume} ${r.prenume ?? ""}`.trim(), managerId: r.managerId, departmentId: r.departmentId, nivelAcces: r.nivelAcces } : null;
}

const esteAdmin = (ctx: OrgContext) => ctx.role === "owner" || ctx.role === "admin";

async function poateGestiona(ctx: OrgContext, eu: Eu | null, tintaId: string): Promise<boolean> {
  if (esteAdmin(ctx)) return true;
  if (!eu) return false;
  const [t] = await ctx.db.select({ managerId: angajati.managerId, departmentId: angajati.departmentId }).from(angajati).where(and(eq(angajati.id, tintaId), eq(angajati.orgId, ctx.orgId))).limit(1);
  if (!t) return false;
  if (t.managerId === eu.id) return true;
  return eu.nivelAcces === "admin_departament" && eu.departmentId !== null && t.departmentId === eu.departmentId;
}

async function poateVedea(ctx: OrgContext, eu: Eu | null, tintaId: string): Promise<boolean> {
  if (eu && eu.id === tintaId) return true;
  return poateGestiona(ctx, eu, tintaId);
}

const text = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export type Checkin = { id: string; data: string; realizari: string; blocaje: string; prioritate: string };
export type Intalnire = { id: string; data: string; subiecte: string; decizii: string; actiuni: string; urmatoarea: string | null; autor: string | null };
export type MembruEchipa = { id: string; nume: string; ultimulCheckin: string | null; checkinSaptamana: boolean; urmatoarea1la1: string | null };

const mapCheckin = (r: { id: string; data: string; continut: Record<string, unknown> }): Checkin => ({
  id: r.id,
  data: r.data,
  realizari: text(r.continut.realizari),
  blocaje: text(r.continut.blocaje),
  prioritate: text(r.continut.prioritate),
});
const mapIntalnire = (r: { id: string; data: string; continut: Record<string, unknown> }, autor: string | null): Intalnire => ({
  id: r.id,
  data: r.data,
  subiecte: text(r.continut.subiecte),
  decizii: text(r.continut.decizii),
  actiuni: text(r.continut.actiuni),
  urmatoarea: typeof r.continut.urmatoarea === "string" && DATA.test(r.continut.urmatoarea) ? r.continut.urmatoarea : null,
  autor,
});

export type RitmPagina = {
  eu: { id: string; nume: string } | null;
  saptamanaStart: string;
  checkinSaptamanaAceasta: Checkin | null;
  checkinuriMele: Checkin[];
  intalnirileMele: Intalnire[];
  echipa: MembruEchipa[];
};

export const obtineRitmAction = withOrgSession(async (ctx): Promise<RitmPagina> => {
  const eu = await profilulMeu(ctx);
  const saptamanaStart = perioadaCurenta("saptamanal").start;
  if (!eu && !esteAdmin(ctx)) return { eu: null, saptamanaStart, checkinSaptamanaAceasta: null, checkinuriMele: [], intalnirileMele: [], echipa: [] };

  let echipaIds: { id: string; nume: string; prenume: string | null }[] = [];
  if (esteAdmin(ctx)) {
    echipaIds = await ctx.db.select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.status, "activ")));
  } else if (eu) {
    echipaIds = await ctx.db
      .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume })
      .from(angajati)
      .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.status, "activ"), eu.nivelAcces === "admin_departament" && eu.departmentId ? eq(angajati.departmentId, eu.departmentId) : eq(angajati.managerId, eu.id)));
  }
  echipaIds = echipaIds.filter((m) => m.id !== eu?.id);

  const [mele, intalniriMele, activitateEchipa] = await Promise.all([
    eu ? ctx.db.select({ id: kpiInteractiuni.id, data: kpiInteractiuni.data, continut: kpiInteractiuni.continut }).from(kpiInteractiuni).where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, eu.id), eq(kpiInteractiuni.tip, "checkin"))).orderBy(desc(kpiInteractiuni.data)).limit(12) : Promise.resolve([]),
    eu ? ctx.db.select({ id: kpiInteractiuni.id, data: kpiInteractiuni.data, continut: kpiInteractiuni.continut }).from(kpiInteractiuni).where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, eu.id), eq(kpiInteractiuni.tip, "1la1"))).orderBy(desc(kpiInteractiuni.data)).limit(12) : Promise.resolve([]),
    echipaIds.length
      ? ctx.db
          .select({ angajatId: kpiInteractiuni.angajatId, tip: kpiInteractiuni.tip, data: kpiInteractiuni.data, continut: kpiInteractiuni.continut })
          .from(kpiInteractiuni)
          .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), inArray(kpiInteractiuni.angajatId, echipaIds.map((m) => m.id)), gte(kpiInteractiuni.data, perioadaCurenta("anual").start)))
          .orderBy(desc(kpiInteractiuni.data))
      : Promise.resolve([]),
  ]);

  const azi = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const echipa: MembruEchipa[] = echipaIds
    .map((m) => {
      const randuri = activitateEchipa.filter((a) => a.angajatId === m.id);
      const checkinuri = randuri.filter((a) => a.tip === "checkin");
      const viitoare = randuri
        .filter((a) => a.tip === "1la1")
        .map((a) => (typeof a.continut.urmatoarea === "string" && DATA.test(a.continut.urmatoarea) ? a.continut.urmatoarea : null))
        .filter((d): d is string => d !== null && d >= azi)
        .sort();
      return {
        id: m.id,
        nume: `${m.nume} ${m.prenume ?? ""}`.trim(),
        ultimulCheckin: checkinuri[0]?.data ?? null,
        checkinSaptamana: checkinuri.some((c) => c.data >= saptamanaStart),
        urmatoarea1la1: viitoare[0] ?? null,
      };
    })
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));

  const checkinuriMele = mele.map(mapCheckin);
  return {
    eu: eu ? { id: eu.id, nume: eu.nume } : null,
    saptamanaStart,
    checkinSaptamanaAceasta: checkinuriMele.find((c) => c.data >= saptamanaStart) ?? null,
    checkinuriMele,
    intalnirileMele: intalniriMele.map((r) => mapIntalnire(r, null)),
    echipa,
  };
});

// Check-in-ul propriu, o dată pe săptămână (se actualizează dacă îl rescrii în aceeași săptămână).
export const salveazaCheckinAction = withOrgSession(async (ctx, input: { realizari: string; blocaje: string; prioritate: string }): Promise<void> => {
  const eu = await profilulMeu(ctx);
  if (!eu) throw new EroareUtilizator("Nu ai încă un profil de angajat — cere unui administrator să te adauge în Organizație & Echipă.");
  const continut = { realizari: text(input.realizari), blocaje: text(input.blocaje), prioritate: text(input.prioritate) };
  if (!continut.realizari && !continut.blocaje && !continut.prioritate) throw new EroareUtilizator("Scrie măcar un rând.");
  const data = perioadaCurenta("saptamanal").start;
  const [existent] = await ctx.db
    .select({ id: kpiInteractiuni.id })
    .from(kpiInteractiuni)
    .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, eu.id), eq(kpiInteractiuni.tip, "checkin"), eq(kpiInteractiuni.data, data)))
    .limit(1);
  if (existent) await ctx.db.update(kpiInteractiuni).set({ continut }).where(eq(kpiInteractiuni.id, existent.id));
  else await ctx.db.insert(kpiInteractiuni).values({ orgId: ctx.orgId, angajatId: eu.id, autorUserId: ctx.userId, tip: "checkin", data, continut });
});

// Check-in-urile și 1:1-urile unui angajat din echipa ta (sau ale tale).
export const listeazaInteractiuniAction = withOrgSession(async (ctx, angajatId: string): Promise<{ checkinuri: Checkin[]; intalniri: Intalnire[] }> => {
  const eu = await profilulMeu(ctx);
  if (!(await poateVedea(ctx, eu, angajatId))) throw new EroareUtilizator("Nu ai acces la datele acestui angajat.");
  const randuri = await ctx.db
    .select({ id: kpiInteractiuni.id, tip: kpiInteractiuni.tip, data: kpiInteractiuni.data, continut: kpiInteractiuni.continut })
    .from(kpiInteractiuni)
    .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, angajatId)))
    .orderBy(desc(kpiInteractiuni.data))
    .limit(60);
  return {
    checkinuri: randuri.filter((r) => r.tip === "checkin").map(mapCheckin),
    intalniri: randuri.filter((r) => r.tip === "1la1").map((r) => mapIntalnire(r, null)),
  };
});

// O discuție 1:1 notată de manager (sau admin). E vizibilă și angajatului — notițele sunt comune, nu un dosar secret.
export const salveaza1la1Action = withOrgSession(
  async (ctx, angajatId: string, input: { data: string; subiecte: string; decizii: string; actiuni: string; urmatoarea: string | null }): Promise<void> => {
    const eu = await profilulMeu(ctx);
    if (!(await poateGestiona(ctx, eu, angajatId))) throw new EroareUtilizator("Doar managerul direct, adminul de departament sau un admin pot nota un 1:1.");
    if (!DATA.test(input.data)) throw new EroareUtilizator("Data discuției nu e validă.");
    if (input.urmatoarea && !DATA.test(input.urmatoarea)) throw new EroareUtilizator("Data următorului 1:1 nu e validă.");
    const continut = { subiecte: text(input.subiecte), decizii: text(input.decizii), actiuni: text(input.actiuni), urmatoarea: input.urmatoarea || null };
    if (!continut.subiecte && !continut.decizii && !continut.actiuni) throw new EroareUtilizator("Notează măcar un subiect.");
    await ctx.db.insert(kpiInteractiuni).values({ orgId: ctx.orgId, angajatId, autorUserId: ctx.userId, tip: "1la1", data: input.data, continut });
  },
);

export const stergeInteractiuneAction = withOrgSession(async (ctx, id: string): Promise<void> => {
  const eu = await profilulMeu(ctx);
  const [r] = await ctx.db.select({ angajatId: kpiInteractiuni.angajatId, autor: kpiInteractiuni.autorUserId, tip: kpiInteractiuni.tip }).from(kpiInteractiuni).where(and(eq(kpiInteractiuni.id, id), eq(kpiInteractiuni.orgId, ctx.orgId))).limit(1);
  if (!r) return;
  const permis = r.autor === ctx.userId || esteAdmin(ctx) || (r.tip === "1la1" && (await poateGestiona(ctx, eu, r.angajatId)));
  if (!permis) throw new EroareUtilizator("Nu poți șterge această intrare.");
  await ctx.db.delete(kpiInteractiuni).where(and(eq(kpiInteractiuni.id, id), eq(kpiInteractiuni.orgId, ctx.orgId)));
});

// ---------------------------------------------------------------- Calendar KPI
export type EvenimentCalendar = { data: string; tip: "1la1" | "checkin" | "perioada"; titlu: string; detaliu: string | null };

// Următoarele 45 de zile: 1:1-urile programate (ale mele sau ale echipei mele), check-in-ul săptămânii și sfârșitul perioadei
// de măsurare pentru KPI-urile mele atribuite.
export const obtineCalendarAction = withOrgSession(async (ctx): Promise<EvenimentCalendar[]> => {
  const eu = await profilulMeu(ctx);
  const azi = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const limita = new Date(`${azi}T12:00:00Z`);
  limita.setUTCDate(limita.getUTCDate() + 45);
  const pana = limita.toISOString().slice(0, 10);
  const evenimente: EvenimentCalendar[] = [];

  // 1:1 programate: cele despre mine + cele ale echipei pe care o gestionez (admin: toate).
  const vizibile = await ctx.db
    .select({ angajatId: kpiInteractiuni.angajatId, continut: kpiInteractiuni.continut, nume: angajati.nume, prenume: angajati.prenume })
    .from(kpiInteractiuni)
    .innerJoin(angajati, eq(angajati.id, kpiInteractiuni.angajatId))
    .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.tip, "1la1"), gte(kpiInteractiuni.createdAt, new Date(Date.now() - 400 * 86_400_000))));
  const poate = new Map<string, boolean>();
  for (const r of vizibile) {
    const urmatoarea = typeof r.continut.urmatoarea === "string" && DATA.test(r.continut.urmatoarea) ? r.continut.urmatoarea : null;
    if (!urmatoarea || urmatoarea < azi || urmatoarea > pana) continue;
    if (!poate.has(r.angajatId)) poate.set(r.angajatId, await poateVedea(ctx, eu, r.angajatId));
    if (!poate.get(r.angajatId)) continue;
    const eAlMeu = eu?.id === r.angajatId;
    evenimente.push({ data: urmatoarea, tip: "1la1", titlu: eAlMeu ? "1:1 cu managerul" : `1:1 — ${`${r.nume} ${r.prenume ?? ""}`.trim()}`, detaliu: null });
  }

  if (eu) {
    // Check-in: sfârșitul săptămânii curente (vineri), dacă încă nu l-ai scris.
    const sapt = perioadaCurenta("saptamanal");
    const [facut] = await ctx.db.select({ id: kpiInteractiuni.id }).from(kpiInteractiuni).where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, eu.id), eq(kpiInteractiuni.tip, "checkin"), eq(kpiInteractiuni.data, sapt.start))).limit(1);
    if (!facut) {
      const vineri = new Date(`${sapt.start}T12:00:00Z`);
      vineri.setUTCDate(vineri.getUTCDate() + 4);
      evenimente.push({ data: vineri.toISOString().slice(0, 10) < azi ? azi : vineri.toISOString().slice(0, 10), tip: "checkin", titlu: "Check-in săptămânal", detaliu: "Câteva rânduri despre săptămâna asta" });
    }

    // Sfârșitul perioadei de măsurare pentru frecvențele KPI-urilor mele.
    const kpiuri = await ctx.db
      .select({ nume: kpiDefinitii.nume, frecventa: kpiDefinitii.frecventa })
      .from(kpiAtribuiri)
      .innerJoin(kpiDefinitii, eq(kpiDefinitii.id, kpiAtribuiri.kpiDefinitieId))
      .where(and(eq(kpiAtribuiri.angajatId, eu.id), eq(kpiAtribuiri.status, "activ")));
    const dupaFrecventa = new Map<Frecventa, string[]>();
    for (const k of kpiuri) dupaFrecventa.set(k.frecventa, [...(dupaFrecventa.get(k.frecventa) ?? []), k.nume]);
    const ETICHETA: Record<Frecventa, string> = { zilnic: "zilnic", saptamanal: "săptămânal", lunar: "lunar", trimestrial: "trimestrial", anual: "anual", custom: "personalizat" };
    for (const [frecventa, nume] of dupaFrecventa) {
      if (frecventa === "zilnic") continue;
      const { endExclusiv } = perioadaCurenta(frecventa);
      const ultima = new Date(`${endExclusiv}T12:00:00Z`);
      ultima.setUTCDate(ultima.getUTCDate() - 1);
      const data = ultima.toISOString().slice(0, 10);
      if (data >= azi && data <= pana) evenimente.push({ data, tip: "perioada", titlu: `Se încheie perioada KPI ${ETICHETA[frecventa]}`, detaliu: nume.join(", ") });
    }
  }
  return evenimente.sort((a, b) => a.data.localeCompare(b.data));
});
