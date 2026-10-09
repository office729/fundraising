import { and, eq } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";
import { aziRo } from "@/lib/performanta-masurare";
import { perioadaVecina, rezolvaPerioada } from "@/lib/performanta-perioada";
import { SABLOANE_ROLURI, SABLON_PE_ID, sablonEfectiv, valideazaTinte, type SablonEfectiv, type SetariSabloane, type SetariSablon, type TintaOrg } from "@/lib/performanta-sabloane";
import { valoareCrm } from "@/lib/performanta-surse";

// Ținte reale pentru șabloanele de roluri: salvate pe organizație (crm_kv), editabile doar de administratori, cu valori de referință din CRM
// ca punct de plecare pentru discuția cu echipa. Nu inventăm ținte: aici se introduc cele agreate.

type Db = OrgContext["db"];
const CALE = "performanta/sabloane";
const esteAdmin = (ctx: OrgContext) => ctx.role === "owner" || ctx.role === "admin";

export async function incarcaSetariSabloane(db: Db, orgId: string): Promise<SetariSabloane> {
  const [r] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, CALE))).limit(1);
  const brut = (r?.data ?? {}) as Record<string, Partial<SetariSablon>>;
  const out: SetariSabloane = {};
  for (const [id, s] of Object.entries(brut)) {
    if (!SABLON_PE_ID.has(id) || !s || typeof s !== "object") continue;
    const tinte: Record<string, TintaOrg> = {};
    for (const [titlu, t] of Object.entries(s.tinte ?? {})) {
      const x = t as Partial<TintaOrg>;
      tinte[titlu] = { tinta: typeof x.tinta === "number" ? x.tinta : null, tintaMax: typeof x.tintaMax === "number" ? x.tintaMax : null, nivelInitial: typeof x.nivelInitial === "number" ? x.nivelInitial : null };
    }
    out[id] = { confirmat: s.confirmat === true, confirmatLa: typeof s.confirmatLa === "string" ? s.confirmatLa : null, tinte };
  }
  return out;
}

export async function sabloaneEfective(db: Db, orgId: string): Promise<SablonEfectiv[]> {
  const setari = await incarcaSetariSabloane(db, orgId);
  return SABLOANE_ROLURI.map((s) => sablonEfectiv(s, setari[s.id]));
}

async function scrie(ctx: OrgContext, data: SetariSabloane) {
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CALE, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data, updatedAt: new Date() } });
}

export async function salveazaSablonOrg(ctx: OrgContext, sablonId: string, tinte: Record<string, TintaOrg>, confirmat: boolean): Promise<{ ok: true } | { ok: false; eroare: string }> {
  if (!esteAdmin(ctx)) return { ok: false, eroare: "Țintele șabloanelor le stabilește un administrator." };
  const sablon = SABLON_PE_ID.get(sablonId);
  if (!sablon) return { ok: false, eroare: "Șablonul nu există." };
  const eroare = valideazaTinte(sablon, tinte);
  if (eroare) return { ok: false, eroare };
  // Un șablon se poate confirma doar când fiecare rezultat-cheie măsurabil are o țintă introdusă de organizație (nu moștenită din exemplu).
  if (confirmat) {
    const lipsa = sablon.obiective.flatMap((o) => o.rezultate).filter((r) => r.metoda !== "binar" && !tinte[r.titlu]);
    if (lipsa.length > 0) return { ok: false, eroare: `Ca să confirmi șablonul, stabilește ținta pentru: ${lipsa.map((r) => `„${r.titlu}”`).join(", ")}.` };
  }
  const toate = await incarcaSetariSabloane(ctx.db, ctx.orgId);
  const vechi = toate[sablonId];
  toate[sablonId] = { confirmat, confirmatLa: confirmat ? (vechi?.confirmat && vechi.confirmatLa ? vechi.confirmatLa : aziRo()) : null, tinte };
  await scrie(ctx, toate);
  return { ok: true };
}

export async function resetSablonOrg(ctx: OrgContext, sablonId: string): Promise<{ ok: true } | { ok: false; eroare: string }> {
  if (!esteAdmin(ctx)) return { ok: false, eroare: "Țintele șabloanelor le stabilește un administrator." };
  const toate = await incarcaSetariSabloane(ctx.db, ctx.orgId);
  delete toate[sablonId];
  await scrie(ctx, toate);
  return { ok: true };
}

export type ReferintaCrm = { metrica: string; trimestruAnterior: number | null; etichetaAnterior: string; acelasiAnTrecut: number | null; etichetaAnTrecut: string };

// Valorile CRM din trimestrul anterior și din același trimestru al anului trecut, pentru rezultatele-cheie din CRM ale unui șablon.
export async function referinteCrm(ctx: OrgContext): Promise<Record<string, ReferintaCrm>> {
  const acum = rezolvaPerioada(null, aziRo());
  const ant = perioadaVecina(acum, -1);
  const anTrecut = rezolvaPerioada(`${Number(acum.cod.slice(0, 4)) - 1}${acum.cod.slice(4)}`);
  const metrici = [...new Set(SABLOANE_ROLURI.flatMap((s) => s.obiective.flatMap((o) => o.rezultate)).filter((r) => r.sursa === "crm" && r.metrica).map((r) => r.metrica as string))];
  const out: Record<string, ReferintaCrm> = {};
  for (const m of metrici) {
    out[m] = {
      metrica: m,
      trimestruAnterior: await valoareCrm(ctx.db, ctx.orgId, m, ant.start, ant.end),
      etichetaAnterior: ant.eticheta,
      acelasiAnTrecut: await valoareCrm(ctx.db, ctx.orgId, m, anTrecut.start, anTrecut.end),
      etichetaAnTrecut: anTrecut.eticheta,
    };
  }
  return out;
}
