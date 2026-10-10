"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { angajati, appUsers, companies, companySponsorizari, crmKv, roluri } from "@/lib/db/schema";
import { caleDoc, multumiriRestante, TIPURI_DOC, type Intrare, type Restanta, type Stare, type TipDoc } from "@/lib/documente-istoric";

// Scrisori, certificate și rapoarte: numerotare automată pe an, istoricul documentelor exportate și date preluate din CRM (semnatar, firmă).
// Totul stă în crm_kv, pe organizație: o intrare pe tip de document (documente/scrisori, documente/certificate, documente/rapoarte).
const MAX_INTRARI = 100;
const MAX_SNAPSHOT = 24_000; // caractere, fără logo-uri
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type { TipDoc } from "@/lib/documente-istoric";
const tipValid = (t: unknown): t is TipDoc => TIPURI_DOC.includes(t as TipDoc);
// Rapoartele conțin sumele sponsorizărilor: istoricul lor îl văd și îl scriu doar administratorii (la fel ca generatorul).
const poateTip = (ctx: OrgContext, tip: TipDoc) => tip !== "rapoarte" || ctx.role === "owner" || ctx.role === "admin";
// Anul numerotării e cel din România, nu cel din UTC (între 00:00 și 02:00 pe 1 ianuarie ar ieși anul trecut).
const anRomania = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date());

// Rândul se creează dacă lipsește, apoi se blochează pentru actualizare: doi colegi simultan nu primesc același număr.
async function stareBlocata(ctx: OrgContext, tip: TipDoc): Promise<Stare> {
  await ctx.db.insert(crmKv).values({ orgId: ctx.orgId, path: caleDoc(tip), data: { numere: {}, intrari: [] }, updatedAt: new Date() }).onConflictDoNothing();
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, caleDoc(tip)))).limit(1).for("update");
  const d = (r?.data ?? {}) as Partial<Stare>;
  return { numere: d.numere && typeof d.numere === "object" ? d.numere : {}, intrari: Array.isArray(d.intrari) ? d.intrari : [] };
}
const salveaza = (ctx: OrgContext, tip: TipDoc, st: Stare) =>
  ctx.db.update(crmKv).set({ data: st, updatedAt: new Date() }).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, caleDoc(tip))));

// „Nr. 014/2026”: contorul crește la fiecare cerere, separat pe tip și pe an. Un număr cerut și nefolosit rămâne sărit (nu se reutilizează).
export const urmatorulNumarAction = withOrgSession(async (ctx, tip: TipDoc): Promise<string> => {
  if (!tipValid(tip) || !poateTip(ctx, tip)) throw new Error("Tip de document necunoscut.");
  const st = await stareBlocata(ctx, tip);
  const an = anRomania();
  const nr = (st.numere[an] ?? 0) + 1;
  st.numere[an] = nr;
  await salveaza(ctx, tip, st);
  return `Nr. ${String(nr).padStart(3, "0")}/${an}`;
});

export type IntrareIstoric = { id: string; la: string; autor: string; titlu: string; firmaId: string | null; numar: string; stare: "exportat" | "trimis"; trimisLa: string | null };

// Documentul exportat se păstrează cu datele lui (fără logo-uri), ca să poată fi redeschis.
export const inregistreazaDocumentAction = withOrgSession(
  async (ctx, tip: TipDoc, intrare: { titlu: string; firmaId: string | null; numar: string; date: unknown }): Promise<{ ok: true; id: string } | { ok: false }> => {
    if (!tipValid(tip) || !poateTip(ctx, tip)) return { ok: false };
    // Logo-urile nu se păstrează: se iau din Setări la redeschidere. Clientul le scoate înainte de trimitere; aici e a doua plasă.
    const snapshot = { ...(intrare.date as Record<string, unknown>), logoOng: "", logoDestinatar: "", logoFirma: "" };
    if (JSON.stringify(snapshot).length > MAX_SNAPSHOT) return { ok: false };
    const [u] = await ctx.db.select({ name: appUsers.name }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1);
    const st = await stareBlocata(ctx, tip);
    const id = randomUUID();
    const noua: Intrare = { id, la: new Date().toISOString(), autor: (u?.name ?? "").trim().split(/\s+/)[0] ?? "", titlu: String(intrare.titlu ?? "").slice(0, 160), firmaId: intrare.firmaId && UUID.test(intrare.firmaId) ? intrare.firmaId : null, numar: String(intrare.numar ?? "").slice(0, 60), stare: "exportat", trimisLa: null, date: snapshot };
    st.intrari = [noua, ...st.intrari].slice(0, MAX_INTRARI);
    await salveaza(ctx, tip, st);
    return { ok: true, id };
  },
);

// „Exportat” nu înseamnă „trimis”: omul bifează când documentul a plecat, ca echipa să vadă ce mulțumiri mai sunt de trimis.
export const marcheazaTrimisAction = withOrgSession(async (ctx, tip: TipDoc, id: string, trimis: boolean): Promise<boolean> => {
  if (!tipValid(tip) || !poateTip(ctx, tip) || !UUID.test(id)) return false;
  const st = await stareBlocata(ctx, tip);
  const i = st.intrari.find((x) => x.id === id);
  if (!i) return false;
  i.stare = trimis ? "trimis" : "exportat";
  i.trimisLa = trimis ? new Date().toISOString() : null;
  await salveaza(ctx, tip, st);
  return true;
});

export const listeazaDocumenteAction = withOrgSession(async (ctx, tip: TipDoc, firmaId?: string | null): Promise<IntrareIstoric[]> => {
  if (!tipValid(tip) || !poateTip(ctx, tip)) return [];
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, caleDoc(tip)))).limit(1);
  const intrari = ((r?.data as Partial<Stare> | undefined)?.intrari ?? []) as Intrare[];
  return intrari
    .filter((i) => !firmaId || i.firmaId === firmaId)
    .slice(0, 30)
    .map(({ id, la, autor, titlu, firmaId: f, numar, stare, trimisLa }) => ({ id, la, autor, titlu, firmaId: f, numar, stare: stare === "trimis" ? "trimis" : "exportat", trimisLa: trimisLa ?? null }));
});

export const incarcaDocumentAction = withOrgSession(async (ctx, tip: TipDoc, id: string): Promise<unknown | null> => {
  if (!tipValid(tip) || !poateTip(ctx, tip) || !UUID.test(id)) return null;
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, caleDoc(tip)))).limit(1);
  const intrari = ((r?.data as Partial<Stare> | undefined)?.intrari ?? []) as Intrare[];
  return intrari.find((i) => i.id === id)?.date ?? null;
});

// Semnatarul implicit: persoana din „Organizație & Echipă” legată de contul curent (nume și funcție), altfel numele contului.
export const semnatarCurentAction = withOrgSession(async (ctx): Promise<{ nume: string; functie: string }> => {
  const [a] = await ctx.db
    .select({ nume: angajati.nume, prenume: angajati.prenume, functie: roluri.nume })
    .from(angajati)
    .leftJoin(roluri, eq(roluri.id, angajati.roleId))
    .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId)))
    .limit(1);
  if (a) return { nume: [a.prenume, a.nume].filter(Boolean).join(" "), functie: a.functie ?? "" };
  const [u] = await ctx.db.select({ name: appUsers.name }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1);
  return { nume: (u?.name ?? "").trim(), functie: "" };
});

export type DateFirma = { nume: string; adresa: string; administrator: string; suma: string; proiect: string; an: string; dataSponsorizare: string };

// Datele unei firme din CRM, pentru scrisori și certificate: adresa, administratorul și ultima sponsorizare (cu data ei, ca omul să verifice că e cea potrivită).
export const dateFirmaAction = withOrgSession(async (ctx, companyId: string): Promise<DateFirma | null> => {
  if (!UUID.test(companyId)) return null;
  const [f] = await ctx.db
    .select({ nume: companies.nume, adresa: companies.adresa, localitate: companies.localitate, judet: companies.judet, administrator: companies.administrator })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)))
    .limit(1);
  if (!f) return null;
  const [s] = await ctx.db
    .select({ suma: companySponsorizari.suma, data: companySponsorizari.data, proiect: companySponsorizari.proiect, total: sql<number>`sum(${companySponsorizari.suma}) over ()::int` })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.orgId, ctx.orgId), eq(companySponsorizari.companyId, companyId)))
    .orderBy(desc(companySponsorizari.data))
    .limit(1);
  const adresa = [f.adresa, f.localitate, f.judet].filter((x): x is string => !!x && x.trim() !== "").filter((x, i, v) => v.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).join("\n");
  return {
    nume: f.nume,
    adresa,
    administrator: f.administrator ?? "",
    suma: s ? `${String(s.suma).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} lei` : "",
    proiect: s?.proiect?.trim() ?? "",
    an: s ? s.data.slice(0, 4) : "",
    dataSponsorizare: s?.data ?? "",
  };
});

// Mulțumiri de trimis: sponsorizări mai vechi de 14 zile fără nicio scrisoare bifată ca „trimisă” (cele mai întârziate primele).
export const multumiriRestanteAction = withOrgSession(async (ctx): Promise<Restanta[]> => multumiriRestante(ctx.db, ctx.orgId, new Date().toISOString().slice(0, 10)));
