import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import type { OrgContext } from "@/lib/auth/guard";
import { donatiiImportate, donatorNotite, donatoriReali, fundraisingDonations } from "@/lib/db/schema";
import { recalculeazaCacheDonatori } from "@/lib/donatori-import-server";

// Îmbinarea donatorilor care sunt aceeași persoană (apelată din pagina „Dubluri”, după confirmare). Rulează în tranzacția acțiunii: ori se face tot, ori nimic.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RezultatImbinare = { ok: true; donatiiMutate: number; importuriMutate: number; notiteMutate: number; imbinati: number } | { ok: false; eroare: string };

// Îmbină donatorii secundari în cel principal: donațiile și notițele trec la principal, datele de contact lipsă se completează, iar acordurile se combină
// în sensul cel mai prudent (dezabonare sau refuz de e-mail ale oricăruia rămân valabile). Jurnal de audit.
// O adresă cu abonament recurent activ nu se îmbină: următoarea plată ar recrea donatorul.
export async function executaImbinare(ctx: Pick<OrgContext, "db" | "orgId" | "userId">, primarId: string, secundariIds: string[]): Promise<RezultatImbinare> {
  const secundari = [...new Set((Array.isArray(secundariIds) ? secundariIds : []).filter((x) => typeof x === "string" && UUID.test(x) && x !== primarId))];
  if (!UUID.test(String(primarId)) || secundari.length === 0 || secundari.length > 10) return { ok: false, eroare: "Alege donatorul de păstrat și cel puțin un donator de îmbinat (cel mult 10)." };

  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:donatori-import`}, 0))`);
  const toti = await ctx.db.select().from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId));
  const primar = toti.find((d) => d.id === primarId);
  const sec = secundari.map((id) => toti.find((d) => d.id === id));
  if (!primar || sec.some((d) => !d)) return { ok: false, eroare: "Unul dintre donatori nu mai există. Reîncarcă pagina." };
  const secundariRanduri = sec as typeof toti;

  for (const s of secundariRanduri) {
    const [abon] = (await ctx.db.execute(sql`select 1 as x from fundraising_donations where org_id = ${ctx.orgId} and lower(email_donator) = ${s.email.toLowerCase()} and recurenta and abonament_activ limit 1`)) as unknown as { x: number }[];
    if (abon) return { ok: false, eroare: `${s.email} are o donație recurentă activă. Îmbinarea ar fi anulată de următoarea plată; îmbină-i după ce abonamentul se oprește.` };
  }

  // Câmpuri combinate: completăm ce lipsește la principal; acordurile se combină prudent.
  const toate = [primar, ...secundariRanduri];
  const prima = <T>(f: (d: (typeof toti)[number]) => T | null | undefined, gol: (v: T) => boolean = (v) => !v): T | null => {
    for (const d of toate) {
      const v = f(d);
      if (v !== null && v !== undefined && !gol(v)) return v;
    }
    return null;
  };
  const maxData = (f: (d: (typeof toti)[number]) => Date | null) => toate.map(f).filter((x): x is Date => x !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const minData = (f: (d: (typeof toti)[number]) => Date | null) => toate.map(f).filter((x): x is Date => x !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const consimtamant = toate.some((d) => d.consimtamantEmail === false) ? false : toate.some((d) => d.consimtamantEmail === true) ? true : null;
  const reapelLa = toate.map((d) => d.reapelLa).filter((x): x is string => x !== null).sort().reverse()[0] ?? null;

  let donatiiMutate = 0;
  let importuriMutate = 0;
  let notiteMutate = 0;
  for (const s of secundariRanduri) {
    const don = await ctx.db
      .update(fundraisingDonations)
      .set({ emailDonator: primar.email })
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), sql`lower(${fundraisingDonations.emailDonator}) = ${s.email.toLowerCase()}`))
      .returning({ id: fundraisingDonations.id });
    donatiiMutate += don.length;
    const imp = await ctx.db
      .update(donatiiImportate)
      .set({ email: primar.email.toLowerCase() })
      .where(and(eq(donatiiImportate.orgId, ctx.orgId), sql`lower(${donatiiImportate.email}) = ${s.email.toLowerCase()}`))
      .returning({ id: donatiiImportate.id });
    importuriMutate += imp.length;
    const note = await ctx.db.update(donatorNotite).set({ donatorId: primar.id }).where(and(eq(donatorNotite.orgId, ctx.orgId), eq(donatorNotite.donatorId, s.id))).returning({ id: donatorNotite.id });
    notiteMutate += note.length;
  }
  await ctx.db.delete(donatoriReali).where(and(eq(donatoriReali.orgId, ctx.orgId), inArray(donatoriReali.id, secundari)));
  await ctx.db
    .update(donatoriReali)
    .set({
      telefon: prima((d) => d.telefon), localitate: prima((d) => d.localitate), judet: prima((d) => d.judet), responsabil: prima((d) => d.responsabil) ?? primar.responsabil,
      consimtamantEmail: consimtamant, consimtamantWhatsapp: toate.some((d) => d.consimtamantWhatsapp), dezabonatEmailLa: minData((d) => d.dezabonatEmailLa),
      sunatLa: maxData((d) => d.sunatLa), multumitLa: maxData((d) => d.multumitLa), aRaspuns: toate.some((d) => d.aRaspuns), nuContactat: toate.some((d) => d.nuContactat),
      reapelLa, wbStage: prima((d) => d.wbStage),
      adaugatLa: minData((d) => d.adaugatLa) ?? primar.adaugatLa,
    })
    .where(and(eq(donatoriReali.orgId, ctx.orgId), eq(donatoriReali.id, primar.id)));
  await recalculeazaCacheDonatori(ctx, [primar.email.toLowerCase()]);

  await inregistreazaAudit(ctx.db as never, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "donatori_imbinati",
    entitate: "donator",
    entitateId: primar.id,
    detalii: {
      pastrat: primar.email,
      imbinati: secundariRanduri.map((s) => ({ email: s.email, nume: s.nume, telefon: s.telefon, localitate: s.localitate })),
      donatiiMutate, importuriMutate, notiteMutate,
    },
  });
  return { ok: true, donatiiMutate, importuriMutate, notiteMutate, imbinati: secundari.length };
}
