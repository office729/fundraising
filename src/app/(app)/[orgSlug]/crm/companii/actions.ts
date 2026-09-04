"use server";

import { randomUUID } from "node:crypto";

import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

import { type OrgContext, withOrgSession } from "@/lib/auth/guard";
import { companies, companyNotite, companySponsorizari, contacts } from "@/lib/db/schema";

export type ActionState = { error: string | null };

// Recalculează cache-ul companies.suma_sponsorizata din SUM-ul real al
// company_sponsorizari — apelat după orice adăugare/ștergere de sponsorizare,
// ca lista de companii (care afișează cache-ul, nu recalculează live) să nu
// rămână desincronizată.
async function recalculeazaSumaSponsorizata(db: OrgContext["db"], companyId: string) {
  const [{ suma }] = await db
    .select({ suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int` })
    .from(companySponsorizari)
    .where(eq(companySponsorizari.companyId, companyId));
  await db.update(companies).set({ sumaSponsorizata: suma }).where(eq(companies.id, companyId));
}

// Marcaje "Cum sponsorizează" — autosave, un singur câmp per apel. Cald/Rece
// se exclud reciproc prin design (o singură coloană enum `temperatura`),
// Recurent/D177/mec20(20%)/Decembrie sunt independente.
export const comutaMarcaj = withOrgSession(
  async (
    ctx,
    companyId: string,
    marcaj: "cald" | "rece" | "recurent" | "d177" | "d177Incasat" | "mec20" | "decembrie",
    activ: boolean,
  ): Promise<ActionState> => {
    const set: Partial<typeof companies.$inferInsert> = {};
    if (marcaj === "cald") set.temperatura = activ ? "cald" : null;
    else if (marcaj === "rece") set.temperatura = activ ? "rece" : null;
    else if (marcaj === "recurent") set.recurent = activ;
    else if (marcaj === "d177") set.d177 = activ;
    else if (marcaj === "d177Incasat") set.d177Incasat = activ;
    else if (marcaj === "mec20") set.mec20 = activ;
    else if (marcaj === "decembrie") set.decembrie = activ;

    const r = await ctx.db
      .update(companies)
      .set(set)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
      .returning({ id: companies.id });
    if (!r[0]) return { error: "Firma nu a fost găsită." };
    return { error: null };
  },
);

export const seteazaResponsabil = withOrgSession(async (ctx, companyId: string, ownerId: string | null): Promise<ActionState> => {
  const r = await ctx.db
    .update(companies)
    .set({ ownerId })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

export const actualizeazaContract = withOrgSession(
  async (
    ctx,
    companyId: string,
    date: { numarContract: string | null; dataSemnare: string | null; contractStatus: "trimis" | "asteptare" | "semnat" | "anulat" | null },
  ): Promise<ActionState> => {
    const r = await ctx.db
      .update(companies)
      .set({ numarContract: date.numarContract, dataSemnare: date.dataSemnare, contractStatus: date.contractStatus })
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
      .returning({ id: companies.id });
    if (!r[0]) return { error: "Firma nu a fost găsită." };
    return { error: null };
  },
);

export type AdaugaSponsorizareState = ActionState;
export const adaugaSponsorizare = withOrgSession(
  async (ctx, _prev: AdaugaSponsorizareState, formData: FormData): Promise<AdaugaSponsorizareState> => {
    const companyId = String(formData.get("companyId") ?? "").trim();
    const suma = Math.round(Number(formData.get("suma")));
    const data = String(formData.get("data") ?? "").trim();
    const proiect = String(formData.get("proiect") ?? "").trim();
    const nota = String(formData.get("nota") ?? "").trim();

    if (!companyId || !Number.isFinite(suma) || suma <= 0) return { error: "Suma trebuie să fie un număr pozitiv." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data e obligatorie." };

    const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
    if (!firma[0]) return { error: "Firma nu a fost găsită." };

    await ctx.db.insert(companySponsorizari).values({
      id: randomUUID(),
      orgId: ctx.orgId,
      companyId,
      suma,
      data,
      proiect: proiect || null,
      nota: nota || null,
      createdBy: ctx.userId,
    });
    await recalculeazaSumaSponsorizata(ctx.db, companyId);
    return { error: null };
  },
);

export const stergeSponsorizare = withOrgSession(async (ctx, id: string, companyId: string): Promise<ActionState> => {
  const r = await ctx.db
    .delete(companySponsorizari)
    .where(and(eq(companySponsorizari.id, id), eq(companySponsorizari.orgId, ctx.orgId)))
    .returning({ id: companySponsorizari.id });
  if (!r[0]) return { error: "Sponsorizarea nu a fost găsită." };
  await recalculeazaSumaSponsorizata(ctx.db, companyId);
  return { error: null };
});

export const adaugaNotita = withOrgSession(async (ctx, companyId: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!firma[0]) return { error: "Firma nu a fost găsită." };
  await ctx.db.insert(companyNotite).values({ id: randomUUID(), orgId: ctx.orgId, companyId, text: trimmed, createdBy: ctx.userId });
  return { error: null };
});

export const editeazaNotita = withOrgSession(async (ctx, id: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const r = await ctx.db
    .update(companyNotite)
    .set({ text: trimmed, editatLa: new Date() })
    .where(and(eq(companyNotite.id, id), eq(companyNotite.orgId, ctx.orgId)))
    .returning({ id: companyNotite.id });
  if (!r[0]) return { error: "Notița nu a fost găsită." };
  return { error: null };
});

export const stergeNotita = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  await ctx.db.delete(companyNotite).where(and(eq(companyNotite.id, id), eq(companyNotite.orgId, ctx.orgId)));
  return { error: null };
});

export type AdaugaContactState = ActionState;
export const adaugaContact = withOrgSession(async (ctx, _prev: AdaugaContactState, formData: FormData): Promise<AdaugaContactState> => {
  const companyId = String(formData.get("companyId") ?? "").trim();
  const nume = String(formData.get("nume") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();

  if (!companyId || !nume) return { error: "Numele contactului e obligatoriu." };
  const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!firma[0]) return { error: "Firma nu a fost găsită." };

  await ctx.db.insert(contacts).values({
    id: randomUUID(),
    orgId: ctx.orgId,
    companyId,
    nume,
    rol: rol || null,
    email: email || null,
    telefon: telefon || null,
    linkedin: linkedin || null,
    createdBy: ctx.userId,
  });
  return { error: null };
});

export const stergeContact = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  await ctx.db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.orgId, ctx.orgId)));
  return { error: null };
});

export type AdaugaFirmaState = ActionState & { id?: string };
export const adaugaFirma = withOrgSession(async (ctx, _prev: AdaugaFirmaState, formData: FormData): Promise<AdaugaFirmaState> => {
  const nume = String(formData.get("nume") ?? "").trim();
  const cui = String(formData.get("cui") ?? "").trim();
  const judet = String(formData.get("judet") ?? "").trim();
  const industrie = String(formData.get("industrie") ?? "").trim();
  const site = String(formData.get("site") ?? "").trim();

  if (!nume) return { error: "Numele firmei e obligatoriu." };

  const id = randomUUID();
  await ctx.db.insert(companies).values({
    id,
    orgId: ctx.orgId,
    nume,
    cui: cui || null,
    judet: judet || null,
    industrie: industrie || null,
    site: site || null,
    updatedBy: ctx.userId,
  });
  return { error: null, id };
});

export type EditeazaFirmaState = ActionState;
export const editeazaFirma = withOrgSession(async (ctx, companyId: string, formData: FormData): Promise<EditeazaFirmaState> => {
  const str = (k: string) => {
    const v = formData.get(k);
    if (v == null) return undefined;
    const s = String(v).trim();
    return s || null;
  };
  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null || v === "") return undefined;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const nume = str("nume");
  if (nume === null) return { error: "Numele firmei e obligatoriu." };

  const r = await ctx.db
    .update(companies)
    .set({
      ...(nume !== undefined ? { nume } : {}),
      cui: str("cui"),
      judet: str("judet"),
      localitate: str("localitate"),
      adresa: str("adresa"),
      caen: str("caen"),
      industrie: str("industrie"),
      site: str("site"),
      linkedin: str("linkedin"),
      facebook: str("facebook"),
      administrator: str("administrator"),
      ca: num("ca"),
      profit: num("profit"),
      nrAngajati: num("nrAngajati"),
      nota: str("nota"),
      updatedBy: ctx.userId,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

// Ștergere = soft-delete (deletedAt), la fel ca /api/[orgSlug]/crm-companies —
// firma dispare din listă/statistici, dar rândul rămâne pentru audit/CRM PJ.
export const stergeFirma = withOrgSession(async (ctx, companyId: string): Promise<ActionState> => {
  const r = await ctx.db
    .update(companies)
    .set({ deletedAt: new Date(), updatedBy: ctx.userId })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

// "Calendar de lucru" — firmele cu o urmărire (followupAt) programată,
// cronologic. Coloana e reală, existentă deja (companies.followupAt) — nu e
// un tabel/entitate nou creat(ă) pentru acest buton.
export const getCalendarLucru = withOrgSession(async (ctx) => {
  return ctx.db
    .select({ id: companies.id, nume: companies.nume, followupAt: companies.followupAt, judet: companies.judet })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), isNotNull(companies.followupAt), sql`${companies.deletedAt} is null`))
    .orderBy(asc(companies.followupAt))
    .limit(200);
});

export type ImportCsvState = ActionState & { importate?: number; ignorate?: number };

const CSV_COLOANE = ["nume", "cui", "judet", "localitate", "caen", "industrie", "site", "administrator", "ca", "profit", "nrAngajati"] as const;

function parseCsvLine(line: string): string[] {
  // Parser CSV minimal, suficient pentru export standard (virgulă, ghilimele
  // duble pentru câmpuri cu virgulă/ghilimele interioare) — nu un parser RFC
  // 4180 complet, dar acoperă exporturile obișnuite din Excel/Google Sheets.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Import CSV real — antet obligatoriu, coloane recunoscute din CSV_COLOANE
// (restul sunt ignorate). Fără fișiere/Storage — textul CSV vine direct din
// formular (citit client-side cu FileReader, trimis ca string).
export const importaFirmeCsv = withOrgSession(async (ctx, csvText: string): Promise<ImportCsvState> => {
  const linii = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linii.length < 2) return { error: "Fișierul CSV e gol sau nu are decât antet." };

  const antet = parseCsvLine(linii[0]).map((h) => h.trim().toLowerCase());
  const indexNume = antet.indexOf("nume");
  if (indexNume === -1) return { error: "CSV-ul trebuie să aibă o coloană „nume”." };

  const coloaneIndex = CSV_COLOANE.map((c) => ({ col: c, idx: antet.indexOf(c.toLowerCase()) }));

  let importate = 0;
  let ignorate = 0;
  for (const linie of linii.slice(1)) {
    const valori = parseCsvLine(linie);
    const nume = valori[indexNume]?.trim();
    if (!nume) {
      ignorate++;
      continue;
    }
    const rand: Record<string, unknown> = { id: randomUUID(), orgId: ctx.orgId, nume, updatedBy: ctx.userId };
    for (const { col, idx } of coloaneIndex) {
      if (col === "nume" || idx === -1) continue;
      const v = valori[idx]?.trim();
      if (!v) continue;
      if (col === "ca" || col === "profit" || col === "nrAngajati") {
        const n = Math.round(Number(v.replace(/[^0-9-]/g, "")));
        if (Number.isFinite(n)) rand[col] = n;
      } else {
        rand[col] = v;
      }
    }
    await ctx.db.insert(companies).values(rand as typeof companies.$inferInsert);
    importate++;
  }

  return { error: null, importate, ignorate };
});
