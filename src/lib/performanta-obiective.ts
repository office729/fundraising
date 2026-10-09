import { and, desc, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import {
  appUsers,
  kpiAuditLog,
  obiective,
  obiectiveColaboratori,
  obiectiveLegaturi,
  rezultateActualizari,
  rezultateCheie,
} from "@/lib/db/schema";
import { poateActualizaRezultat, poateCreaObiectiv, poateEditaObiectiv } from "@/lib/performanta-acces";
import { incarcaObiective, incarcaStructura } from "@/lib/performanta-date";
import type { Incredere } from "@/lib/performanta-masurare";
import type { IstoricRezultat, StatusObiectiv } from "@/lib/performanta-tipuri";
import { creeazaCiclu, valideazaObiectiv, type ObiectivInput } from "@/lib/performanta-validare";

// Scrierea obiectivelor și rezultatelor-cheie (logica, fără sesiune: testabilă). Învelișurile cu sesiune sunt în crm/performanta/obiective-actions.ts.
// Obiective și rezultate-cheie: creare/editare, actualizări cu dovezi, schimbări de țintă, anulare. Drepturile se verifică pe server
// (lib/performanta-acces.ts); fiecare modificare importantă intră în jurnalul de audit al modulului.

type Rez<T extends object = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const eroare = (e: string) => ({ ok: false as const, eroare: e });

const audit = (ctx: OrgContext, actiune: string, entitateId: string, detalii: Record<string, unknown>) =>
  ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune, entitate: "obiectiv", entitateId, detalii });

async function incarcaAcces(ctx: OrgContext, obiectivId: string) {
  const [o] = await ctx.db.select().from(obiective).where(and(eq(obiective.id, obiectivId), eq(obiective.orgId, ctx.orgId))).limit(1);
  if (!o) return null;
  const colab = await ctx.db.select({ a: obiectiveColaboratori.angajatId }).from(obiectiveColaboratori).where(eq(obiectiveColaboratori.obiectivId, obiectivId));
  return { o, acces: { vizibilitate: o.vizibilitate, responsabilId: o.responsabilId, departmentId: o.departmentId, creatDe: o.creatDe, colaboratori: colab.map((c) => c.a) } };
}

export async function salveazaObiectiv(ctx: OrgContext, input: ObiectivInput): Promise<Rez<{ id: string }>> {
  const err = valideazaObiectiv(input);
  if (err) return eroare(err);
  const struct = await incarcaStructura(ctx);
  const ang = new Map(struct.angajati.map((a) => [a.id, a]));
  if (!ang.get(input.responsabilId!)?.activ) return eroare("Responsabilul trebuie să fie un angajat activ din organizație.");
  if (input.colaboratori.some((c) => !ang.has(c))) return eroare("Un colaborator nu face parte din organizație.");
  if (input.rezultate.some((r) => (r.kpiAngajatId && !ang.has(r.kpiAngajatId)) || (r.responsabilId && !ang.has(r.responsabilId)))) return eroare("Un angajat ales la rezultate-cheie nu face parte din organizație.");
  if (input.departmentId && !struct.departamente.some((d) => d.id === input.departmentId)) return eroare("Departamentul ales nu există.");

  // Părinte și legături: aceeași organizație, fără cicluri.
  const toate = await ctx.db.select({ id: obiective.id, parentId: obiective.parentId }).from(obiective).where(eq(obiective.orgId, ctx.orgId));
  const ids = new Set(toate.map((t) => t.id));
  if (input.parentId && !ids.has(input.parentId)) return eroare("Obiectivul părinte nu există.");
  if (input.legaturi.some((l) => !ids.has(l.id))) return eroare("Un obiectiv legat nu există.");
  if (input.id && creeazaCiclu(input.id, input.parentId ?? null, new Map(toate.map((t) => [t.id, t.parentId])))) return eroare("Alinierea ar crea un ciclu: alege alt obiectiv părinte.");

  const existent = input.id ? await incarcaAcces(ctx, input.id) : null;
  if (input.id && !existent) return eroare("Obiectivul nu mai există.");
  if (existent) {
    if (!poateEditaObiectiv(struct.eu, existent.acces)) return eroare("Nu ai dreptul să modifici acest obiectiv.");
    if (existent.o.status === "anulat") return eroare("Obiectivul e anulat. Redeschide-l înainte să-l modifici.");
  } else if (!poateCreaObiectiv(struct.eu, input.nivel, input.responsabilId)) {
    return eroare(input.nivel === "strategic" ? "Doar un administrator poate crea obiective strategice." : "Nu poți crea acest obiectiv pentru persoana aleasă.");
  }

  const valori = {
    nivel: input.nivel,
    titlu: input.titlu.trim(),
    descriere: input.descriere?.trim() || null,
    responsabilId: input.responsabilId,
    departmentId: input.departmentId || null,
    parentId: input.parentId || null,
    perioadaStart: input.perioadaStart,
    perioadaEnd: input.perioadaEnd,
    vizibilitate: input.vizibilitate,
    updatedAt: new Date(),
  };
  let id = input.id ?? "";
  if (existent) {
    await ctx.db.update(obiective).set(valori).where(and(eq(obiective.id, existent.o.id), eq(obiective.orgId, ctx.orgId)));
    if (existent.o.responsabilId !== input.responsabilId) await audit(ctx, "obiectiv_responsabil_schimbat", id, { de: existent.o.responsabilId, la: input.responsabilId });
  } else {
    const [nou] = await ctx.db.insert(obiective).values({ ...valori, orgId: ctx.orgId, creatDe: ctx.userId }).returning({ id: obiective.id });
    id = nou.id;
  }

  // Colaboratori și legături: se înlocuiesc cu lista trimisă.
  await ctx.db.delete(obiectiveColaboratori).where(eq(obiectiveColaboratori.obiectivId, id));
  if (input.colaboratori.length) await ctx.db.insert(obiectiveColaboratori).values(input.colaboratori.map((a) => ({ obiectivId: id, angajatId: a, orgId: ctx.orgId })));
  await ctx.db.delete(obiectiveLegaturi).where(eq(obiectiveLegaturi.obiectivId, id));
  if (input.legaturi.length) await ctx.db.insert(obiectiveLegaturi).values(input.legaturi.map((l) => ({ orgId: ctx.orgId, obiectivId: id, legatDeId: l.id, tip: l.tip })));

  // Rezultate-cheie: cele cu id existent se actualizează (valoarea curentă rămâne), cele fără id se creează, cele scoase se șterg
  // sau, dacă au istoric, se anulează (istoricul nu se pierde).
  const existente = input.id ? await ctx.db.select().from(rezultateCheie).where(and(eq(rezultateCheie.obiectivId, id), eq(rezultateCheie.orgId, ctx.orgId))) : [];
  const trimise = new Set(input.rezultate.map((r) => r.id).filter(Boolean) as string[]);
  for (const [i, r] of input.rezultate.entries()) {
    const camp = {
      titlu: r.titlu.trim(),
      descriere: r.descriere?.trim() || null,
      metoda: r.metoda,
      tipTinta: r.tipTinta,
      unitate: r.unitate?.trim() || null,
      nivelInitial: r.nivelInitial ?? null,
      tinta: r.metoda === "binar" ? 1 : (r.tinta ?? null),
      tintaMax: r.metoda === "interval" ? (r.tintaMax ?? null) : null,
      pondere: r.pondere,
      sursa: r.sursa,
      kpiDefinitieId: r.sursa === "kpi" ? r.kpiDefinitieId! : null,
      kpiAngajatId: r.sursa === "kpi" ? r.kpiAngajatId! : null,
      sursaConfig: r.sursa === "kpi" ? { agregare: r.agregare ?? (r.tipTinta === "periodic" ? "ultima" : "suma") } : r.sursa === "crm" ? { metrica: r.metrica! } : null,
      frecventaActualizare: r.frecventaActualizare,
      termen: r.termen || null,
      responsabilId: r.responsabilId || null,
      formula: r.formula?.trim() || null,
      reguli: r.reguli?.trim() || null,
      atribuire: r.atribuire?.trim() || null,
      ordine: i,
      updatedAt: new Date(),
    };
    const ex = r.id ? existente.find((e) => e.id === r.id) : null;
    if (ex) {
      await ctx.db.update(rezultateCheie).set(camp).where(and(eq(rezultateCheie.id, ex.id), eq(rezultateCheie.orgId, ctx.orgId)));
      if (ex.tinta !== camp.tinta || ex.tintaMax !== camp.tintaMax) {
        await ctx.db.insert(rezultateActualizari).values({ orgId: ctx.orgId, rezultatId: ex.id, tip: "tinta", tinta: camp.tinta, valoareAnterioara: ex.tinta, detalii: { de: { tinta: ex.tinta, tintaMax: ex.tintaMax }, la: { tinta: camp.tinta, tintaMax: camp.tintaMax } }, autorUserId: ctx.userId });
      }
      if (ex.responsabilId !== camp.responsabilId) {
        await ctx.db.insert(rezultateActualizari).values({ orgId: ctx.orgId, rezultatId: ex.id, tip: "responsabil", detalii: { de: ex.responsabilId, la: camp.responsabilId }, autorUserId: ctx.userId });
      }
    } else {
      await ctx.db.insert(rezultateCheie).values({ ...camp, orgId: ctx.orgId, obiectivId: id });
    }
  }
  for (const ex of existente.filter((e) => !trimise.has(e.id))) {
    const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(rezultateActualizari).where(eq(rezultateActualizari.rezultatId, ex.id));
    if (n > 0 || ex.valoareCurenta !== null) await ctx.db.update(rezultateCheie).set({ status: "anulat", updatedAt: new Date() }).where(eq(rezultateCheie.id, ex.id));
    else await ctx.db.delete(rezultateCheie).where(eq(rezultateCheie.id, ex.id));
  }

  await audit(ctx, existent ? "obiectiv_modificat" : "obiectiv_creat", id, { titlu: valori.titlu, nivel: valori.nivel, rezultate: input.rezultate.length });
  return { ok: true, id };
}

export type ActualizareInput = { valoare: number | null; comentariu?: string; dovadaUrl?: string; incredere?: Incredere | null };

const URL_OK = /^https?:\/\/[^\s]{3,480}$/i;

export async function actualizeazaRezultat(ctx: OrgContext, rezultatId: string, input: ActualizareInput): Promise<Rez> {
  if (input.valoare === null || !Number.isFinite(input.valoare)) return eroare("Introdu valoarea actuală (un număr).");
  const comentariu = (input.comentariu ?? "").trim().slice(0, 1000) || null;
  const dovada = (input.dovadaUrl ?? "").trim();
  if (dovada && !URL_OK.test(dovada)) return eroare("Linkul dovezii trebuie să înceapă cu http:// sau https://.");
  if (input.incredere && !["mare", "medie", "scazuta"].includes(input.incredere)) return eroare("Încredere invalidă.");
  const [kr] = await ctx.db.select().from(rezultateCheie).where(and(eq(rezultateCheie.id, rezultatId), eq(rezultateCheie.orgId, ctx.orgId))).limit(1);
  if (!kr) return eroare("Rezultatul-cheie nu mai există.");
  if (kr.status === "anulat") return eroare("Rezultatul-cheie e anulat.");
  if (kr.sursa !== "manual") return eroare("Valoarea acestui rezultat se preia automat din sursă; nu se introduce manual.");
  if (kr.metoda === "binar" && ![0, 1].includes(input.valoare)) return eroare("Pentru „realizat / nerealizat” valoarea e 0 sau 1.");
  const struct = await incarcaStructura(ctx);
  const ctxAcces = await incarcaAcces(ctx, kr.obiectivId);
  if (!ctxAcces) return eroare("Obiectivul nu mai există.");
  if (!poateActualizaRezultat(struct.eu, ctxAcces.acces, kr.responsabilId)) return eroare("Nu ai dreptul să actualizezi acest rezultat.");
  if (ctxAcces.o.status !== "activ") return eroare("Obiectivul nu mai e activ.");

  await ctx.db.insert(rezultateActualizari).values({
    orgId: ctx.orgId, rezultatId, tip: "valoare", valoare: input.valoare, valoareAnterioara: kr.valoareCurenta, tinta: kr.tinta, comentariu, dovadaUrl: dovada || null, incredere: input.incredere ?? null, autorUserId: ctx.userId,
  });
  await ctx.db
    .update(rezultateCheie)
    .set({ valoareCurenta: input.valoare, ultimaActualizare: new Date(), ...(input.incredere ? { incredere: input.incredere } : {}), updatedAt: new Date() })
    .where(eq(rezultateCheie.id, rezultatId));
  return { ok: true };
}

export async function seteazaStatusObiectiv(ctx: OrgContext, obiectivId: string, status: StatusObiectiv, motiv?: string): Promise<Rez> {
  if (!["activ", "finalizat", "anulat"].includes(status)) return eroare("Stare invalidă.");
  const m = (motiv ?? "").trim().slice(0, 500);
  if (status === "anulat" && m.length < 3) return eroare("Scrie motivul anulării.");
  const c = await incarcaAcces(ctx, obiectivId);
  if (!c) return eroare("Obiectivul nu mai există.");
  const struct = await incarcaStructura(ctx);
  if (!poateEditaObiectiv(struct.eu, c.acces)) return eroare("Nu ai dreptul să modifici acest obiectiv.");
  await ctx.db.update(obiective).set({ status, motivAnulare: status === "anulat" ? m : null, updatedAt: new Date() }).where(and(eq(obiective.id, obiectivId), eq(obiective.orgId, ctx.orgId)));
  await audit(ctx, `obiectiv_${status === "activ" ? "redeschis" : status}`, obiectivId, { motiv: m || null, titlu: c.o.titlu });
  return { ok: true };
}

export async function istoricRezultat(ctx: OrgContext, rezultatId: string): Promise<IstoricRezultat[]> {
  const [kr] = await ctx.db.select({ obiectivId: rezultateCheie.obiectivId }).from(rezultateCheie).where(and(eq(rezultateCheie.id, rezultatId), eq(rezultateCheie.orgId, ctx.orgId))).limit(1);
  if (!kr) return [];
  // Doar cine poate vedea obiectivul îi vede istoricul (încărcarea filtrează după vizibilitate).
  const { obiective: vizibile } = await incarcaObiective(ctx, { start: "1990-01-01", end: "2100-12-31", status: "toate", doarIds: [kr.obiectivId] });
  if (vizibile.length === 0) return [];
  const r = await ctx.db
    .select({ a: rezultateActualizari, autor: appUsers.name })
    .from(rezultateActualizari)
    .leftJoin(appUsers, eq(appUsers.id, rezultateActualizari.autorUserId))
    .where(and(eq(rezultateActualizari.rezultatId, rezultatId), eq(rezultateActualizari.orgId, ctx.orgId)))
    .orderBy(desc(rezultateActualizari.createdAt))
    .limit(60);
  return r.map(({ a, autor }) => ({
    id: a.id, tip: a.tip as IstoricRezultat["tip"], valoare: a.valoare, valoareAnterioara: a.valoareAnterioara, tinta: a.tinta, comentariu: a.comentariu, dovadaUrl: a.dovadaUrl,
    incredere: (a.incredere as Incredere | null) ?? null, detalii: a.detalii, autor, la: a.createdAt.toISOString(),
  }));
}

// Reordonare / curățare: ids valide ale obiectivelor pe care utilizatorul le poate edita (pentru listele de alegere „părinte”).
export async function obiectiveAlegere(ctx: OrgContext, start: string, end: string): Promise<{ id: string; titlu: string; nivel: string }[]> {
  const { obiective: lista } = await incarcaObiective(ctx, { start, end, status: "activ" });
  return lista.map((o) => ({ id: o.id, titlu: o.titlu, nivel: o.nivel }));
}

