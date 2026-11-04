"use server";

import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { citesteConfigAi } from "@/lib/ai-org/consum-server";
import type { Loc } from "@/lib/ai-org/protocol";
import { withOrgAdmin, withOrgFaze, withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { agentEmailConturi, agentEmailMesaje, agentEmailPdf, agentEmailRaspunsuri, agentEmailSetari, appUsers, companies, contacts, fundraisingPages, memberships } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { ferestreFiscale } from "@/lib/ferestre-fiscale";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTr } from "@/lib/i18n/tr-server";
import { sumaEfectiva } from "@/lib/prioritizare-firme";
import { criptareConfigurata } from "@/lib/secret-box";
import { mecanismDinMarcaje, propozitieSezon, scriptApel, type ScriptApel } from "@/lib/script-apel";

import { cautaCandidati } from "@/lib/agent-email/candidati";
import { expediaza, inchideTrimiterea, pregatesteTestul, pregatesteTrimiterea, rezultatTest, type IntrareTrimitere, type PregatitTrimitere } from "@/lib/agent-email/trimitere";
import { pregatesteGenerare, ruleazaAiGenerare, salveazaGenerare, type PregatitGenerare, type RezultatAiElement } from "@/lib/agent-email/generare";
import { pregatesteCitirea, ruleazaCitirea, salveazaCitirea, type PregatitCitire, type RezultatCitire } from "@/lib/agent-email/raspunsuri";
import { pregatesteReveniri, programeazaApeluri, ruleazaAiReveniri, salveazaReveniri, type PregatitReveniri, type RezultatAiRevenire } from "@/lib/agent-email/reveniri";
import type { RezultatTrimitere as RezultatSmtp } from "@/lib/agent-email/conexiuni";
import { LIMITA_ZI_MAXIMA, MAX_FIRME_PE_GENERARE, esteMecanism, curataSemnatura, numeCurat, type Mecanism } from "@/lib/agent-email/reguli";
import { amprentaPdf, citesteCont, citesteMesaj, citesteSetari, contPublic, esteUuid, listaMesajeClient, pdfGeneralInfo, pdfPentru, respingeReveniri, trimiseAzi } from "@/lib/agent-email/store";
import type {
  ColegClient,
  DatePaginaAgent,
  ExpeditorClient,
  FiltreCandidati,
  PrevizualizareMesaj,
  RezultatActiune,
  RezultatCandidati,
  RezultatGenerare,
  RezultatTrimitere,
} from "@/lib/agent-email/tipuri";

// Acțiunile paginii „Agent email”: AI scrie ciorne, colegul le citește și le aprobă, emailul pleacă din căsuța LUI (SMTP), iar răspunsurile se citesc din aceeași căsuță (IMAP).
// Nimic nu se trimite fără apăsarea explicită a colegului care deține căsuța. Toate acțiunile cer modulul „ai-agenti” (verificat pe server).
const OPT = { modul: "ai-agenti" as const };

const esteAdmin = (ctx: OrgContext): boolean => ctx.role === "owner" || ctx.role === "admin";
const pagina = (ctx: OrgContext) => revalidatePath(`/${ctx.orgSlug}/crm/agent-email`);
const nume = (u: { name: string | null; email: string }) => (u.name ?? "").trim() || u.email.split("@")[0];

async function proteja<R>(zona: string, f: () => Promise<R>, eroare: (msg: string) => R): Promise<R> {
  try {
    return await f();
  } catch (e) {
    unstable_rethrow(e);
    const t = await getTr();
    return eroare(mesajSigur(e, t("A apărut o eroare. Încearcă din nou.", "Something went wrong. Please try again."), zona));
  }
}
const fara = (m: string): RezultatActiune => ({ ok: false, error: m });

// ===== Datele paginii =====
const incarca = withOrgSession(async (ctx): Promise<DatePaginaAgent> => {
  const admin = esteAdmin(ctx);
  const [cont, cfg, setari, pdfGeneral, membri, conturi, mesaje, azi] = await Promise.all([
    citesteCont(ctx.db, ctx.orgId, ctx.userId),
    citesteConfigAi(ctx.db, ctx.orgId, false),
    citesteSetari(ctx.db, ctx.orgId),
    pdfGeneralInfo(ctx.db, ctx.orgId),
    ctx.db
      .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.orgId, ctx.orgId))
      .orderBy(asc(appUsers.name)),
    ctx.db.select({ userId: agentEmailConturi.userId, adresa: agentEmailConturi.adresa, semnatura: agentEmailConturi.semnatura }).from(agentEmailConturi).where(eq(agentEmailConturi.orgId, ctx.orgId)),
    listaMesajeClient(ctx.db, ctx.orgId, ctx.orgSlug, admin ? null : ctx.userId),
    trimiseAzi(ctx.db, ctx.orgId, ctx.userId),
  ]);
  const colegi: ColegClient[] = membri.map((m) => ({ id: m.id, nume: nume(m) }));
  const expeditori: ExpeditorClient[] = conturi
    .filter((c) => admin || c.userId === ctx.userId)
    .map((c) => {
      const m = membri.find((x) => x.id === c.userId);
      return { id: c.userId, nume: m ? nume(m) : c.adresa, email: c.adresa, semnaturaRezumat: c.semnatura.split("\n").filter(Boolean).slice(0, 3).join(" · ") };
    })
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  return {
    acum: new Date().toISOString(),
    eu: { id: ctx.userId, nume: ctx.userName ?? ctx.userEmail, admin },
    contulMeu: cont ? contPublic(cont) : null,
    criptareActiva: criptareConfigurata(),
    aiConectat: cfg.conectat,
    setari,
    pdfGeneral,
    expeditori,
    colegi,
    numeColegi: colegi.map((c) => c.nume),
    mesaje,
    trimiseAziEu: azi,
  };
}, OPT);

export async function incarcaAgentEmail(orgSlug: string): Promise<DatePaginaAgent> {
  return incarca(orgSlug);
}

// ===== Candidați =====
const candidatiAct = withOrgSession(async (ctx, f: Partial<FiltreCandidati>) => cautaCandidati(ctx, f), OPT);

export async function cautaCandidatiAction(orgSlug: string, f: Partial<FiltreCandidati>): Promise<RezultatCandidati | { error: string }> {
  try {
    return await candidatiAct(orgSlug, f);
  } catch (e) {
    unstable_rethrow(e);
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut încărca firmele. Încearcă din nou.", "We could not load the companies. Please try again."), "agent-email-candidati") };
  }
}

// Campaniile (cazurile) pe care le putem propune: doar cele cu pagină publică activă și cu acordul pentru publicare.
const cazuriAct = withOrgSession(async (ctx): Promise<{ id: string; titlu: string }[]> => {
  return ctx.db
    .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu })
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.status, "activa"), eq(fundraisingPages.consimtamantGdpr, true)))
    .orderBy(asc(fundraisingPages.titlu))
    .limit(200);
}, OPT);

export async function listaCampanii(orgSlug: string): Promise<{ id: string; titlu: string }[]> {
  try {
    return await cazuriAct(orgSlug);
  } catch (e) {
    unstable_rethrow(e);
    return [];
  }
}

// ===== Generare =====
type CerereGenerare = { companyIds: string[]; mecanism: Mecanism; cazId?: string; deId: string; instructiuni: string; doarCuAcord: boolean };

const genereazaFaze = withOrgFaze<[CerereGenerare], PregatitGenerare, RezultatAiElement[], RezultatGenerare>({
  opts: OPT,
  pregateste: async (ctx, c) => {
    const t = await getTr();
    const locale: Loc = await getLocale();
    if (!esteMecanism(c?.mecanism)) return { gata: fara(t("Alege ce propunem.", "Choose what we propose.")) };
    const r = await pregatesteGenerare(ctx, locale, t, {
      companyIds: Array.isArray(c.companyIds) ? c.companyIds.map(String) : [],
      mecanism: c.mecanism,
      cazId: c.cazId,
      deId: String(c.deId ?? ""),
      instructiuni: String(c.instructiuni ?? ""),
      doarCuAcord: c.doarCuAcord !== false,
    });
    return "gata" in r ? { gata: r.gata } : { pregatit: r.pregatit };
  },
  extern: ruleazaAiGenerare,
  salveaza: async (ctx, p, rez) => {
    const r = await salveazaGenerare(ctx.db, p, rez);
    pagina(ctx);
    return { ok: r.create > 0, create: r.create, erori: r.erori, error: r.create ? undefined : r.erori[0] ?? "—" };
  },
});

export async function genereazaCiorne(orgSlug: string, c: CerereGenerare): Promise<RezultatGenerare> {
  return proteja("agent-email-genereaza", () => genereazaFaze(orgSlug, c), fara);
}

const rescrieFaze = withOrgFaze<[string, string | undefined], PregatitGenerare, RezultatAiElement[], RezultatGenerare>({
  opts: OPT,
  pregateste: async (ctx, id, deId) => {
    const t = await getTr();
    const locale: Loc = await getLocale();
    if (!esteUuid(id)) return { gata: fara(t("Ciorna nu mai există.", "The draft no longer exists.")) };
    const m = await citesteMesaj(ctx.db, ctx.orgId, id);
    if (!m) return { gata: fara(t("Ciorna nu mai există.", "The draft no longer exists.")) };
    if (!esteAdmin(ctx) && m.deUserId !== ctx.userId) return { gata: fara(t("Poți lucra doar pe ciornele tale.", "You can only work on your own drafts.")) };
    if (m.stare === "trimis" || m.stare === "se_trimite") return { gata: fara(t("Emailul a fost deja trimis.", "The email was already sent.")) };
    if (m.tip === "revenire") return { gata: fara(t("Revenirile se rescriu din „Azi” → „Scrie revenirile cu AI” (șterge-o întâi pe aceasta).", "Follow-ups are rewritten from “Today” → “Write follow-ups with AI” (delete this one first).")) };
    const primaFraza = (m.mesaj.split(/\n\s*\n/)[1] || "").split(/(?<=[.!?])\s/)[0]?.slice(0, 160) || "";
    const r = await pregatesteGenerare(ctx, locale, t, {
      companyIds: [m.companyId],
      mecanism: m.mecanism as Mecanism,
      cazId: m.cazPageId ?? undefined,
      deId: deId && esteUuid(deId) ? deId : (m.deUserId ?? ctx.userId),
      instructiuni: "",
      doarCuAcord: false,
      inlocuiesteId: m.id,
      variantaAnterioara: { subiect: m.subiect, deschidere: primaFraza },
    });
    return "gata" in r ? { gata: r.gata } : { pregatit: r.pregatit };
  },
  extern: ruleazaAiGenerare,
  salveaza: async (ctx, p, rez) => {
    const t = await getTr();
    const r = await salveazaGenerare(ctx.db, p, rez);
    pagina(ctx);
    return r.create ? { ok: true, create: r.create, mesaj: t("Ciorna a fost rescrisă.", "The draft was rewritten.") } : { ok: false, error: r.erori[0] ?? t("Nu am putut rescrie ciorna.", "We could not rewrite the draft.") };
  },
});

export async function rescrieCiorna(orgSlug: string, id: string, deId?: string): Promise<RezultatGenerare> {
  return proteja("agent-email-rescrie", () => rescrieFaze(orgSlug, id, deId), fara);
}

// ===== Ciorne: text, expeditor, ștergere =====
async function ciornaEditabila(ctx: OrgContext, t: (ro: string, en: string) => string, id: string) {
  if (!esteUuid(id)) throw new EroareUtilizator(t("Ciorna nu mai există.", "The draft no longer exists."));
  const m = await citesteMesaj(ctx.db, ctx.orgId, id);
  if (!m) throw new EroareUtilizator(t("Ciorna nu mai există.", "The draft no longer exists."));
  if (!esteAdmin(ctx) && m.deUserId !== ctx.userId) throw new EroareUtilizator(t("Poți lucra doar pe ciornele tale.", "You can only work on your own drafts."));
  return m;
}

const salveazaTextAct = withOrgSession(async (ctx, id: string, subiect: string, mesaj: string): Promise<RezultatActiune> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  if (m.stare === "trimis" || m.stare === "se_trimite") return fara(t("Emailul a fost deja trimis.", "The email was already sent."));
  await ctx.db
    .update(agentEmailMesaje)
    .set({ subiect: String(subiect ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200), mesaj: String(mesaj ?? "").replace(/\r/g, "").trim().slice(0, 8000), updatedAt: new Date() })
    .where(and(eq(agentEmailMesaje.orgId, ctx.orgId), eq(agentEmailMesaje.id, m.id), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"])));
  return { ok: true };
}, OPT);

export async function salveazaTextCiorna(orgSlug: string, id: string, subiect: string, mesaj: string): Promise<RezultatActiune> {
  return proteja("agent-email-salveaza-text", () => salveazaTextAct(orgSlug, id, subiect, mesaj), fara);
}

// Schimbă expeditorul unei ciorne PĂSTRÂND textul. Emailul pleacă din căsuța celui care îl trimite: oricine își poate prelua ciorna („Trimite de la mine”);
// administratorul poate pregăti ciorne și pentru colegii care și-au conectat căsuța, dar numai ei le pot trimite.
const schimbaExpeditorAct = withOrgSession(async (ctx, id: string, deId: string): Promise<RezultatActiune & { numeVechi?: string }> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  if (m.stare === "trimis" || m.stare === "se_trimite") return fara(t("Emailul a fost deja trimis.", "The email was already sent."));
  if (!esteUuid(deId)) return fara(t("Alege expeditorul.", "Choose the sender."));
  if (deId !== ctx.userId && !esteAdmin(ctx)) return fara(t("Poți trimite doar din căsuța ta.", "You can only send from your own mailbox."));
  if (deId === m.deUserId) return { ok: true };
  const [u] = await ctx.db
    .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, adresa: agentEmailConturi.adresa })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .innerJoin(agentEmailConturi, and(eq(agentEmailConturi.userId, appUsers.id), eq(agentEmailConturi.orgId, memberships.orgId)))
    .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, deId)))
    .limit(1);
  if (!u) return fara(deId === ctx.userId ? t("Conectează-ți mai întâi căsuța de email (Setări → Căsuța mea de email).", "Connect your mailbox first (Settings → My mailbox).") : t("Colegul nu și-a conectat căsuța de email.", "This colleague has not connected their mailbox."));
  await ctx.db.update(agentEmailMesaje).set({ deUserId: u.id, deNume: nume(u), deEmail: u.adresa, updatedAt: new Date() }).where(and(eq(agentEmailMesaje.orgId, ctx.orgId), eq(agentEmailMesaje.id, m.id), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"])));
  pagina(ctx);
  // Dacă textul pomenește numele vechiului expeditor, îl semnalăm (AI-ul l-a putut scrie în email).
  const prenume = m.deNume.split(/\s+/)[0] || "";
  return { ok: true, numeVechi: prenume.length >= 3 && m.mesaj.toLowerCase().includes(prenume.toLowerCase()) ? m.deNume : undefined };
}, OPT);

export async function schimbaExpeditor(orgSlug: string, id: string, deId: string): Promise<RezultatActiune & { numeVechi?: string }> {
  return proteja("agent-email-expeditor", () => schimbaExpeditorAct(orgSlug, id, deId), fara);
}

const stergeAct = withOrgSession(async (ctx, id: string): Promise<RezultatActiune> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  if (m.stare === "trimis" || m.stare === "se_trimite") return fara(t("Emailurile trimise rămân în istoric.", "Sent emails stay in the history."));
  const deSters = and(eq(agentEmailMesaje.orgId, ctx.orgId), eq(agentEmailMesaje.id, m.id), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"]));
  // O revenire ștearsă de om nu se șterge de tot: devine „respinsa”, ca agentul să nu o scrie din nou a doua zi.
  if (m.tip === "revenire") await respingeReveniri(ctx.db, deSters);
  else await ctx.db.delete(agentEmailMesaje).where(deSters);
  pagina(ctx);
  return { ok: true };
}, OPT);

export async function stergeCiorna(orgSlug: string, id: string): Promise<RezultatActiune> {
  return proteja("agent-email-sterge", () => stergeAct(orgSlug, id), fara);
}

// Ștergere în masă: „vechi” = netrimise de peste 7 zile; „toate” = toate cele netrimise. Administratorul — ale tuturor; colegii — doar ale lor. Emailurile trimise nu se șterg niciodată.
const stergeMasaAct = withOrgSession(async (ctx, care: "vechi" | "toate"): Promise<RezultatActiune & { sterse?: number }> => {
  const t = await getTr();
  const conditii = [eq(agentEmailMesaje.orgId, ctx.orgId), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"])];
  if (!esteAdmin(ctx)) conditii.push(eq(agentEmailMesaje.deUserId, ctx.userId));
  if (care === "vechi") conditii.push(lt(agentEmailMesaje.createdAt, new Date(Date.now() - 7 * 86_400_000)));
  const respinse = await respingeReveniri(ctx.db, and(...conditii, eq(agentEmailMesaje.tip, "revenire")));
  const stersePrime = await ctx.db.delete(agentEmailMesaje).where(and(...conditii, eq(agentEmailMesaje.tip, "prim"))).returning({ id: agentEmailMesaje.id });
  const sterse = { length: stersePrime.length + respinse };
  pagina(ctx);
  return { ok: true, sterse: sterse.length, mesaj: sterse.length ? t(`${sterse.length} ciorne șterse.`, `${sterse.length} drafts deleted.`) : t("Nicio ciornă de șters.", "No drafts to delete.") };
}, OPT);

export async function stergeCiorneInMasa(orgSlug: string, care: "vechi" | "toate"): Promise<RezultatActiune & { sterse?: number }> {
  return proteja("agent-email-sterge-masa", () => stergeMasaAct(orgSlug, care === "vechi" ? "vechi" : "toate"), fara);
}

// ===== Previzualizare =====
const previzualizareAct = withOrgSession(async (ctx, id: string): Promise<PrevizualizareMesaj | null> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  const cont = m.deUserId ? await citesteCont(ctx.db, ctx.orgId, m.deUserId) : null;
  const revenire = m.tip === "revenire";
  const pdf = revenire ? null : await pdfPentru(ctx.db, ctx.orgId, m.companyId);
  return {
    semnatura: curataSemnatura(cont?.semnatura ?? ""),
    subsolText: `Dacă nu doriți să mai primiți mesaje de la ${ctx.orgName}, răspundeți cu STOP sau dezabonați-vă aici.`,
    atasament: pdf ? { nume: pdf.nume, marime: pdf.marime, sursa: pdf.sursa, hash: pdf.hash } : null,
    revenire,
    poateTrimite: m.deUserId === ctx.userId && !!cont,
  };
}, OPT);

export async function getPrevizualizare(orgSlug: string, id: string): Promise<PrevizualizareMesaj | null> {
  try {
    return await previzualizareAct(orgSlug, id);
  } catch (e) {
    unstable_rethrow(e);
    return null;
  }
}

// ===== Trimitere (doar din acțiunea explicită a colegului care deține căsuța) =====
type CerereTrimitere = { id: string; subiect: string; mesaj: string; pdfHash?: string | null; subiectAles?: "A" | "B" | "editat" };

const trimiteFaze = withOrgFaze<[CerereTrimitere], PregatitTrimitere, RezultatSmtp, RezultatTrimitere>({
  opts: OPT,
  pregateste: async (ctx, c) => {
    const t = await getTr();
    return pregatesteTrimiterea(ctx, t, { id: String(c?.id ?? ""), subiect: String(c?.subiect ?? ""), mesaj: String(c?.mesaj ?? ""), pdfHash: c?.pdfHash ?? null, subiectAles: c?.subiectAles } satisfies IntrareTrimitere);
  },
  extern: expediaza,
  salveaza: async (ctx, p, r) => {
    const t = await getTr();
    const rez = await inchideTrimiterea(ctx, t, p, r);
    pagina(ctx);
    return rez;
  },
});

export async function trimiteCiorna(orgSlug: string, c: CerereTrimitere): Promise<RezultatTrimitere> {
  return proteja("agent-email-trimite", () => trimiteFaze(orgSlug, c), fara);
}

const testFaze = withOrgFaze<[CerereTrimitere], PregatitTrimitere, RezultatSmtp, RezultatTrimitere>({
  opts: OPT,
  pregateste: async (ctx, c) => {
    const t = await getTr();
    return pregatesteTestul(ctx, t, { id: String(c?.id ?? ""), subiect: String(c?.subiect ?? ""), mesaj: String(c?.mesaj ?? ""), pdfHash: c?.pdfHash ?? null });
  },
  extern: expediaza,
  salveaza: async (_ctx, p, r) => rezultatTest(await getTr(), p, r),
});

export async function trimiteTest(orgSlug: string, c: CerereTrimitere): Promise<RezultatTrimitere> {
  return proteja("agent-email-test", () => testFaze(orgSlug, c), fara);
}

// ===== Reveniri =====
const reveniriFaze = withOrgFaze<[], PregatitReveniri, RezultatAiRevenire[], RezultatGenerare>({
  opts: OPT,
  pregateste: async (ctx) => {
    const t = await getTr();
    const locale: Loc = await getLocale();
    const r = await pregatesteReveniri(ctx.db, t, { orgId: ctx.orgId, orgNume: ctx.orgName, locale, userId: ctx.userId, userNume: ctx.userName ?? ctx.userEmail, doarDe: esteAdmin(ctx) ? null : ctx.userId, limita: MAX_FIRME_PE_GENERARE });
    return "gata" in r ? { gata: r.gata } : { pregatit: r.pregatit };
  },
  extern: ruleazaAiReveniri,
  salveaza: async (ctx, p, rez) => {
    const t = await getTr();
    const r = await salveazaReveniri(ctx.db, p, rez);
    pagina(ctx);
    return r.create ? { ok: true, create: r.create, erori: r.erori, mesaj: t(`${r.create} reveniri scrise: citește-le în ciorne.`, `${r.create} follow-ups written: read them in the drafts.`) } : { ok: false, erori: r.erori, error: r.erori[0] ?? t("Nicio revenire scadentă.", "No follow-up is due.") };
  },
});

export async function genereazaReveniri(orgSlug: string): Promise<RezultatGenerare> {
  return proteja("agent-email-reveniri", () => reveniriFaze(orgSlug), fara);
}

// ===== Răspunsuri (IMAP), din căsuța celui logat =====
const citireFaze = withOrgFaze<[], PregatitCitire, RezultatCitire, RezultatActiune & { noi?: number }>({
  opts: OPT,
  pregateste: async (ctx) => {
    const t = await getTr();
    const locale: Loc = await getLocale();
    const cont = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
    if (!cont) return { gata: fara(t("Conectează-ți căsuța de email în Setări → Căsuța mea de email.", "Connect your mailbox in Settings → My mailbox.")) };
    const p = await pregatesteCitirea(ctx.db, { orgId: ctx.orgId, orgNume: ctx.orgName, locale, doarUserId: ctx.userId });
    if (!p.conturi.length) {
      const inCurs = p.eroriInitiale.some((e) => e.eroare === "in_curs");
      return { gata: { ok: true, noi: 0, mesaj: inCurs ? t("O verificare e deja în curs. Reîncearcă peste un minut.", "A check is already running. Try again in a minute.") : t("Nu ai emailuri trimise care să aștepte răspuns.", "You have no sent emails waiting for a reply.") } };
    }
    return { pregatit: p };
  },
  extern: ruleazaCitirea,
  salveaza: async (ctx, p, rez) => {
    const t = await getTr();
    const r = await salveazaCitirea(ctx.db, p, rez);
    await programeazaApeluri(ctx.db, ctx.orgId);
    pagina(ctx);
    if (r.erori.length && !r.noi) return { ok: false, noi: 0, error: t("Nu am putut citi căsuța. Verifică parola și serverul IMAP în Setări → Căsuța mea de email.", "We could not read the mailbox. Check the password and the IMAP server in Settings → My mailbox.") };
    return { ok: true, noi: r.noi, mesaj: r.noi ? t(`${r.noi} răspunsuri noi.`, `${r.noi} new replies.`) : t("Niciun răspuns nou.", "No new replies.") };
  },
});

export async function verificaRaspunsuriAcum(orgSlug: string): Promise<RezultatActiune & { noi?: number }> {
  return proteja("agent-email-raspunsuri", () => citireFaze(orgSlug), fara);
}

const citit = withOrgSession(async (ctx, id: string): Promise<RezultatActiune> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  await ctx.db.update(agentEmailRaspunsuri).set({ citit: true }).where(and(eq(agentEmailRaspunsuri.orgId, ctx.orgId), eq(agentEmailRaspunsuri.mesajId, m.id)));
  pagina(ctx);
  return { ok: true };
}, OPT);

export async function marcheazaRaspunsCitit(orgSlug: string, id: string): Promise<RezultatActiune> {
  return proteja("agent-email-citit", () => citit(orgSlug, id), fara);
}

const apelFacut = withOrgSession(async (ctx, id: string): Promise<RezultatActiune> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  await ctx.db.update(agentEmailMesaje).set({ apelFacutLa: new Date() }).where(and(eq(agentEmailMesaje.orgId, ctx.orgId), eq(agentEmailMesaje.id, m.id)));
  pagina(ctx);
  return { ok: true };
}, OPT);

export async function marcheazaApelFacut(orgSlug: string, id: string): Promise<RezultatActiune> {
  return proteja("agent-email-apel-facut", () => apelFacut(orgSlug, id), fara);
}

// ===== Scriptul de apel (sarcina „Sună”) =====
export type DateApel = { script: ScriptApel; persoana: string; rol: string | null; telefon: string | null };

const scriptAct = withOrgSession(async (ctx, id: string): Promise<DateApel | null> => {
  const t = await getTr();
  const m = await ciornaEditabila(ctx, t, id);
  const [f] = await ctx.db
    .select({ nume: companies.nume, d177: companies.d177, mec20: companies.mec20, regimFiscal: companies.regimFiscal, profit: companies.profit, ca: companies.ca, impozit: companies.impozit, sumaDisponibila: companies.sumaDisponibila })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), eq(companies.id, m.companyId)))
    .limit(1);
  if (!f) return null;
  const [c] = m.contactId ? await ctx.db.select({ telefon: contacts.telefon, rol: contacts.rol }).from(contacts).where(and(eq(contacts.orgId, ctx.orgId), eq(contacts.id, m.contactId))).limit(1) : [];
  const suma = sumaEfectiva(f.sumaDisponibila, { regimFiscal: f.regimFiscal, profit: f.profit, ca: f.ca, impozit: f.impozit });
  // Mecanismul propus în email are prioritate; altfel, ce e marcat pe fișa firmei.
  const mecanism = m.mecanism === "d177" ? "d177" : m.mecanism === "sponsorizare" ? "mec20" : mecanismDinMarcaje(f.d177, f.mec20);
  const prenume = numeCurat(m.catreNume).split(/\s+/)[0] || null;
  return {
    script: scriptApel({ firma: f.nume, ong: ctx.orgName, askLei: suma.suma, mecanism, sezon: propozitieSezon(ferestreFiscale(new Date())), persoana: prenume }),
    persoana: numeCurat(m.catreNume),
    rol: c?.rol ?? m.catreRol,
    telefon: c?.telefon ?? null,
  };
}, OPT);

export async function getScriptApel(orgSlug: string, id: string): Promise<DateApel | null> {
  try {
    return await scriptAct(orgSlug, id);
  } catch (e) {
    unstable_rethrow(e);
    return null;
  }
}

// ===== Administrator: PDF-ul general și alegerile organizației =====
const incarcaPdfAct = withOrgAdmin(async (ctx, fd: FormData): Promise<RezultatActiune> => {
  const t = await getTr();
  const f = fd.get("pdf");
  if (!(f instanceof File) || !f.size) return fara(t("Alege un fișier PDF.", "Choose a PDF file."));
  if (f.size > 3_000_000) return fara(t("PDF-ul e prea mare (maximum 3 MB). Comprimă-l și încearcă din nou.", "The PDF is too large (3 MB maximum). Compress it and try again."));
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== "%PDF-") return fara(t("Fișierul nu e un PDF.", "The file is not a PDF."));
  const numeFisier = (f.name || "One-Pager.pdf").replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 100) || "One-Pager.pdf";
  const b64 = buf.toString("base64");
  await ctx.db.delete(agentEmailPdf).where(and(eq(agentEmailPdf.orgId, ctx.orgId), isNull(agentEmailPdf.companyId)));
  await ctx.db.insert(agentEmailPdf).values({ orgId: ctx.orgId, companyId: null, nume: numeFisier.toLowerCase().endsWith(".pdf") ? numeFisier : `${numeFisier}.pdf`, continutB64: b64, marime: buf.length, hash: amprentaPdf(b64), incarcatDe: ctx.userId, incarcatDeNume: ctx.userName ?? ctx.userEmail });
  pagina(ctx);
  return { ok: true };
}, OPT);

export async function incarcaPdfGeneral(orgSlug: string, fd: FormData): Promise<RezultatActiune> {
  return proteja("agent-email-pdf", () => incarcaPdfAct(orgSlug, fd), fara);
}

const stergePdfAct = withOrgAdmin(async (ctx): Promise<RezultatActiune> => {
  await ctx.db.delete(agentEmailPdf).where(and(eq(agentEmailPdf.orgId, ctx.orgId), isNull(agentEmailPdf.companyId)));
  pagina(ctx);
  return { ok: true };
}, OPT);

export async function stergePdfGeneral(orgSlug: string): Promise<RezultatActiune> {
  return proteja("agent-email-pdf-sterge", () => stergePdfAct(orgSlug), fara);
}

const setariAct = withOrgAdmin(async (ctx, limitaZi: number, pixelActiv: boolean): Promise<RezultatActiune> => {
  const t = await getTr();
  const l = Math.floor(Number(limitaZi));
  if (!Number.isFinite(l) || l < 1 || l > LIMITA_ZI_MAXIMA) return fara(t(`Limita trebuie să fie între 1 și ${LIMITA_ZI_MAXIMA} de emailuri pe zi.`, `The limit must be between 1 and ${LIMITA_ZI_MAXIMA} emails per day.`));
  await ctx.db
    .insert(agentEmailSetari)
    .values({ orgId: ctx.orgId, limitaZi: l, pixelActiv: pixelActiv === true })
    .onConflictDoUpdate({ target: agentEmailSetari.orgId, set: { limitaZi: l, pixelActiv: pixelActiv === true, updatedAt: new Date() } });
  pagina(ctx);
  return { ok: true, mesaj: t("Alegerile au fost salvate.", "Your choices were saved.") };
}, OPT);

export async function salveazaSetariAgent(orgSlug: string, limitaZi: number, pixelActiv: boolean): Promise<RezultatActiune> {
  return proteja("agent-email-setari", () => setariAct(orgSlug, limitaZi, pixelActiv), fara);
}

