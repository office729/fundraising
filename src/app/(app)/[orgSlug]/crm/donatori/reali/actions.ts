"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { curataTextNota, esteRezultatApel, esteTipNota } from "@/lib/cronologie-donator";
import { donatorNotite, donatoriReali } from "@/lib/db/schema";
import { marcheazaAdresa } from "@/lib/igiena-email-server";

export type ActionState = { error: string | null };

export type RezultatCautareDonator = { id: string; nume: string; email: string };

// Căutarea globală din antet (Ctrl+K): donatorii reali ai organizației, după nume sau email.
export const cautaDonatoriReali = withOrgSession(async (ctx, termen: string): Promise<RezultatCautareDonator[]> => {
  const q = termen.trim().slice(0, 80);
  if (q.length < 2) return [];
  const model = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return ctx.db
    .select({ id: donatoriReali.id, nume: donatoriReali.nume, email: donatoriReali.email })
    .from(donatoriReali)
    .where(and(eq(donatoriReali.orgId, ctx.orgId), or(ilike(donatoriReali.nume, model), ilike(donatoriReali.email, model))))
    .orderBy(desc(donatoriReali.ultimaDonatieLa))
    .limit(8);
});

// O înregistrare în fișa donatorului: notiță, apel (cu rezultat), întâlnire sau e-mail trimis de echipă. Apare în cronologie.
export const adaugaNotitaDonator = withOrgSession(async (ctx, donatorId: string, text: string, tip: string = "nota", rezultat: string | null = null): Promise<ActionState> => {
  const trimmed = curataTextNota(text);
  if (!trimmed) return { error: "Textul e gol." };
  const tipCurat = esteTipNota(tip) ? tip : "nota";
  const rezultatCurat = tipCurat === "apel" && esteRezultatApel(rezultat) ? rezultat : null;
  const donator = await ctx.db
    .select({ id: donatoriReali.id })
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, donatorId), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!donator[0]) return { error: "Donatorul nu a fost găsit." };
  await ctx.db.insert(donatorNotite).values({ id: randomUUID(), orgId: ctx.orgId, donatorId, text: trimmed, tip: tipCurat, rezultat: rezultatCurat, createdBy: ctx.userId });
  return { error: null };
});

export const editeazaNotitaDonator = withOrgSession(async (ctx, id: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const r = await ctx.db
    .update(donatorNotite)
    .set({ text: trimmed, editatLa: new Date() })
    .where(and(eq(donatorNotite.id, id), eq(donatorNotite.orgId, ctx.orgId)))
    .returning({ id: donatorNotite.id });
  if (!r[0]) return { error: "Notița nu a fost găsită." };
  return { error: null };
});

export const stergeNotitaDonator = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  await ctx.db.delete(donatorNotite).where(and(eq(donatorNotite.id, id), eq(donatorNotite.orgId, ctx.orgId)));
  return { error: null };
});

// Starea adresei de e-mail, din fișă: un administrator poate marca o adresă „respinsă” (știe că nu mai există) sau o poate repara (a fost corectată între timp). „A marcat mesajul ca spam”
// nu se schimbă de aici: acea persoană nu mai vrea mesaje.
export const seteazaStareAdresaDonator = withOrgAdmin(async (ctx, donatorId: string, stare: string): Promise<ActionState> => {
  if (stare !== "ok" && stare !== "respins") return { error: "Stare necunoscută." };
  const [d] = await ctx.db
    .select({ email: donatoriReali.email, emailStare: donatoriReali.emailStare })
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, donatorId), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!d) return { error: "Donatorul nu a fost găsit." };
  if (d.emailStare === "reclamat") return { error: "Persoana a marcat un mesaj ca spam: nu mai primește mesaje și starea nu se schimbă." };
  await marcheazaAdresa(ctx.db, ctx.orgId, d.email, stare, stare === "respins" ? "Marcată de un administrator" : null);
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: stare === "respins" ? "adresa_marcata_respinsa" : "adresa_reparata", entitate: "donator", entitateId: donatorId });
  return { error: null };
});
