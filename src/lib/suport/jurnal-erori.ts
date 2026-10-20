import "server-only";

import { sql } from "drizzle-orm";

import type { db as dbType } from "@/lib/db";
import { db } from "@/lib/db";
import { eroriAplicatie } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { curataMesajEroare } from "@/lib/monitoring";
import { trebuieRaportat } from "@/lib/monitoring-categorii";

// Jurnal de erori pe organizație, fără date personale: mesajul trece prin curataMesajEroare (taie parametrii interogărilor,
// ascunde e-mailuri, telefoane, CNP, IBAN, tokenuri). Îl citesc owner/admin ai organizației și, DOAR cât timp organizația
// are un acces de suport activ, echipa platformei (vezi suport-acces.sql). Nu înlocuiește Sentry: e pentru diagnoza pe cont.

type Executor = typeof dbType;

const PASTRATE_PE_ORG = 300;
const ZILE_PASTRARE = 30;
const recente = new Map<string, number>();
// Erori deja jurnalizate (aceeași excepție trece prin mai multe straturi: acțiune → altă acțiune).
const deja = new WeakSet<object>();

// redirect()/notFound() din Next.js sunt excepții de control, iar EroareUtilizator e un mesaj pentru utilizator (validare, limită de pachet).
export function esteEroareDeJurnalizat(e: unknown): boolean {
  if (e instanceof EroareUtilizator) return false;
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) return false;
  return true;
}

export function mesajPentruJurnal(e: unknown): { mesaj: string; cod: string | null } {
  const brut = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  const cod = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code).slice(0, 40) : null;
  return { mesaj: curataMesajEroare(brut), cod };
}

async function inscrie(executor: Executor, orgId: string, zona: string, e: unknown): Promise<void> {
  if (e && typeof e === "object") {
    if (deja.has(e)) return;
    deja.add(e);
  }
  const { mesaj, cod } = mesajPentruJurnal(e);
  // Aceeași eroare în aceeași zonă, de cel mult o dată pe minut pe instanță: o buclă de erori nu are voie să încarce baza de date.
  if (!trebuieRaportat(recente, `${orgId}:${zona}:${mesaj}`, Date.now(), 60_000)) return;
  await executor.insert(eroriAplicatie).values({ orgId, zona: zona.slice(0, 80), cod, mesaj });
  // Păstrare limitată: ocazional se șterg erorile vechi și cele peste limita pe organizație.
  if (Math.random() < 0.05) {
    await executor.execute(sql`
      delete from erori_aplicatie
      where org_id = ${orgId}
        and (created_at < now() - ${ZILE_PASTRARE} * interval '1 day'
             or id in (select id from erori_aplicatie where org_id = ${orgId} order by created_at desc offset ${PASTRATE_PE_ORG}))
    `);
  }
}

// După ce tranzacția paginii/acțiunii a fost anulată: o tranzacție nouă, scurtă, cu contextul organizației. Nu aruncă niciodată.
export async function jurnalizeazaEroareOrg(orgId: string, zona: string, e: unknown): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
      await inscrie(tx as unknown as Executor, orgId, zona, e);
    });
  } catch {
    // jurnalul nu are voie să strice răspunsul
  }
}

// În interiorul unei tranzacții deschise (citiri secundare ale paginii): într-un savepoint, ca o scriere eșuată să nu anuleze pagina. Nu aruncă niciodată.
export async function jurnalizeazaEroareInTranzactie(exec: Executor, orgId: string, zona: string, e: unknown): Promise<void> {
  try {
    await exec.transaction(async (sp) => inscrie(sp as unknown as Executor, orgId, zona, e));
  } catch {
    // jurnalul nu are voie să strice pagina
  }
}
