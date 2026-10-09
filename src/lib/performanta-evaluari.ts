import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { appUsers, kpiAuditLog, kpiInteractiuni } from "@/lib/db/schema";
import { poateStergeIntrare, poateEditaIntrare, poateScrieIntrare, vedeIntrare, TIPURI_INTRARE, ZILE_PANA_LA_1LA1, de1la1, valideazaContinut, type Continut, type RezumatObiectiv, type TipIntrare } from "@/lib/performanta-evaluari-reguli";
import { incarcaObiective, incarcaStructura } from "@/lib/performanta-date";
import { aziRo, luniSaptamanii } from "@/lib/performanta-masurare";
import { rezolvaPerioada } from "@/lib/performanta-perioada";

// Discuții și evaluări: citire cu filtrare după drepturi și scriere cu validare. Regulile de acces sunt în performanta-evaluari-reguli.ts.

type Rez<T extends object = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const eroare = (e: string) => ({ ok: false as const, eroare: e });
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export type IntrareDto = {
  id: string;
  tip: TipIntrare;
  angajatId: string;
  data: string;
  continut: Continut;
  autorNume: string | null;
  esteAutor: boolean;
  poateEdita: boolean;
  poateSterge: boolean;
  creatLa: string;
};

export type RezumatPersoana = { id: string; nume: string; ultimulCheckin: string | null; checkinSaptamana: boolean; ultima1la1: string | null; urmatoarea1la1: string | null; stare1la1: "niciodata" | "de_programat" | "la_zi" };

export type DateDiscutii = {
  azi: string;
  luni: string;
  euAngajatId: string | null;
  admin: boolean;
  persoane: { id: string; nume: string }[];
  angajatId: string | null;
  numeAngajat: string | null;
  intrari: IntrareDto[];
  poate: Record<TipIntrare, boolean>;
  echipa: RezumatPersoana[];
};

export async function incarcaDiscutii(ctx: OrgContext, angajatCerut: string | null): Promise<DateDiscutii> {
  const azi = aziRo();
  const luni = luniSaptamanii(azi);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const activi = struct.angajati.filter((a) => a.activ);
  const persoane = (eu.admin ? activi : activi.filter((a) => a.id === eu.angajatId || eu.subordonati.has(a.id))).map((a) => ({ id: a.id, nume: a.nume }));
  const vizibil = (id: string) => persoane.some((p) => p.id === id) || id === eu.angajatId;
  const angajatId = angajatCerut && vizibil(angajatCerut) ? angajatCerut : (eu.angajatId ?? persoane[0]?.id ?? null);
  const goale = Object.fromEntries(TIPURI_INTRARE.map((t) => [t, false])) as Record<TipIntrare, boolean>;
  const baza: DateDiscutii = { azi, luni, euAngajatId: eu.angajatId, admin: eu.admin, persoane, angajatId, numeAngajat: null, intrari: [], poate: goale, echipa: [] };
  if (!angajatId) return baza;
  baza.numeAngajat = struct.angajati.find((a) => a.id === angajatId)?.nume ?? null;
  baza.poate = Object.fromEntries(TIPURI_INTRARE.map((t) => [t, poateScrieIntrare(eu, t, angajatId)])) as Record<TipIntrare, boolean>;

  const randuri = await ctx.db
    .select({ r: kpiInteractiuni, autor: appUsers.name, email: appUsers.email })
    .from(kpiInteractiuni)
    .leftJoin(appUsers, eq(appUsers.id, kpiInteractiuni.autorUserId))
    .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, angajatId), inArray(kpiInteractiuni.tip, TIPURI_INTRARE)))
    .orderBy(desc(kpiInteractiuni.data), desc(kpiInteractiuni.createdAt))
    .limit(300);
  baza.intrari = randuri
    .filter(({ r }) => vedeIntrare(eu, { tip: r.tip, angajatId: r.angajatId, autorUserId: r.autorUserId, partajat: r.continut.partajat === true }))
    .map(({ r, autor, email }) => {
      const acces = { tip: r.tip, angajatId: r.angajatId, autorUserId: r.autorUserId };
      return { id: r.id, tip: r.tip as TipIntrare, angajatId: r.angajatId, data: r.data, continut: r.continut, autorNume: autor ?? email ?? null, esteAutor: r.autorUserId === ctx.userId, poateEdita: poateEditaIntrare(eu, acces), poateSterge: poateStergeIntrare(eu, acces), creatLa: r.createdAt.toISOString() };
    });

  // Prezentarea echipei (doar pentru cine are oameni în subordine sau e administrator): ritmul check-in-urilor și al discuțiilor 1:1.
  const echipaIds = persoane.filter((p) => p.id !== eu.angajatId).map((p) => p.id);
  if (echipaIds.length > 0 && (eu.admin || eu.subordonati.size > 0)) {
    const recente = await ctx.db
      .select({ angajatId: kpiInteractiuni.angajatId, tip: kpiInteractiuni.tip, data: kpiInteractiuni.data, continut: kpiInteractiuni.continut })
      .from(kpiInteractiuni)
      .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), inArray(kpiInteractiuni.angajatId, echipaIds), inArray(kpiInteractiuni.tip, ["checkin", "1la1"]), sql`${kpiInteractiuni.data} >= (${azi}::date - 365)`))
      .orderBy(desc(kpiInteractiuni.data));
    baza.echipa = echipaIds.map((id) => {
      const ale = recente.filter((x) => x.angajatId === id);
      const ck = ale.find((x) => x.tip === "checkin");
      const unu = ale.find((x) => x.tip === "1la1");
      const urm = unu && typeof unu.continut.urmatoarea === "string" && DATA.test(unu.continut.urmatoarea) ? unu.continut.urmatoarea : null;
      return { id, nume: persoane.find((p) => p.id === id)?.nume ?? "—", ultimulCheckin: ck?.data ?? null, checkinSaptamana: ale.some((x) => x.tip === "checkin" && x.data >= luni), ultima1la1: unu?.data ?? null, urmatoarea1la1: urm, stare1la1: de1la1(unu?.data ?? null, azi) };
    });
  }
  return baza;
}

export type IntrareInput = { id?: string; tip: TipIntrare; angajatId: string; data?: string | null; continut: Continut };

export async function salveazaIntrare(ctx: OrgContext, input: IntrareInput): Promise<Rez<{ id: string }>> {
  if (!TIPURI_INTRARE.includes(input.tip)) return eroare("Tip necunoscut.");
  const v = valideazaContinut(input.tip, input.continut ?? {});
  if (!v.ok) return eroare(v.eroare);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  if (!struct.angajati.some((a) => a.id === input.angajatId)) return eroare("Persoana nu există.");
  if (!poateScrieIntrare(eu, input.tip, input.angajatId)) return eroare("Nu ai dreptul să scrii acest tip de intrare pentru această persoană.");

  const azi = aziRo();
  let data = azi;
  if (input.tip === "checkin") data = luniSaptamanii(azi);
  else if (input.tip === "1la1" && input.data) {
    if (!DATA.test(input.data) || input.data > azi || input.data < `${Number(azi.slice(0, 4)) - 1}${azi.slice(4)}`) return eroare("Data discuției trebuie să fie din ultimul an, nu din viitor.");
    data = input.data;
  }

  let continut = v.continut;
  if (input.tip === "review_trimestrial") {
    // Instantaneu al obiectivelor persoanei la momentul reviewului: cifrele rămân cele discutate, chiar dacă se schimbă ulterior.
    const p = rezolvaPerioada(String(continut.perioada));
    const { obiective } = await incarcaObiective(ctx, { start: p.start, end: p.end, responsabilId: input.angajatId });
    const rezumat: RezumatObiectiv[] = obiective.filter((o) => o.status !== "anulat").map((o) => ({ titlu: o.titlu, progres: o.progres, stare: o.stare }));
    continut = { ...continut, obiective: rezumat };
  }

  if (input.id) {
    const [ex] = await ctx.db.select().from(kpiInteractiuni).where(and(eq(kpiInteractiuni.id, input.id), eq(kpiInteractiuni.orgId, ctx.orgId))).limit(1);
    if (!ex || ex.tip !== input.tip || ex.angajatId !== input.angajatId) return eroare("Intrarea nu mai există.");
    if (!poateEditaIntrare(eu, { tip: ex.tip, angajatId: ex.angajatId, autorUserId: ex.autorUserId })) return eroare("Doar autorul poate modifica o intrare.");
    await ctx.db.update(kpiInteractiuni).set({ continut, ...(input.tip === "1la1" ? { data } : {}) }).where(eq(kpiInteractiuni.id, ex.id));
    if (input.tip === "review_trimestrial" && continut.partajat === true && ex.continut.partajat !== true) await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "review_partajat", entitate: "evaluare", entitateId: ex.id, detalii: { angajatId: ex.angajatId, perioada: continut.perioada } });
    return { ok: true, id: ex.id };
  }

  // Actualizarea săptămânală și autoevaluarea pe o perioadă se completează o singură dată: o a doua salvare o modifică pe prima.
  if (input.tip === "checkin" || input.tip === "autoevaluare") {
    const ale = await ctx.db.select().from(kpiInteractiuni).where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.angajatId, input.angajatId), eq(kpiInteractiuni.tip, input.tip), eq(kpiInteractiuni.autorUserId, ctx.userId)));
    const ex = ale.find((x) => (input.tip === "checkin" ? x.data === data : x.continut.perioada === continut.perioada));
    if (ex) {
      await ctx.db.update(kpiInteractiuni).set({ continut }).where(eq(kpiInteractiuni.id, ex.id));
      return { ok: true, id: ex.id };
    }
  }
  const [nou] = await ctx.db.insert(kpiInteractiuni).values({ orgId: ctx.orgId, angajatId: input.angajatId, autorUserId: ctx.userId, tip: input.tip, data, continut }).returning({ id: kpiInteractiuni.id });
  return { ok: true, id: nou.id };
}

export async function stergeIntrare(ctx: OrgContext, id: string): Promise<Rez> {
  const [ex] = await ctx.db.select().from(kpiInteractiuni).where(and(eq(kpiInteractiuni.id, id), eq(kpiInteractiuni.orgId, ctx.orgId))).limit(1);
  if (!ex || !TIPURI_INTRARE.includes(ex.tip as TipIntrare)) return { ok: true };
  const struct = await incarcaStructura(ctx);
  if (!poateStergeIntrare(struct.eu, { tip: ex.tip, angajatId: ex.angajatId, autorUserId: ex.autorUserId })) return eroare("Nu ai dreptul să ștergi această intrare.");
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "evaluare_stearsa", entitate: "evaluare", entitateId: id, detalii: { tip: ex.tip, angajatId: ex.angajatId } });
  await ctx.db.delete(kpiInteractiuni).where(eq(kpiInteractiuni.id, id));
  return { ok: true };
}

export { ZILE_PANA_LA_1LA1 };
