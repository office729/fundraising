/* Aplică documentation/influenceri-rls-v2.sql (rol migrator): restrânge politicile publice ale rutei /r/<cod> la linkul cu codul cerut (app.link_slug). Idempotent.
 * Publică ÎNTÂI codul care setează app.link_slug (src/app/r/[cod]/route.ts), apoi rulează scriptul.
 *
 * Pasul 2 (curățare, tot idempotent): linkurile create înainte de această versiune au numele influencerului la sfârșitul descrierii („Campanie · Instagram · Nume”).
 * Numele se scoate, organizație cu organizație (migrator-ul e supus RLS, deci contextul se setează per organizație). Rândurile deja curate nu se ating.
 *
 * Rulează cu: node --env-file=.env.local scripts/aplica-influenceri-rls-v2.mjs
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/influenceri-rls-v2.sql", import.meta.url), "utf8"));
  });
  const pol = await sql`select tablename, policyname, cmd from pg_policies where tablename in ('influenceri_linkuri', 'influenceri_clicuri') order by 1, 2`;
  console.log("politici:");
  for (const p of pol) console.log(`  ${p.tablename}.${p.policyname} (${p.cmd})`);

  const orgs = await sql.begin(async (tx) => {
    await tx`select set_config('app.public_lookup', 'true', true)`;
    return tx`select id::text as id from organizations`;
  });
  let curatate = 0;
  for (const { id } of orgs) {
    curatate += await sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${id}, true)`;
      const r = await tx`
        update influenceri_linkuri l
        set descriere = left(l.descriere, length(l.descriere) - length(' · ' || i.nume_public))
        from influenceri i
        where l.org_id = ${id}::uuid and i.org_id = l.org_id and i.id = l.influencer_id
          and l.descriere is not null
          and right(l.descriere, length(' · ' || i.nume_public)) = ' · ' || i.nume_public
        returning l.id`;
      return r.length;
    });
  }
  console.log(`descrieri curățate de numele influencerului: ${curatate} (din ${orgs.length} organizații)`);
} finally {
  await sql.end();
}
