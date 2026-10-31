"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { curataEvenimente, curataScopuri, prefixAfisat, valideazaUrlWebhook, type Eveniment, type Scop } from "@/lib/api-publica";
import { genereazaCheieApi, genereazaSecretWebhook, hashCheieApi } from "@/lib/api-publica-cripto";
import { proceseazaLivrari } from "@/lib/api-publica-server";
import { withOrgAdmin } from "@/lib/auth/guard";
import { apiChei, webhookEndpointuri, webhookLivrari } from "@/lib/db/schema";
import { criptareConfigurata, cripteaza } from "@/lib/secret-box";
import { getTr } from "@/lib/i18n/tr-server";

// Chei API și webhook-uri (pachetul IMPACT): le gestionează doar owner și administratorii. Cheia API și secretul webhook se arată o singură dată, la creare.
const OPTIUNI = { modul: "api-webhooks" as const };
const MAX_CHEI = 10;
const MAX_WEBHOOKURI = 5;

export type CheieListata = { id: string; nume: string; prefix: string; scopuri: Scop[]; creataLa: string; ultimaFolosireLa: string | null; revocata: boolean };
export type WebhookListat = { id: string; url: string; evenimente: Eveniment[]; activ: boolean; esecuriConsecutive: number; dezactivatMotiv: string | null; creatLa: string };
export type LivrareListata = { id: string; endpointId: string; eveniment: string; stare: string; incercari: number; ultimulCod: number | null; ultimaEroare: string | null; creatLa: string };
export type StareApi = { criptareActiva: boolean; chei: CheieListata[]; webhookuri: WebhookListat[]; livrari: LivrareListata[] };

export const obtineStareApi = withOrgAdmin(async (ctx): Promise<StareApi> => {
  const [chei, webhookuri, livrari] = await Promise.all([
    ctx.db.select().from(apiChei).where(eq(apiChei.orgId, ctx.orgId)).orderBy(desc(apiChei.createdAt)),
    ctx.db.select().from(webhookEndpointuri).where(eq(webhookEndpointuri.orgId, ctx.orgId)).orderBy(desc(webhookEndpointuri.createdAt)),
    ctx.db.select().from(webhookLivrari).where(eq(webhookLivrari.orgId, ctx.orgId)).orderBy(desc(webhookLivrari.createdAt)).limit(20),
  ]);
  return {
    criptareActiva: criptareConfigurata(),
    chei: chei.map((c) => ({ id: c.id, nume: c.nume, prefix: c.prefix, scopuri: curataScopuri(c.scopuri), creataLa: c.createdAt.toISOString(), ultimaFolosireLa: c.ultimaFolosireLa?.toISOString() ?? null, revocata: c.revocataLa !== null })),
    webhookuri: webhookuri.map((w) => ({ id: w.id, url: w.url, evenimente: curataEvenimente(w.evenimente), activ: w.activ, esecuriConsecutive: w.esecuriConsecutive, dezactivatMotiv: w.dezactivatMotiv, creatLa: w.createdAt.toISOString() })),
    livrari: livrari.map((l) => ({ id: l.id, endpointId: l.endpointId, eveniment: l.eveniment, stare: l.stare, incercari: l.incercari, ultimulCod: l.ultimulCod, ultimaEroare: l.ultimaEroare, creatLa: l.createdAt.toISOString() })),
  };
}, OPTIUNI);

export type RezultatCheie = { ok: true; cheie: string } | { ok: false; mesaj: string };

// Creează o cheie nouă: o întoarce o singură dată; în baza de date rămân doar hash-ul și un prefix.
export const creeazaCheieApi = withOrgAdmin(async (ctx, nume: string, scopuri: string[]): Promise<RezultatCheie> => {
  const t = await getTr();
  const numeCurat = String(nume ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!numeCurat) return { ok: false, mesaj: t("Dă cheii un nume (de exemplu „Integrarea cu Make”).", "Give the key a name (for example “Make integration”).") };
  const scopuriCurate = curataScopuri(scopuri);
  if (scopuriCurate.length === 0) return { ok: false, mesaj: t("Alege cel puțin o permisiune.", "Choose at least one permission.") };
  const [{ n }] = await ctx.db.select({ n: count() }).from(apiChei).where(and(eq(apiChei.orgId, ctx.orgId), isNull(apiChei.revocataLa)));
  if (n >= MAX_CHEI) return { ok: false, mesaj: t(`Ai deja ${MAX_CHEI} chei active. Revocă una pe care n-o mai folosești.`, `You already have ${MAX_CHEI} active keys. Revoke one you no longer use.`) };
  const cheie = genereazaCheieApi();
  await ctx.db.insert(apiChei).values({ orgId: ctx.orgId, nume: numeCurat, prefix: prefixAfisat(cheie), hash: hashCheieApi(cheie), scopuri: scopuriCurate, creatDe: ctx.userId });
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "cheie_api_creata", entitate: "cheie_api", detalii: { nume: numeCurat, scopuri: scopuriCurate } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true, cheie };
}, OPTIUNI);

export type RezultatSimplu = { ok: true } | { ok: false; mesaj: string };

export const revocaCheieApi = withOrgAdmin(async (ctx, id: string): Promise<RezultatSimplu> => {
  const t = await getTr();
  const r = await ctx.db.update(apiChei).set({ revocataLa: new Date() }).where(and(eq(apiChei.id, id), eq(apiChei.orgId, ctx.orgId), isNull(apiChei.revocataLa))).returning({ id: apiChei.id });
  if (r.length === 0) return { ok: false, mesaj: t("Cheia nu a fost găsită sau e deja revocată.", "The key was not found or is already revoked.") };
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "cheie_api_revocata", entitate: "cheie_api", entitateId: id });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

export type RezultatWebhook = { ok: true; secret: string } | { ok: false; mesaj: string };

// Adaugă o adresă la care trimitem evenimentele. Secretul de semnare se arată o singură dată; se păstrează criptat.
export const adaugaWebhook = withOrgAdmin(async (ctx, url: string, evenimente: string[]): Promise<RezultatWebhook> => {
  const t = await getTr();
  if (!criptareConfigurata()) return { ok: false, mesaj: t("Păstrarea secretelor nu e configurată pe platformă. Scrie-ne ca să o activăm.", "Secret storage is not configured on the platform. Write to us and we will enable it.") };
  const u = valideazaUrlWebhook(url);
  if (!u.ok) return { ok: false, mesaj: u.mesaj };
  const ev = curataEvenimente(evenimente);
  if (ev.length === 0) return { ok: false, mesaj: t("Alege cel puțin un eveniment.", "Choose at least one event.") };
  const [{ n }] = await ctx.db.select({ n: count() }).from(webhookEndpointuri).where(eq(webhookEndpointuri.orgId, ctx.orgId));
  if (n >= MAX_WEBHOOKURI) return { ok: false, mesaj: t(`Poți avea cel mult ${MAX_WEBHOOKURI} adrese. Șterge una pe care n-o mai folosești.`, `You can have at most ${MAX_WEBHOOKURI} addresses. Delete one you no longer use.`) };
  const secret = genereazaSecretWebhook();
  await ctx.db.insert(webhookEndpointuri).values({ orgId: ctx.orgId, url: u.url, secretEnc: cripteaza(secret), evenimente: ev, creatDe: ctx.userId });
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "webhook_adaugat", entitate: "webhook", detalii: { evenimente: ev } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true, secret };
}, OPTIUNI);

export const seteazaActivWebhook = withOrgAdmin(async (ctx, id: string, activ: boolean): Promise<RezultatSimplu> => {
  const t = await getTr();
  const r = await ctx.db
    .update(webhookEndpointuri)
    .set(activ ? { activ: true, esecuriConsecutive: 0, dezactivatMotiv: null } : { activ: false, dezactivatMotiv: "Oprit de un administrator" })
    .where(and(eq(webhookEndpointuri.id, id), eq(webhookEndpointuri.orgId, ctx.orgId)))
    .returning({ id: webhookEndpointuri.id });
  if (r.length === 0) return { ok: false, mesaj: t("Adresa nu a fost găsită.", "The address was not found.") };
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

export const stergeWebhook = withOrgAdmin(async (ctx, id: string): Promise<RezultatSimplu> => {
  const t = await getTr();
  const r = await ctx.db.delete(webhookEndpointuri).where(and(eq(webhookEndpointuri.id, id), eq(webhookEndpointuri.orgId, ctx.orgId))).returning({ id: webhookEndpointuri.id });
  if (r.length === 0) return { ok: false, mesaj: t("Adresa nu a fost găsită.", "The address was not found.") };
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "webhook_sters", entitate: "webhook", entitateId: id });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

// Test: pune un eveniment „test.ping” în coada adresei alese; trimiterea o face apoi „proceseazaLivrariAcum”.
export const pregatesteTestWebhook = withOrgAdmin(async (ctx, id: string): Promise<RezultatSimplu> => {
  const t = await getTr();
  const [e] = await ctx.db.select({ id: webhookEndpointuri.id }).from(webhookEndpointuri).where(and(eq(webhookEndpointuri.id, id), eq(webhookEndpointuri.orgId, ctx.orgId))).limit(1);
  if (!e) return { ok: false, mesaj: t("Adresa nu a fost găsită.", "The address was not found.") };
  const livrareId = crypto.randomUUID();
  await ctx.db.insert(webhookLivrari).values({
    id: livrareId,
    orgId: ctx.orgId,
    endpointId: id,
    eveniment: "test.ping",
    payload: { id: livrareId, tip: "test.ping", creat_la: new Date().toISOString(), date: { mesaj: "Test trimis din Setări → API și webhook-uri" } },
  });
  return { ok: true };
}, OPTIUNI);

// Retrimite o livrare eșuată: o repune în coadă, cu încercările de la zero.
export const retrimiteLivrare = withOrgAdmin(async (ctx, id: string): Promise<RezultatSimplu> => {
  const t = await getTr();
  const r = await ctx.db
    .update(webhookLivrari)
    .set({ stare: "in_asteptare", incercari: 0, urmatoareaIncercareLa: new Date(), ultimaEroare: null })
    .where(and(eq(webhookLivrari.id, id), eq(webhookLivrari.orgId, ctx.orgId), eq(webhookLivrari.stare, "esuat")))
    .returning({ id: webhookLivrari.id });
  if (r.length === 0) return { ok: false, mesaj: t("Livrarea nu a fost găsită sau nu e eșuată.", "The delivery was not found or has not failed.") };
  return { ok: true };
}, OPTIUNI);

export type RezultatTrimitere = { ok: true; trimise: number; esuate: number } | { ok: false; mesaj: string };

// Trimite acum ce e scadent pentru organizația aceasta (după test sau după o retrimitere). Rulează într-o tranzacție separată de cea a acțiunii, deci vede ce s-a salvat înainte.
export async function proceseazaLivrariAcum(orgSlug: string): Promise<RezultatTrimitere> {
  try {
    const org = await verificaAdminOrg(orgSlug);
    const r = await proceseazaLivrari(org, 10);
    revalidatePath(`/${orgSlug}/crm/setari`);
    return { ok: true, ...r };
  } catch {
    const t = await getTr();
    return { ok: false, mesaj: t("Nu am putut trimite acum. Încearcă din nou.", "We could not send right now. Please try again.") };
  }
}

const verificaAdminOrg = withOrgAdmin(async (ctx): Promise<string> => ctx.orgId, OPTIUNI);
