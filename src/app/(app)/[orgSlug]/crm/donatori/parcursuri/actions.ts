"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { linkDezabonare } from "@/lib/dezabonare";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { anteteDezabonare } from "@/lib/formular230-email-template";
import {
  CHEI_PARCURS,
  PARCURSURI,
  subiectRandat,
  valideazaPasi,
  type CheieParcurs,
  type EroareParcurs,
  type PasParcurs,
  type RezultatParcurs,
} from "@/lib/parcursuri-donatori";
import { candidatiPas, citesteConfig, htmlParcurs, rezultateParcurs } from "@/lib/parcursuri-server";

// Parcursuri pentru donatori (Welcome, Save, Upgrade): un administrator le pornește, le oprește și le editează; oricine din echipă le vede. Trimiterea o face cron-ul zilnic.
const OPTIUNI = { modul: "parcursuri-donatori" as const };
const VALORI_EXEMPLU = { prenume: "Ana", suma: "100", total: "350", campanie: "Campania ta" };

export type PasStatistica = { trimiseTotal: number; trimiseUltimele30Zile: number };
export type ParcursDate = {
  cheie: CheieParcurs;
  nume: string;
  descriere: string;
  eveniment: string;
  obiectiv: string;
  activ: boolean;
  activDin: string | null;
  pasi: PasParcurs[];
  pasiImplicit: PasParcurs[];
  esteSalvat: boolean;
  statistici: PasStatistica[];
  // Câți donatori ar primi pasul 1 la următoarea rulare (estimare la momentul deschiderii paginii); null = nu se poate estima.
  eligibiliPas1: number | null;
  // Ce a adus parcursul (donatori înscriși, conversii, venit); null dacă nu s-a putut calcula.
  rezultate: RezultatParcurs | null;
};
export type DateParcursuri = { parcursuri: ParcursDate[]; poateEdita: boolean; emailConfigurat: boolean; organizatie: string };

export const citesteParcursuri = withOrgSession(async (ctx): Promise<DateParcursuri> => {
  const acum = new Date();
  const org = { id: ctx.orgId, slug: ctx.orgSlug, name: ctx.orgName };
  const config = await citesteConfig(ctx.db, ctx.orgId);
  const stat = (await ctx.db.execute(sql`
    select cheie, pas, count(*)::int as total, (count(*) filter (where creat_la > now() - interval '30 days'))::int as recente
    from parcursuri_trimiteri where org_id = ${ctx.orgId} and stare = 'trimis' group by cheie, pas`)) as unknown as { cheie: CheieParcurs; pas: number; total: number; recente: number }[];

  const parcursuri: ParcursDate[] = [];
  for (const cheie of CHEI_PARCURS) {
    const def = PARCURSURI[cheie];
    const cfg = config[cheie];
    let eligibili: number | null = null;
    try {
      // Pentru Welcome, o estimare nu are sens înainte de activare (primesc doar cei care donează prima dată după pornire).
      eligibili = cheie === "welcome" && !cfg.activDin ? null : (await candidatiPas(ctx.db, org, cheie, cfg, 0, acum)).length;
    } catch {
      eligibili = null;
    }
    let rezultate: RezultatParcurs | null = null;
    try {
      rezultate = await rezultateParcurs(ctx.db, ctx.orgId, cheie, cfg.pasi.length);
    } catch {
      rezultate = null;
    }
    parcursuri.push({
      cheie,
      nume: def.nume,
      descriere: def.descriere,
      eveniment: def.eveniment,
      obiectiv: def.obiectiv,
      activ: cfg.activ,
      activDin: cfg.activDin ? cfg.activDin.toISOString() : null,
      pasi: cfg.pasi,
      pasiImplicit: def.pasi,
      esteSalvat: cfg.esteSalvata,
      statistici: cfg.pasi.map((_, i) => {
        const r = stat.find((x) => x.cheie === cheie && x.pas === i + 1);
        return { trimiseTotal: r?.total ?? 0, trimiseUltimele30Zile: r?.recente ?? 0 };
      }),
      eligibiliPas1: eligibili,
      rezultate,
    });
  }
  return { parcursuri, poateEdita: ctx.role === "owner" || ctx.role === "admin", emailConfigurat: emailConfigurat(), organizatie: ctx.orgName };
}, OPTIUNI);

export type RezultatSalvare = { ok: true; activ: boolean } | { ok: false; eroare: string; erori?: EroareParcurs[] };

const esteCheie = (x: unknown): x is CheieParcurs => typeof x === "string" && (CHEI_PARCURS as readonly string[]).includes(x);

// Salvează textele și starea unui parcurs. Pornirea (de la oprit la activ) fixează momentul activării: Welcome pornește doar pentru prime donații de după acest moment.
export const salveazaParcurs = withOrgAdmin(async (ctx, cheie: string, pasi: unknown, activ: boolean): Promise<RezultatSalvare> => {
  if (!esteCheie(cheie)) return { ok: false, eroare: "Parcurs necunoscut." };
  const v = valideazaPasi(pasi, cheie);
  if (!v.ok) return { ok: false, eroare: v.erori[0]?.mesaj ?? "Verifică textele parcursului.", erori: v.erori };
  const vrea = activ === true;
  if (vrea && !emailConfigurat()) return { ok: false, eroare: "Trimiterea de e-mailuri nu este configurată pe platformă, deci parcursul nu poate porni." };
  const [vechi] = (await ctx.db.execute(sql`select activ from parcursuri_donatori where org_id = ${ctx.orgId} and cheie = ${cheie}`)) as unknown as { activ: boolean }[];
  const pornitAcum = vrea && !vechi?.activ;
  await ctx.db.execute(sql`
    insert into parcursuri_donatori (org_id, cheie, activ, activ_din, pasi, updated_at, updated_by)
    values (${ctx.orgId}, ${cheie}, ${vrea}, ${pornitAcum ? sql`now()` : sql`null`}, ${JSON.stringify(v.pasi)}::text::jsonb, now(), ${ctx.userId})
    on conflict (org_id, cheie) do update set
      activ = excluded.activ,
      activ_din = case when ${pornitAcum} then now() else parcursuri_donatori.activ_din end,
      pasi = excluded.pasi, updated_at = now(), updated_by = excluded.updated_by`);
  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: pornitAcum ? "parcurs_donatori_pornit" : vechi?.activ && !vrea ? "parcurs_donatori_oprit" : "parcurs_donatori_salvat",
    entitate: "parcurs_donatori",
    detalii: { cheie, pasi: v.pasi.length },
  });
  revalidatePath(`/${ctx.orgSlug}/crm/donatori/parcursuri`);
  return { ok: true, activ: vrea };
}, OPTIUNI);

export type RezultatTest = { ok: true; catre: string } | { ok: false; eroare: string };

// Trimite pasul ales (cu textele nesalvate din editor) la adresa utilizatorului conectat, cu valori de exemplu, ca să vadă exact cum arată e-mailul.
export const trimiteTestParcurs = withOrgAdmin(async (ctx, cheie: string, pasi: unknown, indexPas: number): Promise<RezultatTest> => {
  if (!esteCheie(cheie)) return { ok: false, eroare: "Parcurs necunoscut." };
  const v = valideazaPasi(pasi, cheie);
  if (!v.ok) return { ok: false, eroare: v.erori[0]?.mesaj ?? "Verifică textele parcursului." };
  const pas = v.pasi[indexPas];
  if (!pas) return { ok: false, eroare: "Pas inexistent." };
  if (!emailConfigurat()) return { ok: false, eroare: "Trimiterea de e-mailuri nu este configurată pe platformă." };
  if (!(await verificaLimitaRata("parcursuri-test", ctx.orgId, 10, 60))) return { ok: false, eroare: "Ai trimis prea multe teste într-o oră. Revino mai târziu." };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro";
  const valori = { ...VALORI_EXEMPLU, organizatie: ctx.orgName };
  const linkDez = linkDezabonare(baseUrl, ctx.orgId, ctx.userEmail);
  try {
    await trimiteEmail({
      to: ctx.userEmail,
      subiect: `[TEST] ${subiectRandat(pas.subiect, valori)}`,
      html: htmlParcurs({ orgName: ctx.orgName, corp: pas.corp, valori, buton: pas.buton, link: `${baseUrl}/${ctx.orgSlug}`, linkDezabonare: linkDez }),
      headers: anteteDezabonare(linkDez),
    });
  } catch (e) {
    throw new EroareUtilizator(mesajSigur(e, "Nu am putut trimite e-mailul de test. Încearcă din nou.", "parcursuri-test"));
  }
  return { ok: true, catre: ctx.userEmail };
}, OPTIUNI);
