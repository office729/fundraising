import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq, inArray, ne } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import type { OrgContext } from "@/lib/auth/guard";
import { agentEmailMesaje, appUsers, companies, companyNotite, companyStageLog, contacts, fundraisingPages, memberships } from "@/lib/db/schema";
import { linkDezabonare } from "@/lib/dezabonare";
import { EroareUtilizator } from "@/lib/erori";
import { anteteDezabonare } from "@/lib/formular230-email-template";
import { raporteazaAvertisment } from "@/lib/monitoring";

import { trimiteMesajSmtp, type ConexiuneSmtp, type RezultatTrimitere as RezultatSmtp } from "./conexiuni";
import { areProbleme, ciornaExpirata, corpEmailHtml, corpEmailText, ETAPE_INITIALE, genereazaMessageId, salutPentru, verificaCiorna, type SubsolEmail } from "./reguli";
import { blocheazaFirma, bazaUrl, citesteCont, citesteMesaj, citesteSetari, elibereazaLimita, esteUuid, linkPaginaPublica, parolaCont, pdfPentru, revendicaPentruTrimitere, rezervaLimita, type Db } from "./store";
import { textEroareConexiune } from "./texte";
import type { RezultatTrimitere } from "./tipuri";
import { verificaCazAcum, verificaDestinatarAcum } from "./verificari";

// Trimiterea unui email din căsuța colegului, în trei faze (withOrgFaze). NICIODATĂ automat: pornește doar din acțiunea explicită a colegului care deține căsuța.
//  1) tranzacție scurtă: verificări, revendicare atomică (ciorna -> se_trimite), rezervarea locului în limita zilnică;
//  2) fără bază de date: SMTP;
//  3) tranzacție nouă: „trimis” / „eroare”, notă pe firma din CRM, etapa din pipeline.

type Tr = (ro: string, en: string) => string;

export type IntrareTrimitere = { id: string; subiect: string; mesaj: string; pdfHash?: string | null; subiectAles?: "A" | "B" | "editat" };

export type PregatitTrimitere = {
  test: boolean;
  orgId: string;
  userId: string;
  userNume: string;
  mesajId: string;
  companyId: string;
  contactId: string | null;
  firma: string;
  tip: "prim" | "revenire";
  catre: { nume: string; email: string };
  conexiune: ConexiuneSmtp;
  deAdresa: string;
  deNume: string;
  subiect: string;
  html: string;
  text: string;
  messageId: string;
  inReplyTo: string | null;
  referinte: string | null;
  anteteExtra: Record<string, string>;
  pdf: { nume: string; base64: string } | null;
  pdfNume: string | null;
  limitaRezervata: boolean;
  seIntoarceLa: string; // adresa la care pleacă (testul: a celui logat)
};

const curataText = (s: string, max: number) => s.replace(/\r/g, "").trim().slice(0, max);

// Subsolul de dezabonare al emailurilor către firme: răspunsul „STOP” e mereu valabil, iar linkul semnat duce la lista de suprimare a organizației.
function subsol(orgNume: string, orgId: string, email: string): SubsolEmail {
  return { text: `Dacă nu doriți să mai primiți mesaje de la ${orgNume}, răspundeți cu STOP sau`, linkDezabonare: linkDezabonare(bazaUrl(), orgId, email), etichetaLink: "dezabonați-vă aici." };
}

type CorpIn = { mesaj: string; semnatura: string; sub: SubsolEmail; pixel: string | null };
function corpuri(c: CorpIn) {
  const pixelUrl = c.pixel ? `${bazaUrl()}/api/agent-email/deschis/${c.pixel}.gif` : undefined;
  return { html: corpEmailHtml(c.mesaj, c.semnatura, { subsol: c.sub, pixelUrl }), text: corpEmailText(c.mesaj, c.semnatura, c.sub) };
}

function anteteDezabonareMailto(adresa: string, link: string): Record<string, string> {
  const baza = anteteDezabonare(link);
  return { ...baza, "List-Unsubscribe": `<mailto:${adresa}?subject=STOP>, ${baza["List-Unsubscribe"]}` };
}

// Faza 1. Dacă ceva nu e în regulă, întoarce `gata` (nimic nu s-a scris); dacă după revendicare nu mai încape în limita zilnică, aruncă EroareUtilizator (tranzacția se anulează, deci revendicarea dispare).
export async function pregatesteTrimiterea(ctx: OrgContext, t: Tr, i: IntrareTrimitere): Promise<{ gata: RezultatTrimitere } | { pregatit: PregatitTrimitere }> {
  const nu = (error: string, probleme?: RezultatTrimitere["probleme"]) => ({ gata: { ok: false, error, probleme } as RezultatTrimitere });
  if (!esteUuid(i.id)) return nu(t("Ciorna nu mai există.", "The draft no longer exists."));
  const subiect = curataText(i.subiect, 200).replace(/[\r\n]+/g, " ");
  const mesaj = curataText(i.mesaj, 8000);
  if (!subiect || !mesaj) return nu(t("Subiectul și mesajul nu pot fi goale.", "The subject and message cannot be empty."));
  const m = await citesteMesaj(ctx.db, ctx.orgId, i.id);
  if (!m) return nu(t("Ciorna nu mai există.", "The draft no longer exists."));
  if (m.stare === "trimis") return nu(t("Emailul a fost deja trimis.", "The email was already sent."));
  const acum = new Date();
  if (m.stare === "se_trimite" && m.seTrimiteLa && acum.getTime() - m.seTrimiteLa.getTime() < 10 * 60_000) return nu(t("Emailul e deja în curs de trimitere (alt clic sau alt tab). Reîmprospătează pagina.", "The email is already being sent (another click or tab). Refresh the page."));
  // Emailul pleacă din căsuța colegului: doar el îl poate trimite. Altcineva poate prelua ciorna (schimbaExpeditor) și o trimite din căsuța lui.
  if (m.deUserId !== ctx.userId) return nu(t(`Emailul pleacă din căsuța lui ${m.deNume}, iar doar el îl poate trimite. Alege „Trimite de la mine” în fereastra de confirmare ca să-l trimiți din căsuța ta.`, `The email is sent from ${m.deNume}'s mailbox and only they can send it. Choose “Send from me” in the confirmation window to send it from your own mailbox.`));
  const cont = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
  if (!cont) return nu(t("Conectează-ți căsuța de email în Setări → Căsuța mea de email.", "Connect your mailbox in Settings → My mailbox."));
  const parola = parolaCont(cont);
  if (!parola) return nu(t("Parola căsuței nu mai poate fi citită. Introdu-o din nou în Setări → Căsuța mea de email.", "The mailbox password can no longer be read. Enter it again in Settings → My mailbox."));
  if (m.tip === "prim" && ciornaExpirata(m.createdAt, acum)) return nu(t("Ciorna are peste 14 zile: datele firmei se pot fi schimbat. Șterge-o și generează una nouă.", "The draft is over 14 days old: the company data may have changed. Delete it and generate a new one."));

  // Verificarea automată a textului (aceeași ca în pagină, refăcută pe server cu textul care chiar pleacă).
  const [alte, colegi, cazPg] = await Promise.all([
    ctx.db
      .select({ firma: agentEmailMesaje.firmaNume })
      .from(agentEmailMesaje)
      .where(and(eq(agentEmailMesaje.orgId, ctx.orgId), inArray(agentEmailMesaje.stare, ["ciorna", "eroare"]), ne(agentEmailMesaje.id, m.id), ne(agentEmailMesaje.companyId, m.companyId)))
      .limit(300),
    ctx.db
      .select({ name: appUsers.name })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(eq(memberships.orgId, ctx.orgId), ne(memberships.userId, ctx.userId))),
    m.cazPageId ? ctx.db.select({ slug: fundraisingPages.slug }).from(fundraisingPages).where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.id, m.cazPageId))).limit(1) : Promise.resolve([]),
  ]);
  const probleme = verificaCiorna({
    firma: m.firmaNume,
    contactNume: m.catreNume,
    subiect,
    mesaj,
    tip: m.tip as "prim" | "revenire",
    alteFirme: alte.map((x) => x.firma),
    alteNumeColegi: colegi.map((c) => c.name ?? "").filter(Boolean),
    linkuriPermise: cazPg[0] ? [linkPaginaPublica(ctx.orgSlug, cazPg[0].slug)] : [],
    salutAsteptat: salutPentru(m.catreNume).salut,
  });
  if (areProbleme(probleme)) return nu(t("Verificarea automată a oprit trimiterea. Corectează textul marcat cu roșu.", "The automatic check stopped the send. Fix the text marked in red."), probleme);

  // Două trimiteri simultane către aceeași firmă se așază una după alta (blocare în tranzacție), apoi a doua vede prima.
  await blocheazaFirma(ctx.db, ctx.orgId, m.companyId);
  const motiv = await verificaDestinatarAcum(ctx.db, ctx.orgId, { mesajId: m.id, companyId: m.companyId, contactId: m.contactId, email: m.catreEmail, tip: m.tip as "prim" | "revenire" }, t);
  if (motiv) return nu(motiv);
  const motivCaz = await verificaCazAcum(ctx.db, ctx.orgId, m.cazPageId, t);
  if (motivCaz) return nu(motivCaz);
  if (m.cazNume && m.cazPageId === null) return nu(t("Campania propusă nu mai există. Generează din nou ciorna.", "The proposed campaign no longer exists. Generate the draft again."));

  // Atașamentul: exact PDF-ul văzut la confirmare (amprenta trebuie să coincidă).
  let pdf: Awaited<ReturnType<typeof pdfPentru>> = null;
  if (m.tip === "prim") {
    pdf = await pdfPentru(ctx.db, ctx.orgId, m.companyId);
    if (!pdf) return nu(t("Nu există niciun PDF de atașat (One Pager). Administratorul trebuie să încarce PDF-ul general în pagina Agent email.", "There is no PDF to attach (One Pager). An administrator must upload the general PDF on the Email agent page."));
    if (!i.pdfHash) return nu(t("Confirmă atașamentul în fereastra de trimitere.", "Confirm the attachment in the send window."));
    if (i.pdfHash !== pdf.hash) return nu(t("PDF-ul atașat s-a schimbat de când l-ai văzut. Deschide din nou confirmarea și verifică-l.", "The attached PDF changed since you saw it. Open the confirmation again and check it."));
  }

  // Revendicare atomică + loc în limita zilnică (în aceeași tranzacție: dacă limita e plină, revendicarea se anulează).
  const setari = await citesteSetari(ctx.db, ctx.orgId);
  const pixel = setari.pixelActiv ? (m.pixel ?? randomBytes(16).toString("hex")) : null;
  const messageId = m.messageId ?? genereazaMessageId(m.id, cont.adresa);
  const aprobatLa = new Date();
  const revendicat = await revendicaPentruTrimitere(ctx.db, ctx.orgId, m.id, {
    subiect,
    mesaj,
    messageId,
    pixel,
    pdfHash: pdf?.hash ?? null,
    pdfNume: pdf?.nume ?? null,
    aprobatDe: ctx.userId,
    aprobatDeNume: ctx.userName ?? ctx.userEmail,
    aprobatLa,
    subiectAles: i.subiectAles ?? (subiect === m.aiSubiect ? "A" : subiect === m.subiectAlt ? "B" : "editat"),
  });
  if (!revendicat) return nu(t("Emailul e deja în curs de trimitere (alt clic sau alt tab). Reîmprospătează pagina.", "The email is already being sent (another click or tab). Refresh the page."));
  if (!(await rezervaLimita(ctx.db, ctx.orgId, ctx.userId, setari.limitaZi))) {
    throw new EroareUtilizator(t(`Ai atins limita de ${setari.limitaZi} de emailuri pe zi (protejează reputația domeniului tău). Continuă mâine.`, `You have reached the limit of ${setari.limitaZi} emails per day (it protects your domain's reputation). Continue tomorrow.`));
  }

  const sub = subsol(ctx.orgName, ctx.orgId, m.catreEmail);
  const { html, text } = corpuri({ mesaj, semnatura: cont.semnatura, sub, pixel });
  return {
    pregatit: {
      test: false,
      orgId: ctx.orgId,
      userId: ctx.userId,
      userNume: ctx.userName ?? ctx.userEmail,
      mesajId: m.id,
      companyId: m.companyId,
      contactId: m.contactId,
      firma: m.firmaNume,
      tip: m.tip as "prim" | "revenire",
      catre: { nume: m.catreNume, email: m.catreEmail },
      conexiune: { host: cont.smtpHost, port: cont.smtpPort, user: cont.smtpUser, parola },
      deAdresa: cont.adresa,
      deNume: m.deNume,
      subiect,
      html,
      text,
      messageId,
      inReplyTo: m.tip === "revenire" ? m.inReplyTo : null,
      referinte: m.tip === "revenire" ? m.referinte : null,
      anteteExtra: anteteDezabonareMailto(cont.adresa, linkDezabonare(bazaUrl(), ctx.orgId, m.catreEmail)),
      pdf: pdf ? { nume: pdf.nume, base64: pdf.base64 } : null,
      pdfNume: pdf?.nume ?? null,
      limitaRezervata: true,
      seIntoarceLa: m.catreEmail,
    },
  };
}

// Faza 2.
export async function expediaza(p: PregatitTrimitere): Promise<RezultatSmtp> {
  return trimiteMesajSmtp(p.conexiune, {
    deNume: p.deNume,
    deAdresa: p.deAdresa,
    catre: p.seIntoarceLa,
    subiect: p.test ? `[TEST — pentru ${p.catre.nume}, ${p.firma}] ${p.subiect}` : p.subiect,
    html: p.html,
    text: p.text,
    messageId: p.messageId,
    inReplyTo: p.inReplyTo,
    referinte: p.referinte,
    anteteExtra: p.test ? undefined : p.anteteExtra,
    pdf: p.pdf,
  });
}

// Nota din istoricul firmei + etapa din pipeline (doar după o trimitere reușită, apăsată de coleg).
async function noteazaTrimiterea(db: Db, p: PregatitTrimitere): Promise<void> {
  const nota = `Agent email${p.tip === "revenire" ? " (revenire)" : ""}→ ${p.catre.nume} (${p.catre.email}): „${p.subiect}”${p.pdfNume ? ` + ${p.pdfNume}` : ""}`;
  await db.insert(companyNotite).values({ orgId: p.orgId, companyId: p.companyId, text: nota.slice(0, 1000), createdBy: p.userId });
  if (p.tip !== "prim") return;
  const [f] = await db.select({ stage: companies.stage, status: companies.status }).from(companies).where(and(eq(companies.orgId, p.orgId), eq(companies.id, p.companyId))).limit(1);
  if (!f || !ETAPE_INITIALE.includes(f.stage)) return;
  const mutat = await db
    .update(companies)
    .set({ stage: "onepager" })
    .where(and(eq(companies.orgId, p.orgId), eq(companies.id, p.companyId), eq(companies.stage, f.stage)))
    .returning({ id: companies.id });
  if (mutat.length) await db.insert(companyStageLog).values({ orgId: p.orgId, companyId: p.companyId, fromStage: f.stage, toStage: "onepager", fromStatus: f.status, toStatus: f.status, byUserId: p.userId });
}

// Faza 3.
export async function inchideTrimiterea(ctx: OrgContext, t: Tr, p: PregatitTrimitere, r: RezultatSmtp): Promise<RezultatTrimitere> {
  const acum = new Date();
  if (r.ok) {
    await ctx.db
      .update(agentEmailMesaje)
      .set({ stare: "trimis", trimisLa: acum, eroare: null, updatedAt: acum })
      .where(and(eq(agentEmailMesaje.orgId, p.orgId), eq(agentEmailMesaje.id, p.mesajId)));
    // Evidența (nota, etapa, auditul) nu strică o trimitere reușită: dacă eșuează, e raportată, nu aruncată.
    try {
      await ctx.db.transaction(async (sp) => {
        await noteazaTrimiterea(sp as unknown as Db, p);
        await inregistreazaAudit(sp as unknown as Db, { orgId: p.orgId, actorAppUserId: p.userId, actiune: "agent_email_trimis", entitate: "agent_email", entitateId: p.mesajId, detalii: { companyId: p.companyId, tip: p.tip } });
      });
    } catch (e) {
      raporteazaAvertisment("agent-email-evidenta", `trimis, dar evidența a eșuat: ${e instanceof Error ? e.message.slice(0, 120) : "eroare"}`);
    }
    return { ok: true, mesaj: t(`Trimis către ${p.catre.nume} (${p.firma}).`, `Sent to ${p.catre.nume} (${p.firma}).`) };
  }
  const text = textEroareConexiune(t, r.eroare, "SMTP");
  if (r.sigur) {
    await ctx.db
      .update(agentEmailMesaje)
      .set({ stare: "eroare", eroare: text.slice(0, 500), updatedAt: acum })
      .where(and(eq(agentEmailMesaje.orgId, p.orgId), eq(agentEmailMesaje.id, p.mesajId)));
    if (p.limitaRezervata) await elibereazaLimita(ctx.db, p.orgId, p.userId);
    // Serverul a spus clar că adresa nu există: o marcăm în CRM, ca să nu mai fie folosită (ca la donatori).
    if (r.fel === "adresa_inexistenta" && p.contactId) await ctx.db.update(contacts).set({ emailStatus: "invalid" }).where(and(eq(contacts.orgId, p.orgId), eq(contacts.id, p.contactId)));
    return { ok: false, error: text };
  }
  // Nu știm dacă a plecat (timeout după trimiterea datelor): îl lăsăm „se_trimite”, ca să nu pornească al doilea email; colegul verifică în Trimise.
  await ctx.db
    .update(agentEmailMesaje)
    .set({ eroare: t("Neconfirmat: serverul nu a răspuns. Verifică în folderul „Trimise” al căsuței înainte să reîncerci.", "Unconfirmed: the server did not respond. Check your mailbox “Sent” folder before retrying.").slice(0, 500), updatedAt: acum })
    .where(and(eq(agentEmailMesaje.orgId, p.orgId), eq(agentEmailMesaje.id, p.mesajId)));
  return { ok: false, error: t("Nu am primit confirmarea serverului de email. Verifică în folderul „Trimise” al căsuței înainte să reîncerci; în 10 minute poți relua trimiterea.", "We did not get a confirmation from the email server. Check your mailbox “Sent” folder before retrying; you can retry in 10 minutes.") };
}

// „Trimite-mi un test”: același email (cu atașament și semnătură), dar la adresa celui logat. Nu schimbă ciorna, nu consumă din limită, nu e marcat „trimis”.
export async function pregatesteTestul(ctx: OrgContext, t: Tr, i: IntrareTrimitere): Promise<{ gata: RezultatTrimitere } | { pregatit: PregatitTrimitere }> {
  const nu = (error: string) => ({ gata: { ok: false, error } as RezultatTrimitere });
  if (!esteUuid(i.id)) return nu(t("Ciorna nu mai există.", "The draft no longer exists."));
  const subiect = curataText(i.subiect, 200).replace(/[\r\n]+/g, " ");
  const mesaj = curataText(i.mesaj, 8000);
  if (!subiect || !mesaj) return nu(t("Subiectul și mesajul nu pot fi goale.", "The subject and message cannot be empty."));
  const m = await citesteMesaj(ctx.db, ctx.orgId, i.id);
  if (!m) return nu(t("Ciorna nu mai există.", "The draft no longer exists."));
  if (m.deUserId !== ctx.userId) return nu(t(`Testul pleacă din căsuța lui ${m.deNume}. Alege „Trimite de la mine” ca să-l trimiți din căsuța ta.`, `The test is sent from ${m.deNume}'s mailbox. Choose “Send from me” to send it from your own mailbox.`));
  const cont = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
  if (!cont) return nu(t("Conectează-ți căsuța de email în Setări → Căsuța mea de email.", "Connect your mailbox in Settings → My mailbox."));
  const parola = parolaCont(cont);
  if (!parola) return nu(t("Parola căsuței nu mai poate fi citită. Introdu-o din nou în Setări → Căsuța mea de email.", "The mailbox password can no longer be read. Enter it again in Settings → My mailbox."));
  let pdf: Awaited<ReturnType<typeof pdfPentru>> = null;
  if (m.tip === "prim") {
    pdf = await pdfPentru(ctx.db, ctx.orgId, m.companyId);
    if (!pdf) return nu(t("Nu există niciun PDF de atașat (One Pager).", "There is no PDF to attach (One Pager)."));
    if (i.pdfHash && i.pdfHash !== pdf.hash) return nu(t("PDF-ul s-a schimbat între timp. Deschide din nou confirmarea.", "The PDF changed in the meantime. Open the confirmation again."));
  }
  const sub = subsol(ctx.orgName, ctx.orgId, ctx.userEmail);
  const { html, text } = corpuri({ mesaj, semnatura: cont.semnatura, sub, pixel: null });
  return {
    pregatit: {
      test: true,
      orgId: ctx.orgId,
      userId: ctx.userId,
      userNume: ctx.userName ?? ctx.userEmail,
      mesajId: m.id,
      companyId: m.companyId,
      contactId: m.contactId,
      firma: m.firmaNume,
      tip: m.tip as "prim" | "revenire",
      catre: { nume: m.catreNume, email: m.catreEmail },
      conexiune: { host: cont.smtpHost, port: cont.smtpPort, user: cont.smtpUser, parola },
      deAdresa: cont.adresa,
      deNume: m.deNume,
      subiect,
      html,
      text,
      messageId: `<test.${m.id.replace(/-/g, "")}.${Date.now()}@${cont.adresa.split("@")[1] ?? "localhost"}>`,
      inReplyTo: null,
      referinte: null,
      anteteExtra: {},
      pdf: pdf ? { nume: pdf.nume, base64: pdf.base64 } : null,
      pdfNume: pdf?.nume ?? null,
      limitaRezervata: false,
      seIntoarceLa: ctx.userEmail,
    },
  };
}

export function rezultatTest(t: Tr, p: PregatitTrimitere, r: RezultatSmtp): RezultatTrimitere {
  return r.ok ? { ok: true, mesaj: t(`Test trimis la ${p.seIntoarceLa}.`, `Test sent to ${p.seIntoarceLa}.`) } : { ok: false, error: textEroareConexiune(t, r.eroare, "SMTP") };
}

