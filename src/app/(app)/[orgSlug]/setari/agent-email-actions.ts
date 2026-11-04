"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { testeazaImap, testeazaSmtp, type EroareConexiune } from "@/lib/agent-email/conexiuni";
import { curataSemnatura } from "@/lib/agent-email/reguli";
import { valideazaDateCont, type DateCont, type EroareCont } from "@/lib/agent-email/retea";
import { citesteCont, contPublic, parolaCont } from "@/lib/agent-email/store";
import { textEroareConexiune } from "@/lib/agent-email/texte";
import type { StareContEmail } from "@/lib/agent-email/tipuri";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { agentEmailConturi } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { getTr } from "@/lib/i18n/tr-server";
import { criptareConfigurata, cripteaza } from "@/lib/secret-box";

// Căsuța de email a FIECĂRUI utilizator (SMTP pentru trimitere, IMAP pentru citirea răspunsurilor). Fiecare își conectează doar propria adresă; parola se criptează
// (lib/secret-box.ts) și nu se mai afișează: rămân doar ultimele caractere. Modul „ai-agenti”, ca restul agentului email.
const OPTIUNI = { modul: "ai-agenti" as const };

export type { StareContEmail };

export const obtineStareContEmail = withOrgSession(async (ctx): Promise<StareContEmail> => {
  const cont = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
  return { criptareActiva: criptareConfigurata(), cont: cont ? contPublic(cont) : null };
}, OPTIUNI);

export type IntrareCont = Omit<DateCont, "parola"> & { parola: string; semnatura: string };
export type RezultatCont = { error: string | null; campuri?: EroareCont[] };

const salveaza = withOrgSession(async (ctx, intrare: IntrareCont): Promise<RezultatCont> => {
  const t = await getTr();
  if (!criptareConfigurata()) throw new EroareUtilizator(t("Salvarea parolelor nu e activată pe această platformă (lipsește cheia de criptare). Scrie-ne ca s-o activăm.", "Saving passwords is not enabled on this platform (the encryption key is missing). Write to us so we can enable it."));
  const existent = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
  const v = valideazaDateCont(intrare, Boolean(existent));
  if (!v.ok) return { error: t("Verifică câmpurile marcate.", "Check the highlighted fields."), campuri: v.erori };
  const d = v.date;
  // Parola salvată nu se mai folosește pe alt server sau cu alt utilizator: dacă s-au schimbat, se introduce din nou.
  if (existent && !d.parola && (existent.smtpHost !== d.smtpHost || existent.imapHost !== d.imapHost || existent.smtpUser !== d.smtpUser || existent.imapUser !== d.imapUser || existent.adresa !== d.adresa)) {
    return { error: t("Ai schimbat serverul, utilizatorul sau adresa: introdu din nou parola.", "You changed the server, username or address: enter the password again."), campuri: ["parola"] };
  }
  const semnatura = curataSemnatura(String(intrare.semnatura ?? ""));
  // Datele de conectare s-au schimbat => testele de până acum nu mai sunt valabile.
  const schimbat = !existent || existent.adresa !== d.adresa || existent.smtpHost !== d.smtpHost || existent.smtpPort !== d.smtpPort || existent.smtpUser !== d.smtpUser || existent.imapHost !== d.imapHost || existent.imapPort !== d.imapPort || existent.imapUser !== d.imapUser || d.parola !== "";
  const campuri = {
    adresa: d.adresa,
    semnatura,
    smtpHost: d.smtpHost,
    smtpPort: d.smtpPort,
    smtpUser: d.smtpUser,
    imapHost: d.imapHost,
    imapPort: d.imapPort,
    imapUser: d.imapUser,
    updatedAt: new Date(),
    ...(d.parola ? { parolaEnc: cripteaza(d.parola), amprenta: `…${d.parola.slice(-2)}` } : {}),
    ...(schimbat ? { smtpTestatLa: null, smtpEroare: null, imapTestatLa: null, imapEroare: null } : {}),
  };
  if (existent) {
    await ctx.db.update(agentEmailConturi).set(campuri).where(and(eq(agentEmailConturi.orgId, ctx.orgId), eq(agentEmailConturi.userId, ctx.userId)));
  } else {
    await ctx.db.insert(agentEmailConturi).values({ orgId: ctx.orgId, userId: ctx.userId, parolaEnc: cripteaza(d.parola), amprenta: `…${d.parola.slice(-2)}`, ...campuri });
  }
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "agent_email_cont_salvat", entitate: "agent_email_cont", detalii: { adresa: d.adresa } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  revalidatePath(`/${ctx.orgSlug}/crm/agent-email`);
  return { error: null };
}, OPTIUNI);

export async function salveazaContEmail(orgSlug: string, intrare: IntrareCont): Promise<RezultatCont> {
  try {
    return await salveaza(orgSlug, intrare);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut salva căsuța. Încearcă din nou.", "We could not save the mailbox. Please try again."), "agent-email-cont-salvare") };
  }
}

type Fel = "smtp" | "imap";
type Pregatit = { fel: Fel; host: string; port: number; user: string; parola: string };
type Rez = { ok: true } | { ok: false; eroare: EroareConexiune };

// Testul folosește parola SALVATĂ (nu pleacă spre browser) și trece prin trei faze: citire, conectare la server (fără bază de date), notarea rezultatului.
function testFaze(fel: Fel) {
  return withOrgFaze<[], Pregatit, Rez, { error: string | null }>({
    opts: OPTIUNI,
    pregateste: async (ctx) => {
      const t = await getTr();
      // Testul face o conexiune reală la serverul scris de utilizator: plafonăm încercările (altfel platforma ar putea fi folosită la scanări).
      if (!(await verificaLimitaRata("agent-email-test-conexiune", ctx.userId, 20, 60))) return { gata: { error: t("Prea multe teste de conexiune. Încearcă din nou peste o oră.", "Too many connection tests. Try again in an hour.") } };
      const cont = await citesteCont(ctx.db, ctx.orgId, ctx.userId);
      if (!cont) return { gata: { error: t("Salvează întâi datele căsuței.", "Save the mailbox details first.") } };
      const parola = parolaCont(cont);
      if (!parola) return { gata: { error: t("Parola salvată nu mai poate fi citită. Introdu-o din nou.", "The saved password can no longer be read. Enter it again.") } };
      return fel === "smtp"
        ? { pregatit: { fel, host: cont.smtpHost, port: cont.smtpPort, user: cont.smtpUser, parola } }
        : { pregatit: { fel, host: cont.imapHost, port: cont.imapPort, user: cont.imapUser, parola } };
    },
    extern: async (p) => (p.fel === "smtp" ? testeazaSmtp({ host: p.host, port: p.port, user: p.user, parola: p.parola }) : testeazaImap({ host: p.host, port: p.port, user: p.user, parola: p.parola })),
    salveaza: async (ctx, p, r) => {
      const t = await getTr();
      const text = r.ok ? null : textEroareConexiune(t, r.eroare, p.fel === "smtp" ? "SMTP" : "IMAP");
      await ctx.db
        .update(agentEmailConturi)
        .set(p.fel === "smtp" ? { smtpTestatLa: r.ok ? new Date() : null, smtpEroare: text?.slice(0, 300) ?? null } : { imapTestatLa: r.ok ? new Date() : null, imapEroare: text?.slice(0, 300) ?? null })
        .where(and(eq(agentEmailConturi.orgId, ctx.orgId), eq(agentEmailConturi.userId, ctx.userId)));
      revalidatePath(`/${ctx.orgSlug}/crm/setari`);
      return { error: text };
    },
  });
}

const testeazaSmtpFaze = testFaze("smtp");
const testeazaImapFaze = testFaze("imap");

export async function testeazaContSmtp(orgSlug: string): Promise<{ error: string | null }> {
  try {
    return await testeazaSmtpFaze(orgSlug);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut testa conexiunea. Încearcă din nou.", "We could not test the connection. Please try again."), "agent-email-test-smtp") };
  }
}

export async function testeazaContImap(orgSlug: string): Promise<{ error: string | null }> {
  try {
    return await testeazaImapFaze(orgSlug);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut testa conexiunea. Încearcă din nou.", "We could not test the connection. Please try again."), "agent-email-test-imap") };
  }
}

const deconecteaza = withOrgSession(async (ctx): Promise<{ error: string | null }> => {
  await ctx.db.delete(agentEmailConturi).where(and(eq(agentEmailConturi.orgId, ctx.orgId), eq(agentEmailConturi.userId, ctx.userId)));
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "agent_email_cont_sters", entitate: "agent_email_cont" });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  revalidatePath(`/${ctx.orgSlug}/crm/agent-email`);
  return { error: null };
}, OPTIUNI);

export async function deconecteazaContEmail(orgSlug: string): Promise<{ error: string | null }> {
  try {
    return await deconecteaza(orgSlug);
  } catch (e) {
    const t = await getTr();
    return { error: mesajSigur(e, t("Nu am putut deconecta căsuța. Încearcă din nou.", "We could not disconnect the mailbox. Please try again."), "agent-email-cont-stergere") };
  }
}
