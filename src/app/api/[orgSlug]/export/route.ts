import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";

// Export complet al datelor organizației (JSON), doar pentru owner — dreptul la
// portabilitate / export înainte de ștergerea organizației. Parcurge dinamic toate
// tabelele cu coloana org_id (prin RLS ctx.db vede DOAR organizația curentă) și
// exclude coloanele sensibile (chei/tokenuri/secrete criptate). Limita de dimensiune
// a răspunsului pe Vercel (~4,5 MB) impune un plafon: tabelele care nu încap sunt
// marcate `trunchiat` în fișier, iar volumele mari se cer la vlad.placinta@alexandrit.ro.

const COLOANE_EXCLUSE = /(_enc$|token|secret|password|parola|api_key|signature|semnatura)/i;
const LIMITA_BYTES = 4_000_000;
const LIMITA_RANDURI_TABEL = 50_000;

// permiteAccesBlocat: un cont cu accesul expirat își poate descărca datele (portabilitate, art. 20 GDPR) — exact de
// asta trimite avertizarea de retenție un link către această rută.
const exporta = withOrgSession(async (ctx) => {
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "Doar owner-ul poate exporta datele organizației." }, { status: 403 });
  }

  const coloane = await ctx.db.execute<{ table_name: string; column_name: string }>(sql`
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.table_name in (select table_name from information_schema.columns where table_schema = 'public' and column_name = 'org_id')
    order by c.table_name, c.ordinal_position
  `);
  const pePTabel = new Map<string, string[]>();
  for (const r of coloane) {
    if (COLOANE_EXCLUSE.test(r.column_name)) continue;
    pePTabel.set(r.table_name, [...(pePTabel.get(r.table_name) ?? []), r.column_name]);
  }

  const rezultat: Record<string, unknown> = {
    exportatLa: new Date().toISOString(),
    organizatie: { id: ctx.orgId, slug: ctx.orgSlug, nume: ctx.orgName },
  };
  let marime = 0;
  const trunchiate: string[] = [];

  // Membrii (email, nume, rol) — separat, prin join cu app_users.
  const membri = await ctx.db.execute(sql`
    select u.email, u.name, m.role, m.created_at
    from memberships m join app_users u on u.id = m.user_id
    where m.org_id = ${ctx.orgId}
  `);
  rezultat.membri = membri;

  // Rândul organizației (nu are coloana org_id, deci nu e prins de parcurgerea de mai jos),
  // fără coloanele sensibile (chei Stripe criptate, tokenul cardului etc.).
  const colOrg = await ctx.db.execute<{ column_name: string }>(sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' order by ordinal_position
  `);
  const listaOrg = sql.join(
    colOrg.filter((c) => !COLOANE_EXCLUSE.test(c.column_name)).map((c) => sql.identifier(c.column_name)),
    sql`, `,
  );
  rezultat.organizatie = (await ctx.db.execute(sql`select ${listaOrg} from organizations where id = ${ctx.orgId}`))[0] ?? rezultat.organizatie;

  for (const [tabel, cols] of pePTabel) {
    if (tabel === "memberships") continue;
    const lista = sql.join(cols.map((c) => sql.identifier(c)), sql`, `);
    const randuri = await ctx.db.execute(sql`select ${lista} from ${sql.identifier(tabel)} where org_id = ${ctx.orgId} limit ${LIMITA_RANDURI_TABEL}`);
    const dimensiune = JSON.stringify(randuri).length;
    if (marime + dimensiune > LIMITA_BYTES) {
      trunchiate.push(tabel);
      continue;
    }
    marime += dimensiune;
    if (randuri.length) rezultat[tabel] = randuri;
  }
  if (trunchiate.length) {
    rezultat.trunchiat = {
      mesaj: "Aceste tabele nu au încăput în export — cere un export complet la vlad.placinta@alexandrit.ro.",
      tabele: trunchiate,
    };
  }

  const nume = `export-${ctx.orgSlug}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(rezultat, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nume}"`,
      "Cache-Control": "no-store",
    },
  });
}, { permiteAccesBlocat: true });

type Ctx = { params: Promise<{ orgSlug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return exporta(orgSlug);
}
