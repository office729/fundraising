import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { appUsers, kpiAuditLog, kpiInteractiuni } from "@/lib/db/schema";
import { incarcaStructura } from "@/lib/performanta-date";
import { TIPURI_INTRARE, ETICHETE_INTRARE, STATUS_DEZVOLTARE, vedeIntrare, type TipIntrare } from "@/lib/performanta-evaluari-reguli";
import { aziRo } from "@/lib/performanta-masurare";
import { rezolvaPerioada } from "@/lib/performanta-perioada";

// Raportul de evaluări: acoperire (cine are ce, în perioadă) și, separat, un export cu conținutul intrărilor.
// Reguli de acces (aceleași ca la pagina Discuții și evaluări, aplicate pe server):
//  - persoanele incluse: toți (administrator), tu și echipa ta (manager) sau doar tu (fără subordonați);
//  - o intrare apare doar dacă `vedeIntrare` o permite: un review nepartajat îl văd doar autorul și administratorii;
//  - exportul cu conținut se înregistrează în jurnalul de audit (cine, când, câte intrări).
// Raportul măsoară PARTICIPAREA la discuții (a avut loc sau nu), niciodată calitatea sau un scor al persoanei.

export type RandAcoperire = {
  id: string;
  nume: string;
  checkinuri: number;
  nr1la1: number;
  ultima1la1: string | null;
  review: "niciunul" | "privat" | "partajat";
  autoevaluare: boolean;
  feedbackPrimit: number;
  feedbackDat: number;
  dezvoltareTotal: number;
  dezvoltareAtinse: number;
  dezvoltareInCurs: number;
};

export type RaportEvaluari = {
  perioada: { cod: string; start: string; end: string; eticheta: string; saptamaniScurse: number };
  azi: string;
  actualizatLa: string;
  persoane: RandAcoperire[];
  totaluri: { persoane: number; cuCheckin: number; cu1la1: number; cuReview: number; cuAutoevaluare: number };
};

export type IntrareExport = { persoana: string; tip: string; data: string; perioada: string; autor: string; continut: string };

const ETICHETE_CAMP: Record<string, string> = {
  realizari: "Ce a ieșit",
  blocaje: "Unde e nevoie de ajutor",
  prioritate: "Ce urmează",
  subiecte: "Subiecte",
  decizii: "Decizii",
  actiuni: "Acțiuni",
  urmatoarea: "Următoarea discuție",
  rezumat: "Rezumat",
  puncteTari: "Puncte tari",
  deDezvoltat: "De dezvoltat",
  ceaIesit: "Ce a ieșit bine",
  ceamInvatat: "Ce a învățat",
  nevoieSprijin: "Unde are nevoie de sprijin",
  tipFeedback: "Fel de feedback",
  text: "Text",
  context: "Context",
  titlu: "Titlu",
  descriere: "Descriere",
  termen: "Termen",
  status: "Stare",
  comentariu: "Comentariu",
};


function textIntrare(tip: string, c: Record<string, unknown>): string {
  const linii: string[] = [];
  for (const [k, v] of Object.entries(c)) {
    if (["partajat", "obiective", "perioada"].includes(k) || v === null || v === undefined || v === "") continue;
    const valoare = k === "status" && typeof v === "string" && v in STATUS_DEZVOLTARE ? STATUS_DEZVOLTARE[v as keyof typeof STATUS_DEZVOLTARE] : String(v);
    linii.push(`${ETICHETE_CAMP[k] ?? k}: ${valoare}`);
  }
  if (tip === "review_trimestrial") linii.push(`Partajat cu persoana: ${c.partajat === true ? "da" : "nu"}`);
  const ob = c.obiective as { titlu: string; progres: number | null }[] | undefined;
  if (ob?.length) linii.push(`Obiective la momentul reviewului: ${ob.map((o) => `${o.titlu} (${o.progres === null ? "fără date" : `${Math.round(o.progres * 100)}%`})`).join("; ")}`);
  return linii.join("\n");
}

export async function incarcaRaportEvaluari(ctx: OrgContext, cod: string | null, opt: { continut?: boolean } = {}): Promise<RaportEvaluari & { intrari: IntrareExport[] }> {
  const azi = aziRo();
  const p = rezolvaPerioada(cod, azi);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const activi = struct.angajati.filter((a) => a.activ);
  const persoane = eu.admin ? activi : activi.filter((a) => a.id === eu.angajatId || eu.subordonati.has(a.id));
  const ids = persoane.map((a) => a.id);
  const sf = p.end < azi ? p.end : azi;
  const saptamaniScurse = Math.max(1, Math.ceil((Date.parse(`${sf}T00:00:00Z`) - Date.parse(`${p.start}T00:00:00Z`) + 86400000) / (7 * 86400000)));

  const randuri = ids.length
    ? await ctx.db
        .select({ r: kpiInteractiuni, autor: appUsers.name, email: appUsers.email })
        .from(kpiInteractiuni)
        .leftJoin(appUsers, eq(appUsers.id, kpiInteractiuni.autorUserId))
        .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), inArray(kpiInteractiuni.angajatId, ids), inArray(kpiInteractiuni.tip, TIPURI_INTRARE), gte(kpiInteractiuni.data, p.start), lte(kpiInteractiuni.data, p.end)))
        .orderBy(asc(kpiInteractiuni.data))
    : [];
  const vizibile = randuri.filter(({ r }) => vedeIntrare(eu, { tip: r.tip, angajatId: r.angajatId, autorUserId: r.autorUserId, partajat: r.continut.partajat === true }));
  const numeDupaUser = new Map(struct.angajati.filter((a) => a.appUserId).map((a) => [a.appUserId as string, a.id]));
  // Feedbackul DAT de persoanele din raport, indiferent cui i-a fost adresat, doar în limita a ce are voie să vadă cel care cere raportul.
  const autori = persoane.map((a) => a.appUserId).filter((x): x is string => !!x);
  const dat = autori.length
    ? (await ctx.db
        .select({ r: kpiInteractiuni })
        .from(kpiInteractiuni)
        .where(and(eq(kpiInteractiuni.orgId, ctx.orgId), eq(kpiInteractiuni.tip, "feedback"), inArray(kpiInteractiuni.autorUserId, autori), gte(kpiInteractiuni.data, p.start), lte(kpiInteractiuni.data, p.end)))
      ).filter(({ r }) => vedeIntrare(eu, { tip: r.tip, angajatId: r.angajatId, autorUserId: r.autorUserId }))
    : [];

  const rez: RandAcoperire[] = persoane.map((a) => {
    const ale = vizibile.filter(({ r }) => r.angajatId === a.id);
    const tip = (t: TipIntrare) => ale.filter(({ r }) => r.tip === t);
    const reviewuri = tip("review_trimestrial");
    const dez = tip("obiectiv_dezvoltare");
    const unu = tip("1la1");
    return {
      id: a.id,
      nume: a.nume,
      checkinuri: tip("checkin").length,
      nr1la1: unu.length,
      ultima1la1: unu.length ? unu[unu.length - 1].r.data : null,
      review: reviewuri.length === 0 ? "niciunul" : reviewuri.some(({ r }) => r.continut.partajat === true) ? "partajat" : "privat",
      autoevaluare: tip("autoevaluare").length > 0,
      feedbackPrimit: tip("feedback").length,
      feedbackDat: dat.filter(({ r }) => r.autorUserId && numeDupaUser.get(r.autorUserId) === a.id).length,
      dezvoltareTotal: dez.length,
      dezvoltareAtinse: dez.filter(({ r }) => r.continut.status === "atins").length,
      dezvoltareInCurs: dez.filter(({ r }) => r.continut.status === "in_curs").length,
    };
  });

  const intrari: IntrareExport[] = opt.continut
    ? vizibile.map(({ r, autor, email }) => ({
        persoana: struct.angajati.find((a) => a.id === r.angajatId)?.nume ?? "—",
        tip: ETICHETE_INTRARE[r.tip as TipIntrare] ?? r.tip,
        data: r.data,
        perioada: typeof r.continut.perioada === "string" ? r.continut.perioada : "",
        autor: autor ?? email ?? "—",
        continut: textIntrare(r.tip, r.continut),
      }))
    : [];

  return {
    perioada: { cod: p.cod, start: p.start, end: p.end, eticheta: p.eticheta, saptamaniScurse },
    azi,
    actualizatLa: new Date().toISOString(),
    persoane: rez.sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    totaluri: {
      persoane: rez.length,
      cuCheckin: rez.filter((x) => x.checkinuri > 0).length,
      cu1la1: rez.filter((x) => x.nr1la1 > 0).length,
      cuReview: rez.filter((x) => x.review !== "niciunul").length,
      cuAutoevaluare: rez.filter((x) => x.autoevaluare).length,
    },
    intrari,
  };
}

// Exportul cu conținut: înregistrat în auditul modulului. Întoarce intrările doar după ce urma de audit a fost scrisă.
export async function exportaEvaluari(ctx: OrgContext, cod: string | null): Promise<RaportEvaluari & { intrari: IntrareExport[] }> {
  const r = await incarcaRaportEvaluari(ctx, cod, { continut: true });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "evaluari_export", entitate: "evaluare", entitateId: ctx.orgId, detalii: { perioada: r.perioada.cod, persoane: r.persoane.length, intrari: r.intrari.length } });
  return r;
}

