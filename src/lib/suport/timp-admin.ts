import "server-only";

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, orgTimp, orgTimpTarife } from "@/lib/db/schema";
import { minuteDinTimer, type Categorie, type Executant, type IntrareTimp, type Moneda, type Tarife } from "@/lib/timp-custom";

// Operații ale echipei platformei asupra registrului de timp al unei organizații (vezi lib/timp-custom.ts). Apelantul a verificat deja isPlatformAdmin
// (lib/auth/platform-admin.ts). Citesc și scriu DOAR tabelele de timp; politicile RLS cer app.platform_admin.

export type RandTimp = {
  id: string;
  executant: Executant;
  categorie: Categorie;
  descriere: string;
  // null cât timp timerul rulează.
  minute: number | null;
  data: string;
  pornitLa: Date | null;
  opritLa: Date | null;
  creatDe: string | null;
};

export type DateTimp = { intrari: RandTimp[]; tarife: Tarife | null; actorId: string | null };

async function contextPlatforma(tx: Pick<typeof db, "execute">) {
  await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
}

// Ziua de azi în România (nu în UTC): o intrare scrisă la 00:30 e din ziua nouă.
const AZI_BUCURESTI = sql`(now() at time zone 'Europe/Bucharest')::date`;

const comuna = {
  id: orgTimp.id,
  executant: orgTimp.executant,
  categorie: orgTimp.categorie,
  descriere: orgTimp.descriere,
  minute: orgTimp.minute,
  data: orgTimp.data,
  pornitLa: orgTimp.pornitLa,
  opritLa: orgTimp.opritLa,
  creatDe: orgTimp.creatDe,
};

export async function citesteTimp(orgId: string, actorEmail: string): Promise<DateTimp> {
  return db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const intrari = (await tx.select(comuna).from(orgTimp).where(eq(orgTimp.orgId, orgId)).orderBy(desc(orgTimp.data), desc(orgTimp.creatLa))) as RandTimp[];
    const [t] = await tx.select().from(orgTimpTarife).where(eq(orgTimpTarife.orgId, orgId)).limit(1);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    return {
      intrari,
      tarife: t ? { claude: Number(t.tarifClaude), echipa: Number(t.tarifEchipa), moneda: t.moneda as Moneda } : null,
      actorId: actor?.id ?? null,
    };
  });
}

export async function adaugaIntrare(orgId: string, intrare: IntrareTimp, actorEmail: string): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    await tx.insert(orgTimp).values({ orgId, ...intrare, creatDe: actor?.id ?? null });
  });
}

export async function stergeIntrare(orgId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    await tx.delete(orgTimp).where(and(eq(orgTimp.id, id), eq(orgTimp.orgId, orgId)));
  });
}

// Pornește un timer: un rând cu pornit_la setat și minute null. Un singur timer pornit pe administrator (index unic): al doilea e refuzat cu un mesaj clar.
export async function porneste(orgId: string, intrare: Pick<IntrareTimp, "executant" | "categorie" | "descriere">, actorEmail: string): Promise<{ ok: true } | { ok: false; eroare: string }> {
  return db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    if (!actor) return { ok: false, eroare: "Contul tău nu a fost găsit." } as const;
    const [pornit] = await tx.select({ id: orgTimp.id }).from(orgTimp).where(and(eq(orgTimp.creatDe, actor.id), isNotNull(orgTimp.pornitLa), isNull(orgTimp.opritLa))).limit(1);
    if (pornit) return { ok: false, eroare: "Ai deja un timer pornit. Oprește-l întâi." } as const;
    await tx.insert(orgTimp).values({ orgId, ...intrare, minute: null, data: sql`${AZI_BUCURESTI}` as unknown as string, pornitLa: new Date(), creatDe: actor.id });
    return { ok: true } as const;
  });
}

// Oprește timerul propriu: calculează minutele (rotunjite în sus, minimum 1, plafon 24 h) și îl închide. Doar timerul pornit de același administrator, pe aceeași organizație.
export async function opreste(orgId: string, id: string, actorEmail: string): Promise<{ ok: true; minute: number } | { ok: false; eroare: string }> {
  return db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    const [rand] = await tx
      .select({ pornitLa: orgTimp.pornitLa })
      .from(orgTimp)
      .where(and(eq(orgTimp.id, id), eq(orgTimp.orgId, orgId), eq(orgTimp.creatDe, actor?.id ?? "00000000-0000-0000-0000-000000000000"), isNotNull(orgTimp.pornitLa), isNull(orgTimp.opritLa)))
      .limit(1);
    if (!rand?.pornitLa) return { ok: false, eroare: "Timerul nu mai e pornit." } as const;
    const acum = new Date();
    const minute = minuteDinTimer(rand.pornitLa.getTime(), acum.getTime());
    await tx.update(orgTimp).set({ opritLa: acum, minute }).where(eq(orgTimp.id, id));
    return { ok: true, minute } as const;
  });
}

export async function scrieTarife(orgId: string, tarife: Tarife, actorEmail: string): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    const valori = { tarifClaude: tarife.claude.toFixed(2), tarifEchipa: tarife.echipa.toFixed(2), moneda: tarife.moneda };
    await tx
      .insert(orgTimpTarife)
      .values({ orgId, ...valori, actualizatDe: actor?.id ?? null })
      .onConflictDoUpdate({ target: orgTimpTarife.orgId, set: { ...valori, actualizatLa: new Date(), actualizatDe: actor?.id ?? null } });
  });
}

// Minutele înregistrate pe organizații (doar intrările terminate), pentru lista „ce diferă la fiecare” și pentru panou.
export async function minutePeOrganizatii(): Promise<Record<string, number>> {
  try {
    return await db.transaction(async (tx) => {
      await contextPlatforma(tx);
      const rows = await tx.transaction((sp) =>
        sp
          .select({ orgId: orgTimp.orgId, total: sql<number>`coalesce(sum(${orgTimp.minute}), 0)::int` })
          .from(orgTimp)
          .where(isNotNull(orgTimp.minute))
          .groupBy(orgTimp.orgId),
      );
      return Object.fromEntries(rows.map((r) => [r.orgId, Number(r.total)]));
    });
  } catch {
    return {}; // tabelul încă nu există
  }
}
