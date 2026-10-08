"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { getLimiteleEfective, subCota } from "@/lib/billing/quota";
import { cursEurRon } from "@/lib/curs-valutar";
import { appUsers, donatoriReali, fundraisingDonations, fundraisingPages, memberships } from "@/lib/db/schema";
import { crediteazaPaginaSiDonator } from "@/lib/fundraising-credit";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

export type OptiuniDonatorNou = { campanii: { id: string; titlu: string }[]; responsabili: string[] };

// Listele din dialogul „Donator nou”: campaniile organizației și colegii (pentru „Responsabil”).
export const getOptiuniDonatorNou = withOrgSession(async (ctx): Promise<OptiuniDonatorNou> => {
  const [campanii, membri] = await Promise.all([
    ctx.db.select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.orgId, ctx.orgId)).orderBy(desc(fundraisingPages.createdAt)).limit(300),
    ctx.db.select({ name: appUsers.name, email: appUsers.email }).from(memberships).innerJoin(appUsers, eq(appUsers.id, memberships.userId)).where(eq(memberships.orgId, ctx.orgId)),
  ]);
  return { campanii, responsabili: membri.map((m) => m.name || m.email).sort((a, b) => a.localeCompare(b, "ro")) };
});

export type DonatorNouInput = {
  nume: string;
  email: string;
  telefon: string;
  localitate: string;
  judet: string;
  responsabil: string;
  suma: number | null;
  moneda: "RON" | "EUR";
  pageId: string | null;
};

// Donator REAL adăugat de echipă (salvat pe server, apare în „Persoane fizice”). Dacă se completează suma, se înregistrează
// și donația (offline), pe campania aleasă — aceeași cale ca donația offline din pagina campaniei, deci totalul campaniei și
// totalul donatorului se actualizează identic. Suma în EUR se reține în lei la cursul zilei (totalurile sunt în lei).
export const adaugaDonatorNou = withOrgSession(async (ctx, input: DonatorNouInput): Promise<{ error: string | null; id?: string }> => {
  const nume = input.nume.trim().slice(0, 200);
  const email = normalizeazaEmail(input.email.trim());
  if (!nume) return { error: "Numele e obligatoriu." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Adaugă o adresă de email validă — donatorii se identifică după email." };

  const telefon = input.telefon.trim().slice(0, 200) || null;
  const localitate = input.localitate.trim().slice(0, 200) || null;
  const judet = input.judet.trim().slice(0, 100) || null;
  const responsabil = input.responsabil.trim().slice(0, 200) || null;
  const suma = input.suma != null && Number.isFinite(input.suma) ? input.suma : null;

  if (suma !== null && suma <= 0) return { error: "Suma trebuie să fie un număr pozitiv." };
  if (suma !== null && !input.pageId) return { error: "Alege campania / proiectul pentru care a donat." };
  if (suma !== null && ctx.role !== "owner" && ctx.role !== "admin") return { error: "Doar un admin poate înregistra o donație." };

  // Cota de persoane fizice: doar un donator NOU ocupă un loc.
  const [existent] = await ctx.db.select({ id: donatoriReali.id }).from(donatoriReali).where(and(eq(donatoriReali.orgId, ctx.orgId), eq(donatoriReali.email, email))).limit(1);
  if (!existent) {
    const limite = getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig);
    if (limite.contactePf !== null) {
      const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId));
      if (!subCota(n, limite.contactePf)) return { error: `Ai atins limita de ${limite.contactePf} persoane fizice a pachetului tău.` };
    }
  }

  if (suma !== null && input.pageId) {
    const [pagina] = await ctx.db.select({ id: fundraisingPages.id }).from(fundraisingPages).where(and(eq(fundraisingPages.id, input.pageId), eq(fundraisingPages.orgId, ctx.orgId))).limit(1);
    if (!pagina) return { error: "Campania nu a fost găsită." };

    let sumaLei = Math.round(suma);
    let sumaBani: number | null = null;
    let moneda: string | null = null;
    if (input.moneda === "EUR") {
      const curs = await cursEurRon();
      if (!curs) return { error: "Nu am putut afla cursul EUR → RON acum. Încearcă din nou sau înregistrează suma în RON." };
      sumaLei = Math.max(1, Math.round(suma * curs));
      sumaBani = Math.round(suma * 100);
      moneda = "EUR";
    }
    if (sumaLei < 1) return { error: "Introdu o sumă validă." };

    const donationId = randomUUID();
    await ctx.db.insert(fundraisingDonations).values({
      id: donationId,
      pageId: input.pageId,
      orgId: ctx.orgId,
      numeDonator: nume,
      emailDonator: email,
      telefonDonator: telefon,
      suma: sumaLei,
      sumaBani,
      moneda,
      anonim: false,
      consimtamantGdpr: false,
      consimtamantTermeni: false,
      consimtamantWhatsapp: false,
      consimtamantEmail: false,
      stripeSessionId: `manual_${donationId}`,
      recurenta: false,
      status: "reusita",
    });
    await crediteazaPaginaSiDonator(ctx.db, {
      pageId: input.pageId,
      orgId: ctx.orgId,
      suma: sumaLei,
      numeDonator: nume,
      emailDonator: email,
      telefonDonator: telefon,
      consimtamantWhatsapp: false,
      consimtamantEmail: null,
    });
    if (!existent) await ctx.db.update(donatoriReali).set({ metodaPlata: "Înregistrat de echipă" }).where(and(eq(donatoriReali.orgId, ctx.orgId), eq(donatoriReali.email, email)));
  } else if (!existent) {
    await ctx.db.insert(donatoriReali).values({ id: randomUUID(), orgId: ctx.orgId, nume, email, telefon, sursa: "Adăugat manual", metodaPlata: "—", totalDonat: 0, numarDonatii: 0 });
  }

  // Datele completate de echipă (nu le colectează pagina publică). Câmpurile lăsate goale nu șterg ce exista deja.
  await ctx.db
    .update(donatoriReali)
    .set({
      nume,
      ...(telefon ? { telefon } : {}),
      ...(localitate ? { localitate } : {}),
      ...(judet ? { judet } : {}),
      ...(responsabil ? { responsabil } : {}),
    })
    .where(and(eq(donatoriReali.orgId, ctx.orgId), eq(donatoriReali.email, email)));

  const [rand] = await ctx.db.select({ id: donatoriReali.id }).from(donatoriReali).where(and(eq(donatoriReali.orgId, ctx.orgId), eq(donatoriReali.email, email))).limit(1);
  return { error: null, id: rand?.id };
});